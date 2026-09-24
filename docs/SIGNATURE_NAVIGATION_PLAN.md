# CNM Signature Navigation & Storefront Redesign Plan
**Cluck N Moo (CNM) — Official Storefront Navigation Architecture**
**Document Date:** September 2026

---

## 1. Executive Summary & Objective

This document outlines the architectural plan to redesign the public customer-facing storefront for **Cluck N Moo (CNM)** around its unique signature branded navigation sections.

The redesign preserves the authoritative brand colors:
- `--cnm-black`: `#0C0C0C`
- `--cnm-surface`: `#171717`
- `--cnm-surface-elevated`: `#222222`
- `--cnm-orange`: `#FF8243`
- `--cnm-white`: `#FFFFFF`
- `--cnm-cream`: `#FFF5EE`

It supports both **Light Mode** and **Dark Mode** with high contrast across all elements.

---

## 2. Asset Audit: Signature Icons

### Finding:
- Inspected: `public/`, `src/`, `docs/`, and root directories.
- Available image files in workspace:
  - `public/logo.png` (Real brand logo)
  - `public/logo.jpg` (Real brand logo)
  - `public/icon-192.png` (App manifest icon)
  - `public/icon-512.png` (App manifest icon)
- **Status of Individual Signature Icon Files:**
  - **MISSING**: There are **no individual image files** for the 7 signature sections:
    1. `bon a petit`
    2. `menú`
    3. `pizza menú`
    4. `muuu`
    5. `cloc cloc`
    6. `mmm.....`
    7. `historia`
  
### Asset Policy Compliance:
- Per instructions: *"If only a combined reference image exists, report that individual icon assets are missing. Do not silently create inaccurate replacement icons. Do not redraw or invent the icon artwork."*
- **Resolution**:
  - We report explicitly that the individual asset files are missing.
  - The code architecture will support `iconAsset?: string | null`.
  - For the visual design until real icon files are provided, the circular container (64–76px) will preserve the exact black circular visual language with an authoritative typographic monogram/glyph lockup, which will automatically render custom PNG/SVG assets the moment individual asset files are placed into `public/icons/signature/`.

---

## 3. Menu Data Audit: Verified Existing Items vs Missing Items

Per strict instructions: *"Do not invent descriptions, prices, or items. Use the current database and verified menu data only. If a product is missing from the current database, create a report instead of inventing it."*

| Signature Section | Desired Mapping Specification | Current Verified Database Items | Missing Products from Database (Report Only) |
|---|---|---|---|
| **bon a petit** | Onion Rings, Mozzarella Sticks, Fish N Chips, Nuggets N Fries, Chicken Strips, Chicken Wings, Fried Chicken. | `Golden Fried Chicken (3 Pcs)`<br>`Crispy Chicken Tenders (4 Pcs)` | Onion Rings, Mozzarella Sticks, Fish N Chips, Nuggets N Fries, Chicken Wings. |
| **menú** | All menu items and all menu categories. | All 16 verified products across all 6 categories. | None (displays full verified catalog). |
| **pizza menú** | Fixed pizzas, Make Your Own Pizza, stuffed crust, calzones, tray pizza, and pizza extras. | `Chicken Tikka Supreme Pizza`<br>`Chicken Fajita Sicilian Pizza`<br>`Cheesy Four-Cheese Lover` (Stuffed crust available as modifier) | Make Your Own Pizza, Calzones, Tray Pizza, Standalone Pizza Extras. |
| **muuu** | The OG, Classic Cheeseburger, Oklahoma Smash, Mushroom N Cheese / Swiss, Philly Cheesesteak, beef deals. | `The Classic Smash Burger`<br>`Moo & Cluck Duo Monster`<br>`Duo Smash Feast` | The OG, Classic Cheeseburger, Oklahoma Smash, Mushroom N Cheese / Swiss, Philly Cheesesteak. |
| **cloc cloc** | Original Xinger, Nashville Hot, Lemon/Citrus Honey Crunch, Smashed Cluck, Smoky BBQ, Clucky Patty, fried chicken, tenders, wraps, chicken sandwiches. | `Crispy Cluck Zinger`<br>`Golden Fried Chicken (3 Pcs)`<br>`Crispy Chicken Tenders (4 Pcs)` | Nashville Hot, Lemon/Citrus Honey Crunch, Smashed Cluck, Smoky BBQ, Clucky Patty, Chicken Wraps, Chicken Sandwiches. |
| **mmm.....** | Treats, desserts, shakes, cold coffee, chilled drinks. | `Chilled Soft Drink (345ml)`<br>`Mineral Water (500ml)` | Treats, Desserts, Milkshakes, Cold Coffee. (Drinks & desserts kept as separate DB categories). |
| **historia** | Brand story, tagline, branch location, phone, hours, and contact info (No products). | Verified store info: Main GT Road Kharian, Phone: 0302-1949067, Hours: 12:01 PM – 02:00 AM. | None (renders public story/about view). |

---

## 4. Homepage Section Order Specification

The public customer storefront will be structured strictly in the requested 9-tier hierarchy:

1. **Dismissible App-Download Banner** (`AppDownloadBanner.tsx`)
2. **Responsive Public Topbar** (`CustomerHeader.tsx`)
   - Real brand logo (`/logo.png`), tagline, live store schedule, order-mode chip, cart button, mobile drawer toggle.
3. **Deals / Promotions Carousel** (`PromoCarousel.tsx`)
   - Fixed aspect ratio, smooth sliding track, un-cluttered deal graphics, direct tap to view/order deal.
4. **CNM Signature Navigation Strip** (`SignatureNavigationStrip.tsx`)
   - Black circular icon buttons (64–76px) with flame-orange (`#FF8243`) active border and subtle ambient glow.
   - Horizontal scroll with snapping on mobile, centered max-width on desktop.
   - Accessible keyboard controls and touch interaction.
5. **Search Bar** (`MenuSearchBar.tsx`)
   - Placed below the signature strip.
   - Dynamic animated cycling placeholder maintaining permanent `"Search for "` prefix.
   - Search across product names, descriptions, categories, and tags with clear button.
6. **Popular Picks Section** (`PopularPicksSection.tsx`)
   - Configurable section displaying 4–6 verified popular dishes (`is_featured = 1`).
   - Mobile horizontal scroll / compact grid; desktop 4-column grid.
7. **Dynamic Menu Content**
   - Products grouped and filtered based on the active signature section or category.
   - Multi-column responsive layout (1 col on narrow mobile, 2 col on mobile, 3 col on tablet, 4 col on desktop).
   - High-contrast cards, stable heights, verified descriptions, branded missing-image fallbacks (no emoji as final image), and options/add CTA.
8. **Brand Story / Location Section ("Historia")** (`BrandStorySection.tsx`)
   - Public view with CNM story, "juiciest in town" heritage, Main GT Road Kharian branch location, hours, and hotline call CTA.
   - Deep-linked when "historia" signature item is selected.
9. **Public Footer** (`CustomerFooter.tsx`)
   - Copyright, cash-on-delivery guarantee, branch hours, and legal links.

---

## 5. Architectural Data Model & Route Behavior

### 5.1 Signature Section Configuration Model
Created in `src/lib/signatureSections.ts`:

```typescript
export type SignatureSectionType = "MENU_FILTER" | "ALL_MENU" | "CUSTOM_VIEW" | "ROUTE";

export interface SignatureSectionConfig {
  id: string;
  slug: string;
  displayName: string;
  subtitle: string;
  iconAsset: string | null; // e.g. "/icons/signature/muuu.png"
  sectionType: SignatureSectionType;
  displayOrder: number;
  isActive: boolean;
  mapping: {
    matchAll?: boolean;
    categoryIds?: string[];
    productIds?: string[];
    keywordFilters?: string[];
  };
}
```

### 5.2 Decoupled Mapping Layer
The configuration maps each signature section to database items:
- `bon-a-petit`: Maps to appetizers, tenders, chicken pieces, fries (`cat_sides`, `cat_chicken`).
- `menu`: Sets `matchAll: true`, rendering all categories and products.
- `pizza-menu`: Maps to `cat_pizzas` and pizza deals.
- `muuu`: Maps to beef burgers (`cat_burgers` with beef patties) and `deal_duo_smash`.
- `cloc-cloc`: Maps to chicken burgers (`prod_cluck_zinger`), fried chicken, and tenders.
- `mmm`: Maps to `cat_drinks` and future dessert items.
- `historia`: `sectionType: "CUSTOM_VIEW"`, scrolls to or activates the brand story view without menu grid.

---

## 6. Responsive Behavior Matrix

| Viewport | Signature Strip Layout | Popular Picks Layout | Dynamic Menu Grid |
|---|---|---|---|
| **Mobile (<640px)** | Horizontal swipeable strip with partial next-item reveal (`68px` circular icons), scroll snap | Horizontal swipe card row or compact 2-col | 2 columns (1 column on narrow <360px devices) |
| **Tablet (640px–1024px)** | Centered or smooth horizontal strip with indicators | 3-column grid | 3 columns |
| **Desktop (1024px–1440px)** | Centered max-width 980px strip, evenly spaced items | 4-column grid | 4 columns |
| **Large Desktop (>1440px)** | Centered max-width 1200px container, zero overflow | 4-column spacious grid | 4 columns |

---

## 7. Files to Create and Modify

### New Files to Create:
1. `docs/SIGNATURE_NAVIGATION_PLAN.md` (This design and audit document)
2. `src/lib/signatureSections.ts` (Configuration model and decoupled mappings)
3. `src/components/SignatureNavigationStrip.tsx` (Signature circular navigation component)
4. `src/components/PopularPicksSection.tsx` (Configurable popular picks carousel/grid)
5. `src/components/BrandStorySection.tsx` ("Historia" brand story & branch section)

### Existing Files to Modify:
1. `src/app/page.tsx` (Assemble the 9-tier layout in exact order, bind signature section state, update responsive grids)
2. `src/components/MenuSearchBar.tsx` (Ensure integration below signature strip)
3. `src/components/ProductCard.tsx` (Ensure stable card heights, branded missing-image fallback, accessible typography)
4. `src/app/globals.css` (Styles for signature strip circular buttons, active glow, responsive grids, and dark/light contrast)
5. `src/types/index.ts` (Export signature section types)

---

## 8. Implementation Phases (Post-Approval)

- **Phase 1**: Signature-section data model and mapping configuration (`src/lib/signatureSections.ts`, types).
- **Phase 2**: Signature icon strip component with responsive interaction, scroll-snapping, and active states (`SignatureNavigationStrip.tsx`).
- **Phase 3**: Popular Picks section and search bar coordination (`PopularPicksSection.tsx`, `MenuSearchBar.tsx`).
- **Phase 4**: Dynamic storefront layout reassembly, "Historia" brand story section, and responsive product grids (`src/app/page.tsx`, `BrandStorySection.tsx`).
- **Phase 5**: Light/Dark contrast verification, keyboard accessibility audit, and responsive cross-device verification.
