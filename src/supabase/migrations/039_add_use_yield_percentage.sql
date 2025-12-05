-- Migration: 039_add_use_yield_percentage
-- Description: Add use_yield_percentage field to recipe components and preparation ingredients
-- Date: 2025-12-05
-- Author: Claude

-- CONTEXT:
-- Adding support for yield percentage in recipe cost calculations.
-- When enabled, cost calculation accounts for product waste (peeling, trimming, etc.)
-- Formula: grossQuantity = netQuantity / (yieldPercentage / 100)
-- Example: 100g banana at 65% yield = 154g needed (100g / 0.65)

-- =============================================
-- ADD COLUMNS
-- =============================================

-- Add use_yield_percentage to recipe_components
ALTER TABLE recipe_components
ADD COLUMN IF NOT EXISTS use_yield_percentage BOOLEAN DEFAULT false;

COMMENT ON COLUMN recipe_components.use_yield_percentage IS
'Whether to account for product yield percentage in cost calculations. Only applicable for products (not preparations).';

-- Add use_yield_percentage to preparation_ingredients
ALTER TABLE preparation_ingredients
ADD COLUMN IF NOT EXISTS use_yield_percentage BOOLEAN DEFAULT false;

COMMENT ON COLUMN preparation_ingredients.use_yield_percentage IS
'Whether to account for product yield percentage in cost calculations. Only applicable for products.';

-- =============================================
-- INDEXES (for query performance)
-- =============================================

-- Partial indexes for components with yield enabled
CREATE INDEX IF NOT EXISTS idx_recipe_components_use_yield
ON recipe_components(use_yield_percentage)
WHERE use_yield_percentage = true;

CREATE INDEX IF NOT EXISTS idx_preparation_ingredients_use_yield
ON preparation_ingredients(use_yield_percentage)
WHERE use_yield_percentage = true;

-- =============================================
-- POST-MIGRATION VALIDATION
-- =============================================

-- Verify columns exist
DO $$
BEGIN
  -- Check recipe_components.use_yield_percentage
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recipe_components'
      AND column_name = 'use_yield_percentage'
  ) THEN
    RAISE EXCEPTION 'Column recipe_components.use_yield_percentage not created';
  END IF;

  -- Check preparation_ingredients.use_yield_percentage
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preparation_ingredients'
      AND column_name = 'use_yield_percentage'
  ) THEN
    RAISE EXCEPTION 'Column preparation_ingredients.use_yield_percentage not created';
  END IF;

  RAISE NOTICE 'Migration 039 completed successfully';
END $$;

-- =============================================
-- NOTES
-- =============================================

-- This migration is backward compatible:
-- - Existing records default to use_yield_percentage = false (no yield adjustment)
-- - New records created by old code will use default value (false)
-- - Frontend will set use_yield_percentage = true for products with yield < 100%
--
-- No data migration needed - all existing records remain unchanged.
