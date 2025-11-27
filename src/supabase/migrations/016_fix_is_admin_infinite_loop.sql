-- Migration: 012_fix_is_admin_infinite_loop
-- Description: Fix is_admin() function to prevent infinite loop in RLS policies
-- Date: 2025-11-27
-- Author: Claude Code

-- CONTEXT:
-- The old is_admin() function caused infinite loops:
-- 1. User query: SELECT * FROM users WHERE id = auth.uid()
-- 2. RLS policy calls is_admin()
-- 3. is_admin() does SELECT FROM users (triggers RLS again → infinite loop)
--
-- SOLUTION:
-- Use SECURITY DEFINER to bypass RLS when checking admin role
-- This allows is_admin() to read from users table without triggering RLS

-- Replace function to bypass RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER -- Run with definer's privileges (bypasses RLS)
SET search_path TO 'public'
AS $$
DECLARE
  user_has_admin_role boolean;
BEGIN
  -- Direct query to users table (bypasses RLS because of SECURITY DEFINER)
  SELECT 'admin' = ANY(roles) INTO user_has_admin_role
  FROM users
  WHERE id = auth.uid();

  RETURN COALESCE(user_has_admin_role, false);
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user has admin role (uses SECURITY DEFINER to bypass RLS and prevent infinite loop)';

-- POST-MIGRATION VALIDATION
-- Verify function exists and has correct security mode
DO $$
DECLARE
  func_count int;
  is_security_definer boolean;
BEGIN
  -- Check function exists
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'is_admin'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF func_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: is_admin() function not found';
  END IF;

  -- Check SECURITY DEFINER
  SELECT prosecdef INTO is_security_definer
  FROM pg_proc
  WHERE proname = 'is_admin'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF NOT is_security_definer THEN
    RAISE EXCEPTION 'Migration failed: is_admin() is not SECURITY DEFINER';
  END IF;

  RAISE NOTICE '✅ Migration successful: is_admin() function fixed';
END $$;
