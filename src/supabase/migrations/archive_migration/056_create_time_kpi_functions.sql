-- Migration: 056_create_time_kpi_functions
-- Description: RPC functions for Kitchen Time KPI aggregation
-- Date: 2025-01-XX

-- ===========================================
-- FUNCTION 1: Summary aggregation for dashboard
-- Returns aggregated time KPI by date and department
-- ===========================================
CREATE OR REPLACE FUNCTION get_kitchen_time_kpi_summary(
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE,
  p_department TEXT DEFAULT NULL
)
RETURNS TABLE (
  period_date DATE,
  department TEXT,
  avg_waiting_seconds NUMERIC,
  avg_cooking_seconds NUMERIC,
  avg_total_seconds NUMERIC,
  items_completed INTEGER,
  items_exceeded_plan INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(oi.ready_at) as period_date,
    oi.department,
    COALESCE(AVG(EXTRACT(EPOCH FROM (oi.cooking_started_at - oi.sent_to_kitchen_at))), 0)::NUMERIC as avg_waiting_seconds,
    COALESCE(AVG(EXTRACT(EPOCH FROM (oi.ready_at - oi.cooking_started_at))), 0)::NUMERIC as avg_cooking_seconds,
    COALESCE(AVG(EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at))), 0)::NUMERIC as avg_total_seconds,
    COUNT(*)::INTEGER as items_completed,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at)) >
      CASE WHEN oi.department = 'bar' THEN 300 ELSE 900 END)::INTEGER as items_exceeded_plan
  FROM order_items oi
  WHERE oi.status IN ('ready', 'served')
    AND oi.ready_at IS NOT NULL
    AND oi.sent_to_kitchen_at IS NOT NULL
    AND DATE(oi.ready_at) BETWEEN p_date_from AND p_date_to
    AND (p_department IS NULL OR oi.department = p_department)
  GROUP BY DATE(oi.ready_at), oi.department
  ORDER BY period_date DESC, department;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- FUNCTION 2: Detail list for dish table
-- Returns individual item timing details
-- ===========================================
CREATE OR REPLACE FUNCTION get_kitchen_time_kpi_detail(
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE,
  p_department TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  item_id UUID,
  order_id UUID,
  order_number TEXT,
  product_name TEXT,
  department TEXT,
  waiting_seconds INTEGER,
  cooking_seconds INTEGER,
  total_seconds INTEGER,
  exceeded_plan BOOLEAN,
  ready_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.id as item_id,
    oi.order_id,
    o.order_number,
    oi.menu_item_name as product_name,
    oi.department,
    COALESCE(EXTRACT(EPOCH FROM (oi.cooking_started_at - oi.sent_to_kitchen_at)), 0)::INTEGER as waiting_seconds,
    COALESCE(EXTRACT(EPOCH FROM (oi.ready_at - oi.cooking_started_at)), 0)::INTEGER as cooking_seconds,
    COALESCE(EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at)), 0)::INTEGER as total_seconds,
    (EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at)) >
      CASE WHEN oi.department = 'bar' THEN 300 ELSE 900 END) as exceeded_plan,
    oi.ready_at
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.status IN ('ready', 'served')
    AND oi.ready_at IS NOT NULL
    AND oi.sent_to_kitchen_at IS NOT NULL
    AND DATE(oi.ready_at) BETWEEN p_date_from AND p_date_to
    AND (p_department IS NULL OR oi.department = p_department)
  ORDER BY oi.ready_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- FUNCTION 3: Today's realtime summary (no grouping)
-- For dashboard cards showing current day totals
-- ===========================================
CREATE OR REPLACE FUNCTION get_kitchen_time_kpi_today(
  p_department TEXT DEFAULT NULL
)
RETURNS TABLE (
  department TEXT,
  avg_waiting_seconds NUMERIC,
  avg_cooking_seconds NUMERIC,
  avg_total_seconds NUMERIC,
  items_completed INTEGER,
  items_exceeded_plan INTEGER,
  exceeded_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(oi.department, 'kitchen') as department,
    COALESCE(AVG(EXTRACT(EPOCH FROM (oi.cooking_started_at - oi.sent_to_kitchen_at))), 0)::NUMERIC as avg_waiting_seconds,
    COALESCE(AVG(EXTRACT(EPOCH FROM (oi.ready_at - oi.cooking_started_at))), 0)::NUMERIC as avg_cooking_seconds,
    COALESCE(AVG(EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at))), 0)::NUMERIC as avg_total_seconds,
    COUNT(*)::INTEGER as items_completed,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at)) >
      CASE WHEN oi.department = 'bar' THEN 300 ELSE 900 END)::INTEGER as items_exceeded_plan,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at)) >
          CASE WHEN oi.department = 'bar' THEN 300 ELSE 900 END)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as exceeded_rate
  FROM order_items oi
  WHERE oi.status IN ('ready', 'served')
    AND oi.ready_at IS NOT NULL
    AND oi.sent_to_kitchen_at IS NOT NULL
    AND DATE(oi.ready_at) = CURRENT_DATE
    AND (p_department IS NULL OR oi.department = p_department)
  GROUP BY oi.department
  ORDER BY department;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_kitchen_time_kpi_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_kitchen_time_kpi_detail TO authenticated;
GRANT EXECUTE ON FUNCTION get_kitchen_time_kpi_today TO authenticated;
