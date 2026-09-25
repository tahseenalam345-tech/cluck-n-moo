import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import {
  products,
  categories,
  productVariants,
  productModifierGroups,
  productModifiers,
} from "@/db/postgres/schema";
import { eq, and, desc, asc, ilike, or, inArray, sql } from "drizzle-orm";
import { recordAuditLog } from "@/lib/auditLogger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/products
 * Search, filter, and sort products with complete category & variant metrics.
 */
export async function GET(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim() || "";
    const availability = searchParams.get("availability") || "all";
    const imageStatus = searchParams.get("imageStatus") || "all";
    const sortBy = searchParams.get("sortBy") || "displayOrder";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const db = getPostgresDb();

    // 1. Fetch products with categories joined
    const baseQuery = db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        categoryName: categories.name,
        name: products.name,
        slug: products.slug,
        description: products.description,
        imageUrl: products.imageUrl,
        cloudinaryPublicId: products.cloudinaryPublicId,
        imageAltText: products.imageAltText,
        imageStatus: products.imageStatus,
        basePricePkr: products.basePricePkr,
        isFeatured: products.isFeatured,
        isAvailable: products.isAvailable,
        isArchived: products.isArchived,
        displayOrder: products.displayOrder,
        tags: products.tags,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const rows = await baseQuery;

    // 2. Fetch variants and modifier group counts
    const allVariants = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        pricePkr: productVariants.pricePkr,
        isAvailable: productVariants.isAvailable,
      })
      .from(productVariants)
      .orderBy(asc(productVariants.displayOrder));

    const allModifierGroups = await db
      .select({
        id: productModifierGroups.id,
        productId: productModifierGroups.productId,
        name: productModifierGroups.name,
      })
      .from(productModifierGroups);

    // Group variants and modifier groups by productId
    const variantsByProduct = new Map<string, typeof allVariants>();
    for (const v of allVariants) {
      const list = variantsByProduct.get(v.productId) || [];
      list.push(v);
      variantsByProduct.set(v.productId, list);
    }

    const modGroupsByProduct = new Map<string, typeof allModifierGroups>();
    for (const mg of allModifierGroups) {
      const list = modGroupsByProduct.get(mg.productId) || [];
      list.push(mg);
      modGroupsByProduct.set(mg.productId, list);
    }

    // 3. Map into enriched product items
    let mapped = rows.map((p) => ({
      ...p,
      variants: variantsByProduct.get(p.id) || [],
      variantCount: (variantsByProduct.get(p.id) || []).length,
      modifierGroupCount: (modGroupsByProduct.get(p.id) || []).length,
    }));

    // 4. In-memory robust filtering
    if (search) {
      mapped = mapped.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(search);
        const slugMatch = p.slug.toLowerCase().includes(search);
        const descMatch = (p.description || "").toLowerCase().includes(search);
        const catMatch = (p.categoryName || "").toLowerCase().includes(search);
        const tagsMatch = (p.tags || []).some((t) => t.toLowerCase().includes(search));
        return nameMatch || slugMatch || descMatch || catMatch || tagsMatch;
      });
    }

    if (category && category !== "all") {
      mapped = mapped.filter((p) => p.categoryId === category);
    }

    if (availability === "available") {
      mapped = mapped.filter((p) => p.isAvailable && !p.isArchived);
    } else if (availability === "sold_out") {
      mapped = mapped.filter((p) => !p.isAvailable && !p.isArchived);
    } else if (availability === "archived") {
      mapped = mapped.filter((p) => p.isArchived);
    }

    if (imageStatus === "has_image") {
      mapped = mapped.filter((p) => Boolean(p.cloudinaryPublicId || p.imageUrl));
    } else if (imageStatus === "no_image") {
      mapped = mapped.filter((p) => !p.cloudinaryPublicId && !p.imageUrl);
    }

    // 5. Sorting
    mapped.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === "price") {
        cmp = a.basePricePkr - b.basePricePkr;
      } else if (sortBy === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        cmp = a.displayOrder - b.displayOrder;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return NextResponse.json({
      success: true,
      data: mapped,
      totalCount: mapped.length,
    });
  } catch (err: any) {
    console.error("Admin Products GET Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to query products." } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/products
 * Create a new product along with variants, modifier groups, and tags.
 */
export async function POST(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      name,
      slug: customSlug,
      categoryId,
      description,
      basePricePkr,
      isAvailable = true,
      isFeatured = false,
      displayOrder = 0,
      tags = [],
      imageUrl,
      cloudinaryPublicId,
      imageAltText,
      variants = [],
      modifierGroups = [],
    } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Product name is required." } },
        { status: 400 }
      );
    }

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Category is required." } },
        { status: 400 }
      );
    }

    const parsedPrice = parseInt(String(basePricePkr), 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Valid base price in PKR is required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();

    // Generate unique slug
    let baseSlug = (customSlug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!baseSlug) baseSlug = `prod-${Date.now()}`;

    // Verify slug uniqueness
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, baseSlug))
      .limit(1);

    const finalSlug = existing.length > 0 ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
    const productId = `prod_${crypto.randomBytes(8).toString("hex")}`;
    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. Insert product
      await tx.insert(products).values({
        id: productId,
        categoryId,
        name: name.trim(),
        slug: finalSlug,
        description: description ? description.trim() : null,
        imageUrl: imageUrl || null,
        cloudinaryPublicId: cloudinaryPublicId || null,
        imageAltText: imageAltText || name.trim(),
        imageStatus: cloudinaryPublicId ? "SYNCED" : "PENDING",
        basePricePkr: parsedPrice,
        isFeatured: Boolean(isFeatured),
        isAvailable: Boolean(isAvailable),
        isArchived: false,
        displayOrder: Number(displayOrder) || 0,
        tags: Array.isArray(tags) ? tags : [],
        createdAt: now,
        updatedAt: now,
      });

      // 2. Insert variants
      if (Array.isArray(variants)) {
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (!v.name) continue;
          await tx.insert(productVariants).values({
            id: `var_${productId}_${i}_${crypto.randomBytes(4).toString("hex")}`,
            productId,
            name: v.name.trim(),
            pricePkr: parseInt(String(v.pricePkr), 10) || parsedPrice,
            isAvailable: v.isAvailable !== false,
            displayOrder: Number(v.displayOrder) || i + 1,
          });
        }
      }

      // 3. Insert modifier groups & modifiers
      if (Array.isArray(modifierGroups)) {
        for (let gIdx = 0; gIdx < modifierGroups.length; gIdx++) {
          const g = modifierGroups[gIdx];
          if (!g.name) continue;
          const groupId = `modgrp_${productId}_${gIdx}_${crypto.randomBytes(4).toString("hex")}`;
          await tx.insert(productModifierGroups).values({
            id: groupId,
            productId,
            name: g.name.trim(),
            minSelection: Number(g.minSelection) || 0,
            maxSelection: Number(g.maxSelection) || 1,
            isRequired: Boolean(g.isRequired),
          });

          if (Array.isArray(g.modifiers)) {
            for (let mIdx = 0; mIdx < g.modifiers.length; mIdx++) {
              const m = g.modifiers[mIdx];
              if (!m.name) continue;
              await tx.insert(productModifiers).values({
                id: `mod_${groupId}_${mIdx}_${crypto.randomBytes(4).toString("hex")}`,
                groupId,
                name: m.name.trim(),
                pricePkr: parseInt(String(m.pricePkr), 10) || 0,
                isAvailable: m.isAvailable !== false,
              });
            }
          }
        }
      }
    });

    // Record audit log
    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "CREATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: productId,
      details: { name, slug: finalSlug, categoryId, basePricePkr: parsedPrice },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/menu");
      revalidatePath("/deals");
    } catch (err) {
      console.warn("Revalidation warning:", err);
    }

    return NextResponse.json({
      success: true,
      data: { id: productId, slug: finalSlug, name },
    });
  } catch (err: any) {
    console.error("Admin Product POST Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to create product." } },
      { status: 500 }
    );
  }
}
