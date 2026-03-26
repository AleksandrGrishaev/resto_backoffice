-- Function: convert_stamp_card
-- Description: Convert physical stamp card to digital points
-- Formula: stamps * stamp_threshold * cashback_pct% * (1 + conversion_bonus_pct%)
-- Usage: SELECT convert_stamp_card('001', 'customer-uuid');

CREATE OR REPLACE FUNCTION convert_stamp_card(
  p_card_number TEXT,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_customer RECORD;
  v_settings RECORD;
  v_tier_config JSONB;
  v_cashback_pct NUMERIC;
  v_active_stamps INTEGER;
  v_base_amount NUMERIC;
  v_points NUMERIC;
  v_bonus NUMERIC;
  v_total_points NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Find active card
  SELECT * INTO v_card
  FROM stamp_cards
  WHERE card_number = p_card_number AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Card not found or not active'
    );
  END IF;

  -- 2. Find customer
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer not found or blocked'
    );
  END IF;

  -- 3. Get settings
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  -- 4. Get cashback % for customer tier
  SELECT t INTO v_tier_config
  FROM jsonb_array_elements(v_settings.tiers) t
  WHERE t->>'name' = v_customer.tier;

  v_cashback_pct := COALESCE((v_tier_config->>'cashback_pct')::numeric, 5);

  -- 5. Count active stamps (not expired)
  SELECT COALESCE(SUM(stamps), 0) INTO v_active_stamps
  FROM stamp_entries
  WHERE card_id = v_card.id
    AND cycle = v_card.cycle
    AND expires_at > now();

  IF v_active_stamps = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active stamps to convert'
    );
  END IF;

  -- 6. Calculate points: stamps * threshold * cashback% * (1 + bonus%)
  v_base_amount := v_active_stamps * v_settings.stamp_threshold;
  v_points := round(v_base_amount * v_cashback_pct / 100);
  v_bonus := round(v_points * v_settings.conversion_bonus_pct / 100);
  v_total_points := v_points + v_bonus;

  -- 7. Create loyalty points
  INSERT INTO loyalty_points (customer_id, amount, remaining, source, description, expires_at)
  VALUES (
    p_customer_id,
    v_total_points,
    v_total_points,
    'conversion',
    'Converted from card ' || p_card_number || ' (' || v_active_stamps || ' stamps)',
    now() + (v_settings.points_lifetime_days || ' days')::interval
  );

  -- 8. Update customer balance
  v_new_balance := v_customer.loyalty_balance + v_total_points;

  UPDATE customers
  SET loyalty_balance = v_new_balance
  WHERE id = p_customer_id;

  -- 9. Close card
  UPDATE stamp_cards
  SET status = 'converted',
      customer_id = p_customer_id,
      converted_at = now()
  WHERE id = v_card.id;

  -- 10. Log transaction
  INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, description)
  VALUES (
    p_customer_id,
    'conversion',
    v_total_points,
    v_new_balance,
    'Card ' || p_card_number || ': ' || v_active_stamps || ' stamps = ' ||
    v_base_amount || ' IDR * ' || v_cashback_pct || '% + ' ||
    v_settings.conversion_bonus_pct || '% bonus'
  );

  RETURN jsonb_build_object(
    'success', true,
    'stamps', v_active_stamps,
    'base_amount', v_base_amount,
    'cashback_pct', v_cashback_pct,
    'points', v_points,
    'bonus', v_bonus,
    'total_points', v_total_points,
    'new_balance', v_new_balance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
