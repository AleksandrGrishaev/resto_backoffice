-- RPC Function: send_purchase_order_to_supplier
-- Purpose: Atomic purchase order sending in single transaction
-- Performance: Replaces N+1 sequential operations with 1 RPC call
-- Created: 2026-01-02
-- Migration: 026_send_purchase_order_rpc.sql

-- PARAMETERS:
-- p_order_id: Purchase order ID to send
-- p_sent_date: Timestamp when order is sent (for audit trail)
-- p_warehouse_id: Target warehouse for transit batches (default: 'wh_1')

-- RETURNS:
-- JSONB: { success: boolean, orderNumber, status, batchesCreated, batchIds, totalAmount, error?, code? }

CREATE OR REPLACE FUNCTION send_purchase_order_to_supplier(
  p_order_id TEXT,
  p_sent_date TIMESTAMPTZ,
  p_warehouse_id TEXT DEFAULT 'wh_1'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_batch_count INT := 0;
  v_batch_id TEXT;
  v_batch_number TEXT;
  v_batch_ids JSONB := '[]'::JSONB;
  v_base_batch_number TEXT;
BEGIN
  -- 1. VALIDATE ORDER EXISTS
  -- Fetch order details and validate existence
  SELECT id, order_number, supplier_id, supplier_name,
         status, expected_delivery_date, total_amount
  INTO v_order
  FROM supplierstore_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found',
      'code', 'ORDER_NOT_FOUND'
    );
  END IF;

  -- 2. VALIDATE ORDER STATUS
  -- Only draft orders can be sent
  IF v_order.status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order already sent or invalid status: ' || v_order.status,
      'code', 'INVALID_STATUS',
      'currentStatus', v_order.status
    );
  END IF;

  -- 3. UPDATE ORDER STATUS TO 'SENT'
  -- Mark order as sent with timestamp
  UPDATE supplierstore_orders
  SET status = 'sent',
      sent_date = p_sent_date,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. CREATE TRANSIT BATCHES FOR ALL ORDER ITEMS
  -- Generate base batch number prefix with microseconds for uniqueness (BTR-YYMMDD-HHMMSSmmm-)
  v_base_batch_number := 'BTR-' || TO_CHAR(p_sent_date, 'YYMMDD-HH24MISS') || '-';

  -- Loop through all order items and create transit batches
  FOR v_item IN
    SELECT item_id, item_name, ordered_quantity, unit,
           package_id, package_name, package_quantity, package_unit,
           package_price, price_per_unit
    FROM supplierstore_order_items
    WHERE order_id = p_order_id
    ORDER BY item_name
  LOOP
    -- Generate unique batch ID and number (with item counter for uniqueness within order)
    v_batch_id := 'batch_' || gen_random_uuid();
    v_batch_number := v_base_batch_number || LPAD((v_batch_count + 1)::TEXT, 2, '0');

    -- Insert transit batch
    INSERT INTO storage_batches (
      id, batch_number, item_id, item_type, warehouse_id,
      initial_quantity, current_quantity, unit,
      cost_per_unit, total_value,
      receipt_date, source_type, status, is_active,
      purchase_order_id, supplier_id, supplier_name,
      planned_delivery_date,
      created_at, updated_at
    ) VALUES (
      v_batch_id,
      v_batch_number,
      v_item.item_id,
      'product',
      p_warehouse_id,
      v_item.ordered_quantity,
      v_item.ordered_quantity,
      v_item.unit,
      v_item.price_per_unit,
      v_item.ordered_quantity * v_item.price_per_unit,
      p_sent_date,
      'purchase',
      'in_transit',
      TRUE,
      p_order_id,
      v_order.supplier_id,
      v_order.supplier_name,
      v_order.expected_delivery_date,
      NOW(),
      NOW()
    );

    -- Track created batch
    v_batch_ids := v_batch_ids || jsonb_build_object(
      'batchId', v_batch_id,
      'batchNumber', v_batch_number,
      'itemId', v_item.item_id,
      'itemName', v_item.item_name,
      'quantity', v_item.ordered_quantity
    );

    v_batch_count := v_batch_count + 1;
  END LOOP;

  -- 5. RETURN SUCCESS WITH DETAILS
  RETURN jsonb_build_object(
    'success', true,
    'orderNumber', v_order.order_number,
    'status', 'sent',
    'batchesCreated', v_batch_count,
    'batchIds', v_batch_ids,
    'totalAmount', v_order.total_amount,
    'supplierId', v_order.supplier_id,
    'supplierName', v_order.supplier_name
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic transaction rollback on any error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;
