import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { categories, products } from "@/db/postgres/schema";
import { eq, sql } from "drizzle-orm";
import { recordAuditLog } from "@/lib/auditLogger";

export const dynamic = "force-dynamic";

/**
 * PUT /api/v1/admin/categories/[id]
 * Updates category details.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const body = await req.json();
  const { name, slug, displayOrder, isActive, isArchived, imageUrl } = body;

  const db = getPostgresDb();

  const updates: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (name !== undefined) updates.name = name.trim();
  if (slug !== undefined) updates.slug = slug.trim();
  if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (isArchived !== undefined) updates.isArchived = Boolean(isArchived);
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;

  await db.update(categories).set(updates).where(eq(categories.id, id));

  await recordAuditLog({
    userId: auth.session.userId,
    userEmail: auth.session.email,
    action: "UPDATE_CATEGORY",
    entityType: "CATEGORY",
    entityId: id,
    details: updates,
  });

  return NextResponse.json({
    success: true,
    message: "Category updated successfully.",
  });
}

/**
 * DELETE /api/v1/admin/categories/[id]
 * Safe deletion: Checks if active products exist before allowing action.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const db = getPostgresDb();

  // Check attached products
  const attached = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(products)
    .where(eq(products.categoryId, id));

  const count = Number(attached[0]?.count || 0);

  if (count > 0) {
    // If active products are assigned, do NOT hard-delete; soft-archive instead
    await db
      .update(categories)
      .set({ isArchived: true, isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, id));

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "ARCHIVE_CATEGORY",
      entityType: "CATEGORY",
      entityId: id,
      details: { reason: "Category has attached products; archived rather than deleted" },
    });

    return NextResponse.json({
      success: true,
      message: `Category has ${count} attached products and was safely archived rather than deleted.`,
    });
  }

  // Safe to delete if zero products
  await db.delete(categories).where(eq(categories.id, id));

  await recordAuditLog({
    userId: auth.session.userId,
    userEmail: auth.session.email,
    action: "DELETE_CATEGORY",
    entityType: "CATEGORY",
    entityId: id,
  });

  return NextResponse.json({
    success: true,
    message: "Category deleted safely.",
  });
}
