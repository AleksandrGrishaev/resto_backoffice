-- Migration: 043_convert_target_component_to_array
-- Description: Convert singular targetComponent to targetComponents array for multi-target replacement modifiers
-- Date: 2025-01-10
-- Author: Claude

-- CONTEXT:
-- Replacement modifiers now support multiple target components.
-- For example, a "Steak with garnish" can have a modifier that replaces BOTH
-- the base puree AND egg components with a single french fries option.
-- This migration converts the singular targetComponent field to a targetComponents array.

-- PRE-MIGRATION: Check if any data needs migration
-- SELECT id, name FROM menu_items WHERE modifier_groups::text LIKE '%"targetComponent"%';

-- ACTUAL CHANGES: Convert targetComponent to targetComponents array
UPDATE menu_items
SET modifier_groups = (
  SELECT jsonb_agg(
    CASE
      WHEN mg->>'targetComponent' IS NOT NULL
      THEN (mg - 'targetComponent') || jsonb_build_object(
        'targetComponents',
        jsonb_build_array(mg->'targetComponent')
      )
      ELSE mg
    END
  )
  FROM jsonb_array_elements(modifier_groups) AS mg
)
WHERE modifier_groups IS NOT NULL
  AND modifier_groups::text LIKE '%"targetComponent"%';

-- POST-MIGRATION VALIDATION
-- SELECT id, name,
--        jsonb_path_query_array(modifier_groups, '$[*].targetComponents') as target_components
-- FROM menu_items
-- WHERE modifier_groups IS NOT NULL
--   AND modifier_groups::text LIKE '%targetComponents%';
