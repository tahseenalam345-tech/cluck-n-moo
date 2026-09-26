# CNM Admin–Kitchen–Rider Staff, Assignment & Role Access Fix Report

**Date:** September 26, 2026  
**System:** Cluck N Moo (CNM) Operational Platform  
**Target Modules:** Supabase Auth, PostgreSQL Profiles, Admin Center, Kitchen Dashboard (`/kitchen`), Rider Dashboard (`/rider`), Operations Order Pipeline  

---

## 1. Executive Summary

This report documents the resolution of staff creation data anomalies, rider assignment visibility defects, and role-based access control discrepancies across the Cluck N Moo administration and operational platforms.

All staff accounts and operational data are verified against real Supabase Auth and PostgreSQL records.

---

## 2. Root Cause Analysis: Staff Disappearance & Overwriting

### A. Database Trigger Misconfiguration (`public.handle_new_user`)
- **Vulnerability:** The Supabase database trigger `handle_new_user()` previously only inspected `new.raw_app_meta_data->>'role'`. When staff users were created with `user_metadata` or without synchronous app metadata, the trigger evaluated the role as `NULL` and defaulted to `'CUSTOMER'`.
- **Destructive Upsert:** Furthermore, the trigger's `ON CONFLICT (id) DO UPDATE` omitted updating the `role` column, causing staff accounts to become permanently locked in `'CUSTOMER'` status.
- **Query Filter:** The Admin Staff query (`SELECT ... FROM profiles WHERE role != 'CUSTOMER'`) naturally omitted these accounts, making them instantly disappear from the Admin UI upon creation.

### B. Unique Constraint Collision on Phone Numbers
- Empty phone strings (`""`) were being passed instead of `NULL`. PostgreSQL's `UNIQUE` constraint permits multiple `NULL` values but strictly rejects duplicate non-null strings like `""`. This caused staff insertions with empty phone numbers to fail or overwrite existing records.

### C. Client & Cache Stale State
- Stale client caches were not immediately invalidated after creating a new staff member, causing the UI to briefly show an incomplete list until a manual hard refresh.

---

## 3. Database, Profile & Auth Fixes Applied

### A. Repaired PostgreSQL Trigger Function
The database trigger `public.handle_new_user()` was updated in PostgreSQL:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role_enum := 'CUSTOMER';
  v_raw_role text;
  v_full_name text;
  v_phone text;
BEGIN
  -- Read role from app_metadata first, fallback to user_metadata
  v_raw_role := COALESCE(
    new.raw_app_meta_data->>'role',
    new.raw_user_meta_data->>'role'
  );

  IF v_raw_role = 'ADMIN' THEN
    v_role := 'ADMIN';
  ELSIF v_raw_role = 'KITCHEN_STAFF' THEN
    v_role := 'KITCHEN_STAFF';
  ELSIF v_raw_role = 'RIDER' THEN
    v_role := 'RIDER';
  ELSE
    v_role := 'CUSTOMER';
  END IF;

  v_full_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(new.raw_app_meta_data->>'full_name'), ''),
    NULLIF(TRIM(new.email), ''),
    'CNM Staff'
  );

  v_phone := NULLIF(TRIM(COALESCE(
    new.phone,
    new.raw_user_meta_data->>'phone',
    new.raw_app_meta_data->>'phone'
  )), '');

  INSERT INTO public.profiles (id, full_name, email, phone, role, is_active, created_at, updated_at)
  VALUES (
    new.id,
    v_full_name,
    LOWER(TRIM(new.email)),
    v_phone,
    v_role,
    true,
    COALESCE(new.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = CASE 
      WHEN EXCLUDED.role != 'CUSTOMER' THEN EXCLUDED.role 
      ELSE profiles.role 
    END,
    is_active = true,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
```

### B. Staff API Route (`/api/v1/admin/staff`)
- **Metadata Synchronization:** In `POST /api/v1/admin/staff`, both `user_metadata` and `app_metadata` are explicitly populated with the staff role (`KITCHEN_STAFF`, `RIDER`, or `ADMIN`) during `supabaseAdmin.auth.admin.createUser`.
- **Pre-emptive Phone Validation:** Validates that non-empty phone numbers do not collide with existing profiles, and sanitizes empty strings to `null`.
- **Upsert Resilience:** In `GET /api/v1/admin/staff`, the auto-healing loop now uses `.onConflictDoUpdate` rather than `.onConflictDoNothing`, ensuring any previously created staff account stuck in `CUSTOMER` state is automatically promoted to its proper staff role.
- **Optimistic Appending & Refetching:** Client UI receives the full updated record and triggers an immediate background refetch, guaranteeing zero UI disappearance.

---

## 4. Rider Assignment Query & Multi-Tenant Isolation

### A. Root Cause of Missing Rider Names in Dropdowns
1. **Unassigned / Blank Full Names:** Several profile records had default fallback names or null full names.
2. **Missing In-Flight Rider Data:** `AdminOrdersSection` previously fetched available riders only once on page mount. Newly added riders were missing until a full reload.
3. **Card Slot Fallback:** In the order cards and board columns, assigned rider display checked a local cache array instead of utilizing `ord.assignedRiderName` returned directly by the server query.

### B. Fixes Applied
1. **Dynamic Rider Query:** Added `fetchActiveRiders` to `AdminOrdersSection`, which runs automatically on mount and re-fetches whenever an order detail modal is opened.
2. **Real Rider Data Mapping:** The rider assignment select renders:
   - Full Name
   - Active deliveries count: `(X active deliveries)`
   - Phone number: `• +92300...`
3. **Empty State & Deep Link:** If no active riders exist, the UI displays:
   > ⚠️ *No active riders available. Add or activate a Rider from Staff & Riders.*
   Together with a direct `+ Go to Staff & Riders` button.
4. **Optimistic Order Assignment:** When assigning a rider, `AdminOrdersSection` instantly patches the order in local state with `assignedRiderId` and `assignedRiderName`, preventing UI flicker or page reloading.
5. **Strict Rider Order Isolation:** Updated `getOpsOrders()` in `src/db/postgres/repositories/orderRepository.ts` to strictly enforce:
   ```ts
   if (staff.role === "RIDER") {
     conditions.push(eq(orders.orderType, "DELIVERY"));
     conditions.push(inArray(orders.status, ["Ready", "Out for delivery", "Completed"]));
     conditions.push(eq(orders.assignedRiderId, staff.userId)); // Strict ownership
   }
   ```
   Riders can only view orders assigned directly to their own unique user ID.

---

## 5. Role-Based Navigation & "← Back to Admin Center" Button

### A. Navigation Controls on Kitchen & Rider Pages
1. **Kitchen Dashboard (`src/app/kitchen/page.tsx`):**
   - Renders `← Back to Admin Center` **strictly** if `currentUser?.role === 'ADMIN'`.
   - Hidden completely for `KITCHEN_STAFF` and `RIDER`.
2. **Rider Dashboard (`src/app/rider/page.tsx`):**
   - Renders `← Back to Admin Center` **strictly** if `currentUser?.role === 'ADMIN'`.
   - Hidden completely for `RIDER` and `KITCHEN_STAFF`.

### B. Route Access & Authorization Enforcement
1. **Admin Control Center (`src/app/admin/page.tsx`):**
   - Checks role upon authentication. If `role === 'KITCHEN_STAFF'`, immediately redirects to `/kitchen`.
   - If `role === 'RIDER'`, immediately redirects to `/rider`.
   - If `role === 'CUSTOMER'` or unauthenticated, redirects to `/staff/login` with `returnUrl`.
2. **Cross-Operational Separation:**
   - A `KITCHEN_STAFF` navigating to `/rider` is redirected to `/kitchen`.
   - A `RIDER` navigating to `/kitchen` is redirected to `/rider`.
   - Neither role has access to admin settings, staff management, promotions, catalog editing, or business controls.

---

## 6. Verification & Test Results

### Flow 1: Staff Creation & Persistence (No Overwrite)
- **Test:** Added verification script creating a new Rider via Auth and DB profiles, checking for count progression ($N \to N+1$) and verifying all preexisting profiles.
- **Result:** **PASSED**. All existing staff (Admins, Kitchen Staff, Riders) retained their exact UUIDs, roles, and records.

### Flow 2: Active Rider Dropdown & Assignment
- **Test:** Selected active delivery order `CNM-2609-4806`, assigned rider `Lead Delivery Rider` (`5e99dca8-04da-4181-97aa-5a8d6694de56`), and checked query results.
- **Result:** **PASSED**.
  - `orders.assigned_rider_id` successfully updated to `5e99dca8-04da-4181-97aa-5a8d6694de56`.
  - Order appeared with `assignedRiderName: 'Lead Delivery Rider'`.

### Flow 3: Rider Order Multi-Tenant Isolation
- **Test:** Queried operational orders as Rider 1 (`5e99dca8-...`) vs Rider 2 (`2500f9a6-...`).
- **Result:** **PASSED**.
  - Rider 1 saw the assigned order.
  - Rider 2 saw **0** orders assigned to Rider 1. Strict multi-tenant isolation confirmed.

### Flow 4: TypeScript & Production Next.js Build
- **Command:** `npx tsc --noEmit` & `npm run build`
- **Result:** **PASSED**. Exit code `0`. 16 static/dynamic routes compiled cleanly without errors.

---

## 7. Current Staff Database Status

All active staff records currently healed and present in PostgreSQL:

| Role | Name | Email | Auth ID |
|---|---|---|---|
| **ADMIN** | Tahseen Alam (Admin) | `tahseenalam345@gmail.com` | `24489837-d0cd-4e34-90fa-116583ee57fc` |
| **KITCHEN_STAFF** | Head Chef (Kitchen) | `kitchen@clucknmoo.com` | `72ae922d-4659-43d8-98d4-f2fb27630b01` |
| **KITCHEN_STAFF** | tariq | `tariq@gmail.com` | `d19ce474-783e-4164-9594-4d2c70dcdd53` |
| **KITCHEN_STAFF** | tariq1 | `tariq1@gmail.com` | `82f8b4f6-1877-4478-ba95-e899a365d932` |
| **RIDER** | Lead Delivery Rider | `rider@clucknmoo.com` | `5e99dca8-04da-4181-97aa-5a8d6694de56` |
| **RIDER** | bhu | `bhu@gmail.com` | `2500f9a6-3f04-4067-822b-f941ad0442c0` |

---

## 8. Remaining Items / Maintenance Notes
- None. All components compile, pass type checking, and run on live connected PostgreSQL and Supabase Auth data.
