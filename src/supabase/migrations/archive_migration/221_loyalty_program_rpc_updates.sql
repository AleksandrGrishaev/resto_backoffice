-- Migration: 221_loyalty_program_rpc_updates
-- Description: Update apply_cashback and add_stamps RPCs to support loyalty_program field
-- Date: 2026-03-16
-- Context: web-winter added loyalty_program column to customers (stamps/cashback).
--   - apply_cashback: skip cashback for stamps-only customers
--   - add_stamps: auto-transition customer stamps→cashback on cycle completion

-- ========== apply_cashback v2 — check loyalty_program ==========

CREATE OR REPLACE FUNCTION apply_cashback(
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
  v_settings RECORD;
  v_tier_config JSONB;
  v_cashback_pct NUMERIC;
  v_cashback_amount NUMERIC;
  v_new_balance NUMERIC;
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

  -- 1b. Check loyalty_program — stamps-only customers don't earn cashback
  IF COALESCE(v_customer.loyalty_program, 'stamps') = 'stamps' THEN
    RETURN jsonb_build_object(
      'success', true,
      'cashback', 0,
      'cashback_pct', 0,
      'tier', v_customer.tier,
      'new_balance', v_customer.loyalty_balance,
      'total_visits', v_customer.total_visits,
      'skipped', true,
      'reason', 'Customer is on stamps program'
    );
  END IF;

  -- 2. Get settings and find cashback % for tier
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  SELECT t INTO v_tier_config
  FROM jsonb_array_elements(v_settings.tiers) t
  WHERE t->>'name' = v_customer.tier;

  v_cashback_pct := COALESCE((v_tier_config->>'cashback_pct')::numeric, 5);

  -- 3. Calculate cashback
  v_cashback_amount := round(p_order_amount * v_cashback_pct / 100);

  -- 4. Insert loyalty points
  INSERT INTO loyalty_points (customer_id, amount, remaining, source, order_id, description, expires_at)
  VALUES (
    p_customer_id,
    v_cashback_amount,
    v_cashback_amount,
    'cashback',
    p_order_id,
    'Cashback ' || v_cashback_pct || '% from order',
    now() + (v_settings.points_lifetime_days || ' days')::interval
  );

  -- 5. Update loyalty balance only (stats handled by update_customer_stats)
  v_new_balance := v_customer.loyalty_balance + v_cashback_amount;

  UPDATE customers SET
    loyalty_balance = v_new_balance
  WHERE id = p_customer_id;

  -- 6. Log transaction
  INSERT INTO loyalty_transactions (customer_id, type, amount, balance_after, order_id, description)
  VALUES (
    p_customer_id,
    'cashback',
    v_cashback_amount,
    v_new_balance,
    p_order_id,
    'Cashback ' || v_cashback_pct || '% from order ' || COALESCE(p_order_id::text, 'N/A')
  );

  RETURN jsonb_build_object(
    'success', true,
    'cashback', v_cashback_amount,
    'cashback_pct', v_cashback_pct,
    'tier', v_customer.tier,
    'new_balance', v_new_balance,
    'total_visits', v_customer.total_visits
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ========== add_stamps v2 — auto-transition stamps→cashback ==========

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

    -- Auto-transition customer from stamps → cashback on first cycle completion
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
    'loyalty_upgraded', v_new_cycle AND v_card.customer_id IS NOT NULL
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
