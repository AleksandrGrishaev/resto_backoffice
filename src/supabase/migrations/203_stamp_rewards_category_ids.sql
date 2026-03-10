-- Migration: 203_stamp_rewards_category_ids
-- Description: Add category_ids (UUID array) to stamp_rewards JSONB entries
-- Date: 2026-03-10
-- Context: Phase 6 — link reward categories to menu_categories for validation

-- Update existing stamp_rewards JSONB to include category_ids field
-- "drinks" → Beverage, Coffee, Cocktails, Hot beverage, Ice coffee, Juice, Smoothie
-- "breakfast" → Breakfast, Custom Breakfast, Sweet Breakfast
-- "any" → empty array (no filtering)

UPDATE loyalty_settings
SET stamp_rewards = jsonb_build_array(
  jsonb_build_object(
    'stamps', 5,
    'category', 'drinks',
    'category_ids', COALESCE((
      SELECT jsonb_agg(id::text)
      FROM menu_categories
      WHERE name IN ('Beverage', 'Coffee', 'Cocktails', 'Hot beverage', 'Ice coffee', 'Juice', 'Smoothie')
    ), '[]'::jsonb),
    'max_discount', 40000
  ),
  jsonb_build_object(
    'stamps', 10,
    'category', 'breakfast',
    'category_ids', COALESCE((
      SELECT jsonb_agg(id::text)
      FROM menu_categories
      WHERE name IN ('Breakfast', 'Custom Breakfast', 'Sweet Breakfast')
    ), '[]'::jsonb),
    'max_discount', 75000
  ),
  jsonb_build_object(
    'stamps', 15,
    'category', 'any',
    'category_ids', '[]'::jsonb,
    'max_discount', 100000
  )
)
WHERE singleton_key = true;

-- Verify
SELECT stamp_rewards FROM loyalty_settings WHERE singleton_key = true;
