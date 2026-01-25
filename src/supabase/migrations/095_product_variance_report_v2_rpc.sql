-- Migration: 095_product_variance_report_v2_rpc
-- Description: Enhanced Product Variance Report with full preparation traceability
-- Date: 2025-01-25
-- Context: Track product losses/sales through preparations for recipe error detection

CREATE OR REPLACE FUNCTION get_product_variance_report_v2(
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
  -- 1. Get all active products with their KPI department
  product_info AS (
    SELECT
      id,
      name,
      code,
      base_unit,
      COALESCE(used_in_departments[1], 'kitchen') as kpi_department
    FROM products
    WHERE is_active = true
  ),

  -- 2. Opening stock (batches before period start)
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

  -- 3. Received during period
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

  -- 4. Direct sales (product level - sales_consumption)
  direct_sales AS (
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

  -- 5. Direct loss (product level - expired, spoiled, other)
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

  -- 6. Production consumption (product → preparation)
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

  -- 7. Preparation recipes (which products go into which preparations)
  prep_recipes AS (
    SELECT
      p.id as preparation_id,
      p.name as preparation_name,
      p.output_quantity as prep_output_qty,
      p.output_unit as prep_output_unit,
      pi.ingredient_id as product_id,
      pi.quantity as recipe_product_qty,
      pi.unit as recipe_product_unit
    FROM preparations p
    JOIN preparation_ingredients pi ON pi.preparation_id = p.id
    WHERE pi.type = 'product'
      AND p.is_active = true
  ),

  -- 8. Preparation sales (sales_consumption from preparation_operations)
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

  -- 9. Preparation losses (expired, spoiled, other, expiration)
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

  -- 10. Trace preparation sales back to products
  -- Formula: (prep_qty / prep_output_qty) * recipe_product_qty = product_qty_used
  traced_sales AS (
    SELECT
      pr.product_id::TEXT as item_id,
      SUM(
        CASE
          WHEN pr.prep_output_qty > 0 THEN
            (ps.qty / pr.prep_output_qty) * pr.recipe_product_qty
          ELSE 0
        END
      ) as qty,
      SUM(
        CASE
          WHEN ps.qty > 0 THEN
            (ps.cost / ps.qty) *
            CASE
              WHEN pr.prep_output_qty > 0 THEN
                (ps.qty / pr.prep_output_qty) * pr.recipe_product_qty
              ELSE 0
            END
          ELSE 0
        END
      ) as amount
    FROM prep_sales ps
    JOIN prep_recipes pr ON ps.preparation_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- 11. Trace preparation losses back to products
  traced_losses AS (
    SELECT
      pr.product_id::TEXT as item_id,
      SUM(
        CASE
          WHEN pr.prep_output_qty > 0 THEN
            (pl.qty / pr.prep_output_qty) * pr.recipe_product_qty
          ELSE 0
        END
      ) as qty,
      SUM(
        CASE
          WHEN pl.qty > 0 THEN
            (pl.cost / pl.qty) *
            CASE
              WHEN pr.prep_output_qty > 0 THEN
                (pl.qty / pr.prep_output_qty) * pr.recipe_product_qty
              ELSE 0
            END
          ELSE 0
        END
      ) as amount
    FROM prep_losses pl
    JOIN prep_recipes pr ON pl.preparation_id = pr.preparation_id
    GROUP BY pr.product_id
  ),

  -- 12. Closing stock
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

  -- 13. Check which products have preparations
  products_with_preps AS (
    SELECT DISTINCT pr.product_id::TEXT as item_id
    FROM prep_recipes pr
  ),

  -- 14. Combine all data
  combined AS (
    SELECT
      pi.id as product_id,
      pi.name as product_name,
      pi.code as product_code,
      pi.base_unit as unit,
      pi.kpi_department as department,
      -- Opening
      COALESCE(os.qty, 0) as opening_qty,
      COALESCE(os.amount, 0) as opening_amount,
      -- Received
      COALESCE(r.qty, 0) as received_qty,
      COALESCE(r.amount, 0) as received_amount,
      -- Direct sales
      COALESCE(ds.qty, 0) as direct_sales_qty,
      COALESCE(ds.amount, 0) as direct_sales_amount,
      -- Direct loss
      COALESCE(dl.qty, 0) as direct_loss_qty,
      COALESCE(dl.amount, 0) as direct_loss_amount,
      -- Production consumption
      COALESCE(pc.qty, 0) as production_qty,
      COALESCE(pc.amount, 0) as production_amount,
      -- Traced sales (through preps)
      COALESCE(ts.qty, 0) as traced_sales_qty,
      COALESCE(ts.amount, 0) as traced_sales_amount,
      -- Traced losses (through preps)
      COALESCE(tl.qty, 0) as traced_loss_qty,
      COALESCE(tl.amount, 0) as traced_loss_amount,
      -- Closing
      COALESCE(cs.qty, 0) as closing_qty,
      COALESCE(cs.amount, 0) as closing_amount,
      -- Has preparations flag
      CASE WHEN pwp.item_id IS NOT NULL THEN true ELSE false END as has_preparations,
      -- Total Sales = Direct + Traced
      COALESCE(ds.qty, 0) + COALESCE(ts.qty, 0) as total_sales_qty,
      COALESCE(ds.amount, 0) + COALESCE(ts.amount, 0) as total_sales_amount,
      -- Total Loss = Direct + Traced
      COALESCE(dl.qty, 0) + COALESCE(tl.qty, 0) as total_loss_qty,
      COALESCE(dl.amount, 0) + COALESCE(tl.amount, 0) as total_loss_amount,
      -- Variance = Opening + Received - TotalSales - TotalLoss - Closing
      (COALESCE(os.qty, 0) + COALESCE(r.qty, 0)
        - COALESCE(ds.qty, 0) - COALESCE(ts.qty, 0)
        - COALESCE(dl.qty, 0) - COALESCE(tl.qty, 0)
        - COALESCE(cs.qty, 0)) as variance_qty,
      (COALESCE(os.amount, 0) + COALESCE(r.amount, 0)
        - COALESCE(ds.amount, 0) - COALESCE(ts.amount, 0)
        - COALESCE(dl.amount, 0) - COALESCE(tl.amount, 0)
        - COALESCE(cs.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN received r ON r.item_id = pi.id::TEXT
    LEFT JOIN direct_sales ds ON ds.item_id = pi.id::TEXT
    LEFT JOIN direct_loss dl ON dl.item_id = pi.id::TEXT
    LEFT JOIN production_consumption pc ON pc.item_id = pi.id::TEXT
    LEFT JOIN traced_sales ts ON ts.item_id = pi.id::TEXT
    LEFT JOIN traced_losses tl ON tl.item_id = pi.id::TEXT
    LEFT JOIN closing_stock cs ON cs.item_id = pi.id::TEXT
    LEFT JOIN products_with_preps pwp ON pwp.item_id = pi.id::TEXT
    -- Only include products with any activity
    WHERE (
      COALESCE(os.qty, 0) > 0 OR
      COALESCE(r.qty, 0) > 0 OR
      COALESCE(ds.qty, 0) > 0 OR
      COALESCE(dl.qty, 0) > 0 OR
      COALESCE(pc.qty, 0) > 0 OR
      COALESCE(ts.qty, 0) > 0 OR
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
        'productsWithVariance', COUNT(*) FILTER (WHERE ABS(variance_amount) > 0.01),
        'productsWithPreparations', COUNT(*) FILTER (WHERE has_preparations),
        'totalReceivedAmount', ROUND(COALESCE(SUM(received_amount), 0), 2),
        'totalSalesAmount', ROUND(COALESCE(SUM(total_sales_amount), 0), 2),
        'totalDirectSalesAmount', ROUND(COALESCE(SUM(direct_sales_amount), 0), 2),
        'totalTracedSalesAmount', ROUND(COALESCE(SUM(traced_sales_amount), 0), 2),
        'totalLossAmount', ROUND(COALESCE(SUM(total_loss_amount), 0), 2),
        'totalDirectLossAmount', ROUND(COALESCE(SUM(direct_loss_amount), 0), 2),
        'totalTracedLossAmount', ROUND(COALESCE(SUM(traced_loss_amount), 0), 2),
        'totalVarianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
        'effectiveLossPercent', ROUND(
          CASE
            WHEN COALESCE(SUM(total_sales_amount), 0) > 0
            THEN (COALESCE(SUM(total_loss_amount), 0) / COALESCE(SUM(total_sales_amount), 0)) * 100
            ELSE 0
          END, 2
        )
      )
      FROM combined
    ),
    'byDepartment', jsonb_build_object(
      'kitchen', (SELECT jsonb_build_object(
        'count', COUNT(*),
        'salesAmount', ROUND(COALESCE(SUM(total_sales_amount), 0), 2),
        'lossAmount', ROUND(COALESCE(SUM(total_loss_amount), 0), 2),
        'varianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2)
      ) FROM combined WHERE department = 'kitchen'),
      'bar', (SELECT jsonb_build_object(
        'count', COUNT(*),
        'salesAmount', ROUND(COALESCE(SUM(total_sales_amount), 0), 2),
        'lossAmount', ROUND(COALESCE(SUM(total_loss_amount), 0), 2),
        'varianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2)
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
          'sales', jsonb_build_object('quantity', ROUND(total_sales_qty, 3), 'amount', ROUND(total_sales_amount, 2)),
          'loss', jsonb_build_object('quantity', ROUND(total_loss_qty, 3), 'amount', ROUND(total_loss_amount, 2)),
          'closing', jsonb_build_object('quantity', ROUND(closing_qty, 3), 'amount', ROUND(closing_amount, 2)),
          'variance', jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2)),
          -- Detailed breakdown for dialog
          'directSales', jsonb_build_object('quantity', ROUND(direct_sales_qty, 3), 'amount', ROUND(direct_sales_amount, 2)),
          'directLoss', jsonb_build_object('quantity', ROUND(direct_loss_qty, 3), 'amount', ROUND(direct_loss_amount, 2)),
          'production', jsonb_build_object('quantity', ROUND(production_qty, 3), 'amount', ROUND(production_amount, 2)),
          'tracedSales', jsonb_build_object('quantity', ROUND(traced_sales_qty, 3), 'amount', ROUND(traced_sales_amount, 2)),
          'tracedLoss', jsonb_build_object('quantity', ROUND(traced_loss_qty, 3), 'amount', ROUND(traced_loss_amount, 2)),
          -- Loss percent
          'lossPercent', CASE
            WHEN total_sales_amount > 0
            THEN ROUND((total_loss_amount / total_sales_amount) * 100, 2)
            ELSE NULL
          END
        )
        ORDER BY total_loss_amount DESC NULLS LAST
      ), '[]'::jsonb)
      FROM combined
    ),
    'generatedAt', NOW(),
    'departmentFilter', COALESCE(p_department, 'all'),
    'version', 'v2'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_product_variance_report_v2(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_variance_report_v2(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
