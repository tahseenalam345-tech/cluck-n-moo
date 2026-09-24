import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPostgresDb } from "@/db/postgres/client";
import { profiles } from "@/db/postgres/schema";
import { eq } from "drizzle-orm";
import { UserRole } from "@/lib/constants";
import { NextResponse } from "next/server";

export interface AuthenticatedUserSession {
  userId: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: UserRole;
}

/**
 * Retrieves the currently authenticated Supabase user and their verified role from the profiles table.
 * Returns null if the user is unauthenticated or has no valid profile.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUserSession | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const db = getPostgresDb();
    const profileRows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        phone: profiles.phone,
        fullName: profiles.fullName,
        role: profiles.role,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (profileRows.length === 0) {
      return {
        userId: user.id,
        email: user.email || null,
        phone: user.phone || null,
        fullName: (user.user_metadata?.full_name as string) || "CNM Customer",
        role: "CUSTOMER",
      };
    }

    const profile = profileRows[0];
    return {
      userId: profile.id,
      email: profile.email || user.email || null,
      phone: profile.phone || user.phone || null,
      fullName: profile.fullName || "CNM Customer",
      role: (profile.role as UserRole) || "CUSTOMER",
    };
  } catch (err) {
    console.error("Auth guard error:", err);
    return null;
  }
}

/**
 * Enforces that a valid session with one of the allowed roles is present.
 * If unauthorized, returns an appropriate NextResponse (401 or 403).
 */
export async function enforceRole(
  allowedRoles: UserRole[]
): Promise<{ session: AuthenticatedUserSession; errorResponse: null } | { session: null; errorResponse: NextResponse }> {
  const session = await getAuthenticatedUser();

  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to access this resource.",
          },
        },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to perform this action.",
          },
        },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}
