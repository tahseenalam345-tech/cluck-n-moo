# Cluck N Moo (CNM) Homepage Promotion Implementation Report

## Executive Summary
This report documents the end-to-end implementation of the CNM Homepage Promotion System using the 4 banner assets uploaded in Cloudinary. The system is built with a production-ready Supabase PostgreSQL schema, server-side price and option verification, responsive mobile-first UI components (compact 2-column grid on mobile, 4-column grid on desktop), and strict security rules to prevent client price tampering or unauthorized discounts.

---

## 1. Cloudinary Assets Audit Summary

The Cloudinary root namespace contains the 4 requested promotion banners:

| Public ID | Resolution | Visible Offer Title | Visible Price | Deal Contents Extracted | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `promotion_1_fthixm` | 3584 × 1184 (3.03:1) | **PIZZA TREAT** | **Rs. 2,999** | Tray Pizza + Oven Baked Wings (6 Pcs) + Regular Fries with Dip + 1.5 Ltr Soft Drink | **Active** |
| `promotion_2_ofnzlq` | 2172 × 724 (3.00:1) | **YOUR WALLET LOVES THIS DEAL** | **From Rs. 1,290** | **Deal 1:** 1 Medium Pizza + 1 Ltr Drink (**Rs. 1,290**)<br>**Deal 2:** 1 Large Pizza + 1 Ltr Drink (**Rs. 1,850**) | **Active** |
| `promotion_3_pkzoe9` | 2117 × 743 (2.85:1) | **OOPS! THINGS JUST GOT CHEESIER!** | **Rs. 990** | 1 Medium Pizza (Launch Offer) | **Active** |
| `promotion_4_z7vq6y` | 2172 × 724 (3.00:1) | **OOPS! BUY 1 GET 1 PIZZA FREE** | **Rs. 1,499** | 2 Pizzas for Rs. 1,499 | **Inactive (`[NEEDS_CONFIRMATION]`)** |

---

## 2. Promotions Activated vs Needing Confirmation

### Active Promotions (3 Activated)

1. **Pizza Treat Feast (`pizza-treat`)**
   - **Type:** Bundle (`bundle`)
   - **Fixed Base Price:** 2,999 PKR
   - **Badge:** `ONLY 2999`
   - **Rules:**
     - Rule 1: Choose Tray Pizza Flavor (1 required selection from available 7 flavors).
     - Rule 2: Fixed Item: Oven Baked Wings (6 Pcs) — included at 0 adjustment.
     - Rule 3: Fixed Item: Regular Fries with Dip — included at 0 adjustment.
     - Rule 4: Choose 1.5L Soft Drink (1 required selection: Coke, Sprite, Fanta).

2. **Your Wallet Loves This Deal (`wallet-deal`)**
   - **Type:** Tiered Deal (`tiered`)
   - **Base Price:** 1,290 PKR
   - **Badge:** `FROM 1290`
   - **Rules:**
     - Rule 1: Deal Tier selection (Deal 1: Medium Pizza @ 1,290 PKR [+0 PKR] or Deal 2: Large Pizza @ 1,850 PKR [+560 PKR adjustment]).
     - Rule 2: Choose Pizza Flavor (1 required selection from 8 flavors).
     - Rule 3: Choose 1 Liter Drink (1 required selection: Coke, Sprite, Fanta).

3. **1 Medium Pizza Launch Offer (`cheesier-medium-pizza-launch`)**
   - **Type:** Single product promotion (`single`)
   - **Fixed Base Price:** 990 PKR
   - **Badge:** `LAUNCH Rs. 990`
   - **Rules:**
     - Rule 1: Choose Medium (10 inch) Pizza Flavor (1 required selection from 8 flavors). Small and Large sizes are prohibited.

---

### Inactive Promotion (`[NEEDS_CONFIRMATION]`)

4. **Buy 1 Get 1 Pizza Free (`bogo-pizza-deal`)**
   - **Visible Price on Banner:** Rs. 1,499
   - **Image Content Flag:** `[NEEDS_CONFIRMATION: Pizza Size]`
   - **Reason:** The banner graphic states "BUY 1 GET 1 PIZZA FREE - RS. 1499/-" but **does not specify** whether this applies to Small (7"), Medium (10"), or Large (13") pizzas. Normal CNM menu prices are:
     - Small Pizza: 650–700 PKR
     - Medium Pizza: 1,250–1,350 PKR
     - Large Pizza: 1,750–1,950 PKR
   - Because 2 Small pizzas = ~1,350 PKR (less than 1,499 PKR), and 2 Large pizzas = ~3,600 PKR, the offer is likely for Medium pizzas, but per strict instructions ("*Never guess unreadable content. The promotion image is the source of truth*"), we did **NOT guess**.
   - **Action Taken:** The schema and database record were seeded with `is_active = false`. It is completely hidden from the customer storefront and rejected if submitted to the checkout API, awaiting confirmation from the store owner.

---

## 3. Database Model & Architecture

New PostgreSQL tables in Supabase (managed via Drizzle ORM in `src/db/postgres/schema.ts`):

### `promotions`
- `id` (text PK)
- `slug` (text unique, indexed)
- `title` (text)
- `short_description` (text)
- `image_url` (text, Cloudinary optimized URL)
- `cloudinary_public_id` (text)
- `display_order` (integer)
- `is_active` (boolean, indexed)
- `starts_at` (timestamptz, optional)
- `ends_at` (timestamptz, optional)
- `promotion_type` (text: 'bundle' | 'tiered' | 'single')
- `fixed_price_pkr` (integer)
- `badge_text` (text)
- `terms_text` (text)
- `created_at`, `updated_at` (timestamptz)

### `promotion_rules`
- `id` (text PK)
- `promotion_id` (FK to `promotions.id` CASCADE)
- `rule_type` (text: 'product_choice' | 'tier_choice' | 'fixed_item' | 'modifier_choice')
- `min_selections` (integer)
- `max_selections` (integer)
- `required` (boolean)
- `rule_label` (text)
- `display_order` (integer)

### `promotion_rule_options`
- `id` (text PK)
- `promotion_rule_id` (FK to `promotion_rules.id` CASCADE)
- `product_id` (FK to `products.id` SET NULL)
- `product_variant_id` (FK to `product_variants.id` SET NULL)
- `modifier_id` (FK to `product_modifiers.id` SET NULL)
- `option_title` (text)
- `quantity` (integer default 1)
- `price_adjustment_pkr` (integer default 0)
- `display_order` (integer)
- `is_available` (boolean default true)

---

## 4. Frontend Implementation

### Homepage Promotion Grid (`src/components/PromotionsSection.tsx`)
- Placed directly below the "Popular Picks" section on `src/app/page.tsx`.
- Section Header: **"Deals You’ll Love"** with fire icon and deal count badge.
- **Mobile Layout:** Compact 2-column grid (`grid-template-columns: repeat(2, 1fr)`) with compact card heights (~115px–145px) and 3:1 banner aspect ratios. Fully responsive and readable down to 320px width without horizontal overflow.
- **Desktop Layout:** 4-column grid (`grid-template-columns: repeat(4, 1fr)`) within a max-width container (`1240px`).
- **Image Delivery:** Cloudinary dynamic URLs with `f_auto`, `q_auto`, `c_limit,w_800` (or `w_400` on mobile) and native `loading="lazy"`.

### Deal Selector Modal / Bottom Sheet (`src/components/PromotionModal.tsx`)
- On mobile: Polished bottom sheet (max-height 88vh, sticky bottom action bar, touch-friendly tap targets).
- On desktop: Centered modal with backdrop blur.
- Shows banner image, active badge, itemized deal inclusions, option selectors, running total, and required field validation.
- Adds deal items to cart with clear `[DEAL]` identifier and option snapshots.

### Cart Display (`src/components/CartDrawer.tsx`)
- Displays deal badge `[DEAL]` next to promotion items.
- Summarizes the selected options and included items.
- Prevents price alteration.

---

## 5. Backend & Security Verification

Automated test script (`scripts/test-promotion-flow.ts`) verified the following security mechanisms against Supabase PostgreSQL:

1. **Active Promotions Only:** `getActivePromotions()` returns only the 3 confirmed active promotions.
2. **Inactive Promotion Isolation:** Promotion 4 (`bogo-pizza-deal`) is confirmed `is_active: false` and cannot be fetched by storefront clients.
3. **Client Price Tamper Protection:**
   - Client submitted tampered price `500 PKR` for `pizza-treat` (actual: 2,999 PKR).
   - Server rejected the order with `PROMOTION_VALIDATION_ERROR: Price mismatch for promotion 'Pizza Treat Feast'. Expected 2999 PKR but received 500 PKR.`
4. **Option Constraint Enforcement:** Missing required drink selection was rejected with `Please make a selection for required rule: Choose 1.5L Soft Drink`.
5. **Tier Pricing Calculations:** Correctly computes base tier (1,290 PKR) and upgraded tier (1,850 PKR) server-side.
6. **No BYOD Discount for Promotions:** Orders containing promotion items have `customDealId: null` and `discountPkr: 0`, strictly preventing the 5%/10% Custom Deal discount from eroding promotional margins.
7. **Delivery Fee Separation:** Delivery fee is calculated separately and is never absorbed or bundled into promotion pricing.
8. **Immutable Snapshot Storage:** Order records store complete promotion titles and item snapshots in `order_items` (`product_name_snapshot` and `variant_name_snapshot`).

---

## 6. Build & Lint Verification
- **Production Build:** `npm run build` executed successfully with code 0:
  - 16 static pages generated.
  - Zero TypeScript or lint errors.
  - API endpoint `/api/v1/promotions` operational.

---

## 7. Open Questions / Next Steps for Store Owner
- **Promotion 4 Confirmation:** Please confirm the intended pizza size for the "BUY 1 GET 1 PIZZA FREE" (Rs. 1,499) deal (Small, Medium, or Large). Once confirmed, set `is_active = true` in Supabase `promotions` table to automatically display it in the 4-column homepage grid.
