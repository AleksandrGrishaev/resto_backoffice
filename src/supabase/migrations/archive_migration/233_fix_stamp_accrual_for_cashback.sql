-- Migration: 233_fix_stamp_accrual_for_cashback
-- Description: Close stamp card on cycle completion (cashback upgrade) to prevent dual accrual
-- Date: 2026-03-17

-- CONTEXT: When a customer completes a stamp cycle, add_stamps RPC upgrades them to cashback.
-- But the stamp card remained 'active', causing stamps to still accrue alongside cashback
-- on subsequent payments. This migration updates add_stamps to set the card status to 'converted'
-- when the cycle completes, preventing dual accrual at the DB level.

CREATE OR REPLACE FUNCTION add_stamps(
  p_card_number TEXT,
  p_order_id UUID DEFAULT NULL,
  p_order_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
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

  -- 2. Get settings
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  -- 3. Calculate stamps
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

  -- 4. Insert stamp entry
  INSERT INTO stamp_entries (card_id, order_id, order_amount, stamps, cycle, expires_at)
  VALUES (
    v_card.id,
    p_order_id,
    p_order_amount,
    v_stamps_to_add,
    v_card.cycle,
    now() + (v_settings.stamp_lifetime_days || ' days')::interval
  );

  -- 5. Count total active stamps for current cycle
  SELECT COALESCE(SUM(stamps), 0) INTO v_total_active
  FROM stamp_entries
  WHERE card_id = v_card.id
    AND cycle = v_card.cycle
    AND expires_at > now();

  -- 6. Check available rewards
  SELECT jsonb_agg(r ORDER BY (r->>'stamps')::int)
  INTO v_available_rewards
  FROM jsonb_array_elements(v_settings.stamp_rewards) r
  WHERE (r->>'stamps')::int <= v_total_active;

  -- 7. Check if cycle complete
  IF v_total_active >= v_settings.stamps_per_cycle THEN
    UPDATE stamp_cards SET cycle = cycle + 1 WHERE id = v_card.id;
    v_new_cycle := true;

    -- Auto-transition customer from stamps -> cashback on first cycle completion
    IF v_card.customer_id IS NOT NULL THEN
      UPDATE customers
      SET loyalty_program = 'cashback'
      WHERE id = v_card.customer_id
        AND COALESCE(loyalty_program, 'stamps') = 'stamps';

      -- Close the stamp card since customer is now on cashback
      UPDATE stamp_cards SET status = 'converted', converted_at = now()
      WHERE id = v_card.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'stamps_added', v_stamps_to_add,
    'total_stamps', v_total_active,
    'stamps_per_cycle', v_settings.stamps_per_cycle,
    'available_rewards', COALESCE(v_available_rewards, '[]'::jsonb),
    'new_cycle', v_new_cycle,
    'loyalty_upgraded', v_new_cycle AND v_card.customer_id IS NOT NULL
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
