-- Migration: 071_add_recipe_nesting_support
-- Description: Add support for nested recipes (Recipe → Recipe composition)
-- Date: 2025-12-19
-- Author: Claude Code (Recipe Nesting Phase 1)

-- CONTEXT:
-- This migration enables recipes to use other recipes as components, allowing for:
-- 1. Recipe composition (e.g., "Big Breakfast" = "Hash Brown Recipe" + "Scrambled Eggs Recipe")
-- 2. Better recipe reusability across different menu items
-- 3. More accurate kitchen workflow representation
--
-- Changes:
-- 1. Update recipe_components.component_type to support 'recipe' value
-- 2. Add index for faster lookup of nested recipe relationships
-- 3. Add CHECK constraint to validate component_type values
-- 4. Add helper function to find recipes using a specific recipe

-- =============================================
-- PRE-MIGRATION VALIDATION
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Checking current recipe_components table schema...';

  -- Verify recipe_components table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipe_components') THEN
    RAISE EXCEPTION 'recipe_components table does not exist!';
  END IF;

  -- Verify component_type column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'recipe_components'
    AND column_name = 'component_type'
  ) THEN
    RAISE EXCEPTION 'recipe_components.component_type column does not exist!';
  END IF;

  RAISE NOTICE 'Pre-migration validation passed ✓';
END $$;

-- =============================================
-- MIGRATION: Update component_type support
-- =============================================

-- Add CHECK constraint to validate component_type values
-- (This will prevent invalid data from being inserted)
DO $$
BEGIN
  -- Drop existing constraint if it exists (idempotent)
  IF EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'recipe_components_type_check'
    AND conrelid = 'public.recipe_components'::regclass
  ) THEN
    ALTER TABLE recipe_components DROP CONSTRAINT recipe_components_type_check;
    RAISE NOTICE 'Dropped existing constraint recipe_components_type_check';
  END IF;

  -- Add new constraint with updated allowed values
  ALTER TABLE recipe_components ADD CONSTRAINT recipe_components_type_check
  CHECK (component_type IN ('product', 'preparation', 'recipe'));

  RAISE NOTICE 'Added constraint recipe_components_type_check with recipe support ✓';
END $$;

-- Update column comment
COMMENT ON COLUMN recipe_components.component_type IS
'Type of component: "product", "preparation", or "recipe" (nested recipe).
⭐ PHASE 1: Added support for nested recipes (componentType: "recipe")';

-- =============================================
-- INDEXES: Speed up nested recipe lookups
-- =============================================

-- Index for finding all recipes that use a specific recipe as a component
-- This supports the "Used In" feature efficiently
CREATE INDEX IF NOT EXISTS idx_recipe_components_nested_recipes
ON recipe_components (component_id)
WHERE component_type = 'recipe';

COMMENT ON INDEX idx_recipe_components_nested_recipes IS
'Index for efficiently finding recipes that use other recipes as components.
Supports the "Used In" feature for nested recipes.';

-- =============================================
-- HELPER FUNCTION: Find recipes using a specific recipe
-- =============================================

CREATE OR REPLACE FUNCTION get_recipes_using_recipe(target_recipe_id uuid)
RETURNS TABLE (
  recipe_id uuid,
  recipe_name text,
  recipe_code text,
  component_quantity numeric,
  component_unit text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS recipe_id,
    r.name AS recipe_name,
    r.code AS recipe_code,
    rc.quantity AS component_quantity,
    rc.unit AS component_unit
  FROM recipes r
  INNER JOIN recipe_components rc ON rc.recipe_id = r.id
  WHERE rc.component_type = 'recipe'
  AND rc.component_id = target_recipe_id::text
  AND r.is_active = true
  ORDER BY r.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_recipes_using_recipe(uuid) IS
'Finds all recipes that use the specified recipe as a component.
Used for the "Used In" feature and validation before deletion.';

-- =============================================
-- POST-MIGRATION VALIDATION
-- =============================================

DO $$
DECLARE
  constraint_exists boolean;
  index_exists boolean;
  function_exists boolean;
BEGIN
  RAISE NOTICE 'Running post-migration validation...';

  -- Check constraint was created
  SELECT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'recipe_components_type_check'
    AND conrelid = 'public.recipe_components'::regclass
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Constraint recipe_components_type_check was not created!';
  END IF;
  RAISE NOTICE '✓ Constraint validation passed';

  -- Check index was created
  SELECT EXISTS (
    SELECT FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'recipe_components'
    AND indexname = 'idx_recipe_components_nested_recipes'
  ) INTO index_exists;

  IF NOT index_exists THEN
    RAISE EXCEPTION 'Index idx_recipe_components_nested_recipes was not created!';
  END IF;
  RAISE NOTICE '✓ Index validation passed';

  -- Check function was created
  SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_recipes_using_recipe'
  ) INTO function_exists;

  IF NOT function_exists THEN
    RAISE EXCEPTION 'Function get_recipes_using_recipe was not created!';
  END IF;
  RAISE NOTICE '✓ Function validation passed';

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 071_add_recipe_nesting_support completed successfully! ✓';
  RAISE NOTICE '==============================================';
END $$;

-- =============================================
-- EXAMPLE USAGE (commented out, for reference)
-- =============================================

/*
-- Example 1: Create a nested recipe component
INSERT INTO recipe_components (
  id,
  recipe_id,
  component_id,
  component_type,
  quantity,
  unit,
  sort_order
) VALUES (
  gen_random_uuid(),
  'parent-recipe-uuid',
  'nested-recipe-uuid',
  'recipe',
  1,
  'portion',
  1
);

-- Example 2: Find all recipes using a specific recipe
SELECT * FROM get_recipes_using_recipe('nested-recipe-uuid');

-- Example 3: Check if any nested recipes exist
SELECT
  r.name,
  r.code,
  COUNT(rc.id) as nested_recipe_count
FROM recipes r
LEFT JOIN recipe_components rc ON rc.recipe_id = r.id AND rc.component_type = 'recipe'
GROUP BY r.id, r.name, r.code
HAVING COUNT(rc.id) > 0;
*/
