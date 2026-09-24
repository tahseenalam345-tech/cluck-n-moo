# Cluck N Moo (CNM) — Supabase PostgreSQL Phase 1 Implementation Report

This report documents the completion of **Phase 1** of the Supabase PostgreSQL migration for Cluck N Moo (CNM). All schema definitions, migrations, and PostgreSQL client infrastructure have been created in a separate, isolated layer without modifying the existing SQLite database or application functionality.

---

## 1. Environment Variable Pre-Flight Verification

Environment variables in `.env.local` were verified strictly via boolean existence checks. **Zero secret values were printed, logged, or exposed.**

| Environment Variable | Status | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Verified Present** (`true`) | Browser + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Verified Present** (`true`) | Browser + Server |
| `DATABASE_URL_POOLER` | **Verified Present** (`true`) | Server-Only (Port 6543) |
| `DATABASE_URL_DIRECT` | **Verified Present** (`true`) | Server-Only (Port 5432) |
| `SUPABASE_SECRET_KEY` | **Verified Present** (`true`) | Server-Only (Service Role) |
| `SUPABASE_JWKS_URL` | **Verified Present** (`true`) | Server-Only (Auth Verification) |

---

## 2. Dependencies Added

The following packages were installed to support PostgreSQL and Supabase SSR:

```json
"dependencies": {
  "@supabase/ssr": "^0.5.2",
  "@supabase/supabase-js": "^2.49.1",
  "drizzle-orm": "^0.40.0",
  "postgres": "^3.4.5"
},
"devDependencies": {
  "drizzle-kit": "^0.30.5"
}
```

---

## 3. Dedicated PostgreSQL Layer Architecture

The new PostgreSQL database layer is completely isolated from the current SQLite implementation (`src/db/index.ts` remains active and untouched):

```text
src/
├── db/
│   ├── index.ts               (Current SQLite 3 DatabaseSync - UNTOUCHED)
│   ├── schema.ts              (Current SQLite schema - UNTOUCHED)
│   └── postgres/              (NEW PostgreSQL Layer)
│       ├── schema.ts          (Drizzle ORM typed schema & relations)
│       └── client.ts          (Server-only PostgreSQL connection manager)
└── lib/
    └── supabase/              (NEW Supabase SSR & Admin Layer)
        ├── client.ts          (Browser-safe SSR client using NEXT_PUBLIC_*)
        ├── server.ts          (Server-side SSR client using Next.js cookies)
        └── admin.ts           (Server-only privileged client with guards)
```

### Security Guard Implementation
- `src/db/postgres/client.ts` and `src/lib/supabase/admin.ts` include runtime guards that throw errors immediately if executed in a browser context (`typeof window !== "undefined"`).
- `src/db/postgres/client.ts` uses lazy connection instantiation so building Next.js pages or running unit tests does not attempt remote network connections prematurely.

---

## 4. Generated Migration Files

Four idempotent SQL migration scripts were created in `supabase/migrations/`:

| File Name | Objects Created |
|---|---|
| [`0001_core_schema.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0001_core_schema.sql) | 6 ENUM types, 14 Tables with primary keys, checks, and foreign keys |
| [`0002_indexes_and_constraints.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0002_indexes_and_constraints.sql) | 22 Performance & filtering B-tree indexes |
| [`0003_auth_triggers_and_functions.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0003_auth_triggers_and_functions.sql) | `handle_new_user()` trigger, `get_auth_user_role()`, `claim_guest_orders()` |
| [`0004_row_level_security.sql`](file:///e:/Projects/Cluck%20n%20moo/supabase/migrations/0004_row_level_security.sql) | Row-Level Security enabled on all 14 tables with public/customer/admin policies |

Full SQL text and constraint definitions are detailed in [`docs/SUPABASE_SQL_REVIEW.md`](file:///e:/Projects/Cluck%20n%20moo/docs/SUPABASE_SQL_REVIEW.md).

---

## 5. Entities and Business Rules Coverage

All real CNM database entities and operational constraints are fully represented:

1. **Profiles (`profiles`)**: Linked to `auth.users(id) ON DELETE CASCADE`. Automatically populated via trigger with roles `CUSTOMER`, `KITCHEN_STAFF`, `RIDER`, or `ADMIN`.
2. **Delivery Areas (`delivery_areas`)**: Supported delivery fees (`INTEGER` PKR) and estimated arrival times with active status indicators.
3. **Menu & Categories (`categories`, `products`, `product_variants`)**: Includes Cloudinary media fields (`cloudinary_public_id`, `image_status`, `image_url`), base price in PKR, availability booleans, and sort orders.
4. **Modifiers (`product_modifier_groups`, `product_modifiers`)**: Min/max selection constraints, required flags, and modifier price increments.
5. **Orders & Deals (`orders`)**:
   - Cryptographic tracking token (`tracking_token`) to prevent enumeration attacks.
   - Immutable customer snapshots (`customer_name_snapshot`, `customer_phone_snapshot`, delivery address/landmark).
   - Custom deal tracking (`discount_pkr`, `discount_rate`, `discount_type`, `custom_deal_subtotal_pkr`).
   - Rider and staff assignments with `ON DELETE SET NULL`.
6. **Order Items & Modifiers (`order_items`, `order_item_modifiers`)**:
   - Line items with product name snapshot, unit price snapshot, and `custom_deal_id`.
   - Modifiers with name snapshots and price snapshots.
7. **Audit & Operations (`order_status_history`)**: Records transition timeline with `from_status`, `to_status`, timestamps, and staff user references.
8. **Settings & Schedules (`restaurant_settings`, `restaurant_schedules`)**: Store operational status, banners, and operating hours per day of week.

---

## 6. Local TypeScript & Build Validation

A complete TypeScript compilation check was executed to guarantee:
- Zero type errors in Drizzle ORM schema definitions.
- Zero type errors in Supabase SSR client utilities.
- Existing SQLite codebase continues to compile cleanly.

---

## 7. Current Project State & Non-Destructive Invariants

- **SQLite Database**: `data/cnm.db` is intact and untouched.
- **Customer UI**: Storefront, menu, cart, deal builder, and checkout are completely untouched.
- **Existing API Routes**: All routes under `src/app/api/v1/*` continue to query local SQLite without disruption.
- **Supabase Cloud**: No migrations have been executed against your Supabase project yet.

---

## 8. Next Steps (Phase 2 Readiness)

Phase 1 preparation is complete. Once approved, Phase 2 will execute the SQL migrations against Supabase using `DATABASE_URL_DIRECT` and test data import parity.
