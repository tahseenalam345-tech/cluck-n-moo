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
    id: "promo_pizza_treat",
    badge: "ONLY 2999",
    title: "PIZZA TREAT",
    subtitle: "Tray Pizza + 6 Pcs Oven Baked Wings + Regular Fries with Dip + 1.5L Soft Drink",
    tagline: "The ultimate feast for friends & family.",
    priceHighlight: "2,999 PKR",
    buttonText: "VIEW DEAL",
    actionSlug: "pizza-treat",
    imageUrl: "https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1600,f_auto,q_auto/promotion_1_fthixm",
    bgGradient: "linear-gradient(135deg, #1c110b 0%, #141414 100%)",
    isActive: true,
  },
  {
    id: "promo_wallet_deal",
    badge: "FROM 1290",
    title: "YOUR WALLET LOVES THIS DEAL",
    subtitle: "Deal 1: 1 Medium & 1 Ltr Drink (Rs.1290) | Deal 2: 1 Large & 1 Ltr Drink (Rs.1850)",
    tagline: "Unbeatable value on your favorite pizza & chilled drink.",
    priceHighlight: "From 1,290 PKR",
    buttonText: "VIEW DEAL",
    actionSlug: "wallet-deal",
    imageUrl: "https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1600,f_auto,q_auto/promotion_2_ofnzlq",
    bgGradient: "linear-gradient(135deg, #1a1610 0%, #141414 100%)",
    isActive: true,
  },
  {
    id: "promo_cheesier_launch",
    badge: "LAUNCH Rs. 990",
    title: "1 MEDIUM PIZZA LAUNCH OFFER",
    subtitle: "Oops! Things Just Got Cheesier! Get 1 Medium Pizza for only Rs. 990.",
    tagline: "Hot, melty, and loaded with cheese.",
    priceHighlight: "990 PKR",
    buttonText: "VIEW DEAL",
    actionSlug: "cheesier-medium-pizza-launch",
    imageUrl: "https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1600,f_auto,q_auto/promotion_3_pkzoe9",
    bgGradient: "linear-gradient(135deg, #1f140e 0%, #141414 100%)",
    isActive: true,
  },
  {
    id: "promo_bogo_pizza",
    badge: "BOGO 1499",
    title: "BUY 1 GET 1 PIZZA FREE",
    subtitle: "Oops! Buy 1 Get 1 Pizza Free for Rs. 1499.",
    tagline: "Double the pizza, double the joy.",
    priceHighlight: "1,499 PKR",
    buttonText: "VIEW DEAL",
    actionSlug: "bogo-pizza-deal",
    imageUrl: "https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1600,f_auto,q_auto/promotion_4_z7vq6y",
    bgGradient: "linear-gradient(135deg, #181310 0%, #141414 100%)",
    isActive: true,
  },
];
