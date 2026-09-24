-- ==============================================================================
-- Cluck N Moo (CNM) — Migration 0002: Indexes & Constraints
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Delivery Areas Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_areas_display ON public.delivery_areas(display_order);
CREATE INDEX IF NOT EXISTS idx_delivery_areas_active ON public.delivery_areas(is_active) WHERE is_active = TRUE;

-- 2. Menu Categories Indexes
CREATE INDEX IF NOT EXISTS idx_categories_display ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active) WHERE is_active = TRUE;

-- 3. Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_display ON public.products(category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = TRUE;

-- 4. Product Variants & Modifiers Indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_product ON public.product_modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_group ON public.product_modifiers(group_id);

-- 5. User Profiles & Addresses Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.customer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_delivery_area ON public.customer_addresses(delivery_area_id);

-- 6. Orders Indexes (Optimized for Tracking & Operational Queries)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_rider ON public.orders(assigned_rider_id) WHERE assigned_rider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_staff ON public.orders(confirmed_by_staff_id) WHERE confirmed_by_staff_id IS NOT NULL;

-- 7. Order Items & Modifiers Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_modifiers_item_id ON public.order_item_modifiers(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_changed_by ON public.order_status_history(changed_by_user_id);

-- 8. Restaurant Schedules Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_day ON public.restaurant_schedules(day_of_week);
