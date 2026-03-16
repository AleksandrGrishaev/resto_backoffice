-- Migration: 190_loyalty_review_fixes
-- Description: Code review fixes for loyalty system
-- Date: 2026-03-09
-- Fixes: P5 (redeem FIFO check), M2 (expire balance guard), M3 (settings trigger),
--        L3 (stamp_cards index), L4 (settings singleton)

-- L3: Missing index on stamp_cards(customer_id)
CREATE INDEX IF NOT EXISTS idx_stamp_cards_customer ON stamp_cards(customer_id);

-- L4: Singleton constraint on loyalty_settings
ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS singleton_key BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE loyalty_settings ADD CONSTRAINT loyalty_settings_singleton UNIQUE (singleton_key);
ALTER TABLE loyalty_settings ADD CONSTRAINT loyalty_settings_singleton_check CHECK (singleton_key = true);

-- M3: updated_at trigger on loyalty_settings
CREATE OR REPLACE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON loyalty_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- P5: redeem_points — add FIFO exhaustion check + GREATEST guard
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
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found or blocked');
  END IF;

  IF v_customer.loyalty_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance',
      'balance', v_customer.loyalty_balance, 'requested', p_amount);
  END IF;

  v_remaining_to_deduct := p_amount;

  FOR v_point IN
    SELECT id, remaining FROM loyalty_points
    WHERE customer_id = p_customer_id AND remaining > 0 AND expires_at > now()
    ORDER BY expires_at ASC
  LOOP
    EXIT WHEN v_remaining_to_deduct <= 0;
    v_deduct := LEAST(v_point.remaining, v_remaining_to_deduct);
    UPDATE loyalty_points SET remaining = remaining - v_deduct WHERE id = v_point.id;
    v_remaining_to_deduct := v_remaining_to_deduct - v_deduct;
  END LOOP;

  -- Verify FIFO fully covered the amount
  IF v_remaining_to_deduct > 0 THEN
    RAISE EXCEPTION 'FIFO deduction incomplete: % remaining (balance desync)', v_remaining_to_deduct;
  END IF;

  v_new_balance := GREATEST(0, v_customer.loyalty_balance - p_amount);
  UPDATE customers SET loyalty_balance = v_new_balance WHERE id = p_customer_id;

  INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, order_id, description)
  VALUES (p_customer_id, 'redemption', -p_amount, v_new_balance, p_order_id, 'Points redeemed for order');

  RETURN jsonb_build_object('success', true, 'redeemed', p_amount, 'new_balance', v_new_balance);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- M2: expire_points — add GREATEST(0,...) guard against negative balance
CREATE OR REPLACE FUNCTION expire_points()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_point RECORD;
  v_total_expired NUMERIC := 0;
  v_customers_affected INTEGER := 0;
  v_customer_ids UUID[];
BEGIN
  FOR v_point IN
    SELECT lp.id, lp.customer_id, lp.remaining
    FROM loyalty_points lp
    WHERE lp.remaining > 0 AND lp.expires_at <= now()
  LOOP
    UPDATE loyalty_points SET remaining = 0 WHERE id = v_point.id;

    UPDATE customers
    SET loyalty_balance = GREATEST(0, loyalty_balance - v_point.remaining)
    WHERE id = v_point.customer_id;

    INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, description)
    VALUES (v_point.customer_id, 'expiration', -v_point.remaining,
      (SELECT loyalty_balance FROM customers WHERE id = v_point.customer_id), 'Points expired');

    v_total_expired := v_total_expired + v_point.remaining;

    IF NOT v_point.customer_id = ANY(COALESCE(v_customer_ids, ARRAY[]::UUID[])) THEN
      v_customer_ids := array_append(COALESCE(v_customer_ids, ARRAY[]::UUID[]), v_point.customer_id);
      v_customers_affected := v_customers_affected + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'total_expired', v_total_expired, 'customers_affected', v_customers_affected);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
