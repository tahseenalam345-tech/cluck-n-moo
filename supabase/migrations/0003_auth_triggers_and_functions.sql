-- ==============================================================================
-- Cluck N Moo (CNM) — Migration 0003: Auth Triggers & Helper Functions
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Automatic Profile Creation Trigger on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name, role)
  VALUES (
    new.id,
    new.phone,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'CNM Customer'),
    COALESCE((new.raw_app_meta_data->>'role')::public.user_role_enum, 'CUSTOMER')
  )
  ON CONFLICT (id) DO UPDATE
  SET phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if already exists and re-create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Helper to fetch user role safely for RLS policies
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role_enum AS $$
DECLARE
  v_role public.user_role_enum;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role, 'CUSTOMER'::public.user_role_enum);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Stored Procedure: Link Guest Orders to Authenticated Profile
CREATE OR REPLACE FUNCTION public.claim_guest_orders(
  p_user_id UUID,
  p_tracking_tokens TEXT[]
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_tracking_tokens IS NULL OR array_length(p_tracking_tokens, 1) = 0 THEN
    RETURN 0;
  END IF;

  -- Ensure caller is operating on their own user_id or is service role
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only claim orders for your own account.';
  END IF;

  UPDATE public.orders
  SET user_id = p_user_id,
      updated_at = now()
  WHERE tracking_token = ANY(p_tracking_tokens)
    AND user_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
