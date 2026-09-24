# Cluck N Moo (CNM) — Supabase PostgreSQL Phase 2 Migration Report

This report documents the live execution and read-only verification of **Phase 2** of the Supabase PostgreSQL migration for Cluck N Moo (CNM). All versioned schema migrations have been applied to Supabase PostgreSQL and verified with read-only probe queries.

---

## 1. Migration Execution Summary

- **Execution Mode**: Direct SQL execution via Supabase Session Mode (Port 5432 - IPv4 compatible).
- **Execution Strategy**: Sequential, zero-data-loss, idempotent execution with transaction-safe rollbacks.
- **Secrets & Connection Protection**: Zero database connection strings, passwords, or keys were exposed, logged, or included in reports.

| Order | Migration File | Status | Duration | Objects Created |
|---|---|---|---|---|
| 1 | [`0001_core_schema.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0001_core_schema.sql) | **SUCCESS** | 725 ms | 6 Custom ENUM types, 14 Relational tables with checks and FKs |
| 2 | [`0002_indexes_and_constraints.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0002_indexes_and_constraints.sql) | **SUCCESS** | 665 ms | 52 Total indexes (B-tree on slugs, orders, tracking tokens, foreign keys) |
| 3 | [`0003_auth_triggers_and_functions.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0003_auth_triggers_and_functions.sql) | **SUCCESS** | 660 ms | `handle_new_user()` trigger, `get_auth_user_role()`, `claim_guest_orders()` |
| 4 | [`0004_row_level_security.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0004_row_level_security.sql) | **SUCCESS** | 724 ms | Row-Level Security enabled on all 14 tables with strict public/auth policies |

---

## 2. Post-Migration Verification Results

Read-only inspection queries were executed immediately following migration execution:

### 2.1 Table Existence (14 / 14 Verified)
- `public.profiles`: **PRESENT** (Linked to `auth.users(id) ON DELETE CASCADE`)
- `public.delivery_areas`: **PRESENT**
- `public.categories`: **PRESENT**
- `public.products`: **PRESENT**
- `public.product_variants`: **PRESENT**
- `public.product_modifier_groups`: **PRESENT**
- `public.product_modifiers`: **PRESENT**
- `public.customer_addresses`: **PRESENT**
- `public.orders`: **PRESENT**
- `public.order_items`: **PRESENT**
- `public.order_item_modifiers`: **PRESENT**
- `public.order_status_history`: **PRESENT**
- `public.restaurant_settings`: **PRESENT**
- `public.restaurant_schedules`: **PRESENT**

### 2.2 PostgreSQL ENUM Types (6 / 6 Verified)
- `public.user_role_enum`: **PRESENT** (`CUSTOMER`, `KITCHEN_STAFF`, `RIDER`, `ADMIN`)
- `public.order_type_enum`: **PRESENT** (`DELIVERY`, `PICKUP`, `DINE_IN`)
- `public.order_status_enum`: **PRESENT** (`New`, `Confirmed`, `Preparing`, `Ready`, `Out for delivery`, `Completed`, `Cancelled`)
- `public.payment_method_enum`: **PRESENT** (`CASH`)
- `public.payment_status_enum`: **PRESENT** (`PENDING`, `PAID`, `REFUNDED`)
- `public.image_status_enum`: **PRESENT** (`PENDING`, `SYNCED`, `FAILED`)

### 2.3 Index Coverage
- Total public schema indexes: **52**
- Key performance indexes verified:
  - `idx_products_category_display`: **FOUND**
  - `idx_products_available`: **FOUND**
  - `idx_orders_tracking_token`: **FOUND** (Cryptographic guest tracking lookup)
  - `idx_orders_order_number`: **FOUND**
  - `idx_orders_status_created`: **FOUND** (Operational kitchen/rider queries)
  - `idx_orders_user_id`: **FOUND** (Customer account order history)
  - `idx_profiles_role`: **FOUND**

### 2.4 Row-Level Security (RLS) Status (14 / 14 Enabled)
- All 14 public tables verified with `relrowsecurity = true`:
  - `categories`: **RLS ENABLED**
  - `customer_addresses`: **RLS ENABLED**
  - `delivery_areas`: **RLS ENABLED**
  - `order_item_modifiers`: **RLS ENABLED**
  - `order_items`: **RLS ENABLED**
  - `order_status_history`: **RLS ENABLED**
  - `orders`: **RLS ENABLED**
  - `product_modifier_groups`: **RLS ENABLED**
  - `product_modifiers`: **RLS ENABLED**
  - `product_variants`: **RLS ENABLED**
  - `products`: **RLS ENABLED**
  - `profiles`: **RLS ENABLED**
  - `restaurant_schedules`: **RLS ENABLED**
  - `restaurant_settings`: **RLS ENABLED**

### 2.5 Auth Triggers & Functions
- **Trigger `on_auth_user_created`**: Verified attached to `auth.users`. Automatically synchronizes newly registered users to `public.profiles`.
- **Function `public.get_auth_user_role()`**: Verified `SECURITY DEFINER` function for safe policy role resolution.
- **Function `public.claim_guest_orders()`**: Verified atomic stored procedure for claiming guest orders upon customer authentication.

### 2.6 Security & Anti-Spoofing Verification
- **Direct Client `INSERT` on Orders**: Policy inspection confirms **NO direct INSERT policy** exists for `orders` or child line items for anonymous or standard client roles. Orders must be submitted through server-side validated API routes.
- **Zero-Trust Roles**: Untrusted client request headers (`x-user-role`, `x-user-id`) cannot bypass RLS. Roles are resolved solely from authenticated database claims.

### 2.7 Atomic Transaction & Rollback Probe
- A temporary probe record was inserted into `public.restaurant_settings` inside an explicit transaction block and rolled back via forced abort.
- Post-rollback query verified: **0 probe records persisted**. Transaction isolation and rollback capabilities are 100% operational.

---

## 3. Invariants & Current System State

- **Local SQLite Database**: `data/cnm.db` is untouched and remains the active operational database for local development.
- **Local Application APIs**: All routes under `src/app/api/v1/*` continue to query local SQLite without change.
- **Customer UI**: Storefront, deal builder, cart, and checkout components are untouched.
- **Production Data**: Zero mock or test records were left in Supabase PostgreSQL.

---

## 4. Next Recommended Phase

**Phase 3: SQLite to Supabase Data Export & Verification Script**
- Create `scripts/export-sqlite-to-supabase.ts` with `--dry-run` and `--write` flags.
- Export all verified SQLite menu categories, products, Cloudinary image mappings, modifiers, delivery areas, and schedules.
- Compare row counts and cryptographic checksums between SQLite and Supabase PostgreSQL.
