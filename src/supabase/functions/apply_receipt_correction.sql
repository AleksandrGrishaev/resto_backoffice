-- Migration: 164_receipt_corrections (updated: 199_add_item_package_correction_type)
-- Description: Receipt correction system - table + RPC function + package corrections
-- Date: 2026-03-06, updated 2026-03-10

-- =============================================
-- TABLE: supplierstore_receipt_corrections
-- =============================================

CREATE TABLE IF NOT EXISTS supplierstore_receipt_corrections (
  id TEXT PRIMARY KEY,
  correction_number TEXT UNIQUE NOT NULL,
  receipt_id TEXT NOT NULL REFERENCES supplierstore_receipts(id),
  order_id TEXT NOT NULL REFERENCES supplierstore_orders(id),

  correction_type TEXT NOT NULL CHECK (correction_type IN ('item_quantity', 'item_price', 'item_package', 'supplier_change', 'full_reversal')),
  reason TEXT NOT NULL,
  corrected_by TEXT,

  -- Supplier change fields
  old_supplier_id TEXT,
  old_supplier_name TEXT,
  new_supplier_id TEXT,
  new_supplier_name TEXT,

  -- Item corrections detail
  item_corrections JSONB DEFAULT '[]'::jsonb,

  -- Financial summary
  old_total_amount NUMERIC(15,2),
  new_total_amount NUMERIC(15,2),
  financial_impact NUMERIC(15,2),

  -- Batch adjustments made
  batch_adjustments JSONB DEFAULT '[]'::jsonb,

  -- Audit
  storage_operation_id TEXT,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'failed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_receipt_corrections_receipt_id ON supplierstore_receipt_corrections(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_corrections_order_id ON supplierstore_receipt_corrections(order_id);

-- Grant access
GRANT ALL ON supplierstore_receipt_corrections TO service_role;
GRANT SELECT, INSERT ON supplierstore_receipt_corrections TO authenticated;

-- =============================================
-- RPC: apply_receipt_correction
-- =============================================

CREATE OR REPLACE FUNCTION apply_receipt_correction(
  p_receipt_id TEXT,
  p_order_id TEXT,
  p_correction_type TEXT,
  p_reason TEXT,
  p_corrected_by TEXT DEFAULT NULL,
  p_item_corrections JSONB DEFAULT '[]'::jsonb,
  p_new_supplier_id TEXT DEFAULT NULL,
  p_new_supplier_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receipt RECORD;
  v_order RECORD;
  v_correction_id TEXT;
  v_correction_number TEXT;
  v_operation_id TEXT;
  v_old_total NUMERIC(15,2) := 0;
  v_new_total NUMERIC(15,2) := 0;
  v_financial_impact NUMERIC(15,2) := 0;
  v_batch_adjustments JSONB := '[]'::jsonb;
  v_item_details JSONB := '[]'::jsonb;
  v_item JSONB;
  v_batch RECORD;
  v_old_supplier_id TEXT;
  v_old_supplier_name TEXT;
  v_seq_num INT;
  v_today TEXT;
BEGIN
  -- =============================================
  -- STEP 1: Validate receipt exists and is completed
  -- =============================================
  SELECT * INTO v_receipt FROM supplierstore_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receipt not found', 'code', 'RECEIPT_NOT_FOUND');
  END IF;

  IF v_receipt.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receipt must be completed to apply corrections', 'code', 'INVALID_STATUS');
  END IF;

  -- Validate order
  SELECT * INTO v_order FROM supplierstore_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found', 'code', 'ORDER_NOT_FOUND');
  END IF;

  -- =============================================
  -- STEP 2: Generate correction number (COR-YYMMDD-NNN)
  -- =============================================
  v_today := to_char(now(), 'YYMMDD');
  SELECT COALESCE(MAX(
    CAST(RIGHT(correction_number, 3) AS INT)
  ), 0) + 1 INTO v_seq_num
  FROM supplierstore_receipt_corrections
  WHERE correction_number LIKE 'COR-' || v_today || '-%';

  v_correction_number := 'COR-' || v_today || '-' || LPAD(v_seq_num::TEXT, 3, '0');
  v_correction_id := gen_random_uuid()::TEXT;
  v_operation_id := 'op_' || gen_random_uuid()::TEXT;

  -- Calculate old total from receipt items
  SELECT COALESCE(SUM(
    received_quantity * COALESCE(actual_base_cost, ordered_base_cost)
  ), 0) INTO v_old_total
  FROM supplierstore_receipt_items
  WHERE receipt_id = p_receipt_id;

  -- =============================================
  -- STEP 3: Apply correction based on type
  -- =============================================

  IF p_correction_type = 'full_reversal' THEN
    -- Check if any batches have been consumed
    DECLARE
      v_consumed_batch RECORD;
    BEGIN
      FOR v_consumed_batch IN
        SELECT b.id, b.item_id, b.initial_quantity, b.current_quantity,
               (b.initial_quantity - b.current_quantity) as consumed
        FROM storage_batches b
        WHERE b.purchase_order_id = p_order_id
          AND b.current_quantity < b.initial_quantity
      LOOP
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Cannot reverse: batch %s has %s units consumed (item %s)',
            v_consumed_batch.id, v_consumed_batch.consumed, v_consumed_batch.item_id),
          'code', 'BATCH_CONSUMED'
        );
      END LOOP;
    END;

    -- Revert batches to in_transit
    FOR v_batch IN
      SELECT b.id, b.item_id, b.initial_quantity, b.current_quantity, b.cost_per_unit
      FROM storage_batches b
      WHERE b.purchase_order_id = p_order_id AND b.status = 'active'
    LOOP
      UPDATE storage_batches
      SET status = 'in_transit', actual_delivery_date = NULL, updated_at = now()
      WHERE id = v_batch.id;

      v_batch_adjustments := v_batch_adjustments || jsonb_build_object(
        'batchId', v_batch.id,
        'action', 'reverted_to_in_transit',
        'itemId', v_batch.item_id,
        'quantity', v_batch.current_quantity,
        'costPerUnit', v_batch.cost_per_unit
      );
    END LOOP;

    -- Delete receipt items
    DELETE FROM supplierstore_receipt_items WHERE receipt_id = p_receipt_id;

    -- Revert receipt to draft
    UPDATE supplierstore_receipts
    SET status = 'draft', storage_operation_id = NULL, updated_at = now()
    WHERE id = p_receipt_id;

    -- Revert order to sent
    UPDATE supplierstore_orders
    SET status = 'sent',
        receipt_completed_at = NULL,
        actual_delivered_amount = NULL,
        original_total_amount = NULL,
        has_receipt_discrepancies = NULL,
        receipt_discrepancies = NULL,
        updated_at = now()
    WHERE id = p_order_id;

    -- Delete the old storage operation if exists
    IF v_receipt.storage_operation_id IS NOT NULL THEN
      DELETE FROM storage_operations WHERE id = v_receipt.storage_operation_id;
    END IF;

    v_new_total := 0;
    v_financial_impact := -v_old_total;

  ELSIF p_correction_type = 'item_quantity' OR p_correction_type = 'item_price' THEN
    -- Process each item correction
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_item_corrections)
    LOOP
      DECLARE
        v_item_id TEXT := v_item->>'itemId';
        v_receipt_item_id TEXT := v_item->>'receiptItemId';
        v_new_qty NUMERIC;
        v_new_price NUMERIC;
        v_old_qty NUMERIC;
        v_old_price NUMERIC;
        v_ri RECORD;
        v_delta NUMERIC;
        v_item_batch RECORD;
      BEGIN
        -- Get current receipt item
        SELECT * INTO v_ri
        FROM supplierstore_receipt_items
        WHERE id = v_receipt_item_id AND receipt_id = p_receipt_id;

        IF NOT FOUND THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Receipt item %s not found', v_receipt_item_id),
            'code', 'ITEM_NOT_FOUND'
          );
        END IF;

        v_old_qty := v_ri.received_quantity;
        v_old_price := COALESCE(v_ri.actual_base_cost, v_ri.ordered_base_cost);

        -- Determine new values
        IF p_correction_type = 'item_quantity' THEN
          v_new_qty := COALESCE((v_item->>'newQuantity')::NUMERIC, v_old_qty);
          v_new_price := v_old_price;
        ELSIF p_correction_type = 'item_price' THEN
          v_new_qty := v_old_qty;
          v_new_price := COALESCE((v_item->>'newBaseCost')::NUMERIC, v_old_price);
        END IF;

        v_delta := v_new_qty - v_old_qty;

        -- For quantity decrease, check batch consumption
        IF v_delta < 0 THEN
          SELECT * INTO v_item_batch
          FROM storage_batches
          WHERE purchase_order_id = p_order_id
            AND item_id = v_ri.item_id
            AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1;

          IF FOUND AND (v_item_batch.current_quantity + v_delta) < 0 THEN
            RETURN jsonb_build_object(
              'success', false,
              'error', format('Cannot decrease quantity by %s: batch %s only has %s available (consumed: %s)',
                ABS(v_delta), v_item_batch.id, v_item_batch.current_quantity,
                v_item_batch.initial_quantity - v_item_batch.current_quantity),
              'code', 'INSUFFICIENT_BATCH_QTY'
            );
          END IF;
        END IF;

        -- Update receipt item
        UPDATE supplierstore_receipt_items
        SET received_quantity = v_new_qty,
            actual_base_cost = v_new_price,
            received_package_quantity = CASE
              WHEN v_delta != 0 AND v_ri.ordered_package_quantity > 0
              THEN v_new_qty / (v_ri.ordered_quantity / v_ri.ordered_package_quantity)
              ELSE v_ri.received_package_quantity
            END,
            actual_price = CASE
              WHEN v_new_price != v_old_price AND v_ri.ordered_quantity > 0 AND v_ri.ordered_package_quantity > 0
              THEN v_new_price * (v_ri.ordered_quantity / v_ri.ordered_package_quantity)
              ELSE v_ri.actual_price
            END
        WHERE id = v_receipt_item_id;

        -- Update batch if quantity or price changed
        IF v_delta != 0 OR v_new_price != v_old_price THEN
          SELECT * INTO v_item_batch
          FROM storage_batches
          WHERE purchase_order_id = p_order_id
            AND item_id = v_ri.item_id
            AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1;

          IF FOUND THEN
            UPDATE storage_batches
            SET current_quantity = GREATEST(0, current_quantity + v_delta),
                initial_quantity = GREATEST(0, initial_quantity + v_delta),
                cost_per_unit = v_new_price,
                total_value = GREATEST(0, current_quantity + v_delta) * v_new_price,
                updated_at = now()
            WHERE id = v_item_batch.id;

            v_batch_adjustments := v_batch_adjustments || jsonb_build_object(
              'batchId', v_item_batch.id,
              'action', 'adjusted',
              'itemId', v_ri.item_id,
              'oldQuantity', v_item_batch.current_quantity,
              'newQuantity', v_item_batch.current_quantity + v_delta,
              'oldCostPerUnit', v_item_batch.cost_per_unit,
              'newCostPerUnit', v_new_price,
              'consumed', v_item_batch.initial_quantity - v_item_batch.current_quantity
            );
          END IF;
        END IF;

        -- Build item detail for audit
        v_item_details := v_item_details || jsonb_build_object(
          'receiptItemId', v_receipt_item_id,
          'itemId', v_ri.item_id,
          'itemName', v_ri.item_name,
          'oldQuantity', v_old_qty,
          'newQuantity', v_new_qty,
          'oldBaseCost', v_old_price,
          'newBaseCost', v_new_price,
          'delta', v_delta,
          'financialImpact', (v_new_qty * v_new_price) - (v_old_qty * v_old_price)
        );
      END;
    END LOOP;

    -- Recalculate new total
    SELECT COALESCE(SUM(
      received_quantity * COALESCE(actual_base_cost, ordered_base_cost)
    ), 0) INTO v_new_total
    FROM supplierstore_receipt_items
    WHERE receipt_id = p_receipt_id;

    v_financial_impact := v_new_total - v_old_total;

    -- Update order amounts
    UPDATE supplierstore_orders
    SET actual_delivered_amount = v_new_total,
        total_amount = v_new_total,
        updated_at = now()
    WHERE id = p_order_id;

    -- Update receipt discrepancy flag
    UPDATE supplierstore_receipts
    SET has_discrepancies = EXISTS(
      SELECT 1 FROM supplierstore_receipt_items ri
      WHERE ri.receipt_id = p_receipt_id
        AND (ABS(ri.received_quantity - ri.ordered_quantity) > 0.001
          OR (ri.actual_base_cost IS NOT NULL AND ABS(ri.actual_base_cost - ri.ordered_base_cost) > 0.01))
    ),
    updated_at = now()
    WHERE id = p_receipt_id;

  ELSIF p_correction_type = 'supplier_change' THEN
    -- Save old supplier info
    v_old_supplier_id := v_order.supplier_id;
    v_old_supplier_name := v_order.supplier_name;

    IF p_new_supplier_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'New supplier ID required', 'code', 'MISSING_SUPPLIER');
    END IF;

    -- Update order supplier
    UPDATE supplierstore_orders
    SET supplier_id = p_new_supplier_id,
        supplier_name = COALESCE(p_new_supplier_name, p_new_supplier_id),
        updated_at = now()
    WHERE id = p_order_id;

    -- Update batches supplier
    UPDATE storage_batches
    SET supplier_id = p_new_supplier_id,
        supplier_name = COALESCE(p_new_supplier_name, p_new_supplier_id),
        updated_at = now()
    WHERE purchase_order_id = p_order_id;

    v_new_total := v_old_total;
    v_financial_impact := 0;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', format('Unknown correction type: %s', p_correction_type), 'code', 'INVALID_TYPE');
  END IF;

  -- =============================================
  -- STEP 4: Create storage operation record
  -- =============================================
  INSERT INTO storage_operations (
    id, operation_type, document_number, operation_date,
    department, warehouse_id, responsible_person, items, total_value, status,
    created_at, updated_at
  ) VALUES (
    v_operation_id, 'correction', v_correction_number, now(),
    'kitchen', 'warehouse-winter', COALESCE(p_corrected_by, 'system'),
    '[]'::jsonb, ABS(v_financial_impact), 'completed',
    now(), now()
  );

  -- =============================================
  -- STEP 5: Insert correction record
  -- =============================================
  INSERT INTO supplierstore_receipt_corrections (
    id, correction_number, receipt_id, order_id,
    correction_type, reason, corrected_by,
    old_supplier_id, old_supplier_name, new_supplier_id, new_supplier_name,
    item_corrections, old_total_amount, new_total_amount, financial_impact,
    batch_adjustments, storage_operation_id, status,
    created_at, updated_at
  ) VALUES (
    v_correction_id, v_correction_number, p_receipt_id, p_order_id,
    p_correction_type, p_reason, p_corrected_by,
    v_old_supplier_id, v_old_supplier_name, p_new_supplier_id, p_new_supplier_name,
    COALESCE(v_item_details, p_item_corrections), v_old_total, v_new_total, v_financial_impact,
    v_batch_adjustments, v_operation_id, 'applied',
    now(), now()
  );

  -- =============================================
  -- RETURN
  -- =============================================
  RETURN jsonb_build_object(
    'success', true,
    'correctionId', v_correction_id,
    'correctionNumber', v_correction_number,
    'correctionType', p_correction_type,
    'operationId', v_operation_id,
    'oldTotal', v_old_total,
    'newTotal', v_new_total,
    'financialImpact', v_financial_impact,
    'batchAdjustments', v_batch_adjustments,
    'itemCorrections', v_item_details
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', 'UNEXPECTED_ERROR',
    'detail', SQLSTATE
  );
END;
$$;
