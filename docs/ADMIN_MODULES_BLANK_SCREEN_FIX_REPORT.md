# CNM Admin Control Center — Module Blank-Screen Fix Report

**Report Date:** September 26, 2026  
**Auditor:** Antigravity AI Engineering  
**Scope:** Admin Control Center (`/admin`), Kitchen KDS (`/kitchen`), Rider Dispatch (`/rider`), and Customer Storefront (`/`).

---

## 1. Executive Summary & Root Cause Analysis

### The Problem
Following recent performance optimizations, administrators observed that while **Admin Overview** and **Live Orders** rendered properly, clicking almost any other module in the sidebar (such as **Menu Items / Products**, **Menu Categories**, **Deals & Combos**, **Add-ons & Modifiers**, **Staff & Riders**, **Promotions**, **Hours & Settings**, **Delivery Areas**, **Media Library**, or **Audit Activity**) caused the central panel to render completely blank.

### The Exact Root Cause
1. **Broken State Hand-off in `AdminShell` Props (`src/app/admin/page.tsx`):**  
   In `src/app/admin/page.tsx`, `handleSelectSection(sec)` was implemented to both set `activeSection` and register the newly visited module ID in the `visitedSections` set. However, `<AdminShell ...>` was mistakenly passed `onSelectSection={setActiveSection}` instead of `onSelectSection={handleSelectSection}`.
2. **Conditional Render Drop:**  
   Because `visitedSections` was initialized with only `new Set(["overview", "orders"])`, whenever an admin clicked on any other sidebar module (e.g., `"products"` or `"categories"`), `visitedSections.has(section)` evaluated to `false`. React evaluated `{false && <Component />}` and rendered nothing—leaving the main workspace area entirely blank.
3. **No Direct URL Query Parameter Persistence:**  
   Refreshing or navigating directly to `/admin?tab=products` or `/admin?tab=staff` reset the state to the default `"overview"`, without synchronizing `visitedSections` or reading query parameters.

---

## 2. Comprehensive Architectural Fixes Applied

1. **Guaranteed Active Section Rendering:**  
   In `src/app/admin/page.tsx`, every modular section now renders under the condition:
   ```tsx
   {(visitedSections.has("categories") || activeSection === "categories") && (
     <div style={{ display: activeSection === "categories" ? "block" : "none" }}>
       <AdminCategoriesSection />
     </div>
   )}
   ```
   **It is now impossible for the currently active module to be omitted or render blank.**

2. **Automatic Synchronization Hook:**  
   Added an automated state synchronization effect in `src/app/admin/page.tsx`:
   ```tsx
   useEffect(() => {
     setVisitedSections((prev) => {
       if (prev.has(activeSection)) return prev;
       const next = new Set(prev);
       next.add(activeSection);
       return next;
     });
   }, [activeSection]);
   ```
   Whenever `activeSection` changes through sidebar navigation, overview quick links, or URL manipulation, `visitedSections` immediately registers it.

3. **URL Query Parameter Synchronization (`?tab=...`):**  
   - When an admin selects a section, the URL is updated with `?tab=<section>` via `window.history.replaceState`.
   - On initial page load or browser refresh, `URLSearchParams` inspects `?tab=` or `?section=`, restoring the user's active tab and preserving their exact working context.

4. **Empty and Loading State Guards Added:**  
   - In `AdminCategoriesSection.tsx`, added friendly loading and empty state fallback rows if no categories are present.
   - In `AdminDealsSection.tsx`, added dashed border card empty/loading indicator.
   - In `AdminPromotionsSection.tsx`, added empty/loading promotional banner indicator.
   - In `AdminProductsSection.tsx`, guarded `(categories || [])` against any undefined category prop access.

---

## 3. Module Verification & Test Matrix

All 12 Admin modules, plus Kitchen and Rider portals, were audited, tested with real database endpoints, and verified across Light and Dark themes.

| Module Name | Route / Identifier | Previous Blank-Screen Root Cause | Files Changed | Real Data Source / API | Loading State | Empty State | Error State | Light Mode | Dark Mode | Mobile (<=768px) | Final Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Overview** | `/admin` (`overview`) | None (was working) | `src/app/admin/page.tsx` | `/api/v1/ops/orders`, `/api/v1/admin/products` | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Live Orders** | `/admin` (`orders`) | Scoped CSS hash issue on helper cards (fixed) | `AdminOrdersSection.tsx`, `page.tsx` | `/api/v1/ops/orders` (PostgreSQL `orders` table) | Verified | Verified | Handled | Pass | Pass | Pass (2x2 grid) | **ACTIVE / HEALTHY** |
| **Menu Categories** | `/admin?tab=categories` | `visitedSections` omission | `AdminCategoriesSection.tsx`, `page.tsx` | `/api/v1/admin/categories` (`categories` table) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Menu Items (Products)** | `/admin?tab=products` | `visitedSections` omission | `AdminProductsSection.tsx`, `page.tsx` | `/api/v1/admin/products?availability=all_with_archived` | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Deals & Combos** | `/admin?tab=deals` | `visitedSections` omission | `AdminDealsSection.tsx`, `page.tsx` | `/api/v1/admin/products` (`products` with deal category) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Add-ons & Modifiers** | `/admin?tab=modifiers` | `visitedSections` omission | `AdminModifiersSection.tsx`, `page.tsx` | `/api/v1/admin/modifiers` (`modifier_groups`, `modifier_options`) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Media Library** | `/admin?tab=media` | `visitedSections` omission | `AdminMediaLibrarySection.tsx`, `page.tsx` | `/api/v1/admin/media` (`media_assets` & Cloudinary) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Promotions** | `/admin?tab=promotions` | `visitedSections` omission | `AdminPromotionsSection.tsx`, `page.tsx` | `/api/v1/admin/promotions` (`promotions` table) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Delivery Areas** | `/admin?tab=delivery` | `visitedSections` omission | `AdminDeliverySection.tsx`, `page.tsx` | `/api/v1/admin/delivery-areas` (`delivery_areas` table) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Hours & Settings** | `/admin?tab=settings` | `visitedSections` omission | `AdminSettingsSection.tsx`, `page.tsx` | `/api/v1/admin/settings`, `/api/v1/store/status` | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Staff & Riders** | `/admin?tab=staff` | `visitedSections` omission | `AdminStaffSection.tsx`, `page.tsx` | `/api/v1/admin/staff` (`profiles` table via Supabase Auth) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Audit Activity** | `/admin?tab=audit` | `visitedSections` omission | `AdminAuditSection.tsx`, `page.tsx` | `/api/v1/admin/audit` (`audit_logs` table) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Kitchen KDS** | `/kitchen` | Standalone route — verified 403 guard and real orders | `src/app/kitchen/page.tsx` | `/api/v1/ops/orders?status=active` (RBAC: `KITCHEN_STAFF`, `ADMIN`) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |
| **Rider Portal** | `/rider` | Standalone route — verified 403 guard and real orders | `src/app/rider/page.tsx` | `/api/v1/ops/orders?status=active` (RBAC: `RIDER`, `ADMIN`) | Verified | Verified | Handled | Pass | Pass | Pass | **ACTIVE / HEALTHY** |

---

## 4. Light and Dark Theme Verification

- **Theme Persistence:** Toggle in the sticky header toggles `data-theme="dark"` / `data-theme="light"` on the root container.
- **Card Separation:** In dark mode, card surfaces (`#18181b`) and sidebars (`#111113`) are cleanly separated from page background (`#09090b`) with borders (`#27272a` / `#3f3f46`).
- **High Contrast Action Buttons:**
  - `CONFIRM CALL`: Amber (`#d97706`), bold white text.
  - `SEND TO KITCHEN`: Deep orange (`#ea580c`), bold white text.
  - `MARK READY`: Emerald green (`#059669`), bold white text.
  - `DISPATCH RIDER`: Purple (`#7c3aed`), bold white text.
  - `CANCEL`: Distinct red border (`#ef4444`) with subtle red translucent fill.
- **No Invisible Text:** Form inputs, selects, tables, and modal cards strictly follow themed contrast tokens (`--admin-text-main`, `--admin-text-muted`, `--admin-border`).

---

## 5. Build and Compilation Verification

### TypeScript Check:
```bash
$ npx tsc --noEmit
# Exit Code: 0 (Zero errors)
```

### Production Build:
```bash
$ npm run build
> cluck-n-moo@1.0.0 build
> next build

▲ Next.js 15.5.25
- Environments: .env.local

Creating an optimized production build ...
✓ Compiled successfully in 6.0s
Linting and checking validity of types ...
Collecting page data ...
✓ Generating static pages (16/16)
Finalizing page optimization ...
Collecting build traces ...

Route (app)                                      Size  First Load JS
┌ ○ /                                         21.2 kB         150 kB
├ ○ /admin                                    58.3 kB         238 kB
├ ○ /kitchen                                  4.67 kB         180 kB
├ ○ /rider                                    4.56 kB         180 kB
└ [30 dynamic API endpoints]                   205 B         103 kB
+ First Load JS shared by all                  103 kB

# Build exit code: 0
```

---

## 6. Conclusion

Every Admin sidebar module now renders immediately, loads real connected PostgreSQL data, supports both Light and Dark modes without invisible text, and preserves state during navigation and page reloads. Zero fake fallback records were introduced.
