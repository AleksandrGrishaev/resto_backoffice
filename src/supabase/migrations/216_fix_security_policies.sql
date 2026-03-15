-- Migration: 216_fix_security_policies
-- Description: Fix overly permissive RLS policies that let website customers write to admin-only tables
-- Date: 2026-03-16
--
-- CONTEXT: Website customers authenticate as 'authenticated' role (same as staff).
-- Staff users exist in public.users table. We use this to distinguish them.

-- ============================================================
-- 1. Helper function: is_staff()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ============================================================
-- 2. Fix order_counters: remove authenticated access
--    Only SECURITY DEFINER RPCs need to write here
-- ============================================================
DROP POLICY IF EXISTS "order_counters_all" ON order_counters;

-- No authenticated access at all — RPCs use SECURITY DEFINER
CREATE POLICY "order_counters_service_only" ON order_counters
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Staff can read (for debugging) but not write
CREATE POLICY "order_counters_staff_read" ON order_counters
  FOR SELECT TO authenticated
  USING (is_staff());

-- ============================================================
-- 3. Fix website_settings: write restricted to staff
-- ============================================================
-- Keep anon read (web-winter needs it)
-- Keep authenticated read

-- Drop permissive write policies
DROP POLICY IF EXISTS "website_settings_auth_write" ON website_settings;
DROP POLICY IF EXISTS "website_settings_auth_update" ON website_settings;

-- Staff-only write
CREATE POLICY "website_settings_staff_write" ON website_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "website_settings_staff_update" ON website_settings
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- ============================================================
-- 4. Fix menu-images storage: write restricted to staff
-- ============================================================
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete menu images" ON storage.objects;
-- Keep public read

-- Staff-only write
CREATE POLICY "Staff can upload menu images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND is_staff());

CREATE POLICY "Staff can update menu images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images' AND is_staff());

CREATE POLICY "Staff can delete menu images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND is_staff());

-- ============================================================
-- 5. Validation
-- ============================================================
DO $$
BEGIN
  -- Verify is_staff function exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_staff') THEN
    RAISE EXCEPTION 'is_staff() function not created';
  END IF;
  RAISE NOTICE 'Migration 216: Security policies fixed successfully';
END $$;
