# Cluck N Moo (CNM) — Supabase PostgreSQL SQL Review

This document contains the complete SQL review of all Phase 1 schema, index, auth trigger, and Row-Level Security (RLS) migration files designed for Supabase PostgreSQL.

---

## 1. Migration Manifest

The migration suite is split into 4 versioned, idempotent SQL migration files located in `supabase/migrations/`:

| Migration File | Description | Execution Target |
|---|---|---|
| [`0001_core_schema.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0001_core_schema.sql) | Custom PostgreSQL ENUMs and 14 relational tables with constraints | Supabase PostgreSQL |
| [`0002_indexes_and_constraints.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0002_indexes_and_constraints.sql) | High-performance B-tree indexes for lookups, tracking, and foreign keys | Supabase PostgreSQL |
| [`0003_auth_triggers_and_functions.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0003_auth_triggers_and_functions.sql) | Auth trigger `handle_new_user()`, role helper, and guest order claiming function | Supabase PostgreSQL |
| [`0004_row_level_security.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0004_row_level_security.sql) | Complete Row-Level Security policies for public, customer, and staff access | Supabase PostgreSQL |

---

## 2. Table-by-Table Schema Specification

### 2.1 `delivery_areas`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `name`: `TEXT NOT NULL UNIQUE`
  - `slug`: `TEXT NOT NULL UNIQUE`
  - `delivery_fee_pkr`: `INTEGER NOT NULL DEFAULT 100 CHECK (delivery_fee_pkr >= 0)`
  - `estimated_delivery_mins`: `INTEGER NOT NULL DEFAULT 40 CHECK (estimated_delivery_mins > 0)`
  - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `display_order`: `INTEGER NOT NULL DEFAULT 0`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.2 `categories`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `name`: `TEXT NOT NULL`
  - `slug`: `TEXT NOT NULL UNIQUE`
  - `display_order`: `INTEGER NOT NULL DEFAULT 0`
  - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.3 `products`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `category_id`: `TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT`
  - `name`: `TEXT NOT NULL`
  - `slug`: `TEXT NOT NULL UNIQUE`
  - `description`: `TEXT`
  - `image_url`: `TEXT`
  - `cloudinary_public_id`: `TEXT`
  - `image_alt_text`: `TEXT`
  - `image_status`: `image_status_enum NOT NULL DEFAULT 'PENDING'`
  - `base_price_pkr`: `INTEGER NOT NULL DEFAULT 0 CHECK (base_price_pkr >= 0)`
  - `is_featured`: `BOOLEAN NOT NULL DEFAULT FALSE`
  - `is_available`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `display_order`: `INTEGER NOT NULL DEFAULT 0`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.4 `product_variants`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `product_id`: `TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE`
  - `name`: `TEXT NOT NULL`
  - `price_pkr`: `INTEGER NOT NULL CHECK (price_pkr >= 0)`
  - `is_available`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `display_order`: `INTEGER NOT NULL DEFAULT 0`

### 2.5 `product_modifier_groups`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `product_id`: `TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE`
  - `name`: `TEXT NOT NULL`
  - `min_selection`: `INTEGER NOT NULL DEFAULT 0 CHECK (min_selection >= 0)`
  - `max_selection`: `INTEGER NOT NULL DEFAULT 1 CHECK (max_selection >= min_selection)`
  - `is_required`: `BOOLEAN NOT NULL DEFAULT FALSE`

### 2.6 `product_modifiers`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `group_id`: `TEXT NOT NULL REFERENCES product_modifier_groups(id) ON DELETE CASCADE`
  - `name`: `TEXT NOT NULL`
  - `price_pkr`: `INTEGER NOT NULL DEFAULT 0 CHECK (price_pkr >= 0)`
  - `is_available`: `BOOLEAN NOT NULL DEFAULT TRUE`

### 2.7 `profiles` (Supabase Auth Integration)
- **Primary Key**: `id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- **Columns**:
  - `phone`: `TEXT UNIQUE`
  - `email`: `TEXT UNIQUE`
  - `full_name`: `TEXT NOT NULL`
  - `role`: `user_role_enum NOT NULL DEFAULT 'CUSTOMER'`
  - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.8 `customer_addresses`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `user_id`: `UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
  - `delivery_area_id`: `TEXT REFERENCES delivery_areas(id) ON DELETE SET NULL`
  - `address_line`: `TEXT NOT NULL`
  - `landmark`: `TEXT`
  - `is_default`: `BOOLEAN NOT NULL DEFAULT FALSE`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.9 `orders`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `order_number`: `TEXT NOT NULL UNIQUE`
  - `tracking_token`: `TEXT NOT NULL UNIQUE`
  - `user_id`: `UUID REFERENCES profiles(id) ON DELETE SET NULL`
  - `order_type`: `order_type_enum NOT NULL`
  - `status`: `order_status_enum NOT NULL DEFAULT 'New'`
  - `payment_method`: `payment_method_enum NOT NULL DEFAULT 'CASH'`
  - `payment_status`: `payment_status_enum NOT NULL DEFAULT 'PENDING'`
  - `payment_location`: `TEXT`
  - `customer_name_snapshot`: `TEXT NOT NULL`
  - `customer_phone_snapshot`: `TEXT NOT NULL`
  - `customer_email_snapshot`: `TEXT`
  - `delivery_area_name_snapshot`: `TEXT`
  - `delivery_address_snapshot`: `TEXT`
  - `delivery_landmark_snapshot`: `TEXT`
  - `dine_in_preferred_time`: `TEXT`
  - `special_instructions`: `TEXT`
  - `subtotal_pkr`: `INTEGER NOT NULL CHECK (subtotal_pkr >= 0)`
  - `delivery_fee_pkr`: `INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_pkr >= 0)`
  - `discount_pkr`: `INTEGER NOT NULL DEFAULT 0 CHECK (discount_pkr >= 0)`
  - `discount_rate`: `NUMERIC(5, 4) NOT NULL DEFAULT 0.0000 CHECK (discount_rate >= 0)`
  - `discount_type`: `TEXT DEFAULT NULL`
  - `custom_deal_subtotal_pkr`: `INTEGER NOT NULL DEFAULT 0 CHECK (custom_deal_subtotal_pkr >= 0)`
  - `total_pkr`: `INTEGER NOT NULL CHECK (total_pkr >= 0)`
  - `assigned_rider_id`: `UUID REFERENCES profiles(id) ON DELETE SET NULL`
  - `confirmed_by_staff_id`: `UUID REFERENCES profiles(id) ON DELETE SET NULL`
  - `cancellation_reason`: `TEXT`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.10 `order_items`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `order_id`: `TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
  - `product_id`: `TEXT REFERENCES products(id) ON DELETE SET NULL`
  - `product_name_snapshot`: `TEXT NOT NULL`
  - `variant_name_snapshot`: `TEXT`
  - `unit_price_snapshot_pkr`: `INTEGER NOT NULL CHECK (unit_price_snapshot_pkr >= 0)`
  - `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`
  - `line_total_pkr`: `INTEGER NOT NULL CHECK (line_total_pkr >= 0)`
  - `custom_deal_id`: `TEXT DEFAULT NULL`

### 2.11 `order_item_modifiers`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `order_item_id`: `TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE`
  - `modifier_id`: `TEXT REFERENCES product_modifiers(id) ON DELETE SET NULL`
  - `modifier_name_snapshot`: `TEXT NOT NULL`
  - `price_snapshot_pkr`: `INTEGER NOT NULL DEFAULT 0 CHECK (price_snapshot_pkr >= 0)`

### 2.12 `order_status_history`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `order_id`: `TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
  - `from_status`: `order_status_enum`
  - `to_status`: `order_status_enum NOT NULL`
  - `changed_by_user_id`: `UUID REFERENCES profiles(id) ON DELETE SET NULL`
  - `note`: `TEXT`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.13 `restaurant_settings`
- **Primary Key**: `key` (`TEXT`)
- **Columns**:
  - `value`: `TEXT NOT NULL`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2.14 `restaurant_schedules`
- **Primary Key**: `id` (`TEXT`)
- **Columns**:
  - `day_of_week`: `INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)`
  - `open_time`: `TEXT NOT NULL DEFAULT '12:01'`
  - `close_time`: `TEXT NOT NULL DEFAULT '02:00'`
  - `is_closed`: `BOOLEAN NOT NULL DEFAULT FALSE`

---

## 3. Row-Level Security (RLS) Policy Matrix

| Table | Anonymous (`anon`) | Authenticated Customer | Staff / Kitchen / Rider | Admin (`ADMIN`) | Direct Client Writes |
|---|---|---|---|---|---|
| `delivery_areas` | SELECT (`is_active = TRUE`) | SELECT (`is_active = TRUE`) | SELECT (`is_active = TRUE`) | FULL ACCESS | **Blocked** (Admin only) |
| `categories` | SELECT (`is_active = TRUE`) | SELECT (`is_active = TRUE`) | SELECT (`is_active = TRUE`) | FULL ACCESS | **Blocked** (Admin only) |
| `products` | SELECT (`is_available = TRUE`) | SELECT (`is_available = TRUE`) | SELECT (`is_available = TRUE`) | FULL ACCESS | **Blocked** (Admin only) |
| `product_variants` | SELECT (`is_available = TRUE`) | SELECT (`is_available = TRUE`) | SELECT (`is_available = TRUE`) | FULL ACCESS | **Blocked** (Admin only) |
| `product_modifier_groups` | SELECT | SELECT | SELECT | FULL ACCESS | **Blocked** (Admin only) |
| `product_modifiers` | SELECT (`is_available = TRUE`) | SELECT (`is_available = TRUE`) | SELECT (`is_available = TRUE`) | FULL ACCESS | **Blocked** (Admin only) |
| `restaurant_settings` | SELECT | SELECT | SELECT | FULL ACCESS | **Blocked** (Admin only) |
| `restaurant_schedules` | SELECT | SELECT | SELECT | FULL ACCESS | **Blocked** (Admin only) |
| `profiles` | None | SELECT / UPDATE (own record, role frozen) | SELECT (own record) | FULL ACCESS | **Blocked** (Self/Admin only) |
| `customer_addresses` | None | FULL ACCESS (own addresses) | None | FULL ACCESS | Allowed for own user_id |
| `orders` | None (Must query via Server API with `tracking_token`) | SELECT (where `user_id = auth.uid()`) | SELECT (all operational orders) | FULL ACCESS | **Blocked** (Server Action / Service Role only) |
| `order_items` | None | SELECT (user's own orders) | SELECT (all operational orders) | FULL ACCESS | **Blocked** (Service Role only) |
| `order_item_modifiers` | None | SELECT (user's own orders) | SELECT (all operational orders) | FULL ACCESS | **Blocked** (Service Role only) |
| `order_status_history` | None | SELECT (user's own orders) | SELECT (all operational orders) | FULL ACCESS | **Blocked** (Service Role only) |

---

## 4. Auth & Security Verification

1. **Service Role Isolation**: Direct INSERT/UPDATE/DELETE on orders and line items is blocked from the client bundle. Only server-side Next.js endpoints using `SUPABASE_SECRET_KEY` can commit order transactions.
2. **Zero-Trust Role Checks**: The `public.get_auth_user_role()` function reads the verified role directly from `public.profiles` corresponding to `auth.uid()`. Untrusted client request headers (`x-user-role`, `x-user-id`) are completely disregarded.
3. **Guest Order Claiming Function**: The `public.claim_guest_orders` stored procedure validates `auth.uid() = p_user_id` and securely reassigns unassigned orders (`user_id IS NULL`) matching cryptographic `tracking_tokens`.
