-- Migration: Migrate recipes.category from TEXT to UUID foreign key
-- Created: 2025-11-24
-- Description: Convert recipes.category column to reference recipe_categories table

-- Step 1: Add new column with UUID type
ALTER TABLE recipes ADD COLUMN category_new UUID;

-- Step 2: Populate new column by matching keys
-- Map old TEXT keys to new UUID from recipe_categories
UPDATE recipes
SET category_new = rc.id
FROM recipe_categories rc
WHERE recipes.category = rc.key;

-- Step 3: Handle unmapped values (if any)
DO $$
DECLARE
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM recipes
  WHERE category_new IS NULL;

  IF unmapped_count > 0 THEN
    -- Map unmapped recipes to 'main_dish' category (default)
    UPDATE recipes
    SET category_new = (SELECT id FROM recipe_categories WHERE key = 'main_dish')
    WHERE category_new IS NULL;

    RAISE NOTICE 'Mapped % unmapped recipes to "main_dish" category', unmapped_count;
  END IF;
END $$;

-- Step 4: Drop old column and rename new column
ALTER TABLE recipes DROP COLUMN category;
ALTER TABLE recipes RENAME COLUMN category_new TO category;

-- Step 5: Add NOT NULL constraint
ALTER TABLE recipes ALTER COLUMN category SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE recipes
  ADD CONSTRAINT fk_recipes_category
  FOREIGN KEY (category) REFERENCES recipe_categories(id)
  ON DELETE RESTRICT;

-- Step 7: Add index for performance
CREATE INDEX idx_recipes_category ON recipes(category);

-- Add comment
COMMENT ON COLUMN recipes.category IS 'Reference to recipe_categories.id (formerly TEXT key)';
