export interface PromotionBanner {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  tagline: string;
  priceHighlight?: string;
  buttonText: string;
  actionCategoryId?: string;
  actionSlug?: string;
  imageUrl?: string;
  bgGradient: string;
  isActive: boolean;
}


export const ACTIVE_PROMOTIONS: PromotionBanner[] = [
  {
    id: "promo_duo_smash",
    badge: "FEAST OF THE MONTH",
    title: "DUO SMASH FEAST",
    subtitle: "2 Classic Smash Burgers + Large Crinkle Fries + 2 Chilled Drinks (345ml)",
    tagline: "Double the beef, double the crunch, unmatched juiciness.",
    priceHighlight: "1,450 PKR",
    buttonText: "ORDER FEAST",
    actionCategoryId: "cat_box_deals",
    actionSlug: "duo-smash-feast",
    bgGradient: "linear-gradient(135deg, #1f140e 0%, #141414 100%)",
    isActive: true,
  },
  {
    id: "promo_cluck_zinger",
    badge: "KHARIAN FAVORITE",
    title: "CRISPY CLUCK ZINGER",
    subtitle: "Tender whole chicken breast, double hand-breaded in spicy batter & secret garlic sauce",
    tagline: "Juicy inside, ultra-crispy outside.",
    priceHighlight: "Starting from 480 PKR",
    buttonText: "CUSTOMIZE BURGER",
    actionCategoryId: "cat_chicken_burgers",
    actionSlug: "crispy-cluck-zinger",
    bgGradient: "linear-gradient(135deg, #1c1813 0%, #141414 100%)",
    isActive: true,
  },
  {
    id: "promo_family_box",
    badge: "FAMILY PACK",
    title: "JUICIEST IN TOWN FEAST",
    subtitle: "4 Burgers (Smash + Zingers) + 4 Pcs Golden Fried Chicken + 2 Large Fries + 1.5L Drink",
    tagline: "The complete fast-casual banquet for friends & family.",
    priceHighlight: "2,850 PKR",
    buttonText: "VIEW VALUE DEAL",
    actionCategoryId: "cat_box_deals",
    actionSlug: "town-family-feast",
    bgGradient: "linear-gradient(135deg, #1c110b 0%, #141414 100%)",
    isActive: true,
  },
];
