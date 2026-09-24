# Cluck N Moo (CNM) — Phased Implementation Roadmap

## Milestone 1: Foundations & Architecture Baseline (Current Step)
- [x] Workspace inspection and runtime audit (Node 24, npm 11).
- [x] Production architecture documentation (`docs/ARCHITECTURE.md`).
- [x] Normalized database schema definition (`docs/DATABASE_SCHEMA.md`).
- [x] Implementation roadmap & verification strategy (`docs/ROADMAP.md`).
- [x] Separate assumptions and admin-configurable inventory (`docs/ASSUMPTIONS_AND_CONFIG.md`).
- [ ] User review & architecture sign-off.

---

## Milestone 2: Project Scaffolding & Design System
- [ ] Initialize Next.js 15 (App Router, TypeScript) in root directory without bloat.
- [ ] Implement design tokens & Vanilla CSS system:
  - Brand Palette: Pitch Black (`#0C0C0C`), Electric Flame Orange (`#FF8243`), Clean White (`#FFFFFF`), Soft Cream (`#FFF5EE`).
  - Fluid typography: Google Font `Outfit` (condensed bold titles) + `Inter` (clean geometric body).
  - High-contrast badges, cards, floating action bars, and micro-interactions.
- [ ] Setup Drizzle ORM, SQLite database engine, schema tables, and migration runner.
- [ ] Seed initial database:
  - Branch details & coordinates (GT Road, Kharian).
  - Phone `0302-1949067`.
  - Schedule `12:01 PM` to `02:00 AM` every day (midnight-crossing).
  - 11 initial delivery areas (Bidermarjan, Damian, Dillo Village, GT Road Kharian, Guliana, Jadanwala, Jinnah Mart HS Block Kharian Cantt, Kharian Cantt, Lalamusa, Malikpur, Marala).
  - Initial foundational menu items (burgers, chicken, deals, beverages) with variants and modifiers.
  - Default Admin account.

---

## Milestone 3: Domain Engine & REST APIs
- [ ] Timezone & Schedule Engine:
  - Strict PKT (UTC+05:00) calculation.
  - Midnight boundary verification logic.
- [ ] Order State Machine & Snapshot Engine:
  - Strict status transitions (`New` -> `Confirmed` -> `Preparing` -> `Ready` -> `Out for delivery` -> `Completed` / `Cancelled`).
  - Unit-price and customer/address snapshot generator.
- [ ] REST API Endpoints:
  - `GET /api/v1/store/status`
  - `GET /api/v1/store/delivery-areas`
  - `GET /api/v1/menu`
  - `POST /api/v1/orders` (Server validated price computation)
  - `GET /api/v1/orders/:id/track`
  - `/api/v1/auth/*`

---

## Milestone 4: Mobile-First Customer PWA
- [ ] Sticky brand header with store status badge (Live Open/Closed indicator & phone).
- [ ] Category navigation bar with smooth horizontal scroll and active indicator.
- [ ] High-contrast product cards with item customizer modal (variants, add-ons, special notes).
- [ ] Bottom cart drawer with real-time total and order type selector:
  - Delivery (Area dropdown with dynamic delivery fee, street address, landmark).
  - Pickup (Counter pickup indicator, contact info).
  - Dine-in (Preferred time picker, counter or on-table payment option).
- [ ] Guest checkout flow and auth-ready session (Phone / Email / Google login architecture).
- [ ] Live Order Status Tracking screen with visual step progress bar and one-tap call staff.
- [ ] PWA manifest and service worker integration.

---

## Milestone 5: Admin & Operations Portals
- [ ] **Admin Dashboard**:
  - Live order management with filter tabs (`New`, `Active`, `Completed`, `Cancelled`).
  - Phone confirmation button for staff (advances `New` -> `Confirmed`).
  - Delivery areas management (add new area, toggle active, customize fee).
  - Restaurant hours management & emergency manual override (`Force Open`, `Force Closed`, `Auto`).
  - Menu & price management (categories, products, variants, modifiers, in-stock toggle).
- [ ] **Kitchen Display System (KDS)**:
  - Touch-friendly ticket board.
  - Giant high-contrast order type indicator (`DELIVERY`, `PICKUP`, `DINE-IN`).
  - Progress buttons (`Preparing`, `Ready`).
- [ ] **Rider Dashboard**:
  - Assigned delivery orders.
  - Customer contact snapshot, address, and click-to-call.
  - Mark `Out for delivery` and `Delivered & Cash Collected`.

---

## Milestone 6: Quality Assurance & Verification
- [ ] Automated tests for timezone midnight logic and order transitions.
- [ ] Cross-device viewport verification (375px mobile to desktop).
- [ ] End-to-end simulated ordering run-through (Customer order -> Admin confirm -> Kitchen prepare -> Rider deliver).
- [ ] Production build validation (`npm run build`).
