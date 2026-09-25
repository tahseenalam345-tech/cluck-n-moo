# Responsive Viewport Checklist

Use this checklist during Phase 6 and after completing major features to ensure strict adherence to the mobile-first rules.

## Devices / Viewports
- [ ] 320px (iPhone SE / small mobile)
- [ ] 360px (Standard small Android)
- [ ] 375px (iPhone X/11/12/13 mini)
- [ ] 390px (iPhone 12/13/14 Pro)
- [ ] 412px (Large Android)
- [ ] 430px (iPhone Pro Max)
- [ ] 768px (Tablet Portrait)
- [ ] 1024px (Tablet Landscape / Laptop)
- [ ] 1280px+ (Desktop)

## Route Checklist (Check at all mobile viewports, especially 320px)

### Global / Layout
- [ ] Header has no overlapping buttons or text.
- [ ] Header stays on one line (no wrapping).
- [ ] Hamburger menu works smoothly via Drawer.
- [ ] No horizontal scrolling on the `body`.
- [ ] Light mode looks correct.
- [ ] Dark mode text is readable.

### Homepage (`/`)
- [ ] Top banner is compact.
- [ ] Promotions carousel is swipeable and not oversized.
- [ ] Signature Navigation shows 4-5 items partially visible.
- [ ] Categories are compact chips.
- [ ] Product Grid defaults to 2 columns on standard mobile (1 column only if <320px requires it).
- [ ] Product Cards are compact, images have fixed ratio, text is max 2 lines.

### Modals & Drawers
- [ ] Product Customizer uses a bottom sheet (70-85% height) on mobile.
- [ ] Product Customizer has sticky Add to Cart button at bottom.
- [ ] Cart Drawer is compact and readable.
- [ ] Build Your Own Deal modal is focused and dense.

### Checkout (`/checkout`)
- [ ] Inputs are visible and clearly styled.
- [ ] Flow is broken into logical, short sections.
- [ ] Primary CTA is clearly visible without excessive scrolling.

### Order Tracking (`/order/track`)
- [ ] Timeline is compact.
- [ ] Order summary uses accordions rather than massive text blocks.

### Staff Portals (`/admin`, `/kitchen`, `/rider`)
- [ ] Admin dashboard uses compact cards on mobile.
- [ ] Kitchen tickets are readable without clutter.
- [ ] Rider view has large tap targets for "Call Customer" and status updates.
