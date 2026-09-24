# Cluck N Moo (CNM) — Supabase Phases 6 to 9 Implementation Plan

**Objective**: Completely eliminate SQLite from all active runtime business flows and establish Supabase PostgreSQL + Supabase Auth as the production operational backend.

---

## 1. Routes Being Switched & SQLite Dependency Removal

| Route / Module | Current Backend | Target Backend | Notes |
| :--- | :---: | :---: | :--- |
| `POST /api/v1/orders` | SQLite (`@/db`) | Supabase PostgreSQL Repository | Order creation with server-side price recalculation & atomic transaction |
| `GET /api/v1/orders/[id]/track` | SQLite (`@/db`) | Supabase PostgreSQL Repository | Secure order tracking with token validation & anti-enumeration |
| `POST /api/v1/orders/[id]/status` | SQLite (`@/db`) | Supabase PostgreSQL Repository | Role-enforced state transitions & status audit trail |
| `GET /api/v1/ops/orders` | SQLite (`@/db`) | Supabase PostgreSQL Repository | Role-filtered order pipelines (Admin, Kitchen, Rider) |
| `GET/POST /api/v1/admin/settings` | SQLite (`@/db`) | Supabase PostgreSQL Repository | Admin-only restaurant settings & schedules |
| `GET/POST/PATCH /api/v1/admin/delivery-areas` | SQLite (`@/db`) | Supabase PostgreSQL Repository | Admin-only delivery area CRUD |
| `GET /api/v1/account/orders` | (New) | Supabase PostgreSQL Repository | Authenticated customer order history |
| `GET/POST /api/v1/account/addresses` | (New) | Supabase PostgreSQL Repository | Authenticated customer saved address book |
| `POST /api/v1/account/claim-orders` | (New) | Supabase RPC (`claim_guest_orders`) | Securely claims local guest orders upon login |
| `src/app/account/page.tsx` | LocalStorage only | Supabase Auth + Postgres | Real login/signup, saved addresses, order history, claim orders |
| `src/app/admin/page.tsx` | Insecure header | Supabase Auth + RBAC | Protected admin dashboard |
| `src/app/kitchen/page.tsx` | Insecure header | Supabase Auth + RBAC | Protected Kitchen Display System |
| `src/app/rider/page.tsx` | Insecure header | Supabase Auth + RBAC | Protected Rider dispatch portal |

**Runtime SQLite Status After Migration**: 0 runtime imports in active business routes.  
`src/db/index.ts` remains as a dormant backup until decommission approval.

---

## 2. Supabase Repositories & Services Architecture

Located in `src/db/postgres/repositories/`:

1. [`orderRepository.ts`](file:///e:/Projects/Cluck%20n%20moo/src/db/postgres/repositories/orderRepository.ts):
   - `createOrderInPostgres()`: Validates store open hours, fetches real DB prices for products, variants, and modifiers, calculates custom deal discounts, checks delivery fees, and performs an atomic Drizzle multi-table transaction inserting `orders`, `order_items`, `order_item_modifiers`, and `order_status_history`.
   - `getOrderForTracking()`: Fetches order with items and timeline. Implements token-based security check.
   - `getCustomerOrders()`: Fetches orders where `user_id = $userId`.
   - `getOpsOrders()`: Queries orders filtered by staff role (`ADMIN`, `KITCHEN_STAFF`, `RIDER`).
   - `updateOrderStatusInPostgres()`: Validates status transition against `validateStatusTransition()`, updates `orders` record, and inserts `order_status_history`.

2. [`accountRepository.ts`](file:///e:/Projects/Cluck%20n%20moo/src/db/postgres/repositories/accountRepository.ts):
   - `getCustomerProfile(userId)`: Reads user profile from `profiles`.
   - `getCustomerAddresses(userId)`: Reads saved addresses.
   - `saveCustomerAddress(userId, data)`: Inserts or updates address.
   - `deleteCustomerAddress(userId, addressId)`: Removes address.
   - `claimGuestOrders(userId, tokens)`: Calls `public.claim_guest_orders` RPC.

3. [`storeAdminRepository.ts`](file:///e:/Projects/Cluck%20n%20moo/src/db/postgres/repositories/storeAdminRepository.ts):
   - Admin settings upsert, schedule update, delivery area creation and status toggle.

4. [`authGuard.ts`](file:///e:/Projects/Cluck%20n%20moo/src/lib/authGuard.ts):
   - Server-side helper `requireUserRole(allowedRoles)`:
     - Extracts session from cookies using `@supabase/ssr`.
     - Queries `profiles` table directly to obtain verified `role`.
     - Throws/returns 401 (Unauthenticated) or 403 (Forbidden) if unauthorized.

---

## 3. Security & Role Enforcement Design

### Zero Trust on Client Metadata
- `x-user-role`, `x-user-id`, URL query parameters, and localStorage flags are **never** used for server authorization.
- Every operations endpoint (`/api/v1/ops/orders`, `/api/v1/orders/[id]/status`, `/api/v1/admin/*`) parses the secure HTTP-only Supabase auth cookie, extracts `user.id`, and validates against `public.profiles.role`.

### Role Permissions Matrix
- **CUSTOMER**: Access storefront, `/account`, view own orders, place orders. Zero access to `/admin`, `/kitchen`, `/rider` or staff APIs.
- **ADMIN**: Access `/admin`, full read/write on all orders, settings, schedules, delivery areas, staff assignment.
- **KITCHEN_STAFF**: Access `/kitchen`, view active kitchen tickets (`Confirmed`, `Preparing`, `Ready`), execute transitions `Confirmed -> Preparing` and `Preparing -> Ready`. Cannot view customer address/phone details.
- **RIDER**: Access `/rider`, view orders assigned to them (or unassigned ready delivery orders for pickup), execute transitions `Ready -> Out for delivery` and `Out for delivery -> Completed`. Access customer address and phone only for their active delivery orders.

---

## 4. Order Creation Transaction & Price Recalculation

All calculations happen strictly server-side:
```
Client Request -> Zod Validation
               -> Check Store Open (settings + schedule)
               -> Query DB: fetch products, variants, modifiers by IDs
               -> Calculate Unit Prices & Modifiers Total
               -> Calculate Custom Deal Subtotal & Discount:
                  - < 2500 PKR => 0%
                  - 2500 - 3499 PKR => 5%
                  - >= 3500 PKR => 10%
               -> Validate & Add Delivery Fee (Never discounted)
               -> Atomic DB Transaction (orders, items, modifiers, history)
               -> Return Success with Order Number & Tracking Token
```

---

## 5. Guest Order Tracking & Anti-Enumeration

- Guest orders are assigned `user_id = NULL` and a cryptographically secure 128-bit hex tracking token (`trk_...`).
- When accessing `GET /api/v1/orders/[id]/track`:
  1. If authenticated user matches `order.user_id`, access is granted.
  2. If authenticated staff has `ADMIN`, `KITCHEN_STAFF`, or `RIDER`, access is granted.
  3. If unauthenticated / guest:
     - The request **must** provide the matching `tracking_token` (as URL token query param or path param).
     - Searching purely by `order_number` or database UUID without the secret tracking token returns `404 Not Found`.
  4. This completely prevents enumeration and unauthorized scraping of customer names, phones, and addresses.

---

## 6. Staff Bootstrap Workflow

Refer to [`docs/STAFF_BOOTSTRAP_SETUP.md`](file:///e:/Projects/Cluck%20n%20moo/docs/STAFF_BOOTSTRAP_SETUP.md) for step-by-step instructions to create the initial admin user in Supabase Auth and assign roles in the `profiles` table.

---

## 7. Emergency Rollback Plan

If an unexpected production incident occurs with the Supabase connection:
1. `data/cnm.db` remains intact with schema and test data.
2. The route files can be reverted via Git (`git restore src/app/api/v1/`).
3. No data loss will occur on the local SQLite store.
