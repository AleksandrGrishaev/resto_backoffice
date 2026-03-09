-- Migration: 114_add_payment_source
-- Description: Add source field to track payment origin (POS vs Backoffice)
-- Date: 2026-01-29
-- Author: Claude Code

-- CONTEXT:
-- Currently cannot distinguish POS payments from Backoffice payments after localStorage clear
-- All database payments show as "Backoffice" in UI (hardcoded in useExpenseLinking.ts)
-- Need source field to fix display logic

-- ============================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================

DO $$
DECLARE
  pos_candidates INTEGER;
  backoffice_candidates INTEGER;
BEGIN
  -- Count payments from cash accounts (likely POS)
  SELECT COUNT(*) INTO pos_candidates
  FROM pending_payments pp
  JOIN accounts a ON pp.assigned_to_account = a.id
  WHERE pp.status = 'completed'
    AND pp.category = 'supplier'
    AND a.type = 'cash';

  -- Count payments from non-cash accounts (likely Backoffice)
  SELECT COUNT(*) INTO backoffice_candidates
  FROM pending_payments pp
  LEFT JOIN accounts a ON pp.assigned_to_account = a.id
  WHERE pp.status = 'completed'
    AND pp.category = 'supplier'
    AND (a.type IS NULL OR a.type != 'cash');

  RAISE NOTICE '================================================';
  RAISE NOTICE 'PRE-MIGRATION ANALYSIS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Payments from cash accounts (POS candidates): %', pos_candidates;
  RAISE NOTICE 'Payments from other accounts (Backoffice candidates): %', backoffice_candidates;
END $$;

-- ============================================================
-- STEP 1: Add source column with default
-- ============================================================

ALTER TABLE pending_payments
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'backoffice';

DO $$
BEGIN
  RAISE NOTICE 'Step 1 complete: Added source column with default=backoffice';
END $$;

-- ============================================================
-- STEP 2: Update existing POS payments (heuristic)
-- ============================================================

-- Strategy: Payments assigned to cash accounts are likely from POS
-- This is a best-effort heuristic for historical data

UPDATE pending_payments p
SET source = 'pos'
FROM accounts a
WHERE p.assigned_to_account = a.id
  AND a.type = 'cash'
  AND p.status = 'completed'
  AND p.category = 'supplier';

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Step 2 complete: Updated % payments to source=pos', updated_count;
END $$;

-- ============================================================
-- STEP 3: Add check constraint
-- ============================================================

ALTER TABLE pending_payments
ADD CONSTRAINT check_payment_source
CHECK (source IN ('pos', 'backoffice'));

DO $$
BEGIN
  RAISE NOTICE 'Step 3 complete: Added check constraint (pos|backoffice)';
END $$;

-- ============================================================
-- STEP 4: Create index for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pending_payments_source
ON pending_payments (source)
WHERE status = 'completed';

DO $$
BEGIN
  RAISE NOTICE 'Step 4 complete: Created index on source field';
END $$;

-- ============================================================
-- POST-MIGRATION VALIDATION
-- ============================================================

DO $$
DECLARE
  pos_count INTEGER;
  backoffice_count INTEGER;
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count by source
  SELECT COUNT(*) INTO pos_count
  FROM pending_payments
  WHERE source = 'pos' AND status = 'completed';

  SELECT COUNT(*) INTO backoffice_count
  FROM pending_payments
  WHERE source = 'backoffice' AND status = 'completed';

  SELECT COUNT(*) INTO null_count
  FROM pending_payments
  WHERE source IS NULL AND status = 'completed';

  SELECT COUNT(*) INTO total_count
  FROM pending_payments
  WHERE status = 'completed';

  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 114 COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Results:';
  RAISE NOTICE '  POS payments: %', pos_count;
  RAISE NOTICE '  Backoffice payments: %', backoffice_count;
  RAISE NOTICE '  NULL source (should be 0): %', null_count;
  RAISE NOTICE '  Total completed payments: %', total_count;

  IF null_count > 0 THEN
    RAISE WARNING 'Still have % payments with NULL source!', null_count;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All payments have source!';
  END IF;
END $$;
