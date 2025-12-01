-- Migration: 029_production_writeoff_expenses
-- Description: Production migration - Backfill all write-off expenses (KPI + OPEX)
-- Date: 2024-12-01
-- Author: System
-- Target: PRODUCTION DATABASE

-- CONTEXT:
-- This migration combines 027 and 028 for production deployment.
-- - KPI write-offs (expired, spoiled, other) → inventory_adjustment (Food Cost)
-- - Education write-offs → training_education (OPEX)
-- - Test write-offs → recipe_development (OPEX)
-- - Production/Sales consumption → NOT recorded (normal operations)

-- ============================================
-- PRE-MIGRATION VALIDATION
-- ============================================

DO $$
DECLARE
  total_writeoffs INTEGER;
  kpi_affecting INTEGER;
  education_count INTEGER;
  test_count INTEGER;
  production_count INTEGER;
  sales_count INTEGER;
  kpi_value NUMERIC;
  education_value NUMERIC;
  test_value NUMERIC;
BEGIN
  -- Count all write-offs by reason
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE (write_off_details->>'affectsKPI')::boolean = true),
    COUNT(*) FILTER (WHERE write_off_details->>'reason' = 'education'),
    COUNT(*) FILTER (WHERE write_off_details->>'reason' = 'test'),
    COUNT(*) FILTER (WHERE write_off_details->>'reason' = 'production_consumption'),
    COUNT(*) FILTER (WHERE write_off_details->>'reason' = 'sales_consumption'),
    COALESCE(SUM(so.total_value) FILTER (WHERE (write_off_details->>'affectsKPI')::boolean = true), 0),
    COALESCE(SUM(so.total_value) FILTER (WHERE write_off_details->>'reason' = 'education'), 0),
    COALESCE(SUM(so.total_value) FILTER (WHERE write_off_details->>'reason' = 'test'), 0)
  INTO total_writeoffs, kpi_affecting, education_count, test_count, production_count, sales_count,
       kpi_value, education_value, test_value
  FROM storage_operations so
  WHERE operation_type = 'write_off';

  RAISE NOTICE '📊 Pre-migration validation:';
  RAISE NOTICE '  Total write-offs in database: %', total_writeoffs;
  RAISE NOTICE '  ─────────────────────────────────';
  RAISE NOTICE '  KPI-affecting (Food Cost):';
  RAISE NOTICE '    Count: % | Value: Rp %', kpi_affecting, kpi_value;
  RAISE NOTICE '  Education (OPEX):';
  RAISE NOTICE '    Count: % | Value: Rp %', education_count, education_value;
  RAISE NOTICE '  Test (OPEX):';
  RAISE NOTICE '    Count: % | Value: Rp %', test_count, test_value;
  RAISE NOTICE '  Production consumption (skip):';
  RAISE NOTICE '    Count: %', production_count;
  RAISE NOTICE '  Sales consumption (skip):';
  RAISE NOTICE '    Count: %', sales_count;
  RAISE NOTICE '  ─────────────────────────────────';
  RAISE NOTICE '  Total to backfill: % transactions', kpi_affecting + education_count + test_count;
  RAISE NOTICE '  Total value: Rp %', kpi_value + education_value + test_value;
END $$;

-- ============================================
-- PART 1: BACKFILL KPI WRITE-OFFS (Food Cost)
-- ============================================

RAISE NOTICE '🔄 Starting KPI write-offs backfill...';

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
  CONCAT('Write-off: ', so.write_off_details->>'reason', ' (', so.document_number, ')',
    CASE WHEN so.notes IS NOT NULL AND so.notes != '' THEN ' - ' || so.notes ELSE '' END
  ) as description,
  0 as balance_after,
  jsonb_build_object(
    'type', 'daily',
    'category', 'inventory_adjustment'
  ) as expense_category,
  jsonb_build_object(
    'type', 'api',
    'id', 'production_migration',
    'name', 'Production Write-Off Migration'
  ) as performed_by,
  'completed' as status,
  so.created_at,
  NOW() as updated_at
FROM storage_operations so
WHERE
  so.operation_type = 'write_off'
  AND (so.write_off_details->>'affectsKPI')::boolean = true
  AND so.total_value IS NOT NULL
  AND so.total_value > 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.description LIKE '%' || so.document_number || '%'
    AND t.type = 'expense'
    AND t.expense_category->>'category' = 'inventory_adjustment'
  );

-- ============================================
-- PART 2: BACKFILL EDUCATION WRITE-OFFS (OPEX)
-- ============================================

RAISE NOTICE '🔄 Starting education write-offs backfill...';

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
    'id', 'production_migration',
    'name', 'Production Write-Off Migration'
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

-- ============================================
-- PART 3: BACKFILL TEST WRITE-OFFS (OPEX)
-- ============================================

RAISE NOTICE '🔄 Starting test write-offs backfill...';

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
    'id', 'production_migration',
    'name', 'Production Write-Off Migration'
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

-- ============================================
-- POST-MIGRATION VALIDATION
-- ============================================

DO $$
DECLARE
  kpi_backfilled INTEGER;
  education_backfilled INTEGER;
  test_backfilled INTEGER;
  kpi_amount NUMERIC;
  education_amount NUMERIC;
  test_amount NUMERIC;
  total_backfilled INTEGER;
  total_amount NUMERIC;
BEGIN
  -- Count backfilled transactions
  SELECT
    COUNT(*) FILTER (WHERE expense_category->>'category' = 'inventory_adjustment'),
    COUNT(*) FILTER (WHERE expense_category->>'category' = 'training_education'),
    COUNT(*) FILTER (WHERE expense_category->>'category' = 'recipe_development'),
    COALESCE(SUM(ABS(amount)) FILTER (WHERE expense_category->>'category' = 'inventory_adjustment'), 0),
    COALESCE(SUM(ABS(amount)) FILTER (WHERE expense_category->>'category' = 'training_education'), 0),
    COALESCE(SUM(ABS(amount)) FILTER (WHERE expense_category->>'category' = 'recipe_development'), 0)
  INTO kpi_backfilled, education_backfilled, test_backfilled,
       kpi_amount, education_amount, test_amount
  FROM transactions
  WHERE performed_by->>'id' = 'production_migration';

  total_backfilled := kpi_backfilled + education_backfilled + test_backfilled;
  total_amount := kpi_amount + education_amount + test_amount;

  RAISE NOTICE '✅ Post-migration validation:';
  RAISE NOTICE '  ─────────────────────────────────';
  RAISE NOTICE '  KPI write-offs (Food Cost):';
  RAISE NOTICE '    Transactions: % | Amount: Rp %', kpi_backfilled, kpi_amount;
  RAISE NOTICE '  Education (OPEX):';
  RAISE NOTICE '    Transactions: % | Amount: Rp %', education_backfilled, education_amount;
  RAISE NOTICE '  Test (OPEX):';
  RAISE NOTICE '    Transactions: % | Amount: Rp %', test_backfilled, test_amount;
  RAISE NOTICE '  ─────────────────────────────────';
  RAISE NOTICE '  Total backfilled: % transactions', total_backfilled;
  RAISE NOTICE '  Total value: Rp %', total_amount;

  IF total_backfilled = 0 THEN
    RAISE NOTICE 'ℹ️  No write-offs found - migration will backfill when they are created';
  END IF;
END $$;

-- ============================================
-- BREAKDOWN BY WRITE-OFF REASON
-- ============================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '📋 Breakdown by write-off category:';
  RAISE NOTICE '  ─────────────────────────────────';

  FOR rec IN
    SELECT
      expense_category->>'category' as category,
      CASE
        WHEN description ILIKE '%expired%' THEN 'expired'
        WHEN description ILIKE '%spoil%' THEN 'spoiled'
        WHEN description ILIKE '%other%' THEN 'other'
        WHEN description ILIKE '%education%' THEN 'education'
        WHEN description ILIKE '%test%' THEN 'test'
        ELSE 'unknown'
      END as reason,
      COUNT(*) as count,
      SUM(ABS(amount)) as total_amount
    FROM transactions
    WHERE performed_by->>'id' = 'production_migration'
    GROUP BY 1, 2
    ORDER BY total_amount DESC
  LOOP
    RAISE NOTICE '  [%] % - % txns, Rp %',
      rec.category, rec.reason, rec.count, rec.total_amount;
  END LOOP;
END $$;

-- ============================================
-- VERIFY NO DUPLICATES
-- ============================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT description, created_at, COUNT(*)
    FROM transactions
    WHERE expense_category->>'category' IN (
      'inventory_adjustment',
      'training_education',
      'recipe_development'
    )
    GROUP BY description, created_at
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️  Found % potential duplicate transactions!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No duplicate transactions found';
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES
-- ============================================

RAISE NOTICE '🔧 Creating performance indexes...';

CREATE INDEX IF NOT EXISTS idx_transactions_expense_category
  ON transactions USING gin(expense_category);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_performed_by
  ON transactions USING gin(performed_by);

RAISE NOTICE '✅ Migration 029_production_writeoff_expenses completed successfully';
