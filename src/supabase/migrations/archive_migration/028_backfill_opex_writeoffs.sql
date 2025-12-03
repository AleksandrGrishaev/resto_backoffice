-- Migration: 028_backfill_opex_writeoffs
-- Description: Backfill expense transactions for education and test write-offs as OPEX
-- Date: 2024-12-01
-- Author: System

-- CONTEXT:
-- Education and test write-offs should be recorded as OPEX (Operating Expenses), not Food Cost.
-- - education write-offs → training_education category (OPEX)
-- - test write-offs → recipe_development category (OPEX)
-- This migration backfills historical data.

-- PRE-MIGRATION VALIDATION
-- Check how many education/test write-offs exist
DO $$
DECLARE
  education_count INTEGER;
  test_count INTEGER;
  education_value NUMERIC;
  test_value NUMERIC;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE write_off_details->>'reason' = 'education'),
    COUNT(*) FILTER (WHERE write_off_details->>'reason' = 'test'),
    COALESCE(SUM(so.total_value) FILTER (WHERE write_off_details->>'reason' = 'education'), 0),
    COALESCE(SUM(so.total_value) FILTER (WHERE write_off_details->>'reason' = 'test'), 0)
  INTO education_count, test_count, education_value, test_value
  FROM storage_operations so
  WHERE operation_type = 'write_off'
    AND write_off_details->>'reason' IN ('education', 'test');

  RAISE NOTICE '📊 Pre-migration validation:';
  RAISE NOTICE '  Education write-offs: % (Rp %)', education_count, education_value;
  RAISE NOTICE '  Test write-offs: % (Rp %)', test_count, test_value;
  RAISE NOTICE '  Total to backfill: % write-offs (Rp %)',
    education_count + test_count,
    education_value + test_value;
END $$;

-- ACTUAL CHANGES
-- Insert expense transactions for education write-offs
INSERT INTO transactions (
  id,
  account_id,
  type,
  amount,
  description,
  balance_after,
  expense_category,
  performed_by,
  status,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  'acc_1' as account_id,
  'expense' as type,
  -ABS(so.total_value) as amount,
  CONCAT('Write-off: education (', so.document_number, ')',
    CASE WHEN so.notes IS NOT NULL AND so.notes != '' THEN ' - ' || so.notes ELSE '' END
  ) as description,
  0 as balance_after,
  jsonb_build_object(
    'type', 'daily',
    'category', 'training_education'
  ) as expense_category,
  jsonb_build_object(
    'type', 'api',
    'id', 'migration_opex_backfill',
    'name', 'OPEX Write-Off Backfill'
  ) as performed_by,
  'completed' as status,
  so.created_at,
  NOW() as updated_at
FROM storage_operations so
WHERE
  so.operation_type = 'write_off'
  AND so.write_off_details->>'reason' = 'education'
  AND so.total_value IS NOT NULL
  AND so.total_value > 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.description LIKE '%' || so.document_number || '%'
    AND t.type = 'expense'
    AND t.expense_category->>'category' = 'training_education'
  );

-- Insert expense transactions for test write-offs
INSERT INTO transactions (
  id,
  account_id,
  type,
  amount,
  description,
  balance_after,
  expense_category,
  performed_by,
  status,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  'acc_1' as account_id,
  'expense' as type,
  -ABS(so.total_value) as amount,
  CONCAT('Write-off: test (', so.document_number, ')',
    CASE WHEN so.notes IS NOT NULL AND so.notes != '' THEN ' - ' || so.notes ELSE '' END
  ) as description,
  0 as balance_after,
  jsonb_build_object(
    'type', 'daily',
    'category', 'recipe_development'
  ) as expense_category,
  jsonb_build_object(
    'type', 'api',
    'id', 'migration_opex_backfill',
    'name', 'OPEX Write-Off Backfill'
  ) as performed_by,
  'completed' as status,
  so.created_at,
  NOW() as updated_at
FROM storage_operations so
WHERE
  so.operation_type = 'write_off'
  AND so.write_off_details->>'reason' = 'test'
  AND so.total_value IS NOT NULL
  AND so.total_value > 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.description LIKE '%' || so.document_number || '%'
    AND t.type = 'expense'
    AND t.expense_category->>'category' = 'recipe_development'
  );

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  education_backfilled INTEGER;
  test_backfilled INTEGER;
  education_amount NUMERIC;
  test_amount NUMERIC;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE expense_category->>'category' = 'training_education'),
    COUNT(*) FILTER (WHERE expense_category->>'category' = 'recipe_development'),
    COALESCE(SUM(ABS(amount)) FILTER (WHERE expense_category->>'category' = 'training_education'), 0),
    COALESCE(SUM(ABS(amount)) FILTER (WHERE expense_category->>'category' = 'recipe_development'), 0)
  INTO education_backfilled, test_backfilled, education_amount, test_amount
  FROM transactions
  WHERE performed_by->>'id' = 'migration_opex_backfill';

  RAISE NOTICE '✅ Post-migration validation:';
  RAISE NOTICE '  Education expenses backfilled: % (Rp %)', education_backfilled, education_amount;
  RAISE NOTICE '  Test expenses backfilled: % (Rp %)', test_backfilled, test_amount;
  RAISE NOTICE '  Total backfilled: % transactions (Rp %)',
    education_backfilled + test_backfilled,
    education_amount + test_amount;

  IF (education_backfilled + test_backfilled) = 0 THEN
    RAISE NOTICE 'ℹ️  No education or test write-offs found - migration will backfill when they are created';
  END IF;
END $$;

-- Verify no duplicates were created
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT description, created_at, COUNT(*)
    FROM transactions
    WHERE expense_category->>'category' IN ('training_education', 'recipe_development')
    GROUP BY description, created_at
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️  Found % potential duplicate transactions!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No duplicate transactions found';
  END IF;
END $$;
