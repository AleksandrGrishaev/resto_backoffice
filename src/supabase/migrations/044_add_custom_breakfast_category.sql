-- Migration: 044_add_custom_breakfast_category
-- Description: Add Custom Breakfast category to recipes and preparations
-- Date: 2025-12-10

-- Add Custom Breakfast to recipe_categories
INSERT INTO recipe_categories (key, name, description, color, icon, sort_order, is_active)
VALUES (
  'custom_breakfast',
  'Custom Breakfast',
  'Customizable breakfast items',
  'amber-darken-1',
  'mdi-silverware-fork-knife',
  18,
  true
)
ON CONFLICT (key) DO NOTHING;

-- Add Custom Breakfast to preparation_categories
INSERT INTO preparation_categories (key, name, description, color, icon, emoji, sort_order, is_active)
VALUES (
  'custom_breakfast',
  'Custom Breakfast',
  'Preparations for customizable breakfast items',
  'amber-darken-1',
  'mdi-silverware-fork-knife',
  '🍳',
  14,
  true
)
ON CONFLICT (key) DO NOTHING;
