-- Migration: 099_fix_quick_receipt_amount_fields
-- Description: Fix create_quick_receipt_complete RPC to populate original_total_amount and actual_delivered_amount
-- Date: 2026-01-27
-- Author: Claude Code

-- CONTEXT:
-- The create_quick_receipt_complete function was not setting original_total_amount and
-- actual_delivered_amount when creating the order. This caused UI to fall back to totalAmount
-- instead of showing actual delivered amount properly.
--
-- FIX: Add original_total_amount and actual_delivered_amount to the INSERT statement.
-- For Quick Receipt, original = actual = total (since it's instant delivery with no discrepancies).

CREATE OR REPLACE FUNCTION create_quick_receipt_complete(
  p_supplier_id text,
  p_supplier_name text,
  p_items jsonb,
  p_delivery_date timestamp with time zone,
  p_notes text,
  p_tax_amount decimal DEFAULT NULL,
  p_tax_percentage decimal DEFAULT NULL,
  p_update_prices boolean DEFAULT true
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
  v_products_updated integer := 0;
  v_packages_updated integer := 0;
BEGIN
  -- ============================================
  -- STEP 1: Generate IDs and Numbers
  -- ============================================

  -- Generate UUIDs for order and receipt
  v_order_id := gen_random_uuid()::text;
  v_receipt_id := gen_random_uuid()::text;

  -- Generate sequential order number: PO-YYMMDD-NNN
  SELECT 'PO-' || to_char(now(), 'YYMMDD') || '-' ||
         lpad((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 11) AS integer)), 0) + 1)::text, 3, '0')
  INTO v_order_number
  FROM supplierstore_orders
  WHERE order_number LIKE 'PO-' || to_char(now(), 'YYMMDD') || '-%';

  -- Generate sequential receipt number: RCP-YYMMDD-NNN
  SELECT 'RCP-' || to_char(now(), 'YYMMDD') || '-' ||
         lpad((COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 12) AS integer)), 0) + 1)::text, 3, '0')
  INTO v_receipt_number
  FROM supplierstore_receipts
  WHERE receipt_number LIKE 'RCP-' || to_char(now(), 'YYMMDD') || '-%';

  -- ============================================
  -- STEP 2: Calculate Totals
  -- ============================================

  -- Calculate subtotal from items (sum of quantity * price_per_unit)
  SELECT COALESCE(SUM((item->>'quantity')::decimal * (item->>'price_per_unit')::decimal), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  -- Add tax to get total amount
  v_total_amount := v_subtotal + COALESCE(p_tax_amount, 0);

  -- ============================================
  -- STEP 3: Create Order Record
  -- ============================================

  -- Create order with status 'delivered' (quick receipt is already delivered)
  -- For Quick Receipt: original_total_amount = actual_delivered_amount = total_amount
  -- (no discrepancies since it's instant delivery with exact amounts)
  INSERT INTO supplierstore_orders (
    id, order_number, supplier_id, supplier_name, order_date,
    expected_delivery_date, total_amount, original_total_amount, actual_delivered_amount,
    is_estimated_total, status, receipt_id, notes, created_at, updated_at
  ) VALUES (
    v_order_id, v_order_number, p_supplier_id, p_supplier_name, v_timestamp,
    p_delivery_date, v_total_amount, v_total_amount, v_total_amount,
    false, 'delivered', v_receipt_id, COALESCE(p_notes, 'Quick Receipt Entry (Archive)'), v_timestamp, v_timestamp
  );

  -- ============================================
  -- STEP 4: Create Receipt Record
  -- ============================================

  -- Create receipt with status 'completed' (quick receipt is already completed)
  INSERT INTO supplierstore_receipts (
    id, receipt_number, purchase_order_id, delivery_date, received_by,
    has_discrepancies, status, tax_amount, tax_percentage, notes,
    closed_at, created_at, updated_at
  ) VALUES (
    v_receipt_id, v_receipt_number, v_order_id, p_delivery_date, 'Quick Entry',
    false, 'completed', p_tax_amount, p_tax_percentage, p_notes,
    v_timestamp, v_timestamp, v_timestamp
  );

  -- ============================================
  -- STEP 5: Create Order Items + Receipt Items
  -- ============================================

  -- Loop through each item and create order_item + receipt_item
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
      -- Calculate proportional tax per unit (if tax is included)
      -- Tax is distributed proportionally across items based on their line totals
      IF p_tax_amount IS NOT NULL AND p_tax_amount > 0 AND v_subtotal > 0 THEN
        v_tax_per_unit := (p_tax_amount * (v_line_total / v_subtotal)) / v_quantity;
      END IF;

      -- Actual base cost includes tax
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

  -- ============================================
  -- STEP 6: Batch Price Updates
  -- ============================================

  IF p_update_prices THEN
    -- Batch UPDATE products table (last_known_cost + base_cost_per_unit)
    UPDATE products
    SET
      last_known_cost = v_price_updates.price_per_unit,
      base_cost_per_unit = CASE
        WHEN base_cost_per_unit != v_price_updates.price_per_unit
        THEN v_price_updates.price_per_unit
        ELSE base_cost_per_unit
      END,
      updated_at = NOW()
    FROM (
      SELECT
        (item->>'item_id')::uuid AS product_id,
        (item->>'price_per_unit')::numeric AS price_per_unit
      FROM jsonb_array_elements(p_items) AS item
    ) AS v_price_updates
    WHERE products.id = v_price_updates.product_id;

    GET DIAGNOSTICS v_products_updated = ROW_COUNT;

    -- Batch UPDATE package_options table
    UPDATE package_options
    SET
      base_cost_per_unit = v_package_updates.price_per_unit,
      package_price = v_package_updates.price_per_unit * package_options.package_size,
      updated_at = NOW()
    FROM (
      SELECT
        (item->>'package_id')::uuid AS package_id,
        (item->>'price_per_unit')::numeric AS price_per_unit
      FROM jsonb_array_elements(p_items) AS item
      WHERE (item->>'package_id') IS NOT NULL
        AND (item->>'package_id') != 'default'
        AND (item->>'package_id') != ''
    ) AS v_package_updates
    WHERE package_options.id = v_package_updates.package_id;

    GET DIAGNOSTICS v_packages_updated = ROW_COUNT;
  END IF;

  -- ============================================
  -- STEP 7: Return Complete Result
  -- ============================================

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'supplier_id', p_supplier_id,
    'supplier_name', p_supplier_name,
    'total_amount', v_total_amount,
    'original_total_amount', v_total_amount,
    'actual_delivered_amount', v_total_amount,
    'tax_amount', p_tax_amount,
    'tax_percentage', p_tax_percentage,
    'delivery_date', p_delivery_date,
    'status', 'completed',
    'items', v_receipt_items,
    'priceUpdates', jsonb_build_object(
      'productsUpdated', v_products_updated,
      'packagesUpdated', v_packages_updated,
      'enabled', p_update_prices
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_quick_receipt_complete TO authenticated;
GRANT EXECUTE ON FUNCTION create_quick_receipt_complete TO anon;

-- POST-MIGRATION: Fix existing Quick Receipt orders that have NULL amount fields
UPDATE supplierstore_orders
SET
  original_total_amount = total_amount,
  actual_delivered_amount = total_amount
WHERE status = 'delivered'
  AND original_total_amount IS NULL
  AND actual_delivered_amount IS NULL
  AND total_amount IS NOT NULL;

-- Validation
DO $$
DECLARE
  v_fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_fixed_count
  FROM supplierstore_orders
  WHERE status = 'delivered'
    AND original_total_amount IS NOT NULL
    AND actual_delivered_amount IS NOT NULL;

  RAISE NOTICE 'Migration 099 completed: % delivered orders now have amount fields populated', v_fixed_count;
END $$;
