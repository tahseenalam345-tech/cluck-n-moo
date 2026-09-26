# CNM Kitchen & Rider Dashboard Upgrade Report

**Project:** Cluck N Moo (CNM)  
**Date:** September 2026  
**Status:** Completed & Validated  

---

## 1. Executive Summary

This upgrade resolves the operational bottlenecks, usability issues, missing staff data, and access hurdles across the **CNM Kitchen Display System (KDS)** (`/kitchen`) and the **Rider Delivery Dispatch Portal** (`/rider`).

Both workstations have been redesigned into high-density, rush-optimized operational boards connected to live PostgreSQL / Supabase order pipelines. Admins authenticated in the Admin Control Center can now seamlessly navigate to either workstation without secondary login prompts while retaining full administrative override and assignment privileges.

---

## 2. Access and Role Behavior

### Unified Supabase Session Architecture
* **Admin Seamless Access:** Authenticated administrators (`role === "ADMIN"`) can click the newly integrated **Kitchen Display** or **Rider Dispatch** links in the Admin sidebar or mobile drawer and access the workstations immediately. They share the same authenticated Supabase session (`sb-*-auth-token` cookies). No re-authentication or secondary login prompt is triggered.
* **Kitchen Staff (`role === "KITCHEN_STAFF"`):** Restricted exclusively to the Kitchen Display System (`/kitchen`). Can see authorized kitchen orders and advance them through kitchen preparation stages (`NEW` → `CONFIRMED` → `PREPARING` → `READY`). Blocked from Rider Dispatch and Admin settings with a descriptive 403 access barrier.
* **Riders (`role === "RIDER"`):** Restricted exclusively to the Rider Dispatch Portal (`/rider`). Riders see only their assigned deliveries or unassigned ready deliveries, and can perform delivery actions (`OUT_FOR_DELIVERY`, `COMPLETED`).
* **Customer / Unauthenticated Users:** Prevented from accessing operational routes. Unauthenticated visitors are automatically routed to `/staff/login`, while authenticated customer accounts receive a clean, branded 403 Forbidden screen with links back to the storefront.

---

## 3. Root Cause Analysis & Fix: Staff & Rider Names

### Root Cause
Previously, `/api/v1/ops/orders` called `getOpsOrders` in `src/db/postgres/repositories/orderRepository.ts`. This query selected records from the `orders` table directly, which only stored foreign keys (`assignedRiderId` and `confirmedByStaffId`). It never queried or joined the `profiles` table. As a consequence, `assignedRiderName` and `confirmedByStaffName` were always undefined in the frontend, resulting in blank staff tags or fallback omissions.

### Resolution
1. **Repository Batch Resolution (`src/db/postgres/repositories/orderRepository.ts`):**
   - In `getOpsOrders`, all unique `assignedRiderId` and `confirmedByStaffId` UUIDs are gathered into a batch `Set`.
   - A single optimized query is performed against `profiles` using `inArray(profiles.id, Array.from(staffProfileIds))` to retrieve `fullName` and `phone`.
   - A lookup map (`profileMap`) attaches `assignedRiderName`, `assignedRiderPhone`, and `confirmedByStaffName` to each mapped order.
2. **Type Definition Extension (`src/types/index.ts`):**
   - Added `assignedRiderName?: string | null;`
   - Added `assignedRiderPhone?: string | null;`
   - Added `confirmedByStaffName?: string | null;`
3. **Safe Fallback & Avatar Initials:**
   - If an order is unassigned, the UI shows a visible `"⚠️ Unassigned"` tag with an Admin rider assignment dropdown.
   - If a profile has an incomplete name, it falls back to `"Staff Member"` or `"Assigned Rider"` without crashing or exposing raw UUIDs.

---

## 4. State Machine & Status Workflow

File: `src/lib/stateMachine.ts` & `src/db/postgres/repositories/orderRepository.ts`

### Status Transition Matrix
| From Status | To Status | Allowed Roles | Action Description |
| :--- | :--- | :--- | :--- |
| `NEW` | `CONFIRMED` | ADMIN, KITCHEN_STAFF | Accept incoming online / POS order into the kitchen queue |
| `CONFIRMED` | `PREPARING` | ADMIN, KITCHEN_STAFF | Station chef starts cooking order |
| `PREPARING` | `READY` | ADMIN, KITCHEN_STAFF | Order is packed, bagged, and ready for pickup / delivery |
| `READY` | `OUT_FOR_DELIVERY` | ADMIN, RIDER | Rider picks up order and starts delivery run |
| `OUT_FOR_DELIVERY` | `COMPLETED` | ADMIN, RIDER | Rider delivers food and collects cash from customer |
| Any Status | Same Status | ADMIN | Allows Admin to assign/reassign rider or update notes without forced status changes |

---

## 5. Kitchen Display System (KDS) Redesign

Route: `/kitchen`

### Key Features
1. **Operational Summary KPI Bar:**
   - **New Orders:** Orders awaiting kitchen confirmation.
   - **Queued (Confirmed):** Orders queued for cooking.
   - **In Kitchen (Cooking):** Actively on the grill/fryer.
   - **Ready for Handover:** Packed and ready for customer pickup or delivery rider.
   - **SLA Rush Warning:** Live counter of orders placed > 20 minutes ago still not marked ready.
2. **Search, Sort, & Filter Controls:**
   - Real-time debounced search by order number, customer name, customer phone, or menu item name.
   - Filter by Order Type: All Types, Delivery, Pickup, Dine-in.
   - Filter by Status: All, New, Confirmed, Preparing, Ready.
   - Sort by: Oldest First (Rush Priority), Newest First, Order Number.
   - Quick "Reset Filters" action.
3. **High-Density Kanban Board:**
   - Three distinct operational workflow columns: **Queued / Accepted**, **Preparing (Cooking)**, and **Ready for Handover**.
   - Compact cards showing order #, elapsed time badge (with red SLA alert if > 20m), customer name, item count, concise item preview (e.g. `2x Zinger Burger + 2 more`), and special instructions banner.
   - Direct touch/click action buttons: **Accept**, **Start Prep**, **Mark Ready**.
4. **Order Detail Drawer / Modal:**
   - Displays full customer details, phone number, and assigned rider name.
   - Itemized breakdown of all products, quantities, prices, sizes/variants, and modifier extras.
   - Kitchen special instructions and notes.
   - Total PKR summary.

---

## 6. Rider Delivery Dispatch Redesign

Route: `/rider`

### Key Features
1. **Dispatch Overview KPI Bar:**
   - **Unassigned Orders:** Delivery orders ready for dispatch without an assigned rider.
   - **Ready for Pickup:** Orders packed and waiting at counter.
   - **Out for Delivery:** Active transit runs on the road.
   - **Delivered Today:** Successful completed runs for the current day.
   - **Active Fleet Riders:** Total number of active delivery personnel.
2. **Admin Rider Assignment Workflow:**
   - Admin dropdown queries real active riders via `/api/v1/admin/staff`.
   - Displays rider's full name and their current active delivery workload (e.g. `Ali Raza (1 active)`).
   - Changing the rider immediately updates the database via `/api/v1/orders/[id]/status` with zero full-page reloads.
3. **Rider Personal View vs Admin Dispatch View:**
   - Admin can toggle between `"All Dispatch"` and `"Rider Mode"`.
   - Riders automatically see their own assigned active runs and unassigned orders ready for pickup.
4. **Delivery Card Actions:**
   - One-tap customer call button (`tel:...`).
   - One-tap Google Maps directions link (`https://www.google.com/maps/search/?api=1&query=...`).
   - Prominent cash-to-collect banner (total PKR).
   - Instant status triggers: **Pick Up & Dispatch** → **Delivered & Collected**.
5. **Delivery Detail Drawer / Modal:**
   - Full customer contact, landmark, and delivery address.
   - Itemized product list and special customer delivery instructions.
   - Reassignment controls for administrators.

---

## 7. Performance & Realtime Architecture

* **Zero Full-Page Reloads:** All status updates and rider assignments execute with immediate optimistic UI updates (< 10ms visual feedback) followed by background server persistence.
* **Automatic Rollback:** If network persistence fails, UI automatically rolls back to the previous state with an error toast.
* **Polling & Sync:** Background polling (6s on Kitchen, 8s on Rider) ensures workstation displays stay synchronized across kitchen tablets, rider phones, and admin desktops.
* **Polished Light & Dark Theme:** Built-in theme switchers and styled CSS variables (`var(--cnm-bg)`, `var(--cnm-surface)`, etc.) ensure high contrast, readability, and theme persistence without flash.

---

## 8. Files Changed

1. `src/types/index.ts` — Added `assignedRiderName`, `assignedRiderPhone`, `confirmedByStaffName` to `Order` interface.
2. `src/db/postgres/repositories/orderRepository.ts` — Implemented batch profile lookup in `getOpsOrders`; updated role filters for `KITCHEN_STAFF` and `RIDER`.
3. `src/lib/stateMachine.ts` — Allowed same-status updates for `ADMIN` (enabling rider assignment); allowed `KITCHEN_STAFF` to transition `NEW` to `CONFIRMED`.
4. `src/components/admin/AdminIcons.tsx` — Added SVG components `KitchenIcon` and `RiderIcon`.
5. `src/components/admin/AdminShell.tsx` — Integrated direct **Kitchen Display** and **Rider Dispatch** navigation links in desktop sidebar and mobile slide-out drawer.
6. `src/app/kitchen/page.tsx` — Full rewrite with compact Kanban board, KPI overview, search/filters, order drawer, and light/dark theme.
7. `src/app/rider/page.tsx` — Full rewrite with dispatch workflow, rider assignment dropdown, map links, call shortcuts, detail drawer, and light/dark theme.
8. `docs/KITCHEN_RIDER_DASHBOARD_UPGRADE_REPORT.md` — Comprehensive architectural documentation and operational report.
