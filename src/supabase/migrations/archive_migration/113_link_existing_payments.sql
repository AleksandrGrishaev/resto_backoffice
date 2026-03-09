-- Migration: 113_link_existing_payments
-- Description: Link existing completed payments to transactions and clean up duplicates
-- Date: 2026-01-29
-- Author: Claude Code

-- CONTEXT:
-- After commit 1f18659, POS expenses stopped creating PendingPayments.
-- Discovered: 114 orphaned completed payments exist from Dec 26 - Jan 24
-- Need to: Link existing payments + clean duplicates + create missing payments

-- ============================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================

-- Check current state
DO $$
DECLARE
  unlinked_count INTEGER;
  orphaned_completed INTEGER;
  orphaned_pending INTEGER;
BEGIN
  SELECT COUNT(*) INTO unlinked_count
  FROM transactions
  WHERE expense_category->>'category' = 'supplier'
    AND related_payment_id IS NULL
    AND status = 'completed';

  SELECT COUNT(*) INTO orphaned_completed
  FROM pending_payments
  WHERE category = 'supplier'
    AND status = 'completed'
    AND created_at >= '2025-12-26'
    AND NOT EXISTS (SELECT 1 FROM transactions WHERE related_payment_id = pending_payments.id);

  SELECT COUNT(*) INTO orphaned_pending
  FROM pending_payments
  WHERE category = 'supplier'
    AND status = 'pending'
    AND created_at >= '2025-12-26'
    AND NOT EXISTS (SELECT 1 FROM transactions WHERE related_payment_id = pending_payments.id);

  RAISE NOTICE 'Pre-migration state:';
  RAISE NOTICE '  Unlinked transactions: %', unlinked_count;
  RAISE NOTICE '  Orphaned completed payments: %', orphaned_completed;
  RAISE NOTICE '  Orphaned pending payments (duplicates): %', orphaned_pending;
END $$;

-- ============================================================
-- STEP 1: Link perfect matches (1 transaction = 1 completed payment)
-- ============================================================

-- Create temp table for tracking perfect 1:1 matches
CREATE TEMP TABLE migration_113_links AS
WITH matched_pairs AS (
  SELECT
    t.id as transaction_id,
    pp.id as payment_id,
    t.amount as trans_amount,
    pp.amount as payment_amount,
    t.counteragent_name,
    EXTRACT(EPOCH FROM (pp.created_at - t.created_at)) as time_diff_sec,
    COUNT(*) OVER (PARTITION BY t.id) as match_count
  FROM transactions t
  JOIN pending_payments pp ON (
    pp.counteragent_id = t.counteragent_id
    AND pp.amount = ABS(t.amount)
    AND DATE(pp.created_at) = DATE(t.created_at)
    AND pp.status = 'completed'
    AND EXTRACT(EPOCH FROM (pp.created_at - t.created_at)) BETWEEN 0.5 AND 5
  )
  WHERE t.expense_category->>'category' = 'supplier'
    AND t.related_payment_id IS NULL
    AND t.status = 'completed'
)
SELECT
  transaction_id,
  payment_id,
  trans_amount,
  payment_amount,
  counteragent_name,
  time_diff_sec
FROM matched_pairs
WHERE match_count = 1;  -- Only perfect 1:1 matches

-- Link transactions to payments
UPDATE transactions t
SET
  related_payment_id = m.payment_id,
  updated_at = NOW()
FROM migration_113_links m
WHERE t.id = m.transaction_id;

-- Report step 1
DO $$
DECLARE
  linked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO linked_count FROM migration_113_links;
  RAISE NOTICE 'Step 1 complete: Linked % perfect matches', linked_count;
END $$;

-- ============================================================
-- STEP 2: Handle duplicates (transactions with 2+ payments)
-- ============================================================

-- Find transactions with multiple payments
CREATE TEMP TABLE migration_113_duplicates AS
SELECT
  t.id as transaction_id,
  t.amount,
  t.counteragent_name,
  json_agg(
    json_build_object(
      'payment_id', pp.id,
      'status', pp.status,
      'time_diff', EXTRACT(EPOCH FROM (pp.created_at - t.created_at))
    ) ORDER BY
      CASE WHEN pp.status = 'completed' THEN 0 ELSE 1 END,  -- completed first
      ABS(EXTRACT(EPOCH FROM (pp.created_at - t.created_at)))  -- closest time
  ) as payments
FROM transactions t
JOIN pending_payments pp ON (
  pp.counteragent_id = t.counteragent_id
  AND pp.amount = ABS(t.amount)
  AND DATE(pp.created_at) = DATE(t.created_at)
)
WHERE t.expense_category->>'category' = 'supplier'
  AND t.related_payment_id IS NULL
  AND t.status = 'completed'
GROUP BY t.id, t.amount, t.counteragent_name
HAVING COUNT(pp.id) > 1;

-- Link to best matching payment (completed, closest time)
UPDATE transactions t
SET
  related_payment_id = (d.payments->0->>'payment_id')::TEXT,
  updated_at = NOW()
FROM migration_113_duplicates d
WHERE t.id = d.transaction_id;

-- Cancel duplicate pending payments
UPDATE pending_payments pp
SET
  status = 'cancelled',
  updated_at = NOW(),
  notes = COALESCE(notes, '') || ' [Auto-cancelled by migration 113: duplicate of completed payment]'
FROM migration_113_duplicates d
WHERE pp.id IN (
  SELECT (jsonb_array_elements(d.payments::jsonb)->>'payment_id')::TEXT
  FROM migration_113_duplicates d2
  WHERE d2.transaction_id = d.transaction_id
)
AND pp.status = 'pending'
AND pp.id != (d.payments->0->>'payment_id')::TEXT;

-- Report step 2
DO $$
DECLARE
  dup_count INTEGER;
  cancelled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM migration_113_duplicates;
  SELECT COUNT(*) INTO cancelled_count
  FROM pending_payments
  WHERE notes LIKE '%migration 113%';

  RAISE NOTICE 'Step 2 complete: Handled % transactions with duplicates', dup_count;
  RAISE NOTICE '  Cancelled % duplicate pending payments', cancelled_count;
END $$;

-- ============================================================
-- STEP 3: Create payments for remaining unlinked transactions
-- ============================================================

-- Find transactions without any matching payment
CREATE TEMP TABLE migration_113_missing AS
SELECT
  t.id as transaction_id,
  'pp_' || encode(gen_random_bytes(16), 'hex') as new_payment_id,
  t.counteragent_id,
  t.counteragent_name,
  ABS(t.amount) as amount,
  t.description,
  t.created_at,
  t.performed_by,
  t.account_id
FROM transactions t
WHERE t.expense_category->>'category' = 'supplier'
  AND t.related_payment_id IS NULL
  AND t.status = 'completed'
  AND t.counteragent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pending_payments pp
    WHERE pp.counteragent_id = t.counteragent_id
      AND pp.amount = ABS(t.amount)
      AND DATE(pp.created_at) = DATE(t.created_at)
  );

-- Create missing payments
INSERT INTO pending_payments (
  id,
  counteragent_id,
  counteragent_name,
  amount,
  description,
  category,
  status,
  priority,
  created_by,
  used_amount,
  linked_orders,
  paid_amount,
  paid_date,
  assigned_to_account,
  created_at,
  updated_at
)
SELECT
  new_payment_id,
  counteragent_id,
  counteragent_name,
  amount,
  description,
  'supplier',
  'completed',
  'medium',
  performed_by,
  0,
  '[]'::jsonb,
  amount,
  created_at,
  account_id,
  created_at,
  created_at
FROM migration_113_missing;

-- Link transactions to new payments
UPDATE transactions t
SET
  related_payment_id = m.new_payment_id,
  updated_at = NOW()
FROM migration_113_missing m
WHERE t.id = m.transaction_id;

-- Report step 3
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO created_count FROM migration_113_missing;
  RAISE NOTICE 'Step 3 complete: Created % new payments', created_count;
END $$;

-- ============================================================
-- POST-MIGRATION VALIDATION
-- ============================================================

DO $$
DECLARE
  remaining_unlinked INTEGER;
  total_linked INTEGER;
  orphaned_payments INTEGER;
BEGIN
  -- Check remaining unlinked
  SELECT COUNT(*) INTO remaining_unlinked
  FROM transactions
  WHERE expense_category->>'category' = 'supplier'
    AND related_payment_id IS NULL
    AND status = 'completed'
    AND counteragent_id IS NOT NULL;

  -- Count successfully linked
  SELECT COUNT(*) INTO total_linked
  FROM transactions
  WHERE expense_category->>'category' = 'supplier'
    AND related_payment_id IS NOT NULL
    AND status = 'completed'
    AND created_at >= '2025-12-26';

  -- Check orphaned payments
  SELECT COUNT(*) INTO orphaned_payments
  FROM pending_payments
  WHERE category = 'supplier'
    AND status IN ('completed', 'pending')
    AND created_at >= '2025-12-26'
    AND NOT EXISTS (SELECT 1 FROM transactions WHERE related_payment_id = pending_payments.id);

  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 113 COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Results:';
  RAISE NOTICE '  Total linked: %', total_linked;
  RAISE NOTICE '  Remaining unlinked: %', remaining_unlinked;
  RAISE NOTICE '  Remaining orphaned payments: %', orphaned_payments;

  IF remaining_unlinked > 0 THEN
    RAISE WARNING 'Still have % unlinked transactions (likely missing counteragent_id)', remaining_unlinked;
  END IF;

  IF remaining_unlinked = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All transactions linked!';
  END IF;
END $$;

-- Clean up temp tables
DROP TABLE IF EXISTS migration_113_links;
DROP TABLE IF EXISTS migration_113_duplicates;
DROP TABLE IF EXISTS migration_113_missing;
