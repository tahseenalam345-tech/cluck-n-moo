-- ==============================================================================
-- Cluck N Moo (CNM) — Migration 0005: Performance Optimization Indexes
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Products sorting & popular picks indexes
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products(display_order);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured) WHERE is_featured = TRUE;

-- 2. Promotions active & display order index
CREATE INDEX IF NOT EXISTS idx_promotions_active_display ON public.promotions(is_active, display_order) WHERE is_active = TRUE;

-- 3. Audit logs indexing for fast admin dashboard retrieval
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- 4. Rider active deliveries composite index
CREATE INDEX IF NOT EXISTS idx_orders_rider_status ON public.orders(assigned_rider_id, status) WHERE assigned_rider_id IS NOT NULL;
