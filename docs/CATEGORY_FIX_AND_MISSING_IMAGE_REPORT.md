# Cluck N Moo (CNM) Category Fix and Missing Image Investigation Report

> **Execution Timestamp**: 2026-09-23  
> **Database File**: `data/cnm.db`  
> **Pre-Fix Backup**: `data/backups/cnm_pre_category_fix_20260923142651.db`  
> **Development Server**: Active (`http://localhost:3000`)  
> **Notice**: *This report reflects verified system fixes. The website is under ongoing development and is not claimed to be fully production-ready.*

---

## 1. Summary of Actions Completed

1. **Database Category Cleanup**:
   - Archived 4 legacy starter/demo categories (`cat_burgers`, `cat_chicken`, `cat_deals`, `cat_sides`) by setting `is_active = 0`.
   - Preserved all historical records and foreign key references.
   - Retained exactly 14 official real CNM categories as active (`is_active = 1`).
   - Cleanly re-sequenced the active category display order from 1 to 14.
2. **Menu API Hardening (`/api/v1/menu`)**:
   - Updated controller to query `WHERE is_active = 1`.
   - Enforced server-side filtering: strictly omits categories where active `products.length === 0`.
3. **Customer Storefront Category Rendering (`src/app/page.tsx`)**:
   - Updated category pill bar and dynamic catalog sections to never render categories with 0 items.
4. **Signature Navigation Mapping (`src/lib/signatureSections.ts`)**:
   - Removed retired category IDs (`cat_sides`, `cat_burgers`, `cat_chicken`, `cat_deals`).
   - Updated mappings to use only official active category IDs (`cat_beef_burgers`, `cat_chicken_burgers`, `cat_appetizers`, `cat_fries_more`, etc.).
5. **Promotions Category References (`src/lib/promotions.ts`)**:
   - Updated `actionCategoryId` from `cat_deals` to `cat_box_deals` and `cat_burgers` to `cat_chicken_burgers`.
   - Updated `ProductCard.tsx` badge logic to recognize `cat_box_deals` and `cat_combo_deals`.
6. **Missing Product Image Investigation**:
   - Performed comprehensive account-wide search across Cloudinary and source menu assets.
   - Identified and classified all 10 products lacking photography.

---

## 2. Categories Archived from Public Use

These 4 legacy starter categories were deactivated (`is_active = 0`) in `data/cnm.db`:

| Category ID | Name | Slug | Reason for Archiving |
| :--- | :--- | :--- | :--- |
| `cat_burgers` | **Smash & Zinger Burgers** | `burgers` | Replaced by `cat_beef_burgers` and `cat_chicken_burgers`. Contained 0 active items (3 archived demo items). |
| `cat_chicken` | **Crispy Chicken & Tenders** | `crispy-chicken` | Replaced by `cat_chicken_burgers` and `cat_appetizers`. Contained 0 active items (2 archived demo items). |
| `cat_deals` | **Exclusive Value Deals** | `deals` | Replaced by `cat_box_deals`, `cat_combo_deals`, and `cat_student_deals`. Contained 0 active items (3 archived demo items). |
| `cat_sides` | **Fries & Signature Dips** | `sides-dips` | Replaced by `cat_fries_more`. Contained 0 active items (3 archived demo items). |

---

## 3. Final Active Public Category List & Product Counts

Verified from `data/cnm.db` and live API `http://localhost:3000/api/v1/menu`:

| Display Order | Category ID | Category Name | Slug | Active Products | Verified Source |
| :---: | :--- | :--- | :--- | :---: | :--- |
| 1 | `cat_beef_burgers` | **Beef Burgers with Cheese** | `beef-burgers` | **5** | IMG-2, IMG-3 |
| 2 | `cat_chicken_burgers` | **Chicken Burgers with Cheese** | `chicken-burgers` | **6** | IMG-2, IMG-3 |
| 3 | `cat_appetizers` | **Appetizers & Fried Chicken** | `appetizers` | **7** | IMG-3 |
| 4 | `cat_fries_more` | **Fries N More** | `fries-more` | **5** | IMG-3 |
| 5 | `cat_wraps` | **Crunchwraps & Tortilla Wraps** | `wraps` | **4** | IMG-3 |
| 6 | `cat_sandwiches` | **Sandwiches** | `sandwiches` | **6** | IMG-4 |
| 7 | `cat_pizzas` | **Artisan Round Pizzas** | `pizzas` | **5** | IMG-5 |
| 8 | `cat_pizza_specials` | **Signature Pizza Specials** | `pizza-specials` | **2** | IMG-1 |
| 9 | `cat_pasta_sides` | **Pastas & Oven Sides** | `pastas-sides` | **7** | IMG-4, IMG-5 |
| 10 | `cat_box_deals` | **Box Deals** | `box-deals` | **9** | IMG-4 |
| 11 | `cat_combo_deals` | **Numbered Combo Deals** | `combo-deals` | **6** | IMG-1 |
| 12 | `cat_student_deals` | **Student Offers** | `student-offers` | **3** | IMG-1 |
| 13 | `cat_desserts` | **Desserts** | `desserts` | **3** | IMG-1, IMG-4 |
| 14 | `cat_drinks` | **Drinks & Chillers** | `drinks` | **6** | IMG-4 |
| **TOTAL** | **14 Categories** | — | — | **74 Products** | — |

---

## 4. Verification Confirmations

### A. API Output Confirmation
- **Total Categories Returned by `/api/v1/menu`**: Exactly **14**.
- **Zero-Product Categories in API**: Exactly **0**.
- **Total Active Products**: **74** (all real verified CNM products).
- **Products with Cloudinary Image URLs**: **64**.

### B. Storefront UI Confirmation
- **"Fries & Signature Dips"**: **CONFIRMED NOT PRESENT** anywhere in API response, category pills, or dynamic catalog sections.
- **"Fries N More"**: **CONFIRMED PRESENT ONCE** at order #4, rendering all 5 real fries products (*Regular Fries with Dip, Large Fries with Dip, Curly Fries with Dip, Beef Cheese Loaded Fries, Chicken Cheese Loaded Fries*).
- **Legacy Starter Categories**: None appear in the storefront.
- **Duplicate Categories**: **CONFIRMED ZERO DUPLICATES**. Every category has a distinct ID, name, slug, and distinct product set.

---

## 5. Phase 2: Missing Product Image Investigation

### Current Status of the 10 Products

| # | Product ID | Product Name | Category | Current Image Status | Official CNM Source Found? | Photo Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `prod_mujhe_anday_wala` | **Mujhe Anday Wala Burger** | Sandwiches | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 2 | `prod_fish_o_fillet` | **Fish O Fillet** | Sandwiches | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 3 | `prod_pasta_la_vista` | **Pasta La Vista** | Pastas & Oven Sides | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 4 | `prod_party_deal` | **Party Deal** | Numbered Combo Deals | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 5 | `prod_still_water` | **Still Water** | Drinks & Chillers | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 6 | `prod_soda_woda` | **Soda Woda** | Drinks & Chillers | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 7 | `prod_lemon_mint_refresher` | **Lemon Mint Refresher** | Drinks & Chillers | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 8 | `prod_peach_iced_tea` | **Peach Iced Tea** | Drinks & Chillers | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 9 | `prod_cold_coffee` | **Cold Coffee** | Drinks & Chillers | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |
| 10 | `prod_milk_shakes` | **Milk Shakes** | Drinks & Chillers | `PENDING` (Fallback Card) | None in Cloudinary or Boards | `NEEDS_GENERATED_OR_REAL_PHOTO` |

### Investigation Findings
1. **Cloudinary Account Audit**:
   - An account-wide search across all folders in Cloudinary (`cloud_name: duo55lhwh`) confirmed that **zero image assets exist for these 10 items**.
   - Cloudinary contains 65 total assets in `cnm/menu`: 64 are mapped to the other 64 menu items, and 1 is a duplicate angle of `cookie_skillet_2_r8an6w`.
2. **Official Menu Image Boards (IMG-1 through IMG-5)**:
   - *Sandwiches & Specialties*: IMG-4 lists *Mujhe Anday Wala Burger*, *Fish O Fillet*, and *Pasta La Vista* as text-only menu entries without accompanying photographic product cutouts.
   - *Beverages*: IMG-4 lists *Drinks & Chillers* as text-only entries with price tables.
   - *Party Deal*: IMG-1 features a small promotional graphic collage (composite illustration of multiple boxes), but no standalone high-resolution food photograph suitable for a single product card.
3. **Compliance with Verification Rules**:
   - No stock photos, random web photos, or unverified competitor assets were added.
   - No external image URLs were injected into database records.
   - The existing high-contrast, premium CNM branded monogram fallback card (`ProductImage.tsx`) continues to serve these 10 items gracefully.
   - Each of the 10 items is categorized as **`NEEDS_GENERATED_OR_REAL_PHOTO`** until official high-res photographs are captured and uploaded to Cloudinary by the restaurant.

---

## 6. Changed Files & Database Artifacts

| File / Artifact | Type | Description |
| :--- | :--- | :--- |
| `data/backups/cnm_pre_category_fix_20260923142651.db` | Backup | Full SQLite snapshot taken immediately before category archiving. |
| `data/cnm.db` | Database | `categories` table: archived 4 starter rows (`is_active = 0`), re-sequenced 14 official rows (1..14). |
| `src/app/api/v1/menu/route.ts` | Code (API) | Added server-side `.filter(cat => cat.products && cat.products.length > 0)` ensuring zero-item categories are never sent to clients. |
| `src/app/page.tsx` | Code (UI) | Added defensive `.filter(cat => cat.products.length > 0)` to category navigation tabs and dynamic catalog grid. |
| `src/lib/signatureSections.ts` | Code (Config) | Removed legacy category IDs (`cat_sides`, `cat_burgers`, `cat_chicken`, `cat_deals`) from `SIGNATURE_SECTIONS`. |
| `src/lib/promotions.ts` | Code (Config) | Updated `actionCategoryId` from `cat_deals` to `cat_box_deals` and `cat_burgers` to `cat_chicken_burgers`. |
| `src/components/ProductCard.tsx` | Code (UI) | Updated badge check to target `cat_box_deals` and `cat_combo_deals`. |

---

## 7. Automated Test Results

| Test Suite / Command | Status | Output Summary |
| :--- | :---: | :--- |
| `npm run build` | **PASSED** (Code 0) | Full Next.js production build succeeded; 14 static pages generated; all routes compiled with zero errors. |
| `npx tsx scripts/test-order-flow.ts` | **PASSED** (Code 0) | Order creation and snapshot immutability verified. |
| `npx tsx scripts/test-state-machine.ts` | **PASSED** (Code 0) | All 9 order state machine & RBAC assertions verified. |
| `npx tsx scripts/test-time.ts` | **PASSED** (Code 0) | 12/12 midnight-crossing operating schedule assertions verified. |
| `npx tsx scripts/test-menu-images.ts` | **PASSED** (Code 0) | Verified responsive Cloudinary image URLs and fallback behavior on live API. |
| `npx tsx scripts/verify-storefront.ts` | **PASSED** (Code 0) | Confirmed 0 empty categories, 14 active categories, 74 products, and complete removal of "Fries & Signature Dips". |
| `npx tsx scripts/verify-all.ts` | **PASSED** (Code 0) | 10/10 end-to-end integration workflows verified (Store status, Delivery areas, Menu, Order, Tracking, KDS, Rider, Dine-in). |
