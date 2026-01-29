-- RPC Function: complete_receipt_full
-- Purpose: Atomic receipt completion in single transaction
-- Performance: Replaces 45-60+ sequential API calls with 1 RPC call (20s → 1-2s)
-- Created: 2026-01-02
-- Updated: 2026-01-27 (Migration 098 - fix JSON key names)

-- PARAMETERS:
-- p_receipt_id: Receipt ID to complete
-- p_order_id: Related purchase order ID
-- p_delivery_date: Actual delivery timestamp
-- p_warehouse_id: Target warehouse
-- p_supplier_id: Supplier counteragent ID
-- p_supplier_name: Supplier name for payment record
-- p_total_amount: Total receipt amount
-- p_received_items: JSONB array of received items with structure:
--   [{ itemId, itemName, receivedQuantity, actualPrice, packageId, packageSize }]

-- RETURNS:
-- JSONB: { success: boolean, convertedBatches, reconciledBatches, operationId,
--          originalAmount, actualDeliveredAmount, error?, code? }

CREATE OR REPLACE FUNCTION complete_receipt_full(
  p_receipt_id TEXT,
  p_order_id TEXT,
  p_delivery_date TIMESTAMPTZ,
  p_warehouse_id TEXT,
  p_supplier_id TEXT,
  p_supplier_name TEXT,
  p_total_amount NUMERIC,
  p_received_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_converted INT := 0;
  v_reconciled INT := 0;
  v_operation_id TEXT;
  v_order_number TEXT;
  v_receipt_number TEXT;
  v_item JSONB;
  v_items_array JSONB := '[]'::JSONB;
  v_original_total NUMERIC;
  v_actual_delivered NUMERIC := 0;
  v_item_price NUMERIC;
BEGIN
  -- Get order/receipt numbers for references
  SELECT order_number, COALESCE(original_total_amount, total_amount)
  INTO v_order_number, v_original_total
  FROM supplierstore_orders WHERE id = p_order_id;

  SELECT receipt_number INTO v_receipt_number FROM supplierstore_receipts WHERE id = p_receipt_id;

  -- Validate required data exists
  IF v_order_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found', 'code', 'ORDER_NOT_FOUND');
  END IF;
  IF v_receipt_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receipt not found', 'code', 'RECEIPT_NOT_FOUND');
  END IF;

  -- 1. CONVERT TRANSIT BATCHES TO ACTIVE
  UPDATE storage_batches
  SET status = 'active',
      is_active = true,
      actual_delivery_date = p_delivery_date,
      receipt_date = p_delivery_date,
      updated_at = NOW()
  WHERE purchase_order_id = p_order_id AND status = 'in_transit';
  GET DIAGNOSTICS v_converted = ROW_COUNT;

  -- 2. UPDATE BATCH QUANTITIES/PRICES AND CALCULATE ACTUAL DELIVERED AMOUNT
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP
    -- Get price with proper fallback chain
    -- Client sends: actualPrice (which is actualBaseCost || orderedBaseCost from client side)
    -- Also support actualBaseCost for backwards compatibility
    v_item_price := COALESCE(
      (v_item->>'actualPrice')::NUMERIC,      -- Primary: Client sends this
      (v_item->>'actualBaseCost')::NUMERIC,   -- Fallback: For compatibility
      0
    );

    UPDATE storage_batches
    SET current_quantity = (v_item->>'receivedQuantity')::NUMERIC,
        initial_quantity = (v_item->>'receivedQuantity')::NUMERIC,
        cost_per_unit = COALESCE(v_item_price, cost_per_unit),
        total_value = (v_item->>'receivedQuantity')::NUMERIC * COALESCE(v_item_price, cost_per_unit),
        updated_at = NOW()
    WHERE purchase_order_id = p_order_id
      AND item_id = v_item->>'itemId'
      AND status = 'active';

    -- Calculate actual delivered amount
    v_actual_delivered := v_actual_delivered +
      (v_item->>'receivedQuantity')::NUMERIC * v_item_price;

    -- Build items array for storage_operation
    v_items_array := v_items_array || jsonb_build_object(
      'itemId', v_item->>'itemId',
      'itemName', v_item->>'itemName',
      'quantity', (v_item->>'receivedQuantity')::NUMERIC,
      'pricePerUnit', v_item_price
    );
  END LOOP;

  -- 3. NEGATIVE BATCHES NO LONGER AUTO-RECONCILED (Migration 111)
  -- Negative batches now remain active (is_active=true) to allow proper
  -- balance calculation via SUM(current_quantity). They will be closed
  -- during inventory reconciliation instead of receipt completion.
  -- Return 0 for reconciledBatches count (no longer reconciling)
  v_reconciled := 0;

  -- 4. CREATE STORAGE OPERATION (audit trail)
  v_operation_id := 'op_' || gen_random_uuid();
  INSERT INTO storage_operations (
    id, operation_type, document_number, operation_date, department,
    responsible_person, items, total_value, status, warehouse_id, created_at, updated_at
  ) VALUES (
    v_operation_id, 'receipt', 'RCV-' || v_receipt_number, p_delivery_date, 'kitchen',
    'System', v_items_array, v_actual_delivered, 'confirmed', p_warehouse_id, NOW(), NOW()
  );

  -- 5. UPDATE RECEIPT STATUS
  UPDATE supplierstore_receipts
  SET status = 'completed',
      storage_operation_id = v_operation_id,
      updated_at = NOW()
  WHERE id = p_receipt_id;

  -- 6. UPDATE ORDER STATUS WITH AMOUNT FIELDS
  UPDATE supplierstore_orders
  SET status = 'delivered',
      receipt_completed_at = NOW(),
      original_total_amount = v_original_total,
      actual_delivered_amount = v_actual_delivered,
      total_amount = v_actual_delivered,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Return success with counts
  RETURN jsonb_build_object(
    'success', true,
    'convertedBatches', v_converted,
    'reconciledBatches', v_reconciled,
    'operationId', v_operation_id,
    'originalAmount', v_original_total,
    'actualDeliveredAmount', v_actual_delivered
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;
