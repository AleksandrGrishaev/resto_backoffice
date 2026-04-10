-- Migration: 289_orders_bill_level_customer_lookup
-- Description: RPCs now find orders by bill-level customerId (not just order-level)
-- Date: 2026-04-09
--
-- CONTEXT: One order can have multiple customers (one per bill). The order-level
-- customer_id may not match the bill-level customerId after merge. RPCs now check
-- both levels so customers don't lose access to their orders in the web cabinet.

-- 1. get_my_orders — search by order.customer_id OR bills[].customerId
CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_result JSON;
BEGIN
  SELECT ci.customer_id INTO v_customer_id
  FROM public.customer_identities ci
  WHERE ci.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      o.id, o.order_number, o.status, o.type, o.source, o.fulfillment_method,
      o.final_amount, o.payment_status, o.customer_name, o.customer_phone,
      o.table_number, o.pickup_time, o.comment, o.estimated_ready_time,
      o.cancellation_requested_at, o.cancellation_reason, o.cancellation_resolved_at,
      o.created_at, o.updated_at,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', oi.id, 'menu_item_id', oi.menu_item_id, 'menu_item_name', oi.menu_item_name,
          'variant_id', oi.variant_id, 'variant_name', oi.variant_name,
          'quantity', oi.quantity, 'unit_price', oi.unit_price,
          'modifiers_total', oi.modifiers_total, 'total_price', oi.total_price,
          'selected_modifiers', oi.selected_modifiers, 'kitchen_notes', oi.kitchen_notes,
          'status', oi.status, 'image_url', mi.image_url
        )), '[]'::json)
        FROM public.order_items oi
        LEFT JOIN public.menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = o.id AND oi.status != 'cancelled'
      ) AS items
    FROM public.orders o
    WHERE (
      o.customer_id = v_customer_id
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(o.bills) AS b
        WHERE (b->>'customerId')::uuid = v_customer_id
      )
    )
      AND o.status != 'draft'
    ORDER BY o.created_at DESC
    LIMIT 50
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;

-- 2. get_customer_cabinet — recent_orders also check bill-level customerId
CREATE OR REPLACE FUNCTION get_customer_cabinet(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer RECORD;
  v_settings RECORD;
  v_tier_config JSONB;
  v_cashback_pct NUMERIC;
  v_next_tier JSONB;
  v_expiring_soon JSONB;
  v_recent_orders JSONB;
  v_transactions JSONB;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE token = p_token AND status = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Customer not found'); END IF;

  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  SELECT t INTO v_tier_config FROM jsonb_array_elements(v_settings.tiers) t WHERE t->>'name' = v_customer.tier;
  v_cashback_pct := COALESCE((v_tier_config->>'cashback_pct')::numeric, 5);

  SELECT t INTO v_next_tier FROM jsonb_array_elements(v_settings.tiers) WITH ORDINALITY AS x(t, idx)
  WHERE idx > (SELECT idx FROM jsonb_array_elements(v_settings.tiers) WITH ORDINALITY AS y(t2, idx) WHERE t2->>'name' = v_customer.tier)
  ORDER BY idx LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('amount', remaining, 'expires_at', expires_at)), '[]'::jsonb) INTO v_expiring_soon
  FROM loyalty_points WHERE customer_id = v_customer.id AND remaining > 0 AND expires_at > now() AND expires_at <= now() + interval '7 days';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id, 'created_at', o.created_at, 'final_amount', o.final_amount, 'type', o.type
  ) ORDER BY o.created_at DESC), '[]'::jsonb) INTO v_recent_orders
  FROM (
    SELECT id, created_at, final_amount, type FROM orders
    WHERE (
      customer_id = v_customer.id
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(bills) AS b
        WHERE (b->>'customerId')::uuid = v_customer.id
      )
    ) AND status IN ('completed', 'collected')
    ORDER BY created_at DESC LIMIT 20
  ) o;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', lt.id, 'type', lt.type, 'amount', lt.amount, 'balance_after', lt.balance_after,
    'description', lt.description, 'created_at', lt.created_at
  ) ORDER BY lt.created_at DESC), '[]'::jsonb) INTO v_transactions
  FROM (
    SELECT id, type, amount, balance_after, description, created_at
    FROM loyalty_transactions WHERE customer_id = v_customer.id
    ORDER BY created_at DESC LIMIT 50
  ) lt;

  RETURN jsonb_build_object(
    'success', true,
    'customer', jsonb_build_object(
      'name', v_customer.name, 'tier', v_customer.tier,
      'cashback_pct', v_cashback_pct, 'loyalty_balance', v_customer.loyalty_balance,
      'total_spent', v_customer.total_spent, 'spent_90d', v_customer.spent_90d,
      'total_visits', v_customer.total_visits, 'average_check', v_customer.average_check,
      'first_visit_at', v_customer.first_visit_at, 'last_visit_at', v_customer.last_visit_at
    ),
    'next_tier', v_next_tier,
    'expiring_soon', v_expiring_soon,
    'recent_orders', v_recent_orders,
    'transactions', v_transactions
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
