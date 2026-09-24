# Cluck N Moo (CNM) — SQLite to Supabase Data Migration Dry-Run Report

This report documents the execution and validation of **Phase 3: Data Migration Dry-Run** for Cluck N Moo (CNM). The simulation extracted all production datasets from the local SQLite database (`data/cnm.db`), validated relational integrity, verified constraint compatibility against Supabase PostgreSQL, and confirmed that zero data was written to the cloud database during this phase.

---

## 1. Dry-Run Execution Summary

- **Command Executed**: `npm run supabase:migrate:dry-run`
- **Execution Script**: [`scripts/migrate-sqlite-to-supabase.ts`](file:///e:/Projects/Cluck%20n%20moo/scripts/migrate-sqlite-to-supabase.ts)
- **Source Database**: `data/cnm.db` (Local SQLite 3)
- **Target Database**: Supabase PostgreSQL (Read-Only Inspection Mode)
- **Execution Mode**: **SIMULATED DRY-RUN (`--dry-run`)**
- **Records Inserted/Modified in Supabase**: **0** (Zero mutations)
- **SQLite Database Modification**: **None** (100% untouched)
- **Timestamp**: `2026-09-24T07:15:05.324Z`

---

## 2. Table-by-Table Migration Preview & Checksums

The migration pipeline strictly follows the relational dependency graph to prevent foreign key violations:

| Order | Target Table | Source Count (SQLite) | Target Count (Supabase) | SHA-256 Checksum | Planned Action |
|---|---|---|---|---|---|
| **1** | `restaurant_settings` | 10 | 0 | `3a162525e28fecc5` | `READY_DRY_RUN` |
| **2** | `restaurant_schedules` | 7 | 0 | `896750bbdf898151` | `READY_DRY_RUN` |
| **3** | `delivery_areas` | 11 | 0 | `1eac95278935f756` | `READY_DRY_RUN` |
| **4** | `categories` | 18 | 0 | `7a69bd66d3baf999` | `READY_DRY_RUN` |
| **5** | `products` | 90 | 0 | `40025f4190015e61` | `READY_DRY_RUN` |
| **6** | `product_variants` | 61 | 0 | `a6324732739e3f42` | `READY_DRY_RUN` |
| **7** | `product_modifier_groups` | 36 | 0 | `193654e80e6233d8` | `READY_DRY_RUN` |
| **8** | `product_modifiers` | 163 | 0 | `bba0f0dcb15c9e14` | `READY_DRY_RUN` |
| **9** | `profiles` | 0 | 0 | `4f53cda18c2baa0c` | `SKIP (NO FAKE USERS)` |
| **10** | `customer_addresses` | 0 | 0 | `4f53cda18c2baa0c` | `SKIP (EMPTY)` |
| **11** | `orders` | 19 | 0 | `d67d26bc7b49788c` | `READY_DRY_RUN` |
| **12** | `order_items` | 25 | 0 | `67c9c2abb151f7bb` | `READY_DRY_RUN` |
| **13** | `order_item_modifiers` | 8 | 0 | `0475e0dff767b015` | `READY_DRY_RUN` |
| **14** | `order_status_history` | 59 | 0 | `f53090aaa25a1058` | `READY_DRY_RUN` |
| **TOTAL** | — | **507** | **0** | — | **507 Records Validated** |

---

## 3. Schema Transformation & Type Validation

| Entity / Column | Source (SQLite) | Target (PostgreSQL) | Transformation Rule Applied |
|---|---|---|---|
| **Booleans** (`is_active`, `is_available`, `is_featured`, `is_required`, `is_closed`) | `INTEGER` (`0` or `1`) | `BOOLEAN` (`false` / `true`) | Converted with `Boolean(row.val)` |
| **Prices & Line Totals** (`base_price_pkr`, `subtotal_pkr`, `total_pkr`, etc.) | `INTEGER` | `INTEGER` | Preserved as exact PKR integers (zero decimal drift) |
| **Discount Rate** (`discount_rate`) | `REAL` (e.g. `0.05`) | `NUMERIC(5, 4)` | Preserved with exact numeric precision |
| **Timestamps** (`created_at`, `updated_at`) | `TEXT` (ISO Strings) | `TIMESTAMPTZ` | Direct ISO 8601 strings compatible with Postgres timestamptz parser |
| **Custom Deal Snapshots** (`custom_deal_id`, `custom_deal_subtotal_pkr`) | `TEXT`, `INTEGER` | `TEXT`, `INTEGER` | Preserved across `orders` and `order_items` |

---

## 4. Referential Integrity & Conflict Audit

1. **Foreign Key Audits**:
   - `products.category_id` $\rightarrow$ `categories.id`: **0 violations**. All 90 products reference valid categories.
   - `product_variants.product_id` $\rightarrow$ `products.id`: **0 violations**. All 61 variants reference valid products.
   - `product_modifier_groups.product_id` $\rightarrow$ `products.id`: **0 violations**. All 36 groups reference valid products.
   - `product_modifiers.group_id` $\rightarrow$ `product_modifier_groups.id`: **0 violations**. All 163 modifiers reference valid groups.
   - `order_items.order_id` $\rightarrow$ `orders.id`: **0 violations**. All 25 items reference valid orders.
   - `order_items.product_id` $\rightarrow$ `products.id`: **0 violations**. All 25 items reference valid product IDs.
   - `order_item_modifiers.order_item_id` $\rightarrow$ `order_items.id`: **0 violations**. All 8 modifiers reference valid line items.
   - `order_status_history.order_id` $\rightarrow$ `orders.id`: **0 violations**. All 59 history events reference valid orders.
2. **Unique Constraints & Duplicate Slugs**:
   - `delivery_areas.slug`: **0 duplicates**
   - `categories.slug`: **0 duplicates**
   - `products.slug`: **0 duplicates**
   - `orders.order_number`: **0 duplicates**
   - `orders.tracking_token`: **0 duplicates**

---

## 5. Active vs Archived Menu Isolation

To ensure archived starter/demo products do not contaminate the active public Supabase menu:

1. **Categories**:
   - **14 Active Categories** (`is_active = TRUE`): Displayed on the customer storefront navigation.
   - **4 Archived Starter Categories** (`is_active = FALSE`): Preserved in the database for historical order referential integrity, but hidden from the public storefront by RLS policies (`WHERE is_active = TRUE`).
2. **Products**:
   - **74 Active Products** (`is_available = TRUE`): Full menu offerings with verified pricing and descriptions.
   - **16 Archived Starter Products** (`is_available = FALSE`): Preserved to prevent broken foreign keys on historical orders (e.g. `prod_classic_smash`), but filtered out of public storefront queries by RLS (`WHERE is_available = TRUE`).

---

## 6. Cloudinary Media Asset Preservation

The dry-run validated that all Cloudinary media mappings established during menu import remain 100% intact:
- **Total Active Products**: 74
- **Active Products with Cloudinary Public ID**: 64 (86.5%)
- **Active Products with Optimized HTTPS CDN Delivery URLs**: 64 (86.5%)
- **Active Products with `image_status = 'SYNCED'`**: 64 (86.5%)
- **Products without Cloudinary Images**: 10 (beverage cans and basic add-ons using SVG/CSS fallbacks)
- **Data Protection**: Neither public IDs nor delivery URLs will be altered or lost during migration.

---

## 7. Customer & Guest Order Security

- **19 Historical Orders**:
  - All 19 orders were placed as guest checkouts (`user_id = NULL`).
  - No fake user accounts will be created in `public.profiles`.
  - Immutable snapshots (`customer_name_snapshot`, `customer_phone_snapshot`, delivery addresses) are 100% populated with zero nulls.
  - 3 orders with custom deal combo discounts retain their exact `discount_pkr`, `discount_rate`, `discount_type`, and `custom_deal_subtotal_pkr`.
  - Staff assignment IDs (`assigned_rider_id`, `confirmed_by_staff_id`, `changed_by_user_id`) remain `NULL`, avoiding broken foreign keys to local development mock users (`usr_admin`, `usr_kitchen`).
- **Cryptographic Tracking Tokens**:
  - All 19 orders retain their unguessable `tracking_token` (`trk_...`), guaranteeing that guest order tracking will function identically after database switchover.

---

## 8. Checksum & Count Verification Strategy for Phase 4

During the live write phase (`npm run supabase:migrate:write`):
1. **Pre-flight**: Automated backup of SQLite database to `data/backups/cnm_pre_supabase_write_<timestamp>.db`.
2. **Transaction Scope**: Data will be written inside a single atomic PostgreSQL transaction block (`sql.begin()`). If any single record errors, the entire import automatically rolls back to zero rows.
3. **Post-Write Audit**: The runner will compare row counts in Supabase against the table in Section 2.
4. **Data Verification**: Exact SHA-256 checksums of the transferred payloads will be checked to confirm zero data corruption.

---

## 9. Rollback & Dual-Run Capability

- **SQLite Preservation**: `data/cnm.db` will remain on disk and continue serving all live Next.js traffic until Phase 5 (API transition).
- **Zero Production Disruption**: If any issue occurs during Phase 4 live data import, Supabase data can be wiped with `TRUNCATE public.categories, public.orders CASCADE` without impacting local application functionality.

---

## 10. Status & Next Step

Phase 3 Dry-Run has completed with **zero errors**. All 507 records are certified ready for live migration.

**Next Action**:
Awaiting approval to execute **Phase 4** (`npm run supabase:migrate:write`) to commit the 507 validated records into Supabase PostgreSQL.
