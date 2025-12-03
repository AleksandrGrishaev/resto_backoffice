-- Migration: 098_make_discount_events_applied_by_nullable
-- Description: Make applied_by column nullable to allow system-generated discounts
-- Date: 2025-12-03
-- Author: Claude Code
-- Applied: Yes (via MCP on 2025-12-03)

-- CONTEXT:
-- Bill discount events were failing with RLS 403 Forbidden error because:
-- 1. applied_by column was NOT NULL
-- 2. During background payment processing, authStore.user?.id could be null
-- 3. Code tried to insert NULL into NOT NULL column
-- 4. Item discounts worked because they always had a valid user ID
-- 5. Bill discounts are created during payment processing where user context may be lost

-- SOLUTION:
-- Make applied_by nullable to allow system-generated discounts during background processing

-- Make applied_by nullable
ALTER TABLE discount_events
  ALTER COLUMN applied_by DROP NOT NULL;

-- Add comment to document NULL behavior
COMMENT ON COLUMN discount_events.applied_by IS
  'User ID who applied the discount. NULL indicates system-generated discount during background processing.';

-- VALIDATION:
-- Query to verify the change:
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'discount_events' AND column_name = 'applied_by';
-- Expected: is_nullable = 'YES'

-- ROLLBACK (if needed):
-- ALTER TABLE discount_events
--   ALTER COLUMN applied_by SET NOT NULL;
