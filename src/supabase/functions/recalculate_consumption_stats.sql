-- Function: recalculate_consumption_stats (v2)
-- Description: Calculate consumption stats from recipe_write_offs decomposed_items
--   - avg_daily_usage: average over last N active days
--   - max_daily_usage: max single-day consumption over last N active days
--   - am_max_usage: max AM (7-16 WITA) consumption over last N active days
--   - pm_max_usage: max PM (16-22 WITA) consumption over last N active days
--   - Auto-fill min_stock/daily_target from max (not avg)
--
-- Parameters:
--   p_lookback_days (default 3) - How many ACTIVE BUSINESS DAYS to analyze (changed from 30)
--   p_safety_factor (default 1.5) - Multiplier for min_stock
--   p_reorder_days (default 3) - Days of stock for min_stock calculation
--
-- Usage:
--   SELECT recalculate_consumption_stats();  -- defaults (3 active days)
--   SELECT recalculate_consumption_stats(7, 1.5, 3);  -- 7 active days
--
-- Returns JSONB: { success, activeDaysUsed, productsUpdated, preparationsUpdated }

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

  -- Step 1: Find last N active business days (days with write-offs)
  -- We get the Nth most recent active day as our cutoff
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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active days found in recipe_write_offs'
    );
  END IF;

  -- Count how many active days we actually have
  SELECT COUNT(DISTINCT (performed_at AT TIME ZONE 'Asia/Makassar')::date)
  INTO v_active_days_found
  FROM recipe_write_offs
  WHERE (performed_at AT TIME ZONE 'Asia/Makassar')::date >= v_cutoff_date;

  IF v_active_days_found < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough data: ' || v_active_days_found || ' active days found'
    );
  END IF;

  -- ===== PRODUCT CONSUMPTION =====
  WITH daily_product AS (
    SELECT
      item->>'productId' as product_id,
      (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date as day,
      SUM((item->>'quantity')::numeric) as daily_total
    FROM recipe_write_offs rw,
         jsonb_array_elements(decomposed_items) as item
    WHERE (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date >= v_cutoff_date
      AND item->>'type' = 'product'
      AND item->>'productId' IS NOT NULL
      AND (item->>'quantity')::numeric > 0
    GROUP BY item->>'productId', (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date
  ),
  product_stats AS (
    SELECT
      product_id,
      ROUND(AVG(daily_total), 2) as avg_daily,
      ROUND(MAX(daily_total), 2) as max_daily
    FROM daily_product
    GROUP BY product_id
  )
  UPDATE products p
  SET
    avg_daily_usage = ps.avg_daily,
    min_stock = CASE
      WHEN COALESCE(p.min_stock, 0) = 0
      THEN ROUND(ps.max_daily * p_reorder_days * p_safety_factor)
      ELSE p.min_stock
    END,
    max_stock = CASE
      WHEN p.max_stock IS NULL
      THEN ROUND(ps.max_daily * p_reorder_days * p_safety_factor * 2)
      ELSE p.max_stock
    END
  FROM product_stats ps
  WHERE p.id = ps.product_id::uuid;

  GET DIAGNOSTICS v_products_updated = ROW_COUNT;

  -- ===== PREPARATION CONSUMPTION =====
  -- Daily totals + AM/PM split per day
  WITH daily_prep AS (
    SELECT
      item->>'preparationId' as preparation_id,
      (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date as day,
      SUM((item->>'quantity')::numeric) as daily_total,
      SUM(CASE
        WHEN EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') >= 7
         AND EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') < 16
        THEN (item->>'quantity')::numeric ELSE 0
      END) as am_total,
      SUM(CASE
        WHEN EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') >= 16
         AND EXTRACT(HOUR FROM rw.performed_at AT TIME ZONE 'Asia/Makassar') < 22
        THEN (item->>'quantity')::numeric ELSE 0
      END) as pm_total
    FROM recipe_write_offs rw,
         jsonb_array_elements(decomposed_items) as item
    WHERE (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date >= v_cutoff_date
      AND item->>'type' = 'preparation'
      AND item->>'preparationId' IS NOT NULL
      AND (item->>'quantity')::numeric > 0
    GROUP BY item->>'preparationId', (rw.performed_at AT TIME ZONE 'Asia/Makassar')::date
  ),
  prep_stats AS (
    SELECT
      preparation_id,
      ROUND(AVG(daily_total), 2) as avg_daily,
      ROUND(MAX(daily_total), 2) as max_daily,
      ROUND(MAX(am_total), 2) as am_max,
      ROUND(MAX(pm_total), 2) as pm_max
    FROM daily_prep
    GROUP BY preparation_id
  )
  UPDATE preparations pr
  SET
    avg_daily_usage = ps.avg_daily,
    max_daily_usage = ps.max_daily,
    am_max_usage = ps.am_max,
    pm_max_usage = ps.pm_max,
    min_stock_threshold = CASE
      WHEN COALESCE(pr.min_stock_threshold, 0) = 0
      THEN ROUND(ps.max_daily * p_safety_factor)
      ELSE pr.min_stock_threshold
    END,
    daily_target_quantity = CASE
      WHEN COALESCE(pr.daily_target_quantity, 0) = 0
      THEN ROUND(ps.max_daily * p_safety_factor)
      ELSE pr.daily_target_quantity
    END
  FROM prep_stats ps
  WHERE pr.id = ps.preparation_id::uuid;

  GET DIAGNOSTICS v_preparations_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'activeDaysUsed', v_active_days_found,
    'lookbackDays', p_lookback_days,
    'cutoffDate', v_cutoff_date,
    'safetyFactor', p_safety_factor,
    'reorderDays', p_reorder_days,
    'productsUpdated', v_products_updated,
    'preparationsUpdated', v_preparations_updated
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_consumption_stats TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_consumption_stats TO service_role;
