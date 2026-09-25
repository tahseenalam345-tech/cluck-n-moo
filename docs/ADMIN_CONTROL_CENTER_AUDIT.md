# Cluck N Moo (CNM) Admin Control Center Audit

**Date:** 2026-09-25  
**Version:** 1.0.0  
**Target:** Complete Store & Operations Admin Management Panel (`/admin`)

---

## 1. Executive Summary

Cluck N Moo's existing administration interface at `/admin` is currently an operations-only stub focused on live order management, basic delivery area fee edits, and store open/close settings. It lacks full-scale restaurant menu and catalog administration, Cloudinary asset orchestration, dynamic modifier group authoring, structured deal management, and comprehensive audit activity logging.

This audit evaluates the current state of database tables, API routes, authentication mechanisms, and UI components to outline precisely what is missing and what must be upgraded to establish a state-of-the-art **CNM Admin Control Center**.

---

## 2. Current State vs. Missing Functionality

| Functional Domain | Current Status | Deficiencies / Gaps |
| :--- | :--- | :--- |
| **Authentication & RBAC** | Supabase Auth + profile `ADMIN` role check | Client-side checks route to `/staff/login`, but granular admin APIs are sparse; writes must be unified and strictly checked with `enforceRole(["ADMIN"])`. |
| **Dashboard / Overview** | None | No KPI cards (revenue, active orders, popular dishes, inventory alerts, quick actions). |
| **Orders Management** | Present (`active`, `delivered`, `cancelled`) | Has status stepper, modal cancellation, rider call triggers, but lacks tabular bulk actions and quick status filters. |
| **Menu Categories** | Missing in `/admin` | No UI to add, reorder, rename, or archive categories; cannot see attached product counts or toggle category visibility. |
| **Menu Items (Products)** | Missing in `/admin` | Products (90 items) only exist in database; no admin view to search, filter by category/availability, edit descriptions/prices, toggle sold-out state, or archive products. |
| **Product Variants** | Missing in `/admin` | No interface to manage sizes/variants (e.g. Medium 10", Large 13", Single, Double) or their variant price points. |
| **Modifiers & Add-ons** | Missing in `/admin` | No interface to attach or manage modifier groups (e.g. Stuffed Crust, Dip sauces, Patty upgrades, Meal combos) or modifier price adjustments. |
| **Deals Management** | Partial (only in catalog view) | 18 existing deal items (`cat_deals`, `cat_box_deals`, `cat_combo_deals`) and 4 promotions cannot be edited, priced, or customized from `/admin`. |
| **Promotions Foundation** | Stored in DB table `promotions` | No admin UI to update banners, badges, launch pricing, or active rule options. |
| **Media Library / Uploads** | Missing in `/admin` | No UI to view Cloudinary food images, upload from device, drag-and-drop, generate signed upload signatures, copy CDN links, or replace product assets. |
| **Delivery Areas** | Basic form | Lacks full tabular management, bulk toggles, and inline editing. |
| **Timings & Settings** | Basic key-value inputs | Lacks visual day-of-week schedule editor for `restaurant_schedules` (12:01 PM - 02:00 AM). |
| **Staff & Rider Assignment**| In order card dropdown | Lacks dedicated Staff/Rider directory to view active riders, phone numbers, and operational roles. |
| **Audit Activity Log** | Missing | No central audit table tracking who edited a price, updated an image, or archived an item. |

---

## 3. Database & Schema Inspection

Inspection of PostgreSQL database via pooler connection revealed:
- **`categories`** (18 rows): `id`, `name`, `slug`, `display_order`, `is_active`, `created_at`.
- **`products`** (90 rows): `id`, `category_id`, `name`, `slug`, `description`, `image_url`, `cloudinary_public_id`, `image_alt_text`, `image_status`, `base_price_pkr`, `is_featured`, `is_available`, `display_order`, `created_at`.
- **`product_variants`**: `id`, `product_id`, `name`, `price_pkr`, `is_available`, `display_order`.
- **`product_modifier_groups`**: `id`, `product_id`, `name`, `min_selection`, `max_selection`, `isRequired`.
- **`product_modifiers`**: `id`, `group_id`, `name`, `price_pkr`, `is_available`.
- **`delivery_areas`**: `id`, `name`, `slug`, `delivery_fee_pkr`, `estimated_delivery_mins`, `is_active`, `display_order`.
- **`restaurant_settings`**: `key`, `value`, `updated_at`.
- **`restaurant_schedules`**: `id`, `day_of_week`, `open_time`, `close_time`, `is_closed`.
- **`promotions`**, **`promotion_rules`**, **`promotion_rule_options`**: complete promotion tables.
- **`orders`**, **`order_items`**, **`order_item_modifiers`**, **`order_status_history`**: complete ordering pipeline.
- **`profiles`**: stores user accounts with role `ADMIN`, `KITCHEN_STAFF`, `RIDER`, `CUSTOMER`.

### Schema Deficiencies to Remediate:
1. `products` table lacks an `is_archived` boolean flag, `updated_at` timestamp, and `tags TEXT[]`.
2. `categories` table lacks an `is_archived` boolean flag and `updated_at` timestamp.
3. No `audit_logs` table exists to capture administrative mutations.
4. No `media_assets` table exists to register Cloudinary media library uploads.

---

## 4. Security & Authorization Analysis

1. **Role Enforcement**:
   - Only users with verified `role === 'ADMIN'` in the `profiles` table are permitted to execute admin API routes.
   - All admin endpoints must call `await enforceRole(["ADMIN"])`.
   - Never use Supabase Service Role key in the browser.
2. **Cloudinary Asset Security**:
   - Cloudinary API Secret must never be exposed to the browser.
   - Device image uploads must use server-side HMAC-SHA1 signed parameters (`/api/v1/admin/media/sign`).
   - Browser uploads direct to `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` with the signed payload.
3. **Data Integrity & Historical Orders**:
   - Never delete products that have historical order references (`order_items.product_id`).
   - Archive products (`is_archived = true`, `is_available = false`) instead of dropping records.
   - Category deletions are prohibited if active products are assigned.

---

## 5. UI/UX Assessment & Redesign Scope

The existing `/admin/page.tsx` is over 2,100 lines and tightly couples order rendering with settings forms. To provide a professional, responsive, and maintainable workspace:
- **Layout Structure**:
  - Modern desktop dashboard layout with a collapsible sidebar and clean header.
  - Mobile-first responsive drawer and bottom sheets for forms.
  - Tab navigation across all 12 key functional sections.
  - Cohesive design system supporting light mode default and dark mode.
- **Components Modularization**:
  - Break down into dedicated admin components:
    - Overview KPIs & Quick Actions
    - Menu Items Table / Card Grid with Search & Filters
    - Product Create / Edit Modal with Tabs (General, Variants, Modifiers, Images, Tags)
    - Categories Management Drawer & Table
    - Deals & Promotions Management
    - Modifiers & Add-ons Library
    - Media Library with Drag-and-Drop Cloudinary Upload
    - Delivery Areas & Schedules
    - Staff & Audit Logs
