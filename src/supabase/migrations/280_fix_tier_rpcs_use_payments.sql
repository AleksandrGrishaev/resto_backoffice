-- Migration: 280_fix_tier_rpcs_use_payments
-- Description: Switch tier window calculation from orders to payments table
-- Date: 2026-03-31
-- Context: payments.customer_id is now the source of truth (after backfill migration 279)

-- 1. update_customer_stats — tier window now uses payments
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
  v_settings RECORD;
  v_tiers JSONB;
  v_spent_window NUMERIC;
  v_target_tier TEXT;
  v_target_idx INT;
  v_current_idx INT;
  v_previous_tier TEXT;
  v_tier_changed BOOLEAN := false;
BEGIN
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found or blocked');
  END IF;

  v_new_total_spent := v_customer.total_spent + p_order_amount;
  v_new_visits := v_customer.total_visits + 1;
  v_new_avg_check := round(v_new_total_spent / v_new_visits);

  UPDATE customers SET
    total_spent = v_new_total_spent,
    total_visits = v_new_visits,
    average_check = v_new_avg_check,
    first_visit_at = COALESCE(first_visit_at, now()),
    last_visit_at = now()
  WHERE id = p_customer_id;

  v_previous_tier := v_customer.tier;

  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  IF v_settings IS NOT NULL AND v_settings.tiers IS NOT NULL THEN
    v_tiers := v_settings.tiers;

    -- Calculate spending in window — sum completed payments for this customer
    -- Note: current payment is already saved with customer_id before this RPC runs,
    -- so no need to add p_order_amount separately
    SELECT COALESCE(SUM(amount), 0) INTO v_spent_window
    FROM payments
    WHERE customer_id = p_customer_id
      AND status = 'completed'
      AND amount > 0
      AND created_at >= now() - (v_settings.tier_window_days || ' days')::interval;

    v_target_tier := 'member';
    v_target_idx := 0;
    FOR i IN 0..jsonb_array_length(v_tiers)-1 LOOP
      IF v_spent_window >= (v_tiers->i->>'spending_threshold')::numeric THEN
        v_target_tier := v_tiers->i->>'name';
        v_target_idx := i;
      END IF;
    END LOOP;

    v_current_idx := 0;
    FOR i IN 0..jsonb_array_length(v_tiers)-1 LOOP
      IF v_tiers->i->>'name' = v_customer.tier THEN
        v_current_idx := i;
      END IF;
    END LOOP;

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
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. recalculate_tiers — tier window now uses payments
CREATE OR REPLACE FUNCTION recalculate_tiers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings RECORD;
  v_tiers JSONB;
  v_customer RECORD;
  v_spent_window NUMERIC;
  v_target_tier TEXT;
  v_current_tier_idx INTEGER;
  v_target_tier_idx INTEGER;
  v_upgraded INTEGER := 0;
  v_downgraded INTEGER := 0;
  v_unchanged INTEGER := 0;
BEGIN
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  IF v_settings IS NULL OR v_settings.tiers IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No loyalty_settings found');
  END IF;
  v_tiers := v_settings.tiers;

  FOR v_customer IN
    SELECT id, tier
    FROM customers
    WHERE status = 'active' AND loyalty_program = 'cashback'
  LOOP
    -- Calculate spending in window (completed payments only)
    SELECT COALESCE(SUM(p.amount), 0) INTO v_spent_window
    FROM payments p
    WHERE p.customer_id = v_customer.id
      AND p.status = 'completed'
      AND p.amount > 0
      AND p.created_at >= now() - (v_settings.tier_window_days || ' days')::interval;

    v_target_tier := 'member';
    v_target_tier_idx := 0;
    FOR i IN 0..jsonb_array_length(v_tiers)-1 LOOP
      IF v_spent_window >= (v_tiers->i->>'spending_threshold')::numeric THEN
        v_target_tier := v_tiers->i->>'name';
        v_target_tier_idx := i;
      END IF;
    END LOOP;

    v_current_tier_idx := 0;
    FOR i IN 0..jsonb_array_length(v_tiers)-1 LOOP
      IF v_tiers->i->>'name' = v_customer.tier THEN
        v_current_tier_idx := i;
      END IF;
    END LOOP;

    IF v_target_tier != v_customer.tier THEN
      UPDATE customers
      SET tier = v_target_tier,
          tier_updated_at = now(),
          spent_90d = v_spent_window
      WHERE id = v_customer.id;

      IF v_target_tier_idx > v_current_tier_idx THEN
        v_upgraded := v_upgraded + 1;
      ELSE
        v_downgraded := v_downgraded + 1;
      END IF;
    ELSE
      UPDATE customers SET spent_90d = v_spent_window WHERE id = v_customer.id;
      v_unchanged := v_unchanged + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'upgraded', v_upgraded,
    'downgraded', v_downgraded,
    'unchanged', v_unchanged
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
