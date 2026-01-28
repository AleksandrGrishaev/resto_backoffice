-- Migration: 105_fix_portion_type_unit_in_recipe_components
-- Description: Fix unit field in recipe_components for portion-type preparations
-- Date: 2026-01-28
-- Author: Claude
--
-- ============================================================================
-- PROBLEM:
-- ============================================================================
-- When portion-type preparations (portion_type='portion') were added to recipes,
-- the unit in recipe_components was incorrectly set to 'gram' instead of 'portion'.
--
-- This caused DecompositionEngine to skip portion-to-gram conversion:
--   - Expected: 1 portion × 200g = 200 grams written off
--   - Actual: 1 gram written off (no conversion)
--
-- The UI code (RecipeComponentsEditorWidget.vue) was already fixed to set
-- unit='portion' for NEW portion-type preparations. This migration fixes
-- EXISTING data created before the fix.
--
-- ============================================================================
-- AFFECTED DATA (example):
-- ============================================================================
-- Recipe: Tuna steak (R-1)
--   - Tuna portion 200g: quantity=1, unit='gram' → should be 'portion'
--   - After fix: 1 portion × 200g = 200 grams written off correctly
--
-- ============================================================================
-- PRODUCTION DEPLOYMENT INSTRUCTIONS:
-- ============================================================================
--
-- 1. BACKUP: Before running, ensure you have a recent backup
--
-- 2. DRY RUN: Check what will be changed
--    Run the SELECT query below to see affected records
--
-- 3. APPLY: Run the UPDATE statement
--
-- 4. VERIFY: Run the verification query to confirm changes
--
-- ============================================================================

-- ============================================================================
-- STEP 1: DRY RUN - Check affected records (RUN THIS FIRST!)
-- ============================================================================
SELECT
  r.code as recipe_code,
  r.name as recipe_name,
  p.code as prep_code,
  p.name as prep_name,
  rc.quantity,
  rc.unit as current_unit,
  'portion' as new_unit,
  p.portion_size
FROM recipe_components rc
JOIN preparations p ON rc.component_id::uuid = p.id
JOIN recipes r ON rc.recipe_id = r.id
WHERE rc.component_type = 'preparation'
  AND p.portion_type = 'portion'
  AND rc.unit IN ('gram', 'gr', 'g')
  AND p.portion_size > 1
ORDER BY r.name, p.name;

-- ============================================================================
-- STEP 2: APPLY MIGRATION
-- ============================================================================
UPDATE recipe_components rc
SET unit = 'portion'
FROM preparations p
WHERE rc.component_id::uuid = p.id
  AND rc.component_type = 'preparation'
  AND p.portion_type = 'portion'
  AND rc.unit IN ('gram', 'gr', 'g')
  AND p.portion_size > 1;

-- ============================================================================
-- STEP 3: VERIFY CHANGES
-- ============================================================================
-- All portion-type preparations should now have unit='portion'
SELECT
  rc.unit,
  COUNT(*) as count
FROM recipe_components rc
JOIN preparations p ON rc.component_id::uuid = p.id
WHERE rc.component_type = 'preparation'
  AND p.portion_type = 'portion'
GROUP BY rc.unit
ORDER BY rc.unit;

-- Expected result:
-- unit     | count
-- ---------|------
-- portion  | 50+   (all portion-type preps)
-- pc/piece | few   (slice-type preps like bread - OK)

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- 1. French fries portion 100g (P-45) is excluded because portion_size=1
--    This preparation needs review - portion_size should probably be 100, not 1
--
-- 2. Preparations with unit='pc' or 'piece' (like SourDough bread slices) are
--    NOT affected - they use different unit system
--
-- 3. After this migration, new sales will correctly write off:
--    - 1 portion of "Tuna portion 200g" → 200 grams
--    - 1 portion of "Bacon slices 30g" → 30 grams
--    - etc.
--
-- ============================================================================
-- ROLLBACK (if needed):
-- ============================================================================
-- UPDATE recipe_components rc
-- SET unit = 'gram'
-- FROM preparations p
-- WHERE rc.component_id::uuid = p.id
--   AND rc.component_type = 'preparation'
--   AND p.portion_type = 'portion'
--   AND rc.unit = 'portion'
--   AND p.portion_size > 1;
