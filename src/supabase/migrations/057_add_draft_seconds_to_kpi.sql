-- Migration: 057_add_draft_seconds_to_kpi
-- Description: Add draft_seconds to time KPI detail function (time from item created to sent to kitchen)
-- Date: 2025-12-12

-- First drop the existing function (cannot change return type)
DROP FUNCTION IF EXISTS get_kitchen_time_kpi_detail(DATE, DATE, TEXT, INTEGER, INTEGER);

-- ===========================================
-- Recreate FUNCTION with draft_seconds
-- draft_seconds = sent_to_kitchen_at - created_at
-- This tracks how long waiter held the order before sending to kitchen
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
  draft_seconds INTEGER,
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
    COALESCE(EXTRACT(EPOCH FROM (oi.sent_to_kitchen_at - oi.created_at)), 0)::INTEGER as draft_seconds,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_kitchen_time_kpi_detail TO authenticated;
