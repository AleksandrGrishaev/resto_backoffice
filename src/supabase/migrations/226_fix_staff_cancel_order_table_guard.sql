-- Migration: 226_fix_staff_cancel_order_table_guard
-- Description: Fix staff_cancel_order RPC — conditional table free + accurate tableFreed response
-- Date: 2026-03-17
--
-- CONTEXT: Two bugs fixed:
-- 1. When cancelling old/stale orders, the RPC was unconditionally freeing the table,
--    even if the table was already occupied by a newer order.
-- 2. tableFreed returned true whenever table_id was set, even if the conditional UPDATE
--    matched zero rows. Now uses GET DIAGNOSTICS to report accurately.

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
  v_table_rows_affected INT;
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

  -- 6. Free table if assigned (conditional: only if table still belongs to this order)
  v_table_rows_affected := 0;
  IF v_table_id IS NOT NULL THEN
    UPDATE tables SET
      status = 'available',
      current_order_id = NULL,
      updated_at = now()
    WHERE id = v_table_id
      AND (current_order_id = p_order_id OR current_order_id IS NULL);

    GET DIAGNOSTICS v_table_rows_affected = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'cancelledItems', v_cancelled_items,
    'tableFreed', v_table_rows_affected > 0
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
