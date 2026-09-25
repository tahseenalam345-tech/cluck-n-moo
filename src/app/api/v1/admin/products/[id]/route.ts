import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import {
  products,
  productVariants,
  productModifierGroups,
  productModifiers,
} from "@/db/postgres/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { recordAuditLog } from "@/lib/auditLogger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/products/[id]
 * Return detailed product info including full variants and modifier groups.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const db = getPostgresDb();

  const prodRows = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (prodRows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Product not found." } },
      { status: 404 }
    );
  }

  const product = prodRows[0];

  // Fetch variants
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(asc(productVariants.displayOrder));

  // Fetch modifier groups
  const groups = await db
    .select()
    .from(productModifierGroups)
    .where(eq(productModifierGroups.productId, id));

  let modifiersList: any[] = [];
  if (groups.length > 0) {
    modifiersList = await db
      .select()
      .from(productModifiers)
      .where(inArray(productModifiers.groupId, groups.map((g) => g.id)));
  }

  const modifierGroupsEnriched = groups.map((g) => ({
    ...g,
    modifiers: modifiersList.filter((m) => m.groupId === g.id),
  }));

  return NextResponse.json({
    success: true,
    data: {
      ...product,
      variants,
      modifierGroups: modifierGroupsEnriched,
    },
  });
}

/**
 * PUT /api/v1/admin/products/[id]
 * Updates product metadata, variants, modifier groups, and image mappings.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const body = await req.json();

  const {
    name,
    slug,
    categoryId,
    description,
    basePricePkr,
    isAvailable,
    isFeatured,
    isArchived,
    displayOrder,
    tags,
    imageUrl,
    cloudinaryPublicId,
    imageAltText,
    variants = [],
    modifierGroups = [],
  } = body;

  const db = getPostgresDb();

  // Check product existence
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Product not found." } },
      { status: 404 }
    );
  }

  const oldProduct = existing[0];
  const parsedPrice = parseInt(String(basePricePkr), 10);
  const now = new Date();

  await db.transaction(async (tx) => {
    // 1. Update product root record
    await tx
      .update(products)
      .set({
        name: name !== undefined ? name.trim() : oldProduct.name,
        slug: slug !== undefined ? slug.trim() : oldProduct.slug,
        categoryId: categoryId !== undefined ? categoryId : oldProduct.categoryId,
        description: description !== undefined ? description : oldProduct.description,
        basePricePkr: !isNaN(parsedPrice) ? parsedPrice : oldProduct.basePricePkr,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : oldProduct.isAvailable,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : oldProduct.isFeatured,
        isArchived: isArchived !== undefined ? Boolean(isArchived) : oldProduct.isArchived,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : oldProduct.displayOrder,
        tags: Array.isArray(tags) ? tags : oldProduct.tags,
        imageUrl: imageUrl !== undefined ? imageUrl : oldProduct.imageUrl,
        cloudinaryPublicId: cloudinaryPublicId !== undefined ? cloudinaryPublicId : oldProduct.cloudinaryPublicId,
        imageAltText: imageAltText !== undefined ? imageAltText : oldProduct.imageAltText,
        imageStatus: cloudinaryPublicId ? "SYNCED" : oldProduct.imageStatus,
        updatedAt: now,
      })
      .where(eq(products.id, id));

    // 2. Synchronize variants if provided
    if (Array.isArray(variants)) {
      // Clear old variants
      await tx.delete(productVariants).where(eq(productVariants.productId, id));

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (!v.name) continue;
        await tx.insert(productVariants).values({
          id: v.id || `var_${id}_${i}_${crypto.randomBytes(4).toString("hex")}`,
          productId: id,
          name: v.name.trim(),
          pricePkr: parseInt(String(v.pricePkr), 10) || parsedPrice || oldProduct.basePricePkr,
          isAvailable: v.isAvailable !== false,
          displayOrder: Number(v.displayOrder) || i + 1,
        });
      }
    }

    // 3. Synchronize modifier groups if provided
    if (Array.isArray(modifierGroups)) {
      // Delete old modifier groups (cascades to modifiers)
      await tx.delete(productModifierGroups).where(eq(productModifierGroups.productId, id));

      for (let gIdx = 0; gIdx < modifierGroups.length; gIdx++) {
        const g = modifierGroups[gIdx];
        if (!g.name) continue;
        const groupId = `modgrp_${id}_${gIdx}_${crypto.randomBytes(4).toString("hex")}`;
        await tx.insert(productModifierGroups).values({
          id: groupId,
          productId: id,
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

  // Record audit
  await recordAuditLog({
    userId: auth.session.userId,
    userEmail: auth.session.email,
    action: "UPDATE_PRODUCT",
    entityType: "PRODUCT",
    entityId: id,
    details: {
      before: { name: oldProduct.name, price: oldProduct.basePricePkr, isAvailable: oldProduct.isAvailable },
      after: { name, price: parsedPrice, isAvailable },
    },
  });

  return NextResponse.json({
    success: true,
    message: "Product updated successfully.",
  });
}

/**
 * DELETE /api/v1/admin/products/[id]
 * Soft archives product to protect historical orders and foreign key integrity.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const db = getPostgresDb();

  await db
    .update(products)
    .set({
      isArchived: true,
      isAvailable: false,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));

  await recordAuditLog({
    userId: auth.session.userId,
    userEmail: auth.session.email,
    action: "ARCHIVE_PRODUCT",
    entityType: "PRODUCT",
    entityId: id,
  });

  return NextResponse.json({
    success: true,
    message: "Product archived safely.",
  });
}
