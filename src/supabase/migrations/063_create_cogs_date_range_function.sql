-- Migration: 063_create_cogs_date_range_function
-- Description: Create unified SQL function for COGS calculation across all reports
-- Date: 2025-12-12
-- Context: Single source of truth for P&L, Food Cost Dashboard, and KPI reports
--
-- Usage:
--   For P&L: get_cogs_by_date_range(start, end, NULL, NULL) - includes ALL write-offs
--   For KPI: get_cogs_by_date_range(start, end, 'kitchen', '{"storage": ["education", "test"], "preparation": ["education", "test"]}')

CREATE OR REPLACE FUNCTION get_cogs_by_date_range(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_department TEXT DEFAULT NULL,
  p_excluded_reasons JSONB DEFAULT NULL
  -- For P&L: pass NULL (includes everything except production/sales_consumption)
  -- For KPI: pass {"storage": ["education", "test"], "preparation": ["education", "test"]}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revenue NUMERIC := 0;
  v_sales_cogs NUMERIC := 0;
  v_spoilage_total NUMERIC := 0;
  v_spoilage_expired NUMERIC := 0;
  v_spoilage_spoiled NUMERIC := 0;
  v_spoilage_other NUMERIC := 0;
  v_shortage NUMERIC := 0;
  v_surplus NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_storage_excluded TEXT[];
  v_prep_excluded TEXT[];
BEGIN
  -- Validate department
  IF p_department IS NOT NULL AND p_department NOT IN ('kitchen', 'bar') THEN
    RAISE EXCEPTION 'Invalid department: %. Must be kitchen, bar, or NULL', p_department;
  END IF;

  -- Parse excluded reasons
  -- Always exclude production_consumption and sales_consumption (already in Sales COGS)
  v_storage_excluded := ARRAY['production_consumption', 'sales_consumption'];
  v_prep_excluded := ARRAY['production_consumption', 'sales_consumption'];

  -- Add user-defined exclusions (for KPI)
  IF p_excluded_reasons IS NOT NULL THEN
    IF p_excluded_reasons->'storage' IS NOT NULL THEN
      SELECT v_storage_excluded || ARRAY(
        SELECT jsonb_array_elements_text(p_excluded_reasons->'storage')
      ) INTO v_storage_excluded;
    END IF;
    IF p_excluded_reasons->'preparation' IS NOT NULL THEN
      SELECT v_prep_excluded || ARRAY(
        SELECT jsonb_array_elements_text(p_excluded_reasons->'preparation')
      ) INTO v_prep_excluded;
    END IF;
  END IF;

  -- 1. Revenue and Sales COGS from sales_transactions
  SELECT
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM((actual_cost->>'totalCost')::NUMERIC), 0)
  INTO v_revenue, v_sales_cogs
  FROM sales_transactions
  WHERE sold_at >= p_start_date AND sold_at < p_end_date
    AND (p_department IS NULL OR department = p_department);

  -- 2. Product Spoilage from storage_operations (with reason breakdown)
  SELECT
    COALESCE(SUM(total_value), 0),
    COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'expired' THEN total_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'spoiled' THEN total_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'other' THEN total_value ELSE 0 END), 0)
  INTO v_spoilage_total, v_spoilage_expired, v_spoilage_spoiled, v_spoilage_other
  FROM storage_operations
  WHERE operation_type = 'write_off'
    AND operation_date >= p_start_date AND operation_date < p_end_date
    AND (p_department IS NULL OR department = p_department)
    AND (
      write_off_details->>'reason' IS NULL
      OR NOT (write_off_details->>'reason' = ANY(v_storage_excluded))
    );

  -- 3. Preparation Spoilage from preparation_operations (add to totals)
  SELECT
    v_spoilage_total + COALESCE(SUM(total_value), 0),
    v_spoilage_expired + COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'expired' THEN total_value ELSE 0 END), 0),
    v_spoilage_spoiled + COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'spoiled' THEN total_value ELSE 0 END), 0),
    v_spoilage_other + COALESCE(SUM(CASE WHEN write_off_details->>'reason' IN ('other', 'contaminated', 'overproduced', 'quality_control') THEN total_value ELSE 0 END), 0)
  INTO v_spoilage_total, v_spoilage_expired, v_spoilage_spoiled, v_spoilage_other
  FROM preparation_operations
  WHERE operation_type = 'write_off'
    AND operation_date >= p_start_date AND operation_date < p_end_date
    AND (p_department IS NULL OR department = p_department)
    AND (
      write_off_details->>'reason' IS NULL
      OR NOT (write_off_details->>'reason' = ANY(v_prep_excluded))
    );

  -- 4. Shortage and Surplus from inventory_documents (single optimized query)
  WITH inventory_data AS (
    SELECT
      (item->>'itemId')::uuid as item_id,
      (item->>'valueDifference')::NUMERIC as value_diff
    FROM inventory_documents,
    LATERAL jsonb_array_elements(items) AS item
    WHERE inventory_date >= p_start_date::DATE
      AND inventory_date < p_end_date::DATE
      AND status = 'completed'
  ),
  items_with_dept AS (
    SELECT
      id.value_diff,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department
    FROM inventory_data id
    LEFT JOIN products p ON id.item_id = p.id
  )
  SELECT
    COALESCE(SUM(CASE WHEN value_diff < 0 THEN ABS(value_diff) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value_diff > 0 THEN value_diff ELSE 0 END), 0)
  INTO v_shortage, v_surplus
  FROM items_with_dept
  WHERE p_department IS NULL OR kpi_department = p_department;

  -- 5. Calculate Total COGS
  -- Formula: Total COGS = Sales COGS + Spoilage + Shortage - Surplus
  v_total_cogs := v_sales_cogs + v_spoilage_total + v_shortage - v_surplus;

  -- Return comprehensive breakdown
  RETURN jsonb_build_object(
    'period', jsonb_build_object(
      'startDate', p_start_date::DATE,
      'endDate', p_end_date::DATE
    ),
    'revenue', ROUND(v_revenue, 2),
    'salesCOGS', ROUND(v_sales_cogs, 2),
    'spoilage', jsonb_build_object(
      'total', ROUND(v_spoilage_total, 2),
      'expired', ROUND(v_spoilage_expired, 2),
      'spoiled', ROUND(v_spoilage_spoiled, 2),
      'other', ROUND(v_spoilage_other, 2)
    ),
    'shortage', ROUND(v_shortage, 2),
    'surplus', ROUND(v_surplus, 2),
    'totalCOGS', ROUND(v_total_cogs, 2),
    'totalCOGSPercent', CASE WHEN v_revenue > 0
      THEN ROUND((v_total_cogs / v_revenue) * 100, 2)
      ELSE 0 END,
    'metadata', jsonb_build_object(
      'generatedAt', NOW(),
      'excludedReasons', p_excluded_reasons
    )
  );
END;
$$;

-- Grant access to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_cogs_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cogs_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB) TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
