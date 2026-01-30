-- Function: check_duplicate_payment
-- Description: Check for duplicate supplier payments by counteragent, amount, and date
-- Created: 2026-01-29
-- Migration: 115_prevent_duplicate_payments.sql

-- This function provides a safe way to check for duplicate payments
-- before creating a new one (to be used in application code)

CREATE OR REPLACE FUNCTION check_duplicate_payment(
  p_counteragent_id TEXT,
  p_amount NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  payment_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_duplicate,
    id as payment_id,
    created_at
  FROM pending_payments
  WHERE counteragent_id = p_counteragent_id
    AND amount = p_amount
    AND DATE(created_at) = p_date
    AND status = 'completed'
    AND category = 'supplier'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no results, return FALSE
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Usage example:
-- const result = await supabase.rpc('check_duplicate_payment', {
--   p_counteragent_id: '...',
--   p_amount: 100000,
--   p_date: '2026-01-29'
-- })
-- if (result.data[0]?.is_duplicate) { /* handle duplicate */ }
