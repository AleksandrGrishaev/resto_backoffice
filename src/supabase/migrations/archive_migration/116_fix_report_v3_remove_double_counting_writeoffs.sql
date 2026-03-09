-- Migration 116: Fix double-counting in report_v3
-- Problem: production_writeoffs were subtracted but products_from_preparations already accounts for prep consumption
-- Solution: Remove production_writeoffs from the variance formula (theoretical sales already includes prep consumption)
-- Version: v4.4
--
-- BEFORE (WRONG - double counting):
--   Expected = Opening + Received - Sales - WriteOffs - Loss + Gain
--   Where Sales includes products_from_preparations AND WriteOffs includes production_consumption
--   This subtracts prep consumption twice!
--
-- AFTER (CORRECT):
--   Expected = Opening + Received - Sales - Loss + Gain
--   Where Sales includes products_from_preparations (theoretical)
--   production_writeoffs are the ACTUAL consumption, which should match theoretical

CREATE OR REPLACE FUNCTION get_product_variance_report_v3(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_department TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_opening_date DATE;
  v_closing_date DATE;
  v_is_current_period BOOLEAN;
  v_filter_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_department IS NOT NULL AND p_department NOT IN ('kitchen', 'bar') THEN
    RAISE EXCEPTION 'Invalid department: %. Must be kitchen, bar, or NULL', p_department;
  END IF;

  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;
  v_closing_date := p_end_date::DATE;
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
  v_is_current_period := (p_end_date::DATE >= CURRENT_DATE);

  WITH
  product_info AS (
    SELECT p.id, p.name, p.code, p.base_unit,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department,
      COALESCE((SELECT AVG(sb.cost_per_unit) FROM storage_batches sb
         WHERE sb.item_id = p.id::TEXT AND sb.item_type = 'product' AND sb.status = 'active'), p.last_known_cost) as avg_cost
    FROM products p WHERE p.is_active = true
  ),
  opening_stock AS (
    SELECT inv_s.item_id, inv_s.quantity as qty, inv_s.total_cost as amount
    FROM inventory_snapshots inv_s WHERE inv_s.snapshot_date = v_opening_date
  ),
  received AS (
    SELECT sri.item_id, SUM(sri.received_quantity) as qty,
           SUM(sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost)) as amount
    FROM supplierstore_receipt_items sri JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    WHERE sr.delivery_date >= p_start_date AND sr.delivery_date < v_filter_end_date AND sr.status = 'completed'
    GROUP BY sri.item_id
  ),
  completed_orders AS (
    SELECT DISTINCT o.id as order_id FROM orders o JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed' AND pay.created_at >= p_start_date AND pay.created_at < v_filter_end_date
  ),
  order_items_data AS (
    SELECT oi.menu_item_id, oi.variant_id, oi.quantity as order_qty, oi.department
    FROM order_items oi JOIN completed_orders co ON co.order_id = oi.order_id WHERE oi.status != 'cancelled'
  ),
  variant_compositions AS (
    SELECT mi.id as menu_item_id, (v->>'id') as variant_id, (c->>'id') as composition_id,
           (c->>'type') as composition_type, (c->>'quantity')::NUMERIC as composition_qty
    FROM menu_items mi, LATERAL jsonb_array_elements(mi.variants) as v, LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),
  direct_product_sales AS (
    SELECT vc.composition_id::UUID as product_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'product' GROUP BY vc.composition_id
  ),
  recipe_product_sales AS (
    SELECT rc.component_id::UUID as product_id,
           SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)) as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'product'
    GROUP BY rc.component_id
  ),
  direct_prep_orders AS (
    SELECT vc.composition_id::UUID as preparation_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'preparation' GROUP BY vc.composition_id
  ),
  recipe_prep_orders AS (
    SELECT rc.component_id::UUID as preparation_id,
           SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)) as qty
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe' AND rc.component_type = 'preparation'
    GROUP BY rc.component_id
  ),
  all_preps AS (
    SELECT preparation_id, SUM(qty) as qty FROM (
      SELECT * FROM direct_prep_orders UNION ALL SELECT * FROM recipe_prep_orders
    ) combined GROUP BY preparation_id
  ),
  -- Recursive decomposition for nested preparations
  recursive_prep_decomposition AS (
    WITH RECURSIVE prep_tree AS (
      SELECT ap.preparation_id as root_prep_id, ap.preparation_id as current_prep_id, ap.qty::NUMERIC as consumed_qty, 1 as depth
      FROM all_preps ap
      UNION ALL
      SELECT pt.root_prep_id, pi.ingredient_id as current_prep_id,
        (pt.consumed_qty * pi.quantity / NULLIF(p.output_quantity, 0))::NUMERIC as consumed_qty, pt.depth + 1
      FROM prep_tree pt
      JOIN preparations p ON p.id = pt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'preparation' AND p.is_active = true AND pt.depth < 5
    )
    SELECT root_prep_id, current_prep_id, consumed_qty, depth FROM prep_tree
  ),
  prep_recipes AS (
    SELECT p.id as preparation_id, p.output_quantity as prep_output_quantity,
           pi.ingredient_id::TEXT as product_id, pi.quantity as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),
  products_from_preparations AS (
    SELECT pr.product_id::UUID as product_id,
           SUM(rpd.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty
    FROM recursive_prep_decomposition rpd
    JOIN prep_recipes pr ON rpd.current_prep_id = pr.preparation_id
    GROUP BY pr.product_id
  ),
  -- Theoretical sales: direct + via recipes + via preparations (all levels)
  theoretical_sales AS (
    SELECT product_id, SUM(qty) as qty FROM (
      SELECT product_id, qty FROM direct_product_sales
      UNION ALL SELECT product_id, qty FROM recipe_product_sales
      UNION ALL SELECT product_id, qty FROM products_from_preparations
    ) all_sales GROUP BY product_id
  ),
  -- Loss: expired, spoiled, other write-offs
  direct_loss AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),
  -- Corrections (negative = loss, positive = gain)
  corrections_loss AS (
    SELECT (item->>'itemId') as item_id, SUM(ABS((item->>'quantity')::NUMERIC)) as qty,
           SUM(ABS(COALESCE((item->>'totalCost')::NUMERIC, 0))) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (item->>'itemType') = 'product' AND (item->>'quantity')::NUMERIC < 0
    GROUP BY (item->>'itemId')
  ),
  corrections_gain AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (item->>'itemType') = 'product' AND (item->>'quantity')::NUMERIC > 0
    GROUP BY (item->>'itemId')
  ),
  -- Closing stock
  closing_from_batches AS (
    SELECT sb.item_id, SUM(sb.current_quantity) as qty, SUM(sb.current_quantity * sb.cost_per_unit) as amount
    FROM storage_batches sb WHERE sb.status = 'active' AND sb.item_type = 'product' AND sb.current_quantity > 0
    GROUP BY sb.item_id
  ),
  closing_from_snapshot AS (
    SELECT inv_s.item_id, inv_s.quantity as qty, inv_s.total_cost as amount
    FROM inventory_snapshots inv_s WHERE inv_s.snapshot_date = v_closing_date
  ),
  actual_closing AS (
    SELECT item_id, qty, amount FROM closing_from_batches WHERE v_is_current_period
    UNION ALL
    SELECT item_id, qty, amount FROM closing_from_snapshot WHERE NOT v_is_current_period
  ),
  -- Products in preparations (recursive)
  products_in_preps AS (
    WITH RECURSIVE prep_batch_tree AS (
      SELECT pb.preparation_id as root_prep_id, pb.preparation_id as current_prep_id,
             pb.current_quantity::NUMERIC as batch_qty, 1 as depth
      FROM preparation_batches pb WHERE pb.status = 'active' AND pb.current_quantity > 0
      UNION ALL
      SELECT pbt.root_prep_id, pi.ingredient_id as current_prep_id,
        (pbt.batch_qty * pi.quantity / NULLIF(p.output_quantity, 0))::NUMERIC as batch_qty, pbt.depth + 1
      FROM prep_batch_tree pbt
      JOIN preparations p ON p.id = pbt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'preparation' AND p.is_active = true AND pbt.depth < 5
    )
    SELECT pr.product_id as item_id,
           SUM(pbt.batch_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty,
           SUM(pbt.batch_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0) * pi.avg_cost) as amount
    FROM prep_batch_tree pbt
    JOIN prep_recipes pr ON pbt.current_prep_id = pr.preparation_id
    JOIN product_info pi ON pi.id::TEXT = pr.product_id
    GROUP BY pr.product_id
  ),
  products_with_preps AS (
    SELECT DISTINCT pi.ingredient_id::TEXT as item_id FROM preparation_ingredients pi
    JOIN preparations p ON p.id = pi.preparation_id WHERE pi.type = 'product' AND p.is_active = true
  ),
  -- FIXED: Removed production_writeoffs from formula (already included in theoretical_sales via preparations)
  product_report AS (
    SELECT
      pi.id as product_id, pi.name as product_name, pi.code as product_code,
      pi.base_unit as unit, pi.kpi_department as department, pi.avg_cost,
      COALESCE(os.qty, 0) as opening_qty, COALESCE(os.amount, 0) as opening_amount,
      COALESCE(r.qty, 0) as received_qty, COALESCE(r.amount, 0) as received_amount,
      COALESCE(ts.qty, 0) as sales_qty, COALESCE(ts.qty, 0) * pi.avg_cost as sales_amount,
      COALESCE(dl.qty, 0) + COALESCE(cl.qty, 0) as loss_qty,
      COALESCE(dl.amount, 0) + COALESCE(cl.amount, 0) as loss_amount,
      COALESCE(cg.qty, 0) as gain_qty, COALESCE(cg.amount, 0) as gain_amount,
      COALESCE(ac.qty, 0) as closing_qty, COALESCE(ac.amount, 0) as closing_amount,
      COALESCE(pip.qty, 0) as in_preps_qty, COALESCE(pip.amount, 0) as in_preps_amount,
      CASE WHEN pwp.item_id IS NOT NULL THEN true ELSE false END as has_preparations,
      -- FIXED: Expected = Opening + Received - Sales - Loss + Gain (NO production_writeoffs)
      (COALESCE(os.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(dl.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as expected_qty,
      (COALESCE(os.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(dl.amount, 0) - COALESCE(cl.amount, 0) + COALESCE(cg.amount, 0)) as expected_amount,
      COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0) as actual_qty,
      COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0) as actual_amount,
      -- FIXED: Variance = Actual - Expected (with corrected Expected)
      (COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0))
        - (COALESCE(os.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(dl.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as variance_qty,
      (COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0))
        - (COALESCE(os.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(dl.amount, 0) - COALESCE(cl.amount, 0) + COALESCE(cg.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN received r ON r.item_id = pi.id::TEXT
    LEFT JOIN theoretical_sales ts ON ts.product_id = pi.id
    LEFT JOIN direct_loss dl ON dl.item_id = pi.id::TEXT
    LEFT JOIN corrections_loss cl ON cl.item_id = pi.id::TEXT
    LEFT JOIN corrections_gain cg ON cg.item_id = pi.id::TEXT
    LEFT JOIN actual_closing ac ON ac.item_id = pi.id::TEXT
    LEFT JOIN products_in_preps pip ON pip.item_id = pi.id::TEXT
    LEFT JOIN products_with_preps pwp ON pwp.item_id = pi.id::TEXT
    WHERE (COALESCE(os.qty, 0) != 0 OR COALESCE(r.qty, 0) > 0 OR COALESCE(ts.qty, 0) > 0 OR
           COALESCE(dl.qty, 0) > 0 OR COALESCE(cl.qty, 0) > 0 OR
           COALESCE(cg.qty, 0) > 0 OR COALESCE(ac.qty, 0) != 0 OR COALESCE(pip.qty, 0) > 0)
      AND (p_department IS NULL OR pi.kpi_department = p_department)
  )
  SELECT jsonb_build_object(
    'version', 'v4.4',
    'period', jsonb_build_object('dateFrom', p_start_date::DATE, 'dateTo', p_end_date::DATE,
      'openingSnapshotDate', v_opening_date, 'closingSnapshotDate', v_closing_date,
      'closingSource', CASE WHEN v_is_current_period THEN 'batches' ELSE 'snapshot' END,
      'isSingleDay', p_start_date::DATE = p_end_date::DATE),
    'formula', 'Expected = Opening + Received - Sales - Loss + Gain; Variance = Actual - Expected',
    'summary', (SELECT jsonb_build_object(
      'totalProducts', COUNT(*), 'productsWithActivity', COUNT(*) FILTER (WHERE sales_qty > 0 OR loss_qty > 0),
      'totalSalesAmount', ROUND(COALESCE(SUM(sales_amount), 0), 2),
      'totalLossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
      'totalVarianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2)
    ) FROM product_report),
    'products', (SELECT jsonb_agg(jsonb_build_object(
      'productId', product_id, 'productName', product_name, 'productCode', product_code,
      'unit', unit, 'department', department, 'avgCost', ROUND(avg_cost, 2),
      'opening', jsonb_build_object('quantity', ROUND(opening_qty, 3), 'amount', ROUND(opening_amount, 2)),
      'received', jsonb_build_object('quantity', ROUND(received_qty, 3), 'amount', ROUND(received_amount, 2)),
      'sales', jsonb_build_object('quantity', ROUND(sales_qty, 3), 'amount', ROUND(sales_amount, 2)),
      'loss', jsonb_build_object('quantity', ROUND(loss_qty, 3), 'amount', ROUND(loss_amount, 2)),
      'closing', jsonb_build_object('quantity', ROUND(closing_qty, 3), 'amount', ROUND(closing_amount, 2)),
      'inPreps', jsonb_build_object('quantity', ROUND(in_preps_qty, 3), 'amount', ROUND(in_preps_amount, 2)),
      'variance', jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2))
    ) ORDER BY ABS(variance_amount) DESC) FROM product_report),
    'generatedAt', NOW()
  ) INTO v_result;
  RETURN v_result;
END;
$$;
