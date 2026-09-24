# Cluck N Moo (CNM) — Full UI/UX Implementation Plan

**Objective:** Systematically redesign every customer-facing and staff-facing screen into a polished, responsive, and accessible Cluck N Moo restaurant experience with default Light Mode and persistent manual theme toggling.  
**Strict Rule:** No changes to Supabase schema, auth behavior, API response contracts, order state machine, Cloudinary mapping, or order calculation engine.

---

## Phase Breakdown & Execution Sequence

### Phase 1: Global Theme Foundation & Base Component Tokens
**Goal:** Establish default Light Mode, fix `:root` token inversion, define missing CSS variables, and polish global atomic components.

**Files Impacted:**
- `src/app/globals.css`:
  - Set `:root` to Light Mode default (warm near-white `#FAF6F0`, pure white card `#FFFFFF`, warm border `#E8DDD2`, high-contrast text `#181513`, secondary text `#3D352F`, muted `#5C544E`).
  - Add dark mode `[data-theme="dark"]` tokens.
  - Define previously missing variables (`--cnm-dark-900`, `--cnm-dark-800`, `--cnm-dark-700`, `--cnm-gray-400`, `--cnm-gray-500`, `--cnm-surface-hover`).
  - Add standard classes for buttons, cards, forms, badges, modals, bottom sheets, skeleton shimmer, and focus rings.
- `src/app/layout.tsx`:
  - Verify `<html lang="en" data-theme="light">` and themeColor viewport configuration.
- `src/context/ThemeContext.tsx`:
  - Guarantee immediate light mode default with zero flash of dark mode, persistent `localStorage` synchronization.
- `src/components/BrandLogo.tsx`:
  - Optimize logo container so the real CNM logo displays cleanly on both light and dark headers without harsh dark block borders.

**Verification Checklist (Phase 1):**
- [ ] Run `npm run build` cleanly.
- [ ] Check contrast of body text, muted text, and borders in both light and dark modes.
- [ ] Confirm no undefined CSS variables remain in base stylesheet.

---

### Phase 2: Customer Header, Navigation, Homepage & Catalog
**Goal:** Transform the storefront entry points, search, category navigation, and product presentation.

**Files Impacted:**
- `src/components/CustomerHeader.tsx`:
  - Clean top info stripe (live store status, phone number).
  - Prominent brand logo and tagline.
  - High-visibility order mode selector chip.
  - High-contrast persistent theme toggle (Sun/Moon icon).
  - Responsive mobile drawer menu.
- `src/components/SignatureNavigationStrip.tsx`:
  - High-contrast signature category pills with active indicator and smooth horizontal scrolling.
- `src/components/PromoCarousel.tsx`:
  - Refactor promotion card backgrounds so they harmonize with light mode while preserving punchy fast-food imagery.
- `src/components/MenuSearchBar.tsx`:
  - Prominent focus states, high-contrast placeholder, search icon, clear button.
- `src/components/ProductCard.tsx`:
  - Card background `var(--cnm-surface)` (pure white in light mode), border `var(--cnm-border)`.
  - High-contrast typography for title, description, and price.
  - Clear "+ Add" / "Options" button with 44px touch targets.
- `src/components/ProductImage.tsx`:
  - Branded fallback container for any missing image (warm orange tint, CNM icon).
- `src/components/PopularPicksSection.tsx`:
  - Section title, responsive grid, card styling.
- `src/components/BrandStorySection.tsx`:
  - 3-column story grid using theme surface tokens instead of dark gradients.
- `src/app/page.tsx`:
  - Sticky header alignment, 2-column mobile product grid with 1-column narrow fallback, 3-column tablet, 4-column desktop.
- `src/app/menu/page.tsx`:
  - Section headers, category badges, search integration.
- `src/components/CustomerFooter.tsx`:
  - Warm surface footer with clear column hierarchy and no staff leaks.

**Verification Checklist (Phase 2):**
- [ ] Run `npm run build`.
- [ ] Test mobile (360px, 390px), tablet (768px), desktop (1280px), large desktop (1920px).
- [ ] Test category filtering and product search.

---

### Phase 3: Product Customization, Deals, Cart, Checkout & Customer Accounts
**Goal:** Deliver an intuitive, high-conversion ordering workflow and order tracking.

**Files Impacted:**
- `src/components/ItemCustomizerModal.tsx`:
  - Bottom sheet on mobile (<640px), centered dialog on desktop.
  - High-contrast variant selection radio buttons and modifier checkboxes.
  - Sticky bottom action bar with total PKR calculation and "+ Add to Cart".
- `src/app/deals/page.tsx`:
  - Remove hardcoded dark gradient from "Build Your Own Deal" banner.
  - High-contrast deal cards with value badges.
- `src/components/BuildYourOwnDealModal.tsx`:
  - Responsive deal builder modal with item list, live discount progress bar (5% at 2,500 PKR, 10% at 3,500 PKR), and sticky drawer tray.
- `src/components/CartDrawer.tsx`:
  - Right slide-over drawer (desktop) / bottom sheet (mobile).
  - Clear item lines with modifier summaries and quantity incrementers.
  - 2-step checkout flow (Cart review -> Address & details) with explicit validation messages.
  - Sticky mobile cart CTA bar when cart contains items.
- `src/app/order/track/page.tsx` & `src/app/order/track/[id]/page.tsx`:
  - Visual step-by-step progress timeline with accessible status badges.
  - Clear order summary breakdown (items, deal discounts, delivery fee, COD total).
  - High-contrast "Order Again" button that populates cart seamlessly.
- `src/app/account/page.tsx`:
  - Sign-in / sign-up tabbed form with clear labels and input focus rings.
  - Saved delivery address manager with clean card list.
  - Customer order history with live status badges and track links.
- `src/app/contact/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`:
  - Polished cards, clickable phone/hotline links, structured policy text.

**Verification Checklist (Phase 3):**
- [ ] Run `npm run build`.
- [ ] Run `node --import tsx scripts/test-custom-deal.ts` (verify deal math preserved).
- [ ] Verify cart calculation and checkout flow validation.

---

### Phase 4: Staff Operations Screens (Admin, Kitchen KDS, Rider & Login)
**Goal:** Redesign staff screens for maximum efficiency, readability, and speed without generic dashboard clichés.

**Files Impacted:**
- `src/app/staff/login/page.tsx`:
  - Clean branded staff login card with role redirection guidance and visible error alerts.
- `src/app/admin/page.tsx`:
  - Replace broken variables with proper theme tokens.
  - High-density order pipeline tabs with live counters.
  - Delivery area manager with inline fee editor and active toggles.
  - Store hours and operational settings manager.
- `src/app/kitchen/page.tsx`:
  - Kitchen Display System with high-visibility typography readable from 2 meters.
  - Elapsed time indicator with visual alerts for delayed orders.
  - Large touch targets for advancing order status (`CONFIRMED` -> `PREPARING` -> `READY`).
- `src/app/rider/page.tsx`:
  - Mobile-first dispatch layout with bold customer phone call CTA (`tel:`).
  - High-visibility delivery address and landmark instructions.
  - Clear COD payment collection display and one-tap "Out for Delivery" / "Delivered" actions.

**Verification Checklist (Phase 4):**
- [ ] Run `npm run build`.
- [ ] Run `node --import tsx scripts/test-state-machine.ts` (verify RBAC & status transitions).
- [ ] Test staff views on desktop, tablet, and mobile.

---

### Phase 5: Loading/Empty States, Comprehensive Responsive QA & Completion Report
**Goal:** Polish all loading skeletons, empty states, error alerts, and perform cross-device QA.

**Tasks:**
- Verify all loading skeleton states use smooth shimmer animation with proper theme colors.
- Verify all empty search / empty cart / zero order states have friendly branded copy and action buttons.
- Conduct automated test runs and production build validation.
- Generate final completion artifact: `docs/FULL_UI_UX_REDESIGN_COMPLETION_REPORT.md`.

**Deliverable Checklist:**
- [ ] `npm run build` exits 0 with zero lint or typescript errors.
- [ ] All unit/logic test scripts pass 100%.
- [ ] Detailed walkthrough and completion report generated.
