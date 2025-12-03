-- Migration: 102_enable_rls_with_uid_check
-- Description: Re-enable RLS with different auth check - use auth.uid() instead of auth.role()
-- Date: 2025-12-04
-- Author: Claude Code

-- CONTEXT:
-- Testing confirmed: RLS policy is the blocker (works when RLS disabled)
-- Problem: auth.role() = 'authenticated' doesn't work for discount_events
-- But it works for orders/payments - why?
-- Hypothesis: Different execution context (background async vs foreground)

-- SOLUTION:
-- Use auth.uid() IS NOT NULL instead of auth.role() = 'authenticated'
-- If user ID exists, user is authenticated (more reliable check)

-- Re-enable RLS
ALTER TABLE discount_events ENABLE ROW LEVEL SECURITY;

-- Drop old policy
DROP POLICY IF EXISTS "Authenticated users can create discount events" ON discount_events;

-- Create new policy with auth.uid() check
CREATE POLICY "Authenticated users can create discount events" ON discount_events
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';

-- VALIDATION:
-- SELECT policyname, roles, with_check
-- FROM pg_policies
-- WHERE tablename = 'discount_events' AND cmd = 'INSERT';
-- Expected: with_check = (auth.uid() IS NOT NULL)
