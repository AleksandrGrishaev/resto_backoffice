-- Migration: 116_fix_check_duplicate_payment_and_orphans
-- Description: Fix ambiguous column in check_duplicate_payment RPC and create payments for orphaned transactions
-- Date: 2026-01-30
-- Author: Claude Code
--
-- ROOT CAUSE ANALYSIS:
-- The check_duplicate_payment RPC was failing with:
--   ERROR: 42702: column reference "created_at" is ambiguous
--
-- This caused createDirectExpense() in shiftsStore to:
-- 1. Create transaction via createOperation() (no payment_id)
-- 2. Call check_duplicate_payment() which FAILED
-- 3. Fall back to in-memory check (found nothing)
-- 4. Skip payment creation entirely
--
-- Result: 4 transactions created on 2026-01-30 without related_payment_id
--
-- FIXES APPLIED:
-- 1. Fixed RPC by renaming "created_at" to "payment_created_at" in RETURNS TABLE
-- 2. Added table alias "pp" to avoid ambiguity
-- 3. Created payments for orphaned transactions

-- ============================================================
-- FIX 1: Drop and recreate RPC with fixed column names
-- ============================================================

DROP FUNCTION IF EXISTS check_duplicate_payment(TEXT, NUMERIC, DATE);

CREATE OR REPLACE FUNCTION check_duplicate_payment(
  p_counteragent_id TEXT,
  p_amount NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  payment_id TEXT,
  payment_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_duplicate,
    pp.id as payment_id,
    pp.created_at as payment_created_at
  FROM pending_payments pp
  WHERE pp.counteragent_id = p_counteragent_id
    AND pp.amount = p_amount
    AND DATE(pp.created_at) = p_date
    AND pp.status = 'completed'
    AND pp.category = 'supplier'
  ORDER BY pp.created_at DESC
  LIMIT 1;

  -- If no results, return FALSE
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- ============================================================
-- FIX 2: Create payments for orphaned transactions (2026-01-30)
-- ============================================================
-- Note: This was executed manually during debugging session.
-- Keeping SQL here for documentation purposes.

-- DO $$
-- DECLARE
--   t RECORD;
--   v_payment_id TEXT;
-- BEGIN
--   FOR t IN
--     SELECT id, counteragent_id, counteragent_name, amount, description,
--            performed_by, account_id, created_at
--     FROM transactions
--     WHERE expense_category->>'category' = 'supplier'
--       AND related_payment_id IS NULL
--       AND created_at::date = '2026-01-30'
--   LOOP
--     v_payment_id := 'pp_' || encode(gen_random_bytes(16), 'hex');
--
--     INSERT INTO pending_payments (
--       id, counteragent_id, counteragent_name, amount, description,
--       category, status, priority, created_by, used_amount, linked_orders,
--       paid_amount, paid_date, assigned_to_account, source,
--       created_at, updated_at
--     ) VALUES (
--       v_payment_id, t.counteragent_id, t.counteragent_name, ABS(t.amount),
--       t.description, 'supplier', 'completed', 'medium', t.performed_by,
--       0, '[]'::jsonb, ABS(t.amount), t.created_at, t.account_id, 'pos',
--       t.created_at, NOW()
--     );
--
--     UPDATE transactions
--     SET related_payment_id = v_payment_id, updated_at = NOW()
--     WHERE id = t.id;
--   END LOOP;
-- END $$;

-- ============================================================
-- POST-MIGRATION VALIDATION
-- ============================================================

-- Verify no orphaned supplier transactions exist
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM transactions
  WHERE expense_category->>'category' = 'supplier'
    AND related_payment_id IS NULL
    AND status = 'completed';

  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % orphaned supplier transactions without payment_id', orphan_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All supplier transactions have related_payment_id';
  END IF;
END $$;
