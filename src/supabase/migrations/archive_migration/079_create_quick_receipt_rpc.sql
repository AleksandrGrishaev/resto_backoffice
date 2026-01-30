-- Migration: 079_create_quick_receipt_rpc
-- Description: Create RPC function for optimized quick receipt creation
-- Date: 2025-12-25
-- Purpose: Reduce 8-10 sequential DB operations to 1 atomic transaction

-- Drop if exists (for re-running)
DROP FUNCTION IF EXISTS create_quick_receipt_complete(text, text, jsonb, timestamp with time zone, text, decimal, decimal);

CREATE OR REPLACE FUNCTION create_quick_receipt_complete(
  p_supplier_id text,
  p_supplier_name text,
  p_items jsonb,
  p_delivery_date timestamp with time zone,
  p_notes text,
  p_tax_amount decimal DEFAULT NULL,
  p_tax_percentage decimal DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id text;
  v_receipt_id text;
  v_order_number text;
  v_receipt_number text;
  v_timestamp timestamp with time zone := now();
  v_subtotal decimal := 0;
  v_total_amount decimal := 0;
  v_item jsonb;
  v_order_item_id text;
  v_receipt_items jsonb := '[]'::jsonb;
BEGIN
  -- Generate IDs
  v_order_id := gen_random_uuid()::text;
  v_receipt_id := gen_random_uuid()::text;

  -- Generate order number: PO-MMDD-NNN
  SELECT 'PO-' || to_char(now(), 'MMDD') || '-' ||
         lpad((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS integer)), 0) + 1)::text, 3, '0')
  INTO v_order_number
  FROM supplierstore_orders
  WHERE order_number LIKE 'PO-' || to_char(now(), 'MMDD') || '-%';

  -- Generate receipt number: RCP-MMDD-NNN
  SELECT 'RCP-' || to_char(now(), 'MMDD') || '-' ||
         lpad((COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 10) AS integer)), 0) + 1)::text, 3, '0')
  INTO v_receipt_number
  FROM supplierstore_receipts
  WHERE receipt_number LIKE 'RCP-' || to_char(now(), 'MMDD') || '-%';

  -- Calculate subtotal from items
  SELECT COALESCE(SUM((item->>'quantity')::decimal * (item->>'price_per_unit')::decimal), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  v_total_amount := v_subtotal + COALESCE(p_tax_amount, 0);

  -- 1. Create order (status = 'delivered' for quick receipt)
  INSERT INTO supplierstore_orders (
    id, order_number, supplier_id, supplier_name, order_date,
    expected_delivery_date, total_amount, is_estimated_total, status,
    receipt_id, notes, created_at, updated_at
  ) VALUES (
    v_order_id, v_order_number, p_supplier_id, p_supplier_name, v_timestamp,
    p_delivery_date, v_total_amount, false, 'delivered',
    v_receipt_id, COALESCE(p_notes, 'Quick Receipt Entry (Archive)'), v_timestamp, v_timestamp
  );

  -- 2. Create receipt (status = 'completed' for quick receipt)
  INSERT INTO supplierstore_receipts (
    id, receipt_number, purchase_order_id, delivery_date, received_by,
    has_discrepancies, status, tax_amount, tax_percentage, notes,
    closed_at, created_at, updated_at
  ) VALUES (
    v_receipt_id, v_receipt_number, v_order_id, p_delivery_date, 'Quick Entry',
    false, 'completed', p_tax_amount, p_tax_percentage, p_notes,
    v_timestamp, v_timestamp, v_timestamp
  );

  -- 3. Create order items + receipt items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_order_item_id := gen_random_uuid()::text;

    DECLARE
      v_quantity decimal := (v_item->>'quantity')::decimal;
      v_price_per_unit decimal := (v_item->>'price_per_unit')::decimal;
      v_package_price decimal := COALESCE((v_item->>'package_price')::decimal, 0);
      v_package_quantity decimal := COALESCE((v_item->>'package_quantity')::decimal, 1);
      v_line_total decimal := v_quantity * v_price_per_unit;
      v_tax_per_unit decimal := 0;
      v_actual_base_cost decimal;
    BEGIN
      -- Calculate proportional tax per unit
      IF p_tax_amount IS NOT NULL AND p_tax_amount > 0 AND v_subtotal > 0 THEN
        v_tax_per_unit := (p_tax_amount * (v_line_total / v_subtotal)) / v_quantity;
      END IF;
      v_actual_base_cost := v_price_per_unit + v_tax_per_unit;

      -- Insert order item
      INSERT INTO supplierstore_order_items (
        id, order_id, item_id, item_name, ordered_quantity, received_quantity,
        unit, package_id, package_name, package_quantity, package_unit,
        price_per_unit, package_price, total_price, is_estimated_price, status
      ) VALUES (
        v_order_item_id, v_order_id, v_item->>'item_id', v_item->>'item_name',
        v_quantity, v_quantity, v_item->>'unit', v_item->>'package_id',
        v_item->>'package_name', v_package_quantity, v_item->>'package_unit',
        v_price_per_unit, v_package_price, v_line_total, false, 'received'
      );

      -- Insert receipt item
      INSERT INTO supplierstore_receipt_items (
        id, receipt_id, order_item_id, item_id, item_name,
        ordered_quantity, received_quantity, unit, package_id, package_name,
        ordered_package_quantity, received_package_quantity, package_unit,
        ordered_price, actual_price, ordered_base_cost, actual_base_cost, notes
      ) VALUES (
        gen_random_uuid()::text, v_receipt_id, v_order_item_id, v_item->>'item_id',
        v_item->>'item_name', v_quantity, v_quantity, v_item->>'unit',
        v_item->>'package_id', v_item->>'package_name', v_package_quantity,
        v_package_quantity, v_item->>'package_unit', v_package_price,
        v_package_price, v_price_per_unit, v_actual_base_cost, NULL
      );

      -- Build receipt item for response (for storage integration)
      v_receipt_items := v_receipt_items || jsonb_build_object(
        'id', gen_random_uuid()::text,
        'orderItemId', v_order_item_id,
        'itemId', v_item->>'item_id',
        'itemName', v_item->>'item_name',
        'orderedQuantity', v_quantity,
        'receivedQuantity', v_quantity,
        'unit', v_item->>'unit',
        'packageId', v_item->>'package_id',
        'packageName', v_item->>'package_name',
        'orderedPackageQuantity', v_package_quantity,
        'receivedPackageQuantity', v_package_quantity,
        'packageUnit', v_item->>'package_unit',
        'orderedPrice', v_package_price,
        'actualPrice', v_package_price,
        'orderedBaseCost', v_price_per_unit,
        'actualBaseCost', v_actual_base_cost
      );
    END;
  END LOOP;

  -- Return result for client-side storage integration
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'supplier_id', p_supplier_id,
    'supplier_name', p_supplier_name,
    'total_amount', v_total_amount,
    'tax_amount', p_tax_amount,
    'tax_percentage', p_tax_percentage,
    'delivery_date', p_delivery_date,
    'status', 'completed',
    'items', v_receipt_items
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_quick_receipt_complete TO authenticated;
GRANT EXECUTE ON FUNCTION create_quick_receipt_complete TO anon;

COMMENT ON FUNCTION create_quick_receipt_complete IS
'Optimized quick receipt creation: creates order + items + receipt + items in one atomic transaction.
Returns complete data for client-side storage integration.
Performance: Reduces 8-10 DB operations to 1.';
