import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { promotions } from "@/db/postgres/schema";
import { eq, asc } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import { recordAuditLog } from "@/lib/auditLogger";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Configure Cloudinary SDK server-side
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const KNOWN_PROMOTION_PUBLIC_IDS = [
  "promotion_1_fthixm",
  "promotion_2_ofnzlq",
  "promotion_3_pkzoe9",
  "promotion_4_z7vq6y",
];

/**
 * GET /api/v1/admin/promotions
 * Discovers and scans Cloudinary promotion billboard assets and joins them with DB configuration.
 */
export async function GET() {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const db = getPostgresDb();

    // 1. Fetch DB promotions
    const dbPromotions = await db
      .select()
      .from(promotions)
      .orderBy(asc(promotions.displayOrder));

    // 2. Scan Cloudinary for promotion assets
    const cloudinaryAssetsMap: Record<string, any> = {};

    // A. Query known promotion public IDs directly
    await Promise.all(
      KNOWN_PROMOTION_PUBLIC_IDS.map(async (pubId) => {
        try {
          const res = await cloudinary.api.resource(pubId);
          if (res) {
            cloudinaryAssetsMap[res.public_id] = {
              publicId: res.public_id,
              format: res.format,
              width: res.width,
              height: res.height,
              bytes: res.bytes,
              secureUrl: res.secure_url,
              createdAt: res.created_at,
            };
          }
        } catch {
          // If individual asset query fails, continue gracefully
        }
      })
    );

    // B. Search cnm/promotions folder or prefix
    try {
      const folderRes = await cloudinary.api.resources({
        type: "upload",
        prefix: "cnm/promotions",
        max_results: 30,
      });
      if (Array.isArray(folderRes.resources)) {
        for (const r of folderRes.resources) {
          cloudinaryAssetsMap[r.public_id] = {
            publicId: r.public_id,
            format: r.format,
            width: r.width,
            height: r.height,
            bytes: r.bytes,
            secureUrl: r.secure_url,
            createdAt: r.created_at,
          };
        }
      }
    } catch {
      // Prefix search optional
    }

    // 3. Merge DB promotions with Cloudinary metadata
    const configuredList = dbPromotions.map((p) => {
      const cMeta = cloudinaryAssetsMap[p.cloudinaryPublicId] || {};
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        shortDescription: p.shortDescription,
        fixedPricePkr: p.fixedPricePkr,
        displayOrder: p.displayOrder,
        isActive: p.isActive,
        badgeText: p.badgeText,
        imageUrl: p.imageUrl || cMeta.secureUrl,
        cloudinaryPublicId: p.cloudinaryPublicId,
        format: cMeta.format || "jpg",
        width: cMeta.width || 0,
        height: cMeta.height || 0,
        bytes: cMeta.bytes || 0,
        uploadedAt: cMeta.createdAt || p.createdAt,
        isConfigured: true,
      };
    });

    // 4. Check for any Cloudinary assets that have no DB record ("Unconfigured")
    const configuredPublicIds = new Set(dbPromotions.map((p) => p.cloudinaryPublicId));
    const unconfiguredList: any[] = [];

    for (const [pubId, cMeta] of Object.entries(cloudinaryAssetsMap)) {
      if (!configuredPublicIds.has(pubId)) {
        unconfiguredList.push({
          id: `unconf_${pubId}`,
          slug: pubId.replace(/[^a-z0-9_-]/g, "-"),
          title: `Unconfigured Promotion (${pubId})`,
          shortDescription: "Discovered in Cloudinary CDN. Click Configure to add to storefront.",
          fixedPricePkr: 0,
          displayOrder: 99,
          isActive: false,
          badgeText: "Unconfigured Asset",
          imageUrl: cMeta.secureUrl,
          cloudinaryPublicId: pubId,
          format: cMeta.format,
          width: cMeta.width,
          height: cMeta.height,
          bytes: cMeta.bytes,
          uploadedAt: cMeta.createdAt,
          isConfigured: false,
        });
      }
    }

    const allPromotions = [...configuredList, ...unconfiguredList];

    return NextResponse.json({
      success: true,
      data: allPromotions,
      meta: {
        totalDiscoveredInCloudinary: Object.keys(cloudinaryAssetsMap).length,
        totalConfiguredInDb: dbPromotions.length,
        unconfiguredCount: unconfiguredList.length,
      },
    });
  } catch (err: any) {
    console.error("Admin Promotions GET Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to scan and load promotions." } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/promotions
 * Configures or creates a new promotion in PostgreSQL from a Cloudinary asset.
 */
export async function POST(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      title,
      slug,
      shortDescription,
      fixedPricePkr,
      displayOrder = 0,
      isActive = true,
      badgeText,
      cloudinaryPublicId,
      imageUrl,
    } = body;

    if (!title || !cloudinaryPublicId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title and Cloudinary Public ID are required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();
    const id = `promo_${crypto.randomBytes(6).toString("hex")}`;
    const cleanSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const now = new Date();

    await db.insert(promotions).values({
      id,
      slug: cleanSlug,
      title: title.trim(),
      shortDescription: shortDescription ? shortDescription.trim() : null,
      fixedPricePkr: parseInt(String(fixedPricePkr), 10) || 0,
      displayOrder: Number(displayOrder) || 0,
      isActive: Boolean(isActive),
      badgeText: badgeText ? badgeText.trim() : null,
      imageUrl: imageUrl || `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${cloudinaryPublicId}`,
      cloudinaryPublicId,
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "CREATE_PROMOTION",
      entityType: "PROMOTION",
      entityId: id,
      details: { title, slug: cleanSlug, fixedPricePkr, cloudinaryPublicId },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/deals");
      revalidatePath("/api/v1/promotions");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Promotion "${title}" created successfully.`,
      data: { id, slug: cleanSlug },
    });
  } catch (err: any) {
    console.error("Admin Promotion POST Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to create promotion." } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/promotions
 * Updates promotion attributes (title, price, active state, display order).
 */
export async function PUT(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      id,
      title,
      shortDescription,
      fixedPricePkr,
      displayOrder,
      isActive,
      badgeText,
      imageUrl,
      cloudinaryPublicId,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Promotion ID is required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();
    const now = new Date();

    await db
      .update(promotions)
      .set({
        title: title !== undefined ? title.trim() : undefined,
        shortDescription: shortDescription !== undefined ? shortDescription.trim() : undefined,
        fixedPricePkr: fixedPricePkr !== undefined ? parseInt(String(fixedPricePkr), 10) : undefined,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        badgeText: badgeText !== undefined ? badgeText.trim() : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        cloudinaryPublicId: cloudinaryPublicId !== undefined ? cloudinaryPublicId : undefined,
        updatedAt: now,
      })
      .where(eq(promotions.id, id));

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "UPDATE_PROMOTION",
      entityType: "PROMOTION",
      entityId: id,
      details: { title, fixedPricePkr, isActive, displayOrder },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/deals");
      revalidatePath("/api/v1/promotions");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Promotion updated successfully.",
    });
  } catch (err: any) {
    console.error("Admin Promotion PUT Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to update promotion." } },
      { status: 500 }
    );
  }
}
