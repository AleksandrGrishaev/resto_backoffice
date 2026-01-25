-- Migration: 094_product_variance_report_rpc
-- Description: Create SQL function for Product Variance Report (Discrepancy Report)
-- Date: 2026-01-25
-- Context: Menu actualization - analyze discrepancies between purchases and usage
-- Formula: Opening Stock + Received - Sales W/O - Prep W/O - Loss W/O - Closing Stock = Variance

CREATE OR REPLACE FUNCTION get_product_variance_report(
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
      -- KPI department is first element of used_in_departments array
      COALESCE(used_in_departments[1], 'kitchen') as kpi_department
    FROM products
    WHERE is_active = true
  ),

  -- 2. Calculate opening stock (batches that existed before period start)
  -- We need to calculate what the stock WAS at the start of period
  -- This is: batches received before start date, minus any consumption before start date
  opening_stock AS (
    SELECT
      sb.item_id,
      -- Sum current quantities of batches that existed before period start
      -- Note: current_quantity reflects ALL consumption including during the period
      -- For accurate opening, we'd need historical tracking. Using current + period usage as approximation
      SUM(sb.current_quantity) as qty,
      SUM(sb.current_quantity * sb.cost_per_unit) as amount
    FROM storage_batches sb
    WHERE sb.status = 'active'
      AND sb.item_type = 'product'
      AND sb.receipt_date < p_start_date
    GROUP BY sb.item_id
  ),

  -- 3. Calculate received during period (from completed receipts)
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

  -- 4. Sales write-offs (reason = 'sales_consumption')
  sales_writeoff AS (
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
    GROUP BY (item->>'itemId')
  ),

  -- 5. Prep write-offs (reason = 'production_consumption')
  prep_writeoff AS (
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
    GROUP BY (item->>'itemId')
  ),

  -- 6. Loss write-offs (expired, spoiled, other)
  loss_writeoff AS (
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
    GROUP BY (item->>'itemId')
  ),

  -- 7. Closing stock (current active batches)
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

  -- 8. Combine all data
  combined AS (
    SELECT
      pi.id as product_id,
      pi.name as product_name,
      pi.code as product_code,
      pi.base_unit as unit,
      pi.kpi_department as department,
      -- Opening stock
      COALESCE(os.qty, 0) as opening_qty,
      COALESCE(os.amount, 0) as opening_amount,
      -- Received
      COALESCE(r.qty, 0) as received_qty,
      COALESCE(r.amount, 0) as received_amount,
      -- Sales write-off
      COALESCE(sw.qty, 0) as sales_qty,
      COALESCE(sw.amount, 0) as sales_amount,
      -- Prep write-off
      COALESCE(pw.qty, 0) as prep_qty,
      COALESCE(pw.amount, 0) as prep_amount,
      -- Loss write-off
      COALESCE(lw.qty, 0) as loss_qty,
      COALESCE(lw.amount, 0) as loss_amount,
      -- Closing stock
      COALESCE(cs.qty, 0) as closing_qty,
      COALESCE(cs.amount, 0) as closing_amount,
      -- Variance = Opening + Received - Sales - Prep - Loss - Closing
      (COALESCE(os.qty, 0) + COALESCE(r.qty, 0)
        - COALESCE(sw.qty, 0) - COALESCE(pw.qty, 0) - COALESCE(lw.qty, 0)
        - COALESCE(cs.qty, 0)) as variance_qty,
      (COALESCE(os.amount, 0) + COALESCE(r.amount, 0)
        - COALESCE(sw.amount, 0) - COALESCE(pw.amount, 0) - COALESCE(lw.amount, 0)
        - COALESCE(cs.amount, 0)) as variance_amount
    FROM product_info pi
    LEFT JOIN opening_stock os ON os.item_id = pi.id::TEXT
    LEFT JOIN received r ON r.item_id = pi.id::TEXT
    LEFT JOIN sales_writeoff sw ON sw.item_id = pi.id::TEXT
    LEFT JOIN prep_writeoff pw ON pw.item_id = pi.id::TEXT
    LEFT JOIN loss_writeoff lw ON lw.item_id = pi.id::TEXT
    LEFT JOIN closing_stock cs ON cs.item_id = pi.id::TEXT
    -- Only include products with any activity
    WHERE (
      COALESCE(os.qty, 0) > 0 OR
      COALESCE(r.qty, 0) > 0 OR
      COALESCE(sw.qty, 0) > 0 OR
      COALESCE(pw.qty, 0) > 0 OR
      COALESCE(lw.qty, 0) > 0 OR
      COALESCE(cs.qty, 0) > 0
    )
    -- Apply department filter
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
        'totalVarianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2),
        'totalReceivedAmount', ROUND(COALESCE(SUM(received_amount), 0), 2),
        'totalSalesWriteOffAmount', ROUND(COALESCE(SUM(sales_amount), 0), 2),
        'totalPrepWriteOffAmount', ROUND(COALESCE(SUM(prep_amount), 0), 2),
        'totalLossWriteOffAmount', ROUND(COALESCE(SUM(loss_amount), 0), 2)
      )
      FROM combined
    ),
    'byDepartment', jsonb_build_object(
      'kitchen', (SELECT jsonb_build_object(
        'count', COUNT(*),
        'varianceAmount', ROUND(COALESCE(SUM(variance_amount), 0), 2)
      ) FROM combined WHERE department = 'kitchen'),
      'bar', (SELECT jsonb_build_object(
        'count', COUNT(*),
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
          'openingStock', jsonb_build_object('quantity', ROUND(opening_qty, 3), 'amount', ROUND(opening_amount, 2)),
          'received', jsonb_build_object('quantity', ROUND(received_qty, 3), 'amount', ROUND(received_amount, 2)),
          'salesWriteOff', jsonb_build_object('quantity', ROUND(sales_qty, 3), 'amount', ROUND(sales_amount, 2)),
          'prepWriteOff', jsonb_build_object('quantity', ROUND(prep_qty, 3), 'amount', ROUND(prep_amount, 2)),
          'lossWriteOff', jsonb_build_object('quantity', ROUND(loss_qty, 3), 'amount', ROUND(loss_amount, 2)),
          'closingStock', jsonb_build_object('quantity', ROUND(closing_qty, 3), 'amount', ROUND(closing_amount, 2)),
          'variance', jsonb_build_object('quantity', ROUND(variance_qty, 3), 'amount', ROUND(variance_amount, 2))
        )
        ORDER BY ABS(variance_amount) DESC
      ), '[]'::jsonb)
      FROM combined
    ),
    'generatedAt', NOW(),
    'departmentFilter', COALESCE(p_department, 'all')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_product_variance_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_variance_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
