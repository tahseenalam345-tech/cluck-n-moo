import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/media/sign
 * Generates an authorized HMAC-SHA1 signature for secure direct browser-to-Cloudinary upload.
 * Zero secret leakage in client code.
 */
export async function POST(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { folder = "cnm/menu", customSlug } = body;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message: "Cloudinary credentials not properly configured on server.",
          },
        },
        { status: 500 }
      );
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const cleanSlug = (customSlug || "asset")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .slice(0, 40);
    const publicId = `${cleanSlug}_${crypto.randomBytes(4).toString("hex")}`;

    // Cloudinary signature parameters (sorted alphabetically)
    const paramsToSign: Record<string, any> = {
      folder,
      public_id: publicId,
      timestamp,
    };

    const sortedKeys = Object.keys(paramsToSign).sort();
    const stringToSign = sortedKeys.map((key) => `${key}=${paramsToSign[key]}`).join("&") + apiSecret;

    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    return NextResponse.json({
      success: true,
      data: {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        publicId,
      },
    });
  } catch (err: any) {
    console.error("Cloudinary Sign API Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to generate upload signature." } },
      { status: 500 }
    );
  }
}
