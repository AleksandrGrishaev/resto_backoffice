-- Migration: 013_add_prep_categories_winter_menu
-- Description: Add new preparation categories for Winter menu prep items
-- Date: 2025-12-02

-- CONTEXT: Adding 5 new categories for structured prep organization:
-- - seafood_portions: Thawed and portioned seafood
-- - meat_portions: Thawed and portioned meat
-- - vegetable_preps: Pre-cut and prepared vegetables
-- - frozen_fruits: Frozen fruit portions for smoothies
-- - frozen_portions: Other frozen portioned items

BEGIN;

-- Add new preparation categories
INSERT INTO preparation_categories (key, name, icon, emoji, color, sort_order, is_active)
VALUES
  ('seafood_portions', 'Seafood Portions', 'mdi-fish', '🐟', 'blue-darken-1', 7, true),
  ('meat_portions', 'Meat Portions', 'mdi-food-steak', '🥩', 'red-darken-2', 8, true),
  ('vegetable_preps', 'Vegetable Preps', 'mdi-carrot', '🥕', 'green-darken-2', 9, true),
  ('frozen_fruits', 'Frozen Fruits', 'mdi-fruit-cherries', '🍓', 'pink-lighten-1', 10, true),
  ('frozen_portions', 'Frozen Portions', 'mdi-snowflake', '❄️', 'blue-lighten-1', 11, true);

-- Verify categories were created
SELECT id, key, name FROM preparation_categories WHERE sort_order >= 7 ORDER BY sort_order;

COMMIT;
