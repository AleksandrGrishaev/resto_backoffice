-- Migration: 060_update_food_cost_kpi_inventory_dept
-- Description: Update Food Cost KPI function to filter Shortage/Surplus by product's primary department
-- Date: 2025-12-12
--
-- CONTEXT:
-- Products can be used in both Kitchen and Bar (usedInDepartments: ['kitchen', 'bar']).
-- For inventory corrections (shortage/surplus), we need to assign COGS to the primary department.
-- Primary department = first element of products.used_in_departments array.
--
-- CHANGES:
-- - Shortage/Surplus now filtered by product's primary department (used_in_departments[1])
-- - items JSONB is unpacked to get itemId for each inventory item
-- - JOIN with products table to get primary department

-- Drop existing function first
DROP FUNCTION IF EXISTS get_food_cost_kpi_month(DATE, TEXT);

-- Recreate function with department filtering for inventory
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
  -- Department is determined by menu_item -> order_item -> sales_transaction
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
  -- Department is determined by who performs the write-off (storage_operations.department)
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
  -- Department is determined by product's primary department (used_in_departments[1])
  -- Items are stored in JSONB array, need to unpack and join with products
  WITH inventory_items AS (
    SELECT
      id.id as doc_id,
      (item->>'itemId')::uuid as item_id,
      (item->>'valueDifference')::NUMERIC as value_difference
    FROM inventory_documents id,
    LATERAL jsonb_array_elements(id.items) AS item
    WHERE id.inventory_date >= v_start_date::DATE
      AND id.inventory_date < v_end_date::DATE
      AND id.status = 'completed'
  ),
  items_with_dept AS (
    SELECT
      ii.doc_id,
      ii.item_id,
      ii.value_difference,
      -- Primary department = first element of used_in_departments (PostgreSQL arrays are 1-indexed)
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department
    FROM inventory_items ii
    LEFT JOIN products p ON ii.item_id = p.id
  )
  SELECT COALESCE(SUM(
    CASE WHEN value_difference < 0 THEN ABS(value_difference) ELSE 0 END
  ), 0)
  INTO v_shortage
  FROM items_with_dept
  WHERE (p_department IS NULL OR kpi_department = p_department);

  -- 4. Calculate Surplus from inventory corrections (positive discrepancies)
  -- Same logic as shortage but for positive differences
  WITH inventory_items AS (
    SELECT
      id.id as doc_id,
      (item->>'itemId')::uuid as item_id,
      (item->>'valueDifference')::NUMERIC as value_difference
    FROM inventory_documents id,
    LATERAL jsonb_array_elements(id.items) AS item
    WHERE id.inventory_date >= v_start_date::DATE
      AND id.inventory_date < v_end_date::DATE
      AND id.status = 'completed'
  ),
  items_with_dept AS (
    SELECT
      ii.doc_id,
      ii.item_id,
      ii.value_difference,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department
    FROM inventory_items ii
    LEFT JOIN products p ON ii.item_id = p.id
  )
  SELECT COALESCE(SUM(
    CASE WHEN value_difference > 0 THEN value_difference ELSE 0 END
  ), 0)
  INTO v_surplus
  FROM items_with_dept
  WHERE (p_department IS NULL OR kpi_department = p_department);

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
COMMENT ON FUNCTION get_food_cost_kpi_month IS 'Get Food Cost KPI metrics for a specific month.
Returns revenue, COGS breakdown (Sales COGS, Spoilage, Shortage, Surplus), and total COGS percentage.

Department assignment rules:
- Sales COGS: From menu_item.department
- Spoilage: From storage_operations.department (who performs write-off)
- Shortage/Surplus: From products.used_in_departments[1] (primary department)';
