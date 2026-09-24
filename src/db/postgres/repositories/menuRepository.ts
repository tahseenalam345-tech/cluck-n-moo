import { getPgPoolClient } from "../client";
import { Category, Product, ProductVariant, ProductModifierGroup, ProductModifier } from "@/types";

/**
 * Server-only repository for querying storefront menu catalog from Supabase PostgreSQL.
 * Uses the Transaction Pooler (DATABASE_URL_POOLER).
 */
export async function getActiveMenu(): Promise<{
  categories: Category[];
  featuredProducts: Product[];
}> {
  const sql = getPgPoolClient();

  // 1. Fetch only active categories
  const categoriesRaw = await sql<
    Array<{
      id: string;
      name: string;
      slug: string;
      displayOrder: number;
      isActive: boolean;
    }>
  >`
    SELECT id, name, slug, display_order as "displayOrder", is_active as "isActive"
    FROM public.categories
    WHERE is_active = true
    ORDER BY display_order ASC;
  `;

  // 2. Fetch only available products
  const productsRaw = await sql<
    Array<{
      id: string;
      categoryId: string;
      name: string;
      slug: string;
      description: string | null;
      imageUrl: string | null;
      cloudinaryPublicId: string | null;
      imageAltText: string | null;
      imageStatus: string | null;
      basePricePkr: number;
      isFeatured: boolean;
      isAvailable: boolean;
      displayOrder: number;
    }>
  >`
    SELECT id, category_id as "categoryId", name, slug, description, image_url as "imageUrl",
           cloudinary_public_id as "cloudinaryPublicId", image_alt_text as "imageAltText",
           image_status as "imageStatus", base_price_pkr as "basePricePkr",
           is_featured as "isFeatured", is_available as "isAvailable",
           display_order as "displayOrder"
    FROM public.products
    WHERE is_available = true
    ORDER BY display_order ASC;
  `;

  // 3. Fetch only available variants
  const variantsRaw = await sql<
    Array<{
      id: string;
      productId: string;
      name: string;
      pricePkr: number;
      isAvailable: boolean;
      displayOrder: number;
    }>
  >`
    SELECT id, product_id as "productId", name, price_pkr as "pricePkr",
           is_available as "isAvailable", display_order as "displayOrder"
    FROM public.product_variants
    WHERE is_available = true
    ORDER BY display_order ASC;
  `;

  // 4. Fetch modifier groups
  const modifierGroupsRaw = await sql<
    Array<{
      id: string;
      productId: string;
      name: string;
      minSelection: number;
      maxSelection: number;
      isRequired: boolean;
    }>
  >`
    SELECT id, product_id as "productId", name, min_selection as "minSelection",
           max_selection as "maxSelection", is_required as "isRequired"
    FROM public.product_modifier_groups
    ORDER BY id ASC;
  `;

  // 5. Fetch available modifiers
  const modifiersRaw = await sql<
    Array<{
      id: string;
      groupId: string;
      name: string;
      pricePkr: number;
      isAvailable: boolean;
    }>
  >`
    SELECT id, group_id as "groupId", name, price_pkr as "pricePkr", is_available as "isAvailable"
    FROM public.product_modifiers
    WHERE is_available = true
    ORDER BY id ASC;
  `;

  // Assemble hierarchy: Modifiers -> Modifier Groups
  const modifiersByGroup: Record<string, ProductModifier[]> = {};
  for (const m of modifiersRaw) {
    if (!modifiersByGroup[m.groupId]) {
      modifiersByGroup[m.groupId] = [];
    }
    modifiersByGroup[m.groupId].push({
      id: m.id,
      groupId: m.groupId,
      name: m.name,
      pricePkr: m.pricePkr,
      isAvailable: m.isAvailable ? 1 : 0,
    });
  }

  // Modifier Groups -> Products
  const groupsByProduct: Record<string, ProductModifierGroup[]> = {};
  for (const g of modifierGroupsRaw) {
    if (!groupsByProduct[g.productId]) {
      groupsByProduct[g.productId] = [];
    }
    groupsByProduct[g.productId].push({
      id: g.id,
      productId: g.productId,
      name: g.name,
      minSelection: g.minSelection,
      maxSelection: g.maxSelection,
      isRequired: g.isRequired ? 1 : 0,
      modifiers: modifiersByGroup[g.id] || [],
    });
  }

  // Variants -> Products
  const variantsByProduct: Record<string, ProductVariant[]> = {};
  for (const v of variantsRaw) {
    if (!variantsByProduct[v.productId]) {
      variantsByProduct[v.productId] = [];
    }
    variantsByProduct[v.productId].push({
      id: v.id,
      productId: v.productId,
      name: v.name,
      pricePkr: v.pricePkr,
      isAvailable: v.isAvailable ? 1 : 0,
      displayOrder: v.displayOrder,
    });
  }

  // Full Products with variants and modifier groups
  const products: Product[] = productsRaw.map((p) => ({
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    imageUrl: p.imageUrl,
    cloudinaryPublicId: p.cloudinaryPublicId,
    imageAltText: p.imageAltText,
    imageStatus: p.imageStatus,
    basePricePkr: p.basePricePkr,
    isFeatured: p.isFeatured ? 1 : 0,
    isAvailable: p.isAvailable ? 1 : 0,
    displayOrder: p.displayOrder,
    variants: variantsByProduct[p.id] || [],
    modifierGroups: groupsByProduct[p.id] || [],
  }));

  // Categories with products, strictly excluding categories with zero available products
  const categories: Category[] = categoriesRaw
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive ? 1 : 0,
      products: products.filter((p) => p.categoryId === cat.id),
    }))
    .filter((cat) => cat.products && cat.products.length > 0);

  const featuredProducts = products.filter((p) => p.isFeatured === 1);

  return {
    categories,
    featuredProducts,
  };
}
