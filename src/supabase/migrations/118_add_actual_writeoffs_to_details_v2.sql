-- Migration 118: Add actualWriteOffs section to details_v2
-- Shows actual write-offs: sales_consumption, production_consumption, corrections
-- With comparison to theoretical sales
-- Version: v2.10

CREATE OR REPLACE FUNCTION get_product_variance_details_v2(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_opening_date DATE;
  v_product_avg_cost NUMERIC;
  v_filter_end_date TIMESTAMPTZ;
BEGIN
  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;

  SELECT COALESCE(
    (SELECT AVG(sb.cost_per_unit) FROM storage_batches sb
     WHERE sb.item_id = p_product_id::TEXT AND sb.item_type = 'product' AND sb.status = 'active'),
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
    SELECT sr.id as receipt_id, sr.receipt_number, sr.delivery_date, COALESCE(c.name, 'Unknown') as supplier_name,
      sri.received_quantity, COALESCE(sri.actual_base_cost, sri.ordered_base_cost) as unit_cost,
      sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost) as total_cost
    FROM supplierstore_receipt_items sri JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    LEFT JOIN supplierstore_orders po ON po.id = sr.purchase_order_id
    LEFT JOIN counteragents c ON c.id = po.supplier_id::UUID
    WHERE sri.item_id = p_product_id::TEXT AND sr.delivery_date >= p_start_date AND sr.delivery_date < v_filter_end_date AND sr.status = 'completed'
  ),
  received_totals AS (
    SELECT COALESCE(SUM(received_quantity), 0) as qty, COALESCE(SUM(total_cost), 0) as amount, COUNT(*) as total_count FROM received_items
  ),
  completed_orders AS (
    SELECT DISTINCT o.id as order_id FROM orders o JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed' AND pay.created_at >= p_start_date AND pay.created_at < v_filter_end_date
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
      SUM(oid.order_qty * vc.composition_qty) as product_used, 'direct' as sales_type, NULL::TEXT as via_name
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'product' AND vc.composition_id::UUID = p_product_id
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name
  ),
  recipe_product_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)) as product_used,
      'via_recipe' as sales_type, r.name as via_name
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'product' AND rc.component_id::UUID = p_product_id
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, r.name
  ),
  prep_recipes AS (
    WITH RECURSIVE prep_product_tree AS (
      SELECT p.id as leaf_prep_id, p.id as current_prep_id, p.name as leaf_prep_name,
        p.output_quantity::NUMERIC as leaf_output_qty,
        pi.quantity::NUMERIC as product_qty_per_batch, 1 as depth, ARRAY[p.id] as path
      FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.ingredient_id = p_product_id AND pi.type = 'product' AND p.is_active = true
      UNION ALL
      SELECT ppt.leaf_prep_id, parent_p.id, ppt.leaf_prep_name, ppt.leaf_output_qty,
        (ppt.product_qty_per_batch * parent_pi.quantity / NULLIF(child_p.output_quantity, 0))::NUMERIC, ppt.depth + 1, ppt.path || parent_p.id
      FROM prep_product_tree ppt
      JOIN preparations child_p ON child_p.id = ppt.current_prep_id
      JOIN preparation_ingredients parent_pi ON parent_pi.ingredient_id = child_p.id AND parent_pi.type = 'preparation'
      JOIN preparations parent_p ON parent_p.id = parent_pi.preparation_id
      WHERE parent_p.is_active = true AND ppt.depth < 5 AND NOT parent_p.id = ANY(ppt.path)
    )
    SELECT DISTINCT ON (current_prep_id) current_prep_id as preparation_id, leaf_prep_name as preparation_name,
      (SELECT output_quantity FROM preparations WHERE id = current_prep_id) as output_quantity, product_qty_per_batch
    FROM prep_product_tree ORDER BY current_prep_id, depth DESC
  ),
  prep_direct_menu_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) as product_used,
      'via_prep' as sales_type, pr.preparation_name as via_name
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN prep_recipes pr ON pr.preparation_id = vc.composition_id::UUID
    WHERE vc.composition_type = 'preparation'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, pr.preparation_name
  ),
  prep_recipe_menu_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0) * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) as product_used,
      'via_recipe_prep' as sales_type, pr.preparation_name as via_name
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id AND rc.component_type = 'preparation'
    JOIN prep_recipes pr ON pr.preparation_id = rc.component_id::UUID
    WHERE vc.composition_type = 'recipe'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, pr.preparation_name
  ),
  all_menu_item_sales AS (
    SELECT * FROM direct_product_sales UNION ALL SELECT * FROM recipe_product_sales
    UNION ALL SELECT * FROM prep_direct_menu_sales UNION ALL SELECT * FROM prep_recipe_menu_sales
  ),
  sales_by_type AS (
    SELECT
      COALESCE(SUM(product_used) FILTER (WHERE sales_type = 'direct'), 0) as direct_qty,
      COALESCE(SUM(product_used) FILTER (WHERE sales_type = 'via_recipe'), 0) as via_recipes_qty,
      COALESCE(SUM(product_used) FILTER (WHERE sales_type IN ('via_prep', 'via_recipe_prep')), 0) as via_preps_qty,
      COALESCE(SUM(product_used), 0) as total_qty
    FROM all_menu_item_sales
  ),
  total_sales AS (
    SELECT total_qty as qty, total_qty * v_product_avg_cost as amount FROM sales_by_type
  ),
  top_menu_items AS (
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used,
           product_used * v_product_avg_cost as product_cost, sales_type, via_name
    FROM all_menu_item_sales ORDER BY product_used DESC LIMIT 10
  ),
  -- Losses for formula (expired, spoiled, other + corrections)
  direct_losses AS (
    SELECT so.operation_date::DATE as loss_date, so.write_off_details->>'reason' as reason,
      (item->>'quantity')::NUMERIC as quantity, COALESCE((item->>'totalCost')::NUMERIC, 0) as amount,
      item->>'batchNumber' as batch_number, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemId')::UUID = p_product_id
  ),
  inventory_corrections AS (
    SELECT so.operation_date::DATE as loss_date, 'inventory_adjustment' as reason, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, NULL::TEXT as batch_number, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (item->>'itemId')::UUID = p_product_id
  ),
  all_losses AS (SELECT * FROM direct_losses UNION ALL SELECT * FROM inventory_corrections),
  total_direct_loss AS (SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount FROM all_losses),

  -- ACTUAL WRITE-OFFS (for analysis section)
  sales_consumption_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemId')::UUID = p_product_id
  ),
  sales_consumption_totals AS (
    SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount FROM sales_consumption_writeoffs
  ),
  production_consumption_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') = 'production_consumption'
      AND (item->>'itemId')::UUID = p_product_id
  ),
  production_consumption_totals AS (
    SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount FROM production_consumption_writeoffs
  ),
  all_corrections AS (
    SELECT so.operation_date::DATE as corr_date, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (item->>'itemId')::UUID = p_product_id
  ),
  corrections_totals AS (
    SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(amount), 0) as amount FROM all_corrections
  ),
  actual_writeoffs_totals AS (
    SELECT (SELECT qty FROM sales_consumption_totals) + (SELECT qty FROM production_consumption_totals) as qty,
           (SELECT amount FROM sales_consumption_totals) + (SELECT amount FROM production_consumption_totals) as amount
  ),

  -- Stock
  raw_batches AS (
    SELECT sb.id as batch_id, sb.batch_number, sb.receipt_date, sb.current_quantity, sb.cost_per_unit,
           sb.current_quantity * sb.cost_per_unit as total_value
    FROM storage_batches sb WHERE sb.item_id = p_product_id::TEXT AND sb.item_type = 'product'
      AND sb.status = 'active' AND sb.current_quantity > 0
  ),
  raw_stock_totals AS (SELECT COALESCE(SUM(current_quantity), 0) as qty, COALESCE(SUM(total_value), 0) as amount FROM raw_batches),
  in_preps AS (
    SELECT pb.preparation_id, p.name as preparation_name, pb.production_date::DATE as batch_date,
      pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity, 0) as product_qty,
      pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity, 0) * v_product_avg_cost as product_cost
    FROM preparation_batches pb JOIN preparations p ON p.id = pb.preparation_id
    JOIN prep_recipes pr ON pr.preparation_id = pb.preparation_id
    WHERE pb.status = 'active' AND pb.current_quantity > 0
  ),
  in_preps_totals AS (SELECT COALESCE(SUM(product_qty), 0) as qty, COALESCE(SUM(product_cost), 0) as amount FROM in_preps),
  total_loss AS (
    SELECT (SELECT qty FROM total_direct_loss) as qty, (SELECT amount FROM total_direct_loss) as amount
  )
  SELECT jsonb_build_object(
    'version', 'v2.10',
    'product', (SELECT jsonb_build_object('id', id, 'name', name, 'code', code, 'unit', base_unit, 'department', department) FROM product_info),
    'period', jsonb_build_object('dateFrom', p_start_date::DATE, 'dateTo', p_end_date::DATE, 'isSingleDay', p_start_date::DATE = p_end_date::DATE),
    'opening', jsonb_build_object('quantity', COALESCE((SELECT quantity FROM opening_snapshot), 0), 'amount', COALESCE((SELECT amount FROM opening_snapshot), 0)),
    'received', jsonb_build_object('quantity', (SELECT qty FROM received_totals), 'amount', (SELECT amount FROM received_totals),
      'totalReceiptsCount', (SELECT total_count FROM received_totals),
      'receipts', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'receiptId', receipt_id, 'receiptNumber', receipt_number, 'date', delivery_date,
        'supplierName', supplier_name, 'quantity', received_quantity, 'unitCost', unit_cost, 'totalCost', total_cost
      ) ORDER BY delivery_date DESC) FROM received_items LIMIT 5), '[]'::JSONB)),
    'sales', jsonb_build_object(
      'quantity', ROUND((SELECT qty FROM total_sales), 3),
      'amount', ROUND((SELECT amount FROM total_sales), 2),
      'direct', jsonb_build_object('quantity', ROUND((SELECT direct_qty FROM sales_by_type), 3)),
      'viaRecipes', jsonb_build_object('quantity', ROUND((SELECT via_recipes_qty FROM sales_by_type), 3)),
      'viaPreparations', jsonb_build_object('quantity', ROUND((SELECT via_preps_qty FROM sales_by_type), 3)),
      'totalMenuItemsCount', (SELECT COUNT(*) FROM all_menu_item_sales),
      'topMenuItems', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'menuItemId', menu_item_id, 'menuItemName', menu_item_name, 'variantName', variant_name,
        'quantitySold', quantity_sold, 'productUsed', ROUND(product_used, 3), 'productCost', ROUND(product_cost, 2),
        'salesType', sales_type, 'viaPreparation', CASE WHEN sales_type IN ('via_prep', 'via_recipe_prep') THEN via_name ELSE NULL END
      ) ORDER BY product_used DESC) FROM top_menu_items), '[]'::JSONB),
      'preparations', '[]'::JSONB
    ),
    'loss', jsonb_build_object('quantity', ROUND((SELECT qty FROM total_loss), 3), 'amount', ROUND((SELECT amount FROM total_loss), 2)),
    'closing', jsonb_build_object(
      'rawStock', jsonb_build_object('quantity', (SELECT qty FROM raw_stock_totals), 'amount', ROUND((SELECT amount FROM raw_stock_totals), 2),
        'batches', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'batchId', batch_id, 'batchNumber', batch_number, 'receiptDate', receipt_date,
          'quantity', current_quantity, 'costPerUnit', cost_per_unit, 'totalValue', ROUND(total_value, 2)
        ) ORDER BY receipt_date DESC) FROM raw_batches LIMIT 5), '[]'::JSONB)),
      'inPreparations', jsonb_build_object('quantity', ROUND((SELECT qty FROM in_preps_totals), 3), 'amount', ROUND((SELECT amount FROM in_preps_totals), 2),
        'preparations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'preparationId', preparation_id, 'preparationName', preparation_name, 'batchDate', batch_date,
          'productQuantity', ROUND(product_qty, 3), 'productCost', ROUND(product_cost, 2)
        ) ORDER BY product_qty DESC) FROM in_preps LIMIT 5), '[]'::JSONB)),
      'total', jsonb_build_object('quantity', ROUND((SELECT qty FROM raw_stock_totals) + (SELECT qty FROM in_preps_totals), 3),
        'amount', ROUND((SELECT amount FROM raw_stock_totals) + (SELECT amount FROM in_preps_totals), 2))
    ),
    'variance', (SELECT jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2),
        'interpretation', CASE WHEN variance_qty < -0.01 THEN 'shortage' WHEN variance_qty > 0.01 THEN 'surplus' ELSE 'balanced' END,
        'possibleReasons', CASE
          WHEN variance_qty < -0.01 THEN '["Unrecorded consumption", "Theft/loss", "Recipe errors", "Counting errors"]'::JSONB
          WHEN variance_qty > 0.01 THEN '["Unrecorded receipts", "Over-portioning", "Counting errors"]'::JSONB
          ELSE '[]'::JSONB END)
      FROM (SELECT ((SELECT qty FROM raw_stock_totals) + (SELECT qty FROM in_preps_totals))
        - (COALESCE((SELECT quantity FROM opening_snapshot), 0) + (SELECT qty FROM received_totals) - (SELECT qty FROM total_sales) - (SELECT qty FROM total_loss)) as variance_qty,
        ((SELECT amount FROM raw_stock_totals) + (SELECT amount FROM in_preps_totals))
        - (COALESCE((SELECT amount FROM opening_snapshot), 0) + (SELECT amount FROM received_totals) - (SELECT qty FROM total_sales) * v_product_avg_cost - (SELECT amount FROM total_loss)) as variance_amount) v),
    -- ACTUAL WRITE-OFFS SECTION
    'actualWriteOffs', jsonb_build_object(
      'total', jsonb_build_object(
        'quantity', ROUND((SELECT qty FROM actual_writeoffs_totals), 3),
        'amount', ROUND((SELECT amount FROM actual_writeoffs_totals), 2)
      ),
      'salesConsumption', jsonb_build_object(
        'quantity', ROUND((SELECT qty FROM sales_consumption_totals), 3),
        'amount', ROUND((SELECT amount FROM sales_consumption_totals), 2),
        'details', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'date', wo_date, 'quantity', ROUND(quantity, 3), 'amount', ROUND(amount, 2), 'notes', notes
        ) ORDER BY wo_date DESC) FROM sales_consumption_writeoffs LIMIT 10), '[]'::JSONB)
      ),
      'productionConsumption', jsonb_build_object(
        'quantity', ROUND((SELECT qty FROM production_consumption_totals), 3),
        'amount', ROUND((SELECT amount FROM production_consumption_totals), 2),
        'details', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'date', wo_date, 'quantity', ROUND(quantity, 3), 'amount', ROUND(amount, 2), 'notes', notes
        ) ORDER BY wo_date DESC) FROM production_consumption_writeoffs LIMIT 10), '[]'::JSONB)
      ),
      'corrections', jsonb_build_object(
        'quantity', ROUND((SELECT qty FROM corrections_totals), 3),
        'amount', ROUND((SELECT amount FROM corrections_totals), 2),
        'details', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'date', corr_date, 'quantity', ROUND(quantity, 3), 'amount', ROUND(amount, 2), 'notes', notes
        ) ORDER BY corr_date DESC) FROM all_corrections LIMIT 10), '[]'::JSONB)
      ),
      'differenceFromTheoretical', (
        SELECT jsonb_build_object(
          'quantity', ROUND(diff_qty, 3),
          'amount', ROUND(diff_amount, 2),
          'interpretation', CASE
            WHEN ABS(diff_qty) < 1 THEN 'matched'
            WHEN diff_qty > 0 THEN 'over_written_off'
            ELSE 'under_written_off'
          END
        )
        FROM (
          SELECT
            (SELECT qty FROM actual_writeoffs_totals) - (SELECT qty FROM total_sales) as diff_qty,
            (SELECT amount FROM actual_writeoffs_totals) - (SELECT amount FROM total_sales) as diff_amount
        ) diff
      )
    ),
    'generatedAt', NOW()
  ) INTO v_result;
  RETURN v_result;
END;
$$;
