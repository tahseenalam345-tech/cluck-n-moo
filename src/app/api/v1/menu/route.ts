import { NextResponse } from "next/server";
import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch categories
    const categories = sqlite
      .prepare(
        `SELECT id, name, slug, display_order as displayOrder
         FROM categories
         WHERE is_active = 1
         ORDER BY display_order ASC`
      )
      .all() as any[];

    // 2. Fetch products
    const products = sqlite
      .prepare(
        `SELECT id, category_id as categoryId, name, slug, description, image_url as imageUrl,
                cloudinary_public_id as cloudinaryPublicId, image_alt_text as imageAltText,
                image_status as imageStatus, base_price_pkr as basePricePkr,
                is_featured as isFeatured, is_available as isAvailable,
                display_order as displayOrder
         FROM products
         WHERE is_available = 1
         ORDER BY display_order ASC`
      )
      .all() as any[];

    // 3. Fetch variants
    const variants = sqlite
      .prepare(
        `SELECT id, product_id as productId, name, price_pkr as pricePkr,
                is_available as isAvailable, display_order as displayOrder
         FROM product_variants
         WHERE is_available = 1
         ORDER BY display_order ASC`
      )
      .all() as any[];

    // 4. Fetch modifier groups and modifiers
    const modifierGroups = sqlite
      .prepare(
        `SELECT id, product_id as productId, name, min_selection as minSelection,
                max_selection as maxSelection, is_required as isRequired
         FROM product_modifier_groups`
      )
      .all() as any[];

    const modifiers = sqlite
      .prepare(
        `SELECT id, group_id as groupId, name, price_pkr as pricePkr, is_available as isAvailable
         FROM product_modifiers
         WHERE is_available = 1`
      )
      .all() as any[];

    // Assemble hierarchical menu
    const groupsByProduct: Record<string, any[]> = {};
    for (const mg of modifierGroups) {
      mg.modifiers = modifiers.filter((m) => m.groupId === mg.id);
      if (!groupsByProduct[mg.productId]) groupsByProduct[mg.productId] = [];
      groupsByProduct[mg.productId].push(mg);
    }

    const variantsByProduct: Record<string, any[]> = {};
    for (const v of variants) {
      if (!variantsByProduct[v.productId]) variantsByProduct[v.productId] = [];
      variantsByProduct[v.productId].push(v);
    }

    for (const p of products) {
      p.variants = variantsByProduct[p.id] || [];
      p.modifierGroups = groupsByProduct[p.id] || [];
    }

    // Associate products and strictly filter out categories with zero available products
    const activePublicCategories = categories
      .map((cat) => ({
        ...cat,
        products: products.filter((p) => p.categoryId === cat.id),
      }))
      .filter((cat) => cat.products && cat.products.length > 0);

    return NextResponse.json({
      success: true,
      data: {
        categories: activePublicCategories,
        featuredProducts: products.filter((p) => p.isFeatured === 1),
      },
    });
  } catch (err: any) {
    console.error("Menu API error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
