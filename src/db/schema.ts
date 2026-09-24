/**
 * Cluck N Moo (CNM) Normalized Schema Table Definitions
 * Native SQLite 3 (Node 24 node:sqlite)
 */

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS delivery_areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    delivery_fee_pkr INTEGER NOT NULL DEFAULT 100,
    estimated_delivery_mins INTEGER NOT NULL DEFAULT 40,
    is_active INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    cloudinary_public_id TEXT,
    image_alt_text TEXT,
    image_status TEXT DEFAULT 'PENDING',
    base_price_pkr INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_available INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_pkr INTEGER NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS product_modifier_groups (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_selection INTEGER NOT NULL DEFAULT 0,
    max_selection INTEGER NOT NULL DEFAULT 1,
    is_required INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS product_modifiers (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES product_modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_pkr INTEGER NOT NULL DEFAULT 0,
    is_available INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customer_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivery_area_id TEXT REFERENCES delivery_areas(id),
    address_line TEXT NOT NULL,
    landmark TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    tracking_token TEXT NOT NULL UNIQUE,
    user_id TEXT REFERENCES users(id),
    order_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    payment_location TEXT,
    customer_name_snapshot TEXT NOT NULL,
    customer_phone_snapshot TEXT NOT NULL,
    customer_email_snapshot TEXT,
    delivery_area_name_snapshot TEXT,
    delivery_address_snapshot TEXT,
    delivery_landmark_snapshot TEXT,
    dine_in_preferred_time TEXT,
    special_instructions TEXT,
    subtotal_pkr INTEGER NOT NULL,
    delivery_fee_pkr INTEGER NOT NULL DEFAULT 0,
    total_pkr INTEGER NOT NULL,
    assigned_rider_id TEXT REFERENCES users(id),
    confirmed_by_staff_id TEXT REFERENCES users(id),
    cancellation_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT,
    unit_price_snapshot_pkr INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    line_total_pkr INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id TEXT REFERENCES product_modifiers(id),
    modifier_name_snapshot TEXT NOT NULL,
    price_snapshot_pkr INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS order_status_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_user_id TEXT,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS restaurant_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS restaurant_schedules (
    id TEXT PRIMARY KEY,
    day_of_week INTEGER NOT NULL,
    open_time TEXT NOT NULL DEFAULT '12:01',
    close_time TEXT NOT NULL DEFAULT '02:00',
    is_closed INTEGER NOT NULL DEFAULT 0
  );
`;
