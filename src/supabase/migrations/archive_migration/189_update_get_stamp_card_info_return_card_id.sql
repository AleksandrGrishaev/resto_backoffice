-- Migration: 189_update_get_stamp_card_info_return_card_id
-- Description: Add card_id to get_stamp_card_info RPC return for POS stamp_card_id tracking
-- Date: 2026-03-09

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
BEGIN
  SELECT * INTO v_card
  FROM stamp_cards
  WHERE card_number = p_card_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found');
  END IF;

  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  SELECT COALESCE(SUM(stamps), 0) INTO v_active_stamps
  FROM stamp_entries
  WHERE card_id = v_card.id
    AND cycle = v_card.cycle
    AND expires_at > now();

  SELECT r INTO v_active_reward
  FROM jsonb_array_elements(v_settings.stamp_rewards) r
  WHERE (r->>'stamps')::int <= v_active_stamps
  ORDER BY (r->>'stamps')::int DESC
  LIMIT 1;

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
    'all_rewards', v_settings.stamp_rewards,
    'last_visit', v_last_visit,
    'customer_id', v_card.customer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
