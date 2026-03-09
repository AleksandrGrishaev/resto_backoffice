-- Function: recalculate_consumption_stats
-- Description: Calculate avg_daily_usage from recipe_write_offs decomposed_items
--              and auto-fill min_stock/max_stock for products and preparations
--
-- Parameters:
--   p_lookback_days (default 30) - How many days back to analyze
--   p_safety_factor (default 1.5) - Multiplier for min_stock (1.5 = 50% buffer)
--   p_reorder_days (default 3) - Days of stock for min_stock calculation
--
-- Usage:
--   SELECT recalculate_consumption_stats();  -- defaults
--   SELECT recalculate_consumption_stats(60, 2.0, 5);  -- custom
--
-- Logic:
--   1. Counts active business days in the lookback period
--   2. Aggregates product consumption from recipe_write_offs.decomposed_items
--   3. Calculates avg_daily_usage = total_consumed / active_days
--   4. Updates products: avg_daily_usage, min_stock (if 0), max_stock (if NULL)
--   5. Updates preparations: avg_daily_usage, min_stock_threshold (if 0), daily_target_quantity (if 0)
--
-- min_stock formula: avg_daily * reorder_days * safety_factor
-- max_stock formula: min_stock * 2
-- daily_target_quantity: avg_daily * safety_factor
--
-- Returns JSONB: { success, activeDays, productsUpdated, preparationsUpdated }

CREATE OR REPLACE FUNCTION recalculate_consumption_stats(
  p_lookback_days INTEGER DEFAULT 30,
  p_safety_factor NUMERIC DEFAULT 1.5,
  p_reorder_days INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
  v_active_days INTEGER;
  v_products_updated INTEGER := 0;
  v_preparations_updated INTEGER := 0;
BEGIN
  v_cutoff_date := NOW() - (p_lookback_days || ' days')::INTERVAL;

  SELECT COUNT(DISTINCT performed_at::date)
  INTO v_active_days
  FROM recipe_write_offs
  WHERE performed_at >= v_cutoff_date;

  IF v_active_days < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough data: only ' || v_active_days || ' active days found'
    );
  END IF;

  -- PRODUCT CONSUMPTION (from decomposed recipe write-offs)
  WITH product_consumption AS (
    SELECT
      item->>'productId' as product_id,
      SUM((item->>'quantity')::numeric) as total_consumed
    FROM recipe_write_offs rw,
         jsonb_array_elements(decomposed_items) as item
    WHERE rw.performed_at >= v_cutoff_date
      AND item->>'type' = 'product'
      AND item->>'productId' IS NOT NULL
      AND (item->>'quantity')::numeric > 0
    GROUP BY item->>'productId'
  ),
  product_daily AS (
    SELECT
      product_id,
      ROUND(total_consumed / v_active_days, 2) as avg_daily
    FROM product_consumption
  )
  UPDATE products p
  SET
    avg_daily_usage = pd.avg_daily,
    min_stock = CASE
      WHEN COALESCE(p.min_stock, 0) = 0
      THEN ROUND(pd.avg_daily * p_reorder_days * p_safety_factor)
      ELSE p.min_stock
    END,
    max_stock = CASE
      WHEN p.max_stock IS NULL
      THEN ROUND(pd.avg_daily * p_reorder_days * p_safety_factor * 2)
      ELSE p.max_stock
    END
  FROM product_daily pd
  WHERE p.id = pd.product_id::uuid;

  GET DIAGNOSTICS v_products_updated = ROW_COUNT;

  -- PREPARATION CONSUMPTION
  WITH prep_consumption AS (
    SELECT
      item->>'preparationId' as preparation_id,
      SUM((item->>'quantity')::numeric) as total_consumed
    FROM recipe_write_offs rw,
         jsonb_array_elements(decomposed_items) as item
    WHERE rw.performed_at >= v_cutoff_date
      AND item->>'type' = 'preparation'
      AND item->>'preparationId' IS NOT NULL
      AND (item->>'quantity')::numeric > 0
    GROUP BY item->>'preparationId'
  ),
  prep_daily AS (
    SELECT
      preparation_id,
      ROUND(total_consumed / v_active_days, 2) as avg_daily
    FROM prep_consumption
  )
  UPDATE preparations pr
  SET
    avg_daily_usage = pd.avg_daily,
    min_stock_threshold = CASE
      WHEN COALESCE(pr.min_stock_threshold, 0) = 0
      THEN ROUND(pd.avg_daily * p_safety_factor)
      ELSE pr.min_stock_threshold
    END,
    daily_target_quantity = CASE
      WHEN COALESCE(pr.daily_target_quantity, 0) = 0
      THEN ROUND(pd.avg_daily * p_safety_factor)
      ELSE pr.daily_target_quantity
    END
  FROM prep_daily pd
  WHERE pr.id = pd.preparation_id::uuid;

  GET DIAGNOSTICS v_preparations_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'activeDays', v_active_days,
    'lookbackDays', p_lookback_days,
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
