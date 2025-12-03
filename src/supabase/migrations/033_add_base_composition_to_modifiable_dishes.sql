-- Migration: 033_add_base_composition_to_modifiable_dishes
-- Description: Add base composition (main recipe) to modifiable dish variants
-- Date: 2025-12-03
-- Author: Claude Code
--
-- CONTEXT:
-- After simplifying dish types (032), modifiable dishes need base composition
-- in their variants. Currently, they only have modifiers (sides/sauces) but
-- missing the main item (steak, syrniki, etc.)
--
-- This adds:
-- - Beef Steak variants → recipe "Beef steak"
-- - Chicken Steak variants → recipe "Chiken steak"
-- - Tuna Steak variants → recipe "Tuna steak"
-- - Syrniki variants → recipe "Syrniki"
--
-- Big Breakfast and Simple Breakfast already have composition.

-- ==================================================
-- PRE-MIGRATION VALIDATION
-- ==================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRE-MIGRATION STATE';
  RAISE NOTICE '========================================';

  -- Check current state
  RAISE NOTICE 'Modifiable dishes WITHOUT composition in first variant:';
  RAISE NOTICE '%', (
    SELECT json_agg(json_build_object(
      'name', name,
      'first_variant_has_composition', (variants->0->'composition') IS NOT NULL AND jsonb_array_length(variants->0->'composition') > 0
    ))
    FROM menu_items
    WHERE dish_type = 'modifiable'
  );
END $$;

-- ==================================================
-- STEP 1: Add composition to Beef Steak
-- ==================================================

UPDATE menu_items
SET variants = (
  SELECT jsonb_agg(
    CASE
      WHEN variant->>'composition' IS NULL OR variant->'composition' = '[]'::jsonb
      THEN variant || jsonb_build_object(
        'composition', jsonb_build_array(
          jsonb_build_object(
            'type', 'recipe',
            'id', '22c67eed-c83b-4aed-a36c-c39f48b5c974',
            'quantity', 1,
            'unit', 'piece',
            'role', 'main'
          )
        )
      )
      ELSE variant
    END
  )
  FROM jsonb_array_elements(variants) AS variant
)
WHERE name = 'Beef Steak' AND dish_type = 'modifiable';

-- ==================================================
-- STEP 2: Add composition to Chicken Steak
-- ==================================================

UPDATE menu_items
SET variants = (
  SELECT jsonb_agg(
    CASE
      WHEN variant->>'composition' IS NULL OR variant->'composition' = '[]'::jsonb
      THEN variant || jsonb_build_object(
        'composition', jsonb_build_array(
          jsonb_build_object(
            'type', 'recipe',
            'id', 'f68537be-ebeb-46df-9778-354e6317d406',
            'quantity', 1,
            'unit', 'piece',
            'role', 'main'
          )
        )
      )
      ELSE variant
    END
  )
  FROM jsonb_array_elements(variants) AS variant
)
WHERE name = 'Chicken Steak' AND dish_type = 'modifiable';

-- ==================================================
-- STEP 3: Add composition to Tuna Steak
-- ==================================================

UPDATE menu_items
SET variants = (
  SELECT jsonb_agg(
    CASE
      WHEN variant->>'composition' IS NULL OR variant->'composition' = '[]'::jsonb
      THEN variant || jsonb_build_object(
        'composition', jsonb_build_array(
          jsonb_build_object(
            'type', 'recipe',
            'id', '2cba3680-afa5-4bed-b5ab-066d0788301c',
            'quantity', 1,
            'unit', 'piece',
            'role', 'main'
          )
        )
      )
      ELSE variant
    END
  )
  FROM jsonb_array_elements(variants) AS variant
)
WHERE name = 'Tuna Steak' AND dish_type = 'modifiable';

-- ==================================================
-- STEP 4: Add composition to Syrniki
-- ==================================================

UPDATE menu_items
SET variants = (
  SELECT jsonb_agg(
    CASE
      WHEN variant->>'composition' IS NULL OR variant->'composition' = '[]'::jsonb
      THEN variant || jsonb_build_object(
        'composition', jsonb_build_array(
          jsonb_build_object(
            'type', 'recipe',
            'id', '709b070f-ca98-4b68-a1b8-38d96e916e2d',
            'quantity', 1,
            'unit', 'piece',
            'role', 'main'
          )
        )
      )
      ELSE variant
    END
  )
  FROM jsonb_array_elements(variants) AS variant
)
WHERE name = 'Syrniki' AND dish_type = 'modifiable';

-- ==================================================
-- POST-MIGRATION VALIDATION
-- ==================================================

DO $$
DECLARE
  missing_count INTEGER;
  dish_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POST-MIGRATION VALIDATION';
  RAISE NOTICE '========================================';

  -- Check all modifiable dishes now have composition
  SELECT COUNT(*) INTO missing_count
  FROM menu_items
  WHERE dish_type = 'modifiable'
    AND (
      (variants->0->'composition') IS NULL
      OR jsonb_array_length(variants->0->'composition') = 0
    );

  IF missing_count > 0 THEN
    -- Show which dishes are missing composition
    FOR dish_record IN
      SELECT name, variants->0 as first_variant
      FROM menu_items
      WHERE dish_type = 'modifiable'
        AND (
          (variants->0->'composition') IS NULL
          OR jsonb_array_length(variants->0->'composition') = 0
        )
    LOOP
      RAISE WARNING 'Dish "%" still missing composition!', dish_record.name;
    END LOOP;

    RAISE EXCEPTION 'Migration validation failed: % modifiable dishes still missing composition', missing_count;
  ELSE
    RAISE NOTICE '✅ All modifiable dishes now have base composition';
  END IF;

  -- Show summary
  RAISE NOTICE '';
  RAISE NOTICE 'Updated dishes:';
  FOR dish_record IN
    SELECT
      name,
      jsonb_array_length(variants) as variant_count,
      variants->0->'composition'->0->>'type' as comp_type,
      variants->0->'composition'->0->>'id' as comp_id
    FROM menu_items
    WHERE dish_type = 'modifiable'
    ORDER BY name
  LOOP
    RAISE NOTICE '  - %: % variants, composition type=%',
      dish_record.name,
      dish_record.variant_count,
      dish_record.comp_type;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 033 completed successfully';
  RAISE NOTICE '========================================';
END $$;
