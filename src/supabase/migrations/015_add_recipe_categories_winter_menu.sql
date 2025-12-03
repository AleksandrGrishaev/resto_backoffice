-- Migration: 015_add_recipe_categories_winter_menu
-- Description: Add detailed recipe categories for Winter menu (breakfast, steak, pasta, poke_bowl, salad, soup, sandwich, smoothie)
-- Date: 2025-12-02
-- Author: Claude

-- CONTEXT: Current categories (main_dish, side_dish, dessert, appetizer, beverage, sauce) are too generic
-- Need detailed categories for better menu organization: breakfast, steak, pasta, poke_bowl, salad, soup, sandwich, smoothie

BEGIN;

-- Add new recipe categories
INSERT INTO recipe_categories (key, name, icon, sort_order, is_active) VALUES
  ('breakfast', 'Breakfast', 'mdi-coffee', 1, true),
  ('steak', 'Steaks', 'mdi-food-steak', 2, true),
  ('pasta', 'Pasta', 'mdi-pasta', 3, true),
  ('poke_bowl', 'Poke Bowls', 'mdi-bowl-mix', 4, true),
  ('salad', 'Salads', 'mdi-salad', 5, true),
  ('soup', 'Soups', 'mdi-cup', 6, true),
  ('sandwich', 'Sandwiches & Burgers', 'mdi-hamburger', 7, true),
  ('smoothie', 'Smoothies', 'mdi-cup-water', 8, true)
ON CONFLICT (key) DO NOTHING;

-- Update sort_order for existing categories (keep dessert at the end)
UPDATE recipe_categories SET sort_order = 9 WHERE key = 'dessert';
UPDATE recipe_categories SET sort_order = 10 WHERE key = 'side_dish';
UPDATE recipe_categories SET sort_order = 11 WHERE key = 'appetizer';
UPDATE recipe_categories SET sort_order = 12 WHERE key = 'beverage';
UPDATE recipe_categories SET sort_order = 13 WHERE key = 'sauce';

-- Verify new categories
SELECT key, name, sort_order FROM recipe_categories ORDER BY sort_order;

COMMIT;
