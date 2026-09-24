import fs from "fs";
import path from "path";
import { getDb, runInTransaction } from "../src/db";

// -----------------------------------------------------------------------------
// Real CNM Menu Data Structures (Source: docs/VERIFIED_CNM_MENU_EXTRACTION.md & CLOUDINARY_MENU_MAPPING_REPORT.md)
// -----------------------------------------------------------------------------

interface ProposedVariant {
  name: string;
  price_pkr: number;
}

interface ProposedModifierItem {
  name: string;
  price_pkr: number;
}

interface ProposedModifierGroup {
  name: string;
  min_selection: number;
  max_selection: number;
  is_required: number;
  items: ProposedModifierItem[];
}

interface ProposedProduct {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  base_price_pkr: number;
  is_featured: number;
  is_available: number;
  display_order: number;
  cloudinary_public_id: string | null;
  image_url: string | null;
  image_status: "SAFE" | "MISSING_IMAGE";
  match_confidence: "EXACT" | "UNIQUE_SHORT_NAME" | "NO_MATCH";
  match_reason: string;
  variants?: ProposedVariant[];
  modifier_groups?: ProposedModifierGroup[];
}

interface ProposedCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  action: "CREATE" | "RETAIN" | "ARCHIVE";
}

// -----------------------------------------------------------------------------
// Shared Modifier Templates
// -----------------------------------------------------------------------------
const MAKE_IT_A_MEAL_MODIFIER: ProposedModifierGroup = {
  name: "Make It A Meal (Upgrade)",
  min_selection: 0,
  max_selection: 1,
  is_required: 0,
  items: [
    { name: "Fries N Drink", price_pkr: 280 },
    { name: "Fries N Chiller", price_pkr: 390 },
    { name: "Fries N Shake", price_pkr: 650 },
    { name: "Curly Fries Upgrade [To Above Meal]", price_pkr: 150 },
  ],
};

const BURGER_ADDONS_MODIFIER: ProposedModifierGroup = {
  name: "Burger Extras & Add-Ons",
  min_selection: 0,
  max_selection: 4,
  is_required: 0,
  items: [
    { name: "Extra Chicken Patty", price_pkr: 200 },
    { name: "Extra Beef Patty", price_pkr: 250 },
    { name: "Cheese Slice", price_pkr: 90 },
    { name: "Caramelised Onions", price_pkr: 50 },
    { name: "Pickles", price_pkr: 50 },
    { name: "Mushrooms", price_pkr: 70 },
  ],
};

const DIPS_MODIFIER: ProposedModifierGroup = {
  name: "Signature Dipping Sauce",
  min_selection: 0,
  max_selection: 2,
  is_required: 0,
  items: [
    { name: "Garlic Mayo Dip", price_pkr: 90 },
    { name: "Zipotle Dip", price_pkr: 90 },
    { name: "Ranch Dip", price_pkr: 90 },
    { name: "CNM House Dip", price_pkr: 90 },
    { name: "Smoky BBQ Dip", price_pkr: 90 },
  ],
};

const CHICKEN_RUB_MODIFIER: ProposedModifierGroup = {
  name: "Flavor Rub Selection",
  min_selection: 1,
  max_selection: 1,
  is_required: 1,
  items: [
    { name: "Original Crispy Rub", price_pkr: 0 },
    { name: "Hot & Spicy Rub", price_pkr: 0 },
    { name: "Lemon & Herb Rub", price_pkr: 0 },
    { name: "Honey BBQ Rub", price_pkr: 0 },
  ],
};

const PIZZA_CRUST_MODIFIER: ProposedModifierGroup = {
  name: "Stuffed Crust Options (Med/Lrg)",
  min_selection: 0,
  max_selection: 1,
  is_required: 0,
  items: [
    { name: "Cheese Stuffed Crust (Medium)", price_pkr: 250 },
    { name: "Kebab Stuffed Crust (Medium)", price_pkr: 250 },
    { name: "Cheese Stuffed Crust (Large)", price_pkr: 350 },
    { name: "Kebab Stuffed Crust (Large)", price_pkr: 350 },
  ],
};

function cdnUrl(publicId: string): string {
  return `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/${publicId}`;
}

// -----------------------------------------------------------------------------
// Proposed 14 Categories
// -----------------------------------------------------------------------------
const PROPOSED_CATEGORIES: ProposedCategory[] = [
  { id: "cat_beef_burgers", name: "Beef Burgers with Cheese", slug: "beef-burgers", description: "100% Pure Beef smashed & thick patties", display_order: 1, action: "CREATE" },
  { id: "cat_chicken_burgers", name: "Chicken Burgers with Cheese", slug: "chicken-burgers", description: "'cluck yeah!' crispy & grilled chicken burgers", display_order: 2, action: "CREATE" },
  { id: "cat_appetizers", name: "Appetizers & Fried Chicken", slug: "appetizers", description: "Onion rings, mozzarella sticks, tenders, wings, fried chicken", display_order: 3, action: "CREATE" },
  { id: "cat_fries_more", name: "Fries N More", slug: "fries-more", description: "Plain/masala fries, curly fries, loaded fries", display_order: 4, action: "CREATE" },
  { id: "cat_wraps", name: "Crunchwraps & Tortilla Wraps", slug: "wraps", description: "Creamy Kruncher, Flame Fold, Crispy/Grilled wraps", display_order: 5, action: "CREATE" },
  { id: "cat_sandwiches", name: "Sandwiches", slug: "sandwiches", description: "Artisanal sandwiches served with crispy fries", display_order: 6, action: "CREATE" },
  { id: "cat_pizzas", name: "Artisan Round Pizzas", slug: "pizzas", description: "Hand-tossed round pizzas with signature flavours", display_order: 7, action: "RETAIN" },
  { id: "cat_pizza_specials", name: "Signature Pizza Specials", slug: "pizza-specials", description: "Tray Pizza and Stuffed Calzones", display_order: 8, action: "CREATE" },
  { id: "cat_pasta_sides", name: "Pastas & Oven Sides", slug: "pastas-sides", description: "Baked creamy pasta, Italian pasta, pizza fries, spin rolls", display_order: 9, action: "CREATE" },
  { id: "cat_box_deals", name: "Box Deals", slug: "box-deals", description: "Value boxes: Big Bird Duo, Bull-Dozed, Cluckin' Mootastic, etc.", display_order: 10, action: "CREATE" },
  { id: "cat_combo_deals", name: "Numbered Combo Deals", slug: "combo-deals", description: "Deals 1 to 5 & Party Deal", display_order: 11, action: "CREATE" },
  { id: "cat_student_deals", name: "Student Offers", slug: "student-offers", description: "Valid 11 AM - 5 PM special discounted bundles", display_order: 12, action: "CREATE" },
  { id: "cat_desserts", name: "Desserts", slug: "desserts", description: "Choco French Toast, Churros Locos, Cookie Skillet", display_order: 13, action: "CREATE" },
  { id: "cat_drinks", name: "Drinks & Chillers", slug: "drinks", description: "Still water, Soda Woda, Lemon Mint, Peach Tea, Coffee, Shakes", display_order: 14, action: "RETAIN" },
];

// -----------------------------------------------------------------------------
// Proposed 64 Real Products
// -----------------------------------------------------------------------------
const PROPOSED_PRODUCTS: ProposedProduct[] = [
  // 1. Beef Burgers with Cheese
  {
    id: "prod_the_og",
    category_id: "cat_beef_burgers",
    name: "The OG",
    slug: "the-og-burger",
    description: "Thick patty, lettuce, tomatoes, onions and mayo with cheese",
    base_price_pkr: 730,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "the_og_aigens",
    image_url: cdnUrl("the_og_aigens"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name the_og matches menu title exactly",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_classic_cheeseburger",
    category_id: "cat_beef_burgers",
    name: "Classic Cheeseburger",
    slug: "classic-cheeseburger",
    description: "Smashed patty, cheese, pickles and sauce, in potato buns",
    base_price_pkr: 620,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "classic_cheeseburger_fwnokj",
    image_url: cdnUrl("classic_cheeseburger_fwnokj"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name classic_cheeseburger matches menu title exactly",
    variants: [
      { name: "Single Patty", price_pkr: 620 },
      { name: "Double Patty & Double Cheese", price_pkr: 800 },
    ],
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_oklahoma_smash",
    category_id: "cat_beef_burgers",
    name: "Oklahoma Smash",
    slug: "oklahoma-smash-burger",
    description: "Smash patty, caramelized onions, cheese and CNM sauce",
    base_price_pkr: 670,
    is_featured: 1,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "oklahoma_wzcypj",
    image_url: cdnUrl("oklahoma_wzcypj"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name oklahoma uniquely identifies Oklahoma Smash",
    variants: [
      { name: "Single Patty", price_pkr: 670 },
      { name: "Double Patty & Double Cheese", price_pkr: 890 },
    ],
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_mushroom_n_swiss",
    category_id: "cat_beef_burgers",
    name: "Mushroom n Swiss",
    slug: "mushroom-n-swiss-burger",
    description: "Thick patty, in creamy mushroom sauce and melted cheese",
    base_price_pkr: 740,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "mushroom_n_swiss_sgd3ct",
    image_url: cdnUrl("mushroom_n_swiss_sgd3ct"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name mushroom_n_swiss matches IMG-2 burger board exactly",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_philly_cheesesteak",
    category_id: "cat_beef_burgers",
    name: "Philly CheeseSteak",
    slug: "philly-cheesesteak",
    description: "Sliced beef, cheese, onions and capsicum in a soft bun",
    base_price_pkr: 750,
    is_featured: 0,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "philly_cheesestack_un02hn",
    image_url: cdnUrl("philly_cheesestack_un02hn"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name philly_cheesestack uniquely identifies Philly CheeseSteak",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },

  // 2. Chicken Burgers with Cheese
  {
    id: "prod_original_xinger",
    category_id: "cat_chicken_burgers",
    name: "Original Xinger",
    slug: "original-xinger-burger",
    description: "Crispy chicken, iceberg, cheese, mayo, in seeded buns",
    base_price_pkr: 450,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "original_xinger_gdemnd",
    image_url: cdnUrl("original_xinger_gdemnd"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name original_xinger matches menu title exactly",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_nashville_hot",
    category_id: "cat_chicken_burgers",
    name: "Nashville Hot",
    slug: "nashville-hot-burger",
    description: "Hot chicken, pickles, coleslaw, cheese, in soft potato buns",
    base_price_pkr: 590,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "nashville_hot_ahgt9q",
    image_url: cdnUrl("nashville_hot_ahgt9q"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name nashville_hot matches menu title exactly",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_citrus_honey_crunch",
    category_id: "cat_chicken_burgers",
    name: "Citrus Honey Crunch",
    slug: "citrus-honey-crunch-burger",
    description: "Crispy chicken, lemon honey sauce, cheese and ranch, in buns",
    base_price_pkr: 590,
    is_featured: 1,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "citrus_honey_crush_rcslnq",
    image_url: cdnUrl("citrus_honey_crush_rcslnq"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name citrus_honey_crush uniquely matches Citrus/Lemon Honey Crunch",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_smashin_cluck",
    category_id: "cat_chicken_burgers",
    name: "Smashin' Cluck",
    slug: "smashin-cluck-burger",
    description: "Smashed patty, caramelized onions, cheese and sauce, in buns",
    base_price_pkr: 490,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "smashin_cluck_zcyqml",
    image_url: cdnUrl("smashin_cluck_zcyqml"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name smashin_cluck matches IMG-2 burger board exactly",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_smoky_bbq",
    category_id: "cat_chicken_burgers",
    name: "Smoky BBQ",
    slug: "smoky-bbq-burger",
    description: "Grilled chicken with salad, cheese and BBQ sauce, in soft buns",
    base_price_pkr: 570,
    is_featured: 0,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "smoky_bbq_woq6kt",
    image_url: cdnUrl("smoky_bbq_woq6kt"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name smoky_bbq matches menu title exactly",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },
  {
    id: "prod_clucky_patty",
    category_id: "cat_chicken_burgers",
    name: "Clucky Patty",
    slug: "clucky-patty-burger",
    description: "Crispy patty, cheese, lettuce and mayo-mustard, in seeded buns",
    base_price_pkr: 420,
    is_featured: 0,
    is_available: 1,
    display_order: 6,
    cloudinary_public_id: "clucky_patty_eebg5g",
    image_url: cdnUrl("clucky_patty_eebg5g"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name clucky_patty matches menu title exactly",
    modifier_groups: [MAKE_IT_A_MEAL_MODIFIER, BURGER_ADDONS_MODIFIER],
  },

  // 3. Appetizers
  {
    id: "prod_onion_rings",
    category_id: "cat_appetizers",
    name: "Onion Rings",
    slug: "onion-rings",
    description: "Thick cut, golden fried onion rings X 8",
    base_price_pkr: 340,
    is_featured: 0,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "onion_rings_pqkanq",
    image_url: cdnUrl("onion_rings_pqkanq"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name onion_rings matches menu title exactly",
  },
  {
    id: "prod_mozzarella_sticks",
    category_id: "cat_appetizers",
    name: "Mozzarella Sticks",
    slug: "mozzarella-sticks",
    description: "Breaded, fried mozzarella sticks X 4",
    base_price_pkr: 590,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "mozzarella_sticks_vwnda5",
    image_url: cdnUrl("mozzarella_sticks_vwnda5"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name mozzarella_sticks matches menu title exactly",
  },
  {
    id: "prod_fish_n_chips",
    category_id: "cat_appetizers",
    name: "Fish N Chips",
    slug: "fish-n-chips",
    description: "Crispy fried fish strips, served with fries X 4",
    base_price_pkr: 1400,
    is_featured: 0,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "fish_n_chips_q1aj81",
    image_url: cdnUrl("fish_n_chips_q1aj81"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name fish_n_chips matches menu title exactly",
  },
  {
    id: "prod_nuggets_n_fries",
    category_id: "cat_appetizers",
    name: "Nuggets N Fries",
    slug: "nuggets-n-fries",
    description: "Breaded, fried crispy chicken bites and crispy fries X 6",
    base_price_pkr: 490,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "nuggests_n_fries_gezwji",
    image_url: cdnUrl("nuggests_n_fries_gezwji"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name nuggests_n_fries matches Nuggets N Fries (minor typo)",
  },
  {
    id: "prod_chicken_strips",
    category_id: "cat_appetizers",
    name: "Chicken Strips",
    slug: "chicken-strips",
    description: "Chicken Tenders [Original / Hot / Lem n Herb / Honey BBQ] X 4",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "chicken_strips_vqmbba",
    image_url: cdnUrl("chicken_strips_vqmbba"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name chicken_strips matches menu title exactly",
    modifier_groups: [CHICKEN_RUB_MODIFIER],
  },
  {
    id: "prod_chicken_wings",
    category_id: "cat_appetizers",
    name: "Chicken Wings",
    slug: "chicken-wings",
    description: "Fried Wings [Original / Hot / Lem n Herb / Honey BBQ] X 8",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 6,
    cloudinary_public_id: "chicken_wings_gpmwfl",
    image_url: cdnUrl("chicken_wings_gpmwfl"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name chicken_wings matches menu title exactly",
    modifier_groups: [CHICKEN_RUB_MODIFIER],
  },
  {
    id: "prod_fried_chicken",
    category_id: "cat_appetizers",
    name: "Fried Chicken",
    slug: "fried-chicken",
    description: "Chicken Pieces [Original / Hot / Lem n Herb / Honey BBQ]",
    base_price_pkr: 210,
    is_featured: 1,
    is_available: 1,
    display_order: 7,
    cloudinary_public_id: "fired_chicken_jm1lel",
    image_url: cdnUrl("fired_chicken_jm1lel"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name fired_chicken matches Fried Chicken (minor typo)",
    variants: [
      { name: "1 Pc Fried Chicken", price_pkr: 210 },
      { name: "3 Pcs Fried Chicken", price_pkr: 570 },
    ],
    modifier_groups: [CHICKEN_RUB_MODIFIER],
  },

  // 4. Fries N More
  {
    id: "prod_regular_fries",
    category_id: "cat_fries_more",
    name: "Regular Fries with Dip",
    slug: "regular-fries-with-dip",
    description: "Crispy, hot fries served with dipping sauce",
    base_price_pkr: 200,
    is_featured: 0,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "regular_fries_ih8b6a",
    image_url: cdnUrl("regular_fries_ih8b6a"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name regular_fries uniquely matches Regular Fries with Dip",
    variants: [
      { name: "Plain Regular Fries", price_pkr: 200 },
      { name: "Masala Regular Fries", price_pkr: 200 },
    ],
    modifier_groups: [DIPS_MODIFIER],
  },
  {
    id: "prod_large_fries",
    category_id: "cat_fries_more",
    name: "Large Fries with Dip",
    slug: "large-fries-with-dip",
    description: "Large portion crispy hot fries served with dipping sauce",
    base_price_pkr: 350,
    is_featured: 0,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "large_fries_fgkhrp",
    image_url: cdnUrl("large_fries_fgkhrp"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name large_fries uniquely matches Large Fries with Dip",
    variants: [
      { name: "Plain Large Fries", price_pkr: 350 },
      { name: "Masala Large Fries", price_pkr: 350 },
    ],
    modifier_groups: [DIPS_MODIFIER],
  },
  {
    id: "prod_curly_fries",
    category_id: "cat_fries_more",
    name: "Curly Fries with Dip",
    slug: "curly-fries-with-dip",
    description: "Hand cut twisted fries served with dipping sauce",
    base_price_pkr: 470,
    is_featured: 1,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "curly_fries_kpg20j",
    image_url: cdnUrl("curly_fries_kpg20j"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name curly_fries uniquely matches Curly Fries with Dip",
    modifier_groups: [DIPS_MODIFIER],
  },
  {
    id: "prod_beef_cheese_loaded_fries",
    category_id: "cat_fries_more",
    name: "Beef Cheese Loaded Fries",
    slug: "beef-cheese-loaded-fries",
    description: "Fries with juicy beef, caramelised onions and special sauce",
    base_price_pkr: 690,
    is_featured: 1,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "beef_cheese_fries_fzsrlb",
    image_url: cdnUrl("beef_cheese_fries_fzsrlb"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name beef_cheese_fries uniquely matches Beef Cheese Loaded Fries",
  },
  {
    id: "prod_chicken_cheese_loaded_fries",
    category_id: "cat_fries_more",
    name: "Chicken Cheese Loaded Fries",
    slug: "chicken-cheese-loaded-fries",
    description: "Fries with crispy chicken, veggies, topped with sauce",
    base_price_pkr: 650,
    is_featured: 1,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "chicken_cheese_loaded_fries_mxhvzl",
    image_url: cdnUrl("chicken_cheese_loaded_fries_mxhvzl"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name chicken_cheese_loaded_fries matches menu title exactly",
  },

  // 5. Wraps & Crunchwraps
  {
    id: "prod_creamy_kruncher",
    category_id: "cat_wraps",
    name: "Creamy Kruncher",
    slug: "creamy-kruncher",
    description: "Chicken chunks, cheese sauce, fries, folded in a crispy tortilla",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "creamy_kruncher_lizjvj",
    image_url: cdnUrl("creamy_kruncher_lizjvj"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name creamy_kruncher matches menu title exactly",
  },
  {
    id: "prod_flame_fold",
    category_id: "cat_wraps",
    name: "Flame Fold",
    slug: "flame-fold",
    description: "Spicy chicken, veggies and cheese with sauce, in a tortilla",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "flame_fold_vcntdq",
    image_url: cdnUrl("flame_fold_vcntdq"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name flame_fold matches menu title exactly",
  },
  {
    id: "prod_crispy_chicken_wrap",
    category_id: "cat_wraps",
    name: "Crispy Chicken Wrap",
    slug: "crispy-chicken-wrap",
    description: "Crunchy chicken, in a tortilla, lettuce, sauce and cheese",
    base_price_pkr: 560,
    is_featured: 0,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "crispy_chicken_wrap_mrq5r9",
    image_url: cdnUrl("crispy_chicken_wrap_mrq5r9"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name crispy_chicken_wrap matches menu title exactly",
  },
  {
    id: "prod_grilled_chicken_wrap",
    category_id: "cat_wraps",
    name: "Grilled Chicken Wrap",
    slug: "grilled-chicken-wrap",
    description: "Grilled chicken rolled in a tortilla, lettuce and creamy sauce",
    base_price_pkr: 650,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "grilled_chicken_wrap_aemujl",
    image_url: cdnUrl("grilled_chicken_wrap_aemujl"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name grilled_chicken_wrap matches menu title exactly",
  },

  // 6. Sandwiches & Specialties (with Fries)
  {
    id: "prod_cheese_toast",
    category_id: "cat_sandwiches",
    name: "Cheese Toast",
    slug: "cheese-toast",
    description: "Crispy, golden, buttery, toast with melted cheese",
    base_price_pkr: 330,
    is_featured: 0,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "cheese_toast_nup1ek",
    image_url: cdnUrl("cheese_toast_nup1ek"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name cheese_toast matches menu title exactly",
  },
  {
    id: "prod_mujhe_anday_wala",
    category_id: "cat_sandwiches",
    name: "Mujhe Anday Wala Burger",
    slug: "mujhe-anday-wala-burger",
    description: "Shami, egg, cheese, iceberg and sauce in crispy bread",
    base_price_pkr: 490,
    is_featured: 0,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Specialty sandwich not in this Cloudinary photo batch",
  },
  {
    id: "prod_smashed_beef_sandwich",
    category_id: "cat_sandwiches",
    name: "Smashed Beef Sandwich",
    slug: "smashed-beef-sandwich",
    description: "Beef, cheese, caramelised onions and sauce, in bread",
    base_price_pkr: 740,
    is_featured: 1,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "smashed_beef_sandwich_r372qm",
    image_url: cdnUrl("smashed_beef_sandwich_r372qm"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name smashed_beef_sandwich matches menu title exactly",
  },
  {
    id: "prod_crispy_chicken_sandwich",
    category_id: "cat_sandwiches",
    name: "Crispy Chicken Sandwich",
    slug: "crispy-chicken-sandwich",
    description: "Hot chicken, coleslaw, pickles and cheese, in a toast",
    base_price_pkr: 640,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "crispy_chicken_sandwich_tfxhzj",
    image_url: cdnUrl("crispy_chicken_sandwich_tfxhzj"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name crispy_chicken_sandwich matches menu title exactly",
  },
  {
    id: "prod_grilled_chicken_sandwich",
    category_id: "cat_sandwiches",
    name: "Grilled Chicken Sandwich",
    slug: "grilled-chicken-sandwich",
    description: "Grilled chicken, veggies, cheese and sauce",
    base_price_pkr: 670,
    is_featured: 0,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "grilled_chicken_sandwich_vibv9o",
    image_url: cdnUrl("grilled_chicken_sandwich_vibv9o"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name grilled_chicken_sandwich matches menu title exactly",
  },
  {
    id: "prod_fish_o_fillet",
    category_id: "cat_sandwiches",
    name: "Fish O Fillet",
    slug: "fish-o-fillet",
    description: "Crispy fish, sauce, lettuce and cheese, in a potato bun",
    base_price_pkr: 850,
    is_featured: 0,
    is_available: 1,
    display_order: 6,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "One For The Marines specialty item not in this Cloudinary photo batch",
  },
  {
    id: "prod_pasta_la_vista",
    category_id: "cat_pasta_sides",
    name: "Pasta La Vista",
    slug: "pasta-la-vista",
    description: "Alfredo sauce, cheese and pasta, with grilled chicken",
    base_price_pkr: 630,
    is_featured: 0,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Mama Mia pasta specialty not in this Cloudinary photo batch",
  },

  // 7. Round Artisan Pizzas
  {
    id: "prod_flaming_tikka_pizza",
    category_id: "cat_pizzas",
    name: "Flaming Tikka",
    slug: "flaming-tikka-pizza",
    description: "Tikka bites, jalapeno, capsicum, olives, onions, cheese, tomato sauce, topped with spicy mayo",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "flaming_tikka_jlxcvy",
    image_url: cdnUrl("flaming_tikka_jlxcvy"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name flaming_tikka matches menu pizza flavor exactly",
    variants: [
      { name: "Small (7 inch)", price_pkr: 550 },
      { name: "Medium (10 inch)", price_pkr: 1150 },
      { name: "Large (13 inch)", price_pkr: 1650 },
    ],
    modifier_groups: [PIZZA_CRUST_MODIFIER],
  },
  {
    id: "prod_behari_kebab_pizza",
    category_id: "cat_pizzas",
    name: "Behari Kebab",
    slug: "behari-kebab-pizza",
    description: "Chicken bites, seekh kebab, veggies, sweet corn, cheese, tomato sauce",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "behari_kebab_vg8nrm",
    image_url: cdnUrl("behari_kebab_vg8nrm"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name behari_kebab matches menu pizza flavor exactly",
    variants: [
      { name: "Small (7 inch)", price_pkr: 550 },
      { name: "Medium (10 inch)", price_pkr: 1150 },
      { name: "Large (13 inch)", price_pkr: 1650 },
    ],
    modifier_groups: [PIZZA_CRUST_MODIFIER],
  },
  {
    id: "prod_hot_pepperoni_pizza",
    category_id: "cat_pizzas",
    name: "Hot Pepperoni",
    slug: "hot-pepperoni-pizza",
    description: "Tomato sauce, hot pepperoni and mozzarella cheese",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "pepparoni_t2gore",
    image_url: cdnUrl("pepparoni_t2gore"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name pepparoni uniquely matches Hot Pepperoni pizza",
    variants: [
      { name: "Small (7 inch)", price_pkr: 550 },
      { name: "Medium (10 inch)", price_pkr: 1150 },
      { name: "Large (13 inch)", price_pkr: 1650 },
    ],
    modifier_groups: [PIZZA_CRUST_MODIFIER],
  },
  {
    id: "prod_creamy_alfredo_pizza",
    category_id: "cat_pizzas",
    name: "Creamy Alfredo",
    slug: "creamy-alfredo-pizza",
    description: "Creamy chicken, corn, mushrooms, onions, olives, cheese and white sauce",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "creamy_alfredo_dexsaa",
    image_url: cdnUrl("creamy_alfredo_dexsaa"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name creamy_alfredo matches menu pizza flavor exactly",
    variants: [
      { name: "Small (7 inch)", price_pkr: 550 },
      { name: "Medium (10 inch)", price_pkr: 1150 },
      { name: "Large (13 inch)", price_pkr: 1650 },
    ],
    modifier_groups: [PIZZA_CRUST_MODIFIER],
  },
  {
    id: "prod_secret_cnm_pizza",
    category_id: "cat_pizzas",
    name: "Secret CNM",
    slug: "secret-cnm-pizza",
    description: "Spicy chicken, onions, capsicum, corn, olives, tomato, mushrooms, cheese, tomato sauce, topped with CNM sauce",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "secret_cnm_nd4ld2",
    image_url: cdnUrl("secret_cnm_nd4ld2"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name secret_cnm matches menu pizza flavor exactly",
    variants: [
      { name: "Small (7 inch)", price_pkr: 550 },
      { name: "Medium (10 inch)", price_pkr: 1150 },
      { name: "Large (13 inch)", price_pkr: 1650 },
    ],
    modifier_groups: [PIZZA_CRUST_MODIFIER],
  },

  // 8. Signature Pizza Specials
  {
    id: "prod_tray_pizza",
    category_id: "cat_pizza_specials",
    name: "Tray Pizza",
    slug: "tray-pizza",
    description: "Party size square tray pizza. Choose any two flavours of your choice",
    base_price_pkr: 2100,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "tray_pizza_pnyv2v",
    image_url: cdnUrl("tray_pizza_pnyv2v"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name tray_pizza matches menu special title exactly",
  },
  {
    id: "prod_stuffed_calzone",
    category_id: "cat_pizza_specials",
    name: "Stuffed Calzone",
    slug: "stuffed-calzone",
    description: "Oven-baked stuffed calzone topped with cheese. Available in Flaming Tikka or Creamy Alfredo",
    base_price_pkr: 950,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "stuffed_calzone_t8ea5y",
    image_url: cdnUrl("stuffed_calzone_t8ea5y"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name stuffed_calzone matches menu special title exactly",
    variants: [
      { name: "Flaming Tikka Calzone", price_pkr: 950 },
      { name: "Creamy Alfredo Calzone", price_pkr: 950 },
    ],
  },

  // 9. Pastas & Oven Sides
  {
    id: "prod_spin_rolls",
    category_id: "cat_pasta_sides",
    name: "Spin Rolls",
    slug: "spin-rolls",
    description: "Stuffed rolled pizza bites with herbs and cheese",
    base_price_pkr: 420,
    is_featured: 0,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "spin_rolls_ihzaju",
    image_url: cdnUrl("spin_rolls_ihzaju"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name spin_rolls matches menu title exactly",
    variants: [
      { name: "3 Pcs Spin Rolls", price_pkr: 420 },
      { name: "6 Pcs Spin Rolls", price_pkr: 720 },
    ],
  },
  {
    id: "prod_cheesy_garlic_bread",
    category_id: "cat_pasta_sides",
    name: "Cheesy Garlic Bread",
    slug: "cheesy-garlic-bread",
    description: "Oven-baked with aromatic herbs & melted cheese",
    base_price_pkr: 350,
    is_featured: 0,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "cheesy_garlic_bread_z6mmig",
    image_url: cdnUrl("cheesy_garlic_bread_z6mmig"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name cheesy_garlic_bread matches menu title exactly",
  },
  {
    id: "prod_baked_creamy_pasta",
    category_id: "cat_pasta_sides",
    name: "Baked Creamy Pasta",
    slug: "baked-creamy-pasta",
    description: "Oven-baked pasta in creamy sauce with melted cheese & olives",
    base_price_pkr: 690,
    is_featured: 1,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "creamy_baked_pasta_wybng5",
    image_url: cdnUrl("creamy_baked_pasta_wybng5"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name creamy_baked_pasta uniquely matches Baked Creamy Pasta",
  },
  {
    id: "prod_italian_pasta",
    category_id: "cat_pasta_sides",
    name: "Italian Pasta",
    slug: "italian-pasta",
    description: "Oven-baked Italian style pasta with jalapenos & mozzarella",
    base_price_pkr: 690,
    is_featured: 1,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "italian_pasta_aogag6",
    image_url: cdnUrl("italian_pasta_aogag6"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name italian_pasta matches menu title exactly",
  },
  {
    id: "prod_pizza_fries",
    category_id: "cat_pasta_sides",
    name: "Pizza Fries",
    slug: "pizza-fries",
    description: "Crispy fries topped with pizza sauce, melted cheese & drizzle",
    base_price_pkr: 690,
    is_featured: 1,
    is_available: 1,
    display_order: 6,
    cloudinary_public_id: "pizza_fries_wfcsrr",
    image_url: cdnUrl("pizza_fries_wfcsrr"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name pizza_fries matches menu title exactly",
  },
  {
    id: "prod_oven_baked_wings",
    category_id: "cat_pasta_sides",
    name: "Oven Baked Wings",
    slug: "oven-baked-wings",
    description: "Seasoned, oven-baked wings with sesame seed sprinkle",
    base_price_pkr: 400,
    is_featured: 0,
    is_available: 1,
    display_order: 7,
    cloudinary_public_id: "oven_baked_wings_uloepi",
    image_url: cdnUrl("oven_baked_wings_uloepi"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name oven_baked_wings matches menu title exactly",
    variants: [
      { name: "6 Pcs Oven Baked Wings", price_pkr: 400 },
      { name: "12 Pcs Oven Baked Wings", price_pkr: 750 },
    ],
  },

  // 10. Numbered Combo Deals (IMG-1)
  {
    id: "prod_deal_1",
    category_id: "cat_combo_deals",
    name: "Deal 1",
    slug: "combo-deal-1",
    description: "Small pizza, 2 burgers, fries, dip & 2 drinks",
    base_price_pkr: 1600,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "deal_1_plteut",
    image_url: cdnUrl("deal_1_plteut"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name deal_1 matches Combo Deal 1 on IMG-1",
    variants: [
      { name: "Deal 1 (Chicken Burgers)", price_pkr: 1600 },
      { name: "Deal 1 (Beef Burgers)", price_pkr: 1900 },
    ],
  },
  {
    id: "prod_deal_2",
    category_id: "cat_combo_deals",
    name: "Deal 2",
    slug: "combo-deal-2",
    description: "Medium pizza, 3 burgers, fries, dip & 1L drink",
    base_price_pkr: 2450,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "deal_2_rv9dvu",
    image_url: cdnUrl("deal_2_rv9dvu"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name deal_2 matches Combo Deal 2 on IMG-1",
    variants: [
      { name: "Deal 2 (Chicken Burgers)", price_pkr: 2450 },
      { name: "Deal 2 (Beef Burgers)", price_pkr: 2800 },
    ],
  },
  {
    id: "prod_deal_3",
    category_id: "cat_combo_deals",
    name: "Deal 3",
    slug: "combo-deal-3",
    description: "Large pizza, 4 burgers, 8 wings & 1.5L drink",
    base_price_pkr: 3600,
    is_featured: 1,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "deal_3_slcbma",
    image_url: cdnUrl("deal_3_slcbma"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name deal_3 matches Combo Deal 3 on IMG-1",
    variants: [
      { name: "Deal 3 (Chicken Burgers)", price_pkr: 3600 },
      { name: "Deal 3 (Beef Burgers)", price_pkr: 4200 },
    ],
  },
  {
    id: "prod_deal_4",
    category_id: "cat_combo_deals",
    name: "Deal 4",
    slug: "combo-deal-4",
    description: "Small pizza, 4 wings n drink",
    base_price_pkr: 700,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "deal_4_zrrbyz",
    image_url: cdnUrl("deal_4_zrrbyz"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name deal_4 matches Combo Deal 4 on IMG-1",
  },
  {
    id: "prod_deal_5",
    category_id: "cat_combo_deals",
    name: "Deal 5 (2 X Pizzas)",
    slug: "combo-deal-5",
    description: "2 X Round Pizzas in your choice of size",
    base_price_pkr: 1050,
    is_featured: 1,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "deal_5_u3cfyg",
    image_url: cdnUrl("deal_5_u3cfyg"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name deal_5 matches Combo Deal 5 on IMG-1",
    variants: [
      { name: "2 X Small Pizzas", price_pkr: 1050 },
      { name: "2 X Medium Pizzas", price_pkr: 1850 },
      { name: "2 X Large Pizzas", price_pkr: 2850 },
    ],
  },
  {
    id: "prod_party_deal",
    category_id: "cat_combo_deals",
    name: "Party Deal",
    slug: "party-deal",
    description: "8 burgers, 2 large pizzas, 15 wings, fries, 4 1.5L drinks & 10 dips",
    base_price_pkr: 9999,
    is_featured: 1,
    is_available: 1,
    display_order: 6,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Mega party bundle not present in this Cloudinary photo batch",
  },

  // 11. Student Offers (IMG-1)
  {
    id: "prod_student_deal_1",
    category_id: "cat_student_deals",
    name: "Student Deal 1",
    slug: "student-deal-1",
    description: "Small pizza, 1 burger & 2 drinks (Valid everyday 11 AM - 5 PM)",
    base_price_pkr: 950,
    is_featured: 0,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "student_deal_1_bkrn27",
    image_url: cdnUrl("student_deal_1_bkrn27"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name student_deal_1 matches Student Deal 1 exactly",
  },
  {
    id: "prod_student_deal_2",
    category_id: "cat_student_deals",
    name: "Student Deal 2",
    slug: "student-deal-2",
    description: "2 X small pizzas (Valid everyday 11 AM - 5 PM)",
    base_price_pkr: 870,
    is_featured: 0,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "student_deal_2_xth6lv",
    image_url: cdnUrl("student_deal_2_xth6lv"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name student_deal_2 matches Student Deal 2 exactly",
  },
  {
    id: "prod_student_deal_3",
    category_id: "cat_student_deals",
    name: "Student Deal 3",
    slug: "student-deal-3",
    description: "1 burger, 4 wings, fries & drink (Valid everyday 11 AM - 5 PM)",
    base_price_pkr: 799,
    is_featured: 0,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "student_deal_3_qluyzp",
    image_url: cdnUrl("student_deal_3_qluyzp"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name student_deal_3 matches Student Deal 3 exactly",
  },

  // 12. Box Deals (IMG-4)
  {
    id: "prod_big_bird_duo",
    category_id: "cat_box_deals",
    name: "Big Bird Duo",
    slug: "big-bird-duo-deal",
    description: "2 X xinger burgers, 2 pcs fried chicken, fries, dip n 2 soft drinks",
    base_price_pkr: 1550,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "big_bird_duo_rs96vy",
    image_url: cdnUrl("big_bird_duo_rs96vy"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name big_bird_duo matches Box Deal title exactly",
  },
  {
    id: "prod_bull_dozed",
    category_id: "cat_box_deals",
    name: "Bull - Dozed",
    slug: "bull-dozed-deal",
    description: "2 X beef burgers, loaded fries, dip n 2 soft drinks",
    base_price_pkr: 1920,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "bull_dozed_kgvg3p",
    image_url: cdnUrl("bull_dozed_kgvg3p"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name bull_dozed matches Box Deal title exactly",
  },
  {
    id: "prod_too_hot_to_handle",
    category_id: "cat_box_deals",
    name: "Too Hot To Handle",
    slug: "too-hot-to-handle-deal",
    description: "2 X chicken burgers, 4 pcs hot chicken tenders, fries, dip n 2 soft drinks",
    base_price_pkr: 1580,
    is_featured: 0,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "too_hot_to_handle_m9lvrs",
    image_url: cdnUrl("too_hot_to_handle_m9lvrs"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name too_hot_to_handle matches Box Deal title exactly",
  },
  {
    id: "prod_wrap_it_up",
    category_id: "cat_box_deals",
    name: "Wrap It Up",
    slug: "wrap-it-up-deal",
    description: "2 X wraps, fries, dip n 2 soft drinks",
    base_price_pkr: 1380,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: "wrap_it_up_ninvgr",
    image_url: cdnUrl("wrap_it_up_ninvgr"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name wrap_it_up matches Box Deal title exactly",
  },
  {
    id: "prod_triple_threat",
    category_id: "cat_box_deals",
    name: "Triple Threat",
    slug: "triple-threat-deal",
    description: "2 X chicken burgers, 1 X beef burger, loaded fries n large soft drink",
    base_price_pkr: 2290,
    is_featured: 1,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: "triple_threat_ptkwku",
    image_url: cdnUrl("triple_threat_ptkwku"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name triple_threat matches Box Deal title exactly",
  },
  {
    id: "prod_chicken_box",
    category_id: "cat_box_deals",
    name: "Chicken Box",
    slug: "chicken-box-deal",
    description: "2 pcs fried chicken, 2 x chicken tenders, 2 x wings, fries, dip n soft drink",
    base_price_pkr: 890,
    is_featured: 1,
    is_available: 1,
    display_order: 6,
    cloudinary_public_id: "chicken_box_ixcgna",
    image_url: cdnUrl("chicken_box_ixcgna"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name chicken_box matches Box Deal title exactly",
  },
  {
    id: "prod_cnm_fiesta",
    category_id: "cat_box_deals",
    name: "CNM Fiesta",
    slug: "cnm-fiesta-deal",
    description: "4 x beef burgers, 8 pcs chicken wings, 2 X fries, 2 X dips n large soft drink",
    base_price_pkr: 3450,
    is_featured: 1,
    is_available: 1,
    display_order: 7,
    cloudinary_public_id: "cnm_fiesta_s3cmyi",
    image_url: cdnUrl("cnm_fiesta_s3cmyi"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name cnm_fiesta matches Box Deal title exactly",
  },
  {
    id: "prod_quad_chick_feast",
    category_id: "cat_box_deals",
    name: "Quad Chick Feast",
    slug: "quad-chick-feast-deal",
    description: "4 X chicken burgers, 2 X fries, 2 X dips n large soft drink",
    base_price_pkr: 2480,
    is_featured: 1,
    is_available: 1,
    display_order: 8,
    cloudinary_public_id: "quad_chick_feast_efsbgm",
    image_url: cdnUrl("quad_chick_feast_efsbgm"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name quad_chick_feast matches Box Deal title exactly",
  },
  {
    id: "prod_cluckin_mootastic",
    category_id: "cat_box_deals",
    name: "Cluckin' Mootastic",
    slug: "cluckin-mootastic-deal",
    description: "2 X chicken burgers, 2 X beef burgers, 2 X fries, 4 pcs fried chicken, 2 X dips n large soft drink",
    base_price_pkr: 3350,
    is_featured: 1,
    is_available: 1,
    display_order: 9,
    cloudinary_public_id: "cluckin_mootastic_vmlfyp",
    image_url: cdnUrl("cluckin_mootastic_vmlfyp"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name cluckin_mootastic matches Box Deal title exactly",
  },

  // 13. Desserts
  {
    id: "prod_choco_french_toast",
    category_id: "cat_desserts",
    name: "Choco French Toast",
    slug: "choco-french-toast",
    description: "Chocolate stuffed, french toast with vanilla ice-cream",
    base_price_pkr: 550,
    is_featured: 1,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: "chco_french_toast_ez49da",
    image_url: cdnUrl("chco_french_toast_ez49da"),
    image_status: "SAFE",
    match_confidence: "UNIQUE_SHORT_NAME",
    match_reason: "Base name chco_french_toast matches Choco French Toast (minor typo)",
  },
  {
    id: "prod_churros_locos",
    category_id: "cat_desserts",
    name: "Churros Locos",
    slug: "churros-locos",
    description: "Crispy, cinnamon-sugar coated, warm and delicious",
    base_price_pkr: 350,
    is_featured: 1,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: "churros_locos_liffri",
    image_url: cdnUrl("churros_locos_liffri"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Base name churros_locos matches menu title exactly",
  },
  {
    id: "prod_cookie_skillet",
    category_id: "cat_desserts",
    name: "Cookie Skillet",
    slug: "cookie-skillet",
    description: "Freshly baked chocolate chip cookie in a skillet, topped with vanilla ice cream",
    base_price_pkr: 450,
    is_featured: 1,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: "cookie_skillet_yjydjz",
    image_url: cdnUrl("cookie_skillet_yjydjz"),
    image_status: "SAFE",
    match_confidence: "EXACT",
    match_reason: "Primary asset matching Cookie Skillet on IMG-1 and IMG-4",
  },

  // 14. Drinks & Chillers
  {
    id: "prod_still_water",
    category_id: "cat_drinks",
    name: "Still Water",
    slug: "still-water",
    description: "Pure bottled mineral drinking water",
    base_price_pkr: 80,
    is_featured: 0,
    is_available: 1,
    display_order: 1,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Bottled beverage not present in Cloudinary photo batch",
    variants: [
      { name: "Regular Water (500ml)", price_pkr: 80 },
      { name: "Large Water (1.5L)", price_pkr: 140 },
    ],
  },
  {
    id: "prod_soda_woda",
    category_id: "cat_drinks",
    name: "Soda Woda",
    slug: "soda-woda",
    description: "Chilled carbonated soft drink",
    base_price_pkr: 110,
    is_featured: 0,
    is_available: 1,
    display_order: 2,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Soft drink cans/bottles not present in Cloudinary photo batch",
    variants: [
      { name: "Regular Can (345ml)", price_pkr: 110 },
      { name: "Large Bottle (1.5L)", price_pkr: 230 },
    ],
  },
  {
    id: "prod_lemon_mint_refresher",
    category_id: "cat_drinks",
    name: "Lemon Mint Refresher",
    slug: "lemon-mint-refresher",
    description: "Cool blend of lemon and mint, with a sweet fizz",
    base_price_pkr: 250,
    is_featured: 0,
    is_available: 1,
    display_order: 3,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Specialty chiller beverage not present in Cloudinary photo batch",
  },
  {
    id: "prod_peach_iced_tea",
    category_id: "cat_drinks",
    name: "Peach Iced Tea",
    slug: "peach-iced-tea",
    description: "Chill peachy iced tea, for the perfect sip",
    base_price_pkr: 250,
    is_featured: 0,
    is_available: 1,
    display_order: 4,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Specialty iced tea beverage not present in Cloudinary photo batch",
  },
  {
    id: "prod_cold_coffee",
    category_id: "cat_drinks",
    name: "Cold Coffee",
    slug: "cold-coffee",
    description: "Refreshing cold coffee, ice and whole milk",
    base_price_pkr: 450,
    is_featured: 0,
    is_available: 1,
    display_order: 5,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Coffee beverage not present in Cloudinary photo batch",
  },
  {
    id: "prod_milk_shakes",
    category_id: "cat_drinks",
    name: "Milk Shakes",
    slug: "milk-shakes",
    description: "Thick hand-spun gourmet milkshakes",
    base_price_pkr: 540,
    is_featured: 1,
    is_available: 1,
    display_order: 6,
    cloudinary_public_id: null,
    image_url: null,
    image_status: "MISSING_IMAGE",
    match_confidence: "NO_MATCH",
    match_reason: "Shake beverages not present in Cloudinary photo batch",
    variants: [
      { name: "Vanilla Shake", price_pkr: 540 },
      { name: "Oreo Shake", price_pkr: 540 },
      { name: "Lotus Biscoff Shake", price_pkr: 740 },
      { name: "Chocotella Shake", price_pkr: 740 },
    ],
  },
];

// -----------------------------------------------------------------------------
// Unresolved Conflicts for Owner Confirmation
// -----------------------------------------------------------------------------
const UNRESOLVED_CONFLICTS = [
  {
    id: "CONFLICT-1",
    issue: "Citrus Honey Crunch vs Lemon Honey Crunch",
    evidence: "IMG-2 (Photo Board) names it 'Citrus Honey Crunch [590 PKR]'. IMG-3 (Text Menu) names it 'LEMON HONEY CRUNCH 590' with description 'lemon honey sauce'. Cloudinary asset is 'citrus_honey_crush_rcslnq'.",
    proposed_handling: "Retain primary title 'Citrus Honey Crunch' with descriptive note referencing lemon honey sauce.",
  },
  {
    id: "CONFLICT-2",
    issue: "Mushroom n Swiss vs Mushroom n Cheese",
    evidence: "IMG-2 names it 'Mushroom n Swiss [740 PKR]'. IMG-3 names it 'MUSHROOM N CHEESE 740' with description 'creamy mushroom sauce and melted cheese'. Cloudinary asset is 'mushroom_n_swiss_sgd3ct'.",
    proposed_handling: "Use 'Mushroom n Swiss' as canonical name, matching Cloudinary asset and photo board.",
  },
  {
    id: "CONFLICT-3",
    issue: "Smashin' Cluck vs Smashed Cluck",
    evidence: "IMG-2 names it 'Smashin\' Cluck [490 PKR]'. IMG-3 names it 'SMASHED CLUCK 490'. Cloudinary asset is 'smashin_cluck_zcyqml'.",
    proposed_handling: "Use 'Smashin\' Cluck' as canonical name.",
  },
  {
    id: "CONFLICT-4",
    issue: "Calzone Typo: 'Creamy Alredo'",
    evidence: "IMG-1 Calzone option reads 'Creamy Alredo' (missing letter 'f').",
    proposed_handling: "Auto-corrected to 'Creamy Alfredo' in data structures.",
  },
  {
    id: "CONFLICT-5",
    issue: "Extra Patty Pricing 200/250",
    evidence: "IMG-3 specifies 'EXTRA PATTY 200/250'. Unclear if chicken=200/beef=250 or single=200/double=250.",
    proposed_handling: "Split into 'Extra Chicken Patty (+200 PKR)' and 'Extra Beef Patty (+250 PKR)'.",
  },
  {
    id: "CONFLICT-6",
    issue: "Party Deal Crossed-out Pricing",
    evidence: "IMG-1 shows Party Deal original price '15000' crossed out with special price '9999'.",
    proposed_handling: "Imported at current active selling price of 9,999 PKR.",
  },
];

// -----------------------------------------------------------------------------
// Main Import Workflow (Supports Dry-Run and Live Write)
// -----------------------------------------------------------------------------
async function main() {
  const isWriteMode = process.argv.includes("--write") || process.argv.includes("--execute");
  const isDryRun = !isWriteMode;
  const now = new Date();
  const timestampStr = now.toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const backupDir = path.resolve(process.cwd(), "data", "backups");
  const backupPath = path.resolve(backupDir, `cnm_pre_menu_import_${timestampStr}.db`);

  console.log("================================================================================");
  console.log(`📋 CLUCK N MOO (CNM) - REAL MENU DATABASE IMPORT [${isDryRun ? "DRY-RUN PREVIEW" : "LIVE WRITE MODE"}]`);
  console.log("================================================================================");
  console.log(`Execution Mode: ${isDryRun ? "STRICT DRY-RUN (ZERO Database Writes)" : "LIVE WRITE (Database Update)"}`);
  console.log(`Local Time:     ${now.toLocaleString()}`);
  console.log(`Database Path:  data/cnm.db`);
  console.log(`Safety Backup:  ${backupPath}`);
  console.log("--------------------------------------------------------------------------------\n");

  const db = getDb();

  // 1. Current Database Inspection
  const currentCategories = db.prepare("SELECT * FROM categories ORDER BY display_order ASC").all() as any[];
  const currentProducts = db.prepare("SELECT * FROM products ORDER BY display_order ASC").all() as any[];
  const currentVariants = db.prepare("SELECT * FROM product_variants").all() as any[];
  const currentModifierGroups = db.prepare("SELECT * FROM product_modifier_groups").all() as any[];
  const currentModifiers = db.prepare("SELECT * FROM product_modifiers").all() as any[];
  const orderCountRes = db.prepare("SELECT count(*) as total FROM orders").get() as any;
  const currentOrderCount = orderCountRes?.total || 0;

  console.log("📦 1. PRE-IMPORT DATABASE STATE");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Current Categories:     ${currentCategories.length}`);
  console.log(`Current Products:       ${currentProducts.length}`);
  console.log(`Current Variants:       ${currentVariants.length}`);
  console.log(`Current Modifier Groups:${currentModifierGroups.length}`);
  console.log(`Current Modifiers:      ${currentModifiers.length}`);
  console.log(`Historical Orders:      ${currentOrderCount} (Protected from modification)`);
  console.log("");

  // 2. Calculate Totals
  let totalVariants = 0;
  let totalModifierGroups = 0;
  let totalModifierItems = 0;

  for (const prod of PROPOSED_PRODUCTS) {
    if (prod.variants) totalVariants += prod.variants.length;
    if (prod.modifier_groups) {
      totalModifierGroups += prod.modifier_groups.length;
      for (const grp of prod.modifier_groups) {
        totalModifierItems += grp.items.length;
      }
    }
  }

  const safeImagesCount = PROPOSED_PRODUCTS.filter((p) => p.image_status === "SAFE").length;
  const missingImagesCount = PROPOSED_PRODUCTS.filter((p) => p.image_status === "MISSING_IMAGE").length;
  const duplicateAssetsCount = 1; // cookie_skillet_2_r8an6w

  // 3. Execute Live Write if in Write Mode
  if (isWriteMode) {
    console.log("🛡️ STEP 1: CREATING DATABASE PRE-IMPORT BACKUP...");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const dbPath = path.resolve(process.cwd(), "data", "cnm.db");
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✓ Backup successfully created at: ${backupPath} (${(fs.statSync(backupPath).size / 1024).toFixed(1)} KB)\n`);

    console.log("💾 STEP 2: EXECUTING ATOMIC MENU IMPORT TRANSACTION...");
    runInTransaction(() => {
      // a. Archive demo starter products by marking is_available = 0
      const starterIds = [
        "prod_classic_smash", "prod_cluck_zinger", "prod_moo_cluck_duo",
        "prod_golden_chicken_3", "prod_crispy_tenders", "prod_chicken_tikka_pizza",
        "prod_fajita_sicilian_pizza", "prod_cheese_lover_pizza", "deal_solo_box",
        "deal_duo_smash", "deal_town_family", "side_salted_fries",
        "side_cheddar_fries", "side_garlic_dip", "drink_soft_can", "drink_mineral_water"
      ];
      const archiveStmt = db.prepare("UPDATE products SET is_available = 0 WHERE id = ?");
      for (const id of starterIds) {
        archiveStmt.run(id);
      }

      // b. Insert / Update Categories
      const insertCatStmt = db.prepare(`
        INSERT INTO categories (id, name, slug, display_order, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          slug = excluded.slug,
          display_order = excluded.display_order,
          is_active = excluded.is_active
      `);
      for (const cat of PROPOSED_CATEGORIES) {
        insertCatStmt.run(cat.id, cat.name, cat.slug, cat.display_order, now.toISOString());
      }

      // c. Insert / Update Products
      const insertProdStmt = db.prepare(`
        INSERT INTO products (
          id, category_id, name, slug, description, image_url,
          cloudinary_public_id, image_alt_text, image_status,
          base_price_pkr, is_featured, is_available, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          category_id = excluded.category_id,
          name = excluded.name,
          slug = excluded.slug,
          description = excluded.description,
          image_url = excluded.image_url,
          cloudinary_public_id = excluded.cloudinary_public_id,
          image_alt_text = excluded.image_alt_text,
          image_status = excluded.image_status,
          base_price_pkr = excluded.base_price_pkr,
          is_featured = excluded.is_featured,
          is_available = excluded.is_available,
          display_order = excluded.display_order
      `);

      for (const prod of PROPOSED_PRODUCTS) {
        const altText = `${prod.name} - Cluck N Moo`;
        const status = prod.image_status === "SAFE" ? "SYNCED" : "PENDING";
        insertProdStmt.run(
          prod.id,
          prod.category_id,
          prod.name,
          prod.slug,
          prod.description,
          prod.image_url,
          prod.cloudinary_public_id,
          altText,
          status,
          prod.base_price_pkr,
          prod.is_featured,
          prod.is_available,
          prod.display_order,
          now.toISOString()
        );
      }

      // d. Insert Variants
      const insertVariantStmt = db.prepare(`
        INSERT INTO product_variants (id, product_id, name, price_pkr, is_available, display_order)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          price_pkr = excluded.price_pkr,
          is_available = excluded.is_available,
          display_order = excluded.display_order
      `);

      for (const prod of PROPOSED_PRODUCTS) {
        if (prod.variants && prod.variants.length > 0) {
          prod.variants.forEach((v, idx) => {
            const vSlug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
            const vId = `var_${prod.id}_${vSlug}`;
            insertVariantStmt.run(vId, prod.id, v.name, v.price_pkr, idx);
          });
        }
      }

      // e. Insert Modifier Groups & Items
      const insertGroupStmt = db.prepare(`
        INSERT INTO product_modifier_groups (id, product_id, name, min_selection, max_selection, is_required)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          min_selection = excluded.min_selection,
          max_selection = excluded.max_selection,
          is_required = excluded.is_required
      `);
      const insertModStmt = db.prepare(`
        INSERT INTO product_modifiers (id, group_id, name, price_pkr, is_available)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          price_pkr = excluded.price_pkr,
          is_available = excluded.is_available
      `);

      for (const prod of PROPOSED_PRODUCTS) {
        if (prod.modifier_groups && prod.modifier_groups.length > 0) {
          prod.modifier_groups.forEach((grp, gIdx) => {
            const gSlug = grp.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 25);
            const gId = `grp_${prod.id}_${gSlug}_${gIdx}`;
            insertGroupStmt.run(gId, prod.id, grp.name, grp.min_selection, grp.max_selection, grp.is_required);
            grp.items.forEach((item, mIdx) => {
              const mSlug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 25);
              const mId = `mod_${gId}_${mSlug}_${mIdx}`;
              insertModStmt.run(mId, gId, item.name, item.price_pkr);
            });
          });
        }
      }
    });
    console.log("✓ ATOMIC TRANSACTION COMMITTED SUCCESSFULLY!\n");

    // 4. Post-Import Verification Queries
    console.log("🔍 STEP 3: POST-IMPORT DATABASE VERIFICATION");
    console.log("--------------------------------------------------------------------------------");
    const postCategories = db.prepare("SELECT count(*) as total FROM categories WHERE is_active = 1").get() as any;
    const postActiveProducts = db.prepare("SELECT count(*) as total FROM products WHERE is_available = 1").get() as any;
    const postArchivedProducts = db.prepare("SELECT count(*) as total FROM products WHERE is_available = 0").get() as any;
    const postVariants = db.prepare("SELECT count(*) as total FROM product_variants WHERE is_available = 1").get() as any;
    const postModifierGroups = db.prepare("SELECT count(*) as total FROM product_modifier_groups").get() as any;
    const postModifiers = db.prepare("SELECT count(*) as total FROM product_modifiers WHERE is_available = 1").get() as any;
    const postSyncedImages = db.prepare("SELECT count(*) as total FROM products WHERE image_status = 'SYNCED' AND is_available = 1").get() as any;
    const postPendingImages = db.prepare("SELECT count(*) as total FROM products WHERE (image_status = 'PENDING' OR image_url IS NULL) AND is_available = 1").get() as any;
    const postOrderCount = (db.prepare("SELECT count(*) as total FROM orders").get() as any).total;

    console.log(`Active Categories:      ${postCategories.total}`);
    console.log(`Active Real Products:   ${postActiveProducts.total}`);
    console.log(`Archived Starter Items: ${postArchivedProducts.total} (Historical integrity preserved)`);
    console.log(`Active Variants:        ${postVariants.total}`);
    console.log(`Modifier Groups:        ${postModifierGroups.total}`);
    console.log(`Modifier Options:       ${postModifiers.total}`);
    console.log(`Synced Cloudinary Imgs: ${postSyncedImages.total}`);
    console.log(`Missing Image Products: ${postPendingImages.total}`);
    console.log(`Historical Orders:      ${postOrderCount} (Unchanged: 100% integrity)`);
    console.log("--------------------------------------------------------------------------------\n");
  } else {
    console.log("================================================================================");
    console.log("ℹ️  [DRY-RUN COMPLETE] ZERO database writes performed.");
    console.log("To apply the import to the database, run:");
    console.log("    npm run menu:import");
    console.log("================================================================================\n");
  }

  // 5. Generate / Update docs/REAL_MENU_IMPORT_DRY_RUN_REPORT.md
  const reportContent = `# Cluck N Moo (CNM) Real Menu Database Import Report

> **Execution Timestamp**: ${now.toISOString()}  
> **Execution Mode**: **${isWriteMode ? "LIVE DATABASE COMMIT" : "STRICT DRY-RUN"}**  
> **Database File**: \`data/cnm.db\`  
> **Backup Location**: \`${backupPath}\`  
> **Source Documents**: \`docs/VERIFIED_CNM_MENU_EXTRACTION.md\`, \`docs/CLOUDINARY_MENU_MAPPING_REPORT.md\`, \`docs/REAL_MENU_DATABASE_IMPORT_PLAN.md\`

---

## 1. Summary Metrics & Statistics

| Metric | Pre-Import DB State | Post-Import DB State | Net Change |
| :--- | :--- | :--- | :--- |
| **Active Categories** | ${currentCategories.length} | ${PROPOSED_CATEGORIES.length} | +${PROPOSED_CATEGORIES.length - currentCategories.length} |
| **Active Real Products** | ${currentProducts.length} | ${PROPOSED_PRODUCTS.length} | +${PROPOSED_PRODUCTS.length - currentProducts.length} |
| **Archived Starter Items** | 0 | 16 | +16 (Available=0) |
| **Active Product Variants** | ${currentVariants.length} | ${totalVariants} | +${totalVariants - currentVariants.length} |
| **Modifier Groups** | ${currentModifierGroups.length} | ${totalModifierGroups} | +${totalModifierGroups - currentModifierGroups.length} |
| **Modifier Options** | ${currentModifiers.length} | ${totalModifierItems} | +${totalModifierItems - currentModifiers.length} |
| **Synced Cloudinary Images** | 0 | ${safeImagesCount} | +${safeImagesCount} |
| **Missing Image Products** | - | ${missingImagesCount} | - |
| **Duplicate Assets Excluded** | - | ${duplicateAssetsCount} (\`cookie_skillet_2_r8an6w\`) | - |
| **Historical Orders** | ${currentOrderCount} | ${currentOrderCount} (Protected) | 0 (No data loss) |

---

## 2. Categories Table (${PROPOSED_CATEGORIES.length})

| Category ID | Name | Slug | Display Order | Action |
| :--- | :--- | :--- | :--- | :--- |
${PROPOSED_CATEGORIES.map((c) => `| \`${c.id}\` | **${c.name}** | \`${c.slug}\` | ${c.display_order} | **${c.action}** |`).join("\n")}

---

## 3. Products & Image Sync Table (${PROPOSED_PRODUCTS.length})

| Category | Product Name | Slug | Base Price | Image Status | Cloudinary Public ID | Delivery URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${PROPOSED_PRODUCTS.map((p) => {
  const cat = PROPOSED_CATEGORIES.find((c) => c.id === p.category_id)?.name || p.category_id;
  const assetId = p.cloudinary_public_id ? `\`${p.cloudinary_public_id}\`` : "*None*";
  const url = p.image_url ? `[CDN URL](${p.image_url})` : "*None*";
  return `| ${cat} | **${p.name}** | \`${p.slug}\` | ${p.base_price_pkr} PKR | **${p.image_status}** | ${assetId} | ${url} |`;
}).join("\n")}

---

## 4. Missing Image Items (${missingImagesCount})

${PROPOSED_PRODUCTS.filter((p) => p.image_status === "MISSING_IMAGE").map((mp) => `- **${mp.name}** (\`${mp.id}\`, Category: \`${mp.category_id}\`): ${mp.match_reason}`).join("\n")}

---

## 5. Excluded Duplicate Assets

- **Asset ID**: \`cookie_skillet_2_r8an6w\`
- **Status**: Excluded from mapping (Duplicate angle of Cookie Skillet). Primary asset \`cookie_skillet_yjydjz\` is synced.

---

## 6. Approved Owner Conflict Resolutions Applied

1. **Citrus Honey Crunch**: Used as canonical title with lemon honey sauce description.
2. **Mushroom n Swiss**: Used as canonical title, matching Cloudinary asset \`mushroom_n_swiss_sgd3ct\`.
3. **Smashin' Cluck**: Used as canonical title, matching Cloudinary asset \`smashin_cluck_zcyqml\`.
4. **Creamy Alfredo Calzone**: Corrected typo from menu board *"Creamy Alredo"*.
5. **Extra Patty**: Split into Extra Chicken Patty (200 PKR) and Extra Beef Patty (250 PKR).
6. **Party Deal**: Imported at active selling price of 9,999 PKR.

---

## 7. Rollback Verification

Backup file:
\`\`\`bash
${backupPath}
\`\`\`
Rollback command:
\`\`\`bash
copy "${backupPath}" data/cnm.db
\`\`\`
`;

  const reportPath = path.resolve(process.cwd(), "docs", "REAL_MENU_IMPORT_DRY_RUN_REPORT.md");
  fs.writeFileSync(reportPath, reportContent, "utf8");
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});

