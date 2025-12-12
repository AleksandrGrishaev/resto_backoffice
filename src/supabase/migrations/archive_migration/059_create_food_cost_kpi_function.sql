-- Migration: 059_create_food_cost_kpi_function
-- Description: Create RPC function for Food Cost KPI aggregation
-- Date: 2025-12-12

-- Function to get Food Cost KPI metrics for a specific month
CREATE OR REPLACE FUNCTION get_food_cost_kpi_month(
  p_month DATE DEFAULT CURRENT_DATE,
  p_department TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_revenue NUMERIC := 0;
  v_revenue_kitchen NUMERIC := 0;
  v_revenue_bar NUMERIC := 0;
  v_sales_cogs NUMERIC := 0;
  v_spoilage NUMERIC := 0;
  v_shortage NUMERIC := 0;
  v_surplus NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_total_cogs_percent NUMERIC := 0;
BEGIN
  -- Calculate month boundaries
  v_start_date := DATE_TRUNC('month', p_month)::TIMESTAMPTZ;
  v_end_date := (DATE_TRUNC('month', p_month) + INTERVAL '1 month')::TIMESTAMPTZ;

  -- 1. Calculate Revenue and Sales COGS from sales_transactions
  SELECT
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM(CASE WHEN department = 'kitchen' THEN total_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN department = 'bar' THEN total_price ELSE 0 END), 0),
    COALESCE(SUM((actual_cost->>'totalCost')::NUMERIC), 0)
  INTO v_revenue, v_revenue_kitchen, v_revenue_bar, v_sales_cogs
  FROM sales_transactions
  WHERE sold_at >= v_start_date
    AND sold_at < v_end_date
    AND (p_department IS NULL OR department = p_department);

  -- 2. Calculate Spoilage from storage_operations (write-offs)
  -- Spoilage = write-offs with reason 'spoiled', 'expired', 'damaged', 'other' (excluding production_consumption)
  SELECT COALESCE(SUM(total_value), 0)
  INTO v_spoilage
  FROM storage_operations
  WHERE operation_type = 'write_off'
    AND operation_date >= v_start_date
    AND operation_date < v_end_date
    AND (p_department IS NULL OR department = p_department)
    AND (write_off_details->>'reason' IS NULL
         OR write_off_details->>'reason' NOT IN ('production_consumption'));

  -- Add preparation_operations write-offs to spoilage
  SELECT v_spoilage + COALESCE(SUM(total_value), 0)
  INTO v_spoilage
  FROM preparation_operations
  WHERE operation_type = 'write_off'
    AND operation_date >= v_start_date
    AND operation_date < v_end_date
    AND (p_department IS NULL OR department = p_department)
    AND (write_off_details->>'reason' IS NULL
         OR write_off_details->>'reason' NOT IN ('production_consumption'));

  -- 3. Calculate Shortage from inventory corrections (negative discrepancies)
  -- Shortage = inventory value difference when actual < expected
  SELECT COALESCE(SUM(
    CASE WHEN total_value_difference < 0 THEN ABS(total_value_difference) ELSE 0 END
  ), 0)
  INTO v_shortage
  FROM inventory_documents
  WHERE inventory_date >= v_start_date::DATE
    AND inventory_date < v_end_date::DATE
    AND status = 'completed';

  -- 4. Calculate Surplus from inventory corrections (positive discrepancies)
  -- Surplus = inventory value difference when actual > expected
  SELECT COALESCE(SUM(
    CASE WHEN total_value_difference > 0 THEN total_value_difference ELSE 0 END
  ), 0)
  INTO v_surplus
  FROM inventory_documents
  WHERE inventory_date >= v_start_date::DATE
    AND inventory_date < v_end_date::DATE
    AND status = 'completed';

  -- 5. Calculate Total COGS
  -- Formula: Total COGS = Sales COGS + Spoilage + Shortage - Surplus
  v_total_cogs := v_sales_cogs + v_spoilage + v_shortage - v_surplus;

  -- 6. Calculate percentage
  IF v_revenue > 0 THEN
    v_total_cogs_percent := ROUND((v_total_cogs / v_revenue) * 100, 2);
  END IF;

  -- Return result as JSONB
  RETURN jsonb_build_object(
    'period', jsonb_build_object(
      'startDate', v_start_date::DATE,
      'endDate', (v_end_date - INTERVAL '1 day')::DATE
    ),
    'revenue', ROUND(v_revenue, 2),
    'revenueByDepartment', jsonb_build_object(
      'kitchen', ROUND(v_revenue_kitchen, 2),
      'bar', ROUND(v_revenue_bar, 2)
    ),
    'salesCOGS', ROUND(v_sales_cogs, 2),
    'spoilage', ROUND(v_spoilage, 2),
    'shortage', ROUND(v_shortage, 2),
    'surplus', ROUND(v_surplus, 2),
    'totalCOGS', ROUND(v_total_cogs, 2),
    'totalCOGSPercent', v_total_cogs_percent
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_food_cost_kpi_month(DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_food_cost_kpi_month(DATE, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION get_food_cost_kpi_month IS 'Get Food Cost KPI metrics for a specific month. Returns revenue, COGS breakdown (Sales COGS, Spoilage, Shortage, Surplus), and total COGS percentage.';
