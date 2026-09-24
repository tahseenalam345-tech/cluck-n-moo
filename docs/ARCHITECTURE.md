# Cluck N Moo (CNM) — System Architecture Document

## 1. Executive Overview
Cluck N Moo (CNM) is a fast-casual restaurant based on Main GT Road, Kharian, Pakistan (*"juiciest in town"*). This architecture document defines the system topology, boundary separation, state transitions, security model, and API contracts for a production-ready ordering and operations platform.

---

## 2. Technology Stack Selection & Justification

- **Application Framework**: Next.js 15 (App Router, TypeScript)
  - *Why*: Unified full-stack architecture with strict server-side validation, zero-latency server calls, and first-class REST API Route Handlers (`/api/v1/*`) enabling seamless reuse by future native iOS/Android apps.
- **Styling & Design System**: Vanilla CSS + CSS Variables & Scoped CSS Modules
  - *Why*: Strict adherence to project constraints (no TailwindCSS), zero build-tool baggage, optimal bundle size, and total control over CNM's high-contrast brand styling (Black `#0C0C0C`, Orange `#FF8243`, White `#FFFFFF`, Cream `#FFF5EE`).
- **Database & Query Engine**: Drizzle ORM with normalized relational schema
  - *Why*: Type-safe SQL modeling, zero daemon requirement on local Windows development, transparent schema migrations, and 1-to-1 portability to hosted PostgreSQL (Neon, Supabase, AWS RDS).
- **Client Form Factor**: Mobile-First Progressive Web App (PWA)
  - *Why*: 80%+ of restaurant traffic is mobile. Fast installability, smooth bottom-sheets, sticky cart actions, and offline-resilient app shell.
- **Timezone Management**: Strict Pakistan Standard Time (PKT, UTC+05:00) with midnight-crossing schedule evaluation.

---

## 3. System Architecture & Layers

```
+-------------------------------------------------------------------------------+
|                             CLIENT CHANNELS                                   |
|   +-------------------+  +--------------------+  +--------------------+       |
|   |  Customer PWA     |  | Admin & Config     |  | Kitchen KDS        |       |
|   |  (Mobile-First)   |  | Dashboard          |  | & Rider App        |       |
|   +---------+---------+  +---------+----------+  +---------+----------+       |
|             |                      |                       |                  |
+-------------|----------------------|-----------------------|------------------+
              |                      |                       |
              +----------------------+-----------------------+
                                     | JSON / HTTPS
                                     v
+-------------------------------------------------------------------------------+
|                      NEXT.JS BACKEND & API GATEWAY                            |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   |  Public & Mobile REST API (/api/v1/*)                                 |   |
|   |  - /store/status       - /store/delivery-areas   - /menu              |   |
|   |  - /orders (create)    - /orders/:id/track      - /auth/*            |   |
|   +-----------------------------------------------------------------------+   |
|   |  Operations API (/api/v1/ops/*)                                       |   |
|   |  - /orders/confirm     - /kitchen/tickets       - /rider/deliveries   |   |
|   |  - /admin/areas        - /admin/hours           - /admin/menu         |   |
|   +-----------------------------------------------------------------------+   |
|                                    |                                          |
|                                    v                                          |
|   +-----------------------------------------------------------------------+   |
|   |  DOMAIN & SERVICE LAYER                                               |   |
|   |  - Zod Request Validation (every write operation validated)           |   |
|   |  - Order State Machine & Snapshot Immutability Engine                 |   |
|   |  - Store Hours Evaluator (PKT UTC+5, 12:01 PM - 02:00 AM)             |   |
|   |  - RBAC & Session Middleware (Customer, Admin, Kitchen, Rider)        |   |
|   +-----------------------------------------------------------------------+   |
|                                    |                                          |
|                                    v                                          |
|   +-----------------------------------------------------------------------+   |
|   |  DATA ACCESS LAYER (Drizzle ORM)                                      |   |
|   |  - Normalized relational models & snapshot persistence                |   |
|   +-----------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------+
```

---

## 4. Operational Boundaries & Separation of Concerns

1. **Customer Context**:
   - Menu browsing, category filtering, item customizer (variants, modifiers, add-ons).
   - Order type selection (`DELIVERY`, `PICKUP`, `DINE_IN`).
   - Frictionless Guest checkout (Name, Phone, Address/Time) or authenticated account.
   - Real-time order progress tracking using secure order tracking token.
2. **Admin Context**:
   - Order pipeline overview with audio alerts for new orders.
   - Phone verification trigger: marks `New` order as `Confirmed`.
   - Dynamic configuration: delivery areas, per-area fees, opening hours, menu items, prices, active status.
3. **Kitchen (KDS) Context**:
   - High-contrast touch screen for line cooks.
   - Distinctive color-coded badges for `DELIVERY`, `PICKUP`, and `DINE-IN`.
   - Action: "Start Preparing" $\rightarrow$ "Food Ready".
4. **Rider Context**:
   - Mobile card view of orders marked `Ready` for delivery.
   - Click-to-call customer phone snapshot.
   - Actions: "Out for Delivery" $\rightarrow$ "Delivered & Cash Collected" (marks `Completed`).

---

## 5. Order State Machine

| Current State | Valid Next States | Allowed Roles | Trigger / Condition |
|---|---|---|---|
| `New` | `Confirmed`, `Cancelled` | `ADMIN`, `STAFF` (or Customer cancel) | Staff calls customer phone to confirm order details. |
| `Confirmed` | `Preparing`, `Cancelled` | `KITCHEN_STAFF`, `ADMIN` | Kitchen ticket accepted by kitchen crew. |
| `Preparing` | `Ready`, `Cancelled` | `KITCHEN_STAFF`, `ADMIN` | Food items packaged and ready at dispatch. |
| `Ready` | `Out for delivery` (Delivery) | `RIDER`, `ADMIN` | Delivery rider assigned and leaves branch. |
| `Ready` | `Completed` (Pickup/Dine-in) | `STAFF`, `ADMIN` | Customer picks up at counter or served at table. |
| `Out for delivery`| `Completed` | `RIDER`, `ADMIN` | Order delivered to customer and cash collected. |
| `Out for delivery`| `Cancelled` | `ADMIN` | Delivery failure / customer unreachable. |
| `Completed` | *Terminal* | None | Order settled. |
| `Cancelled` | *Terminal* | None | Order aborted with audit reason. |

---

## 6. Business Schedule Logic (Midnight Crossing)

- **Standard Hours**: Every day from `12:01 PM` to `02:00 AM` (PKT).
- **Timezone**: All evaluations use `Asia/Karachi` (UTC+05:00).
- **Midnight Boundary Algorithm**:
  - Let $T_{now}$ be the current time in PKT expressed in minutes from local midnight ($0 \le T_{now} < 1440$).
  - $T_{open} = 12 \times 60 + 1 = 721$ minutes.
  - $T_{close} = 2 \times 60 = 120$ minutes.
  - Since $T_{open} > T_{close}$ (span crosses midnight), the restaurant is open if and only if:
    $$T_{now} \ge 721 \quad \text{OR} \quad T_{now} < 120$$
  - If a daily override or holiday is active in `restaurant_settings`, that overrides the programmatic schedule.

---

## 7. Security, Immutability & API Parity

1. **Immutable Order Snapshots**:
   - Orders preserve `unit_price_snapshot`, `product_name_snapshot`, `customer_name_snapshot`, `customer_phone_snapshot`, and `delivery_address_snapshot` at the exact second of checkout. Future price changes never alter past order records.
2. **Server-Side Validation**:
   - Zero trust in client calculation. Subtotal, delivery fee, and totals are computed strictly server-side from active database records.
3. **Secret Isolation**:
   - Authentication secrets, admin credentials, and database tokens remain strictly in server environment variables.
4. **Mobile API Parity**:
   - All client features are backed by standard JSON REST endpoints (`/api/v1/*`), ensuring an eventual Flutter/React Native/Swift app uses identical contracts.
