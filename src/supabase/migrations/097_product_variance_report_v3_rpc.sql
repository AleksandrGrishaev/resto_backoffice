-- Migration: 097_product_variance_report_v3_rpc
-- Description: Enhanced Product Variance Report with theoretical sales from orders
-- Date: 2025-01-27
-- Context: Add theoretical sales calculation based on order decomposition through recipes

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_product_variance_report_v3(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_product_variance_report_v3(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_department TEXT DEFAULT NULL  -- 'kitchen', 'bar', or NULL for all
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validate department parameter
  IF p_department IS NOT NULL AND p_department NOT IN ('kitchen', 'bar') THEN
    RAISE EXCEPTION 'Invalid department: %. Must be kitchen, bar, or NULL', p_department;
  END IF;

  WITH
  -- 1. Get all active products with their KPI department and cost
  product_info AS (
    SELECT
      p.id,
      p.name,
      p.code,
      p.base_unit,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department,
      -- Get average cost from active batches
      COALESCE(
        (SELECT AVG(sb.cost_per_unit)
         FROM storage_batches sb
         WHERE sb.item_id = p.id::TEXT
           AND sb.item_type = 'product'
           AND sb.status = 'active'),
        p.base_cost
      ) as avg_cost
    FROM products p
    WHERE p.is_active = true
  ),

  -- 2. Get completed orders in period
  completed_orders AS (
    SELECT o.id as order_id
    FROM orders o
    WHERE o.status = 'completed'
      AND o.paid_at >= p_start_date
      AND o.paid_at < p_end_date
  ),

  -- 3. Get order items from completed orders (excluding cancelled)
  order_items_data AS (
    SELECT
      oi.menu_item_id,
      oi.variant_id,
      oi.quantity as order_qty,
      oi.department
    FROM order_items oi
    JOIN completed_orders co ON co.order_id = oi.order_id
    WHERE oi.status != 'cancelled'
  ),

  -- 4. Get variant compositions from menu_items
  -- Structure: variants[].composition[{id, type, quantity, unit}]
  variant_compositions AS (
    SELECT
      mi.id as menu_item_id,
      (v->>'id') as variant_id,
      (c->>'id') as composition_id,
      (c->>'type') as composition_type,  -- 'recipe', 'preparation', 'product'
      (c->>'quantity')::NUMERIC as composition_qty,
      (c->>'unit') as composition_unit
    FROM menu_items mi,
    LATERAL jsonb_array_elements(mi.variants) as v,
    LATERAL jsonb_array_elements(v->'composition') as c
    WHERE mi.is_active = true
  ),

  -- 5. Join order items with their compositions
  order_compositions AS (
    SELECT
      oid.menu_item_id,
      oid.variant_id,
      oid.order_qty,
      vc.composition_id,
      vc.composition_type,
      vc.composition_qty,
      vc.composition_unit
    FROM order_items_data oid
    JOIN variant_compositions vc
      ON vc.menu_item_id = oid.menu_item_id
      AND vc.variant_id = oid.variant_id
  ),

  -- 6. Direct products from compositions (type = 'product')
  direct_products_from_orders AS (
    SELECT
      oc.composition_id::UUID as product_id,
      SUM(oc.order_qty * oc.composition_qty) as qty
    FROM order_compositions oc
    WHERE oc.composition_type = 'product'
    GROUP BY oc.composition_id
  ),

  -- 7. Get recipe components (products and preparations used in recipes)
  recipe_comp AS (
    SELECT
      rc.recipe_id,
      rc.component_id,
      rc.component_type,  -- 'product' or 'preparation'
      rc.quantity as component_qty,
      rc.unit as component_unit,
      r.portion_size as recipe_portion_size
    FROM recipe_components rc
    JOIN recipes r ON r.id = rc.recipe_id
    WHERE r.is_active = true
  ),

  -- 8. Products from recipes in orders (decompose recipe -> products)
  products_from_recipes AS (
    SELECT
      rc.component_id::UUID as product_id,
      SUM(
        oc.order_qty * oc.composition_qty * rc.component_qty / NULLIF(rc.recipe_portion_size, 0)
      ) as qty
    FROM order_compositions oc
    JOIN recipe_comp rc ON rc.recipe_id = oc.composition_id::UUID
    WHERE oc.composition_type = 'recipe'
      AND rc.component_type = 'product'
    GROUP BY rc.component_id
  ),

  -- 9. Preparations from recipes in orders
  preps_from_recipes AS (
    SELECT
      rc.component_id::UUID as preparation_id,
      SUM(
        oc.order_qty * oc.composition_qty * rc.component_qty / NULLIF(rc.recipe_portion_size, 0)
      ) as qty
    FROM order_compositions oc
    JOIN recipe_comp rc ON rc.recipe_id = oc.composition_id::UUID
    WHERE oc.composition_type = 'recipe'
      AND rc.component_type = 'preparation'
    GROUP BY rc.component_id
  ),

  -- 10. Direct preparations from compositions (type = 'preparation')
  direct_preps_from_orders AS (
    SELECT
      oc.composition_id::UUID as preparation_id,
      SUM(oc.order_qty * oc.composition_qty) as qty
    FROM order_compositions oc
    WHERE oc.composition_type = 'preparation'
    GROUP BY oc.composition_id
  ),

  -- 11. Combine all preparations (from recipes + direct)
  all_preps AS (
    SELECT preparation_id, SUM(qty) as qty
    FROM (
      SELECT * FROM preps_from_recipes
      UNION ALL
      SELECT * FROM direct_preps_from_orders
    ) combined
    GROUP BY preparation_id
  ),

  -- 12. Decompose preparations to products
  products_from_preparations AS (
    SELECT
      pi.ingredient_id as product_id,
      SUM(
        ap.qty * pi.quantity / NULLIF(p.output_quantity, 0)
      ) as qty
    FROM all_preps ap
    JOIN preparations p ON p.id = ap.preparation_id
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product'
      AND p.is_active = true
    GROUP BY pi.ingredient_id
  ),

  -- 13. THEORETICAL SALES: Combine all product sources
  theoretical_sales AS (
    SELECT product_id, SUM(qty) as qty
    FROM (
      SELECT * FROM direct_products_from_orders
      UNION ALL
      SELECT * FROM products_from_recipes
      UNION ALL
      SELECT * FROM products_from_preparations
    ) combined
    GROUP BY product_id
  ),

  -- ============================================
  -- EXISTING V2 CALCULATIONS (Write-off based)
  -- ============================================

  -- 14. Opening stock (batches before period start)
  opening_stock AS (
    SELECT
      sb.item_id,
      SUM(sb.current_quantity) as qty,
      SUM(sb.current_quantity * sb.cost_per_unit) as amount
    FROM storage_batches sb
    WHERE sb.status = 'active'
      AND sb.item_type = 'product'
      AND sb.receipt_date < p_start_date
    GROUP BY sb.item_id
  ),

  -- 15. Received during period
  received AS (
    SELECT
      sri.item_id,
      SUM(sri.received_quantity) as qty,
      SUM(sri.received_quantity * COALESCE(sri.actual_base_cost, sri.ordered_base_cost)) as amount
    FROM supplierstore_receipt_items sri
    JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
    WHERE sr.delivery_date >= p_start_date
      AND sr.delivery_date < p_end_date
      AND sr.status = 'completed'
    GROUP BY sri.item_id
  ),

  -- 16. Direct sales write-offs (ACTUAL)
  direct_sales_writeoffs AS (
    SELECT
      (item->>'itemId') as item_id,
      SUM((item->>'quantity')::NUMERIC) as qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < p_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'sales_consumption'
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),

  -- 17. Direct loss write-offs
  direct_loss AS (
    SELECT
      (item->>'itemId') as item_id,
      SUM((item->>'quantity')::NUMERIC) as qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < p_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') IN ('expired', 'spoiled', 'other')
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),

  -- 18. Production consumption (product -> preparation)
  production_consumption AS (
    SELECT
      (item->>'itemId') as item_id,
      SUM((item->>'quantity')::NUMERIC) as qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as amount
    FROM storage_operations so,
    LATERAL jsonb_array_elements(so.items) AS item
    WHERE so.operation_type = 'write_off'
      AND so.operation_date >= p_start_date
      AND so.operation_date < p_end_date
      AND so.status = 'confirmed'
      AND (so.write_off_details->>'reason') = 'production_consumption'
      AND (item->>'itemType') = 'product'
    GROUP BY (item->>'itemId')
  ),

  -- 19. Traced sales through preparations (from preparation write-offs)
  prep_recipes AS (
    SELECT
      p.id as preparation_id,
      p.output_quantity as prep_output_qty,
      pi.ingredient_id as product_id,
      pi.quantity as recipe_product_qty
    FROM preparations p
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product'
      AND p.is_active = true
  ),

  prep_sales AS (
    SELECT
      (item->>'preparationId')::UUID as preparation_id,
      SUM((item->>'quantity')::NUMERIC) as qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as cost
    FROM preparation_operations po,
    LATERAL jsonb_array_elements(po.items) AS item
    WHERE po.operation_type = 'write_off'
      AND po.operation_date >= p_start_date
      AND po.operation_date < p_end_date
      AND po.status = 'confirmed'
      AND (po.write_off_details->>'reason') = 'sales_consumption'
    GROUP BY (item->>'preparationId')::UUID
  ),

  traced_sales_writeoffs AS (
    SELECT
      pr.product_id::TEXT as item_id,
      SUM(
        CASE WHEN pr.prep_output_qty > 0
        THEN (ps.qty / pr.prep_output_qty) * pr.recipe_product_qty
        ELSE 0 END
      ) as qty,
      SUM(
        CASE WHEN ps.qty > 0 THEN
          (ps.cost / ps.qty) *
          CASE WHEN pr.prep_output_qty > 0
          THEN (ps.qty / pr.prep_output_qty) * pr.recipe_product_qty
          ELSE 0 END
        ELSE 0 END
      ) as amount
    FROM prep_sales ps
    JOIN prep_recipes pr ON ps.preparation_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- 20. Traced losses through preparations
  prep_losses AS (
    SELECT
      (item->>'preparationId')::UUID as preparation_id,
      SUM((item->>'quantity')::NUMERIC) as qty,
      SUM(COALESCE((item->>'totalCost')::NUMERIC, 0)) as cost
    FROM preparation_operations po,
    LATERAL jsonb_array_elements(po.items) AS item
    WHERE po.operation_type = 'write_off'
      AND po.operation_date >= p_start_date
      AND po.operation_date < p_end_date
      AND po.status = 'confirmed'
      AND (po.write_off_details->>'reason') IN ('expired', 'spoiled', 'other', 'expiration')
    GROUP BY (item->>'preparationId')::UUID
  ),

  traced_losses AS (
    SELECT
      pr.product_id::TEXT as item_id,
      SUM(
        CASE WHEN pr.prep_output_qty > 0
        THEN (pl.qty / pr.prep_output_qty) * pr.recipe_product_qty
        ELSE 0 END
      ) as qty,
      SUM(
        CASE WHEN pl.qty > 0 THEN
          (pl.cost / pl.qty) *
          CASE WHEN pr.prep_output_qty > 0
          THEN (pl.qty / pr.prep_output_qty) * pr.recipe_product_qty
          ELSE 0 END
        ELSE 0 END
      ) as amount
    FROM prep_losses pl
    JOIN prep_recipes pr ON pl.preparation_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- 21. Closing stock
  closing_stock AS (
    SELECT
      sb.item_id,
      SUM(sb.current_quantity) as qty,
      SUM(sb.current_quantity * sb.cost_per_unit) as amount
    FROM storage_batches sb
    WHERE sb.status = 'active'
      AND sb.item_type = 'product'
      AND sb.current_quantity > 0
    GROUP BY sb.item_id
  ),

  -- 22. Products with preparations flag
  products_with_preps AS (
    SELECT DISTINCT pr.product_id::TEXT as item_id
    FROM prep_recipes pr
  ),

  -- 23. COMBINED DATA
  combined AS (
    SELECT
      pi.id as product_id,
      pi.name as product_name,
      pi.code as product_code,
      pi.base_unit as unit,
      pi.kpi_department as department,
      pi.avg_cost,
      -- Opening
      COALESCE(os.qty, 0) as opening_qty,
      COALESCE(os.amount, 0) as opening_amount,
      -- Received
      COALESCE(r.qty, 0) as received_qty,
      COALESCE(r.amount, 0) as received_amount,
      -- THEORETICAL SALES (from orders)
      COALESCE(ts.qty, 0) as theoretical_sales_qty,
      COALESCE(ts.qty, 0) * pi.avg_cost as theoretical_sales_amount,
      -- ACTUAL WRITE-OFFS (direct + traced)
      COALESCE(dsw.qty, 0) + COALESCE(tsw.qty, 0) as writeoff_sales_qty,
      COALESCE(dsw.amount, 0) + COALESCE(tsw.amount, 0) as writeoff_sales_amount,
      -- Direct vs Traced breakdown for write-offs
      COALESCE(dsw.qty, 0) as direct_writeoff_qty,
      COALESCE(dsw.amount, 0) as direct_writeoff_amount,
      COALESCE(tsw.qty, 0) as traced_writeoff_qty,
      COALESCE(tsw.amount, 0) as traced_writeoff_amount,
      -- Loss (direct + traced)
      COALESCE(dl.qty, 0) + COALESCE(tl.qty, 0) as loss_qty,
      COALESCE(dl.amount, 0) + COALESCE(tl.amount, 0) as loss_amount,
      COALESCE(dl.qty, 0) as direct_loss_qty,
      COALESCE(dl.amount, 0) as direct_loss_amount,
      COALESCE(tl.qty, 0) as traced_loss_qty,
      COALESCE(tl.amount, 0) as traced_loss_amount,
      -- Production consumption
      COALESCE(pc.qty, 0) as production_qty,
      COALESCE(pc.amount, 0) as production_amount,
      -- Closing
      COALESCE(cs.qty, 0) as closing_qty,
      COALESCE(cs.amount, 0) as closing_amount,
      -- Has preparations flag
      CASE WHEN pwp.item_id IS NOT NULL THEN true ELSE false END as has_preparations,
      -- VARIANCE using THEORETICAL sales
      -- Formula: Opening + Received - TheoreticalSales - Loss - Closing = Variance
      (COALESCE(os.qty, 0) + COALESCE(r.qty, 0)
        - COALESCE(ts.qty, 0)
        - COALESCE(dl.qty, 0) - COALESCE(tl.qty, 0)
        - COALESCE(cs.qty, 0)) as variance_qty,
      (COALESCE(os.amount, 0) + COALESCE(r.amount, 0)
        - COALESCE(ts.qty, 0) * pi.avg_cost
        - COALESCE(dl.amount, 0) - COALESCE(tl.amount, 0)
        - COALESCE(cs.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN received r ON r.item_id = pi.id::TEXT
    LEFT JOIN theoretical_sales ts ON ts.product_id = pi.id
    LEFT JOIN direct_sales_writeoffs dsw ON dsw.item_id = pi.id::TEXT
    LEFT JOIN traced_sales_writeoffs tsw ON tsw.item_id = pi.id::TEXT
    LEFT JOIN direct_loss dl ON dl.item_id = pi.id::TEXT
    LEFT JOIN traced_losses tl ON tl.item_id = pi.id::TEXT
    LEFT JOIN production_consumption pc ON pc.item_id = pi.id::TEXT
    LEFT JOIN closing_stock cs ON cs.item_id = pi.id::TEXT
    LEFT JOIN products_with_preps pwp ON pwp.item_id = pi.id::TEXT
    WHERE (
      COALESCE(os.qty, 0) > 0 OR
      COALESCE(r.qty, 0) > 0 OR
      COALESCE(ts.qty, 0) > 0 OR
      COALESCE(dsw.qty, 0) > 0 OR
      COALESCE(tsw.qty, 0) > 0 OR
      COALESCE(dl.qty, 0) > 0 OR
      COALESCE(tl.qty, 0) > 0 OR
      COALESCE(cs.qty, 0) > 0
    )
    AND (p_department IS NULL OR pi.kpi_department = p_department)
  )

  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'dateFrom', p_start_date::DATE,
      'dateTo', p_end_date::DATE
    ),
    'summary', (
      SELECT jsonb_build_object(
        'totalProducts', COUNT(*),
        'productsWithActivity', COUNT(*) FILTER (WHERE theoretical_sales_qty > 0 OR loss_qty > 0),
        'totalTheoreticalSalesAmount', ROUND(COALESCE(SUM(theoretical_sales_amount), 0), 2),
        'totalWriteoffSalesAmount', ROUND(COALESCE(SUM(writeoff_sales_amount), 0), 2),
        'totalLossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
        'totalVarianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
        'overallLossPercent', ROUND(
          CASE WHEN COALESCE(SUM(theoretical_sales_amount), 0) > 0
          THEN (COALESCE(SUM(loss_amount), 0) / COALESCE(SUM(theoretical_sales_amount), 0)) * 100
          ELSE 0 END, 2
        )
      )
      FROM combined
    ),
    'byDepartment', jsonb_build_object(
      'kitchen', (SELECT jsonb_build_object(
        'count', COUNT(*),
        'theoreticalSalesAmount', ROUND(COALESCE(SUM(theoretical_sales_amount), 0), 2),
        'writeoffSalesAmount', ROUND(COALESCE(SUM(writeoff_sales_amount), 0), 2),
        'lossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
        'varianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
        'lossPercent', ROUND(
          CASE WHEN COALESCE(SUM(theoretical_sales_amount), 0) > 0
          THEN (COALESCE(SUM(loss_amount), 0) / COALESCE(SUM(theoretical_sales_amount), 0)) * 100
          ELSE 0 END, 2
        )
      ) FROM combined WHERE department = 'kitchen'),
      'bar', (SELECT jsonb_build_object(
        'count', COUNT(*),
        'theoreticalSalesAmount', ROUND(COALESCE(SUM(theoretical_sales_amount), 0), 2),
        'writeoffSalesAmount', ROUND(COALESCE(SUM(writeoff_sales_amount), 0), 2),
        'lossAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2),
        'varianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
        'lossPercent', ROUND(
          CASE WHEN COALESCE(SUM(theoretical_sales_amount), 0) > 0
          THEN (COALESCE(SUM(loss_amount), 0) / COALESCE(SUM(theoretical_sales_amount), 0)) * 100
          ELSE 0 END, 2
        )
      ) FROM combined WHERE department = 'bar')
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'productId', product_id,
          'productName', product_name,
          'productCode', product_code,
          'unit', unit,
          'department', department,
          'hasPreparations', has_preparations,
          'opening', jsonb_build_object('quantity', ROUND(opening_qty, 3), 'amount', ROUND(opening_amount, 2)),
          'received', jsonb_build_object('quantity', ROUND(received_qty, 3), 'amount', ROUND(received_amount, 2)),
          -- THEORETICAL SALES (main, from orders)
          'sales', jsonb_build_object('quantity', ROUND(theoretical_sales_qty, 3), 'amount', ROUND(theoretical_sales_amount, 2)),
          -- ACTUAL WRITE-OFFS (for comparison)
          'writeoffs', jsonb_build_object('quantity', ROUND(writeoff_sales_qty, 3), 'amount', ROUND(writeoff_sales_amount, 2)),
          'directWriteoffs', jsonb_build_object('quantity', ROUND(direct_writeoff_qty, 3), 'amount', ROUND(direct_writeoff_amount, 2)),
          'tracedWriteoffs', jsonb_build_object('quantity', ROUND(traced_writeoff_qty, 3), 'amount', ROUND(traced_writeoff_amount, 2)),
          -- Loss
          'loss', jsonb_build_object('quantity', ROUND(loss_qty, 3), 'amount', ROUND(loss_amount, 2)),
          'directLoss', jsonb_build_object('quantity', ROUND(direct_loss_qty, 3), 'amount', ROUND(direct_loss_amount, 2)),
          'tracedLoss', jsonb_build_object('quantity', ROUND(traced_loss_qty, 3), 'amount', ROUND(traced_loss_amount, 2)),
          -- Closing & Variance
          'closing', jsonb_build_object('quantity', ROUND(closing_qty, 3), 'amount', ROUND(closing_amount, 2)),
          'variance', jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2)),
          -- Loss percent (based on theoretical sales)
          'lossPercent', CASE
            WHEN theoretical_sales_amount > 0
            THEN ROUND((loss_amount / theoretical_sales_amount) * 100, 2)
            ELSE NULL
          END,
          -- Sales vs Writeoffs diff (to see recipe/write-off discrepancy)
          'salesWriteoffDiff', jsonb_build_object(
            'quantity', ROUND(theoretical_sales_qty - writeoff_sales_qty, 3),
            'amount', ROUND(theoretical_sales_amount - writeoff_sales_amount, 2)
          )
        )
        ORDER BY ABS(variance_amount) DESC NULLS LAST
      ), '[]'::jsonb)
      FROM combined
    ),
    'generatedAt', NOW(),
    'departmentFilter', COALESCE(p_department, 'all'),
    'version', 'v3'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_product_variance_report_v3(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_variance_report_v3(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;

-- Comment
COMMENT ON FUNCTION get_product_variance_report_v3 IS 'Product Variance Report V3: Theoretical sales from orders + actual write-offs for comparison';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
