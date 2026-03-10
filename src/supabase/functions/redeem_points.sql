-- Function: redeem_points
-- Description: Redeem loyalty points using FIFO (oldest expire first)
-- Usage: SELECT redeem_points('customer-uuid', 'order-uuid', 20000);

CREATE OR REPLACE FUNCTION redeem_points(
  p_customer_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer RECORD;
  v_remaining_to_deduct NUMERIC;
  v_point RECORD;
  v_deduct NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Find customer
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer not found or blocked'
    );
  END IF;

  -- 2. Check balance
  IF v_customer.loyalty_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'balance', v_customer.loyalty_balance,
      'requested', p_amount
    );
  END IF;

  -- 3. FIFO deduction
  v_remaining_to_deduct := p_amount;

  FOR v_point IN
    SELECT id, remaining
    FROM loyalty_points
    WHERE customer_id = p_customer_id
      AND remaining > 0
      AND expires_at > now()
    ORDER BY expires_at ASC
  LOOP
    EXIT WHEN v_remaining_to_deduct <= 0;

    v_deduct := LEAST(v_point.remaining, v_remaining_to_deduct);

    UPDATE loyalty_points
    SET remaining = remaining - v_deduct
    WHERE id = v_point.id;

    v_remaining_to_deduct := v_remaining_to_deduct - v_deduct;
  END LOOP;

  -- Verify FIFO fully covered the amount
  IF v_remaining_to_deduct > 0 THEN
    RAISE EXCEPTION 'FIFO deduction incomplete: % remaining (balance desync)', v_remaining_to_deduct;
  END IF;

  -- 4. Update customer balance
  v_new_balance := GREATEST(0, v_customer.loyalty_balance - p_amount);

  UPDATE customers
  SET loyalty_balance = v_new_balance
  WHERE id = p_customer_id;

  -- 5. Log transaction
  INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, order_id, description)
  VALUES (
    p_customer_id,
    'redemption',
    -p_amount,
    v_new_balance,
    p_order_id,
    'Points redeemed for order'
  );

  RETURN jsonb_build_object(
    'success', true,
    'redeemed', p_amount,
    'new_balance', v_new_balance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
