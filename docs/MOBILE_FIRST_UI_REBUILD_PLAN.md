# Mobile-First UI Rebuild Plan

## Core Philosophy
**Design every screen first at 320px width.**
Never begin from desktop CSS and shrink it down. Build the mobile layout first, then use progressive enhancement for larger screens.

## Implementation Phases

### Phase 1: Foundation & Global Cleanup
- **Goal**: Fix global responsive CSS, typography, theme, and header.
- **Tasks**:
  - Update `globals.css` typography and spacing variables to be compact and mobile-friendly.
  - Enforce light mode as default and fix dark mode contrast.
  - Rebuild `CustomerHeader.tsx` to be strictly mobile-first (Logo + compact right actions + drawer).
  - Eliminate all horizontal overlap and overflow.

### Phase 2: Homepage & Navigation
- **Goal**: Rebuild the main discovery experience to be fast and thumb-friendly.
- **Tasks**:
  - Rebuild homepage structure in `app/page.tsx` (Promo -> Signature Nav -> Search -> Categories -> Grid).
  - Make `SignatureNavigationStrip.tsx` compact (4-5 items visible).
  - Compact category chips.
  - Rebuild `ProductCard.tsx` to support 2-column grid on mobile, compact images, short text.

### Phase 3: Interactions & Cart
- **Goal**: Fix modals and bottom sheets.
- **Tasks**:
  - Rebuild `ItemCustomizerModal.tsx` as a bottom sheet (70-85% height) with sticky bottom actions and compact modifier chips.
  - Rebuild `CartDrawer.tsx` to be compact with sticky checkout button.
  - Update `BuildYourOwnDealModal.tsx` to be a focused mobile experience with a dense product picker.
  - Rebuild `OrderModeModal.tsx` for compact selection.

### Phase 4: Critical User Flows
- **Goal**: Streamline checkout, tracking, and account pages.
- **Tasks**:
  - Rebuild Checkout flow to use progressive steps (Contact -> Delivery -> Payment -> Review).
  - Rebuild `OrderTrackTimeline.tsx` and tracking page to use compact accordions and timeline elements.
  - Update Auth pages and Account pages to reduce text density and avoid full-width giant buttons.

### Phase 5: Staff Portals
- **Goal**: Make staff tools usable on the go.
- **Tasks**:
  - Update `app/admin` for compact cards on mobile.
  - Update `app/kitchen` for clear, large text tickets on tablets/mobile.
  - Update `app/rider` for large actionable status buttons and clear addresses.

### Phase 6: Final QA & Enhancement
- **Goal**: Verify across all viewports and enhance for desktop.
- **Tasks**:
  - Run `npm run build` and functional tests.
  - Perform visual audit across 320px, 360px, 375px, 390px, 412px, 768px, 1024px, 1280px.
  - Add tablet/desktop specific layout enhancements (e.g. 3-4 column grid, desktop header).
  - Final light/dark mode visibility check.
