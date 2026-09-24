# Cluck N Moo (CNM) — Build Your Own Deal & Local Order History Tracking Implementation Plan

> **Document Status**: APPROVED SPECIFICATION & IMPLEMENTATION BLUEPRINT  
> **Target Release**: Customer Storefront Enhancements  
> **Authoritative Constraints**:  
> - Strictly customer-facing features.  
> - Zero breaking changes to admin, kitchen KDS, rider portal, menu imports, or Cloudinary mappings.  
> - 100% server-side validated pricing and tamper-proof discount calculations.  
> - Local order history restricted strictly to device-placed orders (privacy safe).

---

## 1. Feature 1: Build Your Own Deal Architecture

### 1.1 Business & Discount Rules
- **Eligibility**: Any combination of active, available real CNM menu items (burgers, pizzas, wings, appetizers, fries, wraps, sandwiches, desserts, drinks).
- **Discount Thresholds**:
  - `0 – 2,499 PKR` Custom Deal Food Subtotal: **0% discount**
  - `2,500 – 3,499 PKR` Custom Deal Food Subtotal: **5% discount**
  - `3,500+ PKR` Custom Deal Food Subtotal: **10% discount**
- **Non-Stacking**: Applies only the single highest eligible tier. Discounts never stack or compound.
- **Scope**: Discount applies *strictly* to the custom deal food items subtotal. Delivery fees are **never** discounted.
- **Non-Combine**: Cannot be combined with other coupons or promotional deal codes.
- **Server Validation**: The server recalculates each item price, variant price, and modifier price directly from SQLite, calculates the deal food subtotal, validates the eligible discount tier, and computes `totalPkr = subtotalPkr - discountPkr + deliveryFeePkr`.

### 1.2 Data Flow & Snapshots
```
[Deals Page: "Build Your Own Deal" CTA]
                  │
                  ▼
[BuildYourOwnDealModal] ─── (Selects Products & Customizes via ItemCustomizerModal)
                  │
                  ▼
[Custom Deal Tray] (Live threshold progress, 5%/10% calculation, PKR saved)
                  │
                  ▼ (User clicks "Add Custom Deal to Cart")
[CartDrawer] (Items tagged with customDealId; separate "Custom Deal Discount" line item)
                  │
                  ▼ (User submits checkout)
[POST /api/v1/orders] (Server computes DB prices, verifies threshold, inserts discount snapshot)
                  │
                  ▼
[SQLite: orders & order_items] (Stores discount_pkr, discount_rate, discount_type, custom_deal_id)
                  │
                  ▼
[Tracking & Confirmation] (Displays custom deal discount breakdown)
```

---

## 2. Feature 2: Local Order History & Redesigned Track Order

### 2.1 Privacy-First Device Storage
- **Storage Mechanism**: Browser `localStorage` key `cnm_order_history_v1`.
- **Scope**: Contains **only** orders placed from the customer's current browser/device.
- **Zero Cross-Customer Leaks**: Customer never sees another customer's orders.
- **Data Minimization**: Stores only non-sensitive order metadata:
  - `id`: Unique order ID (`ord_...`)
  - `orderNumber`: Human-readable number (`CNM-2609-XXXX`)
  - `trackingToken`: Secure tracking token (`trk_...`)
  - `createdAt`: ISO timestamp
  - `orderType`: `DELIVERY` | `PICKUP` | `DINE_IN`
  - `status`: Latest known status (`New`, `Confirmed`, `Preparing`, `Ready`, `Out for delivery`, `Completed`, `Cancelled`)
  - `totalPkr`: Final paid/payable PKR
  - `subtotalPkr`: Food subtotal
  - `discountPkr`: Discount applied (if any)
  - `itemSummary`: Concise text preview (e.g. "2x Oklahoma Smash, 1x Curly Fries")
  - `itemsSnapshot`: Re-order payload containing `productId`, `variantId`, `quantity`, `modifierIds`, `specialInstructions`.
- **Storage Limit**: Capped at the latest 10 orders, automatically de-duplicated.

### 2.2 Redesigned Track Order Page (`/order/track`)
1. **Brand Hero**: CNM logo, restaurant title "Cluck N Moo", tagline "juiciest in town".
2. **Kharian Branch Contact Card**:
   - Location: Main GT Road, near Total Petrol Station / Raza CNG, Kharian, Pakistan
   - Phone: `0302-1949067` with `<a href="tel:03021949067">` one-tap call button
   - Live Operating Status: 12:01 PM – 02:00 AM (PKT midnight schedule)
3. **Your Recent Orders List**:
   - Displays orders newest first.
   - Shows Order Number, date/time formatted, order type badge, status badge, total amount, and items summary.
   - Clicking an order expands or views the live tracking details.
   - Fallback when empty: Friendly prompt + manual token lookup + "Explore Menú & Order Now" CTA.
4. **Order Again Workflow**:
   - Only enabled for `Completed` orders.
   - When clicked:
     - Fetches active catalog to verify product & variant availability.
     - Automatically uses **current database prices** (protects store against historical price drift).
     - Skips discontinued products and alerts customer with a non-intrusive toast/banner.
     - Adds items to cart and opens CartDrawer for review.
     - **Never automatically places an order.**

---

## 3. Database Schema Migration Plan

To record discount snapshots immutably, we will execute a non-destructive migration on `data/cnm.db`:

```sql
-- Migration: Add discount and custom deal tracking to orders table
ALTER TABLE orders ADD COLUMN discount_pkr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN discount_rate REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN discount_type TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN custom_deal_subtotal_pkr INTEGER NOT NULL DEFAULT 0;

-- Migration: Add custom deal grouping to order items
ALTER TABLE order_items ADD COLUMN custom_deal_id TEXT DEFAULT NULL;
```

---

## 4. Files to Change / Create

| File Path | Action | Description |
| :--- | :---: | :--- |
| `src/lib/customDeal.ts` | **NEW** | Pure utility: discount tiers calculation, threshold progress, validation helpers. |
| `src/lib/orderHistory.ts` | **NEW** | LocalStorage order history manager (save, retrieve, update status, limit 10). |
| `src/components/BuildYourOwnDealModal.tsx` | **NEW** | Responsive modal: category filter chips, search, product selection, live discount meter, custom deal tray. |
| `src/db/migrations/002_add_custom_deal_discount.ts` | **NEW** | SQLite schema migration script adding discount columns. |
| `src/types/index.ts` | **MODIFY** | Add `customDealId`, `discountPkr`, `discountRate`, `discountType` to types. |
| `src/lib/validation.ts` | **MODIFY** | Update `orderItemInputSchema` to accept `customDealId?: string`. |
| `src/app/api/v1/orders/route.ts` | **MODIFY** | Server-side discount calculation, DB price verification, transaction insertion with discount columns. |
| `src/app/api/v1/orders/[id]/track/route.ts` | **MODIFY** | Include discount fields in tracking API response. |
| `src/app/deals/page.tsx` | **MODIFY** | Add prominent "Build Your Own Deal" banner card and modal trigger. |
| `src/components/CartDrawer.tsx` | **MODIFY** | Display Custom Deal badge, show discount line item in review & details, save order to local history on success. |
| `src/app/order/track/page.tsx` | **MODIFY** | Complete redesign: branch contact card, recent local orders list, live timeline, "Order Again" button, empty state. |
| `src/app/order/track/[id]/page.tsx` | **MODIFY** | Display discount line item in price summary. |

---

## 5. Security & Tamper-Proofing Strategy
1. **Zero Client Trust**: Discount amount is never accepted from client payloads. The server computes subtotal of custom-deal items exclusively using prices from the SQLite database.
2. **Delivery Fee Protection**: Delivery fee is queried from `delivery_areas` table and added *after* the discount is subtracted from food subtotal.
3. **Price Manipulation Defense**: If a malicious client passes manipulated prices or negative numbers, the server schema validation and DB price lookup completely ignores client prices.
4. **Order History Privacy**: Orders stored in `localStorage` contain only public tracking tokens and order numbers. Full customer PII (such as exact street address or phone number) is not stored unnecessarily in the local array.

---

## 6. Responsive Behavior Specification
- **Mobile (< 768px)**:
  - "Build Your Own Deal" opens as a full-height smooth bottom-sheet overlay with fixed top progress bar and sticky bottom action tray.
  - Track Order presents order cards in single-column touch-friendly cards with 44px+ tap targets.
- **Tablet (768px – 1024px)**:
  - Centered modal with two-column layout (product picker on left, custom deal tray on right).
- **Desktop (1024px+)**:
  - Wide modal dialog with glassmorphism header, smooth scrollable catalog grid, sticky floating deal summary tray.

---

## 7. Execution Phases

- **Phase 1**: Database migration & domain logic (`src/lib/customDeal.ts`, migration `002`).
- **Phase 2**: Server-side order API discount calculation & validation (`src/app/api/v1/orders/route.ts`).
- **Phase 3**: "Build Your Own Deal" modal UI component & Deals page integration.
- **Phase 4**: Cart Drawer discount line item, badge, and order placement local history saving.
- **Phase 5**: Local order history manager (`src/lib/orderHistory.ts`) & redesigned Track Order page.
- **Phase 6**: "Order Again" logic with real-time price & availability checks.
- **Phase 7**: Build, automated tests, threshold math verification (0%, 5%, 10%), and final report.
