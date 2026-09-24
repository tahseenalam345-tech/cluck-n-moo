# Cluck N Moo (CNM) — Normalized Database Schema Specification

## 1. Schema Design Principles
1. **Third Normal Form (3NF)** for operational data (categories, products, variants, modifiers, areas, users).
2. **Immutable Snapshot Pattern** for order placement:
   - Past orders must be legally and historically accurate even if prices are updated, products are deleted, customer addresses change, or delivery area boundaries are modified.
3. **Explicit Enums**: Strong constraints on order types, order statuses, payment methods, and roles.
4. **Timezone Uniformity**: All timestamps stored in UTC ISO format, converted to `Asia/Karachi` (PKT) in business presentation logic.

---

## 2. Entity Relational Diagram

```
+------------------+          +-----------------------+          +-----------------------+
|    categories    | 1      * |       products        | 1      * |   product_variants    |
|------------------+----------+-----------------------+----------+-----------------------|
| id (PK)          |          | id (PK)               |          | id (PK)               |
| name             |          | category_id (FK)      |          | product_id (FK)       |
| slug             |          | name, slug, desc      |          | name (e.g. Single)    |
| display_order    |          | base_price (PKR)      |          | price (PKR)           |
| is_active        |          | is_available          |          | is_available          |
+------------------+          +-----------+-----------+          +-----------------------+
                                          | 1
                                          | *
                              +-----------v-----------+          +-----------------------+
                              | product_mod_groups    | 1      * |   product_modifiers   |
                              |-----------------------+----------+-----------------------|
                              | id (PK)               |          | id (PK)               |
                              | product_id (FK)       |          | group_id (FK)         |
                              | name, min_sel, max_sel|          | name, price (PKR)     |
                              +-----------------------+          +-----------------------+

+--------------------+        +-----------------------+          +-----------------------+
|       users        | 1    * |   customer_addresses  |          |    delivery_areas     |
|--------------------+--------+-----------------------|          |-----------------------|
| id (PK)            |        | id (PK)               |          | id (PK)               |
| phone, email       |        | user_id (FK)          |          | name, slug            |
| password_hash      |        | delivery_area_id (FK)-+--------->| delivery_fee (PKR)    |
| full_name          |        | address_line, landmark|          | is_active             |
| role               |        | is_default            |          | display_order         |
+---------+----------+        +-----------------------+          +-----------------------+
          | 1
          | *
+---------v----------+        +-----------------------+          +-----------------------+
|       orders       | 1    * |      order_items      | 1      * |  order_item_modifiers |
|--------------------+--------+-----------------------+----------+-----------------------|
| id (PK)            |        | id (PK)               |          | id (PK)               |
| order_number (TXT) |        | order_id (FK)         |          | order_item_id (FK)    |
| user_id (FK, opt)  |        | product_id (FK, opt)  |          | modifier_id (FK, opt) |
| order_type (ENUM)  |        | product_name_snapshot |          | name_snapshot         |
| status (ENUM)      |        | variant_name_snapshot |          | price_snapshot (PKR)  |
| subtotal_pkr       |        | unit_price_snapshot   |          +-----------------------+
| delivery_fee_pkr   |        | quantity              |
| total_pkr          |        | line_total_pkr        |
| customer_name_snap |        +-----------------------+
| customer_phone_snap|
| delivery_area_snap |        +-----------------------+          +-----------------------+
| address_snapshot   |        | order_status_history  |          |  restaurant_schedules |
| dine_in_pref_time  |        |-----------------------|          |-----------------------|
| assigned_rider_id  |        | id (PK), order_id(FK) |          | day_of_week (0..6)    |
| created_at, ...    |        | from_status, to_status|          | open_time (12:01)     |
+--------------------+        | changed_by, note      |          | close_time (02:00)    |
                              +-----------------------+          | is_closed             |
                                                                 +-----------------------+
```

---

## 3. Data Dictionary

### Table: `delivery_areas`
Editable directly from Admin Dashboard. Initialized with Kharian areas.
- `id`: `TEXT PRIMARY KEY` (UUID)
- `name`: `TEXT NOT NULL UNIQUE` (e.g. "Bidermarjan", "Damian", "Kharian Cantt")
- `slug`: `TEXT NOT NULL UNIQUE`
- `delivery_fee_pkr`: `INTEGER NOT NULL DEFAULT 100`
- `estimated_delivery_mins`: `INTEGER NOT NULL DEFAULT 40`
- `is_active`: `INTEGER NOT NULL DEFAULT 1` (Boolean 0/1)
- `display_order`: `INTEGER NOT NULL DEFAULT 0`
- `created_at`: `TEXT NOT NULL`
- `updated_at`: `TEXT NOT NULL`

### Table: `categories`
- `id`: `TEXT PRIMARY KEY`
- `name`: `TEXT NOT NULL`
- `slug`: `TEXT NOT NULL UNIQUE`
- `display_order`: `INTEGER NOT NULL DEFAULT 0`
- `is_active`: `INTEGER NOT NULL DEFAULT 1`

### Table: `products`
- `id`: `TEXT PRIMARY KEY`
- `category_id`: `TEXT NOT NULL REFERENCES categories(id)`
- `name`: `TEXT NOT NULL`
- `slug`: `TEXT NOT NULL UNIQUE`
- `description`: `TEXT`
- `image_url`: `TEXT`
- `base_price_pkr`: `INTEGER NOT NULL DEFAULT 0`
- `is_featured`: `INTEGER NOT NULL DEFAULT 0`
- `is_available`: `INTEGER NOT NULL DEFAULT 1` (Allows 86'ing/sold-out toggle)

### Table: `orders`
- `id`: `TEXT PRIMARY KEY`
- `order_number`: `TEXT NOT NULL UNIQUE` (e.g., `CNM-2609-0001`)
- `tracking_token`: `TEXT NOT NULL UNIQUE` (Cryptographic unguessable token for guest live tracking)
- `user_id`: `TEXT REFERENCES users(id)` (NULL for guest checkout)
- `order_type`: `TEXT NOT NULL` — CHECK `order_type IN ('DELIVERY', 'PICKUP', 'DINE_IN')`
- `status`: `TEXT NOT NULL` — CHECK `status IN ('New', 'Confirmed', 'Preparing', 'Ready', 'Out for delivery', 'Completed', 'Cancelled')`
- `payment_method`: `TEXT NOT NULL DEFAULT 'CASH'` — CHECK `payment_method IN ('CASH')`
- `payment_status`: `TEXT NOT NULL DEFAULT 'PENDING'` — CHECK `payment_status IN ('PENDING', 'PAID', 'REFUNDED')`
- `payment_location`: `TEXT` — CHECK `payment_location IN ('ON_DELIVERY', 'AT_COUNTER', 'ON_TABLE')`
- **Snapshots**:
  - `customer_name_snapshot`: `TEXT NOT NULL`
  - `customer_phone_snapshot`: `TEXT NOT NULL`
  - `customer_email_snapshot`: `TEXT`
  - `delivery_area_name_snapshot`: `TEXT` (NULL for pickup/dine-in)
  - `delivery_address_snapshot`: `TEXT` (NULL for pickup/dine-in)
  - `delivery_landmark_snapshot`: `TEXT`
  - `dine_in_preferred_time`: `TEXT` (Formatted PKT time string or ISO, for dine-in orders)
  - `special_instructions`: `TEXT`
  - `subtotal_pkr`: `INTEGER NOT NULL`
  - `delivery_fee_pkr`: `INTEGER NOT NULL DEFAULT 0`
  - `total_pkr`: `INTEGER NOT NULL`
- `assigned_rider_id`: `TEXT REFERENCES users(id)`
- `cancellation_reason`: `TEXT`
- `created_at`: `TEXT NOT NULL`
- `updated_at`: `TEXT NOT NULL`

### Table: `order_items`
- `id`: `TEXT PRIMARY KEY`
- `order_id`: `TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
- `product_id`: `TEXT REFERENCES products(id)`
- `product_name_snapshot`: `TEXT NOT NULL`
- `variant_name_snapshot`: `TEXT`
- `unit_price_snapshot_pkr`: `INTEGER NOT NULL`
- `quantity`: `INTEGER NOT NULL CHECK(quantity > 0)`
- `line_total_pkr`: `INTEGER NOT NULL`

### Table: `order_item_modifiers`
- `id`: `TEXT PRIMARY KEY`
- `order_item_id`: `TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE`
- `modifier_id`: `TEXT REFERENCES product_modifiers(id)`
- `modifier_name_snapshot`: `TEXT NOT NULL`
- `price_snapshot_pkr`: `INTEGER NOT NULL DEFAULT 0`

### Table: `restaurant_settings`
Key-value store for global branch parameters:
- `key`: `TEXT PRIMARY KEY`
- `value`: `TEXT NOT NULL` (JSON or plain string)
- *Seed keys*:
  - `restaurant_name`: `"Cluck N Moo"`
  - `tagline`: `"juiciest in town"`
  - `phone`: `"0302-1949067"`
  - `address`: `"Main GT Road, near Total Petrol Station / Raza CNG, Kharian, Pakistan"`
  - `lat`: `32.8049229`
  - `lng`: `73.870393`
  - `default_delivery_fee`: `100`
  - `manual_override_status`: `"AUTO"` (`AUTO` | `FORCE_OPEN` | `FORCE_CLOSED`)
  - `announcement_banner`: `""`
