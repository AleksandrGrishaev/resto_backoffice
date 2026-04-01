-- Migration: 282_add_accrual_date_to_transactions
-- Description: Add accrual_date field to track which period an expense belongs to
-- Date: 2026-04-01
-- Context: Accrual vs Cash basis PnL - payments made in current month for previous month expenses
--          accrual_date = when the expense was incurred (e.g. goods received)
--          created_at = when the payment was actually made

-- 1. Add accrual_date column
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS accrual_date timestamptz;

-- 2. Backfill existing rows: set accrual_date = created_at (same period by default)
UPDATE transactions
SET accrual_date = created_at
WHERE accrual_date IS NULL;

-- 3. Make NOT NULL after backfill
ALTER TABLE transactions
ALTER COLUMN accrual_date SET NOT NULL;

-- 4. Set default for new rows
ALTER TABLE transactions
ALTER COLUMN accrual_date SET DEFAULT now();

-- 5. Index for efficient date range queries on accrual_date
CREATE INDEX IF NOT EXISTS idx_transactions_accrual_date
ON transactions (accrual_date);

-- 6. Composite index for PnL queries (type + accrual_date)
CREATE INDEX IF NOT EXISTS idx_transactions_type_accrual_date
ON transactions (type, accrual_date);

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  null_count integer;
  total_count integer;
BEGIN
  SELECT count(*) INTO total_count FROM transactions;
  SELECT count(*) INTO null_count FROM transactions WHERE accrual_date IS NULL;
  RAISE NOTICE 'Transactions total: %, with NULL accrual_date: %', total_count, null_count;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % transactions with NULL accrual_date after backfill', null_count;
  END IF;
END $$;
