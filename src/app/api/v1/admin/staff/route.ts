import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { profiles, orders } from "@/db/postgres/schema";
import { not, eq, sql } from "drizzle-orm";

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
