-- Migration: 273_fix_merge_customers_security
-- Description: Add is_staff() check and target validation to merge_customers RPC
-- Date: 2026-03-30
-- Fixes: HIGH - any authenticated user could merge customers (now requires staff)
--        MEDIUM - could merge into blocked/already-merged customer (now validated)

CREATE OR REPLACE FUNCTION public.merge_customers(
  p_source_id UUID,
  p_target_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source RECORD;
  v_target RECORD;
  v_orders_moved INT := 0;
  v_transactions_moved INT := 0;
  v_identities_moved INT := 0;
  v_cards_moved INT := 0;
  v_points_moved INT := 0;
  v_invites_moved INT := 0;
BEGIN
  -- Security: only staff can merge customers
  IF NOT is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_source_id = p_target_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot merge customer into itself');
  END IF;

  IF p_source_id < p_target_id THEN
    SELECT * INTO v_source FROM customers WHERE id = p_source_id FOR UPDATE;
    SELECT * INTO v_target FROM customers WHERE id = p_target_id FOR UPDATE;
  ELSE
    SELECT * INTO v_target FROM customers WHERE id = p_target_id FOR UPDATE;
    SELECT * INTO v_source FROM customers WHERE id = p_source_id FOR UPDATE;
  END IF;

  IF v_source.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source customer not found');
  END IF;
  IF v_target.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target customer not found');
  END IF;
  IF v_source.merged_into IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source customer is already merged');
  END IF;
  IF v_target.merged_into IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target customer is already merged');
  END IF;
  IF v_target.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target customer is not active');
  END IF;

  UPDATE orders
  SET customer_id = p_target_id,
      customer_name = v_target.name,
      bills = (
        SELECT COALESCE(jsonb_agg(
          bill || jsonb_build_object('customerId', p_target_id, 'customerName', v_target.name)
        ), bills)
        FROM jsonb_array_elements(bills) AS bill
      )
  WHERE customer_id = p_source_id;
  GET DIAGNOSTICS v_orders_moved = ROW_COUNT;

  UPDATE loyalty_transactions SET customer_id = p_target_id
  WHERE customer_id = p_source_id;
  GET DIAGNOSTICS v_transactions_moved = ROW_COUNT;

  UPDATE loyalty_points SET customer_id = p_target_id
  WHERE customer_id = p_source_id;
  GET DIAGNOSTICS v_points_moved = ROW_COUNT;

  UPDATE stamp_cards SET customer_id = p_target_id
  WHERE customer_id = p_source_id;
  GET DIAGNOSTICS v_cards_moved = ROW_COUNT;

  UPDATE customer_identities SET customer_id = p_target_id
  WHERE customer_id = p_source_id
    AND auth_user_id NOT IN (
      SELECT auth_user_id FROM customer_identities WHERE customer_id = p_target_id
    );
  GET DIAGNOSTICS v_identities_moved = ROW_COUNT;
  DELETE FROM customer_identities WHERE customer_id = p_source_id;

  UPDATE customer_invites SET customer_id = p_target_id
  WHERE customer_id = p_source_id;
  GET DIAGNOSTICS v_invites_moved = ROW_COUNT;

  UPDATE customers SET
    loyalty_balance = loyalty_balance + v_source.loyalty_balance,
    total_spent = total_spent + v_source.total_spent,
    spent_90d = spent_90d + v_source.spent_90d,
    total_visits = total_visits + v_source.total_visits,
    average_check = CASE
      WHEN (total_visits + v_source.total_visits) > 0
      THEN (total_spent + v_source.total_spent) / (total_visits + v_source.total_visits)
      ELSE 0
    END,
    first_visit_at = LEAST(first_visit_at, v_source.first_visit_at),
    last_visit_at = GREATEST(last_visit_at, v_source.last_visit_at),
    telegram_id = COALESCE(telegram_id, v_source.telegram_id),
    telegram_username = COALESCE(telegram_username, v_source.telegram_username),
    phone = COALESCE(phone, v_source.phone),
    email = COALESCE(email, v_source.email),
    updated_at = now()
  WHERE id = p_target_id;

  UPDATE customers SET
    status = 'merged',
    merged_into = p_target_id,
    loyalty_balance = 0,
    updated_at = now()
  WHERE id = p_source_id;

  RETURN jsonb_build_object(
    'success', true,
    'target_id', p_target_id,
    'source_id', p_source_id,
    'transferred', jsonb_build_object(
      'orders', v_orders_moved,
      'transactions', v_transactions_moved,
      'points', v_points_moved,
      'stamp_cards', v_cards_moved,
      'identities', v_identities_moved,
      'invites', v_invites_moved
    ),
    'merged_balance', v_source.loyalty_balance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Merge failed: ' || SQLERRM);
END;
$$;
