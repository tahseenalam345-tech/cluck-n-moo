# Cluck N Moo (CNM) — Full UI/UX Design System Specification

**Brand Identity:** Cluck N Moo / CNM  
**Tagline:** "juiciest in town"  
**Location:** Main GT Road, Kharian, Pakistan  
**Default Theme:** **LIGHT MODE** (Dark Mode accessible via manual toggle, persisted in `localStorage`)

---

## 1. Color Palette & Token System

### 1.1 Light Mode (DEFAULT)
```css
:root {
  /* Surface & Background */
  --cnm-bg: #FAF6F0;                  /* Warm near-white / light cream */
  --cnm-surface: #FFFFFF;             /* Crisp pure white for cards and modals */
  --cnm-surface-elevated: #F3EAE0;    /* Warm-tinted neutral for nested wells, input fields */
  --cnm-surface-hover: #EFE4D8;       /* Subtle interactive hover surface */
  
  /* Borders */
  --cnm-border: #E8DDD2;              /* Soft warm gray / orange-tinted neutral */
  --cnm-border-hover: #D5C2AF;        /* Noticeable active border */
  --cnm-border-focus: #FF8243;        /* High-visibility brand border */

  /* Text & Legibility (Strict WCAG AA/AAA) */
  --cnm-text-primary: #181513;        /* Near-black / dark charcoal (Contrast 15.4:1) */
  --cnm-text-secondary: #3D352F;      /* Strong readable dark charcoal (Contrast 8.2:1) */
  --cnm-text-muted: #5C544E;          /* Readable neutral dark gray (Contrast 5.6:1) */
  --cnm-text-subtle: #756B64;         /* Tertiary labels (Contrast 4.6:1) */

  /* CNM Brand Accent & Action */
  --cnm-orange: #FF8243;              /* Brand Primary Orange */
  --cnm-orange-hover: #F26F2D;        /* Deepened hover orange */
  --cnm-orange-dark: #D45B1A;         /* Dark active orange */
  --cnm-orange-glow: rgba(255, 130, 67, 0.22);
  --cnm-orange-subtle: rgba(255, 130, 67, 0.10);

  /* Elevation Shadows */
  --shadow-xs: 0 1px 3px rgba(35, 25, 15, 0.05);
  --shadow-card: 0 4px 16px rgba(35, 25, 15, 0.06);
  --shadow-card-hover: 0 8px 24px rgba(35, 25, 15, 0.10);
  --shadow-elevated: 0 14px 36px rgba(35, 25, 15, 0.12);
  --shadow-cta: 0 4px 16px rgba(255, 130, 67, 0.35);
  --shadow-drawer: -4px 0 28px rgba(0, 0, 0, 0.15);
}
```

### 1.2 Dark Mode (Theme Toggle)
```css
[data-theme="dark"] {
  /* Surface & Background */
  --cnm-bg: #0C0C0C;                  /* True Deep Black */
  --cnm-surface: #171717;             /* Elevated dark gray surface */
  --cnm-surface-elevated: #222222;    /* Interactive elements & nested inputs */
  --cnm-surface-hover: #2A2A2A;

  /* Borders */
  --cnm-border: #2A2A2A;
  --cnm-border-hover: #3E3E3E;
  --cnm-border-focus: #FF8243;

  /* Text & Legibility */
  --cnm-text-primary: #FFFFFF;        /* Pure white */
  --cnm-text-secondary: #E5E5E5;      /* High contrast light gray */
  --cnm-text-muted: #A3A3A3;          /* Medium light gray (Contrast 5.2:1) */
  --cnm-text-subtle: #737373;

  /* CNM Brand Accent & Action */
  --cnm-orange: #FF8243;
  --cnm-orange-hover: #F26F2D;
  --cnm-orange-dark: #D45B1A;
  --cnm-orange-glow: rgba(255, 130, 67, 0.28);
  --cnm-orange-subtle: rgba(255, 130, 67, 0.14);

  /* Shadows */
  --shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.45);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.6);
  --shadow-elevated: 0 14px 36px rgba(0, 0, 0, 0.7);
  --shadow-cta: 0 4px 20px rgba(255, 130, 67, 0.3);
  --shadow-drawer: -4px 0 28px rgba(0, 0, 0, 0.6);
}
```

### 1.3 Semantic Status Colors (Both Themes)
To satisfy accessibility, status colors are paired with matching readable text colors and never rely solely on hue:
```css
/* Order Status Tokens */
--status-new: #D97706;               /* Amber/Yellow (New order) */
--status-new-bg: rgba(217, 119, 6, 0.12);
--status-new-text: #B45309;

--status-confirmed: #2563EB;         /* Blue (Confirmed by staff) */
--status-confirmed-bg: rgba(37, 99, 235, 0.12);
--status-confirmed-text: #1D4ED8;

--status-preparing: #EA580C;         /* Orange (Cooking in Kitchen) */
--status-preparing-bg: rgba(234, 88, 12, 0.14);
--status-preparing-text: #C2410C;

--status-ready: #059669;             /* Emerald Green (Packed & Ready) */
--status-ready-bg: rgba(5, 150, 105, 0.12);
--status-ready-text: #047857;

--status-delivery: #DB2777;          /* Pink/Magenta (Rider dispatched) */
--status-delivery-bg: rgba(219, 39, 119, 0.12);
--status-delivery-text: #BE185D;

--status-completed: #059669;         /* Green (Fulfilled) */
--status-completed-bg: rgba(5, 150, 105, 0.12);
--status-completed-text: #047857;

--status-cancelled: #DC2626;         /* Red (Rejected/Cancelled) */
--status-cancelled-bg: rgba(220, 38, 38, 0.12);
--status-cancelled-text: #B91C1C;
```

---

## 2. Typography Hierarchy

Fonts loaded via Google Fonts:
1. **Display Font:** `'Outfit', sans-serif` — Strong bold/condensed sans-serif for headings, brand badges, and price numerals.
2. **Body Font:** `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` — Crystal clear, highly legible sans-serif for descriptions, tables, forms, and product details.
3. **Accent Script:** `'Caveat', cursive` — Used solely for the brand tagline *"juiciest in town"*.

### Scale
- **Display 1 (Hero Title):** 32px / line-height 1.15 / font-weight 800
- **Display 2 (Section Title):** 24px / line-height 1.25 / font-weight 750
- **Heading 3 (Card Title):** 16px / line-height 1.3 / font-weight 700
- **Heading 4 (Sub-section / Item Title):** 14px / line-height 1.35 / font-weight 650
- **Body Regular:** 14px / line-height 1.5 / font-weight 400
- **Body Medium:** 14px / line-height 1.5 / font-weight 500
- **Body Bold:** 14px / line-height 1.5 / font-weight 600
- **Caption / Meta:** 12px / line-height 1.4 / font-weight 500
- **Micro Badge:** 11px / line-height 1 / font-weight 700 / letter-spacing 0.04em

---

## 3. Spacing & Border Radius System

### Spacing Tokens
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px

### Border Radii
- `--radius-xs`: 4px (Chips, micro badges)
- `--radius-sm`: 8px (Buttons, form inputs, small cards)
- `--radius-md`: 12px (Product cards, alerts, modal dialogs)
- `--radius-lg`: 18px (Drawers, hero banners, feature cards)
- `--radius-full`: 9999px (Pills, search input, round buttons)

---

## 4. Reusable UI Components Specification

### 4.1 Buttons
- **`.btn-primary`**: Background `#FF8243`, text `#FFFFFF`, font-weight 750, subtle box-shadow `--shadow-cta`. Hover: `#F26F2D`, translateY(-1px). Active: translateY(0). Minimum height 44px (touch friendly).
- **`.btn-secondary`**: Background `var(--cnm-surface-elevated)`, border `1px solid var(--cnm-border)`, text `var(--cnm-text-primary)`. Hover: border `var(--cnm-orange)`, text `var(--cnm-orange)`.
- **`.btn-outline`**: Background transparent, border `1.5px solid var(--cnm-orange)`, text `var(--cnm-orange)`.
- **`.btn-danger`**: Background `var(--status-cancelled-bg)`, border `1px solid var(--status-cancelled)`, text `var(--status-cancelled)`.

### 4.2 Form Controls & Inputs
- Visible `<label>` above every input with `var(--cnm-text-secondary)` and `font-size: 13px; font-weight: 600;`.
- Background `var(--cnm-surface)` or `var(--cnm-surface-elevated)`.
- Border `1px solid var(--cnm-border)`.
- Focus ring: `outline: none; border-color: var(--cnm-orange); box-shadow: 0 0 0 3px var(--cnm-orange-glow);`.
- Placeholder color: `var(--cnm-text-muted)`.

### 4.3 Product Card Architecture
- Container: Surface `var(--cnm-surface)`, border `1px solid var(--cnm-border)`, radius `var(--radius-md)`, hover elevation.
- Image Header: Aspect ratio `4:3`, real Cloudinary food image, rounded top corners, branded image fallback.
- Badges: Positioned top-left, e.g. "★ POPULAR", "VALUE FEAST", "100% BEEF".
- Card Body: Product title (`var(--cnm-text-primary)`, font-weight 700), 2-line description clamp (`var(--cnm-text-muted)`).
- Card Footer: Price lockup with bold PKR figure in `var(--cnm-text-primary)` (or highlighted orange numeral with black label) and an explicit "+ Add" or "Options" CTA button.

### 4.4 Modals, Drawers & Bottom Sheets
- **Mobile (< 640px):** Slide-up bottom sheets with top drag handle, max-height 90vh, sticky bottom action bar, and no horizontal overflow.
- **Desktop (>= 640px):** Centered modal dialogs (max-width 560px for customizer, 840px for deal builder) or sleek right slide-over side panel (Cart Drawer, max-width 440px).

### 4.5 Responsive Breakpoints
- **Mobile Narrow:** `< 360px` (1-column product grid, compact logo)
- **Mobile Standard:** `360px – 639px` (2-column product grid, sticky cart CTA bar)
- **Tablet:** `640px – 1023px` (2–3 column product grid, wide drawers)
- **Desktop:** `1024px – 1440px` (4-column product grid, max container 1280px)
- **Large Desktop:** `> 1440px` (centered container with balanced margins)
