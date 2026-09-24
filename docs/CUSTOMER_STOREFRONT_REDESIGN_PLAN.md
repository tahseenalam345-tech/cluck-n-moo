# Cluck N Moo (CNM) — Customer Storefront & Responsive UX Redesign Plan

**Document Version**: 1.0  
**Lead UX Architect & Senior Product Designer**: Visual Design & Frontend Architecture  
**Brand**: Cluck N Moo (CNM) — *juiciest in town* (Kharian, Pakistan)  
**Status**: Architectural Planning Document (Awaiting Approval)

---

## 1. Executive Overview

This plan outlines the complete redesign of the public-facing Cluck N Moo customer storefront, responsive layouts, first-visit decision modal, theme engine (dark/light), promotional carousel, and supporting customer pages (`/menu`, `/deals`, `/contact`, `/privacy`, `/terms`, `/account`, `/login`).

All existing database models, SQLite WAL configuration, integer PKR accounting, Zod validation, order status machine (`New` ➔ `Confirmed` ➔ `Preparing` ➔ `Ready` ➔ `Out for delivery` ➔ `Completed`), restaurant hours logic (12:01 PM – 02:00 AM PKT crossing midnight), and cash settlement workflows are **100% preserved**.

Internal staff routes (`/admin`, `/kitchen`, `/rider`) are decoupled completely from all public customer headers, drawers, and footers, and are protected behind a dedicated staff credential gate.

---

## 2. Current Implementation Analysis & Component Reusability

| Current File / Component | Status | Reuse & Evolution Strategy |
|---|---|---|
| `src/components/BrandLogo.tsx` | **Reused** | High-res authoritative logo (`/logo.png` & `/logo.jpg`). Enhance with theme-aware text colors (`#FFFFFF` in dark, `#171717` in light). |
| `src/components/Header.tsx` | **Evolved** | Redesign with desktop navigation bar (`Menu`, `Deals`, `Track Order`, `Contact`, Location chip, Cart, Account, Theme Toggle) and mobile app-like topbar with hamburger sheet. |
| `src/components/ProductCard.tsx` | **Evolved** | Support 2-column mobile and 4-column desktop grid. Replace emoji placeholders with high-end SVG brand food silhouetting / badge typography for missing-image states. Add sold-out overlay. |
| `src/components/ItemCustomizerModal.tsx` | **Evolved** | Responsive modal for desktop ($w=520\text{px}$ centered) and bottom sheet for mobile. Radio tiles for required choices vs. checkbox tiles for add-ons. Sticky running subtotal. |
| `src/components/CartDrawer.tsx` | **Evolved** | Slide-out right panel for desktop ($w=420\text{px}$) and bottom sheet for mobile. Retain 2-step checkout (Review ➔ Guest Details with Cash Settlement). Sync with active order-mode state. |
| `src/app/page.tsx` | **Evolved** | Split into modular components: dismissible app banner, promotional carousel, database-driven category scrollspy, 2-to-4 column product grid, customer footer. |
| `src/app/order/track/[id]/page.tsx` | **Preserved & Polished** | Live order tracking with status timeline, polite notification opt-in prompt, click-to-call hotline, and itemized receipt snapshot. |
| `src/app/globals.css` | **Evolved** | Add full Light Theme tokens (`[data-theme="light"]`) alongside Dark Theme tokens. Add responsive breakpoints, grid utilities, and elevation shadows. |
| Staff Portals (`/admin`, `/kitchen`, `/rider`) | **Protected** | Keep operational features intact; remove links from customer pages; add a discreet PIN/credential barrier. |

---

## 3. Core Architectural Mechanisms

### 3.1 First-Visit Order-Mode & Location Flow
1. **Trigger Condition**:
   - On page load, `OrderModeContext` checks `localStorage.getItem("cnm_order_mode")`.
   - If empty, opens `OrderModeModal` centered on desktop / bottom sheet on mobile.
2. **Options Presented**:
   - **Delivery**:
     - Asks for location permission *only after* tapping Delivery.
     - Option A: "Use My Current Location" (HTML5 Geolocation API with graceful fallback if denied or on insecure context).
     - Option B: Delivery Area Selector (loads 11 Kharian areas from `/api/v1/store/delivery-areas`).
     - Manual Address Fields: House / Street, Nearby Landmark, Phone number.
   - **Pickup / Takeaway**:
     - Displays Kharian Branch details: Main GT Road, near Total Petrol Station / Raza CNG, Kharian (`0302-1949067`).
     - Informs customer: "Ready in ~20 minutes. No delivery fee."
   - **Dine-In**:
     - Asks for arrival time (presets: `In 20 mins`, `In 35 mins`, `In 50 mins`, `Custom Time`).
     - Choice of `Pay at Counter` or `Pay on Table`.
     - *Zero table reservation or table booking wording used.*
3. **Persistence & Header Chip**:
   - Once selected, persists `{ orderType, areaId, areaName, address, arrivalTime, paymentLocation }` in `localStorage`.
   - Returning visitors do not see the modal.
   - The header displays a compact editable pill: `🛵 Delivery: GT Road Kharian` or `🥡 Takeaway: Main Branch` or `🍽️ Dine-in: In 30m`. Clicking this chip re-opens the mode switcher anytime.

### 3.2 Notification Opt-In Strategy (Non-Intrusive)
- **Zero intrusive prompts on first load**: Never prompt `Notification.requestPermission()` on homepage entry.
- **Contextual In-App Card**: Displayed on the Order Tracking page (`/order/track/[id]`) after order placement.
- **Copy**: *"Would you like live status notifications as your burger is prepared and dispatched?"*
- **Actions**: `Enable Alerts` (triggers browser prompt) vs. `Not Now` (dismisses without penalty).
- If denied or dismissed, order tracking continues via real-time 8s polling.

### 3.3 Theme System (Dark & Light Mode)
- **Theme Variables**:
  - **Dark Mode (Default)**:
    - Background: `#0C0C0C`
    - Surface: `#171717`
    - Elevated Surface: `#222222`
    - Borders: `#2E2E2E`
    - Primary Text: `#FFFFFF`
    - Muted Text: `#A1A1A6`
    - Action Accent: `#FF8243` (Flame Orange)
  - **Light Mode**:
    - Background: `#FFF9F5` (Warm Creamy White)
    - Surface: `#FFFFFF`
    - Elevated Surface: `#F5ECE4`
    - Borders: `#EADCCE`
    - Primary Text: `#171717`
    - Muted Text: `#6B6560`
    - Action Accent: `#E85D1A` / `#FF8243`
- **Hydration Prevention**: Inline script in `head` or safe client-mount effect setting `document.documentElement.setAttribute('data-theme', theme)`.
- **Toggle Control**: Accessible via desktop topbar and mobile hamburger drawer.

### 3.4 Promotions Carousel
- **Component**: `PromoCarousel.tsx`
- **Configuration-Driven**: `src/lib/promotions.ts` (ready for future Cloudinary / admin uploads).
- **Responsive Behavior**:
  - Mobile: Touch swipe enabled (`overflow-x: auto` with scroll-snap or drag handler).
  - Tablet/Desktop: Multi-card visible track with next/prev chevrons.
  - Auto-play: 5-second interval, pauses immediately on hover, touch, or keyboard focus.
  - Indicators: Accessible pagination dots with live slide announcement (`aria-live="polite"`).

### 3.5 Responsive Product Grid
- **Breakpoints**:
  - Mobile Small ($\le 380\text{px}$): 1 column.
  - Mobile Standard ($381\text{px} - 640\text{px}$): 2 columns.
  - Tablet ($641\text{px} - 1024\text{px}$): 3 columns.
  - Desktop ($1025\text{px} - 1440\text{px}$): 4 columns.
  - Max Width: $1280\text{px}$ centered container.
- **Image Fallback Treatment**:
  - If `imageUrl` is null, renders an industrial high-contrast card header with stylized geometric badge, brand flame icon, and category name (no raw text emoji as final styling).
- **Sold-out treatment**: Muted overlay + `SOLD OUT` badge, disabled action button.

---

## 4. Routes and Supporting Pages to Deliver

1. `/` — Storefront homepage (App banner, Header, Hero, Promotions, Categories, Product Grid, Footer).
2. `/menu` — Dedicated full-menu browsing page with category quick-jumps and search filter.
3. `/deals` — Dedicated exclusive deals and value feast bundles.
4. `/order/track/[id]` — Order fulfillment tracking with in-app notification prompt and hotline button.
5. `/contact` — Restaurant location, Google Maps link, phone hotlines, and midnight operating schedule.
6. `/login` — Customer login / register modal & page architecture (Phone OTP, Email, Google stub).
7. `/account` — Customer account hub: Order history, saved Kharian delivery addresses, favorites.
8. `/privacy` — Official privacy policy covering customer contact data and location privacy.
9. `/terms` — Terms of service, cash-on-delivery settlement policy, and order cancellation rules.

---

## 5. Files to Be Created or Modified

### 5.1 New Components & Libraries
- `src/context/ThemeContext.tsx` — Light/Dark theme provider with localStorage sync.
- `src/context/OrderModeContext.tsx` — Order type & delivery location state manager.
- `src/components/AppDownloadBanner.tsx` — Dismissible top banner with Google Play placeholder.
- `src/components/OrderModeModal.tsx` — First-visit modal & location picker.
- `src/components/PromoCarousel.tsx` — Responsive auto-advancing carousel.
- `src/components/CustomerHeader.tsx` — Unified responsive desktop/mobile navigation.
- `src/components/CustomerFooter.tsx` — Clean customer footer (zero staff links).
- `src/components/NotificationOptInPrompt.tsx` — Polite post-checkout notification prompt.
- `src/lib/promotions.ts` — Active promotion banners configuration.

### 5.2 Modified Components & Pages
- `src/app/globals.css` — Light/dark design tokens, responsive grid system, cards, modals.
- `src/app/layout.tsx` — Wraps with `ThemeProvider` and `OrderModeProvider`.
- `src/app/page.tsx` — Replaced with clean modular storefront.
- `src/components/ProductCard.tsx` — Styled for 2-to-4 column responsive grid with solid fallback imagery.
- `src/components/CartDrawer.tsx` — Responsive drawer (side sheet on desktop, bottom sheet on mobile).
- `src/components/ItemCustomizerModal.tsx` — Responsive centered modal on desktop, bottom sheet on mobile.
- `src/app/order/track/[id]/page.tsx` — Adds polite notification prompt card.

### 5.3 New Customer Supporting Pages
- `src/app/menu/page.tsx`
- `src/app/deals/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/login/page.tsx`
- `src/app/account/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`

---

## 6. Implementation Phases

- **Phase 1**: Customer Design Tokens, Theme Engine (Dark/Light), App Banner & Responsive Header.
- **Phase 2**: First-Visit Order-Mode & Location Flow (`OrderModeModal`, localStorage, header chip).
- **Phase 3**: Promotions Carousel & Database-Driven Category Navigation.
- **Phase 4**: Responsive Product Grid & Enhanced Product Cards (2 to 4 columns).
- **Phase 5**: Responsive Cart, Customizer Modal, Checkout & Supporting Pages (`/menu`, `/deals`, `/contact`, `/privacy`, `/terms`, `/account`).
- **Phase 6**: Notification Opt-In, Accessibility, Contrast Validation, and E2E Test Suite Run.

---

## 7. Assumptions & Constraints

1. **Brand Asset**: The authoritative uploaded logo in `public/logo.jpg` / `public/logo.png` is preserved and used exclusively.
2. **Cash Settlement Only**: No payment gateway or credit card fields will be introduced; transactions remain Cash on Delivery / Counter / Table.
3. **No External Fake Images**: Missing product images render elegant stylized brand cards rather than broken remote URLs.
4. **Google Play Store**: App banner features a styled Google Play button as a non-breaking visual placeholder without inventing fake URLs.
5. **Operational Parity**: Zero changes to SQLite database tables, order calculations, or admin/kitchen/rider business logic.
