import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { mediaAssets } from "@/db/postgres/schema";
import { recordAuditLog } from "@/lib/auditLogger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/media/save
 * Registers an uploaded Cloudinary asset into PostgreSQL media library.
 */
export async function POST(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { publicId, secureUrl, folder = "cnm/menu", format, width, height, bytes, altText } = body;

    if (!publicId || !secureUrl) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Public ID and secure URL are required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();
    const id = `med_${crypto.randomBytes(8).toString("hex")}`;
    const now = new Date();

    await db.insert(mediaAssets).values({
      id,
      publicId,
      secureUrl,
      folder,
      format: format || null,
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      bytes: bytes ? Number(bytes) : null,
      altText: altText || null,
      uploadedByUserId: auth.session.userId,
      createdAt: now,
    });

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "UPLOAD_MEDIA",
      entityType: "MEDIA",
      entityId: publicId,
      details: { publicId, secureUrl, folder, format, width, height, bytes },
    });

    return NextResponse.json({
      success: true,
      data: { id, publicId, secureUrl },
    });
  } catch (err: any) {
    console.error("Media Save API Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to register media asset." } },
      { status: 500 }
    );
  }
}
