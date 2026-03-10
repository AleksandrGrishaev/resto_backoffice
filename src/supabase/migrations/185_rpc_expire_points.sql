-- Function: expire_points
-- Description: Expire loyalty points past their expiration date
-- Called daily by cron (Edge Function)
-- Usage: SELECT expire_points();

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
  -- 1. Find all expired points with remaining > 0
  FOR v_point IN
    SELECT lp.id, lp.customer_id, lp.remaining
    FROM loyalty_points lp
    WHERE lp.remaining > 0
      AND lp.expires_at <= now()
  LOOP
    -- Zero out remaining
    UPDATE loyalty_points SET remaining = 0 WHERE id = v_point.id;

    -- Update customer balance
    UPDATE customers
    SET loyalty_balance = loyalty_balance - v_point.remaining
    WHERE id = v_point.customer_id;

    -- Log transaction
    INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, description)
    VALUES (
      v_point.customer_id,
      'expiration',
      -v_point.remaining,
      (SELECT loyalty_balance FROM customers WHERE id = v_point.customer_id),
      'Points expired'
    );

    v_total_expired := v_total_expired + v_point.remaining;

    IF NOT v_point.customer_id = ANY(COALESCE(v_customer_ids, ARRAY[]::UUID[])) THEN
      v_customer_ids := array_append(COALESCE(v_customer_ids, ARRAY[]::UUID[]), v_point.customer_id);
      v_customers_affected := v_customers_affected + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_expired', v_total_expired,
    'customers_affected', v_customers_affected
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
