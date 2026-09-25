import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { mediaAssets } from "@/db/postgres/schema";
import { desc, ilike, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/media
 * Lists registered media assets with optional folder and search filters.
 */
export async function GET(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const folder = searchParams.get("folder")?.trim() || "";

    const db = getPostgresDb();

    let query = db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).$dynamic();

    if (folder && folder !== "all") {
      query = query.where(eq(mediaAssets.folder, folder));
    }

    const rows = await query;

    let filtered = rows;
    if (search) {
      filtered = rows.filter(
        (m) =>
          m.publicId.toLowerCase().includes(search) ||
          (m.altText && m.altText.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      totalCount: filtered.length,
    });
  } catch (err: any) {
    console.error("Admin Media GET Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to query media library." } },
      { status: 500 }
    );
  }
}
