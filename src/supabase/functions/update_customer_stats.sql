-- Function: update_customer_stats
-- Description: Update customer visit/spend statistics after payment + inline tier upgrade
-- Independent of loyalty accrual - always called when customer is attached to order
-- Usage: SELECT update_customer_stats('customer-uuid', 'order-uuid', 46575);

CREATE OR REPLACE FUNCTION update_customer_stats(
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
  v_new_total_spent NUMERIC;
  v_new_visits INTEGER;
  v_new_avg_check NUMERIC;
  -- Tier upgrade variables
  v_settings RECORD;
  v_tiers JSONB;
  v_spent_window NUMERIC;
  v_target_tier TEXT;
  v_target_idx INT;
  v_current_idx INT;
  v_previous_tier TEXT;
  v_tier_changed BOOLEAN := false;
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

  -- 2. Calculate new stats
  v_new_total_spent := v_customer.total_spent + p_order_amount;
  v_new_visits := v_customer.total_visits + 1;
  v_new_avg_check := round(v_new_total_spent / v_new_visits);

  -- 3. Update customer stats
  UPDATE customers SET
    total_spent = v_new_total_spent,
    total_visits = v_new_visits,
    average_check = v_new_avg_check,
    first_visit_at = COALESCE(first_visit_at, now()),
    last_visit_at = now()
  WHERE id = p_customer_id;

  -- 4. Tier upgrade check
  v_previous_tier := v_customer.tier;

  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  IF v_settings IS NOT NULL AND v_settings.tiers IS NOT NULL THEN
    v_tiers := v_settings.tiers;

    -- Calculate spending in window — count all paid orders (any non-cancelled status with payment)
    SELECT COALESCE(SUM(final_amount), 0) + p_order_amount INTO v_spent_window
    FROM orders
    WHERE customer_id = p_customer_id
      AND status NOT IN ('cancelled')
      AND created_at >= now() - (v_settings.tier_window_days || ' days')::interval;

    -- Find target tier (highest qualifying)
    v_target_tier := 'member';
    v_target_idx := 0;
    FOR i IN 0..jsonb_array_length(v_tiers)-1 LOOP
      IF v_spent_window >= (v_tiers->i->>'spending_threshold')::numeric THEN
        v_target_tier := v_tiers->i->>'name';
        v_target_idx := i;
      END IF;
    END LOOP;

    -- Get current tier index
    v_current_idx := 0;
    FOR i IN 0..jsonb_array_length(v_tiers)-1 LOOP
      IF v_tiers->i->>'name' = v_customer.tier THEN
        v_current_idx := i;
      END IF;
    END LOOP;

    -- Upgrade only (not downgrade)
    IF v_target_idx > v_current_idx THEN
      UPDATE customers SET
        tier = v_target_tier,
        tier_updated_at = now(),
        spent_90d = v_spent_window
      WHERE id = p_customer_id;
      v_tier_changed := true;
    ELSE
      UPDATE customers SET spent_90d = v_spent_window WHERE id = p_customer_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_spent', v_new_total_spent,
    'total_visits', v_new_visits,
    'average_check', v_new_avg_check,
    'tier', CASE WHEN v_tier_changed THEN v_target_tier ELSE v_customer.tier END,
    'previous_tier', v_previous_tier,
    'tier_changed', v_tier_changed,
    'spent_window', v_spent_window
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
