-- Migration: 037_add_department_to_recipes
-- Description: Add department field to recipes table to support filtering by kitchen/bar
-- Date: 2025-01-04
-- Author: Claude Code

-- CONTEXT:
-- Recipes need to be associated with specific departments (kitchen or bar) to support:
-- 1. Filtering in the UI (same as preparations)
-- 2. Menu composition filtering (only show recipes from the same department as the menu item)
-- 3. Better organization and workflow separation

-- PRE-MIGRATION VALIDATION
-- Check current schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'recipes'
    AND column_name = 'department'
  ) THEN
    RAISE NOTICE 'Column department already exists in recipes table';
  ELSE
    RAISE NOTICE 'Column department does not exist, will be added';
  END IF;
END $$;

-- ACTUAL CHANGES
-- Add department column with default value 'kitchen'
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'kitchen';

-- Add check constraint to ensure only valid departments
ALTER TABLE recipes
ADD CONSTRAINT recipes_department_check
CHECK (department IN ('kitchen', 'bar'));

-- Update existing recipes to have 'kitchen' as department (default)
UPDATE recipes
SET department = 'kitchen'
WHERE department IS NULL OR department = '';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_department ON recipes(department);

-- POST-MIGRATION VALIDATION
-- Verify all recipes have a valid department
DO $$
DECLARE
  invalid_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM recipes
  WHERE department IS NULL OR department NOT IN ('kitchen', 'bar');

  SELECT COUNT(*) INTO total_count
  FROM recipes;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration validation failed: % recipes have invalid department values', invalid_count;
  ELSE
    RAISE NOTICE 'Migration successful: All % recipes have valid department values', total_count;
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN recipes.department IS 'Department where this recipe is prepared (kitchen or bar)';
