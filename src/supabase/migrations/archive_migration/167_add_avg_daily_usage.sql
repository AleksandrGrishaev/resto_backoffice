-- Migration: 167_add_avg_daily_usage
-- Description: Add avg_daily_usage to products and preparations for consumption tracking
-- Date: 2026-03-07

-- Products: add avg_daily_usage (in base units: gram/ml/piece per day)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS avg_daily_usage NUMERIC DEFAULT 0;

COMMENT ON COLUMN products.avg_daily_usage IS 'Average daily consumption in base units (gram/ml/piece), calculated from recipe_write_offs';

-- Preparations: add avg_daily_usage (in base units per day)
ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS avg_daily_usage NUMERIC DEFAULT 0;

COMMENT ON COLUMN preparations.avg_daily_usage IS 'Average daily consumption in base units, calculated from recipe_write_offs';
