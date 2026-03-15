-- RPC: cancel_online_order (v2)
-- Bifurcated cancellation flow:
--   - status='waiting' → instant cancel (no notification needed)
--   - status='cooking'/'ready' → cancellation REQUEST (cashier must review)
-- Auth: Required. Owner check via customer_identities.
-- Returns: { success: boolean, cancelled?: boolean, requested?: boolean, error?: string }

CREATE OR REPLACE FUNCTION public.cancel_online_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
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
  SELECT id, status, customer_id, cancellation_requested_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.customer_id != v_customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to cancel this order');
  END IF;

  -- Already has pending cancellation request
  IF v_order.cancellation_requested_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancellation already requested');
  END IF;

  -- CASE 1: Instant cancel for 'waiting' orders
  IF v_order.status = 'waiting' THEN
    UPDATE orders
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_order_id;

    UPDATE order_items
    SET status = 'cancelled',
        cancelled_at = now()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object('success', true, 'cancelled', true);
  END IF;

  -- CASE 2: Cancellation request for 'cooking'/'ready' orders
  IF v_order.status IN ('cooking', 'ready') THEN
    UPDATE orders
    SET cancellation_requested_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'requested', true);
  END IF;

  -- CASE 3: Cannot cancel in other statuses
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Cannot cancel order with status: ' || v_order.status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_online_order(uuid, text) TO authenticated;
