# Urgent CNM Admin Issues: Product Save, Staff Visibility & Popular Picks Fix Report

**Date:** September 26, 2026  
**Application:** Cluck N Moo (CNM) Admin Control Center & Customer Storefront  
**Author:** Antigravity Agentic Pair Programmer

---

## 1. Executive Summary

All four urgent issues in the CNM Admin Control Center have been investigated, reproduced, and comprehensively resolved:
1. **Product Save Crash (`Cannot read properties of undefined (reading 'name')`):** Root cause identified in `PUT /api/v1/admin/products/[id]/route.ts` where `data` was omitted from the JSON response, leading to `savedProduct.name` throwing an unhandled `TypeError` in `src/app/admin/page.tsx` and crashing the modal. Both the backend and frontend have been normalized with safe payloads and fallback objects.
2. **Product Form Simplification (Required vs. Optional):** General Info now requires strictly **Dish Name**, **Category**, and **Base Price** (non-negative number). Slug is auto-generated (with human-readable uniqueness checks and manual override lock/re-sync). Display Order is auto-assigned to the next available position within the selected category. All other fields (Description, Ingredients, Allergens, Calories, Food Image, Sizes & Variants, Modifiers & Dips, Tags & Badges) are explicitly optional and never cause save or render failures. Tabs stay rock-solid without resetting.
3. **Staff Visibility:** Investigated Supabase Auth vs. PostgreSQL `profiles` synchronization. Added cross-referencing between Supabase Auth and `profiles`, auto-healing of missing staff profiles, detection and display of `"Invite Pending"` status, no-cache headers, and immediate optimistic list updates upon creation.
4. **Popular Picks Reset & Homepage Sync:** Previewed all 53 previously seeded popular items, executed a clean database reset to `is_featured = false`, added a 1-tap Popular Pick toggle to both Admin table and card views, added a homepage limit warning (>6 items), and updated the homepage to query strictly active, non-archived, explicitly marked items (maximum 6) without any random or fake filler items.
5. **Build & Test Suite:** Next.js production build (`npm run build`) succeeded with 0 errors across all 16 static and dynamic routes. An end-to-end database verification suite passed 100%.

---

## 2. Issue 1: Product Save Crash Root Cause & Fix

### Exact Failing Flow
1. Admin opens an existing product in the Edit Product modal.
2. Uploads a food image to Cloudinary (image uploads and preview displays).
3. Admin clicks **"Save Changes"**.
4. The database updates successfully, but the UI immediately crashes with:
   ```
   TypeError: Cannot read properties of undefined (reading 'name')
   ```

### Investigation & Root Cause
- **File:** [src/app/api/v1/admin/products/[id]/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/admin/products/[id]/route.ts)  
  Before fix:
  ```typescript
  return NextResponse.json({
    success: true,
    message: "Product updated successfully.",
  });
  ```
  The update endpoint omitted the `data` attribute.
- **File:** [src/components/admin/AdminProductModal.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/admin/AdminProductModal.tsx)  
  Before fix:
  ```typescript
  onSuccess(resData.data);
  ```
  This passed `undefined` to the `onSuccess` callback.
- **File:** [src/app/admin/page.tsx](file:///e:/Projects/Cluck%20n%20moo/src/app/admin/page.tsx)  
  Before fix:
  ```typescript
  onSuccess={(savedProduct) => {
    showToast(`✓ Item "${savedProduct.name || "Item"}" saved successfully!`);
    ...
  }}
  ```
  Because `savedProduct` was `undefined`, accessing `savedProduct.name` threw: `Cannot read properties of undefined (reading 'name')`.

### Root-Cause Resolution
1. **Normalized API Response:** Updated `PUT /api/v1/admin/products/[id]/route.ts` to query and return the full updated product record under `data`:
   ```typescript
   const updatedList = await db.select().from(products).where(eq(products.id, id)).limit(1);
   const updatedProduct = updatedList[0] || { ... };
   return NextResponse.json({
     success: true,
     message: "Product updated successfully.",
     data: updatedProduct,
   });
   ```
2. **Defensive Normalization in Modal:** In `src/components/admin/AdminProductModal.tsx`, construct a fallback product object if `resData.data` is absent:
   ```typescript
   const returnedProduct = resData.data || {
     id: product?.id || "temp",
     name: name.trim(),
     slug: slug.trim(),
     categoryId,
     basePricePkr: priceNum,
     ...
   };
   onSuccess(returnedProduct);
   ```
3. **Safe Access in Toast:** In `src/app/admin/page.tsx`:
   ```typescript
   onSuccess={(savedProduct) => {
     const itemName = savedProduct?.name || "Item";
     showToast(`✓ Item "${itemName}" saved successfully!`);
     ...
   }}
   ```
4. **Validation Message:** Added checks for missing/archived categories returning a 400 error (`"Selected category does not exist or has been archived."`) and human-readable slug conflict detection.

---

## 3. Issue 2: Product Form Required vs. Optional Fields

### Field Rules Implemented
| Field | Classification | Behavior |
|---|---|---|
| **Product Name** | **Required** | Must be a non-empty string. Marked with `* (Required)` |
| **Category** | **Required** | Must belong to an active category. Marked with `* (Required)` |
| **Base Price** | **Required** | Must be a valid non-negative integer in PKR (`>= 0`). Marked with `* (Required)` |
| **Display Order** | **Auto-Assigned** | Calculates `max(displayOrder) + 1` in the selected category. Preserves manual override if edited. |
| **Slug** | **Auto-Generated** | Auto-converted to kebab-case from Dish Name. Includes `↺ Auto-sync` button. Guarantees uniqueness. |
| **Availability** | **Default True** | Defaults to Available (`is_available = true`). |
| **Description** | **Optional** | Labeled `(Optional)`. Empty string saved as `null`. |
| **Ingredients & Allergens** | **Optional** | Labeled `(Optional)`. Structured input saved safely. |
| **Calories / Nutrition** | **Optional** | Labeled `(Optional)`. Empty string saved safely. |
| **Food Imagery** | **Optional** | Cloudinary upload is strictly optional; products render with graceful placeholders if absent. |
| **Sizes & Variants** | **Optional** | Labeled `(Optional)`. Valid with 0 variants. |
| **Modifiers & Dips** | **Optional** | Labeled `(Optional)`. Valid with 0 modifier groups. |
| **Tags & Badges** | **Optional** | Labeled `(Optional)`. Empty array supported. |

### Tab Retention
- Tabs: `1. General Info`, `2. Food Imagery (Optional)`, `3. Sizes & Variants (Optional)`, `4. Modifiers & Dips (Optional)`, `5. Tags & Badges (Optional)`.
- Removed unwanted `setActiveTab("general")` calls from validation paths.
- Form inputs, drag/drop uploads, and errors preserve the currently active tab until the admin manually switches tabs.

---

## 4. Issue 3: Staff Visibility & Pending Invites

### Investigation & Root Cause
1. When creating a staff member via `supabaseAdmin.auth.admin.createUser`, Supabase Auth creates the auth record.
2. In earlier sessions, client-side caching (`fetch("/api/v1/admin/staff")` without cache-busting) caused newly created staff to not appear without a hard refresh.
3. If an invitation was sent (`invited_at` populated but `email_confirmed_at` null), the UI lacked an indicator distinguishing pending invitations from active staff.
4. If an auth user existed without a matching PostgreSQL `profiles` record, the user was omitted from the staff list.

### Fix Implemented
- In [src/app/api/v1/admin/staff/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/admin/staff/route.ts):
  - In `GET`, cross-reference Supabase Auth users via `supabaseAdmin.auth.admin.listUsers()`.
  - Automatically heal and upsert any staff user from Supabase Auth who is missing a `profiles` record.
  - Compute `inviteStatus`: `"Invite Pending"` if `invited_at && !email_confirmed_at`, `"Active"` if active, `"Disabled"` if inactive.
  - In `POST`, return full new staff object with `inviteStatus: "Active"`.
- In [src/components/admin/AdminStaffSection.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/admin/AdminStaffSection.tsx):
  - Added `cache: "no-store"` and `Cache-Control: "no-cache"` headers.
  - Added optimistic update on `handleCreateStaff` to immediately prepend the new staff member.
  - Added an Amber `"INVITE PENDING"` badge with `<Clock size={12} />`.
  - Added `"PENDING"` filter button to the Status filter pill bar.

---

## 5. Issue 4: Popular Picks Reset & Homepage Sync

### Audit & Reset of Seeded Popular Flags
- The database originally had **53 products** marked `is_featured = true` due to legacy bulk seed scripts.
- Executed [scripts/reset-popular-picks.ts](file:///e:/Projects/Cluck%20n%20moo/scripts/reset-popular-picks.ts):
  - Listed and logged all 53 items before reset.
  - Reset all products to `is_featured = false`.
  - Verified remaining popular products count in DB: `0`.
- All popular picks are now **100% manual admin selections**.

### Admin UI & Homepage Sync
- In [src/components/admin/AdminProductsSection.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/admin/AdminProductsSection.tsx):
  - Added a dedicated **"Popular Pick"** column in the Products table with a 1-tap star toggle (`⭐ Featured` vs `☆ Not Featured`).
  - Added a filter pill `⭐ Popular (${popularCount})` to instantly view all featured items.
  - Added warning banner if `popularCount > 6`:
    > *"⚠️ X dishes are currently marked as Popular Picks. Note: Customer homepage displays the first 6 items (ordered by Display Order)."*
- In [src/app/api/v1/admin/products/[id]/availability/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/admin/products/[id]/availability/route.ts):
  - Added `revalidatePath("/", "layout")` and `revalidatePath("/menu")` when toggling `isFeatured` or `isAvailable`.
- In [src/components/PopularPicksSection.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/PopularPicksSection.tsx):
  - Strictly filters `isFeatured === 1 && isAvailable === 1`.
  - Slices to a maximum of 6 items.
  - If 0 items are marked popular, returns `null` (gracefully hidden with no random filler or fake cards).

---

## 6. Files Changed Summary

| File | Changes Made |
|---|---|
| [src/app/api/v1/admin/products/[id]/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/admin/products/[id]/route.ts) | Returned normalized updated product in `PUT`; added category and slug conflict validation. |
| [src/app/api/v1/admin/products/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/admin/products/route.ts) | Returned full product object in `POST`; added slug conflict error handling; added `popular` filter support. |
| [src/app/api/v1/admin/products/[id]/availability/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/admin/products/[id]/availability/route.ts) | Added Next.js cache revalidation for `/` and `/menu` on 1-tap toggling. |
| [src/components/admin/AdminProductModal.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/admin/AdminProductModal.tsx) | Enforced required vs. optional fields; auto-assigned display order; auto-generated slug; removed tab-jumping; safe return handling. |
| [src/app/admin/page.tsx](file:///e:/Projects/Cluck%20n%20moo/src/app/admin/page.tsx) | Added `products` to top-level state; passed `allProducts` to modal; guarded `savedProduct?.name` access. |
| [src/app/api/v1/admin/staff/route.ts](file:///e:/Projects/Cluck%20n%20moo/src/app/api/v1/admin/staff/route.ts) | Cross-checked Supabase Auth; auto-healed missing profiles; added `inviteStatus` resolution; enriched return payload. |
| [src/components/admin/AdminStaffSection.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/admin/AdminStaffSection.tsx) | Added cache-busting; optimistic member insertion; `INVITE PENDING` badge; status filter. |
| [src/components/admin/AdminProductsSection.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/admin/AdminProductsSection.tsx) | Added Popular Picks column with 1-tap toggle; filter pill; limit warning banner when > 6 items. |
| [src/components/PopularPicksSection.tsx](file:///e:/Projects/Cluck%20n%20moo/src/components/PopularPicksSection.tsx) | Enforced strict `isFeatured === 1 && isAvailable === 1`, 6-item cap, graceful empty hiding. |

---

## 7. Verification Test Results

Executed automated test suite [scripts/verify-fixes.ts](file:///e:/Projects/Cluck%20n%20moo/scripts/verify-fixes.ts):
1. **Add Product with Minimal Fields (Name + Category + Base Price):** PASSED (saved and returned complete normalized object).
2. **Edit Product with No Image:** PASSED (returned complete normalized object, no crash).
3. **Edit Product with Image Replacement:** PASSED (returned complete normalized object with new Cloudinary URL).
4. **No `.name` Runtime Error:** PASSED (all save paths return valid objects; safe fallbacks in place).
5. **Popular Picks Mark & Query:** PASSED (marked product appears in homepage query; unmarking removes it).
6. **Create Staff Member in Auth & PostgreSQL:** PASSED (Supabase Auth user created, profile inserted, queried and verified).
7. **Production Build (`npm run build`):** PASSED with exit code 0 across 16 routes.
