-- Function: get_stamp_card_info (v2)
-- Description: Get stamp card info by number (for POS cashier)
-- v2: checks stamp_reward_redemptions, returns category_ids + redeemed flag
-- Usage: SELECT get_stamp_card_info('001');

CREATE OR REPLACE FUNCTION get_stamp_card_info(p_card_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_settings RECORD;
  v_active_stamps INTEGER;
  v_active_reward JSONB;
  v_last_visit TIMESTAMPTZ;
  v_redeemed_tiers INTEGER[];
  v_reward JSONB;
  v_enriched_rewards JSONB := '[]'::jsonb;
  v_tier_stamps INTEGER;
BEGIN
  -- 1. Find card
  SELECT * INTO v_card
  FROM stamp_cards
  WHERE card_number = p_card_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found');
  END IF;

  -- 2. Get settings
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loyalty settings not configured');
  END IF;

  -- 3. Count active stamps for current cycle
  SELECT COALESCE(SUM(stamps), 0) INTO v_active_stamps
  FROM stamp_entries
  WHERE card_id = v_card.id
    AND cycle = v_card.cycle
    AND expires_at > now();

  -- 4. Get redeemed tiers for this card+cycle
  SELECT COALESCE(array_agg(reward_tier), '{}')
  INTO v_redeemed_tiers
  FROM stamp_reward_redemptions
  WHERE card_id = v_card.id
    AND cycle = v_card.cycle;

  -- 5. Enrich all rewards with "redeemed" flag
  FOR v_reward IN SELECT value FROM jsonb_array_elements(v_settings.stamp_rewards) AS value
  LOOP
    v_tier_stamps := (v_reward->>'stamps')::int;
    v_enriched_rewards := v_enriched_rewards || jsonb_build_array(
      v_reward || jsonb_build_object('redeemed', v_tier_stamps = ANY(v_redeemed_tiers))
    );
  END LOOP;

  -- 6. Find highest qualifying AND unredeemed reward
  v_active_reward := NULL;
  SELECT r INTO v_active_reward
  FROM jsonb_array_elements(v_settings.stamp_rewards) r
  WHERE (r->>'stamps')::int <= v_active_stamps
    AND (r->>'stamps')::int != ALL(v_redeemed_tiers)
  ORDER BY (r->>'stamps')::int DESC
  LIMIT 1;

  -- Add redeemed=false to active_reward if found
  IF v_active_reward IS NOT NULL THEN
    v_active_reward := v_active_reward || jsonb_build_object('redeemed', false);
  END IF;

  -- 7. Last visit
  SELECT MAX(created_at) INTO v_last_visit
  FROM stamp_entries
  WHERE card_id = v_card.id;

  RETURN jsonb_build_object(
    'success', true,
    'card_id', v_card.id,
    'card_number', v_card.card_number,
    'status', v_card.status,
    'stamps', v_active_stamps,
    'stamps_per_cycle', v_settings.stamps_per_cycle,
    'cycle', v_card.cycle,
    'active_reward', v_active_reward,
    'all_rewards', v_enriched_rewards,
    'last_visit', v_last_visit,
    'customer_id', v_card.customer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
