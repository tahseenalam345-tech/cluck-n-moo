import { NextRequest, NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import {
  productModifierGroups,
  productModifiers,
  products,
} from "@/db/postgres/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { recordAuditLog } from "@/lib/auditLogger";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/modifiers
 * Lists all modifier groups with options and product associations.
 */
export async function GET() {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const db = getPostgresDb();

    // 1. Fetch modifier groups with product info
    const groups = await db
      .select({
        id: productModifierGroups.id,
        name: productModifierGroups.name,
        minSelection: productModifierGroups.minSelection,
        maxSelection: productModifierGroups.maxSelection,
        isRequired: productModifierGroups.isRequired,
        productId: productModifierGroups.productId,
        productName: products.name,
        productBasePrice: products.basePricePkr,
        productAvailable: products.isAvailable,
      })
      .from(productModifierGroups)
      .innerJoin(products, eq(productModifierGroups.productId, products.id))
      .orderBy(asc(products.name), asc(productModifierGroups.name));

    if (groups.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const groupIds = groups.map((g) => g.id);

    // 2. Fetch all options for these groups
    const options = await db
      .select()
      .from(productModifiers)
      .where(inArray(productModifiers.groupId, groupIds));

    const optionsByGroup: Record<string, any[]> = {};
    for (const opt of options) {
      if (!optionsByGroup[opt.groupId]) {
        optionsByGroup[opt.groupId] = [];
      }
      optionsByGroup[opt.groupId].push({
        id: opt.id,
        name: opt.name,
        pricePkr: opt.pricePkr,
        isAvailable: opt.isAvailable,
      });
    }

    const result = groups.map((g) => ({
      ...g,
      options: optionsByGroup[g.id] || [],
    }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Admin Modifiers GET Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load modifiers." } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/modifiers
 * Creates a new modifier group and its options attached to a product.
 */
export async function POST(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      productId,
      name,
      minSelection = 0,
      maxSelection = 1,
      isRequired = false,
      options = [],
    } = body;

    if (!productId || !name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Product and Group Name are required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();
    const groupId = `grp_${crypto.randomBytes(8).toString("hex")}`;

    await db.transaction(async (tx) => {
      await tx.insert(productModifierGroups).values({
        id: groupId,
        productId,
        name: name.trim(),
        minSelection: Number(minSelection) || 0,
        maxSelection: Math.max(1, Number(maxSelection) || 1),
        isRequired: Boolean(isRequired),
      });

      if (Array.isArray(options) && options.length > 0) {
        for (const opt of options) {
          if (opt.name && opt.name.trim()) {
            await tx.insert(productModifiers).values({
              id: `mod_${crypto.randomBytes(8).toString("hex")}`,
              groupId,
              name: opt.name.trim(),
              pricePkr: parseInt(String(opt.pricePkr), 10) || 0,
              isAvailable: opt.isAvailable !== false,
            });
          }
        }
      }
    });

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "CREATE_MODIFIER_GROUP",
      entityType: "MODIFIER_GROUP",
      entityId: groupId,
      details: { name, productId, optionsCount: options.length },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/menu");
      revalidatePath("/deals");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Modifier group "${name}" created successfully.`,
      data: { id: groupId, name },
    });
  } catch (err: any) {
    console.error("Admin Modifiers POST Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to create modifier group." } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/modifiers
 * Updates a modifier group and updates/replaces its options safely.
 */
export async function PUT(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      id,
      name,
      minSelection,
      maxSelection,
      isRequired,
      options,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Group ID is required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();

    await db.transaction(async (tx) => {
      // 1. Update group metadata
      await tx
        .update(productModifierGroups)
        .set({
          name: name !== undefined ? name.trim() : undefined,
          minSelection: minSelection !== undefined ? Number(minSelection) : undefined,
          maxSelection: maxSelection !== undefined ? Number(maxSelection) : undefined,
          isRequired: isRequired !== undefined ? Boolean(isRequired) : undefined,
        })
        .where(eq(productModifierGroups.id, id));

      // 2. If options provided, sync options
      if (Array.isArray(options)) {
        await tx.delete(productModifiers).where(eq(productModifiers.groupId, id));

        for (const opt of options) {
          if (opt.name && opt.name.trim()) {
            await tx.insert(productModifiers).values({
              id: opt.id || `mod_${crypto.randomBytes(8).toString("hex")}`,
              groupId: id,
              name: opt.name.trim(),
              pricePkr: parseInt(String(opt.pricePkr), 10) || 0,
              isAvailable: opt.isAvailable !== false,
            });
          }
        }
      }
    });

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "UPDATE_MODIFIER_GROUP",
      entityType: "MODIFIER_GROUP",
      entityId: id,
      details: { name, minSelection, maxSelection },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/menu");
      revalidatePath("/deals");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Modifier group updated successfully.",
    });
  } catch (err: any) {
    console.error("Admin Modifiers PUT Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to update modifier group." } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/admin/modifiers
 * Safely removes a modifier group.
 */
export async function DELETE(req: NextRequest) {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Group ID is required." } },
        { status: 400 }
      );
    }

    const db = getPostgresDb();

    await db.transaction(async (tx) => {
      await tx.delete(productModifiers).where(eq(productModifiers.groupId, id));
      await tx.delete(productModifierGroups).where(eq(productModifierGroups.id, id));
    });

    await recordAuditLog({
      userId: auth.session.userId,
      userEmail: auth.session.email,
      action: "DELETE_MODIFIER_GROUP",
      entityType: "MODIFIER_GROUP",
      entityId: id,
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/menu");
      revalidatePath("/deals");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Modifier group removed safely.",
    });
  } catch (err: any) {
    console.error("Admin Modifiers DELETE Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err?.message || "Failed to delete modifier group." } },
      { status: 500 }
    );
  }
}
