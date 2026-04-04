-- Migration: 284_production_recommendations_v2
-- Description: Production Recommendations v2
--   - New columns: max_daily_usage, am_max_usage (7-16), pm_max_usage (16-22)
--   - RPC v2: recalculate_consumption_stats with 3-day lookback, AM/PM split
--   - 3 rituals: morning (shelf_life<=1 AM), afternoon (shelf_life<=1 PM), evening (shelf_life>1)
-- Date: 2026-04-04

-- ===== SCHEMA =====

ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS max_daily_usage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS am_max_usage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pm_max_usage NUMERIC DEFAULT 0;

-- ===== RPC =====

CREATE OR REPLACE FUNCTION recalculate_consumption_stats(
  p_lookback_days INTEGER DEFAULT 3,
  p_safety_factor NUMERIC DEFAULT 1.5,
  p_reorder_days INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_days_found INTEGER;
  v_cutoff_date DATE;
  v_products_updated INTEGER := 0;
  v_preparations_updated INTEGER := 0;
BEGIN
  -- Find last N active business days
  SELECT d INTO v_cutoff_date
  FROM (
    SELECT DISTINCT (performed_at AT TIME ZONE 'Asia/Makassar')::date as d
    FROM recipe_write_offs
    WHERE performed_at IS NOT NULL
    ORDER BY d DESC
    LIMIT p_lookback_days
  ) recent_days
  ORDER BY d ASC
  LIMIT 1;

  IF v_cutoff_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active days found');
  END IF;

  SELECT COUNT(DISTINCT (performed_at AT TIME ZONE 'Asia/Makassar')::date)
  INTO v_active_days_found
  FROM recipe_write_offs
  WHERE (performed_at AT TIME ZONE 'Asia/Makassar')::date >= v_cutoff_date;

  -- Products: avg + max
  WITH daily_product AS (
    SELECT item->>'productId' as product_id,
      (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date as day,
      SUM((item->>'quantity')::numeric) as daily_total
    FROM recipe_write_offs rw, jsonb_array_elements(decomposed_items) as item
    WHERE (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date >= v_cutoff_date
      AND item->>'type' = 'product' AND item->>'productId' IS NOT NULL
      AND (item->>'quantity')::numeric > 0
    GROUP BY item->>'productId', (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date
  ),
  product_stats AS (
    SELECT product_id,
      ROUND(AVG(daily_total), 2) as avg_daily,
      ROUND(MAX(daily_total), 2) as max_daily
    FROM daily_product GROUP BY product_id
  )
  UPDATE products p SET
    avg_daily_usage = ps.avg_daily,
    min_stock = CASE WHEN COALESCE(p.min_stock, 0) = 0
      THEN ROUND(ps.max_daily * p_reorder_days * p_safety_factor) ELSE p.min_stock END,
    max_stock = CASE WHEN p.max_stock IS NULL
      THEN ROUND(ps.max_daily * p_reorder_days * p_safety_factor * 2) ELSE p.max_stock END
  FROM product_stats ps WHERE p.id = ps.product_id::uuid;
  GET DIAGNOSTICS v_products_updated = ROW_COUNT;

  -- Preparations: avg + max + AM(7-16)/PM(16-22) split
  WITH daily_prep AS (
    SELECT item->>'preparationId' as preparation_id,
      (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date as day,
      SUM((item->>'quantity')::numeric) as daily_total,
      SUM(CASE
        WHEN EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') >= 7
         AND EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') < 16
        THEN (item->>'quantity')::numeric ELSE 0 END) as am_total,
      SUM(CASE
        WHEN EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') >= 16
         AND EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') < 22
        THEN (item->>'quantity')::numeric ELSE 0 END) as pm_total
    FROM recipe_write_offs rw, jsonb_array_elements(decomposed_items) as item
    WHERE (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date >= v_cutoff_date
      AND item->>'type' = 'preparation' AND item->>'preparationId' IS NOT NULL
      AND (item->>'quantity')::numeric > 0
    GROUP BY item->>'preparationId', (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date
  ),
  prep_stats AS (
    SELECT preparation_id,
      ROUND(AVG(daily_total), 2) as avg_daily,
      ROUND(MAX(daily_total), 2) as max_daily,
      ROUND(MAX(am_total), 2) as am_max,
      ROUND(MAX(pm_total), 2) as pm_max
    FROM daily_prep GROUP BY preparation_id
  )
  UPDATE preparations pr SET
    avg_daily_usage = ps.avg_daily,
    max_daily_usage = ps.max_daily,
    am_max_usage = ps.am_max,
    pm_max_usage = ps.pm_max,
    min_stock_threshold = CASE WHEN COALESCE(pr.min_stock_threshold, 0) = 0
      THEN ROUND(ps.max_daily * p_safety_factor) ELSE pr.min_stock_threshold END,
    daily_target_quantity = CASE WHEN COALESCE(pr.daily_target_quantity, 0) = 0
      THEN ROUND(ps.max_daily * p_safety_factor) ELSE pr.daily_target_quantity END
  FROM prep_stats ps WHERE pr.id = ps.preparation_id::uuid;
  GET DIAGNOSTICS v_preparations_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'activeDaysUsed', v_active_days_found,
    'lookbackDays', p_lookback_days,
    'cutoffDate', v_cutoff_date,
    'productsUpdated', v_products_updated,
    'preparationsUpdated', v_preparations_updated
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_consumption_stats TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_consumption_stats TO service_role;
