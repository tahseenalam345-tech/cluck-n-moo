# Cluck N Moo (CNM) — Prioritized UI Redesign Implementation Plan

**Plan Status**: Ready for Review (No application code modified)  
**Lead Designer & UX Architect**: Senior Product Designer & Mobile UX Lead  
**Scope**: Complete visual and UX overhaul of Cluck N Moo (Customer, Admin, Kitchen, Rider) according to brand direction.

---

## 1. Explicit Architectural Assumptions

1. **Brand Identity & Logo**:
   - The authoritative HD CNM logo asset provided by the business will be positioned as the primary brand asset without alteration or AI regeneration.
2. **Monetary & Payment Rules**:
   - Strictly cash-based transactions for release 1 (Cash on Delivery, Cash at Counter, Cash on Table for dine-in). No online card payment UI will be presented.
3. **No Code Modification Before Approval**:
   - This document defines the exact execution roadmap. No application source code is to be modified until this plan is formally reviewed.
4. **Authentic Business Details**:
   - Only real Kharian branch coordinates `(32.8049229, 73.870393)`, phone `0302-1949067`, Main GT Road address, and the 11 verified delivery villages (*Bidermarjan, Damian, Dillo Village, GT Road Kharian, Guliana, Jadanwala, Jinnah Mart HS Block Kharian Cantt, Kharian Cantt, Lalamusa, Malikpur, Marala*) are used.
5. **UI Status**:
   - The UI is currently **not approved** and will be treated as an in-progress design iteration until all P0 criteria are satisfied.

---

## 2. Prioritized Redesign Roadmap

```
+-------------------------------------------------------------------------------+
|  P0: MUST FIX BEFORE VISUAL APPROVAL                                          |
|  - Implement authoritative brand tokens in globals.css (Black, Orange, Cream) |
|  - Remove staff portal links from public customer header                      |
|  - Overhaul typography: Condensed bold Outfit display + clean Inter body      |
|  - Upgrade Product Cards with food presentation framing and bold price tags   |
|  - Rebuild Cart Drawer into 2-step flow (Tray Review -> Checkout Details)     |
|  - Redesign Segmented Order Type Control (Delivery, Pickup, Dine-In)          |
|  - Build high-contrast KDS ticket styling with colored order type banners     |
|  - Build rider motorcycle-optimized delivery card with giant Call button      |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
|  P1: IMPORTANT FOR USABILITY                                                  |
|  - Add interactive modifier tags & quick cooking instruction pills            |
|  - Add Dine-in arrival time chips (no open text input errors)                 |
|  - Implement skeleton loading states across menu, tracking, and ops screens   |
|  - Implement toast notifications instead of browser alert() dialogs           |
|  - Refine Kharian village delivery selector with landmark assistance          |
|  - Add audio alert chime toggle to Admin order pipeline                       |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
|  P2: POLISH & FUTURE ENHANCEMENTS                                             |
|  - Sizzling burger & fryer micro-animations on order tracking screen          |
|  - Desktop multi-column split view (menu browse 65% + live tray 35%)          |
|  - Progressive Web App install prompt banner for mobile customers             |
|  - Customer order reorder shortcut from local order history                   |
+-------------------------------------------------------------------------------+
```

---

## 3. Phase Breakdown & File Target Mapping

### Phase 1: Foundation & Design Tokens (P0)
- **Target Files**:
  - `src/app/globals.css`:
    - Define all color variables (`--cnm-black`, `--cnm-orange`, `--cnm-cream`, `--cnm-dark-900`, etc.).
    - Define font family rules (`Outfit` condensed bold weights 800/900, `Inter` weights 400/500/700).
    - Establish card styling tokens, hairline borders, and focus rings.
  - `src/app/layout.tsx`:
    - Ensure Google Fonts are loaded with font-display swap for zero CLS (Cumulative Layout Shift).

### Phase 2: Customer Storefront & Navigation (P0)
- **Target Files**:
  - `src/components/Header.tsx`:
    - Remove staff/portal icons (`ShieldCheck`, `ChefHat`, `Bike`) from public header.
    - Mount authoritative HD CNM logo container.
    - Mount live store status pill with green pulsating indicator and hotline link (`0302-1949067`).
    - Mount elevated floating cart indicator.
  - `src/app/page.tsx`:
    - Replace generic hero with fast-casual street-food marquee banner.
    - Implement Segmented Control for Order Type (`Delivery`, `Takeaway`, `Dine-In`) with dynamic fee & ETA micro-copy.
    - Implement sticky category bar with category icons and active pill indicator.
    - Implement responsive product card grid with food framing.
  - `src/components/ProductCard.tsx`:
    - Restructure card hierarchy: Food image container with subtle warm shadow, bold condensed title, ingredient description in muted cream, bold price in flame orange, and tactile `+ Add` button.

### Phase 3: Customizer Modal & 2-Step Cart/Checkout (P0)
- **Target Files**:
  - `src/components/ItemCustomizerModal.tsx`:
    - Redesign variant selector into clear radio tiles.
    - Redesign modifier add-ons into checkbox tiles with upcharges.
    - Add quick-instruction pill toggles ("No Mayo", "Extra Spicy", "Cut in Half").
    - Add sticky bottom bar with quantity stepper and dynamic total calculation.
  - `src/components/CartDrawer.tsx`:
    - Divide into **Step 1 (Tray Review & Upsells)** and **Step 2 (Checkout & Address)**.
    - Add quick 1-tap upsell chips (Fries, Chilled Soft Drink, Garlic Mayo Dip).
    - Provide structured Kharian delivery area picker with landmark guidance.
    - Provide structured Dine-in arrival time chips (e.g. "In 25 mins", "In 45 mins", "Custom").
    - Prominently highlight Cash-only payment policy and phone verification reminder.

### Phase 4: Tracking & Operational Portals (P0)
- **Target Files**:
  - `src/app/order/track/[id]/page.tsx`:
    - Build dynamic State Hero Card that adapts color and messaging to the current status.
    - Upgrade visual fulfillment timeline with clear step icons and timestamps.
    - Embed prominent one-tap "Call Restaurant Hotline" button (`0302-1949067`).
  - `src/app/admin/page.tsx`:
    - Restructure into a 4-stage Kanban operations pipeline (`New - Needs Call`, `Kitchen Cooking`, `Out with Rider`, `Settled`).
    - Add prominent "Call Customer & Confirm" action on `New` tickets.
    - Add Delivery Areas manager with inline fee editing and instant active/inactive switches.
    - Add emergency store schedule override controls.
  - `src/app/kitchen/page.tsx`:
    - Convert into an industrial high-visibility KDS board for line cooks.
    - Massive color-coded order banners (`DELIVERY` Orange, `PICKUP` Green, `DINE-IN` Blue).
    - Large quantity and item typography with color-coded elapsed time clocks.
    - Minimum 60px tap targets for gloved kitchen use.
  - `src/app/rider/page.tsx`:
    - Convert into single-hand mobile dispatch card.
    - Giant one-tap "Call Customer" dialer button.
    - Prominent cash collection indicator box.
    - Thumb-friendly delivery completion buttons.

### Phase 5: Feedback & Usability Enhancements (P1 & P2)
- Skeleton loading screens for all data-fetching components.
- Animated non-blocking toast notifications.
- Empty tray illustrations with "Start Ordering" callouts.
- Responsive desktop split-screen (65% menu / 35% sticky order summary).
