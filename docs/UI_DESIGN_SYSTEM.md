# Cluck N Moo (CNM) — UI Design System Specification

**Version**: 2.0 (Fast-Casual Street Food Edition)  
**Brand**: Cluck N Moo (CNM) — *juiciest in town*  
**Aesthetic Core**: High-contrast dark mode, electric flame orange actions, crisp geometric typography, sharp & subtly rounded containers, zero generic dashboards, zero unnecessary gradients.

---

## 1. Design Tokens

### 1.1 Color Tokens

```css
:root {
  /* Brand Core Palette */
  --cnm-black: #0c0c0c;          /* Deep pitch background */
  --cnm-dark-900: #141414;       /* Primary card surface */
  --cnm-dark-800: #1c1c1c;       /* Secondary elevated surface (inputs, pills) */
  --cnm-dark-700: #262626;       /* Borders and subtle dividers */
  --cnm-dark-600: #333333;       /* Hover border state */

  --cnm-orange: #ff8243;         /* Signature flame orange (Action CTA) */
  --cnm-orange-hover: #f26f2d;   /* Active pressed orange */
  --cnm-orange-dark: #b84f1b;    /* Deep orange shade */
  --cnm-orange-glow: rgba(255, 130, 67, 0.22);
  --cnm-orange-subtle: rgba(255, 130, 67, 0.08);

  --cnm-white: #ffffff;          /* Pure white high-contrast headings */
  --cnm-cream: #fff5ee;          /* Warm brand cream for subtitles & callouts */
  --cnm-cream-dim: rgba(255, 245, 238, 0.72);
  --cnm-gray-400: #a1a1a6;       /* Muted body text */
  --cnm-gray-500: #71717a;       /* Inactive icons & placeholders */

  /* Semantic Status Palette */
  --color-status-new: #f59e0b;           /* Amber / Yellow (Awaiting Phone Call) */
  --color-status-new-bg: rgba(245, 158, 11, 0.12);

  --color-status-confirmed: #3b82f6;     /* Bright Blue (Verified) */
  --color-status-confirmed-bg: rgba(59, 130, 246, 0.12);

  --color-status-preparing: #ff8243;     /* CNM Flame Orange (In Kitchen) */
  --color-status-preparing-bg: rgba(255, 130, 67, 0.15);

  --color-status-ready: #10b981;         /* Emerald Green (Packed / Pick Up) */
  --color-status-ready-bg: rgba(16, 185, 129, 0.14);

  --color-status-delivery: #ec4899;      /* Hot Magenta / Purple (On the Road) */
  --color-status-delivery-bg: rgba(236, 72, 153, 0.12);

  --color-status-completed: #10b981;     /* Emerald Green (Delivered & Settled) */
  --color-status-cancelled: #ef4444;     /* Crisp Crimson Red */
  --color-status-cancelled-bg: rgba(239, 68, 68, 0.12);
}
```

---

## 2. Typography Scale & Font Strategy

### 2.1 Font Selection
- **Display Headings**: `Outfit`, sans-serif (Weights: `800`, `900`). Condensed, bold, energetic, reminiscent of classic fast-casual marquee boards.
- **Body & Controls**: `Inter`, sans-serif (Weights: `400`, `500`, `600`, `700`). Geometric, legible, crisp rendering on high-density mobile screens.
- **Handwritten Accents**: `Caveat` or subtle italicised font for playful brand stickers (e.g. *"juiciest in town!"*, *"100% fresh beef"*).

### 2.2 Scale Table

| Token | Size (px / rem) | Line Height | Weight | Usage |
|---|---|---|---|---|
| `text-display-xl` | 36px / 2.25rem | 1.05 | 900 | Main Hero Marquee ("JUICIEST IN TOWN") |
| `text-display-lg` | 28px / 1.75rem | 1.1 | 900 | Section Headers, Brand Wordmark |
| `text-display-md` | 22px / 1.375rem | 1.15 | 800 | Modal Titles, Order Numbers (`CNM-2609-001`) |
| `text-heading-sm` | 18px / 1.125rem | 1.25 | 800 | Product Card Titles, Category Headlines |
| `text-body-lg` | 16px / 1.0rem | 1.4 | 600 | Segmented Controls, Checkout Summary Items |
| `text-body-md` | 14px / 0.875rem | 1.45 | 400/500 | Product Descriptions, Form Labels, Form Inputs |
| `text-caption` | 12px / 0.75rem | 1.35 | 600/700 | Badges, Delivery Micro-copy, Timestamps |
| `text-micro` | 10px / 0.625rem | 1.2 | 800 | Pill tags ("HOT", "DEAL", "CNM HQ") |

---

## 3. Spacing Scale

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

---

## 4. Radii, Borders & Shadows

### 4.1 Border Radius Tokens
- Subtly rounded or sharp edges to reflect bold fast-casual identity (no bubbly oversaturated pill shapes for cards):
```css
:root {
  --radius-xs: 4px;       /* Micro tags, inner indicator dots */
  --radius-sm: 8px;       /* Badges, sub-buttons, inputs */
  --radius-md: 12px;      /* Standard action buttons, product cards */
  --radius-lg: 18px;      /* Main containers, bottom-sheet sheets */
  --radius-full: 9999px;  /* Category pills, status dots */
}
```

### 4.2 Border Tokens
- High-contrast hairline borders to separate dark surfaces without muddy blurs:
```css
:root {
  --border-subtle: 1px solid var(--cnm-dark-700);
  --border-active: 1.5px solid var(--cnm-orange);
  --border-focus: 2px solid var(--cnm-orange);
  --border-ticket: 2px dashed var(--cnm-dark-700);
}
```

### 4.3 Shadow Tokens
- Minimal decorative shadows on UI surfaces; soft warm glows only for food imagery and sticky action bars:
```css
:root {
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-cta: 0 8px 24px rgba(255, 130, 67, 0.32);
  --shadow-sheet: 0 -12px 40px rgba(0, 0, 0, 0.75);
  --shadow-food: 0 10px 25px rgba(255, 130, 67, 0.15);
}
```

---

## 5. Component Style Specifications

### 5.1 Button Hierarchy

1. **`btn-primary` (Electric Flame)**:
   - Background: `var(--cnm-orange)`
   - Text: `var(--cnm-white)`, Weight: `800`, Uppercase, Letter-spacing `0.04em`
   - Shadow: `var(--shadow-cta)`
   - Height: `48px` (Mobile tap standard)
   - Usage: "Add to Order", "Confirm Order", "Start Cooking", "Delivered".

2. **`btn-secondary` (Dark Charcoal)**:
   - Background: `var(--cnm-dark-800)`
   - Border: `var(--border-subtle)`
   - Text: `var(--cnm-white)`, Weight: `700`
   - Height: `44px`
   - Usage: Secondary options, order more food, dismissals.

3. **`btn-accent-cream` (Cream Punch)**:
   - Background: `var(--cnm-cream)`
   - Text: `var(--cnm-black)`, Weight: `900`
   - Usage: One-tap Call Restaurant hotline (`0302-1949067`).

4. **`btn-pill-add` (Product Card CTA)**:
   - Background: `var(--cnm-orange-subtle)`
   - Border: `1.5px solid var(--cnm-orange)`
   - Text: `var(--cnm-orange)`, Weight: `800`
   - Hover/Active: Background fills with solid `var(--cnm-orange)` and text turns pure white.

---

### 5.2 Form Inputs & Controls

- **Input Container**:
  - Background: `var(--cnm-dark-800)`
  - Border: `1.5px solid var(--cnm-dark-700)`
  - Color: `var(--cnm-white)`
  - Font Size: `15px` (prevents iOS auto-zoom on focus)
  - Focus State: Border color transitions to `var(--cnm-orange)` with subtle `rgba(255, 130, 67, 0.15)` ring.
- **Labels**:
  - Font Size: `12px`, Weight: `700`, Uppercase, Letter-spacing `0.05em`, Color: `var(--cnm-cream)`.
- **Micro-Copy / Hints**:
  - Font Size: `11px`, Color: `var(--cnm-gray-400)`.

---

### 5.3 Segmented Control (Order Type Selector)

- Container: `var(--cnm-dark-900)`, padding `4px`, border `1px solid var(--cnm-dark-700)`.
- Option Item:
  - Inactive: Background `transparent`, text `var(--cnm-gray-400)`, icon `var(--cnm-gray-500)`.
  - Active: Background `var(--cnm-orange)`, text `var(--cnm-white)`, icon `var(--cnm-white)`, subtle box shadow.
  - Contextual Sub-label: Active item displays micro-tag (e.g. `Fee: 100 PKR` or `Ready: ~20m`).

---

### 5.4 Sticky Floating Cart Bar

- Position: Fixed `16px` above viewport bottom, centered, max-width `608px`, z-index `60`.
- Surface: High-contrast `var(--cnm-orange)` background with rounded pill radius (`18px`).
- Left: Black contrast chip with total quantity (`2 ITEMS`).
- Center: Condensed bold action text (`VIEW TRAY / CHECKOUT`).
- Right: Total price in pure white (`1,560 PKR`).

---

### 5.5 Modals & Bottom-Sheet Drawers

- **Overlay**: `rgba(0, 0, 0, 0.82)` with `backdrop-filter: blur(6px)`.
- **Sheet Surface**: `var(--cnm-dark-900)`, top border `1px solid var(--cnm-dark-700)`.
- **Top Pull Handle**: `36px x 4px` rounded bar centered at top.
- **Sticky Footer**: Action CTA remains permanently anchored at the bottom of the sheet with `env(safe-area-inset-bottom)` padding.

---

### 5.6 Kitchen Display System (KDS) Tickets

- Card Surface: Deep matte black (`#141414`), border: `2px solid #282828`.
- Header Banner:
  - `DELIVERY`: Solid `var(--cnm-orange)` background with white text.
  - `PICKUP`: Solid `#059669` (Emerald) background with white text.
  - `DINE-IN`: Solid `#2563eb` (Cobalt) background with white text.
- Timer:
  - Under 10 mins: Green clock pill.
  - 10–18 mins: Amber pulse clock pill.
  - Over 18 mins: Red flashing urgency border.
- Items Typography: Quantity `24px` bold orange (`2x`), Product Name `20px` bold white. Modifiers highlighted with orange left accent border.

---

### 5.7 Rider Order Cards

- Surface: `var(--cnm-dark-900)` with thick status border indicator.
- Call Action: Giant prominent button (`Call Customer`) styled in green or orange for instant tap on motorcycle.
- Cash Callout: Dedicated dotted highlight box:
  ```
  +--------------------------------------------+
  |  CASH TO COLLECT ON DELIVERY:  1,450 PKR   |
  +--------------------------------------------+
  ```

---

## 6. Responsive Breakpoints

| Breakpoint | Range | Strategy |
|---|---|---|
| **Mobile S** | `< 380px` | Single-column tight, compact headers, 1-line prices |
| **Mobile M/L** | `380px – 640px` | Primary target (100% mobile-first, bottom sheets, sticky cart) |
| **Tablet** | `641px – 1024px` | 2-column product grid, centered floating modal dialogues |
| **Desktop** | `> 1024px` | Split-view: Menu browse (65% left) + Sticky live tray & checkout (35% right) |
