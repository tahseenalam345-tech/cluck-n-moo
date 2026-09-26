import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { products } from "@/db/postgres/schema";
import { eq } from "drizzle-orm";
import { recordAuditLog } from "@/lib/auditLogger";

import { invalidateMenuCache } from "@/db/postgres/repositories/menuRepository";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/admin/products/[id]/availability
 * 1-tap toggling of isAvailable (sold out) or isFeatured (popular pick).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const body = await req.json();
  const { isAvailable, isFeatured } = body;

  const db = getPostgresDb();

  const updates: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (typeof isAvailable === "boolean") {
    updates.isAvailable = isAvailable;
  }
  if (typeof isFeatured === "boolean") {
    updates.isFeatured = isFeatured;
  }

  await db.update(products).set(updates).where(eq(products.id, id));

  // Invalidate in-memory menu cache immediately
  invalidateMenuCache();

  // Audit log asynchronously in background without delaying user
  recordAuditLog({
    userId: auth.session.userId,
    userEmail: auth.session.email,
    action: "TOGGLE_PRODUCT_AVAILABILITY",
    entityType: "PRODUCT",
    entityId: id,
    details: updates,
  }).catch((err) => console.warn("Audit log error:", err));

  try {
    revalidatePath("/menu");
    revalidatePath("/");
  } catch (err) {
    console.warn("Revalidation error:", err);
  }

  return NextResponse.json({
    success: true,
    message: "Availability status updated.",
    data: updates,
  });
}
