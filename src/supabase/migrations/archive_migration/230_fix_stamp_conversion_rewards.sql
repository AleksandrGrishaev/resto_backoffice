-- Migration: Fix stamp-to-cashback conversion
-- Date: 2026-03-17
-- Changes:
--   1. convert_stamp_card: switch loyalty_program + convert unredeemed rewards to points (proportional)
--   2. add_stamps: on cycle completion, convert unredeemed rewards to points + switch program
--   Fixes: FOR UPDATE locks, loyalty_settings validation, points_lifetime_days null-safety

-- ============================================================
-- 1. Updated convert_stamp_card
--    - No stamp-to-points conversion (stamps are just stamps)
--    - Unredeemed reached rewards: max_discount in full
--    - Unredeemed unreached rewards: proportional progress between milestones
--    - Switches loyalty_program to 'cashback'
--    - Called from backoffice POS only (no caller auth check — SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.convert_stamp_card(
  p_card_number text,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_customer RECORD;
  v_settings RECORD;
  v_active_stamps INTEGER;
  v_new_balance NUMERIC;
  v_reward RECORD;
  v_reward_points NUMERIC := 0;
  v_reward_details TEXT[] := '{}';
  v_redeemed_tiers INTEGER[];
  v_prev_milestone INTEGER;
  v_progress NUMERIC;
  v_reward_value NUMERIC;
  v_points_lifetime INTEGER;
BEGIN
  -- Lock card row to prevent concurrent conversion/add_stamps
  SELECT * INTO v_card
  FROM stamp_cards
  WHERE card_number = p_card_number AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found or not active');
  END IF;

  -- Lock customer row to prevent concurrent balance updates
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found or blocked');
  END IF;

  SELECT * INTO v_settings FROM loyalty_settings WHERE is_active = true LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loyalty settings not configured');
  END IF;

  v_points_lifetime := COALESCE(v_settings.points_lifetime_days, 365);

  -- Count active (non-expired) stamps
  SELECT COALESCE(SUM(stamps), 0) INTO v_active_stamps
  FROM stamp_entries
  WHERE card_id = v_card.id AND cycle = v_card.cycle AND expires_at > now();

  IF v_active_stamps = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active stamps to convert');
  END IF;

  -- Collect already redeemed reward tiers
  SELECT COALESCE(array_agg(srr.reward_tier), '{}')
  INTO v_redeemed_tiers
  FROM stamp_reward_redemptions srr
  WHERE srr.card_id = v_card.id AND srr.cycle = v_card.cycle;

  -- Convert unredeemed rewards to points (proportional between milestones)
  -- Reached rewards (stamps >= milestone): max_discount in full
  -- Unreached next reward: (stamps - prev_milestone) / (milestone - prev_milestone) × max_discount
  v_prev_milestone := 0;
  FOR v_reward IN
    SELECT (r->>'stamps')::int AS stamps, r->>'category' AS category, (r->>'max_discount')::numeric AS max_discount
    FROM jsonb_array_elements(v_settings.stamp_rewards) r
    ORDER BY (r->>'stamps')::int
  LOOP
    IF NOT (v_reward.stamps = ANY(v_redeemed_tiers)) THEN
      IF v_active_stamps >= v_reward.stamps THEN
        -- Fully reached: award max_discount
        v_reward_value := v_reward.max_discount;
        v_reward_points := v_reward_points + v_reward_value;
        v_reward_details := array_append(v_reward_details,
          v_reward.category || ' (' || v_reward_value || ' IDR, 100%)');
      ELSIF v_active_stamps > v_prev_milestone THEN
        -- Partially reached: proportional between prev milestone and this one
        v_progress := (v_active_stamps - v_prev_milestone)::numeric / (v_reward.stamps - v_prev_milestone);
        v_reward_value := round(v_reward.max_discount * v_progress);
        v_reward_points := v_reward_points + v_reward_value;
        v_reward_details := array_append(v_reward_details,
          v_reward.category || ' (' || v_reward_value || ' IDR, ' || round(v_progress * 100) || '%)');
      END IF;
    END IF;
    v_prev_milestone := v_reward.stamps;
  END LOOP;

  v_new_balance := v_customer.loyalty_balance + v_reward_points;

  -- Insert reward conversion (if any rewards to convert)
  IF v_reward_points > 0 THEN
    INSERT INTO loyalty_points (customer_id, amount, remaining, source, description, expires_at)
    VALUES (p_customer_id, v_reward_points, v_reward_points, 'conversion',
      'Unredeemed rewards from card ' || p_card_number,
      now() + make_interval(days => v_points_lifetime));

    INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, description)
    VALUES (p_customer_id, 'conversion', v_reward_points, v_new_balance,
      'Unredeemed rewards: ' || array_to_string(v_reward_details, ', '));
  END IF;

  -- Update customer balance and switch to cashback program
  UPDATE customers
  SET loyalty_balance = v_new_balance,
      loyalty_program = 'cashback'
  WHERE id = p_customer_id;

  -- Mark card as converted
  UPDATE stamp_cards
  SET status = 'converted', customer_id = p_customer_id, converted_at = now()
  WHERE id = v_card.id;

  RETURN jsonb_build_object(
    'success', true,
    'stamps', v_active_stamps,
    'reward_points', v_reward_points,
    'reward_details', v_reward_details,
    'new_balance', v_new_balance);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'convert_stamp_card error: % (card=%, customer=%)', SQLERRM, p_card_number, p_customer_id;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 2. Updated add_stamps — convert unredeemed rewards on cycle completion
--    At 15/15 all rewards are reached, so unredeemed ones get max_discount in full
-- ============================================================
DROP FUNCTION IF EXISTS public.add_stamps(text, uuid, numeric);

CREATE OR REPLACE FUNCTION public.add_stamps(
  p_card_number text,
  p_order_id uuid DEFAULT NULL,
  p_order_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_settings RECORD;
  v_stamps_to_add INTEGER;
  v_total_active INTEGER;
  v_available_rewards JSONB;
  v_new_cycle BOOLEAN := false;
  v_reward RECORD;
  v_reward_points NUMERIC := 0;
  v_reward_details TEXT[] := '{}';
  v_redeemed_tiers INTEGER[];
  v_customer RECORD;
  v_new_balance NUMERIC;
  v_points_lifetime INTEGER;
BEGIN
  -- Lock card row to prevent concurrent add_stamps/convert calls
  SELECT * INTO v_card
  FROM stamp_cards
  WHERE card_number = p_card_number AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Card not found or not active'
    );
  END IF;

  SELECT * INTO v_settings FROM loyalty_settings WHERE is_active = true LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loyalty settings not configured');
  END IF;

  v_points_lifetime := COALESCE(v_settings.points_lifetime_days, 365);

  v_stamps_to_add := floor(p_order_amount / v_settings.stamp_threshold);

  IF v_stamps_to_add = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'stamps_added', 0,
      'total_stamps', (
        SELECT COALESCE(SUM(stamps), 0)
        FROM stamp_entries
        WHERE card_id = v_card.id
          AND cycle = v_card.cycle
          AND expires_at > now()
      ),
      'message', 'Order amount below stamp threshold'
    );
  END IF;

  INSERT INTO stamp_entries (card_id, order_id, order_amount, stamps, cycle, expires_at)
  VALUES (
    v_card.id,
    p_order_id,
    p_order_amount,
    v_stamps_to_add,
    v_card.cycle,
    now() + make_interval(days => COALESCE(v_settings.stamp_lifetime_days, 90))
  );

  SELECT COALESCE(SUM(stamps), 0) INTO v_total_active
  FROM stamp_entries
  WHERE card_id = v_card.id
    AND cycle = v_card.cycle
    AND expires_at > now();

  SELECT jsonb_agg(r ORDER BY (r->>'stamps')::int)
  INTO v_available_rewards
  FROM jsonb_array_elements(v_settings.stamp_rewards) r
  WHERE (r->>'stamps')::int <= v_total_active;

  -- Cycle completion: convert unredeemed rewards + switch to cashback
  IF v_total_active >= v_settings.stamps_per_cycle THEN
    -- Collect redeemed reward tiers for current cycle
    SELECT COALESCE(array_agg(srr.reward_tier), '{}')
    INTO v_redeemed_tiers
    FROM stamp_reward_redemptions srr
    WHERE srr.card_id = v_card.id AND srr.cycle = v_card.cycle;

    -- Calculate unredeemed rewards value (max_discount in full — all milestones reached at 15/15)
    FOR v_reward IN
      SELECT (r->>'stamps')::int AS stamps, r->>'category' AS category, (r->>'max_discount')::numeric AS max_discount
      FROM jsonb_array_elements(v_settings.stamp_rewards) r
      WHERE (r->>'stamps')::int <= v_total_active
      ORDER BY (r->>'stamps')::int
    LOOP
      IF NOT (v_reward.stamps = ANY(v_redeemed_tiers)) THEN
        v_reward_points := v_reward_points + v_reward.max_discount;
        v_reward_details := array_append(v_reward_details,
          v_reward.category || ' (' || v_reward.max_discount || ' IDR)');
      END IF;
    END LOOP;

    -- Credit unredeemed rewards to customer balance
    IF v_reward_points > 0 AND v_card.customer_id IS NOT NULL THEN
      -- Lock customer row to prevent concurrent balance updates
      SELECT * INTO v_customer
      FROM customers WHERE id = v_card.customer_id AND status = 'active'
      FOR UPDATE;

      IF FOUND THEN
        v_new_balance := v_customer.loyalty_balance + v_reward_points;

        UPDATE customers SET loyalty_balance = v_new_balance WHERE id = v_card.customer_id;

        INSERT INTO loyalty_points (customer_id, amount, remaining, source, description, expires_at)
        VALUES (v_card.customer_id, v_reward_points, v_reward_points, 'conversion',
          'Unredeemed rewards from card ' || p_card_number || ' cycle ' || v_card.cycle,
          now() + make_interval(days => v_points_lifetime));

        INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, description)
        VALUES (v_card.customer_id, 'conversion', v_reward_points, v_new_balance,
          'Unredeemed rewards: ' || array_to_string(v_reward_details, ', '));
      END IF;
    END IF;

    -- Start new cycle
    UPDATE stamp_cards SET cycle = cycle + 1 WHERE id = v_card.id;
    v_new_cycle := true;

    -- Switch customer to cashback program
    IF v_card.customer_id IS NOT NULL THEN
      UPDATE customers
      SET loyalty_program = 'cashback'
      WHERE id = v_card.customer_id
        AND COALESCE(loyalty_program, 'stamps') = 'stamps';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'stamps_added', v_stamps_to_add,
    'total_stamps', v_total_active,
    'stamps_per_cycle', v_settings.stamps_per_cycle,
    'available_rewards', COALESCE(v_available_rewards, '[]'::jsonb),
    'new_cycle', v_new_cycle,
    'loyalty_upgraded', v_new_cycle AND v_card.customer_id IS NOT NULL,
    'reward_points', v_reward_points,
    'reward_details', v_reward_details
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'add_stamps error: % (card=%, order=%)', SQLERRM, p_card_number, p_order_id;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
