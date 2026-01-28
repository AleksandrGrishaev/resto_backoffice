-- Migration: 108_add_inventory_corrections_to_loss
-- Description: Include inventory corrections in Loss section of variance report
-- Date: 2026-01-28
-- Author: Claude
--
-- PROBLEM:
-- Inventory corrections (from inventories) are not included in Loss.
-- - Negative corrections = shortage found during inventory
-- - Positive corrections = surplus found during inventory
-- Both should be in Loss section, with net result shown.
--
-- CHANGES:
-- 1. Add inventory_corrections CTE to capture correction operations
-- 2. Include corrections in loss_by_reason aggregation
-- 3. Include corrections in total_direct_loss calculation
-- 4. Update Loss section to show all adjustments

DROP FUNCTION IF EXISTS get_product_variance_details_v2(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_product_variance_details_v2(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_opening_date DATE;
  v_product_avg_cost NUMERIC;
BEGIN
  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;

  SELECT COALESCE(
    (SELECT AVG(sb.cost_per_unit)
     FROM storage_batches sb
     WHERE sb.item_id = p_product_id::TEXT
       AND sb.item_type = 'product'
       AND sb.status = 'active'),
    (SELECT last_known_cost FROM products WHERE id = p_product_id)
  ) INTO v_product_avg_cost;

  WITH
  product_info AS (
    SELECT p.id, p.name, p.code, p.base_unit, COALESCE(p.used_in_departments[1], 'kitchen') as department
    FROM products p WHERE p.id = p_product_id AND p.is_active = true
  ),

  opening_snapshot AS (
    SELECT inv_s.quantity, inv_s.total_cost as amount, inv_s.snapshot_date, inv_s.source, inv_s.source_document_id,
      (SELECT inv_d.document_number FROM inventory_documents inv_d WHERE inv_d.id::TEXT = inv_s.source_document_id LIMIT 1) as document_number
    FROM inventory_snapshots inv_s WHERE inv_s.item_id = p_product_id::TEXT AND inv_s.snapshot_date = v_opening_date LIMIT 1
  ),

  received_items AS (
    SELECT sr.id as receipt_id, sr.receipt_number, sr.delivery_date, COALESCE(c.name, 'Unknown Supplier') as supplier_name,
      sri.received_quantity, COALESCE(sri.actual_base_cost, sri.ordered_base_cost) as unit_cost,
      sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost) as total_cost
    FROM supplierstore_receipt_items sri
    JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    LEFT JOIN supplierstore_orders po ON po.id = sr.purchase_order_id
    LEFT JOIN counteragents c ON c.id = po.supplier_id::UUID
    WHERE sri.item_id = p_product_id::TEXT AND sr.delivery_date >= p_start_date AND sr.delivery_date < p_end_date AND sr.status = 'completed'
    ORDER BY sr.delivery_date DESC
  ),

  received_totals AS (
    SELECT COALESCE(SUM(received_quantity), 0) as qty, COALESCE(SUM(total_cost), 0) as amount, COUNT(*) as total_count FROM received_items
  ),

  completed_orders AS (
    SELECT DISTINCT o.id as order_id FROM orders o JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed' AND pay.created_at >= p_start_date AND pay.created_at < p_end_date
  ),

  order_items_data AS (
    SELECT oi.menu_item_id, oi.variant_id, oi.quantity as order_qty FROM order_items oi
    JOIN completed_orders co ON co.order_id = oi.order_id WHERE oi.status != 'cancelled'
  ),

  variant_compositions AS (
    SELECT mi.id as menu_item_id, mi.name as menu_item_name, (v->>'id') as variant_id, (v->>'name') as variant_name,
      (c->>'id') as composition_id, (c->>'type') as composition_type, (c->>'quantity')::NUMERIC as composition_qty
    FROM menu_items mi, LATERAL jsonb_array_elements(mi.variants) as v, LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),

  direct_product_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty) as product_used, 'direct' as sales_type, NULL::TEXT as via_preparation
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'product' AND vc.composition_id::UUID = p_product_id
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name
  ),

  prep_recipes AS (
    SELECT p.id as preparation_id, p.name as preparation_name, p.output_quantity, p.portion_type, p.portion_size,
           pi.quantity as product_qty_per_batch
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.ingredient_id = p_product_id AND pi.type = 'product' AND p.is_active = true
  ),

  prep_direct_menu_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(CASE WHEN pr.portion_type = 'portion' THEN oid.order_qty * vc.composition_qty * pr.product_qty_per_batch
               ELSE oid.order_qty * vc.composition_qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0) END) as product_used,
      'via_prep' as sales_type, pr.preparation_name
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN prep_recipes pr ON pr.preparation_id = vc.composition_id::UUID
    WHERE vc.composition_type = 'preparation'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, pr.preparation_name
  ),

  prep_recipe_menu_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(CASE WHEN pr.portion_type = 'portion' THEN oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0) * pr.product_qty_per_batch
               ELSE oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0) * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0) END) as product_used,
      'via_recipe_prep' as sales_type, pr.preparation_name
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id AND rc.component_type = 'preparation'
    JOIN prep_recipes pr ON pr.preparation_id = rc.component_id::UUID
    WHERE vc.composition_type = 'recipe'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, pr.preparation_name
  ),

  direct_prep_from_orders AS (
    SELECT vc.composition_id::UUID as preparation_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'preparation' GROUP BY vc.composition_id
  ),

  preps_from_recipes AS (
    SELECT rc.component_id::UUID as preparation_id, SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)) as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'preparation'
    GROUP BY rc.component_id
  ),

  all_preps_consumed AS (
    SELECT preparation_id, SUM(qty) as qty FROM (SELECT * FROM direct_prep_from_orders UNION ALL SELECT * FROM preps_from_recipes) combined GROUP BY preparation_id
  ),

  products_via_preps AS (
    SELECT pr.preparation_id, pr.preparation_name,
      SUM(CASE WHEN pr.portion_type = 'portion' THEN apc.qty * pr.product_qty_per_batch
               ELSE apc.qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0) END) as product_qty,
      SUM(CASE WHEN pr.portion_type = 'portion' THEN apc.qty * pr.product_qty_per_batch
               ELSE apc.qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0) END) * v_product_avg_cost as product_cost
    FROM all_preps_consumed apc JOIN prep_recipes pr ON pr.preparation_id = apc.preparation_id
    GROUP BY pr.preparation_id, pr.preparation_name
  ),

  all_menu_item_sales AS (
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type,
           via_preparation as preparation_name
    FROM direct_product_sales
    UNION ALL
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type,
           preparation_name
    FROM prep_direct_menu_sales
    UNION ALL
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type,
           preparation_name
    FROM prep_recipe_menu_sales
  ),

  menu_item_sales_summary AS (
    SELECT menu_item_name, variant_name, SUM(quantity_sold) as quantity_sold, SUM(product_used) as product_used,
           MAX(preparation_name) as via_preparation
    FROM all_menu_item_sales
    GROUP BY menu_item_id, menu_item_name, variant_name
    ORDER BY SUM(product_used) DESC
  ),

  total_sales AS (
    SELECT COALESCE(SUM(product_used), 0) as qty,
           COALESCE(SUM(product_used), 0) * v_product_avg_cost as amount
    FROM all_menu_item_sales
  ),

  -- Loss section: write-offs (expired, spoiled, other)
  direct_losses AS (
    SELECT so.operation_date::DATE as loss_date, so.write_off_details->>'reason' as reason,
      (item->>'quantity')::NUMERIC as quantity, COALESCE((item->>'totalCost')::NUMERIC, 0) as amount,
      item->>'batchNumber' as batch_number, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemId')::UUID = p_product_id
    ORDER BY so.operation_date DESC
  ),

  -- NEW: Inventory corrections (both positive and negative)
  inventory_corrections AS (
    SELECT so.operation_date::DATE as loss_date,
      'inventory_adjustment' as reason,
      (item->>'quantity')::NUMERIC as quantity,  -- can be positive or negative
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount,
      NULL::TEXT as batch_number,
      so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction'
      AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed'
      AND (item->>'itemId')::UUID = p_product_id
    ORDER BY so.operation_date DESC
  ),

  -- Combine all losses (write-offs + corrections)
  all_losses AS (
    SELECT * FROM direct_losses
    UNION ALL
    SELECT * FROM inventory_corrections
  ),

  loss_by_reason AS (
    SELECT reason, SUM(quantity) as quantity, SUM(amount) as amount
    FROM all_losses
    GROUP BY reason
  ),

  total_direct_loss AS (
    SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount
    FROM all_losses
  ),

  prep_losses AS (
    SELECT pr.preparation_id, pr.preparation_name,
      SUM(CASE WHEN pr.portion_type = 'portion' THEN (item->>'quantity')::NUMERIC * pr.product_qty_per_batch / NULLIF(pr.portion_size::NUMERIC, 0)
               ELSE (item->>'quantity')::NUMERIC * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0) END) as product_qty,
      SUM(CASE WHEN pr.portion_type = 'portion' THEN COALESCE((item->>'totalCost')::NUMERIC, 0) * pr.product_qty_per_batch / NULLIF(pr.portion_size::NUMERIC, 0)
               ELSE COALESCE((item->>'totalCost')::NUMERIC, 0) * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0) END) as product_cost
    FROM preparation_operations po, LATERAL jsonb_array_elements(po.items) AS item
    JOIN prep_recipes pr ON pr.preparation_id = (item->>'preparationId')::UUID
    WHERE po.operation_type = 'write_off' AND po.operation_date >= p_start_date AND po.operation_date < p_end_date
      AND po.status = 'confirmed' AND (po.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
    GROUP BY pr.preparation_id, pr.preparation_name
  ),

  raw_batches AS (
    SELECT sb.id as batch_id, sb.batch_number, sb.receipt_date, sb.current_quantity, sb.cost_per_unit,
      sb.current_quantity * sb.cost_per_unit as total_value
    FROM storage_batches sb
    WHERE sb.item_id = p_product_id::TEXT AND sb.item_type = 'product' AND sb.status = 'active' AND sb.current_quantity > 0
    ORDER BY sb.receipt_date
  ),

  raw_stock_totals AS (SELECT COALESCE(SUM(current_quantity), 0) as qty, COALESCE(SUM(total_value), 0) as amount FROM raw_batches),

  in_preps AS (
    SELECT pb.preparation_id, p.name as preparation_name, pb.production_date::DATE as batch_date,
      CASE WHEN p.portion_type = 'portion' THEN pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.portion_size::NUMERIC, 0)
           ELSE pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity, 0) END as product_qty,
      CASE WHEN p.portion_type = 'portion' THEN pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.portion_size::NUMERIC, 0) * v_product_avg_cost
           ELSE pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity, 0) * v_product_avg_cost END as product_cost
    FROM preparation_batches pb
    JOIN preparations p ON p.id = pb.preparation_id
    JOIN prep_recipes pr ON pr.preparation_id = pb.preparation_id
    WHERE pb.status = 'active' AND pb.current_quantity > 0
  ),

  in_preps_totals AS (SELECT COALESCE(SUM(product_qty), 0) as qty, COALESCE(SUM(product_cost), 0) as amount FROM in_preps),

  total_loss AS (
    SELECT COALESCE((SELECT qty FROM total_direct_loss), 0) + COALESCE((SELECT SUM(product_qty) FROM prep_losses), 0) as qty,
           COALESCE((SELECT amount FROM total_direct_loss), 0) + COALESCE((SELECT SUM(product_cost) FROM prep_losses), 0) as amount
  ),

  -- Actual write-offs section (for analysis)
  sales_consumption_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (item->>'itemId')::UUID = p_product_id
      AND so.write_off_details->>'reason' = 'sales_consumption'
    ORDER BY so.operation_date DESC
  ),

  sales_consumption_totals AS (
    SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount, COUNT(*) as ops_count
    FROM sales_consumption_writeoffs
  ),

  production_consumption_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (item->>'itemId')::UUID = p_product_id
      AND so.write_off_details->>'reason' = 'production_consumption'
    ORDER BY so.operation_date DESC
  ),

  production_consumption_totals AS (
    SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount, COUNT(*) as ops_count
    FROM production_consumption_writeoffs
  ),

  correction_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (item->>'itemId')::UUID = p_product_id
    ORDER BY so.operation_date DESC
  ),

  correction_totals AS (
    SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount, COUNT(*) as ops_count
    FROM correction_writeoffs
  ),

  actual_writeoffs_total AS (
    SELECT (SELECT qty FROM sales_consumption_totals) + (SELECT qty FROM production_consumption_totals) as qty,
           (SELECT amount FROM sales_consumption_totals) + (SELECT amount FROM production_consumption_totals) as amount
  )

  SELECT jsonb_build_object(
    'product', (SELECT jsonb_build_object('id', id, 'name', name, 'code', code, 'unit', base_unit, 'department', department) FROM product_info),
    'period', jsonb_build_object('dateFrom', p_start_date::DATE, 'dateTo', p_end_date::DATE),
    'opening', jsonb_build_object(
      'quantity', COALESCE((SELECT quantity FROM opening_snapshot), 0),
      'amount', COALESCE((SELECT amount FROM opening_snapshot), 0),
      'snapshot', CASE WHEN (SELECT quantity FROM opening_snapshot) IS NOT NULL THEN
        jsonb_build_object('date', (SELECT snapshot_date FROM opening_snapshot), 'source', (SELECT source FROM opening_snapshot),
          'documentId', (SELECT source_document_id FROM opening_snapshot), 'documentNumber', (SELECT document_number FROM opening_snapshot))
        ELSE NULL END
    ),
    'received', jsonb_build_object(
      'quantity', (SELECT qty FROM received_totals), 'amount', (SELECT amount FROM received_totals),
      'receipts', COALESCE((SELECT jsonb_agg(jsonb_build_object('receiptId', receipt_id, 'receiptNumber', receipt_number, 'date', delivery_date,
        'supplierName', supplier_name, 'quantity', received_quantity, 'unitCost', ROUND(unit_cost, 2), 'totalCost', ROUND(total_cost, 2)))
        FROM (SELECT * FROM received_items LIMIT 10) t), '[]'::jsonb),
      'totalReceiptsCount', (SELECT total_count FROM received_totals)
    ),
    'sales', jsonb_build_object(
      'quantity', ROUND((SELECT qty FROM total_sales), 3), 'amount', ROUND((SELECT amount FROM total_sales), 2),
      'direct', jsonb_build_object('quantity', ROUND(COALESCE((SELECT SUM(product_used) FROM direct_product_sales), 0), 3),
        'amount', ROUND(COALESCE((SELECT SUM(product_used) FROM direct_product_sales), 0) * v_product_avg_cost, 2)),
      'viaPreparations', jsonb_build_object('quantity', ROUND(COALESCE((SELECT SUM(product_qty) FROM products_via_preps), 0), 3),
        'amount', ROUND(COALESCE((SELECT SUM(product_cost) FROM products_via_preps), 0), 2)),
      'topMenuItems', COALESCE((SELECT jsonb_agg(jsonb_build_object('menuItemName', menu_item_name, 'variantName', variant_name,
        'quantitySold', quantity_sold, 'productUsed', ROUND(product_used, 3), 'productCost', ROUND(product_used * v_product_avg_cost, 2),
        'viaPreparation', via_preparation))
        FROM (SELECT * FROM menu_item_sales_summary LIMIT 10) t), '[]'::jsonb),
      'totalMenuItemsCount', (SELECT COUNT(DISTINCT (menu_item_name, variant_name)) FROM all_menu_item_sales),
      'preparations', COALESCE((SELECT jsonb_agg(jsonb_build_object('preparationName', preparation_name, 'batchesProduced', 0,
        'productUsed', ROUND(product_qty, 3), 'productCost', ROUND(product_cost, 2))) FROM products_via_preps), '[]'::jsonb)
    ),
    'loss', jsonb_build_object(
      'quantity', ROUND((SELECT qty FROM total_loss), 3),
      'amount', ROUND((SELECT amount FROM total_loss), 2),
      'byReason', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'reason', reason,
        'quantity', ROUND(quantity, 3),
        'amount', ROUND(amount, 2),
        'percentage', ROUND(CASE WHEN (SELECT amount FROM total_loss) > 0 THEN (amount / (SELECT amount FROM total_loss)) * 100 ELSE 0 END, 1)
      )) FROM loss_by_reason), '[]'::jsonb),
      'details', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'date', loss_date,
        'reason', reason,
        'quantity', ROUND(quantity, 3),
        'amount', ROUND(amount, 2),
        'batchNumber', batch_number,
        'notes', notes
      )) FROM (SELECT * FROM all_losses ORDER BY loss_date DESC LIMIT 20) t), '[]'::jsonb),
      'tracedFromPreps', jsonb_build_object(
        'quantity', COALESCE((SELECT SUM(product_qty) FROM prep_losses), 0),
        'amount', COALESCE((SELECT SUM(product_cost) FROM prep_losses), 0),
        'preparations', COALESCE((SELECT jsonb_agg(jsonb_build_object('preparationName', preparation_name, 'lossQuantity', ROUND(product_qty, 3), 'lossAmount', ROUND(product_cost, 2))) FROM prep_losses), '[]'::jsonb)
      )
    ),
    'closing', jsonb_build_object(
      'rawStock', jsonb_build_object('quantity', (SELECT qty FROM raw_stock_totals), 'amount', ROUND((SELECT amount FROM raw_stock_totals), 2),
        'batches', COALESCE((SELECT jsonb_agg(jsonb_build_object('batchId', batch_id, 'batchNumber', batch_number, 'receiptDate', receipt_date,
          'quantity', current_quantity, 'costPerUnit', ROUND(cost_per_unit, 2), 'totalValue', ROUND(total_value, 2))) FROM raw_batches), '[]'::jsonb)),
      'inPreparations', jsonb_build_object('quantity', ROUND((SELECT qty FROM in_preps_totals), 3), 'amount', ROUND((SELECT amount FROM in_preps_totals), 2),
        'preparations', COALESCE((SELECT jsonb_agg(jsonb_build_object('preparationName', preparation_name, 'batchDate', batch_date,
          'productQuantity', ROUND(product_qty, 3), 'productCost', ROUND(product_cost, 2))) FROM in_preps), '[]'::jsonb)),
      'total', jsonb_build_object('quantity', ROUND((SELECT qty FROM raw_stock_totals) + (SELECT qty FROM in_preps_totals), 3),
        'amount', ROUND((SELECT amount FROM raw_stock_totals) + (SELECT amount FROM in_preps_totals), 2))
    ),
    'variance', (
      SELECT jsonb_build_object(
        'quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2),
        'interpretation', CASE WHEN variance_qty < -0.01 THEN 'shortage' WHEN variance_qty > 0.01 THEN 'surplus' ELSE 'balanced' END,
        'possibleReasons', CASE
          WHEN variance_qty < -0.01 THEN ARRAY['Unrecorded sales', 'Theft or loss', 'Measurement errors', 'Data entry errors']
          WHEN variance_qty > 0.01 THEN ARRAY['Unrecorded receipts', 'Over-portioning', 'Measurement errors', 'Data entry errors']
          ELSE ARRAY[]::TEXT[] END
      ) FROM (
        SELECT COALESCE((SELECT quantity FROM opening_snapshot), 0) + (SELECT qty FROM received_totals) - (SELECT qty FROM total_sales) - (SELECT qty FROM total_loss) - (SELECT qty FROM raw_stock_totals) - (SELECT qty FROM in_preps_totals) as variance_qty,
               COALESCE((SELECT amount FROM opening_snapshot), 0) + (SELECT amount FROM received_totals) - (SELECT qty FROM total_sales) * v_product_avg_cost - (SELECT amount FROM total_loss) - (SELECT amount FROM raw_stock_totals) - (SELECT amount FROM in_preps_totals) as variance_amount
      ) v
    ),
    'actualWriteOffs', jsonb_build_object(
      'salesConsumption', jsonb_build_object(
        'quantity', (SELECT qty FROM sales_consumption_totals),
        'amount', (SELECT amount FROM sales_consumption_totals),
        'operationsCount', (SELECT ops_count FROM sales_consumption_totals)
      ),
      'productionConsumption', jsonb_build_object(
        'quantity', (SELECT qty FROM production_consumption_totals),
        'amount', (SELECT amount FROM production_consumption_totals),
        'operationsCount', (SELECT ops_count FROM production_consumption_totals),
        'details', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', wo_date, 'quantity', quantity, 'amount', amount, 'notes', notes
        )) FROM (SELECT * FROM production_consumption_writeoffs LIMIT 10) t), '[]'::jsonb)
      ),
      'corrections', jsonb_build_object(
        'quantity', (SELECT qty FROM correction_totals),
        'amount', (SELECT amount FROM correction_totals),
        'operationsCount', (SELECT ops_count FROM correction_totals),
        'details', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', wo_date, 'quantity', quantity, 'amount', amount, 'notes', notes
        )) FROM (SELECT * FROM correction_writeoffs LIMIT 10) t), '[]'::jsonb)
      ),
      'total', jsonb_build_object(
        'quantity', (SELECT qty FROM actual_writeoffs_total),
        'amount', (SELECT amount FROM actual_writeoffs_total)
      ),
      'differenceFromTheoretical', jsonb_build_object(
        'quantity', (SELECT qty FROM total_sales) - (SELECT qty FROM actual_writeoffs_total),
        'amount', ((SELECT qty FROM total_sales) - (SELECT qty FROM actual_writeoffs_total)) * v_product_avg_cost,
        'interpretation', CASE
          WHEN ABS((SELECT qty FROM total_sales) - (SELECT qty FROM actual_writeoffs_total)) < 1 THEN 'matched'
          WHEN (SELECT qty FROM total_sales) > (SELECT qty FROM actual_writeoffs_total) THEN 'under_written_off'
          ELSE 'over_written_off' END
      )
    ),
    'generatedAt', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION get_product_variance_details_v2(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Product Variance Detail V2.4 - includes inventory corrections in Loss section';
