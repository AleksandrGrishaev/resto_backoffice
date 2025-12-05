-- Migration: 012_add_nested_preparations
-- Description: Allow preparations to use other preparations as ingredients
-- Date: 2025-12-05
-- Author: Claude

-- CONTEXT:
-- Business needs multi-stage preparation production:
-- Fresh Fish → Marinated Fish → Fish Portion → Sale
--
-- Currently preparation_ingredients only supports type: 'product'
-- This migration extends it to support type: 'preparation'

-- STEP 1: Rename product_id to ingredient_id (more generic name)
-- This allows the column to reference either products or preparations
ALTER TABLE preparation_ingredients
  RENAME COLUMN product_id TO ingredient_id;

-- STEP 2: Add comment to document supported types
COMMENT ON COLUMN preparation_ingredients.type IS
'Type of ingredient: "product" (from products table) or "preparation" (from preparations table)';

COMMENT ON COLUMN preparation_ingredients.ingredient_id IS
'UUID reference to either products.id (when type=product) or preparations.id (when type=preparation)';

-- STEP 3: Document the table structure
COMMENT ON TABLE preparation_ingredients IS
'Ingredients for preparation recipes. Each ingredient can be:
- A product (type=product, ingredient_id references products.id)
- Another preparation (type=preparation, ingredient_id references preparations.id)
This enables multi-stage preparation production (nested preparations).';

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  ingredient_count INTEGER;
  renamed_column_exists BOOLEAN;
BEGIN
  -- Check if column was renamed successfully
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preparation_ingredients'
    AND column_name = 'ingredient_id'
  ) INTO renamed_column_exists;

  IF NOT renamed_column_exists THEN
    RAISE EXCEPTION 'Migration failed: ingredient_id column does not exist';
  END IF;

  -- Count existing ingredients
  SELECT COUNT(*) INTO ingredient_count FROM preparation_ingredients;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 012: Nested preparations support added';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Column renamed: product_id → ingredient_id';
  RAISE NOTICE 'Supported types: product, preparation';
  RAISE NOTICE 'Existing ingredients preserved: %', ingredient_count;
  RAISE NOTICE 'All existing ingredients remain type=product';
  RAISE NOTICE '==============================================';
END $$;
