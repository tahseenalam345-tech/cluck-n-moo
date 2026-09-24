# Cluck N Moo (CNM) Category Audit and Cleanup Plan

> **Document Status**: READY FOR REVIEW & APPROVAL  
> **Created At**: 2026-09-23  
> **Database File**: `data/cnm.db`  
> **Pre-Cleanup Backup**: `data/backups/cnm_pre_category_cleanup_20260923141559.db`  
> **Authoritative References**:  
> - `docs/VERIFIED_CNM_MENU_EXTRACTION.md`  
> - `docs/REAL_MENU_IMPORT_DRY_RUN_REPORT.md`  
> - Database records in `data/cnm.db`

---

## 1. Executive Summary & Root Cause Analysis

### Problem
The customer storefront currently displays empty, duplicate, or starter categories:
- **"Fries & Signature Dips"** is shown with **0 products**.
- Actual fries products (*Regular Fries with Dip, Large Fries with Dip, Curly Fries with Dip, Beef Cheese Loaded Fries, Chicken Cheese Loaded Fries*) are correctly cataloged under **"Fries N More"**.
- Similar starter categories (`cat_burgers`, `cat_chicken`, `cat_deals`) still have `is_active = 1` in the database, even though all active products were moved to real CNM categories during the real menu import.
- The menu API (`/api/v1/menu`) queries `WHERE is_active = 1` but does not enforce product count filtering (`cat.products.length > 0`), exposing empty categories to the customer storefront and navigation pills.

### Goal
1. Every active customer-facing category must contain only genuine, verified Cluck N Moo menu products.
2. Zero empty, starter, duplicate, archived, or legacy demo categories may appear in the public UI or API.
3. Preserve 100% of order history, product IDs, Cloudinary image mappings, prices, variants, and modifiers.
4. Defense-in-depth: Both database category archiving (`is_active = 0`) and API response filtering (`HAVING products > 0`).

---

## 2. Comprehensive Database Category Audit (18 Categories)

Audit executed directly against `data/cnm.db` via `scripts/audit-categories.ts`:

| Cat ID | Category Name | Slug | DB Active | Order | Active Prods | Archived Prods | Classification | Products Inside |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `cat_burgers` | **Smash & Zinger Burgers** | `burgers` | 1 | 0 | **0** | 3 | **STARTER_DEMO (EMPTY)** | *Archived:* The Classic Smash Burger, Crispy Cluck Zinger, Moo & Cluck Duo Monster |
| `cat_chicken` | **Crispy Chicken & Tenders** | `crispy-chicken` | 1 | 1 | **0** | 2 | **STARTER_DEMO (EMPTY)** | *Archived:* Golden Fried Chicken (3 Pcs), Crispy Chicken Tenders (4 Pcs) |
| `cat_beef_burgers` | **Beef Burgers with Cheese** | `beef-burgers` | 1 | 1 | **5** | 0 | **OFFICIAL_REAL** | The OG, Classic Cheeseburger, Oklahoma Smash, Mushroom n Swiss, Philly CheeseSteak |
| `cat_deals` | **Exclusive Value Deals** | `deals` | 1 | 2 | **0** | 3 | **STARTER_DEMO (EMPTY)** | *Archived:* CNM Solo Box Deal, Duo Smash Feast, Juiciest in Town Family Feast |
| `cat_chicken_burgers` | **Chicken Burgers with Cheese** | `chicken-burgers` | 1 | 2 | **6** | 0 | **OFFICIAL_REAL** | Original Xinger, Nashville Hot, Citrus Honey Crunch, Smashin' Cluck, Smoky BBQ, Clucky Patty |
| `cat_sides` | **Fries & Signature Dips** | `sides-dips` | 1 | 3 | **0** | 3 | **STARTER_DEMO (EMPTY)** | *Archived:* Classic Golden Fries, Melted Cheese & Jalapeno Loaded Fries, Signature Garlic Mayo Dip |
| `cat_appetizers` | **Appetizers & Fried Chicken** | `appetizers` | 1 | 3 | **7** | 0 | **OFFICIAL_REAL** | Onion Rings, Mozzarella Sticks, Fish N Chips, Nuggets N Fries, Chicken Strips, Chicken Wings, Fried Chicken |
| `cat_fries_more` | **Fries N More** | `fries-more` | 1 | 4 | **5** | 0 | **OFFICIAL_REAL** | Regular Fries with Dip, Large Fries with Dip, Curly Fries with Dip, Beef Cheese Loaded Fries, Chicken Cheese Loaded Fries |
| `cat_wraps` | **Crunchwraps & Tortilla Wraps** | `wraps` | 1 | 5 | **4** | 0 | **OFFICIAL_REAL** | Creamy Kruncher, Flame Fold, Crispy Chicken Wrap, Grilled Chicken Wrap |
| `cat_sandwiches` | **Sandwiches** | `sandwiches` | 1 | 6 | **6** | 0 | **OFFICIAL_REAL** | Cheese Toast, Mujhe Anday Wala Burger, Smashed Beef Sandwich, Crispy Chicken Sandwich, Grilled Chicken Sandwich, Fish O Fillet |
| `cat_pizzas` | **Artisan Round Pizzas** | `pizzas` | 1 | 7 | **5** | 3 | **OFFICIAL_REAL** | Flaming Tikka, Behari Kebab, Hot Pepperoni, Creamy Alfredo, Secret CNM *(3 archived starter pizzas)* |
| `cat_pizza_specials` | **Signature Pizza Specials** | `pizza-specials` | 1 | 8 | **2** | 0 | **OFFICIAL_REAL** | Tray Pizza, Stuffed Calzone |
| `cat_pasta_sides` | **Pastas & Oven Sides** | `pastas-sides` | 1 | 9 | **7** | 0 | **OFFICIAL_REAL** | Pasta La Vista, Spin Rolls, Cheesy Garlic Bread, Baked Creamy Pasta, Italian Pasta, Pizza Fries, Oven Baked Wings |
| `cat_box_deals` | **Box Deals** | `box-deals` | 1 | 10 | **9** | 0 | **OFFICIAL_REAL** | Big Bird Duo, Bull - Dozed, Too Hot To Handle, Wrap It Up, Triple Threat, Chicken Box, CNM Fiesta, Quad Chick Feast, Cluckin' Mootastic |
| `cat_combo_deals` | **Numbered Combo Deals** | `combo-deals` | 1 | 11 | **6** | 0 | **OFFICIAL_REAL** | Deal 1, Deal 2, Deal 3, Deal 4, Deal 5, Party Deal |
| `cat_student_deals` | **Student Offers** | `student-offers` | 1 | 12 | **3** | 0 | **OFFICIAL_REAL** | Student Deal 1, Student Deal 2, Student Deal 3 |
| `cat_desserts` | **Desserts** | `desserts` | 1 | 13 | **3** | 0 | **OFFICIAL_REAL** | Choco French Toast, Churros Locos, Cookie Skillet |
| `cat_drinks` | **Drinks & Chillers** | `drinks` | 1 | 14 | **6** | 2 | **OFFICIAL_REAL** | Still Water, Soda Woda, Lemon Mint Refresher, Peach Iced Tea, Cold Coffee, Milk Shakes *(2 archived starter drinks)* |

---

## 3. Product-to-Category Verification

### Comparison with `docs/VERIFIED_CNM_MENU_EXTRACTION.md`
- **Total active products in DB**: **74**
- **Total verified products in extraction**: **74**
- **Product placement check**:
  - All 5 Beef Burgers are in `cat_beef_burgers` (100% accurate).
  - All 6 Chicken Burgers are in `cat_chicken_burgers` (100% accurate).
  - All 7 Appetizers & Fried Chicken items are in `cat_appetizers` (100% accurate).
  - All 5 Fries items are in `cat_fries_more` (100% accurate).
  - All 4 Wraps are in `cat_wraps` (100% accurate).
  - All 6 Sandwiches (including Fish O Fillet and Mujhe Anday Wala Burger) are in `cat_sandwiches` (100% accurate).
  - All 5 Round Pizzas are in `cat_pizzas` (100% accurate).
  - Both Pizza Specials (Tray Pizza & Calzone) are in `cat_pizza_specials` (100% accurate).
  - All 7 Pastas & Oven Sides (including Pasta La Vista, Spin Rolls, Pizza Fries, Oven Wings) are in `cat_pasta_sides` (100% accurate).
  - All 9 Box Deals are in `cat_box_deals` (100% accurate).
  - All 6 Numbered Deals (Deals 1–5 + Party Deal) are in `cat_combo_deals` (100% accurate).
  - All 3 Student Deals are in `cat_student_deals` (100% accurate).
  - All 3 Desserts are in `cat_desserts` (100% accurate).
  - All 6 Drinks & Chillers are in `cat_drinks` (100% accurate).

### Product Move Evaluation
- **Products that need to be moved**: **0**.
- **Explanation**: The previous Phase 1 real import placed every product in its designated real category. The reason "Fries & Signature Dips" appeared was not because fries products were lost, but because the old demo category `cat_sides` remained active (`is_active = 1`) with 0 active items, alongside the real category `cat_fries_more` ("Fries N More").

### Handling of Dips
- Dips are verified in `docs/VERIFIED_CNM_MENU_EXTRACTION.md` Section 18 as individual dip options (`Garlic Mayo`, `Zipotle`, `Ranch`, `CNM`, `Smoky BBQ`) at 90 PKR each, and as modifier selection options included with all fries items.
- In `cat_sides`, an old starter item `Signature Garlic Mayo Dip` was archived. Dips are correctly attached as active modifier selections under Fries and as add-ons.

---

## 4. Categories to Archive & Remove from Public Storefront

The following 4 legacy starter categories have **0 active products** and will be archived (`is_active = 0`):

1. **`cat_burgers`** ("Smash & Zinger Burgers", slug: `burgers`)
   - Replaced by: `cat_beef_burgers` and `cat_chicken_burgers`
   - Active products: 0
   - Retention reason: Contains 3 archived historical starter products.
2. **`cat_chicken`** ("Crispy Chicken & Tenders", slug: `crispy-chicken`)
   - Replaced by: `cat_chicken_burgers` and `cat_appetizers`
   - Active products: 0
   - Retention reason: Contains 2 archived historical starter products.
3. **`cat_deals`** ("Exclusive Value Deals", slug: `deals`)
   - Replaced by: `cat_box_deals`, `cat_combo_deals`, and `cat_student_deals`
   - Active products: 0
   - Retention reason: Contains 3 archived historical starter products.
4. **`cat_sides`** ("Fries & Signature Dips", slug: `sides-dips`)
   - Replaced by: `cat_fries_more` ("Fries N More")
   - Active products: 0
   - Retention reason: Contains 3 archived historical starter products.

---

## 5. Proposed Final Public Category List (14 Categories)

Below is the clean, official 14-category customer catalog with clean sequential `display_order` (1–14):

| Seq Order | Category ID | Current DB Name | Short Display Name (Option A per Item 6) | Slug | Active Prods | Verified Source |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `cat_beef_burgers` | Beef Burgers with Cheese | **Beef Burgers** | `beef-burgers` | 5 | IMG-2, IMG-3 |
| 2 | `cat_chicken_burgers` | Chicken Burgers with Cheese | **Chicken Burgers** | `chicken-burgers` | 6 | IMG-2, IMG-3 |
| 3 | `cat_appetizers` | Appetizers & Fried Chicken | **Appetizers** | `appetizers` | 7 | IMG-3 |
| 4 | `cat_fries_more` | Fries N More | **Fries N More** | `fries-more` | 5 | IMG-3 |
| 5 | `cat_wraps` | Crunchwraps & Tortilla Wraps | **Crunchwraps & Wraps** | `wraps` | 4 | IMG-3 |
| 6 | `cat_sandwiches` | Sandwiches | **Sandwiches** | `sandwiches` | 6 | IMG-4 |
| 7 | `cat_pizzas` | Artisan Round Pizzas | **Pizza** | `pizzas` | 5 | IMG-5 |
| 8 | `cat_pizza_specials` | Signature Pizza Specials | **Pizza Specials** | `pizza-specials` | 2 | IMG-1 |
| 9 | `cat_pasta_sides` | Pastas & Oven Sides | **Pastas & Sides** *(Mama Mia)* | `pastas-sides` | 7 | IMG-4, IMG-5 |
| 10 | `cat_box_deals` | Box Deals | **Box Deals** | `box-deals` | 9 | IMG-4 |
| 11 | `cat_combo_deals` | Numbered Combo Deals | **Combo Deals** | `combo-deals` | 6 | IMG-1 |
| 12 | `cat_student_deals` | Student Offers | **Student Offers** | `student-offers` | 3 | IMG-1 |
| 13 | `cat_desserts` | Desserts | **Desserts** | `desserts` | 3 | IMG-1, IMG-4 |
| 14 | `cat_drinks` | Drinks & Chillers | **Drinks** | `drinks` | 6 | IMG-4 |

> **Note on Naming**: In Section 6 of your request, you suggested clean concise names (`Beef Burgers`, `Chicken Burgers`, `Appetizers`, `Drinks`, `Pizza`, etc.). We will apply these concise customer-friendly names while preserving the internal category IDs and product links!

---

## 6. Affected Code & Configuration Files

| File | Purpose of Change |
| :--- | :--- |
| `src/app/api/v1/menu/route.ts` | 1. Query only `WHERE is_active = 1`.<br>2. Filter out any category with `products.length === 0` so empty categories are strictly never sent to the storefront. |
| `src/lib/signatureSections.ts` | Remove retired category IDs (`cat_sides`, `cat_burgers`, `cat_chicken`, `cat_deals`) from `SIGNATURE_SECTIONS` mapping arrays (`sig_bon_a_petit`, `sig_muuu`, `sig_cloc_cloc`). |
| `src/lib/promotions.ts` | Update `actionCategoryId` from `cat_deals` to `cat_box_deals` and `cat_burgers` to `cat_chicken_burgers`. |
| `src/components/ProductCard.tsx` | Update badge check for deals to use `cat_box_deals` / `cat_combo_deals` instead of legacy `cat_deals`. |
| `src/app/page.tsx` | Ensure empty categories are never rendered in category pills or catalog sections even during partial client loads. |

---

## 7. Step-by-Step Execution Plan (Upon Approval)

### Step 1: Pre-Execution Backup
- Completed: `data/backups/cnm_pre_category_cleanup_20260923141559.db`

### Step 2: Database Category Updates
Execute SQL updates via a controlled script:
```sql
-- 1. Archive legacy empty starter categories
UPDATE categories 
SET is_active = 0 
WHERE id IN ('cat_burgers', 'cat_chicken', 'cat_deals', 'cat_sides');

-- 2. Update display names to concise real menu names & resequence display_order (1 to 14)
UPDATE categories SET name = 'Beef Burgers', display_order = 1 WHERE id = 'cat_beef_burgers';
UPDATE categories SET name = 'Chicken Burgers', display_order = 2 WHERE id = 'cat_chicken_burgers';
UPDATE categories SET name = 'Appetizers', display_order = 3 WHERE id = 'cat_appetizers';
UPDATE categories SET name = 'Fries N More', display_order = 4 WHERE id = 'cat_fries_more';
UPDATE categories SET name = 'Crunchwraps & Wraps', display_order = 5 WHERE id = 'cat_wraps';
UPDATE categories SET name = 'Sandwiches', display_order = 6 WHERE id = 'cat_sandwiches';
UPDATE categories SET name = 'Pizza', display_order = 7 WHERE id = 'cat_pizzas';
UPDATE categories SET name = 'Pizza Specials', display_order = 8 WHERE id = 'cat_pizza_specials';
UPDATE categories SET name = 'Pastas & Sides', display_order = 9 WHERE id = 'cat_pasta_sides';
UPDATE categories SET name = 'Box Deals', display_order = 10 WHERE id = 'cat_box_deals';
UPDATE categories SET name = 'Combo Deals', display_order = 11 WHERE id = 'cat_combo_deals';
UPDATE categories SET name = 'Student Offers', display_order = 12 WHERE id = 'cat_student_deals';
UPDATE categories SET name = 'Desserts', display_order = 13 WHERE id = 'cat_desserts';
UPDATE categories SET name = 'Drinks', display_order = 14 WHERE id = 'cat_drinks';
```

### Step 3: API & Code Updates
- Modify `src/app/api/v1/menu/route.ts` to filter out empty categories:
  ```ts
  const activeCategoriesWithProducts = categories
    .map((cat) => ({
      ...cat,
      products: products.filter((p) => p.categoryId === cat.id),
    }))
    .filter((cat) => cat.products.length > 0);
  ```
- Modify `src/lib/signatureSections.ts` to clean up retired category references.
- Modify `src/lib/promotions.ts` banner targets.

### Step 4: Verification
- Run automated menu API test verifying only 14 categories return, each with >0 products.
- Verify customer storefront in browser:
  - "Fries & Signature Dips" is gone.
  - "Fries N More" displays 5 fries products.
  - Category pill strip shows 14 active categories, no 0-item categories.
  - Signature navigation filters work cleanly.

---

## 8. Rollback Plan

If any issue arises during or after execution:
1. Stop the application server if running.
2. Restore database from backup:
   ```bash
   cp data/backups/cnm_pre_category_cleanup_20260923141559.db data/cnm.db
   ```
3. Revert code changes via git:
   ```bash
   git checkout src/app/api/v1/menu/route.ts src/lib/signatureSections.ts src/lib/promotions.ts src/components/ProductCard.tsx
   ```
4. Restart development server (`npm run dev`).
