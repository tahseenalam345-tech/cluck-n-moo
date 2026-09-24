-- ==============================================================================
-- Cluck N Moo (CNM) — Migration 0001: Core Schema & Enums
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.user_role_enum AS ENUM ('CUSTOMER', 'KITCHEN_STAFF', 'RIDER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_type_enum AS ENUM ('DELIVERY', 'PICKUP', 'DINE_IN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status_enum AS ENUM (
    'New',
    'Confirmed',
    'Preparing',
    'Ready',
    'Out for delivery',
    'Completed',
    'Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method_enum AS ENUM ('CASH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status_enum AS ENUM ('PENDING', 'PAID', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.image_status_enum AS ENUM ('PENDING', 'SYNCED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Delivery Areas
CREATE TABLE IF NOT EXISTS public.delivery_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  delivery_fee_pkr INTEGER NOT NULL DEFAULT 100 CHECK (delivery_fee_pkr >= 0),
  estimated_delivery_mins INTEGER NOT NULL DEFAULT 40 CHECK (estimated_delivery_mins > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Products
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  cloudinary_public_id TEXT,
  image_alt_text TEXT,
  image_status public.image_status_enum NOT NULL DEFAULT 'PENDING',
  base_price_pkr INTEGER NOT NULL DEFAULT 0 CHECK (base_price_pkr >= 0),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_pkr INTEGER NOT NULL CHECK (price_pkr >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 6. Product Modifier Groups
CREATE TABLE IF NOT EXISTS public.product_modifier_groups (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selection INTEGER NOT NULL DEFAULT 0 CHECK (min_selection >= 0),
  max_selection INTEGER NOT NULL DEFAULT 1 CHECK (max_selection >= min_selection),
  is_required BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7. Product Modifiers
CREATE TABLE IF NOT EXISTS public.product_modifiers (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES public.product_modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_pkr INTEGER NOT NULL DEFAULT 0 CHECK (price_pkr >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. Customer Profiles (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role public.user_role_enum NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Customer Addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivery_area_id TEXT REFERENCES public.delivery_areas(id) ON DELETE SET NULL,
  address_line TEXT NOT NULL,
  landmark TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  tracking_token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_type public.order_type_enum NOT NULL,
  status public.order_status_enum NOT NULL DEFAULT 'New',
  payment_method public.payment_method_enum NOT NULL DEFAULT 'CASH',
  payment_status public.payment_status_enum NOT NULL DEFAULT 'PENDING',
  payment_location TEXT,
  customer_name_snapshot TEXT NOT NULL,
  customer_phone_snapshot TEXT NOT NULL,
  customer_email_snapshot TEXT,
  delivery_area_name_snapshot TEXT,
  delivery_address_snapshot TEXT,
  delivery_landmark_snapshot TEXT,
  dine_in_preferred_time TEXT,
  special_instructions TEXT,
  subtotal_pkr INTEGER NOT NULL CHECK (subtotal_pkr >= 0),
  delivery_fee_pkr INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_pkr >= 0),
  discount_pkr INTEGER NOT NULL DEFAULT 0 CHECK (discount_pkr >= 0),
  discount_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000 CHECK (discount_rate >= 0),
  discount_type TEXT DEFAULT NULL,
  custom_deal_subtotal_pkr INTEGER NOT NULL DEFAULT 0 CHECK (custom_deal_subtotal_pkr >= 0),
  total_pkr INTEGER NOT NULL CHECK (total_pkr >= 0),
  assigned_rider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_by_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  variant_name_snapshot TEXT,
  unit_price_snapshot_pkr INTEGER NOT NULL CHECK (unit_price_snapshot_pkr >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_pkr INTEGER NOT NULL CHECK (line_total_pkr >= 0),
  custom_deal_id TEXT DEFAULT NULL
);

-- 12. Order Item Modifiers
CREATE TABLE IF NOT EXISTS public.order_item_modifiers (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  modifier_id TEXT REFERENCES public.product_modifiers(id) ON DELETE SET NULL,
  modifier_name_snapshot TEXT NOT NULL,
  price_snapshot_pkr INTEGER NOT NULL DEFAULT 0 CHECK (price_snapshot_pkr >= 0)
);

-- 13. Order Status History
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status_enum,
  to_status public.order_status_enum NOT NULL,
  changed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Restaurant Settings
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Restaurant Schedules
CREATE TABLE IF NOT EXISTS public.restaurant_schedules (
  id TEXT PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TEXT NOT NULL DEFAULT '12:01',
  close_time TEXT NOT NULL DEFAULT '02:00',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE
);
