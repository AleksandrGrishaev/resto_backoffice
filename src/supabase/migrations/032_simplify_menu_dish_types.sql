-- Migration: 032_simplify_menu_dish_types
-- Description: Simplify dish types from 3 types to 2 types
-- Date: 2025-12-03
-- Author: Claude Code
--
-- CONTEXT:
-- Old structure had 3 dish types: 'simple', 'component-based', 'addon-based'
-- New structure has 2 dish types: 'simple', 'modifiable'
-- This simplifies the logic:
--   - 'simple': Fixed composition, no modifiers
--   - 'modifiable': With required/optional modifiers
--
-- Also removes 'groupStyle' field from modifier_groups JSONB
-- Logic now determined by 'isRequired' field in modifier groups

-- ==================================================
-- PRE-MIGRATION VALIDATION
-- ==================================================

-- Check current dish_type values
DO $$
BEGIN
  RAISE NOTICE 'Current dish_type values in menu_items:';
  RAISE NOTICE '%', (
    SELECT json_agg(DISTINCT dish_type)
    FROM menu_items
    WHERE dish_type IS NOT NULL
  );
END $$;

-- ==================================================
-- STEP 1: Update existing data
-- ==================================================

-- Update dish_type values:
-- 'component-based' → 'modifiable'
-- 'addon-based' → 'modifiable'
-- 'simple' → 'simple' (no change)
-- 'final' → 'simple' (if exists)

UPDATE menu_items
SET dish_type = CASE
  WHEN dish_type = 'component-based' THEN 'modifiable'
  WHEN dish_type = 'addon-based' THEN 'modifiable'
  WHEN dish_type = 'final' THEN 'simple'
  WHEN dish_type = 'simple' THEN 'simple'
  ELSE 'simple'  -- Default fallback
END
WHERE dish_type IS NOT NULL;

-- Log migration results
DO $$
BEGIN
  RAISE NOTICE 'Updated dish_type values. New distribution:';
  RAISE NOTICE 'simple: %', (SELECT COUNT(*) FROM menu_items WHERE dish_type = 'simple');
  RAISE NOTICE 'modifiable: %', (SELECT COUNT(*) FROM menu_items WHERE dish_type = 'modifiable');
END $$;

-- ==================================================
-- STEP 2: Update CHECK constraint
-- ==================================================

-- Drop old constraint
ALTER TABLE menu_items
DROP CONSTRAINT IF EXISTS menu_items_dish_type_check;

-- Add new constraint with simplified types
ALTER TABLE menu_items
ADD CONSTRAINT menu_items_dish_type_check
CHECK (dish_type IN ('simple', 'modifiable'));

-- ==================================================
-- STEP 3: Update comments/documentation
-- ==================================================

COMMENT ON COLUMN menu_items.dish_type IS
'Type of dish (simplified from 3 to 2 types):
- simple: Fixed composition, no modifiers
- modifiable: With required/optional modifiers (for customizable dishes)';

COMMENT ON COLUMN menu_items.modifier_groups IS
'JSONB array of modifier groups. Structure:
[{
  id, name, description, type,
  isRequired (boolean - true for required selection, false for optional),
  minSelection, maxSelection,
  options: [{id, name, description, priceAdjustment, isDefault, isActive, composition: []}]
}]
Note: groupStyle field removed - logic determined by isRequired field';

-- ==================================================
-- POST-MIGRATION VALIDATION
-- ==================================================

-- Verify all dish_type values are valid
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM menu_items
  WHERE dish_type IS NOT NULL
    AND dish_type NOT IN ('simple', 'modifiable');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration validation failed: % items have invalid dish_type', invalid_count;
  ELSE
    RAISE NOTICE '✅ Migration validation passed: All dish_type values are valid';
  END IF;
END $$;

-- Show final statistics
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 032 completed successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Final dish_type distribution:';
  RAISE NOTICE 'simple: %', (SELECT COUNT(*) FROM menu_items WHERE dish_type = 'simple');
  RAISE NOTICE 'modifiable: %', (SELECT COUNT(*) FROM menu_items WHERE dish_type = 'modifiable');
  RAISE NOTICE 'NULL: %', (SELECT COUNT(*) FROM menu_items WHERE dish_type IS NULL);
  RAISE NOTICE '========================================';
END $$;
