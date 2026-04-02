-- Function: recalculate_tiers
-- Description: Recalculate customer tiers based on spending in the sliding window
-- Called daily by cron (Edge Function)
-- Usage: SELECT recalculate_tiers();

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
  v_final_tier TEXT;
  v_tier JSONB;
  v_upgraded INTEGER := 0;
  v_downgraded INTEGER := 0;
  v_unchanged INTEGER := 0;
BEGIN
  -- 1. Get settings
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  v_tiers := v_settings.tiers;

  -- 2. Process each digital customer (has telegram_id)
  FOR v_customer IN
    SELECT id, tier, telegram_id
    FROM customers
    WHERE status = 'active' AND telegram_id IS NOT NULL
  LOOP
    -- 3. Calculate spending in window
    SELECT COALESCE(SUM(o.final_amount), 0) INTO v_spent_window
    FROM orders o
    WHERE o.customer_id = v_customer.id
      AND o.status = 'completed'
      AND o.created_at >= now() - (v_settings.tier_window_days || ' days')::interval;

    -- 4. Determine target tier (highest threshold met)
    v_target_tier := 'member';
    FOR v_tier IN SELECT * FROM jsonb_array_elements(v_tiers)
    LOOP
      IF v_spent_window >= (v_tier->>'spending_threshold')::numeric THEN
        v_target_tier := v_tier->>'name';
      END IF;
    END LOOP;

    -- 5. Get tier indices for degradation limit
    SELECT idx - 1 INTO v_current_tier_idx
    FROM jsonb_array_elements(v_tiers) WITH ORDINALITY AS t(val, idx)
    WHERE val->>'name' = v_customer.tier;

    SELECT idx - 1 INTO v_target_tier_idx
    FROM jsonb_array_elements(v_tiers) WITH ORDINALITY AS t(val, idx)
    WHERE val->>'name' = v_target_tier;

    -- 6. Apply degradation limit
    IF v_target_tier_idx < v_current_tier_idx THEN
      -- Downgrade: limit to max_tier_degradation levels
      v_target_tier_idx := GREATEST(v_target_tier_idx, v_current_tier_idx - v_settings.max_tier_degradation);
      SELECT val->>'name' INTO v_final_tier
      FROM jsonb_array_elements(v_tiers) WITH ORDINALITY AS t(val, idx)
      WHERE idx - 1 = v_target_tier_idx;
    ELSE
      v_final_tier := v_target_tier;
    END IF;

    -- 7. Update if changed
    IF v_final_tier != v_customer.tier THEN
      UPDATE customers
      SET tier = v_final_tier,
          tier_updated_at = now(),
          spent_90d = v_spent_window
      WHERE id = v_customer.id;

      IF v_final_tier > v_customer.tier THEN
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
