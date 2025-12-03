-- Migration: Add nullable code fields to products, preparations, recipes
-- Description: Add code field for legacy imports (M-1, V-25, P-16, R-1, etc.)
--              Also ensure all required categories exist for test migrations
-- Date: 2025-12-03
-- Author: Claude

-- CONTEXT:
-- Need to support legacy code-based imports (M-1, V-25, D-3, H-5, P-16, R-1, etc.)
-- Existing data will have NULL codes
-- New imports will use codes for deduplication via ON CONFLICT (code)

BEGIN;

-- ============================================================================
-- SECTION 1: Ensure Product Categories exist
-- ============================================================================
INSERT INTO product_categories (key, name, color, icon, sort_order, is_active) VALUES
  ('beverages', 'Beverages', 'blue', 'mdi-cup', 1, true),
  ('bakery', 'Bakery', 'orange', 'mdi-baguette', 2, true),
  ('condiments', 'Condiments & Oils', 'amber', 'mdi-bottle-wine', 3, true),
  ('dairy', 'Dairy', 'cyan', 'mdi-cheese', 4, true),
  ('herbs_spices', 'Herbs & Spices', 'green', 'mdi-leaf', 5, true),
  ('meat', 'Meat', 'red', 'mdi-food-steak', 6, true),
  ('seafood', 'Seafood', 'light-blue', 'mdi-fish', 7, true),
  ('vegetables', 'Vegetables', 'light-green', 'mdi-carrot', 8, true),
  ('herbs', 'Fresh Herbs', 'teal', 'mdi-sprout', 9, true),
  ('staples', 'Staples & Grains', 'brown', 'mdi-grain', 10, true)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SECTION 2: Ensure Preparation Categories exist
-- ============================================================================
INSERT INTO preparation_categories (key, name, description, icon, emoji, color, sort_order, is_active) VALUES
  ('side_dish', 'Side Dishes', 'Side dishes and accompaniments', 'mdi-food-variant', '🍚', 'orange', 1, true),
  ('sauce', 'Sauces', 'Prepared sauces and dressings', 'mdi-bottle-tonic', '🥫', 'red', 2, true),
  ('seafood_prep', 'Seafood Preparations', 'Thawed and portioned seafood', 'mdi-fish', '🐟', 'light-blue', 3, true),
  ('meat_prep', 'Meat Preparations', 'Thawed and portioned meat', 'mdi-food-steak', '🥩', 'red-darken-2', 4, true),
  ('vegetable_prep', 'Vegetable Preparations', 'Washed, sliced, and prepared vegetables', 'mdi-carrot', '🥬', 'light-green', 5, true)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SECTION 3: Ensure Recipe Categories exist (from migration 015)
-- ============================================================================
INSERT INTO recipe_categories (key, name, icon, sort_order, is_active) VALUES
  ('steak', 'Steaks', 'mdi-food-steak', 2, true),
  ('soup', 'Soups', 'mdi-cup', 6, true),
  ('sandwich', 'Sandwiches & Burgers', 'mdi-hamburger', 7, true)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SECTION 4: Add code field to products table
-- ============================================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS code TEXT NULL;

-- Drop old partial index if exists
DROP INDEX IF EXISTS products_code_unique;

-- Create FULL unique index (no WHERE clause - required for ON CONFLICT)
-- PostgreSQL allows multiple NULL values in unique index, so this is safe
CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique
  ON products(code);

COMMENT ON COLUMN products.code IS 'Legacy product code (e.g., M-1, V-25, D-3). NULL for existing products.';


-- ============================================================================
-- SECTION 5: Add code field to preparations table
-- ============================================================================
ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS code TEXT NULL;

-- Drop old partial index if exists
DROP INDEX IF EXISTS preparations_code_unique;

-- Create FULL unique index (no WHERE clause - required for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS preparations_code_unique
  ON preparations(code);

COMMENT ON COLUMN preparations.code IS 'Legacy preparation code (e.g., P-1, P-16, P-28). NULL for existing preparations.';


-- ============================================================================
-- SECTION 6: Add code field to recipes table
-- ============================================================================
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS code TEXT NULL;

-- Drop old partial index if exists
DROP INDEX IF EXISTS recipes_code_unique;

-- Create FULL unique index (no WHERE clause - required for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS recipes_code_unique
  ON recipes(code);

COMMENT ON COLUMN recipes.code IS 'Legacy recipe code (e.g., R-1, R-7, R-30). NULL for existing recipes.';


-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  prod_count INTEGER;
  prod_with_code INTEGER;
  prep_count INTEGER;
  prep_with_code INTEGER;
  recipe_count INTEGER;
  recipe_with_code INTEGER;
  prod_cat_count INTEGER;
  prep_cat_count INTEGER;
  recipe_cat_count INTEGER;
BEGIN
  -- Products
  SELECT COUNT(*) INTO prod_count FROM products;
  SELECT COUNT(*) INTO prod_with_code FROM products WHERE code IS NOT NULL;

  -- Preparations
  SELECT COUNT(*) INTO prep_count FROM preparations;
  SELECT COUNT(*) INTO prep_with_code FROM preparations WHERE code IS NOT NULL;

  -- Recipes
  SELECT COUNT(*) INTO recipe_count FROM recipes;
  SELECT COUNT(*) INTO recipe_with_code FROM recipes WHERE code IS NOT NULL;

  -- Categories
  SELECT COUNT(*) INTO prod_cat_count FROM product_categories;
  SELECT COUNT(*) INTO prep_cat_count FROM preparation_categories;
  SELECT COUNT(*) INTO recipe_cat_count FROM recipe_categories;

  RAISE NOTICE '=== Products ===';
  RAISE NOTICE 'Total products: %', prod_count;
  RAISE NOTICE 'Products with code: %', prod_with_code;
  RAISE NOTICE 'Products with NULL code: %', prod_count - prod_with_code;

  RAISE NOTICE '=== Preparations ===';
  RAISE NOTICE 'Total preparations: %', prep_count;
  RAISE NOTICE 'Preparations with code: %', prep_with_code;
  RAISE NOTICE 'Preparations with NULL code: %', prep_count - prep_with_code;

  RAISE NOTICE '=== Recipes ===';
  RAISE NOTICE 'Total recipes: %', recipe_count;
  RAISE NOTICE 'Recipes with code: %', recipe_with_code;
  RAISE NOTICE 'Recipes with NULL code: %', recipe_count - recipe_with_code;

  RAISE NOTICE '=== Categories ===';
  RAISE NOTICE 'Product categories: %', prod_cat_count;
  RAISE NOTICE 'Preparation categories: %', prep_cat_count;
  RAISE NOTICE 'Recipe categories: %', recipe_cat_count;
END $$;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Ensured product categories exist (10 categories)
-- ✅ Ensured preparation categories exist (5 categories)
-- ✅ Ensured recipe categories exist (3 categories for test)
-- ✅ Added nullable code field to products table
-- ✅ Added nullable code field to preparations table
-- ✅ Added nullable code field to recipes table
-- ✅ Created FULL unique indexes (no WHERE clause - required for ON CONFLICT)
-- ✅ PostgreSQL allows multiple NULL in unique index, so existing data is safe
-- ✅ New imports can use ON CONFLICT (code) DO NOTHING
--
-- IMPORTANT CHANGE from previous version:
-- - Removed WHERE code IS NOT NULL from indexes
-- - ON CONFLICT requires full unique index, not partial index
-- - PostgreSQL treats NULL as unique values, so multiple NULLs are allowed
--
-- NEXT STEPS:
-- 1. Apply this migration to your database
-- 2. Run test migration: test_3_recipes_full_chain.sql
-- 3. Verify code-based deduplication works
-- ============================================================================
