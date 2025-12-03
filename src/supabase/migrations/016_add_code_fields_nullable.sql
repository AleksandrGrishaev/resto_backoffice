-- Migration: Add nullable code fields with unique constraints
-- Description: Add code field to products, preparations, and recipes tables
-- Date: 2025-12-03
-- Author: Claude

-- CONTEXT:
-- Need to support legacy code-based imports (M-1, V-25, P-16, R-1, etc.)
-- Existing data will have NULL codes
-- New imports will use codes for deduplication via ON CONFLICT (code)

BEGIN;

-- ============================================================================
-- Add code field to products table
-- ============================================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS code TEXT NULL;

-- Create unique index for non-null codes
CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique
  ON products(code)
  WHERE code IS NOT NULL;

COMMENT ON COLUMN products.code IS 'Legacy product code (e.g., M-1, V-25, D-3). NULL for existing products.';


-- ============================================================================
-- Add code field to preparations table (if not exists)
-- ============================================================================
-- Note: preparations table might already have code field from previous migrations
ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS code TEXT NULL;

-- Create unique index for non-null codes
CREATE UNIQUE INDEX IF NOT EXISTS preparations_code_unique
  ON preparations(code)
  WHERE code IS NOT NULL;

COMMENT ON COLUMN preparations.code IS 'Legacy preparation code (e.g., P-1, P-16, P-28). NULL for existing preparations.';


-- ============================================================================
-- Add code field to recipes table (if not exists)
-- ============================================================================
-- Note: recipes table might already have code field from previous migrations
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS code TEXT NULL;

-- Create unique index for non-null codes
CREATE UNIQUE INDEX IF NOT EXISTS recipes_code_unique
  ON recipes(code)
  WHERE code IS NOT NULL;

COMMENT ON COLUMN recipes.code IS 'Legacy recipe code (e.g., R-1, R-7, R-30). NULL for existing recipes.';


-- ============================================================================
-- Verification
-- ============================================================================
-- Check that existing data has NULL codes
DO $$
DECLARE
  prod_count INTEGER;
  prep_count INTEGER;
  recipe_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO prod_count FROM products WHERE code IS NOT NULL;
  SELECT COUNT(*) INTO prep_count FROM preparations WHERE code IS NOT NULL;
  SELECT COUNT(*) INTO recipe_count FROM recipes WHERE code IS NOT NULL;

  RAISE NOTICE 'Products with code: %', prod_count;
  RAISE NOTICE 'Preparations with code: %', prep_count;
  RAISE NOTICE 'Recipes with code: %', recipe_count;
END $$;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Added nullable code fields to: products, preparations, recipes
-- ✅ Created unique partial indexes (only for non-null codes)
-- ✅ Existing data will have code = NULL
-- ✅ New imports can use ON CONFLICT (code) DO NOTHING
--
-- NEXT STEPS:
-- 1. Apply this migration to production database
-- 2. Run test migration: test_3_recipes_full_chain.sql
-- 3. Verify code-based deduplication works
-- ============================================================================
