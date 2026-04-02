-- Migration: 281_reverse_loyalty_on_refund
-- Description: Add reversal type + create reverse_loyalty_on_refund RPC
-- Date: 2026-03-31
-- Context: Phase 3 of loyalty refactoring — cashback reversal on payment refund

-- 1. Add 'reversal' to loyalty_transactions type CHECK constraint
ALTER TABLE loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_type_check;
ALTER TABLE loyalty_transactions ADD CONSTRAINT loyalty_transactions_type_check
  CHECK (type IN ('cashback','redemption','conversion','adjustment','expiration','reversal'));

-- 2. Create the RPC
CREATE OR REPLACE FUNCTION reverse_loyalty_on_refund(
  p_customer_id UUID,
  p_order_id UUID,
  p_refund_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer RECORD;
  v_settings RECORD;
  v_tier_config JSONB;
  v_cashback_pct NUMERIC;
  v_reversal_amount NUMERIC;
  v_new_balance NUMERIC;
  v_point RECORD;
  v_remaining_to_void NUMERIC;
  v_void NUMERIC;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  IF COALESCE(v_customer.loyalty_program, 'stamps') = 'stamps' THEN
    RETURN jsonb_build_object('success', true, 'reversed', 0, 'reason', 'stamps program');
  END IF;

  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  SELECT t INTO v_tier_config
    FROM jsonb_array_elements(v_settings.tiers) t
    WHERE t->>'name' = v_customer.tier;
  v_cashback_pct := COALESCE((v_tier_config->>'cashback_pct')::numeric, 5);

  v_reversal_amount := round(p_refund_amount * v_cashback_pct / 100);

  IF v_reversal_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'reversed', 0);
  END IF;

  v_remaining_to_void := v_reversal_amount;

  FOR v_point IN
    SELECT id, remaining
    FROM loyalty_points
    WHERE customer_id = p_customer_id AND remaining > 0 AND order_id = p_order_id
    ORDER BY created_at DESC
  LOOP
    EXIT WHEN v_remaining_to_void <= 0;
    v_void := LEAST(v_point.remaining, v_remaining_to_void);
    UPDATE loyalty_points SET remaining = remaining - v_void WHERE id = v_point.id;
    v_remaining_to_void := v_remaining_to_void - v_void;
  END LOOP;

  IF v_remaining_to_void > 0 THEN
    FOR v_point IN
      SELECT id, remaining
      FROM loyalty_points
      WHERE customer_id = p_customer_id AND remaining > 0
      ORDER BY expires_at ASC
    LOOP
      EXIT WHEN v_remaining_to_void <= 0;
      v_void := LEAST(v_point.remaining, v_remaining_to_void);
      UPDATE loyalty_points SET remaining = remaining - v_void WHERE id = v_point.id;
      v_remaining_to_void := v_remaining_to_void - v_void;
    END LOOP;
  END IF;

  v_new_balance := GREATEST(0, v_customer.loyalty_balance - v_reversal_amount);
  UPDATE customers SET loyalty_balance = v_new_balance WHERE id = p_customer_id;

  UPDATE customers SET
    total_spent = GREATEST(0, total_spent - p_refund_amount),
    total_visits = GREATEST(0, total_visits - 1)
  WHERE id = p_customer_id;

  INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, order_id, description)
  VALUES (p_customer_id, 'reversal', -v_reversal_amount, v_new_balance, p_order_id,
          'Refund reversal: -' || v_reversal_amount || ' (' || v_cashback_pct || '%)');

  RETURN jsonb_build_object(
    'success', true,
    'reversed', v_reversal_amount,
    'new_balance', v_new_balance,
    'cashback_pct', v_cashback_pct
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
