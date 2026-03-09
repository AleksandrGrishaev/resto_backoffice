-- Migration: 141_fix_gobiz_config_rls
-- Description: Fix RLS on gobiz_config - was checking JWT user_metadata.role which doesn't exist
-- Date: 2026-02-05

-- The original policies checked auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
-- but this app stores roles in localStorage/app layer, not in Supabase JWT user_metadata.
-- Simplify to match the pattern used by sales_channels and other tables.

DROP POLICY IF EXISTS "Allow admin read gobiz_config" ON gobiz_config;
DROP POLICY IF EXISTS "Allow admin manage gobiz_config" ON gobiz_config;

CREATE POLICY "Allow read gobiz_config" ON gobiz_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow manage gobiz_config" ON gobiz_config
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
