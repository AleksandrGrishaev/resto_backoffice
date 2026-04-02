-- Migration: 225_staff_cancel_order_structured_reason
-- Description: Update staff_cancel_order RPC to accept structured reason + notes
-- Date: 2026-03-16

-- CONTEXT: Order cancellation previously used free-text reason only.
-- Now we pass structured CancellationReason enum value as p_reason
-- and optional p_notes for additional details.
-- orders.cancellation_reason stores the enum value (e.g. 'customer_refused')
-- order_items.cancellation_notes stores COALESCE(p_notes, p_reason) for display

CREATE OR REPLACE FUNCTION public.staff_cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Staff cancelled',
  p_notes TEXT DEFAULT NULL
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

  -- 4. Cancel order (cancellation_reason stores structured enum value)
  UPDATE orders SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancellation_resolved_at = now(),
    cancellation_resolved_by = auth.uid(),
    updated_at = now()
  WHERE id = p_order_id;

  -- 5. Cancel all non-cancelled items
  -- cancellation_reason = 'staff_cancelled' (item-level reason)
  -- cancellation_notes = COALESCE(p_notes, p_reason) for display
  UPDATE order_items SET
    status = 'cancelled',
    cancellation_reason = 'staff_cancelled',
    cancellation_notes = COALESCE(p_notes, p_reason),
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
