-- Migration: 022_cleanup_empty_expense_account_ids
-- Description: Fix old expense operations with empty relatedAccountId in shifts table
-- Date: 2025-11-29
-- Author: Claude Code

-- CONTEXT: Sprint 8 - During shift sync to account, we discovered that some old
-- expense operations have empty relatedAccountId field, which causes "Account not found"
-- errors when trying to create transactions. This migration removes those invalid entries.

-- PRE-MIGRATION VALIDATION
-- Check how many shifts have invalid expense operations
DO $$
DECLARE
  invalid_count INTEGER;
  shift_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT id) INTO shift_count
  FROM shifts
  WHERE jsonb_array_length(COALESCE(expense_operations, '[]'::jsonb)) > 0;

  SELECT COUNT(DISTINCT s.id) INTO invalid_count
  FROM shifts s,
       jsonb_array_elements(s.expense_operations) AS expense
  WHERE (expense->>'relatedAccountId' IS NULL
         OR expense->>'relatedAccountId' = '');

  RAISE NOTICE 'Found % shifts with expense operations', shift_count;
  RAISE NOTICE 'Found % shifts with invalid expense operations (empty relatedAccountId)', invalid_count;
END $$;

-- ACTUAL CHANGES
-- Remove expense operations with empty relatedAccountId
UPDATE shifts
SET expense_operations = COALESCE(
  (
    SELECT jsonb_agg(expense)
    FROM jsonb_array_elements(expense_operations) AS expense
    WHERE expense->>'relatedAccountId' IS NOT NULL
      AND expense->>'relatedAccountId' != ''
  ),
  '[]'::jsonb  -- ✅ FIX: Use empty array instead of NULL if all expenses are invalid
)
WHERE jsonb_array_length(COALESCE(expense_operations, '[]'::jsonb)) > 0
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(expense_operations) AS expense
    WHERE expense->>'relatedAccountId' IS NULL
       OR expense->>'relatedAccountId' = ''
  );

-- POST-MIGRATION VALIDATION
-- Verify no more invalid expense operations exist
DO $$
DECLARE
  remaining_invalid INTEGER;
BEGIN
  SELECT COUNT(DISTINCT s.id) INTO remaining_invalid
  FROM shifts s,
       jsonb_array_elements(s.expense_operations) AS expense
  WHERE (expense->>'relatedAccountId' IS NULL
         OR expense->>'relatedAccountId' = '');

  IF remaining_invalid > 0 THEN
    RAISE EXCEPTION 'Migration failed: Still have % shifts with invalid expense operations', remaining_invalid;
  ELSE
    RAISE NOTICE '✅ Migration successful: All invalid expense operations removed';
  END IF;
END $$;
