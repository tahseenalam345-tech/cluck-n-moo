import { getPgPoolClient } from "../client";
import { Promotion, PromotionRule, PromotionRuleOption } from "@/types";

/**
 * Server-only repository for querying and validating promotions from Supabase PostgreSQL.
 */
export async function getActivePromotions(): Promise<Promotion[]> {
  const sql = getPgPoolClient();

  // 1. Fetch active promotions (respecting date bounds if present)
  const now = new Date();
  const promosRaw = await sql<
    Array<{
      id: string;
      slug: string;
      title: string;
      shortDescription: string | null;
      imageUrl: string;
      cloudinaryPublicId: string;
      displayOrder: number;
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
      promotionType: "bundle" | "tiered" | "single";
      fixedPricePkr: number;
      badgeText: string | null;
      termsText: string | null;
    }>
  >`
    SELECT 
      id, slug, title, short_description as "shortDescription",
      image_url as "imageUrl", cloudinary_public_id as "cloudinaryPublicId",
      display_order as "displayOrder", is_active as "isActive",
      starts_at as "startsAt", ends_at as "endsAt",
      promotion_type as "promotionType", fixed_price_pkr as "fixedPricePkr",
      badge_text as "badgeText", terms_text as "termsText"
    FROM public.promotions
    WHERE is_active = true
      AND (starts_at IS NULL OR starts_at <= ${now})
      AND (ends_at IS NULL OR ends_at >= ${now})
    ORDER BY display_order ASC;
  `;

  if (promosRaw.length === 0) return [];

  const promoIds = promosRaw.map((p) => p.id);

  // 2. Fetch rules
  const rulesRaw = await sql<
    Array<{
      id: string;
      promotionId: string;
      ruleType: "product_choice" | "tier_choice" | "fixed_item" | "modifier_choice";
      minSelections: number;
      maxSelections: number;
      required: boolean;
      ruleLabel: string;
      displayOrder: number;
    }>
  >`
    SELECT 
      id, promotion_id as "promotionId", rule_type as "ruleType",
      min_selections as "minSelections", max_selections as "maxSelections",
      required, rule_label as "ruleLabel", display_order as "displayOrder"
    FROM public.promotion_rules
    WHERE promotion_id IN ${sql(promoIds)}
    ORDER BY display_order ASC;
  `;

  const ruleIds = rulesRaw.map((r) => r.id);

  // 3. Fetch options
  let optionsRaw: Array<{
    id: string;
    promotionRuleId: string;
    productId: string | null;
    productVariantId: string | null;
    modifierId: string | null;
    optionTitle: string;
    quantity: number;
    priceAdjustmentPkr: number;
    displayOrder: number;
    isAvailable: boolean;
  }> = [];

  if (ruleIds.length > 0) {
    optionsRaw = await sql`
      SELECT 
        id, promotion_rule_id as "promotionRuleId", product_id as "productId",
        product_variant_id as "productVariantId", modifier_id as "modifierId",
        option_title as "optionTitle", quantity,
        price_adjustment_pkr as "priceAdjustmentPkr",
        display_order as "displayOrder", is_available as "isAvailable"
      FROM public.promotion_rule_options
      WHERE promotion_rule_id IN ${sql(ruleIds)} AND is_available = true
      ORDER BY display_order ASC;
    `;
  }

  // Group options by ruleId
  const optionsByRuleId = new Map<string, PromotionRuleOption[]>();
  for (const opt of optionsRaw) {
    const list = optionsByRuleId.get(opt.promotionRuleId) || [];
    list.push({
      id: opt.id,
      promotionRuleId: opt.promotionRuleId,
      productId: opt.productId,
      productVariantId: opt.productVariantId,
      modifierId: opt.modifierId,
      optionTitle: opt.optionTitle,
      quantity: opt.quantity,
      priceAdjustmentPkr: opt.priceAdjustmentPkr,
      displayOrder: opt.displayOrder,
      isAvailable: opt.isAvailable,
    });
    optionsByRuleId.set(opt.promotionRuleId, list);
  }

  // Group rules by promoId
  const rulesByPromoId = new Map<string, PromotionRule[]>();
  for (const r of rulesRaw) {
    const list = rulesByPromoId.get(r.promotionId) || [];
    list.push({
      id: r.id,
      promotionId: r.promotionId,
      ruleType: r.ruleType,
      minSelections: r.minSelections,
      maxSelections: r.maxSelections,
      required: r.required,
      ruleLabel: r.ruleLabel,
      displayOrder: r.displayOrder,
      options: optionsByRuleId.get(r.id) || [],
    });
    rulesByPromoId.set(r.promotionId, list);
  }

  // Assemble promotions
  return promosRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    imageUrl: p.imageUrl,
    cloudinaryPublicId: p.cloudinaryPublicId,
    displayOrder: p.displayOrder,
    isActive: p.isActive,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    promotionType: p.promotionType,
    fixedPricePkr: p.fixedPricePkr,
    badgeText: p.badgeText,
    termsText: p.termsText,
    rules: rulesByPromoId.get(p.id) || [],
  }));
}

/**
 * Server-side validation of a promotion cart item.
 */
export async function validatePromotionSelection(
  promotionId: string,
  selectedOptionIds: string[],
  clientReportedPricePkr: number
): Promise<{
  isValid: boolean;
  error?: string;
  calculatedPricePkr?: number;
  promotionTitle?: string;
  snapshotSummary?: string;
}> {
  const sql = getPgPoolClient();

  // 1. Fetch promotion
  const promo = await sql<
    Array<{
      id: string;
      slug: string;
      title: string;
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
      fixedPricePkr: number;
    }>
  >`
    SELECT id, slug, title, is_active as "isActive", starts_at as "startsAt", ends_at as "endsAt", fixed_price_pkr as "fixedPricePkr"
    FROM public.promotions
    WHERE id = ${promotionId} OR slug = ${promotionId}
    LIMIT 1;
  `;

  if (!promo || promo.length === 0) {
    return { isValid: false, error: "Promotion does not exist." };
  }

  const p = promo[0];
  if (!p.isActive) {
    return { isValid: false, error: "This promotion is no longer active." };
  }

  const now = new Date();
  if (p.startsAt && p.startsAt > now) {
    return { isValid: false, error: "This promotion has not started yet." };
  }
  if (p.endsAt && p.endsAt < now) {
    return { isValid: false, error: "This promotion has expired." };
  }

  // 2. Fetch rules and options
  const rules = await sql<
    Array<{
      id: string;
      ruleType: string;
      minSelections: number;
      maxSelections: number;
      required: boolean;
      ruleLabel: string;
    }>
  >`
    SELECT id, rule_type as "ruleType", min_selections as "minSelections", max_selections as "maxSelections", required, rule_label as "ruleLabel"
    FROM public.promotion_rules
    WHERE promotion_id = ${p.id}
    ORDER BY display_order ASC;
  `;

  const options = await sql<
    Array<{
      id: string;
      promotionRuleId: string;
      optionTitle: string;
      priceAdjustmentPkr: number;
      isAvailable: boolean;
    }>
  >`
    SELECT id, promotion_rule_id as "promotionRuleId", option_title as "optionTitle", price_adjustment_pkr as "priceAdjustmentPkr", is_available as "isAvailable"
    FROM public.promotion_rule_options
    WHERE promotion_rule_id IN ${sql(rules.map((r) => r.id))}
  `;

  const optionsMap = new Map(options.map((o) => [o.id, o]));
  let calculatedPrice = p.fixedPricePkr;
  const selectedTitles: string[] = [];

  // Group selected options by rule
  const selectionsByRule = new Map<string, string[]>();
  for (const optId of selectedOptionIds) {
    const opt = optionsMap.get(optId);
    if (!opt) {
      return { isValid: false, error: `Invalid option selected: ${optId}` };
    }
    if (!opt.isAvailable) {
      return { isValid: false, error: `Option '${opt.optionTitle}' is currently unavailable.` };
    }
    calculatedPrice += opt.priceAdjustmentPkr;
    selectedTitles.push(opt.optionTitle);

    const list = selectionsByRule.get(opt.promotionRuleId) || [];
    list.push(optId);
    selectionsByRule.set(opt.promotionRuleId, list);
  }

  // Validate rule constraints
  for (const rule of rules) {
    const selectedForRule = selectionsByRule.get(rule.id) || [];
    if (rule.required && selectedForRule.length < rule.minSelections) {
      return {
        isValid: false,
        error: `Please make a selection for required rule: ${rule.ruleLabel}`,
      };
    }
    if (selectedForRule.length > rule.maxSelections) {
      return {
        isValid: false,
        error: `Too many selections for rule: ${rule.ruleLabel}`,
      };
    }
  }

  // Price tampering validation
  if (clientReportedPricePkr !== calculatedPrice) {
    return {
      isValid: false,
      error: `Price mismatch for promotion '${p.title}'. Expected ${calculatedPrice} PKR but received ${clientReportedPricePkr} PKR.`,
    };
  }

  return {
    isValid: true,
    calculatedPricePkr: calculatedPrice,
    promotionTitle: p.title,
    snapshotSummary: selectedTitles.join(" • "),
  };
}
