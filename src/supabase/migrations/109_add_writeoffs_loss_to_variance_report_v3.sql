-- Migration: 109_add_writeoffs_loss_to_variance_report_v3
-- Description: Add production_consumption to writeoffs and inventory_corrections to loss
-- Date: 2026-01-28
-- Version: v3.5
--
-- PROBLEM:
-- The variance report table shows empty Write-offs and Loss columns
-- - Write-offs only counted sales_consumption, not production_consumption
-- - Loss only counted expired/spoiled/other, not inventory corrections
--
-- SOLUTION:
-- 1. Add inventory_corrections CTE for operation_type = 'correction'
-- 2. Include corrections in loss calculation (both + and -)
-- 3. Add production_consumption to writeoffs
-- 4. Update variance formula to account for all losses

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
BEGIN
  IF p_department IS NOT NULL AND p_department NOT IN ('kitchen', 'bar') THEN
    RAISE EXCEPTION 'Invalid department: %. Must be kitchen, bar, or NULL', p_department;
  END IF;

  v_opening_date := (p_start_date::DATE - INTERVAL '1 day')::DATE;

  WITH
  -- 1. Get all active products
  product_info AS (
    SELECT
      p.id, p.name, p.code, p.base_unit,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department,
      COALESCE(
        (SELECT AVG(sb.cost_per_unit) FROM storage_batches sb
         WHERE sb.item_id = p.id::TEXT AND sb.item_type = 'product' AND sb.status = 'active'),
        p.last_known_cost
      ) as avg_cost
    FROM products p WHERE p.is_active = true
  ),

  -- 2. Get paid orders
  completed_orders AS (
    SELECT DISTINCT o.id as order_id FROM orders o JOIN payments pay ON pay.order_id = o.id
    WHERE pay.status = 'completed' AND pay.created_at >= p_start_date AND pay.created_at < p_end_date
  ),

  -- 3. Order items
  order_items_data AS (
    SELECT oi.menu_item_id, oi.variant_id, oi.quantity as order_qty, oi.department
    FROM order_items oi JOIN completed_orders co ON co.order_id = oi.order_id WHERE oi.status != 'cancelled'
  ),

  -- 4. Variant compositions
  variant_compositions AS (
    SELECT mi.id as menu_item_id, (v->>'id') as variant_id, (c->>'id') as composition_id,
           (c->>'type') as composition_type, (c->>'quantity')::NUMERIC as composition_qty, (c->>'unit') as composition_unit
    FROM menu_items mi, LATERAL jsonb_array_elements(mi.variants) as v, LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),

  -- 5. Direct product sales
  direct_product_sales AS (
    SELECT vc.composition_id::UUID as product_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'product' GROUP BY vc.composition_id
  ),

  -- 6. Recipe product sales
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

  -- 7. Direct prep orders
  direct_prep_orders AS (
    SELECT vc.composition_id::UUID as preparation_id, SUM(oid.order_qty * vc.composition_qty) as qty
    FROM order_items_data oid JOIN variant_compositions vc ON vc.menu_item_id = oid.menu_item_id AND vc.variant_id = oid.variant_id
    WHERE vc.composition_type = 'preparation' GROUP BY vc.composition_id
  ),

  -- 8. Recipe prep orders
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

  -- 9. All prep orders
  all_preps AS (
    SELECT preparation_id, SUM(qty) as qty FROM (
      SELECT * FROM direct_prep_orders UNION ALL SELECT * FROM recipe_prep_orders
    ) combined GROUP BY preparation_id
  ),

  -- 10. Prep recipes
  prep_recipes AS (
    SELECT p.id as preparation_id, p.portion_size as prep_portion_size, p.portion_type,
           pi.ingredient_id as product_id, pi.quantity as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),

  -- 11. Products from preparations (FIXED: portion-type uses prep_qty directly)
  products_from_preparations AS (
    SELECT pr.product_id,
           SUM(CASE WHEN pr.portion_type = 'portion' THEN ap.qty * pr.recipe_product_qty
                    ELSE ap.qty * pr.recipe_product_qty / NULLIF(pr.prep_portion_size, 0) END) as qty
    FROM all_preps ap JOIN prep_recipes pr ON ap.preparation_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- 12. Theoretical sales
  theoretical_sales AS (
    SELECT product_id, SUM(qty) as qty FROM (
      SELECT product_id, qty FROM direct_product_sales
      UNION ALL SELECT product_id, qty FROM recipe_product_sales
      UNION ALL SELECT product_id, qty FROM products_from_preparations
    ) all_sales GROUP BY product_id
  ),

  -- 13. Opening stock
  opening_stock AS (
    SELECT inv_s.item_id, inv_s.quantity as qty, inv_s.total_cost as amount
    FROM inventory_snapshots inv_s WHERE inv_s.snapshot_date = v_opening_date
  ),

  -- 14. Received
  received AS (
    SELECT sri.item_id, SUM(sri.received_quantity) as qty,
           SUM(sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost)) as amount
    FROM supplierstore_receipt_items sri JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    WHERE sr.delivery_date >= p_start_date AND sr.delivery_date < p_end_date AND sr.status = 'completed'
    GROUP BY sri.item_id
  ),

  -- 15. Direct sales write-offs (sales_consumption)
  direct_sales_writeoffs AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),

  -- 16. Production consumption write-offs (production_consumption)
  production_consumption AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') = 'production_consumption'
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),

  -- 17. Direct loss (expired, spoiled, other)
  direct_loss AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),

  -- 18. Inventory corrections (NEW!)
  inventory_corrections AS (
    SELECT (item->>'itemId') as item_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so, LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'correction' AND so.operation_date >= p_start_date AND so.operation_date < p_end_date
      AND so.status = 'confirmed' AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),

  -- 19. Prep recipes for traced calculations
  prep_recipes_for_traced AS (
    SELECT p.id as preparation_id, p.portion_size as prep_portion_size,
           pi.ingredient_id as product_id, pi.quantity as recipe_product_qty
    FROM preparations p JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product' AND p.is_active = true
  ),

  -- 20. Prep sales (from preparation_operations)
  prep_sales AS (
    SELECT (item->>'preparationId')::UUID as preparation_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as cost
    FROM preparation_operations po, LATERAL jsonb_array_elements(po.items) AS item
    WHERE po.operation_type = 'write_off' AND po.operation_date >= p_start_date AND po.operation_date < p_end_date
      AND po.status = 'confirmed' AND (po.write_off_details->>'reason') = 'sales_consumption'
    GROUP BY (item->>'preparationId')::UUID
  ),

  -- 21. Traced sales writeoffs
  traced_sales_writeoffs AS (
    SELECT pr.product_id::TEXT as item_id,
           SUM(CASE WHEN pr.prep_portion_size > 0 THEN (ps.qty / pr.prep_portion_size) * pr.recipe_product_qty ELSE 0 END) as qty,
           SUM(CASE WHEN ps.qty > 0 THEN (ps.cost / ps.qty) *
               CASE WHEN pr.prep_portion_size > 0 THEN (ps.qty / pr.prep_portion_size) * pr.recipe_product_qty ELSE 0 END ELSE 0 END) as amount
    FROM prep_sales ps JOIN prep_recipes_for_traced pr ON ps.preparation_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- 22. Prep losses (from preparation_operations)
  prep_losses AS (
    SELECT (item->>'preparationId')::UUID as preparation_id, SUM((item->>'quantity')::NUMERIC) as qty,
           SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as cost
    FROM preparation_operations po, LATERAL jsonb_array_elements(po.items) AS item
    WHERE po.operation_type = 'write_off' AND po.operation_date >= p_start_date AND po.operation_date < p_end_date
      AND po.status = 'confirmed' AND (po.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
    GROUP BY (item->>'preparationId')::UUID
  ),

  -- 23. Traced losses
  traced_losses AS (
    SELECT pr.product_id::TEXT as item_id,
           SUM(CASE WHEN pr.prep_portion_size > 0 THEN (pl.qty / pr.prep_portion_size) * pr.recipe_product_qty ELSE 0 END) as qty,
           SUM(CASE WHEN pl.qty > 0 THEN (pl.cost / pl.qty) *
               CASE WHEN pr.prep_portion_size > 0 THEN (pl.qty / pr.prep_portion_size) * pr.recipe_product_qty ELSE 0 END ELSE 0 END) as amount
    FROM prep_losses pl JOIN prep_recipes_for_traced pr ON pl.preparation_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- 24. Closing stock
  closing_stock AS (
    SELECT sb.item_id, SUM(sb.current_quantity) as qty, SUM(sb.current_quantity * sb.cost_per_unit) as amount
    FROM storage_batches sb WHERE sb.status = 'active' AND sb.item_type = 'product' AND sb.current_quantity > 0
    GROUP BY sb.item_id
  ),

  -- 25. Products with preps flag
  products_with_preps AS (
    SELECT DISTINCT pi.ingredient_id as item_id FROM preparation_ingredients pi
    JOIN preparations p ON p.id = pi.preparation_id WHERE pi.type = 'product' AND p.is_active = true
  ),

  -- 26. Products in active preps
  products_in_active_preps AS (
    SELECT pr.product_id::TEXT as item_id,
           SUM(CASE WHEN pr.portion_type = 'portion' THEN pb.current_quantity * pr.recipe_product_qty / NULLIF(pr.prep_portion_size, 0)
                    ELSE pb.current_quantity * pr.recipe_product_qty / NULLIF(pr.prep_portion_size, 0) END) as qty,
           SUM(CASE WHEN pr.portion_type = 'portion' THEN pb.current_quantity * pr.recipe_product_qty / NULLIF(pr.prep_portion_size, 0) * pi.avg_cost
                    ELSE pb.current_quantity * pr.recipe_product_qty / NULLIF(pr.prep_portion_size, 0) * pi.avg_cost END) as amount
    FROM preparation_batches pb
    JOIN prep_recipes pr ON pb.preparation_id = pr.preparation_id
    JOIN product_info pi ON pi.id = pr.product_id
    WHERE pb.status = 'active' AND pb.current_quantity > 0
    GROUP BY pr.product_id
  ),

  -- 27. Final aggregation
  product_report AS (
    SELECT
      pi.id as product_id, pi.name as product_name, pi.code as product_code,
      pi.base_unit as unit, pi.kpi_department as department, pi.avg_cost,
      COALESCE(os.qty, 0) as opening_qty, COALESCE(os.amount, 0) as opening_amount,
      COALESCE(r.qty, 0) as received_qty, COALESCE(r.amount, 0) as received_amount,
      COALESCE(ts.qty, 0) as theoretical_sales_qty, COALESCE(ts.qty, 0) * pi.avg_cost as theoretical_sales_amount,
      -- Write-offs = sales_consumption + production_consumption
      COALESCE(dsw.qty, 0) + COALESCE(tsw.qty, 0) + COALESCE(pc.qty, 0) as writeoff_qty,
      COALESCE(dsw.amount, 0) + COALESCE(tsw.amount, 0) + COALESCE(pc.amount, 0) as writeoff_amount,
      COALESCE(dsw.qty, 0) as direct_writeoff_qty, COALESCE(dsw.amount, 0) as direct_writeoff_amount,
      COALESCE(tsw.qty, 0) as traced_writeoff_qty, COALESCE(tsw.amount, 0) as traced_writeoff_amount,
      COALESCE(pc.qty, 0) as production_writeoff_qty, COALESCE(pc.amount, 0) as production_writeoff_amount,
      -- Loss = expired/spoiled/other + inventory_corrections
      COALESCE(dl.qty, 0) + COALESCE(tl.qty, 0) + COALESCE(ic.qty, 0) as loss_qty,
      COALESCE(dl.amount, 0) + COALESCE(tl.amount, 0) + COALESCE(ic.amount, 0) as loss_amount,
      COALESCE(dl.qty, 0) as direct_loss_qty, COALESCE(dl.amount, 0) as direct_loss_amount,
      COALESCE(tl.qty, 0) as traced_loss_qty, COALESCE(tl.amount, 0) as traced_loss_amount,
      COALESCE(ic.qty, 0) as correction_qty, COALESCE(ic.amount, 0) as correction_amount,
      COALESCE(cs.qty, 0) as closing_qty, COALESCE(cs.amount, 0) as closing_amount,
      COALESCE(pip.qty, 0) as in_preps_qty, COALESCE(pip.amount, 0) as in_preps_amount,
      CASE WHEN pwp.item_id IS NOT NULL THEN true ELSE false END as has_preparations,
      -- VARIANCE: Opening + Received - Sales - Loss - (Stock + InPreps)
      (COALESCE(os.qty, 0) + COALESCE(r.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(dl.qty, 0) - COALESCE(tl.qty, 0) - COALESCE(ic.qty, 0)
        - COALESCE(cs.qty, 0) - COALESCE(pip.qty, 0)) as variance_qty,
      (COALESCE(os.amount, 0) + COALESCE(r.amount, 0) - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(dl.amount, 0) - COALESCE(tl.amount, 0) - COALESCE(ic.amount, 0)
        - COALESCE(cs.amount, 0) - COALESCE(pip.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN received r ON r.item_id = pi.id::TEXT
    LEFT JOIN theoretical_sales ts ON ts.product_id = pi.id
    LEFT JOIN direct_sales_writeoffs dsw ON dsw.item_id = pi.id::TEXT
    LEFT JOIN traced_sales_writeoffs tsw ON tsw.item_id = pi.id::TEXT
    LEFT JOIN production_consumption pc ON pc.item_id = pi.id::TEXT
    LEFT JOIN direct_loss dl ON dl.item_id = pi.id::TEXT
    LEFT JOIN traced_losses tl ON tl.item_id = pi.id::TEXT
    LEFT JOIN inventory_corrections ic ON ic.item_id = pi.id::TEXT
    LEFT JOIN closing_stock cs ON cs.item_id = pi.id::TEXT
    LEFT JOIN products_in_active_preps pip ON pip.item_id = pi.id::TEXT
    LEFT JOIN products_with_preps pwp ON pwp.item_id = pi.id::TEXT
    WHERE (COALESCE(os.qty, 0) > 0 OR COALESCE(r.qty, 0) > 0 OR COALESCE(ts.qty, 0) > 0 OR
           COALESCE(dsw.qty, 0) > 0 OR COALESCE(tsw.qty, 0) > 0 OR COALESCE(pc.qty, 0) > 0 OR
           COALESCE(dl.qty, 0) > 0 OR COALESCE(tl.qty, 0) > 0 OR COALESCE(ic.qty, 0) > 0 OR
           COALESCE(cs.qty, 0) > 0 OR COALESCE(pip.qty, 0) > 0)
      AND (p_department IS NULL OR pi.kpi_department = p_department)
  )

  SELECT jsonb_build_object(
    'period', jsonb_build_object('dateFrom', p_start_date::DATE, 'dateTo', p_end_date::DATE, 'openingSnapshotDate', v_opening_date),
    'summary', (SELECT jsonb_build_object(
      'totalProducts', COUNT(*),
      'productsWithActivity', COUNT(*) FILTER (WHERE theoretical_sales_qty > 0 OR loss_qty > 0 OR writeoff_qty > 0),
      'totalTheoreticalSalesAmount', ROUND(COALESCE(SUM(theoretical_sales_amount), 0), 2),
      'totalWriteoffAmount', ROUND(COALESCE(SUM(writeoff_amount), 0), 2),
      'totalLossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
      'totalInPrepsAmount', ROUND(COALESCE(SUM(in_preps_amount), 0), 2),
      'totalVariance', ROUND(COALESCE(SUM(variance_amount), 0), 2),
      'overallLossPercent', ROUND(CASE WHEN COALESCE(SUM(theoretical_sales_amount), 0) > 0
        THEN (COALESCE(SUM(loss_amount), 0) / COALESCE(SUM(theoretical_sales_amount), 0)) * 100 ELSE 0 END, 2)
    ) FROM product_report),
    'byDepartment', (SELECT jsonb_object_agg(department, dept_summary) FROM (
      SELECT department, jsonb_build_object(
        'productsCount', COUNT(*),
        'theoreticalSalesAmount', ROUND(COALESCE(SUM(theoretical_sales_amount), 0), 2),
        'writeoffAmount', ROUND(COALESCE(SUM(writeoff_amount), 0), 2),
        'lossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
        'varianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
        'lossPercent', ROUND(CASE WHEN COALESCE(SUM(theoretical_sales_amount), 0) > 0
          THEN (COALESCE(SUM(loss_amount), 0) / COALESCE(SUM(theoretical_sales_amount), 0)) * 100 ELSE 0 END, 2)
      ) as dept_summary FROM product_report GROUP BY department
    ) dept),
    'products', (SELECT jsonb_agg(jsonb_build_object(
      'productId', product_id, 'productName', product_name, 'productCode', product_code,
      'unit', unit, 'department', department, 'avgCost', ROUND(avg_cost, 2),
      'opening', jsonb_build_object('quantity', ROUND(opening_qty, 3), 'amount', ROUND(opening_amount, 2)),
      'received', jsonb_build_object('quantity', ROUND(received_qty, 3), 'amount', ROUND(received_amount, 2)),
      'theoreticalSales', jsonb_build_object('quantity', ROUND(theoretical_sales_qty, 3), 'amount', ROUND(theoretical_sales_amount, 2)),
      'writeoffs', jsonb_build_object('quantity', ROUND(writeoff_qty, 3), 'amount', ROUND(writeoff_amount, 2)),
      'productionWriteoffs', jsonb_build_object('quantity', ROUND(production_writeoff_qty, 3), 'amount', ROUND(production_writeoff_amount, 2)),
      'loss', jsonb_build_object('quantity', ROUND(loss_qty, 3), 'amount', ROUND(loss_amount, 2)),
      'corrections', jsonb_build_object('quantity', ROUND(correction_qty, 3), 'amount', ROUND(correction_amount, 2)),
      'closingStock', jsonb_build_object('quantity', ROUND(closing_qty, 3), 'amount', ROUND(closing_amount, 2)),
      'inPreps', jsonb_build_object('quantity', ROUND(in_preps_qty, 3), 'amount', ROUND(in_preps_amount, 2)),
      'hasPreparations', has_preparations,
      'variance', jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2)),
      'lossPercent', CASE WHEN theoretical_sales_amount > 0 THEN ROUND((loss_amount / theoretical_sales_amount) * 100, 2) ELSE NULL END
    ) ORDER BY ABS(variance_amount) DESC) FROM product_report),
    'generatedAt', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_product_variance_report_v3(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) IS
'Product Variance Report V3.5 - with production writeoffs and inventory corrections';
