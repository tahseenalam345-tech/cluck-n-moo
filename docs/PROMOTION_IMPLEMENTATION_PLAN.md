# CNM Homepage Promotion Deals Implementation Plan

**Date:** 2026-09-25  
**Objective:** Production-grade promotion deals system for Cluck N Moo storefront driven by real Cloudinary assets and Supabase PostgreSQL.

---

## 1. Promotion Images & Extracted Deal Rules

### Promotion 1: PIZZA TREAT
- **Cloudinary Public ID:** `promotion_1_fthixm`
- **Delivery URL:** `https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1200,f_auto,q_auto/promotion_1_fthixm`
- **Status:** **Active** (`is_active = true`)
- **Stated Price:** 2,999 PKR
- **Rules & Included Items:**
  1. **Tray Pizza (1 Included):** Customer selects 1 Tray Pizza Flavor (`prod_tray_pizza`).
     - Allowed Flavors: Flaming Tikka, Behari Kebab, Hot Pepperoni, Creamy Alfredo, Secret CNM, Chicken Tikka Supreme, Chicken Fajita Sicilian.
     - Price Adjustment: 0 PKR.
  2. **Oven Baked Wings (1 Included):** 6 Pcs Oven Baked Wings (`prod_oven_baked_wings`, variant `var_prod_oven_baked_wings_6_pcs_oven_baked_wings`).
     - Price Adjustment: 0 PKR.
  3. **Fries with Dip (1 Included):** 1x Fries with Dip (`prod_regular_fries` / `prod_large_fries`).
     - Price Adjustment: 0 PKR.
  4. **1.5L Soft Drink (1 Included):** 1x 1.5L Drink (`prod_soda_woda`, variant `var_prod_soda_woda_large_bottle_1_5l_`).
     - Price Adjustment: 0 PKR.
  5. **Optional Add-ons:** Dips (+90 PKR), Extra Stuffed Crust (+250 / +350 PKR).

### Promotion 2: YOUR WALLET LOVES THIS DEAL
- **Cloudinary Public ID:** `promotion_2_ofnzlq`
- **Delivery URL:** `https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1200,f_auto,q_auto/promotion_2_ofnzlq`
- **Status:** **Active** (`is_active = true`)
- **Base Price:** 1,290 PKR
- **Rules & Included Items:**
  1. **Deal Tier Selection (Required, Pick Exactly 1):**
     - **Option A - Deal 1 (Medium & 1 Ltr Drink):** 1,290 PKR (Price Adjustment: 0 PKR).
     - **Option B - Deal 2 (Large & 1 Ltr Drink):** 1,850 PKR (Price Adjustment: +560 PKR).
  2. **Pizza Flavor Selection (Required, Pick Exactly 1):**
     - If Deal 1 selected: Strictly Medium (10 inch) Pizza flavor from CNM catalog.
     - If Deal 2 selected: Strictly Large (13 inch) Pizza flavor from CNM catalog.
  3. **1 Liter Drink Selection (Required, Pick Exactly 1):**
     - 1x Drink (Pepsi / 7Up / Mirinda or equivalent 1L format). Price adjustment: 0 PKR.
  4. **Optional Add-ons:** Crust upgrades & dips with verified price adjustments.

### Promotion 3: OOPS! THINGS JUST GOT CHEESIER! (Launch Offer)
- **Cloudinary Public ID:** `promotion_3_pkzoe9`
- **Delivery URL:** `https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1200,f_auto,q_auto/promotion_3_pkzoe9`
- **Status:** **Active** (`is_active = true`)
- **Stated Price:** 990 PKR
- **Rules & Included Items:**
  1. **Medium Pizza Flavor (Required, Pick Exactly 1):**
     - Customer selects 1 Pizza from available flavors.
     - **Strict constraint:** Size is locked to Medium (10 inch) (`Medium (10 inch)` variant).
     - Prohibited: Small (7 inch) or Large (13 inch) are NOT allowed.
     - Price Adjustment: 0 PKR.
  2. **Optional Add-ons:** Cheese stuffed crust / sauces at standard menu prices.

---

## 2. Promotions Needing Confirmation

### Promotion 4: OOPS! BUY 1 GET 1 PIZZA FREE
- **Cloudinary Public ID:** `promotion_4_z7vq6y`
- **Stated Price:** 1,499 PKR
- **Issue Flag:** `[NEEDS_CONFIRMATION: Pizza size not specified on image]`
- **Action:** Recorded in database with `is_active = false`. Will NOT appear on homepage or checkout until store owner confirms whether the size is Small, Medium, or Large.

---

## 3. Database Architecture & Migrations

### Tables to Add in Supabase PostgreSQL:

```sql
-- 1. promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT,
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  promotion_type TEXT NOT NULL DEFAULT 'bundle', -- 'bundle' | 'tiered' | 'single'
  fixed_price_pkr INTEGER NOT NULL,
  badge_text TEXT,
  terms_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. promotion_rules table
CREATE TABLE IF NOT EXISTS promotion_rules (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL, -- 'product_choice' | 'tier_choice' | 'fixed_item' | 'modifier_choice'
  min_selections INTEGER NOT NULL DEFAULT 1,
  max_selections INTEGER NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT true,
  rule_label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 3. promotion_rule_options table
CREATE TABLE IF NOT EXISTS promotion_rule_options (
  id TEXT PRIMARY KEY,
  promotion_rule_id TEXT NOT NULL REFERENCES promotion_rules(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  modifier_id TEXT REFERENCES product_modifiers(id) ON DELETE SET NULL,
  option_title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_adjustment_pkr INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true
);
```

---

## 4. Frontend & Backend Files to Create/Update

1. **Schema & Migration:**
   - [src/db/postgres/schema.ts](file:///e:/Projects/Cluck%20n%20moo/src/db/postgres/schema.ts): Export Drizzle definitions for `promotions`, `promotionRules`, `promotionRuleOptions`.
   - Migration script / Drizzle push to create tables in Supabase Postgres.
   - Seed script to insert verified promotions and their rules referencing real product/variant IDs.

2. **Types & API:**
   - [src/types/index.ts](file:///e:/Projects/Cluck%20n%20moo/src/types/index.ts): Add `Promotion`, `PromotionRule`, `PromotionRuleOption`, and `PromotionCartItem`.
   - `src/app/api/v1/promotions/route.ts`: Public API to fetch active promotions with rules and options.
   - [src/app/api/v1/orders/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/orders/route.ts): Server-side validation of promotion items, prices, active status, and rule options.

3. **Homepage Components:**
   - `src/components/PromotionsSection.tsx`: "Deals You’ll Love" 2-column mobile grid, 4-column desktop grid with Cloudinary optimized images.
   - `src/components/PromotionModal.tsx`: Polished 85-90vh mobile bottom sheet & desktop centered modal with selection validation, price calculation, and "Add Deal to Cart".
   - [src/app/page.tsx](file:///e:/Projects/Cluck%20n%20moo/src/app/page.tsx): Place `PromotionsSection` directly below `PopularPicksSection`.

4. **Cart Integration:**
   - [src/context/CartContext.tsx](file:///e:/Projects/Cluck%20n%20moo/src/context/CartContext.tsx): Support promotion items with their configured rules, snapshot data, and server price protection.
   - [src/components/CartDrawer.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/CartDrawer.tsx): Render promotion items with distinct deal badges and selected options.

5. **Security & Order Snapshot:**
   - Store promotion snapshot (promotion title, fixed price, selected choices) in `order_items`.
   - Prevent BYOD discounts on promotion items.
