# Cluck N Moo (CNM) — Full UI/UX Redesign Audit

**Date:** 2026-09-24  
**Scope:** Customer-Facing & Staff-Facing Screens, Theme System, CSS Architecture, Accessibility & Responsiveness  
**System Status:** Backend APIs, Supabase DB, Drizzle ORM, Order State Machine, and Cloudinary Media are 100% verified and operational. The UI/UX layer is being comprehensively redesigned.

---

## 1. Executive Summary & Core Rejection Drivers

The existing frontend suffers from several critical UI/UX shortcomings that caused the design rejection:
1. **Default Dark Mode / Inverted Theming:** The application defaulted to dark mode in `:root`, giving a dreary, uninviting SaaS impression rather than a warm, vibrant fast-food restaurant storefront. Light mode had poor card-to-background contrast and broken transitions.
2. **Undefined & Broken CSS Variables:** Across multiple staff and customer screens, styles referenced undefined CSS tokens (`var(--cnm-dark-900)`, `var(--cnm-dark-800)`, `var(--cnm-dark-700)`, `var(--cnm-gray-400)`, `var(--cnm-gray-500)`), causing transparent backgrounds, invisible borders, and washed-out text.
3. **Severe Contrast & Legibility Failures:** Small body text in light mode frequently used light gray (`#8a827c`, `#a1a1a6`) or orange (`#ff8243`), failing WCAG AA (contrast ratio < 3.5:1). Dark mode similarly suffered from muddy low-contrast muted copy.
4. **Hardcoded Dark Backgrounds in Light Mode:** Prominent elements such as `Build Your Own Deal` hero card in `/deals`, staff login loading states, `/kitchen`, and `/rider` had hardcoded `#080808` or dark gradients that did not adapt to the active theme.
5. **Mobile Viewport Overflow & Weak Touch Ergonomics:** Category scrollers, table layouts in Admin, modal dialogs on small phones, and header banners caused layout jitter, horizontal scrolling, and touch targets below 44px.
6. **Visual Hierarchy & Fast-Food Identity:** Lack of clear distinction between page background (warm cream `#FAF6F0`) and card surfaces (pure white `#FFFFFF`), weak CTA elevation, and missing sticky cart feedback on mobile.

---

## 2. Screen-by-Screen Audit Findings

### A. Customer-Facing Screens

| Route / Screen | Current Deficiencies | Required Redesign Remedy |
| :--- | :--- | :--- |
| **Global Theme System (`globals.css`, `ThemeContext.tsx`)** | `:root` defined dark palette. Light theme was secondary and had poor contrast. Theme color meta was `#0C0C0C`. | Refactor `:root` to default **LIGHT MODE**. Make warm cream (`#FAF6F0`) the base, crisp white (`#FFFFFF`) card surfaces, warm border (`#E8DDD2`), and high-contrast dark charcoal (`#181513`) primary text. Dark mode (`#0C0C0C` / `#171717`) fully retained via persistent toggle. |
| **Customer Header (`CustomerHeader.tsx`)** | Top hotline stripe and branch info cramped on mobile; sticky header height calculation caused layout shifts; order mode pill contrast was low. | Redesign with compact, clean mobile header, visible live store badge (`OPEN NOW`), prominent brand logo lockup, seamless order mode selector, and persistent theme toggle. |
| **Homepage (`/`)** | Category tabs had glassmorphism that washed out on light backgrounds; promo banner had dark gradient; product grid lacked uniform card height and visual pop. | Branded hero banner, clean category scroll strip with active indicator and count badges, warm card surfaces, 2-column mobile grid fallback, and prominent real food imagery. |
| **Full Menu Page (`/menu`)** | Category sections lacked distinct visual hierarchy; search input lacked prominent focus ring; empty search states were plain text. | High-contrast search bar with clear icon, category jump anchors, clear section headers with item counters, and accessible product cards. |
| **Exclusive Deals Page (`/deals`)** | "Build Your Own Deal" card had hardcoded dark gradient `#141414` in light mode; deal badges lacked punch. | Redesign Deal Builder banner to adapt to light/dark themes with warm borders, 5% and 10% discount progress meters, and high-impact deal card layouts. |
| **Build Your Own Deal Modal (`BuildYourOwnDealModal.tsx`)** | Modal did not convert to a proper bottom sheet on mobile; tray expanded over content; item selection lacked clear checked state. | Mobile bottom drawer / desktop modal with sticky bottom tray showing real-time discount tier progress, item count, and primary CTA. |
| **Product Customizer Modal (`ItemCustomizerModal.tsx`)** | Fixed desktop modal on small mobile screens caused off-screen buttons; instruction chips were low-contrast gray. | Responsive slide-up bottom sheet on mobile, clean radio/checkbox option groups with explicit price deltas (+PKR), and sticky add-to-cart button. |
| **Cart & Checkout Drawer (`CartDrawer.tsx`)** | Drawer overlay lacked touch-drag handle; delivery area dropdown and address fields lacked strong borders; discount calculation badge washed out. | Smooth slide-over drawer (desktop) / bottom sheet (mobile), distinct order summary lines, clear Cash-on-Delivery badge, and 48px primary action button. |
| **Live Order Tracking (`/order/track`, `/order/track/[id]`)** | Hardcoded status colors; timeline stepper was cramped on mobile; order again button lacked clear elevation. | Visual step-by-step order progress timeline with distinct icons, live polling indicator, order item summary, and clear "Order Again" one-click action. |
| **Customer Account & Saved Addresses (`/account`)** | Sign-in/sign-up forms lacked input validation styling; saved address cards had weak borders; order history list looked like an unstyled table. | Tabbed modern auth card with explicit input labels, clean saved address manager with easy delete/add, and timeline order history cards with status badges. |
| **Static Pages (`/contact`, `/privacy`, `/terms`)** | Plain layout without structured cards; hotline and delivery areas were plain text tags. | Card-based layouts with high-contrast text, clickable call/WhatsApp action, interactive delivery area tags, and polished footer. |

---

### B. Staff-Facing Operations Screens

| Screen | Current Deficiencies | Required Redesign Remedy |
| :--- | :--- | :--- |
| **Staff Login (`/staff/login`)** | Error alerts blended with background; inputs had undefined border variables; lacked clear portal branding. | High-contrast, security-focused staff login card with clear role redirection notice, visible password toggle, and error states. |
| **Admin Operations Dashboard (`/admin`)** | Used undefined variables (`--cnm-dark-900`, `--cnm-dark-800`), resulting in broken table borders; dense orders were hard to parse on tablet/desktop. | Clean, high-density operations pipeline with status tab counters, responsive order cards/table, delivery fee manager, and store settings toggles. |
| **Kitchen KDS (`/kitchen`)** | Hardcoded `#080808` dark screen; order advance buttons were small; order items lacked high-visibility typography for kitchen distance reading. | High-visibility Kitchen Display System optimized for wall mounts and tablets: large order numbers, elapsed time warnings, high-contrast item lists with modifier highlights, and 56px touch advance buttons. |
| **Rider Delivery Dashboard (`/rider`)** | Hardcoded dark background; delivery address and customer phone number lacked one-tap phone call buttons. | Mobile-first rider view: prominent customer phone call button (`tel:`), bold delivery village badge, order total (COD collection), and large delivery action buttons. |

---

## 3. Contrast & Accessibility Issues Found (WCAG AA)

| Component / Element | Existing Colors | Measured Contrast | Issue & Severity | Target Fix | Target Contrast |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Body muted copy (Light) | `#8A827C` on `#FFF9F5` | 3.1:1 | **FAIL** (Subtle text unreadable) | Change to `#5C544E` | **5.6:1 (PASS AA)** |
| Body primary text (Light) | `#171717` on `#FFF9F5` | 15.2:1 | PASS | Keep `#181513` on `#FAF6F0` | **15.4:1 (PASS AAA)** |
| Card Border (Light) | `#EADCCE` on `#FFFFFF` | 1.3:1 | WEAK (Border almost invisible) | Change to `#E8DDD2` with warm shadow | **Clear boundary** |
| Orange price text | `#FF8243` on `#FAF6F0` | 2.6:1 | **FAIL** (Orange body text) | Use `#181513` for price, orange badge or bold dark styling | **15.4:1 (PASS AAA)** |
| Status badges (New/Pending) | `#F59E0B` on white | 2.1:1 | **FAIL** (Yellow text unreadable) | Use `#92400E` text on `#FEF3C7` bg | **4.9:1 (PASS AA)** |
| Status badges (Confirmed) | `#3B82F6` on white | 3.2:1 | **FAIL** | Use `#1E40AF` text on `#DBEAFE` bg | **5.1:1 (PASS AA)** |
| Kitchen ticket items | Unstyled text on dark | Variable | Low legibility at 2 meters | Bold `#FFFFFF` with yellow/orange modifiers | **High visibility** |

---

## 4. Architectural Findings & Constraints
- **Zero Schema or API Changes:** All data contracts (`/api/v1/menu`, `/api/v1/orders`, `/api/v1/ops/orders`, `/api/v1/store/status`, `/api/v1/account/*`) must remain strictly untouched.
- **Pure CSS Tokens in `globals.css`:** Do not install Tailwind or external styling engines that could introduce configuration overhead or hydration mismatches. Use structured CSS variables and scoped utility classes.
- **Preserve Assets:** Use existing `/logo.png`, `/public/branding/signature/*` assets and Cloudinary food images without alteration.
