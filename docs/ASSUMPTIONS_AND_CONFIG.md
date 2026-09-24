# Cluck N Moo (CNM) — Assumptions & Admin Configurable Registry

## 1. Explicit System Assumptions

1. **Guest Checkout Priority**:
   - Customers can place orders without registering an account or verifying an OTP beforehand.
   - For guests, order ownership and live tracking are secured via a unique cryptographic `tracking_token` stored in the browser's local state and embedded in the order tracking link (`/order/track/[token]`).
2. **Mandatory Phone Confirmation**:
   - Order fulfillment does not start automatically upon checkout.
   - Every incoming order enters the `New` state. Restaurant staff must contact the customer via the recorded `customer_phone_snapshot` to confirm the order before moving it to `Confirmed`.
3. **Monetary Precision**:
   - All monetary values are in Pakistani Rupees (PKR) and modeled as whole integers (no decimals/paisas).
4. **Initial Payment Method**:
   - Strictly Cash:
     - For Delivery: Cash on Delivery (COD) collected by the rider.
     - For Pickup: Cash at counter paid by customer.
     - For Dine-in: Cash at counter or at table as selected by customer.
   - The database and architecture are designed so card/online payment gateways (PayFast, JazzCash, Easypaisa) can be plugged in later without altering order schemas.
5. **Dine-In Workflow**:
   - No fixed table reservation numbering is required during ordering.
   - The customer specifies a preferred arrival time (e.g., "7:30 PM") and optional seating preference. Payments can be settled either at the counter or directly at the table.
6. **Delivery Riders**:
   - Riders are in-house employees of Cluck N Moo (not third-party courier APIs). The system assigns orders to staff rider accounts.
7. **Single Branch Scope**:
   - The initial release focuses on the Kharian Main GT Road branch, with location coordinates `(32.8049229, 73.870393)`.
8. **Brand Identity & Media**:
   - No mock or AI-generated logos are to be used as permanent brand assets. The UI utilizes typographic brand styling with the official palette (`#0C0C0C`, `#FF8243`, `#FFFFFF`, `#FFF5EE`) and reserves an explicit container for the official HD logo once supplied.

---

## 2. Admin-Configurable Decisions Registry

The following settings are **never hardcoded** in UI templates or client scripts, and are managed through the database and Admin Dashboard:

| Configurable Item | Default / Seed Value | Storage Location | Admin Control Capabilities |
|---|---|---|---|
| **Delivery Areas** | 11 Kharian areas (Bidermarjan, Damian, Dillo Village, GT Road Kharian, Guliana, Jadanwala, Jinnah Mart HS Block Kharian Cantt, Kharian Cantt, Lalamusa, Malikpur, Marala) | `delivery_areas` table | Add new areas, edit names, toggle active/inactive (e.g. for rainy days), set custom delivery fee per area. |
| **Default Delivery Fee** | `100` PKR | `restaurant_settings` (`default_delivery_fee`) | Increase or decrease base delivery fee. |
| **Operating Hours** | 12:01 PM to 02:00 AM (all days) | `restaurant_schedules` table | Modify opening and closing times per day of week. |
| **Emergency Store Override** | `AUTO` | `restaurant_settings` (`manual_override_status`) | Switch between `AUTO` (follow hours), `FORCE_OPEN`, or `FORCE_CLOSED` (with custom banner message, e.g., "Closed for Friday prayers until 2 PM"). |
| **Branch Contact Details** | Phone: `0302-1949067`, Address: `Main GT Road, near Total Petrol Station / Raza CNG, Kharian, Pakistan` | `restaurant_settings` | Update telephone number, physical address, and coordinates. |
| **Menu Categories** | Burgers, Chicken, Combos, Sides, Drinks | `categories` table | Add, rename, reorder, or disable entire categories. |
| **Menu Products & Prices** | Base items and prices | `products` table | Add items, edit description, upload image, update prices, toggle in-stock / sold out (86 item). |
| **Variants & Modifiers** | Single/Double patty, Extra cheese, sauces | `product_variants`, `product_modifiers` | Manage combo add-ons, required/optional selections, and upcharge fees. |
| **Staff & Roles** | Initial Admin user | `users` table | Create kitchen staff PINs and rider logins. |
