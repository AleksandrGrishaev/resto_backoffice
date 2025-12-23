-- Migration: 070_create_products_consumption_stats_function
-- Description: Create RPC function to calculate product consumption statistics
-- Date: 2025-12-17
-- Author: Claude Code

-- CONTEXT: Kitchen Request system needs consumption data to generate smart order suggestions
-- This function analyzes recipe_write_offs to calculate average daily consumption per product
-- Used by SupplierStorageIntegration.getConsumptionData() for reorder point calculations

-- PRE-MIGRATION VALIDATION
DO $$
BEGIN
  -- Check that recipe_write_offs table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'recipe_write_offs'
  ) THEN
    RAISE EXCEPTION 'Table recipe_write_offs does not exist. Cannot create consumption stats function.';
  END IF;

  -- Check that required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'recipe_write_offs'
    AND column_name = 'write_off_items'
  ) THEN
    RAISE EXCEPTION 'Column write_off_items not found in recipe_write_offs table.';
  END IF;
END $$;

-- ACTUAL CHANGES

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS get_products_consumption_stats(INTEGER);

-- Create function to calculate average daily consumption per product
CREATE OR REPLACE FUNCTION get_products_consumption_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  product_id TEXT,
  avg_daily_consumption NUMERIC,
  total_consumption NUMERIC,
  consumption_days BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate consumption from recipe_write_offs
  -- Extract product_id and quantity from write_off_items JSONB array
  -- Formula: avg_daily_consumption = total_consumption / days_back
  RETURN QUERY
  SELECT
    (item->>'productId')::TEXT as product_id,
    ROUND(SUM((item->>'quantity')::NUMERIC) / GREATEST(days_back, 1), 4) as avg_daily_consumption,
    SUM((item->>'quantity')::NUMERIC) as total_consumption,
    COUNT(DISTINCT DATE(rwo.performed_at)) as consumption_days
  FROM recipe_write_offs rwo,
       jsonb_array_elements(rwo.write_off_items) as item
  WHERE rwo.performed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND rwo.operation_type = 'recipe_writeoff'
    AND item->>'productId' IS NOT NULL
    AND (item->>'quantity')::NUMERIC > 0
  GROUP BY (item->>'productId')::TEXT
  HAVING SUM((item->>'quantity')::NUMERIC) > 0
  ORDER BY avg_daily_consumption DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_products_consumption_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_consumption_stats(INTEGER) TO anon;

-- Add documentation comment
COMMENT ON FUNCTION get_products_consumption_stats IS
'Calculate average daily consumption for products based on recipe write-offs over a specified period.
Used by Kitchen Request system for smart ordering suggestions with consumption-based reorder points.
Parameters:
  - days_back: Number of days to look back (default: 7)
Returns:
  - product_id: Product identifier
  - avg_daily_consumption: Average quantity consumed per day
  - total_consumption: Total quantity consumed in period
  - consumption_days: Number of distinct days with consumption';

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  -- Verify function was created
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_products_consumption_stats'
  ) INTO func_exists;

  IF NOT func_exists THEN
    RAISE EXCEPTION 'Function get_products_consumption_stats was not created successfully.';
  END IF;

  RAISE NOTICE 'Migration 070 completed successfully. Function get_products_consumption_stats is ready.';
END $$;
