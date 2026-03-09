-- Migration: 163_fix_modifier_target_component_ids
-- Description: Fix modifier targetComponents to use stable entity IDs instead of row UUIDs
-- Date: 2026-03-06
--
-- CONTEXT: ModifierGroup.targetComponents stored RecipeComponent.id (row UUID from recipe_components table)
-- which gets regenerated every time a recipe is saved (DELETE + INSERT pattern).
-- This caused all replacement modifiers to break after any recipe edit.
--
-- FIX: Replace componentId with the stable entity ID (RecipeComponent.component_id = product/preparation/recipe ID).
-- Two strategies:
--   1. Direct match: stored componentId matches current recipe_components.id -> use its component_id
--   2. Name-based fallback: for stale IDs, match by recipe_id + component_name + component_type

DO $$
DECLARE
  mi_record RECORD;
  mg_array jsonb;
  mg_element jsonb;
  tc_array jsonb;
  tc_element jsonb;
  new_component_id text;
  mg_idx int;
  tc_idx int;
  updated boolean;
  total_fixed int := 0;
  total_items int := 0;
BEGIN
  FOR mi_record IN
    SELECT id, name, modifier_groups
    FROM menu_items
    WHERE modifier_groups IS NOT NULL
      AND jsonb_array_length(modifier_groups) > 0
  LOOP
    mg_array := mi_record.modifier_groups;
    updated := false;

    FOR mg_idx IN 0..jsonb_array_length(mg_array) - 1 LOOP
      mg_element := mg_array->mg_idx;
      tc_array := COALESCE(mg_element->'targetComponents', '[]'::jsonb);

      IF jsonb_array_length(tc_array) = 0 THEN
        CONTINUE;
      END IF;

      FOR tc_idx IN 0..jsonb_array_length(tc_array) - 1 LOOP
        tc_element := tc_array->tc_idx;

        -- Only process recipe-sourced targets
        IF tc_element->>'sourceType' != 'recipe' THEN
          CONTINUE;
        END IF;

        new_component_id := NULL;

        -- Strategy 1: Direct match by row UUID -> get entity ID
        SELECT rc.component_id INTO new_component_id
        FROM recipe_components rc
        WHERE rc.id::text = tc_element->>'componentId'
        LIMIT 1;

        -- Strategy 2: Name-based fallback for stale IDs
        IF new_component_id IS NULL THEN
          SELECT DISTINCT rc.component_id INTO new_component_id
          FROM recipe_components rc
          WHERE rc.recipe_id::text = tc_element->>'recipeId'
            AND rc.component_type = tc_element->>'componentType'
            AND (
              CASE
                WHEN rc.component_type = 'product' THEN
                  (SELECT name FROM products WHERE id::text = rc.component_id)
                WHEN rc.component_type = 'preparation' THEN
                  (SELECT name FROM preparations WHERE id::text = rc.component_id)
                WHEN rc.component_type = 'recipe' THEN
                  (SELECT name FROM recipes WHERE id::text = rc.component_id)
              END
            ) = tc_element->>'componentName'
          LIMIT 1;
        END IF;

        IF new_component_id IS NOT NULL AND new_component_id != tc_element->>'componentId' THEN
          -- Update the componentId in the JSONB
          tc_array := jsonb_set(
            tc_array,
            ARRAY[tc_idx::text, 'componentId'],
            to_jsonb(new_component_id)
          );
          updated := true;
          total_fixed := total_fixed + 1;

          RAISE NOTICE 'Fixed: % -> group "%" -> "%": % => %',
            mi_record.name,
            mg_element->>'name',
            tc_element->>'componentName',
            tc_element->>'componentId',
            new_component_id;
        END IF;
      END LOOP;

      -- Write back updated targetComponents
      IF updated THEN
        mg_array := jsonb_set(mg_array, ARRAY[mg_idx::text, 'targetComponents'], tc_array);
      END IF;
    END LOOP;

    IF updated THEN
      UPDATE menu_items
      SET modifier_groups = mg_array
      WHERE id = mi_record.id;
      total_items := total_items + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration complete: fixed % targetComponents across % menu items', total_fixed, total_items;
END $$;
