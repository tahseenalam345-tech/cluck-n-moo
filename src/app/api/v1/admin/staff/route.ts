import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { profiles, orders } from "@/db/postgres/schema";
import { not, eq, and, sql } from "drizzle-orm";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auditLogger";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/staff
 * Lists staff members and delivery riders with active assignment stats.
 */
export async function GET() {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const db = getPostgresDb();

    // Query non-customer profiles
    const staffList = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        phone: profiles.phone,
        role: profiles.role,
        isActive: profiles.isActive,
        createdAt: profiles.createdAt,
        activeOrdersAssigned: sql<number>`(
          SELECT count(*) 
          FROM orders 
          WHERE orders.assigned_rider_id = ${profiles.id} 
            AND orders.status IN ('Out for delivery', 'Ready')
        )`,
      })
      .from(profiles)
      .where(not(eq(profiles.role, "CUSTOMER")));

    return NextResponse.json({
      success: true,
      data: staffList.map((s) => ({
        ...s,
        activeOrdersAssigned: Number(s.activeOrdersAssigned || 0),
      })),
    });
  } catch (err: any) {
    console.error("Admin Staff GET Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load staff profiles." } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/staff
 * Securely creates a staff user via Supabase Auth Admin API and inserts a matching profile.
 */
export async function POST(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { email, password, fullName, phone, role } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Email, password, full name, and role are required." } },
        { status: 400 }
      );
    }

    if (!["ADMIN", "KITCHEN_STAFF", "RIDER"].includes(role)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Role must be ADMIN, KITCHEN_STAFF, or RIDER." } },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Password must be at least 6 characters." } },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Create user in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role,
      },
    });

    if (authError || !authData.user) {
      console.error("Supabase Admin createUser error:", authError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_CREATE_ERROR",
            message: authError?.message || "Failed to create user in authentication provider.",
          },
        },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;
    const db = getPostgresDb();
    const now = new Date();

    // 2. Insert or upsert profile in PostgreSQL
    await db
      .insert(profiles)
      .values({
        id: newUserId,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        phone: phone ? phone.trim() : null,
        role: role as any,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          phone: phone ? phone.trim() : null,
          role: role as any,
          isActive: true,
          updatedAt: now,
        },
      });

    // 3. Record Audit Log
    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "CREATE_STAFF_MEMBER",
      entityType: "STAFF",
      entityId: newUserId,
      details: { email, fullName, role, phone },
    });

    return NextResponse.json({
      success: true,
      message: `Staff member "${fullName}" created successfully with role ${role}.`,
      data: {
        id: newUserId,
        email,
        fullName,
        phone,
        role,
        isActive: true,
      },
    });
  } catch (err: any) {
    console.error("Admin Staff POST Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to create staff member." } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/staff
 * Updates staff profile details, role, or active status with safety guards against orphan admin accounts.
 */
export async function PUT(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { id, fullName, phone, role, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Staff member ID is required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();

    // Fetch existing profile
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Staff member profile not found." } },
        { status: 404 }
      );
    }

    const currentProfile = existing[0];

    // Safety Guard 1: Cannot deactivate own currently logged-in account
    if (isActive === false && id === auth.session.userId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You cannot deactivate your own administrative account." } },
        { status: 400 }
      );
    }

    // Safety Guard 2: Cannot demote or deactivate the only active ADMIN in the system
    if ((isActive === false || (role && role !== "ADMIN")) && currentProfile.role === "ADMIN") {
      const activeAdmins = await db
        .select({ count: sql<number>`count(*)` })
        .from(profiles)
        .where(and(eq(profiles.role, "ADMIN"), eq(profiles.isActive, true)));

      const count = Number(activeAdmins[0]?.count || 0);
      if (count <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Cannot deactivate or change role of the sole active administrator account.",
            },
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // Update in PostgreSQL
    await db
      .update(profiles)
      .set({
        fullName: fullName !== undefined ? fullName.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        role: role !== undefined ? (role as any) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        updatedAt: now,
      })
      .where(eq(profiles.id, id));

    // Sync metadata to Supabase Auth
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: {
          full_name: fullName !== undefined ? fullName.trim() : currentProfile.fullName,
          role: role !== undefined ? role : currentProfile.role,
        },
      });
    } catch (authSyncErr) {
      console.warn("Could not sync metadata to Supabase auth user:", authSyncErr);
    }

    // Record Audit Log
    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: isActive === false ? "DEACTIVATE_STAFF" : "UPDATE_STAFF",
      entityType: "STAFF",
      entityId: id,
      details: { fullName, phone, role, isActive },
    });

    return NextResponse.json({
      success: true,
      message: "Staff member profile updated successfully.",
    });
  } catch (err: any) {
    console.error("Admin Staff PUT Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to update staff member." } },
      { status: 500 }
    );
  }
}
