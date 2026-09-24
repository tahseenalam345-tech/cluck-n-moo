# Cluck N Moo (CNM) — SQLite to Supabase PostgreSQL Migration Plan

This document establishes the end-to-end engineering, architectural, and security roadmap for migrating Cluck N Moo (CNM) from local SQLite to Supabase PostgreSQL, hosted on Vercel with Supabase Auth, Next.js App Router (SSR), and Cloudinary media delivery.

> [!IMPORTANT]
> **Zero Disruption & Security Directives:**
> - Local SQLite database (`data/cnm.db`) remains completely intact and operational during planning.
> - Customer storefront UI remains unchanged until backend data services are verified.
> - No secrets, service role keys, or database passwords are ever committed to version control or exposed in browser bundles.
> - Client code never receives `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`.

---

## 1. SQLite-to-PostgreSQL Compatibility Audit

The current application utilizes Node.js 22+ native `node:sqlite` (`DatabaseSync`) executing raw synchronous SQL statements with SQLite-specific pragmas and loose typing. Moving to hosted Supabase PostgreSQL requires addressing specific relational differences:

### 1.1 Data Type Mappings

| SQLite 3 Type | Current Usage in CNM | PostgreSQL Type | Migration Note |
|---|---|---|---|
| `INTEGER` (0 or 1) | `is_active`, `is_available`, `is_featured`, `is_required`, `is_closed`, `is_default` | `BOOLEAN` (`true` / `false`) | SQLite booleans are integers `0` and `1`. PostgreSQL requires strict boolean literals or boolean casting (`value = 1` -> `TRUE`). |
| `TEXT` (ISO Strings) | `created_at`, `updated_at`, `dine_in_preferred_time` | `TIMESTAMPTZ` | SQLite stores date strings like `"2026-09-24T06:40:00.000Z"`. PostgreSQL validates timestamps with timezone and defaults to `now()`. |
| `INTEGER` | `base_price_pkr`, `subtotal_pkr`, `delivery_fee_pkr`, `discount_pkr`, `total_pkr`, `line_total_pkr` | `INTEGER` | PKR currency transactions in Pakistan do not use fractional cents/paisa. `INTEGER` is exact and avoids floating-point inaccuracies. |
| `REAL` | `discount_rate` (e.g. `0.05` for 5%) | `NUMERIC(5, 4)` | Preserves exact percentage values without IEEE floating-point drift. |
| `TEXT` (IDs) | `id`, `order_number`, `tracking_token`, `slug` | `TEXT` or `VARCHAR(64)` | Existing prefix IDs (`prod_...`, `cat_...`, `ord_...`, `trk_...`) can remain `TEXT` to preserve determinism and compatibility with Cloudinary and client orders. |
| `TEXT` (Auth User IDs) | `users.id` (`"usr_admin"`, etc.) | `UUID` (linked to `auth.users.id`) | Supabase Auth generates `UUIDv4` identifiers for registered users. Customer and staff tables must reference `auth.users(id) ON DELETE CASCADE`. |

### 1.2 Syntax and Operational Differences

1. **Parameter Placeholders:**
   - **SQLite**: Uses positional `?` placeholders (`WHERE id = ?`).
   - **PostgreSQL**: Uses numbered positional `$1, $2, ...` or named parameter binding through the query layer.
2. **Upsert Semantics:**
   - **SQLite**: `INSERT OR REPLACE INTO restaurant_settings ...` or `INSERT OR IGNORE`.
   - **PostgreSQL**: `INSERT INTO restaurant_settings (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`.
3. **Transaction Execution:**
   - **SQLite**: `db.exec("BEGIN TRANSACTION;"); ... db.exec("COMMIT;");` synchronous blocking in single-process memory.
   - **PostgreSQL**: Asynchronous client transactions across network boundaries with pool connection checkouts (`BEGIN`, `COMMIT`, `ROLLBACK`), handled via ORM or database transaction callback.
4. **Pragma Statements:**
   - `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, `PRAGMA foreign_keys = ON;`, and `PRAGMA table_info(...)` are invalid in PostgreSQL and must be eliminated.

---

## 2. SQLite-Specific Patterns Requiring Modification

Every instance of database access currently in `src/` must be transitioned:

| File Location | Current SQLite Pattern | Required PostgreSQL Pattern |
|---|---|---|
| `src/db/index.ts` | `import { DatabaseSync } from "node:sqlite";` with proxy object | Supabase connection layer: `@supabase/ssr` for auth context + pooled connection driver (`postgres` or Drizzle ORM). |
| `src/db/migrations/*` | `sqlite.prepare("PRAGMA table_info(...)").all()` | Standard PostgreSQL SQL migration files executed via Supabase CLI / SQL Editor using `IF NOT EXISTS` column additions. |
| `src/app/api/v1/orders/route.ts` | Synchronous `runInTransaction(() => { sqlite.prepare(...).run(...) })` | Asynchronous transaction wrapper with atomic multi-table insert (`orders`, `order_items`, `order_item_modifiers`, `order_status_history`). |
| `src/app/api/v1/orders/[id]/track/route.ts` | Querying by `id = ? OR order_number = ? OR tracking_token = ?` | Restrict guest tracking strictly to `tracking_token` to eliminate enumeration attacks on `order_number`. |
| `src/app/api/v1/orders/[id]/status/route.ts` | Reads client headers `x-user-role` and `x-user-id` | Extract verified authenticated user and role from Supabase Auth cookie session via `@supabase/ssr`. |
| `src/app/api/v1/ops/orders/route.ts` | Dynamic string concatenation with `sqlite.prepare(query).all(...params)` | Type-safe parameterized query builder or Supabase client query with status filters. |
| `src/app/api/v1/admin/settings/route.ts` | `INSERT OR REPLACE INTO restaurant_settings` | `INSERT ... ON CONFLICT (key) DO UPDATE SET ...`. |
| `src/app/api/v1/admin/delivery-areas/route.ts` | `sqlite.prepare(...).run(...)` returning `.lastInsertRowid` | PostgreSQL `INSERT ... RETURNING *`. |
| `scripts/import-real-menu.ts` | Synchronous batch SQLite statements | Asynchronous bulk insertion using Supabase Admin Client (`supabase.from('products').upsert(...)`). |

---

## 3. Recommended PostgreSQL ORM and Driver Approach

### 3.1 Recommended Architecture: Supabase SSR + Drizzle ORM (Dual-Layered)

To balance Vercel serverless performance, type safety, and Supabase Auth integration, we recommend:

1. **Authentication & Session Layer: `@supabase/ssr`**
   - Handles cookie-based sessions across Server Components, Server Actions, API Route Handlers, and Edge Middleware.
   - Automatically refreshes tokens and extracts verified `user.id` and user role claims.
2. **Database Query & Transaction Layer: `drizzle-orm` + `postgres` (or `@neondatabase/serverless` / `pg`)**
   - **Why Drizzle over Prisma**: Zero rust-binary engine overhead, microsecond cold-start times on Vercel, lightweight TypeScript schema definitions that compile 1:1 to SQL, and first-class support for PostgreSQL transactions with Supabase Transaction Pooler (Port 6543 / PgBouncer).
   - **Why not raw SQL strings**: Drizzle provides compile-time type validation, auto-generated migration files, and eliminates SQL injection risks in dynamic order filtering.

### 3.2 Connection Pooling Setup

- **Serverless API Routes & Next.js SSR (`DATABASE_URL`)**:
  Connects to Supabase **Transaction Pooler** on port **6543** with `?pgbouncer=true`. Prevents Vercel serverless lambda bursts from exhausting PostgreSQL connection limits.
- **Migrations & CLI Scripts (`DIRECT_URL`)**:
  Connects to Supabase **Direct Connection** on port **5432** (session mode) required for DDL schema changes and advisory locks.

---

## 4. Required Database Migrations for Supabase PostgreSQL

All migrations must be written as idempotent SQL files placed in `supabase/migrations/`:

### Migration 0001: Core Types and Storefront Schema
```sql
-- Create custom enums
CREATE TYPE user_role_enum AS ENUM ('CUSTOMER', 'KITCHEN_STAFF', 'RIDER', 'ADMIN');
CREATE TYPE order_type_enum AS ENUM ('DELIVERY', 'PICKUP', 'DINE_IN');
CREATE TYPE order_status_enum AS ENUM ('New', 'Confirmed', 'Preparing', 'Ready', 'Out for delivery', 'Completed', 'Cancelled');
CREATE TYPE payment_method_enum AS ENUM ('CASH');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'REFUNDED');
CREATE TYPE image_status_enum AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- 1. Delivery Areas
CREATE TABLE IF NOT EXISTS public.delivery_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  delivery_fee_pkr INTEGER NOT NULL DEFAULT 100 CHECK (delivery_fee_pkr >= 0),
  estimated_delivery_mins INTEGER NOT NULL DEFAULT 40 CHECK (estimated_delivery_mins > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Menu Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  cloudinary_public_id TEXT,
  image_alt_text TEXT,
  image_status image_status_enum NOT NULL DEFAULT 'PENDING',
  base_price_pkr INTEGER NOT NULL DEFAULT 0 CHECK (base_price_pkr >= 0),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_pkr INTEGER NOT NULL CHECK (price_pkr >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 5. Product Modifier Groups
CREATE TABLE IF NOT EXISTS public.product_modifier_groups (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selection INTEGER NOT NULL DEFAULT 0 CHECK (min_selection >= 0),
  max_selection INTEGER NOT NULL DEFAULT 1 CHECK (max_selection >= min_selection),
  is_required BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6. Product Modifiers
CREATE TABLE IF NOT EXISTS public.product_modifiers (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES public.product_modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_pkr INTEGER NOT NULL DEFAULT 0 CHECK (price_pkr >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Migration 0002: Customer Profiles & User System (Auth Integration)
```sql
-- 7. Public User Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Customer Saved Addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id TEXT PRIMARY KEY DEFAULT ('addr_' || substr(md5(random()::text), 1, 16)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivery_area_id TEXT REFERENCES public.delivery_areas(id) ON DELETE SET NULL,
  address_line TEXT NOT NULL,
  landmark TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Migration 0003: Orders, Order Items, and Operations
```sql
-- 9. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  tracking_token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_type order_type_enum NOT NULL,
  status order_status_enum NOT NULL DEFAULT 'New',
  payment_method payment_method_enum NOT NULL DEFAULT 'CASH',
  payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
  payment_location TEXT,
  customer_name_snapshot TEXT NOT NULL,
  customer_phone_snapshot TEXT NOT NULL,
  customer_email_snapshot TEXT,
  delivery_area_name_snapshot TEXT,
  delivery_address_snapshot TEXT,
  delivery_landmark_snapshot TEXT,
  dine_in_preferred_time TEXT,
  special_instructions TEXT,
  subtotal_pkr INTEGER NOT NULL CHECK (subtotal_pkr >= 0),
  delivery_fee_pkr INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_pkr >= 0),
  discount_pkr INTEGER NOT NULL DEFAULT 0 CHECK (discount_pkr >= 0),
  discount_rate NUMERIC(5, 4) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0),
  discount_type TEXT DEFAULT NULL,
  custom_deal_subtotal_pkr INTEGER NOT NULL DEFAULT 0 CHECK (custom_deal_subtotal_pkr >= 0),
  total_pkr INTEGER NOT NULL CHECK (total_pkr >= 0),
  assigned_rider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_by_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  variant_name_snapshot TEXT,
  unit_price_snapshot_pkr INTEGER NOT NULL CHECK (unit_price_snapshot_pkr >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_pkr INTEGER NOT NULL CHECK (line_total_pkr >= 0),
  custom_deal_id TEXT DEFAULT NULL
);

-- 11. Order Item Modifiers
CREATE TABLE IF NOT EXISTS public.order_item_modifiers (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  modifier_id TEXT REFERENCES public.product_modifiers(id) ON DELETE SET NULL,
  modifier_name_snapshot TEXT NOT NULL,
  price_snapshot_pkr INTEGER NOT NULL DEFAULT 0 CHECK (price_snapshot_pkr >= 0)
);

-- 12. Order Status History
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id TEXT PRIMARY KEY DEFAULT ('osh_' || substr(md5(random()::text), 1, 16)),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status_enum,
  to_status order_status_enum NOT NULL,
  changed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Settings and Schedules
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_schedules (
  id TEXT PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TEXT NOT NULL DEFAULT '12:01',
  close_time TEXT NOT NULL DEFAULT '02:00',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE
);
```

---

## 5. Indexes, Foreign Keys, and Constraints

High-frequency query performance on Supabase PostgreSQL requires indexing all search fields, foreign keys, and filter predicates:

```sql
-- Indexes on Products and Categories
CREATE INDEX IF NOT EXISTS idx_products_category_display ON public.products(category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_display ON public.categories(display_order);

-- Indexes on Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Indexes on Relational Children
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_modifiers_item_id ON public.order_item_modifiers(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON public.customer_addresses(user_id);
```

---

## 6. Authentication, Roles, and Row-Level Security (RLS)

### 6.1 Supabase `auth.users` Integration Trigger

When a user signs up via Supabase Auth (email or phone OTP), a database trigger automatically synchronizes their record into `public.profiles`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name, role)
  VALUES (
    new.id,
    new.phone,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'CNM Customer'),
    COALESCE((new.raw_app_meta_data->>'role')::user_role_enum, 'CUSTOMER')
  )
  ON CONFLICT (id) DO UPDATE
  SET phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 6.2 Role Hierarchy

1. **`ADMIN`**: Full read/write access to store settings, delivery areas, menu, orders, and rider assignments.
2. **`KITCHEN_STAFF`**: Read active orders (`Confirmed`, `Preparing`), update status `Confirmed -> Preparing -> Ready`.
3. **`RIDER`**: Read orders assigned to rider or ready for delivery, update status `Ready -> Out for delivery -> Completed`.
4. **`CUSTOMER`**: Read public menu, read own profile, read own order history.
5. **`GUEST` (Anonymous)**: Read public menu, place new order, track own order via unguessable `tracking_token`.

### 6.3 Row-Level Security (RLS) Strategy

All tables enable RLS (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).

#### Public Tables (Accessible to all users via `anon` role)
- `categories`, `products`, `product_variants`, `product_modifier_groups`, `product_modifiers`:
  ```sql
  CREATE POLICY "Public menu read access" ON public.products
    FOR SELECT TO anon, authenticated USING (is_available = TRUE);
  ```
- `delivery_areas`:
  ```sql
  CREATE POLICY "Public delivery areas read access" ON public.delivery_areas
    FOR SELECT TO anon, authenticated USING (is_active = TRUE);
  ```
- `restaurant_settings`, `restaurant_schedules`:
  ```sql
  CREATE POLICY "Public store settings read access" ON public.restaurant_settings
    FOR SELECT TO anon, authenticated USING (TRUE);
  ```

#### Authenticated Customer Data
- `profiles`:
  ```sql
  CREATE POLICY "Users can view and update own profile" ON public.profiles
    FOR ALL TO authenticated USING (auth.uid() = id);
  ```
- `customer_addresses`:
  ```sql
  CREATE POLICY "Users can manage own addresses" ON public.customer_addresses
    FOR ALL TO authenticated USING (auth.uid() = user_id);
  ```
- `orders`:
  ```sql
  CREATE POLICY "Customers view own orders" ON public.orders
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
  ```

#### Server-Side Only / Operations Protection
- All `INSERT` operations on `orders`, `order_items`, `order_item_modifiers`, and `order_status_history` are restricted to the **Server Service Role** (`supabase_admin` / Server Actions / Next.js API routes). This ensures prices, discounts, delivery fees, and order states are calculated exclusively on the server and cannot be spoofed by client-side API requests.

---

## 7. Guest Checkout, Order Tracking, and Account Linking

### 7.1 Cryptographic Guest Order Tracking Security

**The Security Flaw in SQLite:**
The current route `GET /api/v1/orders/[id]/track` queries:
`WHERE id = ? OR order_number = ? OR tracking_token = ?`
Because `order_number` follows a sequential/predictable format (`CNM-YYMM-XXXX`), an attacker can enumerate order numbers and harvest customer delivery addresses, names, and phone numbers.

**The Supabase PostgreSQL Solution:**
1. **Unauthenticated / Guest Requests**:
   - The tracking API route only permits lookups matching `tracking_token = $1` (cryptographically random 32-hex string `trk_...`).
   - If an `order_number` lookup is requested without a session, the server requires phone number confirmation (`customer_phone_snapshot = $2`) before returning order details.
2. **Authenticated Requests**:
   - Authenticated customers can view any order where `user_id = auth.uid()`.
3. **Response Sanitization**:
   - Staff internal notes, employee IDs, and internal IDs are stripped from customer-facing tracking payloads.

### 7.2 Linking Guest Orders After Customer Login

Guests place orders saved locally in `localStorage` under `cnm_local_orders`. When a customer registers or logs in:

1. The frontend invokes a secure Server Action or API endpoint `/api/v1/account/claim-orders` passing the list of `trackingToken` strings from `localStorage`.
2. The server executes a secure PostgreSQL function:
   ```sql
   CREATE OR REPLACE FUNCTION public.claim_guest_orders(
     p_user_id UUID,
     p_tracking_tokens TEXT[]
   )
   RETURNS INTEGER AS $$
   DECLARE
     v_updated_count INTEGER;
   BEGIN
     UPDATE public.orders
     SET user_id = p_user_id,
         updated_at = now()
     WHERE tracking_token = ANY(p_tracking_tokens)
       AND user_id IS NULL;

     GET DIAGNOSTICS v_updated_count = ROW_COUNT;
     RETURN v_updated_count;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
3. Upon success, the client synchronizes its local state, and all historical orders appear seamlessly in the customer's `/account` order history tab.

---

## 8. SQLite Data Export & Supabase Import Migration Script

A dedicated Node/TypeScript extraction script (`scripts/export-sqlite-to-supabase.ts`) will safely extract, transform, and load existing SQLite records into Supabase PostgreSQL:

### 8.1 Export & Transformation Pipeline

```text
[Local SQLite: data/cnm.db]
       │
       ▼ (Node.js DatabaseSync Reader)
[Transform Record Types]
  • INTEGER (0/1) ➔ BOOLEAN (true/false)
  • ISO Text Dates ➔ ISO 8601 Timestamptz
  • Float Discounts ➔ String-formatted Decimals
  • Filter Out Development Mock Users
       │
       ▼ (Supabase Admin Client via Service Role Key)
[Ordered Upsert into Supabase PostgreSQL]
  1. restaurant_settings & restaurant_schedules
  2. delivery_areas
  3. categories
  4. products (with verified Cloudinary public IDs)
  5. product_variants & modifiers
  6. historical production orders (if any)
```

### 8.2 Dry-Run Verification

The script includes `--dry-run` and `--write` flags:
- `--dry-run`: Validates all foreign key relationships, checks category references, verifies Cloudinary URL validity, and reports exact row counts without modifying the database.
- `--write`: Executes transactional bulk upserts into Supabase PostgreSQL.

---

## 9. Backup, Rollback, and Dual-Run Strategy

1. **Local SQLite Preservation**:
   - `data/cnm.db` will **never be deleted**.
   - Before executing migration scripts, an automated timestamped backup is generated: `data/backups/cnm_pre_supabase_migration_<timestamp>.db`.
2. **Environment Variable Feature Toggle**:
   - Introduce `DATA_SOURCE=supabase` (default) with a fallback `DATA_SOURCE=sqlite` in `src/db/provider.ts`.
   - If any network or Supabase connectivity issues arise during staging, toggling `DATA_SOURCE=sqlite` instantly redirects requests back to the local database without code rollbacks.
3. **Supabase Point-in-Time Recovery**:
   - Supabase automated daily backups and WAL log replication guarantee rollback to any second within the recovery window.

---

## 10. Environment Variable Specifications

### 10.1 Local `.env.local` Setup (Development)

```env
# Client-Side Public Configuration (Exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>

# Server-Side Only Database & Authentication (NEVER expose to browser)
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
DATABASE_URL_POOLER=postgresql://postgres.<your-project-ref>:[YOUR-PASSWORD]@<pooler-host>:6543/postgres?pgbouncer=true
DATABASE_URL_DIRECT=postgresql://postgres:[YOUR-PASSWORD]@db.<your-project-ref>.supabase.co:5432/postgres

# Cloudinary Server Media Management
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>

# Transition Configuration
DATA_SOURCE=supabase
```

### 10.2 Vercel Production Environment Variables

Configure these directly in **Vercel Project Settings -> Environment Variables**:

| Variable Name | Environment | Target Scope | Security Type |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Dev | Client & Server | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Dev | Client & Server | Public |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Production, Preview, Dev | Client & Server | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Dev | **Server Only** | **Sensitive Secret** |
| `DATABASE_URL` (Port 6543) | Production, Preview, Dev | **Server Only** | **Sensitive Secret** |
| `DIRECT_URL` (Port 5432) | Production, Preview, Dev | **Server Only** | **Sensitive Secret** |
| `CLOUDINARY_CLOUD_NAME` | Production, Preview, Dev | **Server Only** | **Sensitive Secret** |
| `CLOUDINARY_API_KEY` | Production, Preview, Dev | **Server Only** | **Sensitive Secret** |
| `CLOUDINARY_API_SECRET` | Production, Preview, Dev | **Server Only** | **Sensitive Secret** |

---

## 11. Exact Files Requiring Changes

The following files will be introduced or refactored during implementation:

### New Infrastructure Files
1. `src/lib/supabase/client.ts` — Browser Supabase client (`createBrowserClient` from `@supabase/ssr`).
2. `src/lib/supabase/server.ts` — Server-side Supabase client (`createServerClient` from `@supabase/ssr` with Next.js cookie handling).
3. `src/lib/supabase/admin.ts` — Server-only privileged service role client for order processing and webhook management.
4. `src/lib/supabase/middleware.ts` — Session refresh and role verification middleware for App Router.
5. `src/db/schema.postgres.ts` — Drizzle ORM PostgreSQL schema definitions.
6. `scripts/export-sqlite-to-supabase.ts` — Safe ETL script to export SQLite data into Supabase PostgreSQL.
7. `supabase/migrations/*.sql` — Version-controlled PostgreSQL DDL migration scripts.

### Files to Refactor
1. `src/app/api/v1/menu/route.ts` — Read from Supabase PostgreSQL categories and products.
2. `src/app/api/v1/orders/route.ts` — Replace SQLite `runInTransaction` with PostgreSQL atomic transaction.
3. `src/app/api/v1/orders/[id]/track/route.ts` — Enforce cryptographic tracking token security.
4. `src/app/api/v1/orders/[id]/status/route.ts` — Replace `x-user-role` headers with verified Supabase cookie session.
5. `src/app/api/v1/ops/orders/route.ts` — Secure operational orders endpoint with Supabase role verification.
6. `src/app/api/v1/store/status/route.ts` & `delivery-areas/route.ts` — Query PostgreSQL settings and delivery areas.
7. `src/app/api/v1/admin/*` — Enforce `ADMIN` role check using Supabase session.
8. `src/lib/auth.ts` — Integrate Supabase JWT session verification while keeping tracking token generators.
9. `src/components/CustomerHeader.tsx` & `src/app/account/page.tsx` — Connect to Supabase Auth state.

---

## 12. Implementation Phases

```mermaid
graph TD
    Phase1[Phase 1: Supabase DDL Migrations & Database Setup] --> Phase2[Phase 2: SSR Cookie Client & Connection Infrastructure]
    Phase2 --> Phase3[Phase 3: SQLite to Supabase Data Export & Verification]
    Phase3 --> Phase4[Phase 4: Storefront & Menu Read Endpoints]
    Phase4 --> Phase5[Phase 5: Secure Order Engine & Transaction Migration]
    Phase5 --> Phase6[Phase 6: Auth Integration & Account Order Linking]
    Phase6 --> Phase7[Phase 7: Operations & Admin Dashboard Role Enforcement]
    Phase7 --> Phase8[Phase 8: Vercel Production Deployment & Monitoring]
```

### Phase 1: Database Setup & DDL Schema Migrations (Supabase)
- Execute Migrations 0001, 0002, and 0003 in Supabase SQL editor.
- Configure Row Level Security (RLS) policies.
- Verify indexes and constraints.

### Phase 2: SSR Client & Connection Infrastructure
- Install `@supabase/ssr`, `@supabase/supabase-js`, and `drizzle-orm`.
- Create cookie-aware server and browser clients.
- Create middleware for automatic token refreshing.

### Phase 3: SQLite to Supabase Data Export & Verification
- Run `export-sqlite-to-supabase.ts --dry-run` to validate 100% data parity.
- Execute `--write` to populate Supabase with verified menu, categories, and delivery areas.
- Compare SQLite vs PostgreSQL row counts and checksums.

### Phase 4: Storefront & Menu Read Endpoints
- Connect `/api/v1/menu`, `/api/v1/store/status`, and `/api/v1/store/delivery-areas` to Supabase PostgreSQL.
- Verify customer storefront displays all categories, products, and Cloudinary images correctly.

### Phase 5: Secure Order Engine & Transaction Migration
- Refactor `POST /api/v1/orders` to execute atomic multi-table PostgreSQL transactions.
- Refactor `GET /api/v1/orders/[id]/track` with strict `tracking_token` cryptographic validation.
- Test custom deal discounts, delivery fees, and order item modifiers under PostgreSQL.

### Phase 6: Auth Integration & Account Order Linking
- Connect customer sign-up/login to Supabase Auth.
- Implement `/api/v1/account/claim-orders` to link local guest orders to authenticated user profiles.
- Display customer past orders in `/account`.

### Phase 7: Operations & Admin Dashboard Role Enforcement
- Replace mock headers in kitchen line, rider portal, and admin dashboard with verified Supabase session claims.
- Validate role state machine transitions (`validateStatusTransition`).

### Phase 8: Vercel Staging & Production Deployment
- Configure environment variables on Vercel.
- Run build checks and smoke tests.
- Monitor connection pool metrics under load.

---

## 13. Next Steps & Approval Gate

All application code and SQLite database files remain completely untouched.

**Action Required**:
Please review this migration plan. Upon your confirmation and approval, we will proceed step-by-step beginning with **Phase 1** (executing DDL migrations on Supabase).
