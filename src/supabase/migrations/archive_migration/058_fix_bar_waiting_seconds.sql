-- Migration: 058_fix_bar_waiting_seconds
-- Description: Fix waiting_seconds calculation for bar items where cooking_started_at is NULL
-- Date: 2025-12-12
--
-- Problem: Bar items go directly from waiting → ready (no cooking step)
-- so cooking_started_at is NULL. Current logic returns 0 for both waiting and cooking.
--
-- Solution: When cooking_started_at is NULL, waiting_seconds = total time (ready_at - sent_to_kitchen_at)

DROP FUNCTION IF EXISTS get_kitchen_time_kpi_detail(DATE, DATE, TEXT, INTEGER, INTEGER);

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
    -- Draft time: created → sent_to_kitchen
    COALESCE(EXTRACT(EPOCH FROM (oi.sent_to_kitchen_at - oi.created_at)), 0)::INTEGER as draft_seconds,
    -- Waiting time:
    --   If cooking_started_at IS NULL (bar flow): waiting = total time
    --   Otherwise: waiting = cooking_started_at - sent_to_kitchen_at
    CASE
      WHEN oi.cooking_started_at IS NULL THEN
        COALESCE(EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at)), 0)::INTEGER
      ELSE
        COALESCE(EXTRACT(EPOCH FROM (oi.cooking_started_at - oi.sent_to_kitchen_at)), 0)::INTEGER
    END as waiting_seconds,
    -- Cooking time:
    --   If cooking_started_at IS NULL (bar flow): cooking = 0
    --   Otherwise: cooking = ready_at - cooking_started_at
    CASE
      WHEN oi.cooking_started_at IS NULL THEN 0
      ELSE COALESCE(EXTRACT(EPOCH FROM (oi.ready_at - oi.cooking_started_at)), 0)::INTEGER
    END as cooking_seconds,
    -- Total time: always ready_at - sent_to_kitchen_at
    COALESCE(EXTRACT(EPOCH FROM (oi.ready_at - oi.sent_to_kitchen_at)), 0)::INTEGER as total_seconds,
    -- Exceeded plan
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
