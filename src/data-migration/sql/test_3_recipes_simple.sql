-- ============================================================================
-- TEST MIGRATION: Full chain for 3 recipes (Products → Preparations → Recipes)
-- ============================================================================
-- Purpose: Test complete data flow to identify calculation errors
-- Recipes: R-1 (Tuna steak), R-7 (TomYum), R-30 (Aus beef chiabatta)
--
-- SIMPLIFIED VERSION - No code fields, no conflict resolution
-- Just insert data for testing calculations
--
-- DO NOT APPLY TO PRODUCTION - FOR TESTING ONLY
-- ============================================================================

BEGIN;

-- Clean up test data first (optional - comment out if you want to keep existing data)
DELETE FROM recipe_components WHERE recipe_id IN (
  SELECT id FROM recipes WHERE name IN ('Tuna steak', 'TomYum', 'Aus beef chiabatta')
);
DELETE FROM recipes WHERE name IN ('Tuna steak', 'TomYum', 'Aus beef chiabatta');

DELETE FROM preparation_ingredients WHERE preparation_id IN (
  SELECT id FROM preparations WHERE name IN ('MushPotato', 'Holondaise basil', 'Concase', 'Tuna portion 150g', 'Shrimp thawed 4pc', 'Squid rings thawed 70g', 'Beef slices 88g', 'Mushroom sliced', 'Eggplant slices grilled')
);
DELETE FROM preparations WHERE name IN ('MushPotato', 'Holondaise basil', 'Concase', 'Tuna portion 150g', 'Shrimp thawed 4pc', 'Squid rings thawed 70g', 'Beef slices 88g', 'Mushroom sliced', 'Eggplant slices grilled');

DELETE FROM products WHERE name IN ('Water', 'SourDough bread', 'Santal kara (Coconut milk)', 'Apple vinegar', 'Honey', 'Soy souce', 'Oyster souce', 'Fresh milk', 'Cream cheese', 'Ricotta cheese', 'Unsalted butter', 'Oregano', 'Black pepper crash', 'Thyme', 'Beef sliced', 'Tuna lion', 'Udang', 'Cumi', 'Musted', 'Tomato paste', 'Tom yam paste', 'Rice', 'Telur', 'Jamur', 'Kentang (potato)', 'Broccoly', 'Basil leaf', 'Coriander leaf', 'Kacang bujang (beans)', 'Tomato local', 'Garlic', 'Terong (Egg plane)', 'Onion', 'Ginger', 'Sereh (Lemon grass)', 'Kefir leaf', 'Lemon', 'Rosmarin');


-- ============================================================================
-- SECTION 1: PRODUCTS (38 products)
-- ============================================================================

-- A-1: Water
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Water', 'Water', 0.00, 'ml', 'ml', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'beverages'), true);

-- B-3: SourDough bread
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('SourDough bread', 'SourDough bread', 7200.00, 'piece', 'piece', 2400.00, 100, (SELECT id FROM product_categories WHERE key = 'bakery'), true);

-- C-4: Santal kara (Coconut milk)
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Santal kara (Coconut milk)', 'Santal kara (Coconut milk)', 150.00, 'piece', 'piece', 50.00, 100, (SELECT id FROM product_categories WHERE key = 'beverages'), true);

-- C-9: Apple vinegar
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Apple vinegar', 'Apple vinegar', 3.00, 'ml', 'ml', 1.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true);

-- C-13: Honey
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Honey', 'Honey', 158.00, 'ml', 'ml', 52.80, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true);

-- C-19: Soy souce
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Soy souce', 'Soy souce', 171.00, 'piece', 'piece', 57.10, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true);

-- C-20: Oyster souce
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Oyster souce', 'Oyster souce', 171.00, 'piece', 'piece', 57.10, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true);

-- D-1: Fresh milk
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Fresh milk', 'Fresh milk', 57.00, 'ml', 'ml', 19.10, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true);

-- D-3: Cream cheese
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Cream cheese', 'Cream cheese', 405.00, 'gram', 'gram', 135.00, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true);

-- D-6: Ricotta cheese
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Ricotta cheese', 'Ricotta cheese', 242.00, 'piece', 'piece', 80.50, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true);

-- D-9: Unsalted butter
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Unsalted butter', 'Unsalted butter', 3.00, 'gram', 'gram', 1.00, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true);

-- H-2: Oregano
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Oregano', 'Oregano', 210.00, 'gram', 'gram', 70.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs_spices'), true);

-- H-5: Black pepper crash
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Black pepper crash', 'Black pepper crash', 255.00, 'gram', 'gram', 85.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs_spices'), true);

-- H-7: Thyme
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Thyme', 'Thyme', 0.00, 'gram', 'gram', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs_spices'), true);

-- M-1: Beef sliced
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Beef sliced', 'Beef sliced', 555.00, 'gram', 'gram', 185.00, 100, (SELECT id FROM product_categories WHERE key = 'meat'), true);

-- M-2: Tuna lion
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Tuna lion', 'Tuna lion', 294.00, 'gram', 'gram', 98.00, 100, (SELECT id FROM product_categories WHERE key = 'seafood'), true);

-- M-9: Udang
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Udang', 'Udang', 10125.00, 'piece', 'piece', 3375.00, 100, (SELECT id FROM product_categories WHERE key = 'seafood'), true);

-- M-10: Cumi
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Cumi', 'Cumi', 285.00, 'gram', 'gram', 95.00, 100, (SELECT id FROM product_categories WHERE key = 'seafood'), true);

-- O-5: Musted
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Musted', 'Musted', 0.00, 'piece', 'piece', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true);

-- O-10: Tomato paste
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Tomato paste', 'Tomato paste', 0.00, 'piece', 'piece', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true);

-- O-11: Tom yam paste
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Tom yam paste', 'Tom yam paste', 420.00, 'piece', 'piece', 140.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true);

-- S-20: Rice
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Rice', 'Rice', 45.00, 'piece', 'piece', 15.00, 100, (SELECT id FROM product_categories WHERE key = 'staples'), true);

-- V-1: Telur
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Telur', 'Telur', 6000.00, 'piece', 'piece', 2000.00, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true);

-- V-2: Jamur
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Jamur', 'Jamur', 141.00, 'gram', 'gram', 47.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-3: Kentang (potato)
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Kentang (potato)', 'Kentang (potato)', 60.00, 'gram', 'gram', 20.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-7: Broccoly
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Broccoly', 'Broccoly', 210.00, 'gram', 'gram', 70.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-12: Basil leaf
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Basil leaf', 'Basil leaf', 165.00, 'gram', 'gram', 55.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-13: Coriander leaf
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Coriander leaf', 'Coriander leaf', 120.00, 'gram', 'gram', 40.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-25: Kacang bujang (beans)
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Kacang bujang (beans)', 'Kacang bujang (beans)', 60.00, 'gram', 'gram', 20.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-26: Tomato local
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Tomato local', 'Tomato local', 90.00, 'gram', 'gram', 30.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-27: Garlic
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Garlic', 'Garlic', 135.00, 'gram', 'gram', 45.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-28: Terong (Egg plane)
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Terong (Egg plane)', 'Terong (Egg plane)', 51.00, 'gram', 'gram', 17.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-29: Onion
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Onion', 'Onion', 75.00, 'gram', 'gram', 25.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-30: Ginger
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Ginger', 'Ginger', 96.00, 'gram', 'gram', 32.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-31: Sereh (Lemon grass)
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Sereh (Lemon grass)', 'Sereh (Lemon grass)', 54.00, 'piece', 'piece', 18.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-32: Kefir leaf
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Kefir leaf', 'Kefir leaf', 300.00, 'piece', 'piece', 100.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-35: Lemon
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Lemon', 'Lemon', 116.00, 'gram', 'gram', 38.50, 90, (SELECT id FROM product_categories WHERE key = 'vegetables'), true);

-- V-44: Rosmarin
INSERT INTO products (name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('Rosmarin', 'Rosmarin', 600.00, 'gram', 'gram', 200.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs'), true);


RAISE NOTICE 'Created 38 test products';

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Products: 38 inserted
-- Simplified version - no code fields, no ON CONFLICT
-- Just clean test data for calculations
-- ============================================================================
