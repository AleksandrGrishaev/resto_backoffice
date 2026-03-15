-- RPC: cancel_online_order
-- Cancels an online order if status = 'waiting'
-- Auth: Required. Owner check via customer_identities.
-- Returns: { success: boolean, error?: string }

CREATE OR REPLACE FUNCTION public.cancel_online_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_order RECORD;
BEGIN
  -- Resolve customer from auth
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT ci.customer_id INTO v_customer_id
  FROM customer_identities ci
  WHERE ci.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Get order and verify ownership
  SELECT id, status, customer_id INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.customer_id != v_customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to cancel this order');
  END IF;

  IF v_order.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only cancel orders with status waiting. Current: ' || v_order.status);
  END IF;

  -- Cancel order and all items
  UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;
  UPDATE order_items SET status = 'cancelled', cancelled_at = now() WHERE order_id = p_order_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_online_order(uuid) TO authenticated;
