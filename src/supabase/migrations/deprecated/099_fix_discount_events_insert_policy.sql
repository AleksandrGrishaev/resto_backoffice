-- Migration: 099_fix_discount_events_insert_policy
-- Description: Fix RLS policy for INSERT to allow system-generated discounts with NULL applied_by
-- Date: 2025-12-04
-- Author: Claude Code

-- CONTEXT:
-- Bill discount events were failing with RLS 403 Forbidden error because:
-- 1. Original policy (034): WITH CHECK (applied_by = auth.uid()) - blocks NULL applied_by
-- 2. Manually changed policy: WITH CHECK (auth.role() = 'authenticated') - should work but doesn't
-- 3. When INSERT happens during background payment processing, auth context may be lost or JWT token not passed
-- 4. Need more permissive policy that allows authenticated users to create discount events with any applied_by value

-- SOLUTION:
-- Replace existing INSERT policy with one that:
-- 1. Allows any authenticated user to INSERT
-- 2. No restrictions on applied_by value (can be NULL, auth.uid(), or any other UUID)
-- 3. This matches behavior of other tables like orders, payments which work fine

-- Drop existing policy
DROP POLICY IF EXISTS discount_events_create ON discount_events;

-- Create new permissive policy for INSERT
-- Any authenticated user can create discount events
-- No restrictions on applied_by (can be NULL for system-generated discounts)
CREATE POLICY discount_events_create ON discount_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY discount_events_create ON discount_events IS
  'Allow authenticated users to insert discount events. No restriction on applied_by value to support system-generated discounts (NULL) and user-generated discounts (UUID).';

-- VALIDATION:
-- After migration, test:
-- 1. Create bill discount with authenticated user → should save with user ID
-- 2. Create bill discount in background (potentially no user context) → should save with NULL
-- 3. Verify no RLS 403 Forbidden errors

-- ROLLBACK (if needed):
-- DROP POLICY IF EXISTS discount_events_create ON discount_events;
-- CREATE POLICY discount_events_create ON discount_events
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');
