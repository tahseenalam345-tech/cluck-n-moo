/**
 * Cluck N Moo (CNM) Signature Branded Navigation Sections
 * Decoupled configuration and mapping layer linking signature navigation to verified database items.
 */

export type SignatureSectionType = "MENU_FILTER" | "ALL_MENU" | "CUSTOM_VIEW" | "ROUTE";

export interface SignatureSectionConfig {
  id: string;
  slug: string;
  displayName: string;
  shortLabel: string;
  subtitle: string;
  iconAsset: string | null; // Path to optimized WebP asset, e.g. "/branding/signature/optimized/bon-a-petit.webp"
  altText: string;
  glyph: string; // Authoritative typographic glyph/monogram fallback when icon asset is missing
  sectionType: SignatureSectionType;
  targetRoute?: string;
  displayOrder: number;
  isActive: boolean;
  mapping: {
    matchAll?: boolean;
    categoryIds?: string[];
    productIds?: string[];
    keywordFilters?: string[];
  };
}

export const SIGNATURE_SECTIONS: SignatureSectionConfig[] = [
  {
    id: "sig_menu",
    slug: "menu",
    displayName: "menú",
    shortLabel: "Menú",
    subtitle: "Complete verified food catalog & all categories",
    iconAsset: "/branding/signature/optimized/menu.webp",
    altText: "Menú signature icon - Lightning energy emblem",
    glyph: "MN",
    sectionType: "ALL_MENU",
    displayOrder: 1,
    isActive: true,
    mapping: {
      matchAll: true,
    },
  },
  {
    id: "sig_bon_a_petit",
    slug: "bon-a-petit",
    displayName: "bon a petit",
    shortLabel: "Bon a Petit",
    subtitle: "Appetizers, crunch sides & crispy starters",
    iconAsset: "/branding/signature/optimized/bon-a-petit.webp",
    altText: "Bon a Petit signature icon - Plate and cutlery emblem",
    glyph: "BP",
    sectionType: "MENU_FILTER",
    displayOrder: 2,
    isActive: true,
    mapping: {
      categoryIds: ["cat_appetizers", "cat_fries_more", "cat_pasta_sides"],
      keywordFilters: ["tender", "chicken", "fries", "dip", "rings", "sticks", "wings", "pasta", "rolls"],
    },
  },
  {
    id: "sig_pizza_menu",
    slug: "pizza-menu",
    displayName: "pizza menú",
    shortLabel: "Pizza Menú",
    subtitle: "Stone-baked artisan pizzas & cheesy crusts",
    iconAsset: "/branding/signature/optimized/pizza-menu.webp",
    altText: "Pizza Menú signature icon - Cheesy slice emblem",
    glyph: "PZ",
    sectionType: "MENU_FILTER",
    displayOrder: 3,
    isActive: true,
    mapping: {
      categoryIds: ["cat_pizzas", "cat_pizza_specials"],
      keywordFilters: ["pizza", "tikka", "kebab", "pepperoni", "alfredo", "calzone", "tray"],
    },
  },
  {
    id: "sig_muuu",
    slug: "muuu",
    displayName: "muuu",
    shortLabel: "Muuu",
    subtitle: "100% seasoned pure beef smash burgers & monster feasts",
    iconAsset: "/branding/signature/optimized/muuu.webp",
    altText: "Muuu signature icon - Bull skull smash beef emblem",
    glyph: "MU",
    sectionType: "MENU_FILTER",
    displayOrder: 4,
    isActive: true,
    mapping: {
      categoryIds: ["cat_beef_burgers", "cat_box_deals", "cat_sandwiches"],
      keywordFilters: ["smash", "beef", "og", "oklahoma", "cheeseburger", "philly", "bull", "dozed"],
    },
  },
  {
    id: "sig_cloc_cloc",
    slug: "cloc-cloc",
    displayName: "cloc cloc",
    shortLabel: "Cloc Cloc",
    subtitle: "Crispy fried zinger fillets & golden crunch chicken",
    iconAsset: "/branding/signature/optimized/cloc-cloc.webp",
    altText: "Cloc Cloc signature icon - Rooster crispy chicken emblem",
    glyph: "CC",
    sectionType: "MENU_FILTER",
    displayOrder: 5,
    isActive: true,
    mapping: {
      categoryIds: ["cat_chicken_burgers", "cat_appetizers", "cat_wraps", "cat_box_deals", "cat_sandwiches"],
      keywordFilters: ["xinger", "zinger", "cluck", "golden", "chicken", "nashville", "crunch", "wrap"],
    },
  },
  {
    id: "sig_mmm",
    slug: "mmm",
    displayName: "mmm.....",
    shortLabel: "Mmm.....",
    subtitle: "Chilled beverages & refreshing treats",
    iconAsset: "/branding/signature/optimized/mmm.webp",
    altText: "Mmm..... signature icon - Crown treat emblem",
    glyph: "M~",
    sectionType: "MENU_FILTER",
    displayOrder: 6,
    isActive: true,
    mapping: {
      categoryIds: ["cat_drinks", "cat_desserts"],
      keywordFilters: ["drink", "water", "beverage", "chilled", "soda", "coffee", "tea", "shake", "churros", "cookie", "french toast"],
    },
  },
  {
    id: "sig_historia",
    slug: "historia",
    displayName: "historia",
    shortLabel: "Historia",
    subtitle: "Brand heritage, Kharian location & story",
    iconAsset: "/branding/signature/optimized/historia.webp",
    altText: "Historia signature icon - Heart brand heritage emblem",
    glyph: "HS",
    sectionType: "CUSTOM_VIEW",
    displayOrder: 7,
    isActive: true,
    mapping: {},
  },
];

/**
 * Filter products according to signature section configuration
 */
export function filterProductsBySignature(
  sectionSlug: string,
  categories: Array<{ id: string; name: string; products?: any[] }>
): {
  isHistoria: boolean;
  filteredCategories: Array<{ id: string; name: string; products?: any[] }>;
} {
  const section = SIGNATURE_SECTIONS.find((s) => s.slug === sectionSlug && s.isActive);

  if (!section) {
    return { isHistoria: false, filteredCategories: categories };
  }

  if (section.slug === "historia") {
    return { isHistoria: true, filteredCategories: [] };
  }

  if (section.mapping.matchAll) {
    return { isHistoria: false, filteredCategories: categories };
  }

  const allowedCatIds = new Set(section.mapping.categoryIds || []);
  const allowedProdIds = new Set(section.mapping.productIds || []);
  const keywordFilters = section.mapping.keywordFilters || [];

  const matched = categories
    .filter((cat) => allowedCatIds.has(cat.id))
    .map((cat) => {
      const filteredProds = (cat.products || []).filter((prod) => {
        if (allowedProdIds.has(prod.id)) return true;
        const nameLower = prod.name.toLowerCase();
        const descLower = (prod.description || "").toLowerCase();
        return keywordFilters.some(
          (kw) => nameLower.includes(kw) || descLower.includes(kw)
        );
      });
      return {
        ...cat,
        products: filteredProds,
      };
    })
    .filter((cat) => cat.products && cat.products.length > 0);

  return { isHistoria: false, filteredCategories: matched };
}
