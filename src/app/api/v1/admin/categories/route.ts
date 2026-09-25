import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { categories, products } from "@/db/postgres/schema";
import { asc, eq, sql } from "drizzle-orm";
import { recordAuditLog } from "@/lib/auditLogger";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/categories
 * Returns categories with attached product counts.
 */
export async function GET() {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const db = getPostgresDb();

    // Query categories with product count
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        displayOrder: categories.displayOrder,
        isActive: categories.isActive,
        isArchived: categories.isArchived,
        imageUrl: categories.imageUrl,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        productCount: sql<number>`count(${products.id})`,
        activeProductCount: sql<number>`count(${products.id}) filter (where ${products.isAvailable} = true and ${products.isArchived} = false)`,
      })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .groupBy(categories.id)
      .orderBy(asc(categories.displayOrder));

    const mapped = rows.map((r) => ({
      ...r,
      productCount: Number(r.productCount || 0),
      activeProductCount: Number(r.activeProductCount || 0),
    }));

    return NextResponse.json({
      success: true,
      data: mapped,
    });
  } catch (err: any) {
    console.error("Admin Categories GET Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load categories." } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/categories
 * Create new menu category.
 */
export async function POST(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { name, slug: customSlug, displayOrder = 0, isActive = true, imageUrl } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Category name is required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();

    let baseSlug = (customSlug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!baseSlug) baseSlug = `cat-${Date.now()}`;

    // Verify slug uniqueness
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, baseSlug))
      .limit(1);

    if (existing.length > 0) {
      baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const id = `cat_${baseSlug.replace(/[^a-z0-9_]/g, "_")}`;
    const now = new Date();

    await db.insert(categories).values({
      id,
      name: name.trim(),
      slug: baseSlug,
      displayOrder: Number(displayOrder) || 0,
      isActive: Boolean(isActive),
      isArchived: false,
      imageUrl: imageUrl || null,
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "CREATE_CATEGORY",
      entityType: "CATEGORY",
      entityId: id,
      details: { name, slug: baseSlug },
    });

    return NextResponse.json({
      success: true,
      data: { id, name, slug: baseSlug },
    });
  } catch (err: any) {
    console.error("Admin Category POST Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create category." } },
      { status: 500 }
    );
  }
}
