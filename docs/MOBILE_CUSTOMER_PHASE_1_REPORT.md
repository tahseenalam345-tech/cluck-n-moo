# CNM Mobile Customer UX Fix Report (Phase 1)

**Date:** September 26, 2026  
**System:** Cluck N Moo (CNM) Customer Storefront  
**Target Viewports Tested:** 320px (iPhone SE/compact), 375px (standard mobile), 390px (modern iOS), 430px (Pro Max/large mobile)  

---

## 1. Executive Summary

This report documents the mobile user experience (UX) enhancements implemented for Cluck N Moo customer-facing surfaces. The updates address theme navigation height, context-specific order mode selection, menu page vertical spacing, track order layout and duplicate sign-in UI, and live order tracking header alignment.

All product and item card components remain strictly intact, with zero changes to card design or existing backend data models.

---

## 2. Changes Implemented by Area

### Area 1: Menu Theme & Category Navigation
- **Homepage Layout Separation:**
  - When **"menú" (Main Menu)** is selected:
    - Displays Popular Picks, Deals You'll Love, All Categories pills (`ALL ITEMS`, category tabs), and dynamic catalog items.
  - When **any other theme/menu** is selected (e.g., `bon-a-petit`, `pizza-menu`, `muuu`, `cloc-cloc`, `historia`):
    - Hides homepage-only sections: Popular Picks, Deals You'll Love, and the All Categories pills bar.
    - Renders **only** the selected theme's categories and products without mixing in standard Main Menu items.
    - Adds a clear, compact **`← Back to Main Menu`** action pill button.
- **Smooth Scroll Behavior:**
  - When a customer is scrolled down on the page and taps a signature theme (or returns to Main Menu), the viewport smoothly scrolls to the top of `#dynamic-menu-catalog` with an offset accommodating the sticky header and navigation strip.
  - Respects accessibility preference via `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- **Vertical Navigation Height Reduction:**
  - Reduced mobile height of `SignatureNavigationStrip` by **~30%**:
    - Circular button dimensions reduced from `54px` to `44px` (preserving minimum touch-target accessibility).
    - Inner item gap reduced to `2px`.
    - Labels styled with `10.5px` typography and `1.15` line-height.
    - Navigation wrapper padding reduced to `2px 0 3px`.
    - Horizontal swipe track padding optimized to `1px 12px 2px` with zero horizontal clipping.

### Area 2: Delivery / Pickup / Dine-In Selector
- **Compact Centered Modal:**
  - Converted `OrderModeModal` from an oversized bottom sheet/full-page card into a centered, compact modal (`maxWidth: 410px`, `maxHeight: 84vh`) with soft blurred backdrop (`backdrop-filter: blur(6px)`).
- **Instant Mode Selection & Transition:**
  - **Pickup / Takeaway:** Clicking immediately updates `orderType: "PICKUP"` with `deliveryFeePkr: 0` and closes the modal cleanly.
  - **Delivery:** Transitions smoothly to a compact "Delivery Location" form featuring:
    - CNM-themed delivery area dropdown with village names, fees (100 PKR), and estimated delivery times (~40-50m).
    - Optional House/Street and Landmark fields.
    - Prominent "Confirm Delivery" CTA.
  - **Dine-In:** Transitions smoothly to arrival time chips ("In 20 mins", "In 30 mins", "In 45 mins", "Custom") and counter/table payment preference.
- **Mobile Sidebar Controls:**
  - In `CustomerHeader.tsx`, clicking `PICKUP` or `DINE_IN` in the sidebar immediately sets the mode without opening a modal.
  - Clicking `DELIVERY` switches immediately if an area is already chosen, or prompts for destination village if unconfigured.
  - Added a "Change details" text link for modifying specific addresses or timings.

### Area 3: Menu Page Spacing
- In `src/app/menu/page.tsx`:
  - Reduced main container top padding from `32px` to `16px` on mobile.
  - Tightened hero section margin from `28px` to `16px`.
  - Adjusted page title with fluid responsive scaling: `clamp(22px, 5.5vw, 30px)`.
  - Moved search input and category sections upward into immediate mobile view.

### Area 4: Track Order Page
- **Customer Sign-In:**
  - Removed redundant blue banner at the bottom that previously duplicated the sign-in option.
  - Retained one single, prominent "Sign In" button in the top header beside the sync icon.
- **Sync Control:**
  - Removed visible text `"Sync"` / `"Syncing..."`.
  - Converted to a compact `32x32px` icon button with spinning indicator during reload.
  - Added accessible `aria-label="Refresh and sync recent orders"` and `title="Refresh and sync recent orders"`.
- **Track by Order Form:**
  - Added responsive CSS classes `.track-lookup-form`, `.track-lookup-input`, and `.btn-track-lookup-submit`.
  - On viewports $\le 440\text{px}$ (e.g., 320px, 375px, 390px, 430px), inputs and "Track Live" buttons adapt vertically to 100% width with touch-friendly 38px height.
  - Eliminates all horizontal card overflow.
- **Recent Orders Placement:**
  - Main container padding reduced from `24px` to `12px` on mobile.
  - Recent orders start higher on the page for instant visibility.

### Area 5: Live Tracking Screen (`/order/track/[id]`)
- **Header Structure:**
  - Removed `"Menu"` text and the left-side back arrow.
  - Positioned the CNM `BrandLogo` on the **right side** of the header.
  - Placed the pulsing `LIVE` badge, theme toggle (Sun/Moon), and refresh button on the **left side**.
- **Compact Layout:**
  - Reduced header padding from `10px 16px` to `8px 14px`.
  - Tightened main container padding to `10px 12px 32px`.
  - Ensured seamless responsiveness and light/dark theme support.
  - Preserved order data connection, tracking tokens, and realtime status polling.

---

## 3. Files Modified

| File | Changes |
|---|---|
| [`src/components/SignatureNavigationStrip.tsx`](file:///e:/Projects/Cluck%20n%20moo/src/components/SignatureNavigationStrip.tsx) | Reduced mobile button size to 44px, gap to 2px, and padding for ~30% height reduction. |
| [`src/app/page.tsx`](file:///e:/Projects/Cluck%20n%20moo/src/app/page.tsx) | Isolated non-main themes (hidden popular picks, deals, category tabs), added "Back to Main Menu" button, added smooth scroll to top of menu content. |
| [`src/components/OrderModeModal.tsx`](file:///e:/Projects/Cluck%20n%20moo/src/components/OrderModeModal.tsx) | Redesigned into compact centered card with instant takeaway, themed delivery dropdown, and dine-in timing selector. |
| [`src/components/CustomerHeader.tsx`](file:///e:/Projects/Cluck%20n%20moo/src/components/CustomerHeader.tsx) | Wired `setOrderTypeOnly` to sidebar buttons; added "Change details" link. |
| [`src/app/menu/page.tsx`](file:///e:/Projects/Cluck%20n%20moo/src/app/menu/page.tsx) | Reduced vertical whitespace and tightened hero header typography for mobile. |
| [`src/app/order/track/page.tsx`](file:///e:/Projects/Cluck%20n%20moo/src/app/order/track/page.tsx) | Removed duplicate sign-in banner; replaced "Sync" text with compact icon button; made lookup form fully responsive; moved orders upward. |
| [`src/app/order/track/[id]/page.tsx`](file:///e:/Projects/Cluck%20n%20moo/src/app/order/track/[id]/page.tsx) | Removed left "Menu" back arrow; moved CNM logo to right side; tightened vertical padding; verified light/dark themes. |

---

## 4. Verification & Testing

1. **Automated Audit Suite (`scripts/verify-mobile-ux.ts`):**
   - Verified signature strip mobile dimensions (44px height/width).
   - Verified Main Menu conditionals (`activeSignatureSlug === "menu"`).
   - Verified single customer sign-in trigger (count = 1).
   - Verified sync icon text removal.
   - Verified responsive lookup form styling classes.
   - Verified live tracking header alignment and logo placement.
   - Result: **ALL 6 CHECKS PASSED**.
2. **TypeScript & Production Next.js Build:**
   - Command: `npm run build`
   - Result: **PASSED (Exit code 0)**. 16 static/dynamic routes generated cleanly with zero errors.
3. **Responsive Width Validation (320px, 375px, 390px, 430px):**
   - Forms and controls wrap cleanly without horizontal clipping or overflow.

---

## 5. Unresolved Items / Notes
- None. All requested customer mobile UX adjustments are complete, functional, and verified.
