# Mobile-First UI Audit

## Executive Summary
The current UI is fundamentally flawed because it is built desktop-first and simply shrunk down, resulting in a dense, text-heavy, overlapping, and claustrophobic mobile experience. A complete mobile-first responsive rebuild is required.

## Target Viewports
- 320px
- 360px
- 375px
- 390px
- 412px
- 430px
- 768px (Tablet)
- 1024px (Laptop)
- 1280px+ (Desktop)

## Global Issues
1. **Overlap & Overflow**: Elements overlap horizontally and vertically on small screens (e.g. 320px). Body suffers from horizontal overflow.
2. **Typography**: Headings and body text are oversized for mobile, causing wrapping issues and taking up too much vertical space.
3. **Spacing**: Excessive padding and large empty gaps waste valuable screen real estate.
4. **Desktop Leakage**: Desktop layouts are incorrectly shown on mobile, leading to stretched, squeezed, or squashed UI elements.
5. **Theme Issues**: Dark mode has unreadable text (dark gray on dark background), and light mode contrast can be improved. Default should be explicitly forced to light mode for the rebuild base.

## Component-Specific Audit

### Header (`components/CustomerHeader.tsx`)
- Header buttons and text overlap on narrow screens.
- Topbar content (store status, hotlines, icons) is crowded and mixed together.
- Wraps into broken two-line controls.
- Solution: Simplify to Left (Logo), Right (Order Mode, Cart, Hamburger). Remove desktop navigation links from mobile header. Max height 56-64px.

### Homepage (`app/page.tsx`)
- Uses a huge hero section and marketing paragraphs which push food down.
- Promotions are oversized banners rather than compact carousels.
- Solution: Strip down to Banner -> Header -> Promo Carousel -> Signature Nav -> Search -> Categories -> Compact Grid.

### Signature Navigation & Categories (`components/SignatureNavigationStrip.tsx`)
- Category pills and signature icons are too large.
- Only one or two appear at a time, requiring excessive scrolling.
- Navigation wastes vertical and horizontal space.
- Solution: Use a compact horizontal scroll strip. Show 4-5 items partially visible. Reduce chip height and label length.

### Product Grid & Cards (`components/ProductCard.tsx`)
- Product cards are too large, consuming too much vertical space.
- Single product per row limits discovery.
- Heavy descriptions and badges cause text overload.
- Solution: Default to 2 compact cards per row. Fixed image ratio. Max 2 lines for title, short price, compact "Add" button. Hide descriptions in grid.

### Modals & Drawers (`components/ItemCustomizerModal.tsx`, `components/CartDrawer.tsx`, `components/BuildYourOwnDealModal.tsx`)
- Popups are full-screen and text-heavy unnecessarily.
- Overlays occupy too much screen.
- Solution: Use bottom sheets (70-85% height) for product customizer and cart. Use compact chips for modifiers, not paragraphs. Sticky price/actions at the bottom.

### Order Tracking & Checkout (`app/order/track/page.tsx`, `app/checkout/page.tsx`)
- Checkout, tracking, and order pages feel like report documents (text-heavy).
- Solution: Use progressive steps for checkout. Use compact accordions for order tracking. Reduce text blocks.

### Staff Pages (`app/admin`, `app/kitchen`, `app/rider`)
- Crowded controls on mobile.
- Solution: Compact cards for mobile admin/rider. Large tap targets for kitchen/rider. No information overload.
