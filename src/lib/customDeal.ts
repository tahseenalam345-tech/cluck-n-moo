/**
 * Cluck N Moo (CNM) — Build Your Own Deal Calculation & Discount Engine
 *
 * Rules:
 *  - 0 to 2,499 PKR:   0% discount
 *  - 2,500 to 3,499 PKR: 5% discount
 *  - 3,500+ PKR:        10% discount
 *  - Non-stacking, highest eligible tier only
 *  - Applies exclusively to custom deal food subtotal (never delivery fee)
 */

export interface CustomDealDiscountResult {
  subtotalPkr: number;
  discountRate: number; // 0, 0.05, 0.10
  discountPercent: number; // 0, 5, 10
  discountPkr: number;
  finalTotalPkr: number;
  tier: "NONE" | "TIER_1_5_PERCENT" | "TIER_2_10_PERCENT";
  nextThresholdPkr: number | null; // e.g. 2500 or 3500
  nextDiscountPercent: number | null; // e.g. 5 or 10
  amountNeededForNextThreshold: number; // e.g. 500 PKR more needed
  progressPercentToNextTier: number; // 0 to 100 for progress bar
}

export const TIER_1_THRESHOLD_PKR = 2500;
export const TIER_1_RATE = 0.05;
export const TIER_2_THRESHOLD_PKR = 3500;
export const TIER_2_RATE = 0.10;

/**
 * Calculates discount and progress for a custom deal subtotal
 */
export function calculateCustomDealDiscount(subtotalPkr: number): CustomDealDiscountResult {
  const cleanSubtotal = Math.max(0, Math.round(subtotalPkr || 0));

  if (cleanSubtotal >= TIER_2_THRESHOLD_PKR) {
    const discountPkr = Math.round(cleanSubtotal * TIER_2_RATE);
    return {
      subtotalPkr: cleanSubtotal,
      discountRate: TIER_2_RATE,
      discountPercent: 10,
      discountPkr,
      finalTotalPkr: cleanSubtotal - discountPkr,
      tier: "TIER_2_10_PERCENT",
      nextThresholdPkr: null,
      nextDiscountPercent: null,
      amountNeededForNextThreshold: 0,
      progressPercentToNextTier: 100,
    };
  }

  if (cleanSubtotal >= TIER_1_THRESHOLD_PKR) {
    const discountPkr = Math.round(cleanSubtotal * TIER_1_RATE);
    const amountNeeded = TIER_2_THRESHOLD_PKR - cleanSubtotal;
    // Progress between 2500 and 3500
    const progress = Math.min(100, Math.round(((cleanSubtotal - TIER_1_THRESHOLD_PKR) / (TIER_2_THRESHOLD_PKR - TIER_1_THRESHOLD_PKR)) * 100));

    return {
      subtotalPkr: cleanSubtotal,
      discountRate: TIER_1_RATE,
      discountPercent: 5,
      discountPkr,
      finalTotalPkr: cleanSubtotal - discountPkr,
      tier: "TIER_1_5_PERCENT",
      nextThresholdPkr: TIER_2_THRESHOLD_PKR,
      nextDiscountPercent: 10,
      amountNeededForNextThreshold: amountNeeded,
      progressPercentToNextTier: progress,
    };
  }

  // Under Tier 1 (< 2500 PKR)
  const amountNeeded = TIER_1_THRESHOLD_PKR - cleanSubtotal;
  const progress = Math.min(100, Math.round((cleanSubtotal / TIER_1_THRESHOLD_PKR) * 100));

  return {
    subtotalPkr: cleanSubtotal,
    discountRate: 0,
    discountPercent: 0,
    discountPkr: 0,
    finalTotalPkr: cleanSubtotal,
    tier: "NONE",
    nextThresholdPkr: TIER_1_THRESHOLD_PKR,
    nextDiscountPercent: 5,
    amountNeededForNextThreshold: amountNeeded,
    progressPercentToNextTier: progress,
  };
}

/**
 * Calculates cart-level totals considering custom deal items and regular items
 */
export function calculateCartWithCustomDeals(
  cartItems: Array<{ lineTotalPkr: number; customDealId?: string }>,
  deliveryFeePkr: number = 0
): {
  foodSubtotalPkr: number;
  customDealSubtotalPkr: number;
  discountRate: number;
  customDealDiscountRate: number;
  discountPkr: number;
  customDealDiscountPkr: number;
  discountPercent: number;
  discountedFoodSubtotalPkr: number;
  deliveryFeePkr: number;
  totalPkr: number;
} {
  let foodSubtotalPkr = 0;
  let customDealSubtotalPkr = 0;

  for (const item of cartItems) {
    foodSubtotalPkr += item.lineTotalPkr;
    if (item.customDealId) {
      customDealSubtotalPkr += item.lineTotalPkr;
    }
  }

  const dealCalc = calculateCustomDealDiscount(customDealSubtotalPkr);
  const discountedFoodSubtotalPkr = Math.max(0, foodSubtotalPkr - dealCalc.discountPkr);
  const totalPkr = Math.max(0, discountedFoodSubtotalPkr + deliveryFeePkr);

  return {
    foodSubtotalPkr,
    customDealSubtotalPkr,
    discountRate: dealCalc.discountRate,
    customDealDiscountRate: dealCalc.discountRate,
    discountPkr: dealCalc.discountPkr,
    customDealDiscountPkr: dealCalc.discountPkr,
    discountPercent: dealCalc.discountPercent,
    discountedFoodSubtotalPkr,
    deliveryFeePkr,
    totalPkr,
  };
}
