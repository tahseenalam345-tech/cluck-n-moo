-- ==============================================================================
-- Cluck N Moo (CNM) — Migration 0004: Row Level Security (RLS)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable RLS on All Tables
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_schedules ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Storefront / Public Read Policies (Accessible to anon and authenticated)
-- ------------------------------------------------------------------------------

-- Delivery Areas
CREATE POLICY "Public read active delivery areas" ON public.delivery_areas
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE OR public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Admin manage delivery areas" ON public.delivery_areas
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- Categories
CREATE POLICY "Public read active categories" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE OR public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Admin manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- Products
CREATE POLICY "Public read available products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_available = TRUE OR public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Admin manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- Product Variants
CREATE POLICY "Public read available product variants" ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (is_available = TRUE OR public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Admin manage product variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- Product Modifier Groups
CREATE POLICY "Public read modifier groups" ON public.product_modifier_groups
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Admin manage modifier groups" ON public.product_modifier_groups
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- Product Modifiers
CREATE POLICY "Public read available modifiers" ON public.product_modifiers
  FOR SELECT TO anon, authenticated
  USING (is_available = TRUE OR public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Admin manage modifiers" ON public.product_modifiers
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- Restaurant Settings & Schedules
CREATE POLICY "Public read restaurant settings" ON public.restaurant_settings
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Admin manage restaurant settings" ON public.restaurant_settings
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Public read restaurant schedules" ON public.restaurant_schedules
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Admin manage restaurant schedules" ON public.restaurant_schedules
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- ------------------------------------------------------------------------------
-- 3. User Profiles & Addresses Policies
-- ------------------------------------------------------------------------------

-- Profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Users update own profile non-role fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (
    -- Prevent customers from escalating role to staff/admin
    (public.get_auth_user_role() = 'ADMIN') OR
    (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );

-- Customer Addresses
CREATE POLICY "Users view own addresses" ON public.customer_addresses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_auth_user_role() = 'ADMIN');

CREATE POLICY "Users manage own addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.get_auth_user_role() = 'ADMIN')
  WITH CHECK (user_id = auth.uid() OR public.get_auth_user_role() = 'ADMIN');

-- ------------------------------------------------------------------------------
-- 4. Orders & Order Children Policies
-- ------------------------------------------------------------------------------

-- Orders: Authenticated customers can read their own orders. Staff and Admin can read operational orders.
CREATE POLICY "Customer and staff read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.get_auth_user_role() IN ('ADMIN', 'KITCHEN_STAFF', 'RIDER')
  );

-- Orders: Direct INSERT is forbidden to clients.
-- Placing orders must always be executed server-side via Next.js Server Action / API Route using the Service Role.
-- This guarantees price integrity, coupon validation, and delivery fee calculation cannot be spoofed.

-- Order Items
CREATE POLICY "Customer and staff read order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.get_auth_user_role() IN ('ADMIN', 'KITCHEN_STAFF', 'RIDER'))
    )
  );

-- Order Item Modifiers
CREATE POLICY "Customer and staff read order item modifiers" ON public.order_item_modifiers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_modifiers.order_item_id
        AND (o.user_id = auth.uid() OR public.get_auth_user_role() IN ('ADMIN', 'KITCHEN_STAFF', 'RIDER'))
    )
  );

-- Order Status History
CREATE POLICY "Customer and staff read order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.user_id = auth.uid() OR public.get_auth_user_role() IN ('ADMIN', 'KITCHEN_STAFF', 'RIDER'))
    )
  );
