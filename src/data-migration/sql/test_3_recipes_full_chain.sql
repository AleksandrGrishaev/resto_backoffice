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
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('A-1', 'Water', 'Water', 0.00, 'ml', 'ml', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'beverages'), true)
ON CONFLICT (code) DO NOTHING;

-- B-3: SourDough bread
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('B-3', 'SourDough bread', 'SourDough bread', 7200.00, 'piece', 'piece', 2400.00, 100, (SELECT id FROM product_categories WHERE key = 'bakery'), true)
ON CONFLICT (code) DO NOTHING;

-- C-4: Santal kara (Coconut milk)
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('C-4', 'Santal kara (Coconut milk)', 'Santal kara (Coconut milk)', 150.00, 'piece', 'piece', 50.00, 100, (SELECT id FROM product_categories WHERE key = 'beverages'), true)
ON CONFLICT (code) DO NOTHING;

-- C-9: Apple vinegar
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('C-9', 'Apple vinegar', 'Apple vinegar', 3.00, 'ml', 'ml', 1.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true)
ON CONFLICT (code) DO NOTHING;

-- C-13: Honey
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('C-13', 'Honey', 'Honey', 158.00, 'ml', 'ml', 52.80, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true)
ON CONFLICT (code) DO NOTHING;

-- C-19: Soy souce
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('C-19', 'Soy souce', 'Soy souce', 171.00, 'piece', 'piece', 57.10, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true)
ON CONFLICT (code) DO NOTHING;

-- C-20: Oyster souce
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('C-20', 'Oyster souce', 'Oyster souce', 171.00, 'piece', 'piece', 57.10, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true)
ON CONFLICT (code) DO NOTHING;

-- D-1: Fresh milk
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('D-1', 'Fresh milk', 'Fresh milk', 57.00, 'ml', 'ml', 19.10, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true)
ON CONFLICT (code) DO NOTHING;

-- D-3: Cream cheese
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('D-3', 'Cream cheese', 'Cream cheese', 405.00, 'gram', 'gram', 135.00, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true)
ON CONFLICT (code) DO NOTHING;

-- D-6: Ricotta cheese
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('D-6', 'Ricotta cheese', 'Ricotta cheese', 242.00, 'piece', 'piece', 80.50, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true)
ON CONFLICT (code) DO NOTHING;

-- D-9: Unsalted butter
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('D-9', 'Unsalted butter', 'Unsalted butter', 3.00, 'gram', 'gram', 1.00, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true)
ON CONFLICT (code) DO NOTHING;

-- H-2: Oregano
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('H-2', 'Oregano', 'Oregano', 210.00, 'gram', 'gram', 70.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs_spices'), true)
ON CONFLICT (code) DO NOTHING;

-- H-5: Black pepper crash
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('H-5', 'Black pepper crash', 'Black pepper crash', 255.00, 'gram', 'gram', 85.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs_spices'), true)
ON CONFLICT (code) DO NOTHING;

-- H-7: Thyme
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('H-7', 'Thyme', 'Thyme', 0.00, 'gram', 'gram', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs_spices'), true)
ON CONFLICT (code) DO NOTHING;

-- M-1: Beef sliced
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('M-1', 'Beef sliced', 'Beef sliced', 555.00, 'gram', 'gram', 185.00, 100, (SELECT id FROM product_categories WHERE key = 'meat'), true)
ON CONFLICT (code) DO NOTHING;

-- M-2: Tuna lion
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('M-2', 'Tuna lion', 'Tuna lion', 294.00, 'gram', 'gram', 98.00, 100, (SELECT id FROM product_categories WHERE key = 'seafood'), true)
ON CONFLICT (code) DO NOTHING;

-- M-9: Udang
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('M-9', 'Udang', 'Udang', 10125.00, 'piece', 'piece', 3375.00, 100, (SELECT id FROM product_categories WHERE key = 'seafood'), true)
ON CONFLICT (code) DO NOTHING;

-- M-10: Cumi
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('M-10', 'Cumi', 'Cumi', 285.00, 'gram', 'gram', 95.00, 100, (SELECT id FROM product_categories WHERE key = 'seafood'), true)
ON CONFLICT (code) DO NOTHING;

-- O-5: Musted
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('O-5', 'Musted', 'Musted', 0.00, 'piece', 'piece', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true)
ON CONFLICT (code) DO NOTHING;

-- O-10: Tomato paste
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('O-10', 'Tomato paste', 'Tomato paste', 0.00, 'piece', 'piece', 0.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true)
ON CONFLICT (code) DO NOTHING;

-- O-11: Tom yam paste
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('O-11', 'Tom yam paste', 'Tom yam paste', 420.00, 'piece', 'piece', 140.00, 100, (SELECT id FROM product_categories WHERE key = 'condiments'), true)
ON CONFLICT (code) DO NOTHING;

-- S-20: Rice
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('S-20', 'Rice', 'Rice', 45.00, 'piece', 'piece', 15.00, 100, (SELECT id FROM product_categories WHERE key = 'staples'), true)
ON CONFLICT (code) DO NOTHING;

-- V-1: Telur
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-1', 'Telur', 'Telur', 6000.00, 'piece', 'piece', 2000.00, 100, (SELECT id FROM product_categories WHERE key = 'dairy'), true)
ON CONFLICT (code) DO NOTHING;

-- V-2: Jamur
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-2', 'Jamur', 'Jamur', 141.00, 'gram', 'gram', 47.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-3: Kentang (potato)
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-3', 'Kentang (potato)', 'Kentang (potato)', 60.00, 'gram', 'gram', 20.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-7: Broccoly
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-7', 'Broccoly', 'Broccoly', 210.00, 'gram', 'gram', 70.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-12: Basil leaf
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-12', 'Basil leaf', 'Basil leaf', 165.00, 'gram', 'gram', 55.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-13: Coriander leaf
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-13', 'Coriander leaf', 'Coriander leaf', 120.00, 'gram', 'gram', 40.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-25: Kacang bujang (beans)
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-25', 'Kacang bujang (beans)', 'Kacang bujang (beans)', 60.00, 'gram', 'gram', 20.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-26: Tomato local
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-26', 'Tomato local', 'Tomato local', 90.00, 'gram', 'gram', 30.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-27: Garlic
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-27', 'Garlic', 'Garlic', 135.00, 'gram', 'gram', 45.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-28: Terong (Egg plane)
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-28', 'Terong (Egg plane)', 'Terong (Egg plane)', 51.00, 'gram', 'gram', 17.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-29: Onion
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-29', 'Onion', 'Onion', 75.00, 'gram', 'gram', 25.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-30: Ginger
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-30', 'Ginger', 'Ginger', 96.00, 'gram', 'gram', 32.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-31: Sereh (Lemon grass)
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-31', 'Sereh (Lemon grass)', 'Sereh (Lemon grass)', 54.00, 'piece', 'piece', 18.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-32: Kefir leaf
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-32', 'Kefir leaf', 'Kefir leaf', 300.00, 'piece', 'piece', 100.00, 100, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-35: Lemon
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-35', 'Lemon', 'Lemon', 116.00, 'gram', 'gram', 38.50, 90, (SELECT id FROM product_categories WHERE key = 'vegetables'), true)
ON CONFLICT (code) DO NOTHING;

-- V-44: Rosmarin
INSERT INTO products (code, name, name_ru, price, unit, base_unit, base_cost_per_unit, yield_percentage, category, is_active)
VALUES ('V-44', 'Rosmarin', 'Rosmarin', 600.00, 'gram', 'gram', 200.00, 100, (SELECT id FROM product_categories WHERE key = 'herbs'), true)
ON CONFLICT (code) DO NOTHING;




-- ============================================================================
-- SECTION 2: PREPARATIONS (Semi-finished products)
-- ============================================================================
-- 9 preparations used in the 3 recipes

-- P-1: MushPotato
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-1', 'MushPotato', 'Mashed potato preparation',
   (SELECT id FROM preparation_categories WHERE key = 'side_dish'),
   210, 'gr', 30, 23.90, 'kitchen', true, 2)
ON CONFLICT (code) DO NOTHING;

-- P-2: Holondaise basil
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-2', 'Holondaise basil', 'Hollandaise sauce with basil',
   (SELECT id FROM preparation_categories WHERE key = 'sauce'),
   300, 'gr', 20, 71.20, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;

-- P-3: Concase
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-3', 'Concase', 'Tomato concase preparation',
   (SELECT id FROM preparation_categories WHERE key = 'sauce'),
   200, 'gr', 15, 18.90, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;

-- P-16: Tuna portion 150g
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-16', 'Tuna portion 150g', 'Tuna portion 150g thawed',
   (SELECT id FROM preparation_categories WHERE key = 'seafood_prep'),
   150, 'gr', 5, 14700.00, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;

-- P-20: Shrimp thawed 4pc
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-20', 'Shrimp thawed 4pc', 'Shrimp 4 pieces thawed',
   (SELECT id FROM preparation_categories WHERE key = 'seafood_prep'),
   4, 'pc', 5, 13500.00, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;

-- P-21: Squid rings thawed 70g
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-21', 'Squid rings thawed 70g', 'Squid rings 70g thawed',
   (SELECT id FROM preparation_categories WHERE key = 'seafood_prep'),
   70, 'gr', 5, 6650.00, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;

-- P-23: Beef slices 88g
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-23', 'Beef slices 88g', 'Beef slices 88g portioned',
   (SELECT id FROM preparation_categories WHERE key = 'meat_prep'),
   88, 'gr', 5, 16280.00, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;

-- P-28: Mushroom sliced
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-28', 'Mushroom sliced', 'Mushroom sliced 50g',
   (SELECT id FROM preparation_categories WHERE key = 'vegetable_prep'),
   50, 'gr', 3, 2350.00, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;

-- P-33: Eggplant slices grilled
INSERT INTO preparations (code, name, description, type, output_quantity, output_unit, preparation_time, cost_per_portion, department, is_active, shelf_life)
VALUES ('P-33', 'Eggplant slices grilled', 'Eggplant slices grilled 45g',
   (SELECT id FROM preparation_categories WHERE key = 'vegetable_prep'),
   45, 'gr', 10, 765.00, 'kitchen', true, 1)
ON CONFLICT (code) DO NOTHING;




-- ============================================================================
-- SECTION 3: PREPARATION INGREDIENTS
-- ============================================================================
-- Links preparations to their raw product ingredients

-- P-1: MushPotato (3 ingredients)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'MushPotato'), 'product', (SELECT id FROM products WHERE name = 'Kentang (potato)'), 200, 'gr', null, 0),
  ((SELECT id FROM preparations WHERE name = 'MushPotato'), 'product', (SELECT id FROM products WHERE name = 'Fresh milk'), 40, 'ml', null, 1),
  ((SELECT id FROM preparations WHERE name = 'MushPotato'), 'product', (SELECT id FROM products WHERE name = 'Unsalted butter'), 10, 'gr', null, 2)
ON CONFLICT DO NOTHING;

-- P-2: Holondaise basil (3 ingredients)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Holondaise basil'), 'product', (SELECT id FROM products WHERE name = 'Ricotta cheese'), 250, 'gr', null, 0),
  ((SELECT id FROM preparations WHERE name = 'Holondaise basil'), 'product', (SELECT id FROM products WHERE name = 'Basil leaf'), 30, 'gr', null, 1),
  ((SELECT id FROM preparations WHERE name = 'Holondaise basil'), 'product', (SELECT id FROM products WHERE name = 'Telur'), 0.5, 'pc', null, 2)
ON CONFLICT DO NOTHING;

-- P-3: Concase (8 ingredients)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Tomato local'), 150, 'gr', null, 0),
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Tomato paste'), 20, 'gr', null, 1),
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Garlic'), 5, 'gr', null, 2),
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Onion'), 30, 'gr', null, 3),
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Oregano'), 2, 'gr', null, 4),
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Apple vinegar'), 5, 'ml', null, 5),
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Honey'), 10, 'ml', null, 6),
  ((SELECT id FROM preparations WHERE name = 'Concase'), 'product', (SELECT id FROM products WHERE name = 'Black pepper crash'), 1, 'gr', null, 7)
ON CONFLICT DO NOTHING;

-- P-16: Tuna portion 150g (1 ingredient)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Tuna portion 150g'), 'product', (SELECT id FROM products WHERE name = 'Tuna lion'), 150, 'gr', null, 0)
ON CONFLICT DO NOTHING;

-- P-20: Shrimp thawed 4pc (1 ingredient)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Shrimp thawed 4pc'), 'product', (SELECT id FROM products WHERE name = 'Udang'), 4, 'pc', null, 0)
ON CONFLICT DO NOTHING;

-- P-21: Squid rings thawed 70g (1 ingredient)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Squid rings thawed 70g'), 'product', (SELECT id FROM products WHERE name = 'Cumi'), 70, 'gr', null, 0)
ON CONFLICT DO NOTHING;

-- P-23: Beef slices 88g (1 ingredient)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Beef slices 88g'), 'product', (SELECT id FROM products WHERE name = 'Beef sliced'), 88, 'gr', null, 0)
ON CONFLICT DO NOTHING;

-- P-28: Mushroom sliced (1 ingredient)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Mushroom sliced'), 'product', (SELECT id FROM products WHERE name = 'Jamur'), 50, 'gr', null, 0)
ON CONFLICT DO NOTHING;

-- P-33: Eggplant slices grilled (1 ingredient)
INSERT INTO preparation_ingredients (preparation_id, type, product_id, quantity, unit, notes, sort_order)
VALUES
  ((SELECT id FROM preparations WHERE name = 'Eggplant slices grilled'), 'product', (SELECT id FROM products WHERE name = 'Terong (Egg plane)'), 45, 'gr', null, 0)
ON CONFLICT DO NOTHING;




-- ============================================================================
-- SECTION 4: RECIPES
-- ============================================================================
-- 3 test recipes

-- R-1: Tuna steak
INSERT INTO recipes (code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active)
VALUES ('R-1', 'Tuna steak',
   (SELECT id FROM recipe_categories WHERE key = 'steak'),
   1, 'piece', 27569.40, 'hard', 25, 20, true)
ON CONFLICT (code) DO NOTHING;

-- R-7: TomYum
INSERT INTO recipes (code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active)
VALUES ('R-7', 'TomYum',
   (SELECT id FROM recipe_categories WHERE key = 'soup'),
   1, 'piece', 28118.00, 'medium', 15, 10, true)
ON CONFLICT (code) DO NOTHING;

-- R-30: Aus beef chiabatta
INSERT INTO recipes (code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active)
VALUES ('R-30', 'Aus beef chiabatta',
   (SELECT id FROM recipe_categories WHERE key = 'sandwich'),
   1, 'piece', 32465.10, 'medium', 15, 10, true)
ON CONFLICT (code) DO NOTHING;




-- ============================================================================
-- SECTION 5: RECIPE COMPONENTS
-- ============================================================================
-- Links recipes to products and preparations

-- ----------------------------------------
-- R-1: Tuna steak (13 components)
-- ----------------------------------------
-- Component 1: P-16 Tuna portion 150g (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM preparations WHERE name = 'Tuna portion 150g')::text, 'preparation', 150, 'gram', NULL, 0)
ON CONFLICT DO NOTHING;

-- Component 2: V-25 Kacang bujang (beans) (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Kacang bujang (beans)')::text, 'product', 30, 'gram', NULL, 1)
ON CONFLICT DO NOTHING;

-- Component 3: V-7 Broccoly (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Broccoly')::text, 'product', 95, 'gram', NULL, 2)
ON CONFLICT DO NOTHING;

-- Component 4: V-35 Lemon (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Lemon')::text, 'product', 0, 'gram', '2 sl', 3)
ON CONFLICT DO NOTHING;

-- Component 5: P-1 MushPotato (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM preparations WHERE name = 'MushPotato')::text, 'preparation', 100, 'gram', '2 sp', 4)
ON CONFLICT DO NOTHING;

-- Component 6: H-5 Black pepper crash (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Black pepper crash')::text, 'product', 1, 'gram', '1 tsp', 5)
ON CONFLICT DO NOTHING;

-- Component 7: O-5 Musted (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Musted')::text, 'product', 1, 'gram', '1 tsp', 6)
ON CONFLICT DO NOTHING;

-- Component 8: V-13 Coriander leaf (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Coriander leaf')::text, 'product', 0.5, 'gram', '1 tsp', 7)
ON CONFLICT DO NOTHING;

-- Component 9: V-27 Garlic (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Garlic')::text, 'product', 5, 'gram', NULL, 8)
ON CONFLICT DO NOTHING;

-- Component 10: C-19 Soy souce (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Soy souce')::text, 'product', 5, 'ml', '1 tsp', 9)
ON CONFLICT DO NOTHING;

-- Component 11: C-20 Oyster souce (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Oyster souce')::text, 'product', 10, 'ml', '1 sp', 10)
ON CONFLICT DO NOTHING;

-- Component 12: C-13 Honey (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM products WHERE name = 'Honey')::text, 'product', 10, 'ml', '1 sp', 11)
ON CONFLICT DO NOTHING;

-- Component 13: P-2 Holondaise basil (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Tuna steak'), (SELECT id FROM preparations WHERE name = 'Holondaise basil')::text, 'preparation', 20, 'ml', NULL, 12)
ON CONFLICT DO NOTHING;


-- ----------------------------------------
-- R-7: TomYum (11 components)
-- ----------------------------------------
-- Component 1: P-20 Shrimp thawed 4pc (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM preparations WHERE name = 'Shrimp thawed 4pc')::text, 'preparation', 4, 'pieces', '100 gr', 0)
ON CONFLICT DO NOTHING;

-- Component 2: P-21 Squid rings thawed 70g (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM preparations WHERE name = 'Squid rings thawed 70g')::text, 'preparation', 70, 'gram', '3 rings', 1)
ON CONFLICT DO NOTHING;

-- Component 3: S-20 Rice (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Rice')::text, 'product', 100, 'gram', NULL, 2)
ON CONFLICT DO NOTHING;

-- Component 4: C-4 Santal kara (Coconut milk) (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Santal kara (Coconut milk)')::text, 'product', 40, 'ml', NULL, 3)
ON CONFLICT DO NOTHING;

-- Component 5: P-28 Mushroom sliced (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM preparations WHERE name = 'Mushroom sliced')::text, 'preparation', 50, 'gram', NULL, 4)
ON CONFLICT DO NOTHING;

-- Component 6: V-32 Kefir leaf (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Kefir leaf')::text, 'product', 2, 'pieces', '2pc', 5)
ON CONFLICT DO NOTHING;

-- Component 7: V-13 Coriander leaf (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Coriander leaf')::text, 'product', 1.5, 'gram', NULL, 6)
ON CONFLICT DO NOTHING;

-- Component 8: O-11 Tom yam paste (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Tom yam paste')::text, 'product', 12, 'gram', '2 tsp', 7)
ON CONFLICT DO NOTHING;

-- Component 9: V-31 Sereh (Lemon grass) (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Sereh (Lemon grass)')::text, 'product', 1, 'piece', NULL, 8)
ON CONFLICT DO NOTHING;

-- Component 10: V-30 Ginger (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Ginger')::text, 'product', 5, 'gram', '3pc', 9)
ON CONFLICT DO NOTHING;

-- Component 11: A-1 Water (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'TomYum'), (SELECT id FROM products WHERE name = 'Water')::text, 'product', 80, 'ml', NULL, 10)
ON CONFLICT DO NOTHING;


-- ----------------------------------------
-- R-30: Aus beef chiabatta (9 components)
-- ----------------------------------------
-- Component 1: P-23 Beef slices 88g (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM preparations WHERE name = 'Beef slices 88g')::text, 'preparation', 88, 'gram', NULL, 0)
ON CONFLICT DO NOTHING;

-- Component 2: B-3 SourDough bread (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM products WHERE name = 'SourDough bread')::text, 'product', 1, 'piece', NULL, 1)
ON CONFLICT DO NOTHING;

-- Component 3: D-3 Cream cheese (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM products WHERE name = 'Cream cheese')::text, 'product', 30, 'gram', NULL, 2)
ON CONFLICT DO NOTHING;

-- Component 4: V-44 Rosmarin (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM products WHERE name = 'Rosmarin')::text, 'product', 5, 'gram', NULL, 3)
ON CONFLICT DO NOTHING;

-- Component 5: P-33 Eggplant slices grilled (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM preparations WHERE name = 'Eggplant slices grilled')::text, 'preparation', 45, 'gram', NULL, 4)
ON CONFLICT DO NOTHING;

-- Component 6: V-26 Tomato local (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM products WHERE name = 'Tomato local')::text, 'product', 30, 'gram', NULL, 5)
ON CONFLICT DO NOTHING;

-- Component 7: V-27 Garlic (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM products WHERE name = 'Garlic')::text, 'product', 5, 'gram', NULL, 6)
ON CONFLICT DO NOTHING;

-- Component 8: V-29 Onion (PRODUCT)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM products WHERE name = 'Onion')::text, 'product', 10, 'gram', NULL, 7)
ON CONFLICT DO NOTHING;

-- Component 9: P-3 Concase (PREPARATION)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order)
VALUES ((SELECT id FROM recipes WHERE name = 'Aus beef chiabatta'), (SELECT id FROM preparations WHERE name = 'Concase')::text, 'preparation', 20, 'gram', NULL, 8)
ON CONFLICT DO NOTHING;



COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Products: 38 inserted
-- Preparations: 9 inserted
-- Preparation ingredients: 19 links created
-- Recipes: 3 inserted
-- Recipe components: 33 links created
--
-- R-1 (Tuna steak): 13 components
--   - 3 preparations: P-16 (Tuna 150g), P-1 (MushPotato), P-2 (Holondaise)
--   - 10 products: V-25, V-7, V-35, H-5, O-5, V-13, V-27, C-19, C-20, C-13
--
-- R-7 (TomYum): 11 components
--   - 3 preparations: P-20 (Shrimp 4pc), P-21 (Squid 70g), P-28 (Mushroom sliced)
--   - 8 products: S-20, C-4, V-32, V-13, O-11, V-31, V-30, A-1
--
-- R-30 (Aus beef chiabatta): 9 components
--   - 3 preparations: P-23 (Beef slices 88g), P-33 (Eggplant grilled), P-3 (Concase)
--   - 6 products: B-3, D-3, V-44, V-26, V-27, V-29
--
-- FULL CHAIN EXAMPLE (R-1 Tuna steak):
--   P-16 (Tuna portion) ← M-2 (Tuna lion 150g @ Rp 98/g = Rp 14,700)
--   P-1 (MushPotato) ← V-3 (Potato 200g) + D-1 (Milk 40ml) + D-9 (Butter 10g)
--   P-2 (Holondaise) ← D-6 (Ricotta 250g) + V-12 (Basil 30g) + V-1 (Egg 0.5pc)
--   + 10 direct products
--   = Total cost: Rp 27,569.40
-- ============================================================================
