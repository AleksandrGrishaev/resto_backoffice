-- RPC: staff_cancel_order
-- Cancels an entire order from POS (staff action)
-- Auth: is_staff() check
-- Returns: { success, orderId }
--
-- Logic:
-- 1. Validates order exists and is not already in a final status
-- 2. Sets order status = 'cancelled'
-- 3. Records cancellation metadata (reason, resolved_at, resolved_by)
-- 4. Cancels all non-cancelled order_items
-- 5. If order has a table_id — frees the table (status='free')

CREATE OR REPLACE FUNCTION public.staff_cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Staff cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_table_id UUID;
  v_cancelled_items INT;
BEGIN
  -- 1. Auth check
  IF NOT is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: staff only');
  END IF;

  -- 2. Find order
  SELECT id, status, table_id
  INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- 3. Check not already in final status
  IF v_order.status IN ('cancelled', 'served', 'collected', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order is already in final status: ' || v_order.status
    );
  END IF;

  v_table_id := v_order.table_id;

  -- 4. Cancel order
  UPDATE orders SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancellation_resolved_at = now(),
    cancellation_resolved_by = auth.uid(),
    updated_at = now()
  WHERE id = p_order_id;

  -- 5. Cancel all non-cancelled items
  UPDATE order_items SET
    status = 'cancelled',
    cancellation_reason = 'staff_cancelled',
    cancellation_notes = p_reason,
    cancelled_at = now(),
    cancelled_by = auth.uid()::text,
    updated_at = now()
  WHERE order_id = p_order_id
    AND status != 'cancelled';

  GET DIAGNOSTICS v_cancelled_items = ROW_COUNT;

  -- 6. Free table if assigned
  IF v_table_id IS NOT NULL THEN
    UPDATE tables SET
      status = 'available',
      current_order_id = NULL,
      updated_at = now()
    WHERE id = v_table_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'cancelledItems', v_cancelled_items,
    'tableFreed', v_table_id IS NOT NULL
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
