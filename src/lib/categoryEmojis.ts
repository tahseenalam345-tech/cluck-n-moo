/**
 * Cluck N Moo Category Icon / Emoji Mapping
 * Maps category IDs and display names to appetizing food icons/emojis.
 */
export function getCategoryEmoji(catIdOrName: string): string {
  const lower = (catIdOrName || "").toLowerCase();
  if (lower.includes("burger") || lower.includes("smash") || lower.includes("zinger")) return "🍔";
  if (lower.includes("pizza") || lower.includes("crust") || lower.includes("slice")) return "🍕";
  if (lower.includes("chicken") || lower.includes("tender") || lower.includes("wing") || lower.includes("cluck")) return "🍗";
  if (lower.includes("deal") || lower.includes("combo") || lower.includes("offer") || lower.includes("exclusive")) return "🔥";
  if (lower.includes("side") || lower.includes("frie") || lower.includes("dip") || lower.includes("sauce")) return "🍟";
  if (lower.includes("drink") || lower.includes("beverage") || lower.includes("shake") || lower.includes("chilled") || lower.includes("moo")) return "🥤";
  if (lower.includes("dessert") || lower.includes("sweet") || lower.includes("ice cream")) return "🍦";
  return "🍽️";
}

