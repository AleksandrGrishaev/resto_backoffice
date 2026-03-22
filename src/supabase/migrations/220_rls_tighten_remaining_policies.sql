-- Migration: 220_rls_tighten_remaining_policies
-- Description: Tighten remaining loose policies found during code review
-- Date: 2026-03-16
-- Author: Claude Code
--
-- CONTEXT: Follow-up to migration 219 (RLS security overhaul).
-- Code review found 4 remaining issues: discount_events INSERT open to anon auth,
-- product_categories/warehouses readable by anon auth, users policies on {public} role.

-- ============================================================================
-- 1. discount_events: tighten INSERT to staff only
--    Was: {public} INSERT WITH CHECK (auth.uid() IS NOT NULL)
--    Now: {authenticated} INSERT WITH CHECK (is_staff())
-- ============================================================================

DROP POLICY IF EXISTS "discount_events_create" ON discount_events;
CREATE POLICY "discount_events_create" ON discount_events FOR INSERT TO authenticated
  WITH CHECK (is_staff());

-- ============================================================================
-- 2. product_categories: tighten SELECT to staff only
--    Was: {authenticated} SELECT true
--    Now: {authenticated} SELECT is_staff()
--    (Write policy "Allow all for admins" already checks admin role — keep as-is)
-- ============================================================================

DROP POLICY IF EXISTS "Allow read for authenticated users" ON product_categories;
CREATE POLICY "staff_read" ON product_categories FOR SELECT TO authenticated
  USING (is_staff());

-- ============================================================================
-- 3. warehouses: tighten SELECT to staff only
--    Was: {authenticated} SELECT true
--    Now: {authenticated} SELECT is_staff()
--    (Write policy "warehouses_manage_admins" already checks admin/manager — keep as-is)
-- ============================================================================

DROP POLICY IF EXISTS "warehouses_view_authenticated" ON warehouses;
CREATE POLICY "staff_read" ON warehouses FOR SELECT TO authenticated
  USING (is_staff());

-- ============================================================================
-- 4. users: change role from {public} to {authenticated}
--    Functionally identical (anon can't pass auth.uid()=id), but cleaner
-- ============================================================================

DROP POLICY IF EXISTS "users_view_own" ON users;
CREATE POLICY "users_view_own" ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
