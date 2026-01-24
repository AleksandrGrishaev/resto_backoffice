-- Migration: 091_remove_duplicate_payment_creation_in_receipt
-- Description: Fix duplicate pending payment creation during receipt completion
-- Date: 2026-01-24
-- Author: Claude Code

-- CONTEXT:
-- Previously, complete_receipt_full RPC was creating a new pending_payment on every receipt completion.
-- However, pending_payment is already created when PO is created (with autoSyncEnabled: true).
-- This caused duplicate payments for the same order.
--
-- FIX: Remove pending_payment creation from RPC function.
-- The existing payment is auto-synced by useOrderPayments.syncOrderPaymentsAfterReceipt()
-- which updates the amount based on actual delivered amount.

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
  -- Changes status of all batches from 'in_transit' to 'active'
  UPDATE storage_batches
  SET status = 'active',
      is_active = true,
      actual_delivery_date = p_delivery_date,
      receipt_date = p_delivery_date,
      updated_at = NOW()
  WHERE purchase_order_id = p_order_id AND status = 'in_transit';
  GET DIAGNOSTICS v_converted = ROW_COUNT;

  -- 2. UPDATE BATCH QUANTITIES/PRICES
  -- Updates each batch with actual received quantities and prices
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

    -- Build items array for storage_operation audit record
    v_items_array := v_items_array || jsonb_build_object(
      'itemId', v_item->>'itemId',
      'itemName', v_item->>'itemName',
      'quantity', (v_item->>'receivedQuantity')::NUMERIC,
      'pricePerUnit', COALESCE((v_item->>'actualPrice')::NUMERIC, 0)
    );
  END LOOP;

  -- 3. RECONCILE NEGATIVE BATCHES
  -- Marks negative batches as reconciled (they were created from shortages)
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
  -- Records the receipt operation for audit/accounting purposes
  v_operation_id := 'op_' || gen_random_uuid();
  INSERT INTO storage_operations (
    id, operation_type, document_number, operation_date, department,
    responsible_person, items, total_value, status, warehouse_id, created_at, updated_at
  ) VALUES (
    v_operation_id, 'receipt', 'RCV-' || v_receipt_number, p_delivery_date, 'kitchen',
    'System', v_items_array, p_total_amount, 'confirmed', p_warehouse_id, NOW(), NOW()
  );

  -- 5. ❌ REMOVED: CREATE PENDING PAYMENT
  -- REASON: Pending payment is already created when PO is created (with autoSyncEnabled: true)
  -- Creating another payment here causes duplicates
  -- The existing payment is automatically synced by useOrderPayments.syncOrderPaymentsAfterReceipt()
  -- which updates the payment amount based on actual delivered amount
  v_payment_id := NULL; -- No payment created here

  -- 6. UPDATE RECEIPT STATUS
  -- Marks receipt as completed and links to storage operation
  UPDATE supplierstore_receipts
  SET status = 'completed',
      storage_operation_id = v_operation_id,
      updated_at = NOW()
  WHERE id = p_receipt_id;

  -- 7. UPDATE ORDER STATUS
  -- Marks order as delivered
  UPDATE supplierstore_orders
  SET status = 'delivered',
      receipt_completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Return success with operation counts
  RETURN jsonb_build_object(
    'success', true,
    'convertedBatches', v_converted,
    'reconciledBatches', v_reconciled,
    'operationId', v_operation_id,
    'paymentId', v_payment_id
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
