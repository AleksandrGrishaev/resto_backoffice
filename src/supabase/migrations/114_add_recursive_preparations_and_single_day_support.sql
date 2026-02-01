-- Migration: 114_add_recursive_preparations_and_single_day_support
-- Description: Add recursive preparation decomposition and fix single-day filter
-- Date: 2026-02-01
-- Author: Claude
-- Status: APPLIED TO DEV
--
-- RESULTS:
-- - Udang sales: 400g → 6,400g (16x increase from recursive preps)
-- - Single day filter now works (Feb 1 - Feb 1 returns data)
--
-- PROBLEMS FIXED:
--
-- 1. NESTED PREPARATIONS NOT HANDLED
--    Current code misses: Menu → Prep A → Prep B → Product
--    Examples:
--    - Tom yam seafood pack → Shrimp thawed 30pc → Udang
--    - Ciabatta small → Dough ciabatta → Flour, Water, etc.
--    - Dorado unfrozen → Tempung goreng → Flour, etc.
--
-- 2. SINGLE DAY FILTER BROKEN
--    If p_start_date = p_end_date = Feb 1:
--    - Filter: >= Feb 1 AND < Feb 1 = EMPTY (0 records)
--    - closing_date = opening_date = Jan 31 (wrong!)
--
-- SOLUTION:
--    - Change date semantics to INCLUSIVE end date
--    - p_end_date now means "up to and including this day"
--    - For filtering: created_at >= start AND created_at < end + 1 day
--    - Add recursive CTE to decompose nested preparations
--
-- =============================================================================

-- =============================================================================
-- FUNCTION 1: get_product_variance_report_v3 (v4.2 → v4.3)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_product_variance_report_v3(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
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

  -- NEW: Inclusive end date semantics
  -- Opening = day before start (snapshot from previous day)
  -- Closing = end date (or live if current period)
  -- Filter = start <= x < end + 1 day
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
    -- FIXED: Use v_filter_end_date for inclusive end date
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
  -- Direct preparations from menu
  direct_prep_orders AS (
    SELECT vc.composition_id::UUID as preparation_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'preparation' GROUP BY vc.composition_id
  ),
  -- Preparations from recipes
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
  -- All top-level preparation consumption
  all_preps AS (
    SELECT preparation_id, SUM(qty) as qty FROM (
      SELECT * FROM direct_prep_orders UNION ALL SELECT * FROM recipe_prep_orders
    ) combined GROUP BY preparation_id
  ),

  -- NEW: Recursive preparation decomposition
  -- Handles: Prep A → Prep B → Product (any depth)
  recursive_prep_decomposition AS (
    WITH RECURSIVE prep_tree AS (
      -- Base: top-level preparations consumed
      SELECT
        ap.preparation_id as root_prep_id,
        ap.preparation_id as current_prep_id,
        ap.qty as consumed_qty,
        1 as depth
      FROM all_preps ap

      UNION ALL

      -- Recursive: child preparations within parent
      SELECT
        pt.root_prep_id,
        pi.ingredient_id as current_prep_id,
        pt.consumed_qty * pi.quantity / NULLIF(p.output_quantity, 0) as consumed_qty,
        pt.depth + 1
      FROM prep_tree pt
      JOIN preparations p ON p.id = pt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'preparation'
        AND p.is_active = true
        AND pt.depth < 5  -- Safety limit
    )
    SELECT root_prep_id, current_prep_id, consumed_qty, depth FROM prep_tree
  ),

  -- Get products from ALL preparations (including nested)
  prep_recipes AS (
    SELECT p.id as preparation_id, p.output_quantity as prep_output_quantity,
           pi.ingredient_id::TEXT as product_id, pi.quantity as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),

  -- Calculate product consumption from all preparation levels
  products_from_preparations AS (
    SELECT pr.product_id::UUID as product_id,
           SUM(rpd.consumed_qty * pr.recipe_product_qty / NULLIF(pr.prep_output_quantity, 0)) as qty
    FROM recursive_prep_decomposition rpd
    JOIN prep_recipes pr ON rpd.current_prep_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  theoretical_sales AS (
    SELECT product_id, SUM(qty) as qty FROM (
      SELECT product_id, qty FROM direct_product_sales
      UNION ALL SELECT product_id, qty FROM recipe_product_sales
      UNION ALL SELECT product_id, qty FROM products_from_preparations
    ) all_sales GROUP BY product_id
  ),
  production_writeoffs AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') = 'production_consumption'
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),
  direct_loss AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),
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

  -- Products in preparations (current stock) - also needs recursive decomposition
  products_in_preps AS (
    WITH RECURSIVE prep_batch_tree AS (
      -- Base: active preparation batches
      SELECT
        pb.preparation_id as root_prep_id,
        pb.preparation_id as current_prep_id,
        pb.current_quantity as batch_qty,
        1 as depth
      FROM preparation_batches pb
      WHERE pb.status = 'active' AND pb.current_quantity > 0

      UNION ALL

      -- Recursive: nested preparations
      SELECT
        pbt.root_prep_id,
        pi.ingredient_id as current_prep_id,
        pbt.batch_qty * pi.quantity / NULLIF(p.output_quantity, 0) as batch_qty,
        pbt.depth + 1
      FROM prep_batch_tree pbt
      JOIN preparations p ON p.id = pbt.current_prep_id
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.type = 'preparation'
        AND p.is_active = true
        AND pbt.depth < 5
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
  product_report AS (
    SELECT
      pi.id as product_id, pi.name as product_name, pi.code as product_code,
      pi.base_unit as unit, pi.kpi_department as department, pi.avg_cost,
      COALESCE(os.qty, 0) as opening_qty, COALESCE(os.amount, 0) as opening_amount,
      COALESCE(r.qty, 0) as received_qty, COALESCE(r.amount, 0) as received_amount,
      COALESCE(ts.qty, 0) as sales_qty, COALESCE(ts.qty, 0) * pi.avg_cost as sales_amount,
      COALESCE(pw.qty, 0) as writeoff_qty, COALESCE(pw.amount, 0) as writeoff_amount,
      COALESCE(dl.qty, 0) + COALESCE(cl.qty, 0) as loss_qty,
      COALESCE(dl.amount, 0) + COALESCE(cl.amount, 0) as loss_amount,
      COALESCE(cg.qty, 0) as gain_qty, COALESCE(cg.amount, 0) as gain_amount,
      COALESCE(ac.qty, 0) as closing_qty, COALESCE(ac.amount, 0) as closing_amount,
      COALESCE(pip.qty, 0) as in_preps_qty, COALESCE(pip.amount, 0) as in_preps_amount,
      CASE WHEN pwp.item_id IS NOT NULL THEN true ELSE false END as has_preparations,
      (COALESCE(os.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0) - COALESCE(pw.qty, 0)
        - COALESCE(dl.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as expected_qty,
      (COALESCE(os.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost - COALESCE(pw.amount, 0)
        - COALESCE(dl.amount, 0) - COALESCE(cl.amount, 0) + COALESCE(cg.amount, 0)) as expected_amount,
      COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0) as actual_qty,
      COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0) as actual_amount,
      (COALESCE(ac.qty, 0) + COALESCE(pip.qty, 0))
        - (COALESCE(os.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0) - COALESCE(pw.qty, 0)
        - COALESCE(dl.qty, 0) - COALESCE(cl.qty, 0) + COALESCE(cg.qty, 0)) as variance_qty,
      (COALESCE(ac.amount, 0) + COALESCE(pip.amount, 0))
        - (COALESCE(os.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost - COALESCE(pw.amount, 0)
        - COALESCE(dl.amount, 0) - COALESCE(cl.amount, 0) + COALESCE(cg.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN received r ON r.item_id = pi.id::TEXT
    LEFT JOIN theoretical_sales ts ON ts.product_id = pi.id
    LEFT JOIN production_writeoffs pw ON pw.item_id = pi.id::TEXT
    LEFT JOIN direct_loss dl ON dl.item_id = pi.id::TEXT
    LEFT JOIN corrections_loss cl ON cl.item_id = pi.id::TEXT
    LEFT JOIN corrections_gain cg ON cg.item_id = pi.id::TEXT
    LEFT JOIN actual_closing ac ON ac.item_id = pi.id::TEXT
    LEFT JOIN products_in_preps pip ON pip.item_id = pi.id::TEXT
    LEFT JOIN products_with_preps pwp ON pwp.item_id = pi.id::TEXT
    WHERE (COALESCE(os.qty, 0) != 0 OR COALESCE(r.qty, 0) > 0 OR COALESCE(ts.qty, 0) > 0 OR
           COALESCE(pw.qty, 0) > 0 OR COALESCE(dl.qty, 0) > 0 OR COALESCE(cl.qty, 0) > 0 OR
           COALESCE(cg.qty, 0) > 0 OR COALESCE(ac.qty, 0) != 0 OR COALESCE(pip.qty, 0) > 0)
      AND (p_department IS NULL OR pi.kpi_department = p_department)
  )
  SELECT jsonb_build_object(
    'version', 'v4.3',
    'period', jsonb_build_object(
      'dateFrom', p_start_date::DATE,
      'dateTo', p_end_date::DATE,
      'openingSnapshotDate', v_opening_date,
      'closingSnapshotDate', v_closing_date,
      'closingSource', CASE WHEN v_is_current_period THEN 'batches' ELSE 'snapshot' END,
      'isSingleDay', p_start_date::DATE = p_end_date::DATE
    ),
    'formula', 'Expected = Opening + Received - Sales - WriteOffs - Loss + Gain; Variance = Actual - Expected',
    'summary', (SELECT jsonb_build_object(
      'totalProducts', COUNT(*), 'productsWithActivity', COUNT(*) FILTER (WHERE sales_qty > 0 OR loss_qty > 0),
      'totalTheoreticalSalesAmount', ROUND(COALESCE(SUM(sales_amount), 0), 2),
      'totalSalesAmount', ROUND(COALESCE(SUM(sales_amount), 0), 2),
      'totalLossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
      'totalGainAmount', ROUND(COALESCE(SUM(gain_amount), 0), 2),
      'totalInPrepsAmount', ROUND(COALESCE(SUM(in_preps_amount), 0), 2),
      'totalVarianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
      'overallLossPercent', CASE WHEN SUM(sales_amount) > 0 THEN ROUND((SUM(loss_amount) / SUM(sales_amount)) * 100, 2) ELSE 0 END
    ) FROM product_report),
    'byDepartment', (SELECT jsonb_object_agg(department, dept_data) FROM (
      SELECT department, jsonb_build_object(
        'productsCount', COUNT(*),
        'theoreticalSalesAmount', ROUND(COALESCE(SUM(sales_amount), 0), 2),
        'salesAmount', ROUND(COALESCE(SUM(sales_amount), 0), 2),
        'lossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
        'gainAmount', ROUND(COALESCE(SUM(gain_amount), 0), 2),
        'inPrepsAmount', ROUND(COALESCE(SUM(in_preps_amount), 0), 2),
        'varianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
        'lossPercent', CASE WHEN SUM(sales_amount) > 0 THEN ROUND((SUM(loss_amount) / SUM(sales_amount)) * 100, 2) ELSE 0 END
      ) as dept_data FROM product_report GROUP BY department
    ) dept_agg),
    'products', (SELECT jsonb_agg(jsonb_build_object(
      'productId', product_id, 'productName', product_name, 'productCode', product_code,
      'unit', unit, 'department', department, 'avgCost', ROUND(avg_cost, 2),
      'opening', jsonb_build_object('quantity', ROUND(opening_qty, 3), 'amount', ROUND(opening_amount, 2)),
      'received', jsonb_build_object('quantity', ROUND(received_qty, 3), 'amount', ROUND(received_amount, 2)),
      'sales', jsonb_build_object('quantity', ROUND(sales_qty, 3), 'amount', ROUND(sales_amount, 2)),
      'writeoffs', jsonb_build_object('quantity', ROUND(writeoff_qty, 3), 'amount', ROUND(writeoff_amount, 2)),
      'salesWriteoffDiff', jsonb_build_object('quantity', ROUND(sales_qty - writeoff_qty, 3), 'amount', ROUND(sales_amount - writeoff_amount, 2)),
      'loss', jsonb_build_object('quantity', ROUND(loss_qty, 3), 'amount', ROUND(loss_amount, 2)),
      'tracedLoss', jsonb_build_object('quantity', 0, 'amount', 0),
      'gain', jsonb_build_object('quantity', ROUND(gain_qty, 3), 'amount', ROUND(gain_amount, 2)),
      'expected', jsonb_build_object('quantity', ROUND(expected_qty, 3), 'amount', ROUND(expected_amount, 2)),
      'actual', jsonb_build_object('quantity', ROUND(actual_qty, 3), 'amount', ROUND(actual_amount, 2)),
      'closing', jsonb_build_object('quantity', ROUND(closing_qty, 3), 'amount', ROUND(closing_amount, 2)),
      'inPreps', jsonb_build_object('quantity', ROUND(in_preps_qty, 3), 'amount', ROUND(in_preps_amount, 2)),
      'hasPreparations', has_preparations,
      'variance', jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2)),
      'lossPercent', CASE WHEN sales_qty > 0 THEN ROUND((loss_qty / sales_qty) * 100, 2) ELSE 0 END
    ) ORDER BY ABS(variance_amount) DESC) FROM product_report),
    'generatedAt', NOW()
  ) INTO v_result;
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_product_variance_report_v3(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) IS
'Product Variance Report V4.3 - Added recursive preparation decomposition and single-day support';


-- =============================================================================
-- FUNCTION 2: get_product_variance_details_v2 (v2.6 → v2.7)
-- =============================================================================

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
  v_filter_end_date TIMESTAMPTZ;
BEGIN
  -- NEW: Inclusive end date semantics
  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;
  v_filter_end_date := (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ;

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
    WHERE sri.item_id = p_product_id::TEXT AND sr.delivery_date >= p_start_date AND sr.delivery_date < v_filter_end_date AND sr.status = 'completed'
    ORDER BY sr.delivery_date DESC
  ),

  received_totals AS (
    SELECT COALESCE(SUM(received_quantity), 0) as qty, COALESCE(SUM(total_cost), 0) as amount, COUNT(*) as total_count FROM received_items
  ),

  completed_orders AS (
    -- FIXED: Use v_filter_end_date
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

  -- Path 1: Menu → Product (direct product in composition)
  direct_product_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty) as product_used, 'direct' as sales_type, NULL::TEXT as via_preparation
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'product' AND vc.composition_id::UUID = p_product_id
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name
  ),

  -- Path 2: Menu → Recipe → Product (product directly in recipe)
  recipe_product_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0)) as product_used,
      'via_recipe' as sales_type, r.name as via_recipe
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN recipes r ON r.id = vc.composition_id::UUID
    JOIN recipe_components rc ON rc.recipe_id = r.id
    WHERE vc.composition_type = 'recipe'
      AND rc.component_type = 'product'
      AND rc.component_id::UUID = p_product_id
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, r.name
  ),

  -- NEW: Recursive preparation tree for this specific product
  -- Find all preparations that contain this product (directly or nested)
  prep_recipes AS (
    WITH RECURSIVE prep_product_tree AS (
      -- Base: preparations directly containing this product
      SELECT
        p.id as leaf_prep_id,
        p.id as current_prep_id,
        p.name as leaf_prep_name,
        p.output_quantity as leaf_output_qty,
        pi.quantity as product_qty_per_batch,
        1 as depth,
        ARRAY[p.id] as path
      FROM preparations p
      JOIN preparation_ingredients pi ON pi.preparation_id = p.id
      WHERE pi.ingredient_id = p_product_id
        AND pi.type = 'product'
        AND p.is_active = true

      UNION ALL

      -- Recursive: find parent preparations that contain child preparations
      SELECT
        ppt.leaf_prep_id,
        parent_p.id as current_prep_id,
        ppt.leaf_prep_name,
        ppt.leaf_output_qty,
        ppt.product_qty_per_batch * parent_pi.quantity / NULLIF(child_p.output_quantity, 0) as product_qty_per_batch,
        ppt.depth + 1,
        ppt.path || parent_p.id
      FROM prep_product_tree ppt
      JOIN preparations child_p ON child_p.id = ppt.current_prep_id
      JOIN preparation_ingredients parent_pi ON parent_pi.ingredient_id = child_p.id AND parent_pi.type = 'preparation'
      JOIN preparations parent_p ON parent_p.id = parent_pi.preparation_id
      WHERE parent_p.is_active = true
        AND ppt.depth < 5
        AND NOT parent_p.id = ANY(ppt.path)  -- Prevent cycles
    )
    SELECT DISTINCT ON (current_prep_id)
      current_prep_id as preparation_id,
      leaf_prep_name as preparation_name,
      (SELECT output_quantity FROM preparations WHERE id = current_prep_id) as output_quantity,
      product_qty_per_batch
    FROM prep_product_tree
    ORDER BY current_prep_id, depth DESC
  ),

  -- Path 3: Menu → Preparation → ... → Product (via any preparation chain)
  prep_direct_menu_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) as product_used,
      'via_prep' as sales_type, pr.preparation_name as via_preparation
    FROM order_items_data oid
    JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    JOIN prep_recipes pr ON pr.preparation_id = vc.composition_id::UUID
    WHERE vc.composition_type = 'preparation'
    GROUP BY vc.menu_item_id, vc.menu_item_name, vc.variant_name, pr.preparation_name
  ),

  -- Path 4: Menu → Recipe → Preparation → ... → Product
  prep_recipe_menu_sales AS (
    SELECT vc.menu_item_id, vc.menu_item_name, vc.variant_name, SUM(oid.order_qty) as quantity_sold,
      SUM(oid.order_qty * vc.composition_qty * rc.quantity / NULLIF(r.portion_size, 0) * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) as product_used,
      'via_recipe_prep' as sales_type, pr.preparation_name as via_preparation
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
      SUM(apc.qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) as product_qty,
      SUM(apc.qty * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) * v_product_avg_cost as product_cost
    FROM all_preps_consumed apc JOIN prep_recipes pr ON pr.preparation_id = apc.preparation_id
    GROUP BY pr.preparation_id, pr.preparation_name
  ),

  -- All 4 sales paths combined
  all_menu_item_sales AS (
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type,
           via_preparation as preparation_name
    FROM direct_product_sales
    UNION ALL
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type,
           via_recipe as preparation_name
    FROM recipe_product_sales
    UNION ALL
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type,
           via_preparation as preparation_name
    FROM prep_direct_menu_sales
    UNION ALL
    SELECT menu_item_id, menu_item_name, variant_name, quantity_sold, product_used, sales_type,
           via_preparation as preparation_name
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

  total_recipe_direct_sales AS (
    SELECT COALESCE(SUM(product_used), 0) as qty,
           COALESCE(SUM(product_used), 0) * v_product_avg_cost as amount
    FROM recipe_product_sales
  ),

  -- Loss section: write-offs (expired, spoiled, other)
  direct_losses AS (
    SELECT so.operation_date::DATE as loss_date, so.write_off_details->>'reason' as reason,
      (item->>'quantity')::NUMERIC as quantity, COALESCE((item->>'totalCost')::NUMERIC, 0) as amount,
      item->>'batchNumber' as batch_number, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemId')::UUID = p_product_id
    ORDER BY so.operation_date DESC
  ),

  inventory_corrections AS (
    SELECT so.operation_date::DATE as loss_date,
      'inventory_adjustment' as reason,
      (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount,
      NULL::TEXT as batch_number,
      so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction'
      AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
      AND so.status = 'confirmed'
      AND (item->>'itemId')::UUID = p_product_id
    ORDER BY so.operation_date DESC
  ),

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
      SUM((item->>'quantity')::NUMERIC * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) as product_qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0) * pr.product_qty_per_batch / NULLIF(pr.output_quantity, 0)) as product_cost
    FROM preparation_operations po, LATERAL jsonb_array_elements(po.items) AS item
    JOIN prep_recipes pr ON pr.preparation_id = (item->>'preparationId')::UUID
    WHERE po.operation_type = 'write_off' AND po.operation_date >= p_start_date AND po.operation_date < v_filter_end_date
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
      pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity, 0) as product_qty,
      pb.current_quantity * pr.product_qty_per_batch / NULLIF(p.output_quantity, 0) * v_product_avg_cost as product_cost
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

  sales_consumption_writeoffs AS (
    SELECT so.operation_date::DATE as wo_date, (item->>'quantity')::NUMERIC as quantity,
      COALESCE((item->>'totalCost')::NUMERIC, 0) as amount, so.notes
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
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
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
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
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < v_filter_end_date
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
    'version', 'v2.7',
    'product', (SELECT jsonb_build_object('id', id, 'name', name, 'code', code, 'unit', base_unit, 'department', department) FROM product_info),
    'period', jsonb_build_object(
      'dateFrom', p_start_date::DATE,
      'dateTo', p_end_date::DATE,
      'isSingleDay', p_start_date::DATE = p_end_date::DATE
    ),
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
      'viaRecipes', jsonb_build_object('quantity', ROUND((SELECT qty FROM total_recipe_direct_sales), 3),
        'amount', ROUND((SELECT amount FROM total_recipe_direct_sales), 2)),
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
        SELECT ((SELECT qty FROM raw_stock_totals) + (SELECT qty FROM in_preps_totals))
               - (COALESCE((SELECT quantity FROM opening_snapshot), 0) + (SELECT qty FROM received_totals) - (SELECT qty FROM total_sales) - (SELECT qty FROM total_loss)) as variance_qty,
               ((SELECT amount FROM raw_stock_totals) + (SELECT amount FROM in_preps_totals))
               - (COALESCE((SELECT amount FROM opening_snapshot), 0) + (SELECT amount FROM received_totals) - (SELECT qty FROM total_sales) * v_product_avg_cost - (SELECT amount FROM total_loss)) as variance_amount
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

COMMENT ON FUNCTION get_product_variance_details_v2(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Product Variance Detail V2.7 - Added recursive preparation decomposition and single-day support';
