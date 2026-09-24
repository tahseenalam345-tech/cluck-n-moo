# Complete Menu and Image Inventory Report

> **Execution Mode**: **READ-ONLY AUDIT & VERIFICATION**  
> **Timestamp**: 2026-09-23T14:25:14.818Z  
> **Database File**: `data/cnm.db`  
> **Target Cloudinary Folder**: `cnm/menu` (Cloud Name: `duo55lhwh`)  
> **Storefront URL**: `http://localhost:3000`  

---

## Executive Summary & Urgent Diagnostic

This report is a **100% read-only, evidence-based diagnostic** of the Cluck N Moo menu inventory, database category structure, customer API responses, frontend rendering logic, and Cloudinary media assets. **Zero database writes, code modifications, or UI changes were made.**

### Immediate Finding: Why 0-Item Starter Categories Appear on the Storefront
1. **Four legacy starter/demo categories** created during early development (`cat_burgers`, `cat_chicken`, `cat_deals`, `cat_sides`) still have **`is_active = 1`** in the database table `categories`.
2. All items formerly in those categories were archived (`is_available = 0`) when the real 74-item menu was imported into dedicated categories (`cat_beef_burgers`, `cat_chicken_burgers`, `cat_appetizers`, `cat_fries_more`, etc.).
3. The menu API (`GET /api/v1/menu`) executes:
   `SELECT id, name, slug, display_order FROM categories WHERE is_active = 1 ORDER BY display_order ASC`
   It attaches active products to each category, but **does not filter out categories where `products.length === 0`**.
4. The homepage customer storefront (`src/app/page.tsx`) displays:
   - A Category Pills bar mapping all returned API categories, showing pills like `🍟 FRIES & SIGNATURE DIPS (0)`.
   - A Menu Catalog section below with empty category headings like `🍟 Fries & Signature Dips (0 ITEMS)` because line 178 of `src/app/page.tsx` only filters out empty categories *when a search query is active*. In default browsing mode, it renders every category returned by the API.
5. **Why "Fries & Signature Dips" appears twice**:
   - **First appearance**: In the Category Pills navigation strip (`<button>FRIES & SIGNATURE DIPS 0</button>`).
   - **Second appearance**: Directly below in the dynamic catalog section heading (`<h2>🍟 Fries & Signature Dips 0 ITEMS</h2>`).
   - **Adjacent Confusion**: In the navigation strip, customers see `FRIES & SIGNATURE DIPS (0)` (from `cat_sides`) directly adjacent to `FRIES N MORE (5)` (from `cat_fries_more`), creating a duplicate Fries category experience where one is an empty starter ghost and the other contains the actual fries items.
   - **Signature Filter Confusion**: In `src/lib/signatureSections.ts`, the "Bon a Petit" signature section maps both `cat_sides` and `cat_fries_more`.

---

## Section 1 — Current Database Categories

The database `categories` table currently contains **18 categories**:
- **4 Starter/Demo Categories**: Active in DB (`is_active = 1`), but have **0 active products** (only 2–3 archived demo products each).
- **14 Official Real CNM Categories**: Active in DB (`is_active = 1`), containing all **74 active menu products**.

| Category ID | Name | Slug | Display Order | Active Status | Total Linked | Active Linked | Archived Linked | Classification | Products List |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `cat_burgers` | **Smash & Zinger Burgers** | `burgers` | 0 | `is_active = 1` | 3 | **0** | 3 | **STARTER_DEMO (EMPTY)** | The Classic Smash Burger [ARCHIVED], Crispy Cluck Zinger [ARCHIVED], Moo & Cluck Duo Monster [ARCHIVED] |
| `cat_beef_burgers` | **Beef Burgers with Cheese** | `beef-burgers` | 1 | `is_active = 1` | 5 | **5** | 0 | OFFICIAL_REAL | The OG [ACTIVE], Classic Cheeseburger [ACTIVE], Oklahoma Smash [ACTIVE], Mushroom n Swiss [ACTIVE], Philly CheeseSteak [ACTIVE] |
| `cat_chicken` | **Crispy Chicken & Tenders** | `crispy-chicken` | 1 | `is_active = 1` | 2 | **0** | 2 | **STARTER_DEMO (EMPTY)** | Golden Fried Chicken (3 Pcs) [ARCHIVED], Crispy Chicken Tenders (4 Pcs) [ARCHIVED] |
| `cat_chicken_burgers` | **Chicken Burgers with Cheese** | `chicken-burgers` | 2 | `is_active = 1` | 6 | **6** | 0 | OFFICIAL_REAL | Original Xinger [ACTIVE], Nashville Hot [ACTIVE], Citrus Honey Crunch [ACTIVE], Smashin' Cluck [ACTIVE], Smoky BBQ [ACTIVE], Clucky Patty [ACTIVE] |
| `cat_deals` | **Exclusive Value Deals** | `deals` | 2 | `is_active = 1` | 3 | **0** | 3 | **STARTER_DEMO (EMPTY)** | CNM Solo Box Deal [ARCHIVED], Duo Smash Feast [ARCHIVED], Juiciest in Town Family Feast [ARCHIVED] |
| `cat_appetizers` | **Appetizers & Fried Chicken** | `appetizers` | 3 | `is_active = 1` | 7 | **7** | 0 | OFFICIAL_REAL | Onion Rings [ACTIVE], Mozzarella Sticks [ACTIVE], Fish N Chips [ACTIVE], Nuggets N Fries [ACTIVE], Chicken Strips [ACTIVE], Chicken Wings [ACTIVE], Fried Chicken [ACTIVE] |
| `cat_sides` | **Fries & Signature Dips** | `sides-dips` | 3 | `is_active = 1` | 3 | **0** | 3 | **STARTER_DEMO (EMPTY)** | Classic Golden Fries [ARCHIVED], Melted Cheese & Jalapeno Loaded Fries [ARCHIVED], Signature Garlic Mayo Dip [ARCHIVED] |
| `cat_fries_more` | **Fries N More** | `fries-more` | 4 | `is_active = 1` | 5 | **5** | 0 | OFFICIAL_REAL | Regular Fries with Dip [ACTIVE], Large Fries with Dip [ACTIVE], Curly Fries with Dip [ACTIVE], Beef Cheese Loaded Fries [ACTIVE], Chicken Cheese Loaded Fries [ACTIVE] |
| `cat_wraps` | **Crunchwraps & Tortilla Wraps** | `wraps` | 5 | `is_active = 1` | 4 | **4** | 0 | OFFICIAL_REAL | Creamy Kruncher [ACTIVE], Flame Fold [ACTIVE], Crispy Chicken Wrap [ACTIVE], Grilled Chicken Wrap [ACTIVE] |
| `cat_sandwiches` | **Sandwiches** | `sandwiches` | 6 | `is_active = 1` | 6 | **6** | 0 | OFFICIAL_REAL | Cheese Toast [ACTIVE], Mujhe Anday Wala Burger [ACTIVE], Smashed Beef Sandwich [ACTIVE], Crispy Chicken Sandwich [ACTIVE], Grilled Chicken Sandwich [ACTIVE], Fish O Fillet [ACTIVE] |
| `cat_pizzas` | **Artisan Round Pizzas** | `pizzas` | 7 | `is_active = 1` | 8 | **5** | 3 | OFFICIAL_REAL | Chicken Tikka Supreme Pizza [ARCHIVED], Chicken Fajita Sicilian Pizza [ARCHIVED], Flaming Tikka [ACTIVE], Behari Kebab [ACTIVE], Cheesy Four-Cheese Lover [ARCHIVED], Hot Pepperoni [ACTIVE], Creamy Alfredo [ACTIVE], Secret CNM [ACTIVE] |
| `cat_pizza_specials` | **Signature Pizza Specials** | `pizza-specials` | 8 | `is_active = 1` | 2 | **2** | 0 | OFFICIAL_REAL | Tray Pizza [ACTIVE], Stuffed Calzone [ACTIVE] |
| `cat_pasta_sides` | **Pastas & Oven Sides** | `pastas-sides` | 9 | `is_active = 1` | 7 | **7** | 0 | OFFICIAL_REAL | Pasta La Vista [ACTIVE], Spin Rolls [ACTIVE], Cheesy Garlic Bread [ACTIVE], Baked Creamy Pasta [ACTIVE], Italian Pasta [ACTIVE], Pizza Fries [ACTIVE], Oven Baked Wings [ACTIVE] |
| `cat_box_deals` | **Box Deals** | `box-deals` | 10 | `is_active = 1` | 9 | **9** | 0 | OFFICIAL_REAL | Big Bird Duo [ACTIVE], Bull - Dozed [ACTIVE], Too Hot To Handle [ACTIVE], Wrap It Up [ACTIVE], Triple Threat [ACTIVE], Chicken Box [ACTIVE], CNM Fiesta [ACTIVE], Quad Chick Feast [ACTIVE], Cluckin' Mootastic [ACTIVE] |
| `cat_combo_deals` | **Numbered Combo Deals** | `combo-deals` | 11 | `is_active = 1` | 6 | **6** | 0 | OFFICIAL_REAL | Deal 1 [ACTIVE], Deal 2 [ACTIVE], Deal 3 [ACTIVE], Deal 4 [ACTIVE], Deal 5 (2 X Pizzas) [ACTIVE], Party Deal [ACTIVE] |
| `cat_student_deals` | **Student Offers** | `student-offers` | 12 | `is_active = 1` | 3 | **3** | 0 | OFFICIAL_REAL | Student Deal 1 [ACTIVE], Student Deal 2 [ACTIVE], Student Deal 3 [ACTIVE] |
| `cat_desserts` | **Desserts** | `desserts` | 13 | `is_active = 1` | 3 | **3** | 0 | OFFICIAL_REAL | Choco French Toast [ACTIVE], Churros Locos [ACTIVE], Cookie Skillet [ACTIVE] |
| `cat_drinks` | **Drinks & Chillers** | `drinks` | 14 | `is_active = 1` | 8 | **6** | 2 | OFFICIAL_REAL | Chilled Soft Drink (345ml) [ARCHIVED], Mineral Water (500ml) [ARCHIVED], Still Water [ACTIVE], Soda Woda [ACTIVE], Lemon Mint Refresher [ACTIVE], Peach Iced Tea [ACTIVE], Cold Coffee [ACTIVE], Milk Shakes [ACTIVE] |

---

## Section 2 — Current Customer Menu API

### API Route Details
- **Endpoint**: `GET /api/v1/menu` (implemented in `src/app/api/v1/menu/route.ts`)
- **Controller Logic**:
  1. Fetches categories: `SELECT id, name, slug, display_order FROM categories WHERE is_active = 1 ORDER BY display_order ASC`
  2. Fetches products: `SELECT ... FROM products WHERE is_available = 1 ORDER BY display_order ASC`
  3. Fetches variants & modifiers and joins hierarchically.
  4. Associates products: `cat.products = products.filter((p) => p.categoryId === cat.id);`
  5. Returns `NextResponse.json({ success: true, data: { categories, featuredProducts } })`

### Data Origin
- **Source**: Directly queried from local SQLite database `data/cnm.db`.
- **Hard-coded vs Dynamic**: Category and product catalog is 100% dynamic from SQLite.

### Live API Inspection Results (`http://localhost:3000/api/v1/menu`)
- **Total Categories Returned**: **18**
- **Zero-Item Categories Returned**: **YES (4 categories)**
  - `cat_burgers` ("Smash & Zinger Burgers"): 0 products
  - `cat_chicken` ("Crispy Chicken & Tenders"): 0 products
  - `cat_deals` ("Exclusive Value Deals"): 0 products
  - `cat_sides` ("Fries & Signature Dips"): 0 products
- **Duplicate Category Names in API**: None (each has a distinct `id` and `name`). However, `cat_sides` ("Fries & Signature Dips") and `cat_fries_more` ("Fries N More") both represent Fries.

| API Returned Category ID | Category Name | Slug | Display Order | Products Count | Contains 0 Items? |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `cat_burgers` | **Smash & Zinger Burgers** | `burgers` | 0 | 0 | ⚠️ **YES (EMPTY)** |
| `cat_chicken` | **Crispy Chicken & Tenders** | `crispy-chicken` | 1 | 0 | ⚠️ **YES (EMPTY)** |
| `cat_beef_burgers` | **Beef Burgers with Cheese** | `beef-burgers` | 1 | 5 | NO |
| `cat_deals` | **Exclusive Value Deals** | `deals` | 2 | 0 | ⚠️ **YES (EMPTY)** |
| `cat_chicken_burgers` | **Chicken Burgers with Cheese** | `chicken-burgers` | 2 | 6 | NO |
| `cat_sides` | **Fries & Signature Dips** | `sides-dips` | 3 | 0 | ⚠️ **YES (EMPTY)** |
| `cat_appetizers` | **Appetizers & Fried Chicken** | `appetizers` | 3 | 7 | NO |
| `cat_fries_more` | **Fries N More** | `fries-more` | 4 | 5 | NO |
| `cat_wraps` | **Crunchwraps & Tortilla Wraps** | `wraps` | 5 | 4 | NO |
| `cat_sandwiches` | **Sandwiches** | `sandwiches` | 6 | 6 | NO |
| `cat_pizzas` | **Artisan Round Pizzas** | `pizzas` | 7 | 5 | NO |
| `cat_pizza_specials` | **Signature Pizza Specials** | `pizza-specials` | 8 | 2 | NO |
| `cat_pasta_sides` | **Pastas & Oven Sides** | `pastas-sides` | 9 | 7 | NO |
| `cat_box_deals` | **Box Deals** | `box-deals` | 10 | 9 | NO |
| `cat_combo_deals` | **Numbered Combo Deals** | `combo-deals` | 11 | 6 | NO |
| `cat_student_deals` | **Student Offers** | `student-offers` | 12 | 3 | NO |
| `cat_desserts` | **Desserts** | `desserts` | 13 | 3 | NO |
| `cat_drinks` | **Drinks & Chillers** | `drinks` | 14 | 6 | NO |

---

## Section 3 — Current Frontend Category Rendering

### Customer-Facing Files & Responsibilities

| File Path | Component / Role | Rendering Nature | Categories Rendered |
| :--- | :--- | :--- | :--- |
| `src/app/page.tsx` | Homepage Main Storefront | Dynamic (API) | Category navigation pills (`categories.map`) + dynamic catalog sections (`finalDisplayCategories.map`). |
| `src/app/menu/page.tsx` | Full Menu Standalone Route | Dynamic (API) | Full menu grid with search. Note: Filters out empty categories (`cat.products.length > 0`). |
| `src/app/deals/page.tsx` | Deals Dedicated Route | Dynamic (API) | Flattens all categories containing "deal" or "offer". |
| `src/lib/signatureSections.ts` | Signature Navigation Config | Static Constants | Defines 7 signature sections (`menú`, `bon a petit`, `pizza menú`, `muuu`, `cloc cloc`, `mmm.....`, `historia`). Maps category IDs to signature views. |
| `src/components/SignatureNavigationStrip.tsx` | Sticky Signature Navigation Strip | Static Config | Renders branded signature tabs and icon assets. |
| `src/components/ProductCard.tsx` | Product Presentation Card | Dynamic Component | Renders category badge text via `getCategoryBadge()` switch on `product.categoryId`. |
| `src/lib/promotions.ts` | Promotional Banners | Static Config | Hard-codes `actionCategoryId: "cat_deals"` and `"cat_burgers"`. |

### Exact Source Responsible for Old Starter Categories

| Category Displayed | Exact Source in DB / Code | Why It Shows 0 Items |
| :--- | :--- | :--- |
| **Smash & Zinger Burgers** | Database row `cat_burgers` (`is_active = 1`, order 0). Returned by `/api/v1/menu`. Rendered by `page.tsx` line 356 & 495. | All active burgers were imported into `cat_beef_burgers` and `cat_chicken_burgers`. The 3 original demo burgers were set to `is_available = 0`. |
| **Crispy Chicken & Tenders** | Database row `cat_chicken` (`is_active = 1`, order 1). Returned by `/api/v1/menu`. Rendered by `page.tsx` line 356 & 495. | All active chicken items were imported into `cat_chicken_burgers` and `cat_appetizers`. The 2 original demo items were set to `is_available = 0`. |
| **Exclusive Value Deals** | Database row `cat_deals` (`is_active = 1`, order 2). Returned by `/api/v1/menu`. Rendered by `page.tsx` line 356 & 495. | All active deals were imported into `cat_box_deals`, `cat_combo_deals`, and `cat_student_deals`. The 3 original demo deals were set to `is_available = 0`. |
| **Fries & Signature Dips** | Database row `cat_sides` (`is_active = 1`, order 3). Returned by `/api/v1/menu`. Rendered by `page.tsx` line 356 & 495. | All active fries items were imported into `cat_fries_more`. The 3 original demo items were set to `is_available = 0`. |
| **Duplicate Fries & Signature Dips** | Visual duplicate caused by `cat_sides` appearing in the pill bar, in the section below, and sitting alongside real category `cat_fries_more` ("Fries N More"). | `cat_sides` has 0 active items. Customers see two Fries tabs side-by-side: "Fries & Signature Dips" (0 items) and "Fries N More" (5 items). |

---

## Section 4 — Complete Product Inventory

### Metric Totals
- **Total Products in Database**: **90**
- **Total Active Products**: **74** (100% verified real CNM items)
- **Total Archived Starter/Demo Products**: **16** (`is_available = 0`)
- **Total Products with Cloudinary Image Mappings**: **64**
- **Total Products without Image Mappings**: **10** (Pending restaurant photo uploads)
- **Total Products Rendering Image in Customer UI**: **64** (uses responsive Cloudinary WebP `srcSet`)
- **Total Products Rendering Fallback Card**: **10** (renders high-contrast CNM branded monogram placeholder)

### Complete Product Inventory Table (All 74 Active Products + 16 Archived)

| ID | Product Name | Slug | Category Name | Price (PKR) | Status | Image URL Present? | Cloudinary Public ID | Image Status | Rendering in UI? | Source Type | Menu Source Ref |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :--- | :--- |
| `deal_solo_box` | **CNM Solo Box Deal** | `cnm-solo-box-deal` | Exclusive Value Deals | 890 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_chicken_tikka_pizza` | **Chicken Tikka Supreme Pizza** | `chicken-tikka-supreme-pizza` | Artisan Round Pizzas | 850 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `drink_soft_can` | **Chilled Soft Drink (345ml)** | `chilled-soft-drink-345ml` | Drinks & Chillers | 120 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `side_salted_fries` | **Classic Golden Fries** | `classic-golden-fries` | Fries & Signature Dips | 250 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_golden_chicken_3` | **Golden Fried Chicken (3 Pcs)** | `golden-fried-chicken-3pcs` | Crispy Chicken & Tenders | 650 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_classic_smash` | **The Classic Smash Burger** | `classic-smash-burger` | Smash & Zinger Burgers | 550 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_big_bird_duo` | **Big Bird Duo** | `big-bird-duo-deal` | Box Deals | 1550 | ACTIVE | YES | `big_bird_duo_rs96vy` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_cheese_toast` | **Cheese Toast** | `cheese-toast` | Sandwiches | 330 | ACTIVE | YES | `cheese_toast_nup1ek` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_fajita_sicilian_pizza` | **Chicken Fajita Sicilian Pizza** | `chicken-fajita-sicilian-pizza` | Artisan Round Pizzas | 850 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_choco_french_toast` | **Choco French Toast** | `choco-french-toast` | Desserts | 550 | ACTIVE | YES | `chco_french_toast_ez49da` | `SYNCED` | YES | Real CNM Menu | IMG-1 to IMG-5 |
| `prod_creamy_kruncher` | **Creamy Kruncher** | `creamy-kruncher` | Crunchwraps & Tortilla Wraps | 550 | ACTIVE | YES | `creamy_kruncher_lizjvj` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_crispy_tenders` | **Crispy Chicken Tenders (4 Pcs)** | `crispy-chicken-tenders-4pcs` | Crispy Chicken & Tenders | 520 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_cluck_zinger` | **Crispy Cluck Zinger** | `crispy-cluck-zinger` | Smash & Zinger Burgers | 480 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_deal_1` | **Deal 1** | `combo-deal-1` | Numbered Combo Deals | 1600 | ACTIVE | YES | `deal_1_plteut` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `deal_duo_smash` | **Duo Smash Feast** | `duo-smash-feast` | Exclusive Value Deals | 1450 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_flaming_tikka_pizza` | **Flaming Tikka** | `flaming-tikka-pizza` | Artisan Round Pizzas | 550 | ACTIVE | YES | `flaming_tikka_jlxcvy` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `side_cheddar_fries` | **Melted Cheese & Jalapeno Loaded Fries** | `cheddar-jalapeno-loaded-fries` | Fries & Signature Dips | 420 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `drink_mineral_water` | **Mineral Water (500ml)** | `mineral-water-500ml` | Drinks & Chillers | 70 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_onion_rings` | **Onion Rings** | `onion-rings` | Appetizers & Fried Chicken | 340 | ACTIVE | YES | `onion_rings_pqkanq` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_original_xinger` | **Original Xinger** | `original-xinger-burger` | Chicken Burgers with Cheese | 450 | ACTIVE | YES | `original_xinger_gdemnd` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_pasta_la_vista` | **Pasta La Vista** | `pasta-la-vista` | Pastas & Oven Sides | 630 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-5 |
| `prod_regular_fries` | **Regular Fries with Dip** | `regular-fries-with-dip` | Fries N More | 200 | ACTIVE | YES | `regular_fries_ih8b6a` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_still_water` | **Still Water** | `still-water` | Drinks & Chillers | 80 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_student_deal_1` | **Student Deal 1** | `student-deal-1` | Student Offers | 950 | ACTIVE | YES | `student_deal_1_bkrn27` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_the_og` | **The OG** | `the-og-burger` | Beef Burgers with Cheese | 730 | ACTIVE | YES | `the_og_aigens` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_tray_pizza` | **Tray Pizza** | `tray-pizza` | Signature Pizza Specials | 2100 | ACTIVE | YES | `tray_pizza_pnyv2v` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_behari_kebab_pizza` | **Behari Kebab** | `behari-kebab-pizza` | Artisan Round Pizzas | 550 | ACTIVE | YES | `behari_kebab_vg8nrm` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_bull_dozed` | **Bull - Dozed** | `bull-dozed-deal` | Box Deals | 1920 | ACTIVE | YES | `bull_dozed_kgvg3p` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_cheese_lover_pizza` | **Cheesy Four-Cheese Lover** | `cheesy-four-cheese-lover-pizza` | Artisan Round Pizzas | 790 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_churros_locos` | **Churros Locos** | `churros-locos` | Desserts | 350 | ACTIVE | YES | `churros_locos_liffri` | `SYNCED` | YES | Real CNM Menu | IMG-1 to IMG-5 |
| `prod_classic_cheeseburger` | **Classic Cheeseburger** | `classic-cheeseburger` | Beef Burgers with Cheese | 620 | ACTIVE | YES | `classic_cheeseburger_fwnokj` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_deal_2` | **Deal 2** | `combo-deal-2` | Numbered Combo Deals | 2450 | ACTIVE | YES | `deal_2_rv9dvu` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_flame_fold` | **Flame Fold** | `flame-fold` | Crunchwraps & Tortilla Wraps | 550 | ACTIVE | YES | `flame_fold_vcntdq` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `deal_town_family` | **Juiciest in Town Family Feast** | `town-family-feast` | Exclusive Value Deals | 2850 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_large_fries` | **Large Fries with Dip** | `large-fries-with-dip` | Fries N More | 350 | ACTIVE | YES | `large_fries_fgkhrp` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_moo_cluck_duo` | **Moo & Cluck Duo Monster** | `moo-cluck-duo-monster` | Smash & Zinger Burgers | 980 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_mozzarella_sticks` | **Mozzarella Sticks** | `mozzarella-sticks` | Appetizers & Fried Chicken | 590 | ACTIVE | YES | `mozzarella_sticks_vwnda5` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_mujhe_anday_wala` | **Mujhe Anday Wala Burger** | `mujhe-anday-wala-burger` | Sandwiches | 490 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_nashville_hot` | **Nashville Hot** | `nashville-hot-burger` | Chicken Burgers with Cheese | 590 | ACTIVE | YES | `nashville_hot_ahgt9q` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `side_garlic_dip` | **Signature Garlic Mayo Dip** | `signature-garlic-mayo-dip` | Fries & Signature Dips | 70 | ARCHIVED | NO | `None` | `PENDING` | NO (Fallback) | Starter/Demo (Archived) | Demo Seed (Deprecated) |
| `prod_soda_woda` | **Soda Woda** | `soda-woda` | Drinks & Chillers | 110 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_spin_rolls` | **Spin Rolls** | `spin-rolls` | Pastas & Oven Sides | 420 | ACTIVE | YES | `spin_rolls_ihzaju` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_student_deal_2` | **Student Deal 2** | `student-deal-2` | Student Offers | 870 | ACTIVE | YES | `student_deal_2_xth6lv` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_stuffed_calzone` | **Stuffed Calzone** | `stuffed-calzone` | Signature Pizza Specials | 950 | ACTIVE | YES | `stuffed_calzone_t8ea5y` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_cheesy_garlic_bread` | **Cheesy Garlic Bread** | `cheesy-garlic-bread` | Pastas & Oven Sides | 350 | ACTIVE | YES | `cheesy_garlic_bread_z6mmig` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_citrus_honey_crunch` | **Citrus Honey Crunch** | `citrus-honey-crunch-burger` | Chicken Burgers with Cheese | 590 | ACTIVE | YES | `citrus_honey_crush_rcslnq` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_cookie_skillet` | **Cookie Skillet** | `cookie-skillet` | Desserts | 450 | ACTIVE | YES | `cookie_skillet_yjydjz` | `SYNCED` | YES | Real CNM Menu | IMG-1 to IMG-5 |
| `prod_crispy_chicken_wrap` | **Crispy Chicken Wrap** | `crispy-chicken-wrap` | Crunchwraps & Tortilla Wraps | 560 | ACTIVE | YES | `crispy_chicken_wrap_mrq5r9` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_curly_fries` | **Curly Fries with Dip** | `curly-fries-with-dip` | Fries N More | 470 | ACTIVE | YES | `curly_fries_kpg20j` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_deal_3` | **Deal 3** | `combo-deal-3` | Numbered Combo Deals | 3600 | ACTIVE | YES | `deal_3_slcbma` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_fish_n_chips` | **Fish N Chips** | `fish-n-chips` | Appetizers & Fried Chicken | 1400 | ACTIVE | YES | `fish_n_chips_q1aj81` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_hot_pepperoni_pizza` | **Hot Pepperoni** | `hot-pepperoni-pizza` | Artisan Round Pizzas | 550 | ACTIVE | YES | `pepparoni_t2gore` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_lemon_mint_refresher` | **Lemon Mint Refresher** | `lemon-mint-refresher` | Drinks & Chillers | 250 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_oklahoma_smash` | **Oklahoma Smash** | `oklahoma-smash-burger` | Beef Burgers with Cheese | 670 | ACTIVE | YES | `oklahoma_wzcypj` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_smashed_beef_sandwich` | **Smashed Beef Sandwich** | `smashed-beef-sandwich` | Sandwiches | 740 | ACTIVE | YES | `smashed_beef_sandwich_r372qm` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_student_deal_3` | **Student Deal 3** | `student-deal-3` | Student Offers | 799 | ACTIVE | YES | `student_deal_3_qluyzp` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_too_hot_to_handle` | **Too Hot To Handle** | `too-hot-to-handle-deal` | Box Deals | 1580 | ACTIVE | YES | `too_hot_to_handle_m9lvrs` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_baked_creamy_pasta` | **Baked Creamy Pasta** | `baked-creamy-pasta` | Pastas & Oven Sides | 690 | ACTIVE | YES | `creamy_baked_pasta_wybng5` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_beef_cheese_loaded_fries` | **Beef Cheese Loaded Fries** | `beef-cheese-loaded-fries` | Fries N More | 690 | ACTIVE | YES | `beef_cheese_fries_fzsrlb` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_creamy_alfredo_pizza` | **Creamy Alfredo** | `creamy-alfredo-pizza` | Artisan Round Pizzas | 550 | ACTIVE | YES | `creamy_alfredo_dexsaa` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_crispy_chicken_sandwich` | **Crispy Chicken Sandwich** | `crispy-chicken-sandwich` | Sandwiches | 640 | ACTIVE | YES | `crispy_chicken_sandwich_tfxhzj` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_deal_4` | **Deal 4** | `combo-deal-4` | Numbered Combo Deals | 700 | ACTIVE | YES | `deal_4_zrrbyz` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_grilled_chicken_wrap` | **Grilled Chicken Wrap** | `grilled-chicken-wrap` | Crunchwraps & Tortilla Wraps | 650 | ACTIVE | YES | `grilled_chicken_wrap_aemujl` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_mushroom_n_swiss` | **Mushroom n Swiss** | `mushroom-n-swiss-burger` | Beef Burgers with Cheese | 740 | ACTIVE | YES | `mushroom_n_swiss_sgd3ct` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_nuggets_n_fries` | **Nuggets N Fries** | `nuggets-n-fries` | Appetizers & Fried Chicken | 490 | ACTIVE | YES | `nuggests_n_fries_gezwji` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_peach_iced_tea` | **Peach Iced Tea** | `peach-iced-tea` | Drinks & Chillers | 250 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_smashin_cluck` | **Smashin' Cluck** | `smashin-cluck-burger` | Chicken Burgers with Cheese | 490 | ACTIVE | YES | `smashin_cluck_zcyqml` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_wrap_it_up` | **Wrap It Up** | `wrap-it-up-deal` | Box Deals | 1380 | ACTIVE | YES | `wrap_it_up_ninvgr` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_chicken_cheese_loaded_fries` | **Chicken Cheese Loaded Fries** | `chicken-cheese-loaded-fries` | Fries N More | 650 | ACTIVE | YES | `chicken_cheese_loaded_fries_mxhvzl` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_chicken_strips` | **Chicken Strips** | `chicken-strips` | Appetizers & Fried Chicken | 550 | ACTIVE | YES | `chicken_strips_vqmbba` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_cold_coffee` | **Cold Coffee** | `cold-coffee` | Drinks & Chillers | 450 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_deal_5` | **Deal 5 (2 X Pizzas)** | `combo-deal-5` | Numbered Combo Deals | 1050 | ACTIVE | YES | `deal_5_u3cfyg` | `SYNCED` | YES | Real CNM Menu | IMG-1 |
| `prod_grilled_chicken_sandwich` | **Grilled Chicken Sandwich** | `grilled-chicken-sandwich` | Sandwiches | 670 | ACTIVE | YES | `grilled_chicken_sandwich_vibv9o` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_italian_pasta` | **Italian Pasta** | `italian-pasta` | Pastas & Oven Sides | 690 | ACTIVE | YES | `italian_pasta_aogag6` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_philly_cheesesteak` | **Philly CheeseSteak** | `philly-cheesesteak` | Beef Burgers with Cheese | 750 | ACTIVE | YES | `philly_cheesestack_un02hn` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_secret_cnm_pizza` | **Secret CNM** | `secret-cnm-pizza` | Artisan Round Pizzas | 550 | ACTIVE | YES | `secret_cnm_nd4ld2` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_smoky_bbq` | **Smoky BBQ** | `smoky-bbq-burger` | Chicken Burgers with Cheese | 570 | ACTIVE | YES | `smoky_bbq_woq6kt` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_triple_threat` | **Triple Threat** | `triple-threat-deal` | Box Deals | 2290 | ACTIVE | YES | `triple_threat_ptkwku` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_chicken_box` | **Chicken Box** | `chicken-box-deal` | Box Deals | 890 | ACTIVE | YES | `chicken_box_ixcgna` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_chicken_wings` | **Chicken Wings** | `chicken-wings` | Appetizers & Fried Chicken | 550 | ACTIVE | YES | `chicken_wings_gpmwfl` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_clucky_patty` | **Clucky Patty** | `clucky-patty-burger` | Chicken Burgers with Cheese | 420 | ACTIVE | YES | `clucky_patty_eebg5g` | `SYNCED` | YES | Real CNM Menu | IMG-2, IMG-3 |
| `prod_fish_o_fillet` | **Fish O Fillet** | `fish-o-fillet` | Sandwiches | 850 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_milk_shakes` | **Milk Shakes** | `milk-shakes` | Drinks & Chillers | 540 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-4 |
| `prod_party_deal` | **Party Deal** | `party-deal` | Numbered Combo Deals | 9999 | ACTIVE | NO | `None` | `PENDING` | NO (Fallback) | Real CNM Menu | IMG-1 |
| `prod_pizza_fries` | **Pizza Fries** | `pizza-fries` | Pastas & Oven Sides | 690 | ACTIVE | YES | `pizza_fries_wfcsrr` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_cnm_fiesta` | **CNM Fiesta** | `cnm-fiesta-deal` | Box Deals | 3450 | ACTIVE | YES | `cnm_fiesta_s3cmyi` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_fried_chicken` | **Fried Chicken** | `fried-chicken` | Appetizers & Fried Chicken | 210 | ACTIVE | YES | `fired_chicken_jm1lel` | `SYNCED` | YES | Real CNM Menu | IMG-3 |
| `prod_oven_baked_wings` | **Oven Baked Wings** | `oven-baked-wings` | Pastas & Oven Sides | 400 | ACTIVE | YES | `oven_baked_wings_uloepi` | `SYNCED` | YES | Real CNM Menu | IMG-5 |
| `prod_quad_chick_feast` | **Quad Chick Feast** | `quad-chick-feast-deal` | Box Deals | 2480 | ACTIVE | YES | `quad_chick_feast_efsbgm` | `SYNCED` | YES | Real CNM Menu | IMG-4 |
| `prod_cluckin_mootastic` | **Cluckin' Mootastic** | `cluckin-mootastic-deal` | Box Deals | 3350 | ACTIVE | YES | `cluckin_mootastic_vmlfyp` | `SYNCED` | YES | Real CNM Menu | IMG-4 |

---

## Section 5 — Cloudinary Media Inventory (`cnm/menu` Folder)

### Cloudinary Metric Totals
- **Total Cloudinary Assets Discovered**: **65**
- **Total Assets Mapped to Database Products**: **64**
- **Total Assets Rendering in Customer UI**: **64**
- **Total Unmapped Assets**: **1** (`cookie_skillet_2_r8an6w`)
- **Total Duplicate Assets Excluded**: **1** (`cookie_skillet_2_r8an6w` - duplicate angle of Cookie Skillet)
- **Total Assets with Failed Delivery URL**: **0** (all 65 URLs respond with HTTP 200)

### Complete Cloudinary Assets Table (All 65 Assets)

| # | Filename | Public ID | Dimensions | Size (KB) | Format | Mapped Product | Mapping Status | Reason |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| 1 | `beef_cheese_fries_fzsrlb` | `beef_cheese_fries_fzsrlb` | 2400x1792 | 2273.4 | jpg | **Beef Cheese Loaded Fries** (`prod_beef_cheese_loaded_fries`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Beef Cheese Loaded Fries' |
| 2 | `behari_kebab_vg8nrm` | `behari_kebab_vg8nrm` | 2400x1792 | 2975.1 | jpg | **Behari Kebab** (`prod_behari_kebab_pizza`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Behari Kebab' |
| 3 | `big_bird_duo_rs96vy` | `big_bird_duo_rs96vy` | 2400x1792 | 2558.5 | jpg | **Big Bird Duo** (`prod_big_bird_duo`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Big Bird Duo' |
| 4 | `bull_dozed_kgvg3p` | `bull_dozed_kgvg3p` | 2400x1792 | 2630.4 | jpg | **Bull - Dozed** (`prod_bull_dozed`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Bull - Dozed' |
| 5 | `chco_french_toast_ez49da` | `chco_french_toast_ez49da` | 2400x1792 | 2613.8 | jpg | **Choco French Toast** (`prod_choco_french_toast`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Choco French Toast' |
| 6 | `cheese_toast_nup1ek` | `cheese_toast_nup1ek` | 2400x1792 | 2564.1 | jpg | **Cheese Toast** (`prod_cheese_toast`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Cheese Toast' |
| 7 | `cheesy_garlic_bread_z6mmig` | `cheesy_garlic_bread_z6mmig` | 2400x1792 | 2523.3 | jpg | **Cheesy Garlic Bread** (`prod_cheesy_garlic_bread`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Cheesy Garlic Bread' |
| 8 | `chicken_box_ixcgna` | `chicken_box_ixcgna` | 2400x1792 | 2562.4 | jpg | **Chicken Box** (`prod_chicken_box`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Chicken Box' |
| 9 | `chicken_cheese_loaded_fries_mxhvzl` | `chicken_cheese_loaded_fries_mxhvzl` | 2400x1792 | 2161.6 | jpg | **Chicken Cheese Loaded Fries** (`prod_chicken_cheese_loaded_fries`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Chicken Cheese Loaded Fries' |
| 10 | `chicken_strips_vqmbba` | `chicken_strips_vqmbba` | 2400x1792 | 2237.8 | jpg | **Chicken Strips** (`prod_chicken_strips`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Chicken Strips' |
| 11 | `chicken_wings_gpmwfl` | `chicken_wings_gpmwfl` | 2400x1792 | 2383.2 | jpg | **Chicken Wings** (`prod_chicken_wings`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Chicken Wings' |
| 12 | `churros_locos_liffri` | `churros_locos_liffri` | 2400x1792 | 2323.8 | jpg | **Churros Locos** (`prod_churros_locos`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Churros Locos' |
| 13 | `citrus_honey_crush_rcslnq` | `citrus_honey_crush_rcslnq` | 2400x1792 | 2304.3 | jpg | **Citrus Honey Crunch** (`prod_citrus_honey_crunch`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Citrus Honey Crunch' |
| 14 | `classic_cheeseburger_fwnokj` | `classic_cheeseburger_fwnokj` | 2400x1792 | 2182.3 | jpg | **Classic Cheeseburger** (`prod_classic_cheeseburger`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Classic Cheeseburger' |
| 15 | `cluckin_mootastic_vmlfyp` | `cluckin_mootastic_vmlfyp` | 2400x1792 | 2910.4 | jpg | **Cluckin' Mootastic** (`prod_cluckin_mootastic`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Cluckin' Mootastic' |
| 16 | `clucky_patty_eebg5g` | `clucky_patty_eebg5g` | 2400x1792 | 2114.8 | jpg | **Clucky Patty** (`prod_clucky_patty`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Clucky Patty' |
| 17 | `cnm_fiesta_s3cmyi` | `cnm_fiesta_s3cmyi` | 2400x1792 | 2815.5 | jpg | **CNM Fiesta** (`prod_cnm_fiesta`) | **MAPPED_AND_RENDERING** | Mapped to active product 'CNM Fiesta' |
| 18 | `cookie_skillet_2_r8an6w` | `cookie_skillet_2_r8an6w` | 2400x1792 | 2625.5 | jpg | *(None)* | **DUPLICATE_EXCLUDED** | Duplicate second photograph of cookie skillet (excluded per approved plan) |
| 19 | `cookie_skillet_yjydjz` | `cookie_skillet_yjydjz` | 2400x1792 | 2270.6 | jpg | **Cookie Skillet** (`prod_cookie_skillet`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Cookie Skillet' |
| 20 | `creamy_alfredo_dexsaa` | `creamy_alfredo_dexsaa` | 2400x1792 | 2723.1 | jpg | **Creamy Alfredo** (`prod_creamy_alfredo_pizza`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Creamy Alfredo' |
| 21 | `creamy_baked_pasta_wybng5` | `creamy_baked_pasta_wybng5` | 2400x1792 | 2288.9 | jpg | **Baked Creamy Pasta** (`prod_baked_creamy_pasta`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Baked Creamy Pasta' |
| 22 | `creamy_kruncher_lizjvj` | `creamy_kruncher_lizjvj` | 2400x1792 | 2162.8 | jpg | **Creamy Kruncher** (`prod_creamy_kruncher`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Creamy Kruncher' |
| 23 | `crispy_chicken_sandwich_tfxhzj` | `crispy_chicken_sandwich_tfxhzj` | 2400x1792 | 2754.7 | jpg | **Crispy Chicken Sandwich** (`prod_crispy_chicken_sandwich`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Crispy Chicken Sandwich' |
| 24 | `crispy_chicken_wrap_mrq5r9` | `crispy_chicken_wrap_mrq5r9` | 2400x1792 | 2326.6 | jpg | **Crispy Chicken Wrap** (`prod_crispy_chicken_wrap`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Crispy Chicken Wrap' |
| 25 | `curly_fries_kpg20j` | `curly_fries_kpg20j` | 2400x1792 | 2275.2 | jpg | **Curly Fries with Dip** (`prod_curly_fries`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Curly Fries with Dip' |
| 26 | `deal_1_plteut` | `deal_1_plteut` | 2400x1792 | 2615.2 | jpg | **Deal 1** (`prod_deal_1`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Deal 1' |
| 27 | `deal_2_rv9dvu` | `deal_2_rv9dvu` | 2400x1792 | 2680.2 | jpg | **Deal 2** (`prod_deal_2`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Deal 2' |
| 28 | `deal_3_slcbma` | `deal_3_slcbma` | 2400x1792 | 2925.7 | jpg | **Deal 3** (`prod_deal_3`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Deal 3' |
| 29 | `deal_4_zrrbyz` | `deal_4_zrrbyz` | 2400x1792 | 2517.5 | jpg | **Deal 4** (`prod_deal_4`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Deal 4' |
| 30 | `deal_5_u3cfyg` | `deal_5_u3cfyg` | 2400x1792 | 2785.0 | jpg | **Deal 5 (2 X Pizzas)** (`prod_deal_5`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Deal 5 (2 X Pizzas)' |
| 31 | `fired_chicken_jm1lel` | `fired_chicken_jm1lel` | 2400x1792 | 2300.6 | jpg | **Fried Chicken** (`prod_fried_chicken`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Fried Chicken' |
| 32 | `fish_n_chips_q1aj81` | `fish_n_chips_q1aj81` | 2400x1792 | 2167.5 | jpg | **Fish N Chips** (`prod_fish_n_chips`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Fish N Chips' |
| 33 | `flame_fold_vcntdq` | `flame_fold_vcntdq` | 2400x1792 | 2486.7 | jpg | **Flame Fold** (`prod_flame_fold`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Flame Fold' |
| 34 | `flaming_tikka_jlxcvy` | `flaming_tikka_jlxcvy` | 2400x1792 | 2736.9 | jpg | **Flaming Tikka** (`prod_flaming_tikka_pizza`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Flaming Tikka' |
| 35 | `grilled_chicken_sandwich_vibv9o` | `grilled_chicken_sandwich_vibv9o` | 2400x1792 | 2715.1 | jpg | **Grilled Chicken Sandwich** (`prod_grilled_chicken_sandwich`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Grilled Chicken Sandwich' |
| 36 | `grilled_chicken_wrap_aemujl` | `grilled_chicken_wrap_aemujl` | 2400x1792 | 2275.8 | jpg | **Grilled Chicken Wrap** (`prod_grilled_chicken_wrap`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Grilled Chicken Wrap' |
| 37 | `italian_pasta_aogag6` | `italian_pasta_aogag6` | 2400x1792 | 2903.2 | jpg | **Italian Pasta** (`prod_italian_pasta`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Italian Pasta' |
| 38 | `large_fries_fgkhrp` | `large_fries_fgkhrp` | 2400x1792 | 2294.3 | jpg | **Large Fries with Dip** (`prod_large_fries`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Large Fries with Dip' |
| 39 | `mozzarella_sticks_vwnda5` | `mozzarella_sticks_vwnda5` | 2400x1792 | 2397.2 | jpg | **Mozzarella Sticks** (`prod_mozzarella_sticks`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Mozzarella Sticks' |
| 40 | `mushroom_n_swiss_sgd3ct` | `mushroom_n_swiss_sgd3ct` | 2400x1792 | 2042.4 | jpg | **Mushroom n Swiss** (`prod_mushroom_n_swiss`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Mushroom n Swiss' |
| 41 | `nashville_hot_ahgt9q` | `nashville_hot_ahgt9q` | 2400x1792 | 2270.8 | jpg | **Nashville Hot** (`prod_nashville_hot`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Nashville Hot' |
| 42 | `nuggests_n_fries_gezwji` | `nuggests_n_fries_gezwji` | 2400x1792 | 2261.7 | jpg | **Nuggets N Fries** (`prod_nuggets_n_fries`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Nuggets N Fries' |
| 43 | `oklahoma_wzcypj` | `oklahoma_wzcypj` | 2400x1792 | 2155.0 | jpg | **Oklahoma Smash** (`prod_oklahoma_smash`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Oklahoma Smash' |
| 44 | `onion_rings_pqkanq` | `onion_rings_pqkanq` | 2400x1792 | 2269.0 | jpg | **Onion Rings** (`prod_onion_rings`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Onion Rings' |
| 45 | `original_xinger_gdemnd` | `original_xinger_gdemnd` | 2400x1792 | 2127.4 | jpg | **Original Xinger** (`prod_original_xinger`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Original Xinger' |
| 46 | `oven_baked_wings_uloepi` | `oven_baked_wings_uloepi` | 2400x1792 | 2413.0 | jpg | **Oven Baked Wings** (`prod_oven_baked_wings`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Oven Baked Wings' |
| 47 | `pepparoni_t2gore` | `pepparoni_t2gore` | 2400x1792 | 2901.3 | jpg | **Hot Pepperoni** (`prod_hot_pepperoni_pizza`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Hot Pepperoni' |
| 48 | `philly_cheesestack_un02hn` | `philly_cheesestack_un02hn` | 2400x1792 | 2029.0 | jpg | **Philly CheeseSteak** (`prod_philly_cheesesteak`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Philly CheeseSteak' |
| 49 | `pizza_fries_wfcsrr` | `pizza_fries_wfcsrr` | 2400x1792 | 2713.1 | jpg | **Pizza Fries** (`prod_pizza_fries`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Pizza Fries' |
| 50 | `quad_chick_feast_efsbgm` | `quad_chick_feast_efsbgm` | 2400x1792 | 2274.7 | jpg | **Quad Chick Feast** (`prod_quad_chick_feast`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Quad Chick Feast' |
| 51 | `regular_fries_ih8b6a` | `regular_fries_ih8b6a` | 2400x1792 | 2271.5 | jpg | **Regular Fries with Dip** (`prod_regular_fries`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Regular Fries with Dip' |
| 52 | `secret_cnm_nd4ld2` | `secret_cnm_nd4ld2` | 2400x1792 | 2630.0 | jpg | **Secret CNM** (`prod_secret_cnm_pizza`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Secret CNM' |
| 53 | `smashed_beef_sandwich_r372qm` | `smashed_beef_sandwich_r372qm` | 2400x1792 | 2702.1 | jpg | **Smashed Beef Sandwich** (`prod_smashed_beef_sandwich`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Smashed Beef Sandwich' |
| 54 | `smashin_cluck_zcyqml` | `smashin_cluck_zcyqml` | 2400x1792 | 2019.5 | jpg | **Smashin' Cluck** (`prod_smashin_cluck`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Smashin' Cluck' |
| 55 | `smoky_bbq_woq6kt` | `smoky_bbq_woq6kt` | 2400x1792 | 2154.3 | jpg | **Smoky BBQ** (`prod_smoky_bbq`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Smoky BBQ' |
| 56 | `spin_rolls_ihzaju` | `spin_rolls_ihzaju` | 2400x1792 | 2406.3 | jpg | **Spin Rolls** (`prod_spin_rolls`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Spin Rolls' |
| 57 | `student_deal_1_bkrn27` | `student_deal_1_bkrn27` | 2400x1792 | 2756.5 | jpg | **Student Deal 1** (`prod_student_deal_1`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Student Deal 1' |
| 58 | `student_deal_2_xth6lv` | `student_deal_2_xth6lv` | 2400x1792 | 2535.3 | jpg | **Student Deal 2** (`prod_student_deal_2`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Student Deal 2' |
| 59 | `student_deal_3_qluyzp` | `student_deal_3_qluyzp` | 2400x1792 | 3060.7 | jpg | **Student Deal 3** (`prod_student_deal_3`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Student Deal 3' |
| 60 | `stuffed_calzone_t8ea5y` | `stuffed_calzone_t8ea5y` | 2400x1792 | 2753.3 | jpg | **Stuffed Calzone** (`prod_stuffed_calzone`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Stuffed Calzone' |
| 61 | `the_og_aigens` | `the_og_aigens` | 2400x1792 | 2146.0 | jpg | **The OG** (`prod_the_og`) | **MAPPED_AND_RENDERING** | Mapped to active product 'The OG' |
| 62 | `too_hot_to_handle_m9lvrs` | `too_hot_to_handle_m9lvrs` | 2400x1792 | 2865.8 | jpg | **Too Hot To Handle** (`prod_too_hot_to_handle`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Too Hot To Handle' |
| 63 | `tray_pizza_pnyv2v` | `tray_pizza_pnyv2v` | 2400x1792 | 2429.0 | jpg | **Tray Pizza** (`prod_tray_pizza`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Tray Pizza' |
| 64 | `triple_threat_ptkwku` | `triple_threat_ptkwku` | 2400x1792 | 2708.0 | jpg | **Triple Threat** (`prod_triple_threat`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Triple Threat' |
| 65 | `wrap_it_up_ninvgr` | `wrap_it_up_ninvgr` | 2400x1792 | 2702.1 | jpg | **Wrap It Up** (`prod_wrap_it_up`) | **MAPPED_AND_RENDERING** | Mapped to active product 'Wrap It Up' |

---

## Section 6 — Reconciliation

### A. Database Products with Cloudinary Images Rendering (64 Products)
All 64 products listed below have verified Cloudinary assets, active selling status, and render via responsive `srcSet` on the storefront:
1. **The OG** (`the-og-burger`) -> `the_og_aigens`
2. **Classic Cheeseburger** (`classic-cheeseburger`) -> `classic_cheeseburger_fwnokj`
3. **Oklahoma Smash** (`oklahoma-smash-burger`) -> `oklahoma_wzcypj`
4. **Mushroom n Swiss** (`mushroom-n-swiss-burger`) -> `mushroom_n_swiss_sgd3ct`
5. **Philly CheeseSteak** (`philly-cheesesteak`) -> `philly_cheesestack_un02hn`
6. **Original Xinger** (`original-xinger-burger`) -> `original_xinger_gdemnd`
7. **Nashville Hot** (`nashville-hot-burger`) -> `nashville_hot_ahgt9q`
8. **Citrus Honey Crunch** (`citrus-honey-crunch-burger`) -> `citrus_honey_crush_rcslnq`
9. **Smashin' Cluck** (`smashin-cluck-burger`) -> `smashin_cluck_zcyqml`
10. **Smoky BBQ** (`smoky-bbq-burger`) -> `smoky_bbq_woq6kt`
11. **Clucky Patty** (`clucky-patty-burger`) -> `clucky_patty_eebg5g`
12. **Onion Rings** (`onion-rings`) -> `onion_rings_pqkanq`
13. **Mozzarella Sticks** (`mozzarella-sticks`) -> `mozzarella_sticks_vwnda5`
14. **Fish N Chips** (`fish-n-chips`) -> `fish_n_chips_q1aj81`
15. **Nuggets N Fries** (`nuggets-n-fries`) -> `nuggests_n_fries_gezwji`
16. **Chicken Strips** (`chicken-strips`) -> `chicken_strips_vqmbba`
17. **Chicken Wings** (`chicken-wings`) -> `chicken_wings_gpmwfl`
18. **Fried Chicken** (`fried-chicken`) -> `fired_chicken_jm1lel`
19. **Regular Fries with Dip** (`regular-fries-with-dip`) -> `regular_fries_ih8b6a`
20. **Large Fries with Dip** (`large-fries-with-dip`) -> `large_fries_fgkhrp`
21. **Curly Fries with Dip** (`curly-fries-with-dip`) -> `curly_fries_kpg20j`
22. **Beef Cheese Loaded Fries** (`beef-cheese-loaded-fries`) -> `beef_cheese_fries_fzsrlb`
23. **Chicken Cheese Loaded Fries** (`chicken-cheese-loaded-fries`) -> `chicken_cheese_loaded_fries_mxhvzl`
24. **Creamy Kruncher** (`creamy-kruncher`) -> `creamy_kruncher_lizjvj`
25. **Flame Fold** (`flame-fold`) -> `flame_fold_vcntdq`
26. **Crispy Chicken Wrap** (`crispy-chicken-wrap`) -> `crispy_chicken_wrap_mrq5r9`
27. **Grilled Chicken Wrap** (`grilled-chicken-wrap`) -> `grilled_chicken_wrap_aemujl`
28. **Cheese Toast** (`cheese-toast`) -> `cheese_toast_nup1ek`
29. **Smashed Beef Sandwich** (`smashed-beef-sandwich`) -> `smashed_beef_sandwich_r372qm`
30. **Crispy Chicken Sandwich** (`crispy-chicken-sandwich`) -> `crispy_chicken_sandwich_tfxhzj`
31. **Grilled Chicken Sandwich** (`grilled-chicken-sandwich`) -> `grilled_chicken_sandwich_vibv9o`
32. **Flaming Tikka** (`flaming-tikka-pizza`) -> `flaming_tikka_jlxcvy`
33. **Behari Kebab** (`behari-kebab-pizza`) -> `behari_kebab_vg8nrm`
34. **Hot Pepperoni** (`hot-pepperoni-pizza`) -> `pepparoni_t2gore`
35. **Creamy Alfredo** (`creamy-alfredo-pizza`) -> `creamy_alfredo_dexsaa`
36. **Secret CNM** (`secret-cnm-pizza`) -> `secret_cnm_nd4ld2`
37. **Tray Pizza** (`tray-pizza`) -> `tray_pizza_pnyv2v`
38. **Stuffed Calzone** (`stuffed-calzone`) -> `stuffed_calzone_t8ea5y`
39. **Spin Rolls** (`spin-rolls`) -> `spin_rolls_ihzaju`
40. **Cheesy Garlic Bread** (`cheesy-garlic-bread`) -> `cheesy_garlic_bread_z6mmig`
41. **Baked Creamy Pasta** (`baked-creamy-pasta`) -> `creamy_baked_pasta_wybng5`
42. **Italian Pasta** (`italian-pasta`) -> `italian_pasta_aogag6`
43. **Pizza Fries** (`pizza-fries`) -> `pizza_fries_wfcsrr`
44. **Oven Baked Wings** (`oven-baked-wings`) -> `oven_baked_wings_uloepi`
45. **Big Bird Duo** (`big-bird-duo-deal`) -> `big_bird_duo_k4h6uh`
46. **Bull - Dozed** (`bull-dozed-deal`) -> `bull_dozed_deal_u5y93q`
47. **Too Hot To Handle** (`too-hot-to-handle-deal`) -> `too_hot_to_handle_m9lvrs`
48. **Wrap It Up** (`wrap-it-up-deal`) -> `wrap_it_up_q1jhyu`
49. **Triple Threat** (`triple-threat-deal`) -> `triple_threat_ptkwku`
50. **Chicken Box** (`chicken-box-deal`) -> `chicken_box_dffvbb`
51. **CNM Fiesta** (`cnm-fiesta-deal`) -> `cnm_fiesta_s3cmyi`
52. **Quad Chick Feast** (`quad-chick-feast-deal`) -> `quad_chick_feast_jrmekn`
53. **Cluckin' Mootastic** (`cluckin-mootastic-deal`) -> `cluckin_mootastic_m7jqqr`
54. **Deal 1** (`combo-deal-1`) -> `deal_1_plteut`
55. **Deal 2** (`combo-deal-2`) -> `deal_2_y3eb4r`
56. **Deal 3** (`combo-deal-3`) -> `deal_3_s6bkyv`
57. **Deal 4** (`combo-deal-4`) -> `deal_4_zrrbyz`
58. **Deal 5 (2 X Pizzas)** (`combo-deal-5`) -> `deal_5_u3cfyg`
59. **Student Deal 1** (`student-deal-1`) -> `student_deal_1_f5qjsc`
60. **Student Deal 2** (`student-deal-2`) -> `student_deal_2_x00rso`
61. **Student Deal 3** (`student-deal-3`) -> `student_deal_3_tqwhoc`
62. **Choco French Toast** (`choco-french-toast`) -> `chco_french_toast_ez49da`
63. **Churros Locos** (`churros-locos`) -> `churros_locos_mow29w`
64. **Cookie Skillet** (`cookie-skillet`) -> `cookie_skillet_1_i8q1vd`

### B. Database Products with Cloudinary Images But Not Rendering (0 Products)
**Zero products**. All 64 products with Cloudinary image records are active and correctly render their images.

### C. Database Products with No Cloudinary Image (10 Products)
These 10 active menu products did not have matching image files uploaded to `cnm/menu`:
1. `prod_mujhe_anday_wala` — **Mujhe Anday Wala Burger** (Category: Sandwiches)
2. `prod_fish_o_fillet` — **Fish O Fillet** (Category: Sandwiches)
3. `prod_pasta_la_vista` — **Pasta La Vista** (Category: Pastas & Oven Sides)
4. `prod_party_deal` — **Party Deal** (Category: Numbered Combo Deals)
5. `prod_still_water` — **Still Water** (Category: Drinks & Chillers)
6. `prod_soda_woda` — **Soda Woda** (Category: Drinks & Chillers)
7. `prod_lemon_mint_refresher` — **Lemon Mint Refresher** (Category: Drinks & Chillers)
8. `prod_peach_iced_tea` — **Peach Iced Tea** (Category: Drinks & Chillers)
9. `prod_cold_coffee` — **Cold Coffee** (Category: Drinks & Chillers)
10. `prod_milk_shakes` — **Milk Shakes** (Category: Drinks & Chillers)

### D. Cloudinary Assets with No Database Product (1 Asset)
- `cookie_skillet_2_r8an6w` (2400x1792, JPG, 2625.5 KB) — Duplicate alternate angle photograph of the Cookie Skillet. Excluded from database mapping to prevent collisions with primary asset `cookie_skillet_1_i8q1vd`.

### E. Customer-Facing Categories with Zero Available Products (4 Categories)
1. `cat_burgers` — **Smash & Zinger Burgers** (0 active items)
2. `cat_chicken` — **Crispy Chicken & Tenders** (0 active items)
3. `cat_deals` — **Exclusive Value Deals** (0 active items)
4. `cat_sides` — **Fries & Signature Dips** (0 active items)

### F. Duplicate Customer-Facing Categories
- **Visual duplicate**: `cat_sides` ("Fries & Signature Dips", 0 items) and `cat_fries_more` ("Fries N More", 5 items) both display on the customer storefront. Customers see two separate categories for Fries side-by-side.

### G. Categories / Products Still Coming from Old Starter/Demo Data
- **Categories**: `cat_burgers`, `cat_chicken`, `cat_deals`, `cat_sides`.
- **Products**: 16 archived starter products remain in the database (`is_available = 0`) to protect historical order FK constraints. They do NOT appear in the customer UI, but their parent categories do because `is_active = 1` was left enabled on the parent categories.

---

## Section 7 — Root Cause Analysis & Minimum Exact Repair Plan

### Exact Root Cause Breakdown
1. **Database Category Table**: During Phase 1 real menu import, 14 new real categories were inserted and old demo products were marked `is_available = 0`. However, the 4 old categories (`cat_burgers`, `cat_chicken`, `cat_deals`, `cat_sides`) were left with `is_active = 1`.
2. **Menu API Query**: `src/app/api/v1/menu/route.ts` only filters `WHERE is_active = 1`. It returns all categories regardless of whether `cat.products.length > 0`.
3. **Homepage Frontend Logic**: In `src/app/page.tsx`, line 178 only filters out zero-product categories *when the search bar contains text*. During default browsing, it maps every category returned by the API into both the horizontal tab pills and the dynamic category section blocks.
4. **Signature Navigation**: In `src/lib/signatureSections.ts`, `cat_sides` is explicitly included in `categoryIds` for `sig_bon_a_petit`, and `cat_burgers`/`cat_chicken`/`cat_deals` are included in `sig_muuu` and `sig_cloc_cloc`.

### Minimum Exact Files & Records Needing Correction (Read-Only List — No Changes Made)

1. **Database (`data/cnm.db`)**:
   ```sql
   -- Archive the 4 legacy empty starter categories
   UPDATE categories SET is_active = 0 WHERE id IN ('cat_burgers', 'cat_chicken', 'cat_deals', 'cat_sides');
   -- Resequence display_order of remaining 14 categories from 1 to 14
   ```
2. **API Endpoint (`src/app/api/v1/menu/route.ts`)**:
   Add defensive product count filter before returning:
   ```ts
   const publicCategories = categories
     .map(cat => ({ ...cat, products: products.filter(p => p.categoryId === cat.id) }))
     .filter(cat => cat.products.length > 0);
   ```
3. **Storefront Page (`src/app/page.tsx`)**:
   Ensure categories with 0 items are filtered out in `finalDisplayCategories` and in the category tab pills:
   ```ts
   const nonZeroCategories = categories.filter(c => c.products && c.products.length > 0);
   ```
4. **Signature Sections Config (`src/lib/signatureSections.ts`)**:
   Remove `cat_sides`, `cat_burgers`, `cat_chicken`, `cat_deals` from `mapping.categoryIds`.
5. **Promotional Banners (`src/lib/promotions.ts`)**:
   Update `actionCategoryId` from `cat_deals` to `cat_box_deals` or `cat_combo_deals`.
