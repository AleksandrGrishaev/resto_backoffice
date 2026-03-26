-- Function: get_customer_cabinet
-- Description: Get full customer cabinet data by token (for web cabinet / Telegram bot)
-- Usage: SELECT get_customer_cabinet('abc123token');

CREATE OR REPLACE FUNCTION get_customer_cabinet(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer RECORD;
  v_settings RECORD;
  v_tier_config JSONB;
  v_cashback_pct NUMERIC;
  v_next_tier JSONB;
  v_expiring_soon JSONB;
  v_recent_orders JSONB;
  v_transactions JSONB;
BEGIN
  -- 1. Find customer
  SELECT * INTO v_customer
  FROM customers
  WHERE token = p_token AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- 2. Get settings
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  -- Current tier cashback
  SELECT t INTO v_tier_config
  FROM jsonb_array_elements(v_settings.tiers) t
  WHERE t->>'name' = v_customer.tier;
  v_cashback_pct := COALESCE((v_tier_config->>'cashback_pct')::numeric, 5);

  -- Next tier info
  SELECT t INTO v_next_tier
  FROM jsonb_array_elements(v_settings.tiers) WITH ORDINALITY AS x(t, idx)
  WHERE idx > (
    SELECT idx FROM jsonb_array_elements(v_settings.tiers) WITH ORDINALITY AS y(t2, idx)
    WHERE t2->>'name' = v_customer.tier
  )
  ORDER BY idx
  LIMIT 1;

  -- 3. Points expiring in next 7 days
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'amount', remaining,
    'expires_at', expires_at
  )), '[]'::jsonb) INTO v_expiring_soon
  FROM loyalty_points
  WHERE customer_id = v_customer.id
    AND remaining > 0
    AND expires_at > now()
    AND expires_at <= now() + interval '7 days';

  -- 4. Recent orders (last 20)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'created_at', o.created_at,
    'final_amount', o.final_amount,
    'type', o.type
  ) ORDER BY o.created_at DESC), '[]'::jsonb) INTO v_recent_orders
  FROM (
    SELECT id, created_at, final_amount, type
    FROM orders
    WHERE customer_id = v_customer.id AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 20
  ) o;

  -- 5. Recent transactions (last 50)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', lt.id,
    'type', lt.type,
    'amount', lt.amount,
    'balance_after', lt.balance_after,
    'description', lt.description,
    'created_at', lt.created_at
  ) ORDER BY lt.created_at DESC), '[]'::jsonb) INTO v_transactions
  FROM (
    SELECT id, type, amount, balance_after, description, created_at
    FROM loyalty_transactions
    WHERE customer_id = v_customer.id
    ORDER BY created_at DESC
    LIMIT 50
  ) lt;

  RETURN jsonb_build_object(
    'success', true,
    'customer', jsonb_build_object(
      'name', v_customer.name,
      'tier', v_customer.tier,
      'cashback_pct', v_cashback_pct,
      'loyalty_balance', v_customer.loyalty_balance,
      'total_spent', v_customer.total_spent,
      'spent_90d', v_customer.spent_90d,
      'total_visits', v_customer.total_visits,
      'average_check', v_customer.average_check,
      'first_visit_at', v_customer.first_visit_at,
      'last_visit_at', v_customer.last_visit_at
    ),
    'next_tier', v_next_tier,
    'expiring_soon', v_expiring_soon,
    'recent_orders', v_recent_orders,
    'transactions', v_transactions
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
