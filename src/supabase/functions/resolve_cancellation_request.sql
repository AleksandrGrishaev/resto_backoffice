-- RPC: resolve_cancellation_request
-- Called by POS cashier to accept or dismiss a cancellation request.
--   - action='accept' → cancel the order and all items
--   - action='dismiss' → clear the request, order continues
-- Auth: Required (cashier/admin).
-- Returns: { success: boolean, error?: string }

CREATE OR REPLACE FUNCTION public.resolve_cancellation_request(
  p_order_id UUID,
  p_action TEXT  -- 'accept' or 'dismiss'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Staff-only check (cashier/admin)
  IF NOT is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only staff can resolve cancellation requests');
  END IF;

  IF p_action NOT IN ('accept', 'dismiss') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Use accept or dismiss');
  END IF;

  -- Get order
  SELECT id, status, cancellation_requested_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.cancellation_requested_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending cancellation request');
  END IF;

  IF p_action = 'accept' THEN
    -- Cancel the order
    UPDATE orders
    SET status = 'cancelled',
        cancellation_resolved_at = now(),
        cancellation_resolved_by = auth.uid(),
        updated_at = now()
    WHERE id = p_order_id;

    -- Cancel all non-cancelled items
    UPDATE order_items
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'customer_refused',
        cancellation_notes = 'Accepted cancellation request from website'
    WHERE order_id = p_order_id
      AND status != 'cancelled';

    RETURN jsonb_build_object('success', true, 'action', 'accepted');
  ELSE
    -- Dismiss: clear the request, order continues
    UPDATE orders
    SET cancellation_resolved_at = now(),
        cancellation_resolved_by = auth.uid(),
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'action', 'dismissed');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_cancellation_request(uuid, text) TO authenticated;
