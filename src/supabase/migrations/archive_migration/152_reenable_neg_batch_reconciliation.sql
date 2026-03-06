-- Migration: 152_reenable_neg_batch_reconciliation
-- Description: Re-enable auto-reconciliation of negative batches for raw products
--   with proper deficit deduction from positive batches
-- Date: 2026-02-17
-- Context: Migration 111 disabled NEG batch reconciliation during receipt.
--   NEG batches remained is_active=true forever. This re-enables reconciliation
--   but now correctly deducts deficit from positive batches before marking NEGs.
--   Example: NEG -950g + new batch 1000g → new batch becomes 50g, NEG reconciled.

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
  v_neg RECORD;
  v_pos RECORD;
  v_deficit NUMERIC;
  v_to_deduct NUMERIC;
  v_new_qty NUMERIC;
BEGIN
  SELECT order_number, COALESCE(original_total_amount, total_amount)
  INTO v_order_number, v_original_total
  FROM supplierstore_orders WHERE id = p_order_id;

  SELECT receipt_number INTO v_receipt_number FROM supplierstore_receipts WHERE id = p_receipt_id;

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

  -- 2. UPDATE BATCH QUANTITIES/PRICES
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP
    v_item_price := COALESCE(
      (v_item->>'actualPrice')::NUMERIC,
      (v_item->>'actualBaseCost')::NUMERIC,
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

    v_actual_delivered := v_actual_delivered +
      (v_item->>'receivedQuantity')::NUMERIC * v_item_price;

    v_items_array := v_items_array || jsonb_build_object(
      'itemId', v_item->>'itemId',
      'itemName', v_item->>'itemName',
      'quantity', (v_item->>'receivedQuantity')::NUMERIC,
      'pricePerUnit', v_item_price
    );
  END LOOP;

  -- 3. AUTO-RECONCILE NEGATIVE BATCHES
  -- Deduct NEG deficit from newest positive batches, then mark NEGs reconciled
  v_reconciled := 0;

  FOR v_neg IN
    SELECT id, item_id, current_quantity
    FROM storage_batches
    WHERE item_type = 'product'
      AND is_negative = true
      AND reconciled_at IS NULL
      AND item_id IN (
        SELECT DISTINCT v_item->>'itemId'
        FROM jsonb_array_elements(p_received_items) AS v_item
      )
    ORDER BY created_at ASC
  LOOP
    v_deficit := ABS(v_neg.current_quantity);

    -- Deduct deficit from newest positive batches (LIFO)
    FOR v_pos IN
      SELECT id, current_quantity, cost_per_unit
      FROM storage_batches
      WHERE item_id = v_neg.item_id
        AND item_type = 'product'
        AND is_active = true
        AND (is_negative = false OR is_negative IS NULL)
        AND current_quantity > 0
      ORDER BY created_at DESC
    LOOP
      EXIT WHEN v_deficit <= 0;

      v_to_deduct := LEAST(v_deficit, v_pos.current_quantity);
      v_new_qty := v_pos.current_quantity - v_to_deduct;

      UPDATE storage_batches
      SET current_quantity = v_new_qty,
          total_value = v_new_qty * COALESCE(cost_per_unit, 0),
          status = CASE WHEN v_new_qty <= 0 THEN 'consumed' ELSE 'active' END,
          is_active = (v_new_qty > 0),
          updated_at = NOW()
      WHERE id = v_pos.id;

      v_deficit := v_deficit - v_to_deduct;
    END LOOP;

    IF v_deficit <= 0 THEN
      UPDATE storage_batches
      SET reconciled_at = NOW(), status = 'consumed', is_active = false, updated_at = NOW()
      WHERE id = v_neg.id;
      v_reconciled := v_reconciled + 1;
    ELSE
      UPDATE storage_batches
      SET current_quantity = -v_deficit, updated_at = NOW()
      WHERE id = v_neg.id;
    END IF;
  END LOOP;

  -- 4. CREATE STORAGE OPERATION
  v_operation_id := 'op_' || gen_random_uuid();
  INSERT INTO storage_operations (
    id, operation_type, document_number, operation_date, department,
    responsible_person, items, total_value, status, warehouse_id, created_at, updated_at
  ) VALUES (
    v_operation_id, 'receipt', 'RCV-' || v_receipt_number, p_delivery_date, 'kitchen',
    'System', v_items_array, ROUND(v_actual_delivered), 'confirmed', p_warehouse_id, NOW(), NOW()
  );

  -- 5. UPDATE RECEIPT STATUS
  UPDATE supplierstore_receipts
  SET status = 'completed',
      storage_operation_id = v_operation_id,
      updated_at = NOW()
  WHERE id = p_receipt_id;

  v_actual_delivered := ROUND(v_actual_delivered);

  -- 6. UPDATE ORDER STATUS
  UPDATE supplierstore_orders
  SET status = 'delivered',
      receipt_completed_at = NOW(),
      original_total_amount = ROUND(v_original_total),
      actual_delivered_amount = v_actual_delivered,
      total_amount = v_actual_delivered,
      updated_at = NOW()
  WHERE id = p_order_id;

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
