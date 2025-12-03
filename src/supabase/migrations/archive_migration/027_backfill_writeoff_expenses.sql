-- Migration: 027_backfill_writeoff_expenses
-- Description: Backfill expense transactions for historical KPI-affecting write-offs
-- Date: 2024-12-01
-- Author: System

-- CONTEXT:
-- Manual write-offs (expired, spoiled, other) were not creating expense transactions in Account Store.
-- This migration backfills historical data to ensure P&L Food Cost is accurate.
-- Only KPI-affecting write-offs are included (excludes education, test, production_consumption, sales_consumption).

-- PRE-MIGRATION VALIDATION
-- Check how many write-offs will be backfilled
DO $$
DECLARE
  total_writeoffs INTEGER;
  kpi_affecting INTEGER;
  non_kpi INTEGER;
  backfill_value NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE (write_off_details->>'affectsKPI')::boolean = true),
    COUNT(*) FILTER (WHERE (write_off_details->>'affectsKPI')::boolean = false OR write_off_details IS NULL),
    COALESCE(SUM(so.total_value) FILTER (WHERE (write_off_details->>'affectsKPI')::boolean = true), 0)
  INTO total_writeoffs, kpi_affecting, non_kpi, backfill_value
  FROM storage_operations so
  WHERE operation_type = 'write_off';

  RAISE NOTICE '📊 Pre-migration validation:';
  RAISE NOTICE '  Total write-offs: %', total_writeoffs;
  RAISE NOTICE '  KPI-affecting (will backfill): %', kpi_affecting;
  RAISE NOTICE '  Non-KPI (will skip): %', non_kpi;
  RAISE NOTICE '  Total value to backfill: Rp %', backfill_value;
END $$;

-- ACTUAL CHANGES
-- Insert expense transactions for KPI-affecting write-offs
-- Note: balance_after will be calculated, status set to 'confirmed'
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
  -ABS(so.total_value) as amount, -- negative for expense
  CONCAT('Write-off: ', so.write_off_details->>'reason', ' (', so.document_number, ')',
    CASE WHEN so.notes IS NOT NULL AND so.notes != '' THEN ' - ' || so.notes ELSE '' END
  ) as description,
  0 as balance_after, -- Will be recalculated by Account Store on load
  jsonb_build_object(
    'type', 'daily',
    'category', 'inventory_adjustment'
  ) as expense_category,
  jsonb_build_object(
    'type', 'api',
    'id', 'migration_backfill',
    'name', 'Historical Write-Off Backfill'
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
  -- Avoid duplicates: only insert if no matching transaction exists
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.description LIKE '%' || so.document_number || '%'
    AND t.type = 'expense'
    AND t.expense_category->>'category' = 'inventory_adjustment'
  );

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  backfilled_count INTEGER;
  backfilled_amount NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(ABS(amount)), 0)
  INTO backfilled_count, backfilled_amount
  FROM transactions
  WHERE
    performed_by->>'id' = 'migration_backfill'
    AND expense_category->>'category' = 'inventory_adjustment';

  RAISE NOTICE '✅ Post-migration validation:';
  RAISE NOTICE '  Backfilled transactions: %', backfilled_count;
  RAISE NOTICE '  Total backfilled amount: Rp %', backfilled_amount;
END $$;

-- Show breakdown by write-off reason (inferred from description)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '📋 Breakdown by write-off reason:';

  FOR rec IN
    SELECT
      CASE
        WHEN description ILIKE '%expired%' THEN 'expired'
        WHEN description ILIKE '%spoil%' THEN 'spoiled'
        WHEN description ILIKE '%other%' THEN 'other'
        ELSE 'unknown'
      END as inferred_reason,
      COUNT(*) as count,
      SUM(ABS(amount)) as total_amount
    FROM transactions
    WHERE performed_by->>'id' = 'migration_backfill'
    GROUP BY 1
    ORDER BY total_amount DESC
  LOOP
    RAISE NOTICE '  % - % transactions, Rp %', rec.inferred_reason, rec.count, rec.total_amount;
  END LOOP;
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
    WHERE expense_category->>'category' = 'inventory_adjustment'
    GROUP BY description, created_at
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️  Found % potential duplicate transactions!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No duplicate transactions found';
  END IF;
END $$;

-- Create index for faster P&L queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_transactions_expense_category
  ON transactions USING gin(expense_category);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at);
