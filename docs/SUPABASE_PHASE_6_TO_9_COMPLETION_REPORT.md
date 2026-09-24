# Cluck N Moo (CNM) — Supabase Phases 6, 7, 8, & 9 Completion Report

**Date & Time**: 2026-09-24T13:05:00+05:00  
**Scope Completed**: 
- **Phase 6**: Supabase Authentication (Customer & Staff RBAC, SSR Session, Profile, Addresses, Guest Order Claiming)
- **Phase 7**: Order Creation & Checkout Writes (Server-side price recalculation, custom deal discounts, atomic PostgreSQL transaction, guest token)
- **Phase 8**: Order Tracking & Customer Order History (Anti-enumeration, token security, order details, Order Again availability check)
- **Phase 9**: Operations Pipelines (Admin Command Center, Kitchen KDS, Rider Delivery Portal, State Machine validation, audit trail)

**Database Backend**: Supabase PostgreSQL (Session Pooler `aws-0-ap-northeast-2.pooler.supabase.com:5432` / Port 6543)  
**Authentication Backend**: Supabase Auth (GoTrue + SSR Cookies + PostgreSQL `public.profiles` RBAC)  
**Production Build Status**: Clean Build (Exit Code 0)  
**Runtime SQLite Status**: **0 runtime imports remaining across the entire application**  

---

## 1. APIs Switched & SQLite Runtime Imports Audit

Every active business route has been transitioned from local SQLite to Supabase PostgreSQL:

| API Route | HTTP Method | Target Repository | Old SQLite Removed | Role Enforcement |
| :--- | :---: | :--- | :---: | :--- |
| `/api/v1/orders` | POST | `orderRepository.createOrderInPostgres` | Yes | Guest or Authenticated Customer |
| `/api/v1/orders/[id]/track` | GET | `orderRepository.getOrderForTracking` | Yes | Token-validated Guest, Owner, or Staff |
| `/api/v1/orders/[id]/status` | POST | `orderRepository.updateOrderStatusInPostgres` | Yes | `ADMIN`, `KITCHEN_STAFF`, `RIDER` |
| `/api/v1/ops/orders` | GET | `orderRepository.getOpsOrders` | Yes | Filtered by verified staff role |
| `/api/v1/admin/settings` | GET, POST | `storeAdminRepository.getAdminSettingsAndSchedules` | Yes | `ADMIN` only |
| `/api/v1/admin/delivery-areas` | GET, POST, PATCH | `storeAdminRepository.getAllDeliveryAreasForAdmin` | Yes | `ADMIN` only |
| `/api/v1/account/orders` | GET | `orderRepository.getCustomerOrders` | (New) | Authenticated Owner (`auth.uid()`) |
| `/api/v1/account/addresses` | POST, DELETE | `accountRepository.saveCustomerAddress` | (New) | Authenticated Owner (`auth.uid()`) |
| `/api/v1/account/profile` | GET, PUT | `accountRepository.getCustomerProfileWithAddresses` | (New) | Authenticated Owner (`auth.uid()`) |
| `/api/v1/account/claim-orders` | POST | `accountRepository.claimGuestOrdersForUser` | (New) | Authenticated Owner (`auth.uid()`) |
| `/auth/callback` | GET | Supabase Auth Code Exchange | (New) | OAuth / Email confirmation exchange |

### Remaining SQLite Runtime Imports
- **Total active runtime routes importing SQLite**: **0**
- Local SQLite database file (`data/cnm.db`) is completely decoupled from runtime execution and remains intact solely as an offline backup.

---

## 2. Authentication & Authorization Implementation

### A. Customer Authentication
- **Guest Checkout**: Preserved 100%. Guests place orders with `user_id = null` and receive a cryptographically secure 128-bit hex tracking token (`trk_...`).
- **Email/Password & Google OAuth**: Implemented using `@supabase/ssr` with secure HTTP-only cookie persistence.
- **Account Page (`/account`)**:
  - Unauthenticated view: Sign In, Sign Up, and Google OAuth with clear guest checkout reassurance.
  - Authenticated view: Customer profile management, saved delivery address book, and complete order history.
  - **Automatic Order Claiming**: Upon login, local tracking tokens stored on the browser device (`cnm_local_orders`) are securely associated with the authenticated customer's account in PostgreSQL (`claim_guest_orders`).

### B. Staff Authentication & Zero-Trust RBAC
- **Dedicated Staff Portal**: Created `/staff/login` with terminal styling and automatic role routing.
- **Protected Routes**:
  - `/admin`: Restricted to `ADMIN`.
  - `/kitchen`: Restricted to `KITCHEN_STAFF` or `ADMIN`.
  - `/rider`: Restricted to `RIDER` or `ADMIN`.
- **Zero-Trust Role Enforcement**:
  - Client-supplied headers (`x-user-role`, `x-user-id`), query parameters, and localStorage roles are **strictly ignored and disregarded**.
  - All operations routes verify the user session directly against the `public.profiles.role` column in Supabase PostgreSQL via `enforceRole()`.
  - Customer navigation components (`CustomerHeader.tsx`, `CustomerFooter.tsx`) have zero links to staff operational portals.

---

## 3. Order Processing & Transaction Design

- **Server-Side Price Recalculation**: The server rejects client prices, discounts, modifier prices, and delivery fees. Unit prices and modifier costs are fetched fresh from `products`, `product_variants`, and `product_modifiers` inside PostgreSQL.
- **Custom Deal Discount Engine**:
  - Subtotal < 2500 PKR: 0% discount
  - Subtotal 2500 - 3499 PKR: 5% discount
  - Subtotal >= 3500 PKR: 10% discount
  - Delivery fee is strictly excluded from discount calculations.
- **Atomic Multi-Table Transaction**: Orders are created in a single atomic transaction inserting into `orders`, `order_items`, `order_item_modifiers`, and `order_status_history`.
- **Safe Local Device History**: `saveLocalOrder()` stores only lightweight tracking metadata (`orderId`, `orderNumber`, `trackingToken`, `orderType`, `currentStatus`, `finalTotalPkr`) with **no customer addresses** in browser localStorage.

---

## 4. Privacy & Anti-Enumeration Architecture

- **Anti-Enumeration Guard**: When accessing `/api/v1/orders/[id]/track`:
  - Access is granted if the caller is an authenticated staff member.
  - Access is granted if the caller is the authenticated owner of the order (`user_id = auth.uid()`).
  - Access is granted to guests **only if the valid tracking token is provided**.
  - Enumerating or guessing order numbers (`CNM-YYMM-XXXX`) without the cryptographic token yields a `403 Forbidden` response.
- **Rider Data Minimization**: Riders only see the phone number and delivery address of orders assigned to them or ready for immediate delivery dispatch.

---

## 5. Verification Test Suite Results

An end-to-end automated verification test suite (`scripts/test-phase6-to-9-verification.ts`) was executed against the live Supabase PostgreSQL database:

| # | Test Assertion | Result |
| :---: | :--- | :---: |
| 1 | Guest checkout creates Supabase order | ✅ PASS |
| 2 | Guest order has `user_id = null` in Supabase | ✅ PASS |
| 3 | Guest order has initial status `'New'` | ✅ PASS |
| 4 | Logged-in checkout creates Supabase order linked to user | ✅ PASS |
| 5 | Logged-in order links to correct user UUID in `profiles` | ✅ PASS |
| 6 | Client-supplied invalid or altered product ID is rejected (`ITEM_UNAVAILABLE`) | ✅ PASS |
| 7 | Invalid variant ID is rejected (`VARIANT_UNAVAILABLE`) | ✅ PASS |
| 8 | Invalid delivery area is rejected (`AREA_UNAVAILABLE`) | ✅ PASS |
| 9 | 2499 PKR custom deal subtotal = 0% discount | ✅ PASS |
| 10 | 2500 PKR custom deal subtotal = 5% discount (125 PKR) | ✅ PASS |
| 11 | 3499 PKR custom deal subtotal = 5% discount (175 PKR) | ✅ PASS |
| 12 | 3500 PKR custom deal subtotal = 10% discount (350 PKR) | ✅ PASS |
| 13 | Delivery fee is never discounted | ✅ PASS |
| 14 | Guest tracking succeeds with valid tracking token | ✅ PASS |
| 15 | Guest tracking fails with invalid token (403) | ✅ PASS |
| 16 | Guest cannot enumerate order by order number without token | ✅ PASS |
| 17 | Customer cannot access another customer's order (403) | ✅ PASS |
| 18 | Customer successfully accesses their own order | ✅ PASS |
| 19 | Customer role in ops pipeline returns 0 orders | ✅ PASS |
| 20 | Kitchen staff cannot perform administrative order cancellation | ✅ PASS |
| 21 | Kitchen staff can transition Confirmed -> Preparing | ✅ PASS |
| 22 | Skipping required intermediate states is rejected by state machine | ✅ PASS |
| 23 | Admin confirms order via state machine update | ✅ PASS |
| 24 | Order status history records exist (Initial submission + Confirmed) | ✅ PASS |
| 25 | Latest audit history accurately records `toStatus` and staff note | ✅ PASS |
| 26 | Active categories count equals 14 | ✅ PASS |
| 27 | Active products count equals 74 | ✅ PASS |
| 28 | Cloudinary synced products = 64, Fallback branded images = 10 | ✅ PASS |

**Total Verification Result**: **28 / 28 Tests Passed (100%)**.

---

## 6. Next.js Production Build Status

Next.js production build (`npm run build`) was executed and compiled cleanly:

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    12.7 kB         140 kB
├ ○ /_not-found                            996 B         104 kB
├ ○ /account                             4.92 kB         191 kB
├ ○ /admin                                6.5 kB         182 kB
├ ƒ /api/v1/account/addresses              154 B         103 kB
├ ƒ /api/v1/account/claim-orders           154 B         103 kB
├ ƒ /api/v1/account/orders                 154 B         103 kB
├ ƒ /api/v1/account/profile                154 B         103 kB
├ ƒ /api/v1/admin/delivery-areas           154 B         103 kB
├ ƒ /api/v1/admin/settings                 154 B         103 kB
├ ƒ /api/v1/menu                           154 B         103 kB
├ ƒ /api/v1/ops/orders                     154 B         103 kB
├ ƒ /api/v1/orders                         154 B         103 kB
├ ƒ /api/v1/orders/[id]/status             154 B         103 kB
├ ƒ /api/v1/orders/[id]/track              154 B         103 kB
├ ƒ /api/v1/store/delivery-areas           154 B         103 kB
├ ƒ /api/v1/store/status                   154 B         103 kB
├ ƒ /auth/callback                         154 B         103 kB
├ ○ /contact                             1.25 kB         118 kB
├ ○ /deals                               5.25 kB         132 kB
├ ○ /kitchen                             4.05 kB         180 kB
├ ○ /menu                                2.55 kB         130 kB
├ ○ /order/track                         7.76 kB         130 kB
├ ƒ /order/track/[id]                     6.7 kB         113 kB
├ ○ /privacy                             1.19 kB         118 kB
├ ○ /rider                                  4 kB         180 kB
├ ○ /staff/login                         2.75 kB         178 kB
└ ○ /terms                               1.16 kB         118 kB
```
- **Exit Code**: `0`
- **TypeScript & ESLint Check**: Passed with 0 errors.

---

## 7. Unresolved Issues

- **None**. All requirements for Phases 6, 7, 8, and 9 have been fulfilled and verified.

---

## 8. Exact Next Steps for Vercel Deployment

1. **Environment Variables on Vercel Dashboard**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (`https://<project-ref>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anon key
   - `SUPABASE_SECRET_KEY`: Supabase service role key (marked Sensitive, never exposed to client)
   - `DATABASE_URL_POOLER`: Supabase Transaction Pooler connection string (`postgres://...:6543/postgres`)
   - `DATABASE_URL_DIRECT`: Supabase Direct / Session Pooler connection string (`postgres://...:5432/postgres`)
   - `CLOUDINARY_CLOUD_NAME`: Cloudinary account name
   - `JWT_SECRET`: Random 256-bit secret string
2. **Supabase Auth Redirect URL Configuration**:
   - Add the production Vercel domain to **Authentication** > **URL Configuration** > **Redirect URLs** in the Supabase Dashboard:  
     `https://<your-vercel-domain>.vercel.app/auth/callback`
3. **Staff Bootstrap**:
   - Follow [`docs/STAFF_BOOTSTRAP_SETUP.md`](file:///e:/Projects/Cluck%20n%20moo/docs/STAFF_BOOTSTRAP_SETUP.md) to create the first admin user in Supabase Auth and assign `role = 'ADMIN'` in the `profiles` table.
4. **Trigger Git Push & Deploy**:
   - Push repository to the private GitHub repository and trigger deployment on Vercel.
