-- Function: apply_cashback
-- Description: Apply cashback points after order payment
-- Usage: SELECT apply_cashback('customer-uuid', 'order-uuid', 138000);

CREATE OR REPLACE FUNCTION apply_cashback(
  p_customer_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_order_amount NUMERIC DEFAULT 0
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
  v_cashback_amount NUMERIC;
  v_new_balance NUMERIC;
  v_new_total_spent NUMERIC;
  v_new_visits INTEGER;
  v_new_avg_check NUMERIC;
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

  -- 2. Get settings and find cashback % for tier
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  SELECT t INTO v_tier_config
  FROM jsonb_array_elements(v_settings.tiers) t
  WHERE t->>'name' = v_customer.tier;

  v_cashback_pct := COALESCE((v_tier_config->>'cashback_pct')::numeric, 5);

  -- 3. Calculate cashback
  v_cashback_amount := round(p_order_amount * v_cashback_pct / 100);

  -- 4. Insert loyalty points
  INSERT INTO loyalty_points (customer_id, amount, remaining, source, order_id, description, expires_at)
  VALUES (
    p_customer_id,
    v_cashback_amount,
    v_cashback_amount,
    'cashback',
    p_order_id,
    'Cashback ' || v_cashback_pct || '% from order',
    now() + (v_settings.points_lifetime_days || ' days')::interval
  );

  -- 5. Update customer stats
  v_new_total_spent := v_customer.total_spent + p_order_amount;
  v_new_visits := v_customer.total_visits + 1;
  v_new_avg_check := round(v_new_total_spent / v_new_visits);
  v_new_balance := v_customer.loyalty_balance + v_cashback_amount;

  UPDATE customers SET
    loyalty_balance = v_new_balance,
    total_spent = v_new_total_spent,
    total_visits = v_new_visits,
    average_check = v_new_avg_check,
    first_visit_at = COALESCE(first_visit_at, now()),
    last_visit_at = now()
  WHERE id = p_customer_id;

  -- 6. Log transaction
  INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, order_id, description)
  VALUES (
    p_customer_id,
    'cashback',
    v_cashback_amount,
    v_new_balance,
    p_order_id,
    'Cashback ' || v_cashback_pct || '% from order ' || COALESCE(p_order_id::text, 'N/A')
  );

  RETURN jsonb_build_object(
    'success', true,
    'cashback', v_cashback_amount,
    'cashback_pct', v_cashback_pct,
    'tier', v_customer.tier,
    'new_balance', v_new_balance,
    'total_visits', v_new_visits
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
