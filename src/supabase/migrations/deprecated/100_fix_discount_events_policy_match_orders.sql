-- Migration: 100_fix_discount_events_policy_match_orders
-- Description: Fix RLS policy to exactly match orders/payments tables (TO public, not TO authenticated)
-- Date: 2025-12-04
-- Author: Claude Code

-- CONTEXT:
-- Migration 099 created policy with TO authenticated, but it doesn't work
-- Orders and payments tables use TO public with WITH CHECK (auth.role() = 'authenticated')
-- Need to match exactly the same pattern

-- PROBLEM:
-- Current policy: TO authenticated WITH CHECK (true)
-- Working policy (orders/payments): TO public WITH CHECK (auth.role() = 'authenticated')

-- SOLUTION:
-- Use exact same policy structure as orders/payments tables

-- Drop existing policy
DROP POLICY IF EXISTS discount_events_create ON discount_events;

-- Create policy matching orders/payments pattern EXACTLY
CREATE POLICY "Authenticated users can create discount events" ON discount_events
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'authenticated');

-- Reload PostgREST schema cache to ensure policy is active
NOTIFY pgrst, 'reload schema';

-- VALIDATION:
-- SELECT policyname, roles, with_check
-- FROM pg_policies
-- WHERE tablename = 'discount_events' AND cmd = 'INSERT';
-- Expected: roles = {public}, with_check = (auth.role() = 'authenticated'::text)
