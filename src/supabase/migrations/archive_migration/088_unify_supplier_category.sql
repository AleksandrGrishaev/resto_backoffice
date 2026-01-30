-- Migration: 088_unify_supplier_category
-- Description: Unify 'supplier_debt' category to 'supplier' for consistency
-- Date: 2026-01-03
-- Issue: Two categories existed for the same purpose:
--   - 'supplier' (used everywhere in app, manual payments, POS)
--   - 'supplier_debt' (accidentally introduced in RPC complete_receipt_full)

-- 1. MIGRATE EXISTING DATA: Change 'supplier_debt' to 'supplier'
UPDATE pending_payments
SET category = 'supplier',
    updated_at = NOW()
WHERE category = 'supplier_debt';

-- 2. UPDATE RPC FUNCTION to use 'supplier' category
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
  v_payment_id TEXT;
  v_order_number TEXT;
  v_receipt_number TEXT;
  v_item JSONB;
  v_items_array JSONB := '[]'::JSONB;
BEGIN
  -- Get order/receipt numbers for references
  SELECT order_number INTO v_order_number FROM supplierstore_orders WHERE id = p_order_id;
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

  -- 2. UPDATE BATCH QUANTITIES/PRICES
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP
    UPDATE storage_batches
    SET current_quantity = (v_item->>'receivedQuantity')::NUMERIC,
        initial_quantity = (v_item->>'receivedQuantity')::NUMERIC,
        cost_per_unit = COALESCE((v_item->>'actualPrice')::NUMERIC, cost_per_unit),
        total_value = (v_item->>'receivedQuantity')::NUMERIC *
                      COALESCE((v_item->>'actualPrice')::NUMERIC, cost_per_unit),
        updated_at = NOW()
    WHERE purchase_order_id = p_order_id
      AND item_id = v_item->>'itemId'
      AND status = 'active';

    v_items_array := v_items_array || jsonb_build_object(
      'itemId', v_item->>'itemId',
      'itemName', v_item->>'itemName',
      'quantity', (v_item->>'receivedQuantity')::NUMERIC,
      'pricePerUnit', COALESCE((v_item->>'actualPrice')::NUMERIC, 0)
    );
  END LOOP;

  -- 3. RECONCILE NEGATIVE BATCHES
  UPDATE storage_batches
  SET reconciled_at = NOW(),
      is_active = false,
      updated_at = NOW()
  WHERE item_id IN (SELECT elem->>'itemId' FROM jsonb_array_elements(p_received_items) elem)
    AND is_negative = true
    AND reconciled_at IS NULL
    AND warehouse_id = p_warehouse_id;
  GET DIAGNOSTICS v_reconciled = ROW_COUNT;

  -- 4. CREATE STORAGE OPERATION (audit trail)
  v_operation_id := 'op_' || gen_random_uuid();
  INSERT INTO storage_operations (
    id, operation_type, document_number, operation_date, department,
    responsible_person, items, total_value, status, warehouse_id, created_at, updated_at
  ) VALUES (
    v_operation_id, 'receipt', 'RCV-' || v_receipt_number, p_delivery_date, 'kitchen',
    'System', v_items_array, p_total_amount, 'confirmed', p_warehouse_id, NOW(), NOW()
  );

  -- 5. CREATE PENDING PAYMENT (debt to supplier)
  -- IMPORTANT: Use 'supplier' category (unified with rest of app)
  -- IMPORTANT: linked_orders is required for bill_status calculation
  v_payment_id := 'pp_' || gen_random_uuid();
  INSERT INTO pending_payments (
    id, counteragent_id, counteragent_name, amount, description,
    category, status, source_order_id, linked_orders, created_by, created_at, updated_at
  ) VALUES (
    v_payment_id, p_supplier_id, p_supplier_name, p_total_amount,
    'Order ' || v_order_number || ' delivered', 'supplier', 'pending',
    p_order_id,
    jsonb_build_array(jsonb_build_object(
      'orderId', p_order_id,
      'orderNumber', v_order_number,
      'linkedAmount', p_total_amount,
      'linkedAt', NOW()::TEXT,
      'isActive', true
    )),
    '{"name": "System", "role": "system"}'::JSONB, NOW(), NOW()
  );

  -- 6. UPDATE RECEIPT STATUS
  UPDATE supplierstore_receipts
  SET status = 'completed',
      storage_operation_id = v_operation_id,
      updated_at = NOW()
  WHERE id = p_receipt_id;

  -- 7. UPDATE ORDER STATUS
  UPDATE supplierstore_orders
  SET status = 'delivered',
      receipt_completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'convertedBatches', v_converted,
    'reconciledBatches', v_reconciled,
    'operationId', v_operation_id,
    'paymentId', v_payment_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;
