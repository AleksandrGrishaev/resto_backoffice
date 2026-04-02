-- RPC: adjust_loyalty_balance
-- Atomic balance adjustment: updates customer + creates transaction in one Postgres transaction
-- Eliminates race condition from separate read-then-write

CREATE OR REPLACE FUNCTION public.adjust_loyalty_balance(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF NOT is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Atomic update + return new balance
  UPDATE customers
  SET loyalty_balance = loyalty_balance + p_amount, updated_at = now()
  WHERE id = p_customer_id
  RETURNING loyalty_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Create audit trail
  INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, description)
  VALUES (p_customer_id, 'adjustment', p_amount, v_new_balance, p_description);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Adjustment failed: ' || SQLERRM);
END;
$$;
