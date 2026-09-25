import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { auditLogs } from "@/db/postgres/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/audit
 * Fetches recent administrative audit logs.
 */
export async function GET(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const db = getPostgresDb();

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: logs,
      totalCount: logs.length,
    });
  } catch (err: any) {
    console.error("Admin Audit GET Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load audit logs." } },
      { status: 500 }
    );
  }
}
