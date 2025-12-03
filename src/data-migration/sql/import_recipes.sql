-- Migration: Import recipes from Winter menu CSV
-- Generated: 2025-12-02T15:15:34.575Z
-- Total recipes: 36

BEGIN;

-- Recipe R-1: Tuna steak (steak, 13 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-1',
  'R-1',
  'Tuna steak',
  'b861514a-a630-4beb-8ff5-e0afeebded87',
  1, -- portion_size (default to 1 serving)
  'piece',
  27569.40,
  'hard',
  25,
  20,
  true
);

-- Component 1: Tuna portion 150g (was M-2) (P-16, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM preparations WHERE code = 'P-16'),
  'preparation',
  150,
  'gram',
  NULL,
  0
);

-- Component 2: Kacang bujang( beans ) (V-25, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'V-25'),
  'product',
  30,
  'gram',
  NULL,
  1
);

-- Component 3: Broccoly (V-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'V-7'),
  'product',
  95,
  'gram',
  NULL,
  2
);

-- Component 4: Lemon (V-35, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'V-35'),
  'product',
  0,
  'gram',
  '2 sl',
  3
);

-- Component 5: MushPotato (P-1, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM preparations WHERE code = 'P-1'),
  'preparation',
  100,
  'gram',
  '2 sp',
  4
);

-- Component 6: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  1,
  'gram',
  '1 tsp',
  5
);

-- Component 7: Musted (O-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'O-5'),
  'product',
  1,
  'gram',
  '1 tsp',
  6
);

-- Component 8: Coriander leaf (V-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'V-13'),
  'product',
  0.5,
  'gram',
  '1 tsp',
  7
);

-- Component 9: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  5,
  'gram',
  NULL,
  8
);

-- Component 10: Soy souce (C-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'C-19'),
  'product',
  5,
  'ml',
  '1 tsp',
  9
);

-- Component 11: Oyster souce (C-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'C-20'),
  'product',
  10,
  'ml',
  '1 sp',
  10
);

-- Component 12: Honey (C-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM products WHERE code = 'C-13'),
  'product',
  10,
  'ml',
  '1 sp',
  11
);

-- Component 13: Holondaise basil (P-2, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-1'),
  (SELECT id FROM preparations WHERE code = 'P-2'),
  'preparation',
  20,
  'ml',
  NULL,
  12
);


-- Recipe R-2: Chiken steak (steak, 13 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-2',
  'R-2',
  'Chiken steak',
  'b861514a-a630-4beb-8ff5-e0afeebded87',
  1, -- portion_size (default to 1 serving)
  'piece',
  31714.20,
  'hard',
  25,
  20,
  true
);

-- Component 1: Fresh milk (D-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'D-1'),
  'product',
  50,
  'ml',
  NULL,
  0
);

-- Component 2: Cooking cream (D-14, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'D-14'),
  'product',
  80,
  'gram',
  NULL,
  1
);

-- Component 3: Parmesan (D-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'D-4'),
  'product',
  15,
  'gram',
  '1sp',
  2
);

-- Component 4: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  1,
  'gram',
  NULL,
  3
);

-- Component 5: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  1,
  'gram',
  NULL,
  4
);

-- Component 6: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  1,
  'gram',
  NULL,
  5
);

-- Component 7: Thyme (H-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'H-7'),
  'product',
  2,
  'gram',
  NULL,
  6
);

-- Component 8: Soy souce (C-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'C-19'),
  'product',
  5,
  'ml',
  '2tsp',
  7
);

-- Component 9: Chicken breast thawed 150g (was M-8) (P-25, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM preparations WHERE code = 'P-25'),
  'preparation',
  150,
  'gram',
  NULL,
  8
);

-- Component 10: Mushroom sliced (was V-2) (P-28, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM preparations WHERE code = 'P-28'),
  'preparation',
  50,
  'gram',
  NULL,
  9
);

-- Component 11: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  1,
  'gram',
  NULL,
  10
);

-- Component 12: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  7,
  'gram',
  NULL,
  11
);

-- Component 13: MushPotato (P-1, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-2'),
  (SELECT id FROM preparations WHERE code = 'P-1'),
  'preparation',
  200,
  'gram',
  '4 sp',
  12
);


-- Recipe R-3: PokeSalmon (poke_bowl, 18 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-3',
  'R-3',
  'PokeSalmon',
  'e64c54a0-491b-4edb-bb17-f99d8474d878',
  1, -- portion_size (default to 1 serving)
  'piece',
  29734.40,
  'medium',
  20,
  15,
  true
);

-- Component 1: Edamame cooked (was V-15) (P-37, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM preparations WHERE code = 'P-37'),
  'preparation',
  50,
  'gram',
  NULL,
  0
);

-- Component 2: Salmon portion 44g (was M-4) (P-19, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM preparations WHERE code = 'P-19'),
  'preparation',
  44,
  'gram',
  NULL,
  1
);

-- Component 3: Rice (S-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'S-20'),
  'product',
  100,
  'gram',
  NULL,
  2
);

-- Component 4: Nori tabur (O-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'O-7'),
  'product',
  6,
  'gram',
  '3sp',
  3
);

-- Component 5: Carrot (V-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'V-20'),
  'product',
  30,
  'gram',
  NULL,
  4
);

-- Component 6: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  30,
  'gram',
  NULL,
  5
);

-- Component 7: Jagung manis ( corn) (V-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'V-19'),
  'product',
  20,
  'gram',
  NULL,
  6
);

-- Component 8: Lobak putih ( daikon) (V-17, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'V-17'),
  'product',
  40,
  'gram',
  NULL,
  7
);

-- Component 9: Kol ungu ( red cabbage) (V-16, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'V-16'),
  'product',
  40,
  'gram',
  NULL,
  8
);

-- Component 10: Nori original (O-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'O-8'),
  'product',
  0.25,
  'piece',
  '0.25pc',
  9
);

-- Component 11: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  4,
  'gram',
  NULL,
  10
);

-- Component 12: Extra virgin olive oil (C-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'C-8'),
  'product',
  8,
  'ml',
  '3sp',
  11
);

-- Component 13: Balzamic vinegar (C-10, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'C-10'),
  'product',
  5,
  'ml',
  '2sp',
  12
);

-- Component 14: Sesame oil (C-16, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'C-16'),
  'product',
  8,
  'ml',
  '3sp',
  13
);

-- Component 15: Soy souce (C-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'C-19'),
  'product',
  8,
  'ml',
  '3sp',
  14
);

-- Component 16: Sesame white (S-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'S-3'),
  'product',
  1,
  'gram',
  '1/2tsp',
  15
);

-- Component 17: Thousand iland (C-18, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM products WHERE code = 'C-18'),
  'product',
  7,
  'ml',
  '1 sp',
  16
);

-- Component 18: Lemongrass (sushi) (P-8, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-3'),
  (SELECT id FROM preparations WHERE code = 'P-8'),
  'preparation',
  30,
  'ml',
  NULL,
  17
);


-- Recipe R-4: SushiWrap (poke_bowl, 16 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-4',
  'R-4',
  'SushiWrap',
  'e64c54a0-491b-4edb-bb17-f99d8474d878',
  1, -- portion_size (default to 1 serving)
  'piece',
  32735.10,
  'medium',
  15,
  10,
  true
);

-- Component 1: Nori original (O-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'O-8'),
  'product',
  3,
  'piece',
  '3 pc',
  0
);

-- Component 2: Salmon portion 30g (was M-4) (P-18, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM preparations WHERE code = 'P-18'),
  'preparation',
  30,
  'gram',
  NULL,
  1
);

-- Component 3: Tuna portion 30g (was M-3) (P-13, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM preparations WHERE code = 'P-13'),
  'preparation',
  30,
  'gram',
  NULL,
  2
);

-- Component 4: Kol ungu ( red cabbage) (V-16, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'V-16'),
  'product',
  38,
  'gram',
  NULL,
  3
);

-- Component 5: Ricotta cheese (D-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'D-6'),
  'product',
  33,
  'gram',
  '3 sp',
  4
);

-- Component 6: Avocado (V-24, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'V-24'),
  'product',
  75,
  'gram',
  NULL,
  5
);

-- Component 7: Rice (S-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'S-20'),
  'product',
  50,
  'gram',
  NULL,
  6
);

-- Component 8: Timun (cucumber) (V-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'V-8'),
  'product',
  7,
  'gram',
  '3 slc',
  7
);

-- Component 9: Thyme (H-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'H-7'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  8
);

-- Component 10: Sesame oil (C-16, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'C-16'),
  'product',
  2,
  'ml',
  '1 tsp',
  9
);

-- Component 11: Soy souce (C-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'C-19'),
  'product',
  5,
  'ml',
  '2 tsp',
  10
);

-- Component 12: Sesame black (S-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'S-4'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  11
);

-- Component 13: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  5,
  'gram',
  NULL,
  12
);

-- Component 14: Wasabi (C-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'C-21'),
  'product',
  1,
  'ml',
  '1/4 tsp',
  13
);

-- Component 15: Chili powder (H-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM products WHERE code = 'H-12'),
  'product',
  0.2,
  'gram',
  '1/8 tsp',
  14
);

-- Component 16: Lemongrass (sushi) (P-8, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-4'),
  (SELECT id FROM preparations WHERE code = 'P-8'),
  'preparation',
  30,
  'ml',
  NULL,
  15
);


-- Recipe R-5: SaladGreek (salad, 9 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-5',
  'R-5',
  'SaladGreek',
  '4f231ea8-0cdf-47c3-912e-a1c131ad252d',
  1, -- portion_size (default to 1 serving)
  'piece',
  16105.70,
  'easy',
  5,
  0,
  true
);

-- Component 1: Olive black (C-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'C-6'),
  'product',
  15,
  'piece',
  '8biji',
  0
);

-- Component 2: Salad Romain (V-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'V-5'),
  'product',
  60,
  'gram',
  NULL,
  1
);

-- Component 3: Timun (cucumber) (V-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'V-8'),
  'product',
  30,
  'gram',
  NULL,
  2
);

-- Component 4: Basil leaf (V-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'V-12'),
  'product',
  1,
  'gram',
  NULL,
  3
);

-- Component 5: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  50,
  'gram',
  NULL,
  4
);

-- Component 6: Tomato local (V-26, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'V-26'),
  'product',
  30,
  'gram',
  '1 pcs',
  5
);

-- Component 7: feta cheese (D-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'D-5'),
  'product',
  25,
  'gram',
  NULL,
  6
);

-- Component 8: Tortilla Flour 25cm (F-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM products WHERE code = 'F-4'),
  'product',
  0.33,
  'piece',
  '1/3 pcs',
  7
);

-- Component 9: Oil-Greek (P-11, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-5'),
  (SELECT id FROM preparations WHERE code = 'P-11'),
  'preparation',
  6,
  'ml',
  NULL,
  8
);


-- Recipe R-6: PokeTuna (poke_bowl, 16 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-6',
  'R-6',
  'PokeTuna',
  'e64c54a0-491b-4edb-bb17-f99d8474d878',
  1, -- portion_size (default to 1 serving)
  'piece',
  24706.20,
  'medium',
  20,
  15,
  true
);

-- Component 1: Tuna portion 70g (was M-3) (P-14, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM preparations WHERE code = 'P-14'),
  'preparation',
  70,
  'gram',
  NULL,
  0
);

-- Component 2: Rice (S-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'S-20'),
  'product',
  100,
  'gram',
  NULL,
  1
);

-- Component 3: Edamame cooked (was V-15) (P-37, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM preparations WHERE code = 'P-37'),
  'preparation',
  50,
  'gram',
  NULL,
  2
);

-- Component 4: Carrot (V-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'V-20'),
  'product',
  50,
  'gram',
  NULL,
  3
);

-- Component 5: Cucumber rolls (was V-8) (P-34, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM preparations WHERE code = 'P-34'),
  'preparation',
  20,
  'gram',
  NULL,
  4
);

-- Component 6: Avocado (V-24, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'V-24'),
  'product',
  40,
  'gram',
  '1\4 pc',
  5
);

-- Component 7: Kol ungu ( red cabbage) (V-16, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'V-16'),
  'product',
  25,
  'gram',
  NULL,
  6
);

-- Component 8: Nori tabur (O-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'O-7'),
  'product',
  6,
  'gram',
  '3 tsp',
  7
);

-- Component 9: Nori original (O-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'O-8'),
  'product',
  0.25,
  'piece',
  NULL,
  8
);

-- Component 10: Extra virgin olive oil (C-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'C-8'),
  'product',
  10,
  'ml',
  '3 sp',
  9
);

-- Component 11: Sesame oil (C-16, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'C-16'),
  'product',
  5,
  'ml',
  '2 sp',
  10
);

-- Component 12: Soy souce (C-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'C-19'),
  'product',
  2.5,
  'ml',
  '1 sp',
  11
);

-- Component 13: Thyme (H-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'H-7'),
  'product',
  2,
  'gram',
  NULL,
  12
);

-- Component 14: Sesame white (S-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'S-3'),
  'product',
  1,
  'gram',
  NULL,
  13
);

-- Component 15: Sesame black (S-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM products WHERE code = 'S-4'),
  'product',
  1,
  'gram',
  NULL,
  14
);

-- Component 16: Lemongrass (sushi) (P-8, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-6'),
  (SELECT id FROM preparations WHERE code = 'P-8'),
  'preparation',
  30,
  'ml',
  NULL,
  15
);


-- Recipe R-7: TomYum (soup, 11 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-7',
  'R-7',
  'TomYum',
  'b77c2717-25b6-40ca-a420-e75cbf204522',
  1, -- portion_size (default to 1 serving)
  'piece',
  28118.00,
  'medium',
  15,
  10,
  true
);

-- Component 1: Shrimp thawed 4pc (was M-9) (P-20, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM preparations WHERE code = 'P-20'),
  'preparation',
  4,
  'piece',
  '100 gr',
  0
);

-- Component 2: Squid rings thawed 70g (was M-10) (P-21, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM preparations WHERE code = 'P-21'),
  'preparation',
  70,
  'gram',
  '3 rings',
  1
);

-- Component 3: Rice (S-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'S-20'),
  'product',
  100,
  'gram',
  NULL,
  2
);

-- Component 4: Santal kara (Coconut milk) (C-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'C-4'),
  'product',
  40,
  'ml',
  NULL,
  3
);

-- Component 5: Mushroom sliced (was V-2) (P-28, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM preparations WHERE code = 'P-28'),
  'preparation',
  50,
  'gram',
  NULL,
  4
);

-- Component 6: Kefir leaf (V-32, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'V-32'),
  'product',
  2,
  'piece',
  '2pc',
  5
);

-- Component 7: Coriander leaf (V-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'V-13'),
  'product',
  1.5,
  'gram',
  NULL,
  6
);

-- Component 8: Tom yam paste (O-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'O-11'),
  'product',
  12,
  'gram',
  '2 tsp',
  7
);

-- Component 9: Sereh ( Lemon grass ) (V-31, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'V-31'),
  'product',
  1,
  'piece',
  NULL,
  8
);

-- Component 10: Ginger (V-30, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'V-30'),
  'product',
  5,
  'gram',
  '3pc',
  9
);

-- Component 11: Water (A-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-7'),
  (SELECT id FROM products WHERE code = 'A-1'),
  'product',
  80,
  'ml',
  NULL,
  10
);


-- Recipe R-8: Pumpking soup (soup, 13 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-8',
  'R-8',
  'Pumpking soup',
  'b77c2717-25b6-40ca-a420-e75cbf204522',
  1, -- portion_size (default to 1 serving)
  'piece',
  16051.40,
  'medium',
  20,
  15,
  true
);

-- Component 1: Pumpkin cooked 150g (was V-18) (P-49, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM preparations WHERE code = 'P-49'),
  'preparation',
  150,
  'gram',
  NULL,
  0
);

-- Component 2: Whipping cream (D-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'D-2'),
  'product',
  60,
  'ml',
  NULL,
  1
);

-- Component 3: Mozarella cheese (D-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'D-7'),
  'product',
  15,
  'gram',
  NULL,
  2
);

-- Component 4: Santal kara (Coconut milk) (C-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'C-4'),
  'product',
  41,
  'ml',
  NULL,
  3
);

-- Component 5: Jamur (V-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'V-2'),
  'product',
  22,
  'gram',
  NULL,
  4
);

-- Component 6: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  5
);

-- Component 7: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.4,
  'gram',
  '1/2 tsp',
  6
);

-- Component 8: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.4,
  'gram',
  '1/2 tsp',
  7
);

-- Component 9: Sesame black (S-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'S-4'),
  'product',
  0.4,
  'gram',
  '1/2 tsp',
  8
);

-- Component 10: Parsley (V-10, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'V-10'),
  'product',
  1.1,
  'gram',
  NULL,
  9
);

-- Component 11: Madras curry (H-14, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'H-14'),
  'product',
  9,
  'gram',
  '1/2 sp',
  10
);

-- Component 12: SourDough bread (B-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'B-3'),
  'product',
  1,
  'piece',
  NULL,
  11
);

-- Component 13: Water (A-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-8'),
  (SELECT id FROM products WHERE code = 'A-1'),
  'product',
  20,
  'ml',
  NULL,
  12
);


-- Recipe R-9: Bolognese pasta (pasta, 13 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-9',
  'R-9',
  'Bolognese pasta',
  '76bfd5c0-684a-4af0-9fd8-157d057c3a29',
  1, -- portion_size (default to 1 serving)
  'piece',
  21204.10,
  'hard',
  25,
  15,
  true
);

-- Component 1: Spagetti (O-9, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'O-9'),
  'product',
  150,
  'gram',
  NULL,
  0
);

-- Component 2: Paprika merah (V-22, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'V-22'),
  'product',
  30,
  'gram',
  NULL,
  1
);

-- Component 3: Parmesan (D-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'D-4'),
  'product',
  5,
  'gram',
  '1 sp',
  2
);

-- Component 4: Beef slices 30g (was M-1) (P-22, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM preparations WHERE code = 'P-22'),
  'preparation',
  30,
  'gram',
  '2 sl',
  3
);

-- Component 5: Basil leaf (V-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'V-12'),
  'product',
  1,
  'gram',
  NULL,
  4
);

-- Component 6: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  94,
  'gram',
  '6pc',
  5
);

-- Component 7: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  6,
  'gram',
  '1pc',
  6
);

-- Component 8: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  10,
  'gram',
  '1sl',
  7
);

-- Component 9: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  8
);

-- Component 10: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  9
);

-- Component 11: Thyme (H-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'H-7'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  10
);

-- Component 12: Extra virgin olive oil (C-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM products WHERE code = 'C-8'),
  'product',
  3.5,
  'ml',
  '1 sp',
  11
);

-- Component 13: Concase (P-3, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-9'),
  (SELECT id FROM preparations WHERE code = 'P-3'),
  'preparation',
  30,
  'ml',
  '7 sp',
  12
);


-- Recipe R-10: Carbonara pasta (pasta, 14 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-10',
  'R-10',
  'Carbonara pasta',
  '76bfd5c0-684a-4af0-9fd8-157d057c3a29',
  1, -- portion_size (default to 1 serving)
  'piece',
  27157.90,
  'hard',
  25,
  15,
  true
);

-- Component 1: Spagetti (O-9, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'O-9'),
  'product',
  150,
  'gram',
  NULL,
  0
);

-- Component 2: Ham slices 30g (was M-5) (P-26, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM preparations WHERE code = 'P-26'),
  'preparation',
  30,
  'gram',
  '1 sl',
  1
);

-- Component 3: Jamur (V-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'V-2'),
  'product',
  40,
  'gram',
  '4 pcs',
  2
);

-- Component 4: Cooking cream (D-14, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'D-14'),
  'product',
  100,
  'gram',
  NULL,
  3
);

-- Component 5: Fresh milk (D-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'D-1'),
  'product',
  80,
  'ml',
  NULL,
  4
);

-- Component 6: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  2,
  'gram',
  '1 pcs',
  5
);

-- Component 7: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  8,
  'gram',
  '1 sl',
  6
);

-- Component 8: Parmesan (D-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'D-4'),
  'product',
  10,
  'gram',
  '2 sp',
  7
);

-- Component 9: Basil leaf (V-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'V-12'),
  'product',
  1,
  'gram',
  NULL,
  8
);

-- Component 10: Sesame black (S-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'S-4'),
  'product',
  0.8,
  'gram',
  '1/2 tsp',
  9
);

-- Component 11: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.8,
  'gram',
  '1/2 tsp',
  10
);

-- Component 12: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.8,
  'gram',
  '1/2 tsp',
  11
);

-- Component 13: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.8,
  'gram',
  '1/2 tsp',
  12
);

-- Component 14: Extra virgin olive oil (C-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-10'),
  (SELECT id FROM products WHERE code = 'C-8'),
  'product',
  8,
  'ml',
  '1 sp',
  13
);


-- Recipe R-11: Dumplings pork\beef (breakfast, 5 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-11',
  'R-11',
  'Dumplings pork\beef',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  26671.00,
  'hard',
  30,
  25,
  true
);

-- Component 1: Dumpling pork/beef (R-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-11'),
  (SELECT id FROM products WHERE code = 'R-2'),
  'product',
  14,
  'piece',
  NULL,
  0
);

-- Component 2: Sour cream (D-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-11'),
  (SELECT id FROM products WHERE code = 'D-13'),
  'product',
  22,
  'gram',
  '3 sp',
  1
);

-- Component 3: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-11'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.6,
  'gram',
  '1/2 tsp',
  2
);

-- Component 4: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-11'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  3
);

-- Component 5: Black pepper biji (H-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-11'),
  (SELECT id FROM products WHERE code = 'H-6'),
  'product',
  0.5,
  'gram',
  '1/8 tsp',
  4
);


-- Recipe R-12: Dumplings potato (breakfast, 9 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-12',
  'R-12',
  'Dumplings potato',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  27161.30,
  'hard',
  30,
  25,
  true
);

-- Component 1: Dumplings potato (R-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'R-1'),
  'product',
  6,
  'piece',
  NULL,
  0
);

-- Component 2: Cooking cream (D-14, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'D-14'),
  'product',
  40,
  'gram',
  NULL,
  1
);

-- Component 3: Fresh milk (D-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'D-1'),
  'product',
  40,
  'ml',
  NULL,
  2
);

-- Component 4: Mushroom sliced (was V-2) (P-28, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM preparations WHERE code = 'P-28'),
  'preparation',
  50,
  'gram',
  NULL,
  3
);

-- Component 5: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  4,
  'gram',
  '1/4 pc',
  4
);

-- Component 6: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  4,
  'gram',
  '1 sl',
  5
);

-- Component 7: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  6
);

-- Component 8: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  7
);

-- Component 9: Black pepper biji (H-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-12'),
  (SELECT id FROM products WHERE code = 'H-6'),
  'product',
  0.6,
  'gram',
  '1/8 tsp',
  8
);


-- Recipe R-13: Beef steak (steak, 9 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-13',
  'R-13',
  'Beef steak',
  'b861514a-a630-4beb-8ff5-e0afeebded87',
  1, -- portion_size (default to 1 serving)
  'piece',
  63645.00,
  'hard',
  25,
  20,
  true
);

-- Component 1: Beef steak 210g (was M-7) (P-24, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM preparations WHERE code = 'P-24'),
  'preparation',
  210,
  'gram',
  NULL,
  0
);

-- Component 2: French fries portion 100g (was F-2) (P-45, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM preparations WHERE code = 'P-45'),
  'preparation',
  100,
  'gram',
  NULL,
  1
);

-- Component 3: Oil goreng (C-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM products WHERE code = 'C-7'),
  'product',
  36,
  'ml',
  NULL,
  2
);

-- Component 4: Broccoly (V-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM products WHERE code = 'V-7'),
  'product',
  95,
  'gram',
  NULL,
  3
);

-- Component 5: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  1.2,
  'gram',
  '1/2 tsp',
  4
);

-- Component 6: Garam kasar (H-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM products WHERE code = 'H-3'),
  'product',
  1,
  'gram',
  '1/2 tsp',
  5
);

-- Component 7: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  5,
  'gram',
  '1 ps',
  6
);

-- Component 8: Rosmarin (V-44, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM products WHERE code = 'V-44'),
  'product',
  10,
  'gram',
  '1 ps',
  7
);

-- Component 9: Pepper souce (P-6, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-13'),
  (SELECT id FROM preparations WHERE code = 'P-6'),
  'preparation',
  11,
  'ml',
  NULL,
  8
);


-- Recipe R-14: Moza ciabatta (sandwich, 10 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-14',
  'R-14',
  'Moza ciabatta',
  '8107fe6e-e432-4315-9c46-ae52b4f267c9',
  1, -- portion_size (default to 1 serving)
  'piece',
  28551.50,
  'medium',
  15,
  10,
  true
);

-- Component 1: Ciabatta (B-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM products WHERE code = 'B-1'),
  'product',
  1,
  'piece',
  '1 ps',
  0
);

-- Component 2: Tomato local (V-26, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM products WHERE code = 'V-26'),
  'product',
  40,
  'gram',
  '1/2',
  1
);

-- Component 3: Mozarella cheese (D-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM products WHERE code = 'D-7'),
  'product',
  60,
  'gram',
  NULL,
  2
);

-- Component 4: Mayo (O-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM products WHERE code = 'O-4'),
  'product',
  30,
  'gram',
  NULL,
  3
);

-- Component 5: Ham slices 30g (was M-5) (P-26, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM preparations WHERE code = 'P-26'),
  'preparation',
  30,
  'gram',
  '1 sl',
  4
);

-- Component 6: Jamur (V-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM products WHERE code = 'V-2'),
  'product',
  30,
  'gram',
  NULL,
  5
);

-- Component 7: Salad Romain (V-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM products WHERE code = 'V-5'),
  'product',
  18,
  'gram',
  NULL,
  6
);

-- Component 8: Misuna (V-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM products WHERE code = 'V-6'),
  'product',
  12,
  'gram',
  NULL,
  7
);

-- Component 9: Mushroom souce (P-7, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM preparations WHERE code = 'P-7'),
  'preparation',
  20,
  'ml',
  NULL,
  8
);

-- Component 10: Humus (P-4, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-14'),
  (SELECT id FROM preparations WHERE code = 'P-4'),
  'preparation',
  40,
  'ml',
  NULL,
  9
);


-- Recipe R-15: Syrniki (breakfast, 3 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-15',
  'R-15',
  'Syrniki',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  29395.10,
  'easy',
  15,
  10,
  true
);

-- Component 1: Syrniki (R-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-15'),
  (SELECT id FROM products WHERE code = 'R-3'),
  'product',
  3,
  'piece',
  NULL,
  0
);

-- Component 2: Sour cream (D-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-15'),
  (SELECT id FROM products WHERE code = 'D-13'),
  'product',
  30,
  'gram',
  '3 sp',
  1
);

-- Component 3: Jam - sweet dragon (P-12, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-15'),
  (SELECT id FROM preparations WHERE code = 'P-12'),
  'preparation',
  30,
  'ml',
  NULL,
  2
);


-- Recipe R-16: Hasbrown potato (breakfast, 7 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-16',
  'R-16',
  'Hasbrown potato',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  3184.00,
  'medium',
  15,
  10,
  true
);

-- Component 1: Grated potato (was V-3) (P-35, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-16'),
  (SELECT id FROM preparations WHERE code = 'P-35'),
  'preparation',
  100,
  'gram',
  NULL,
  0
);

-- Component 2: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-16'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  0.5,
  'piece',
  NULL,
  1
);

-- Component 3: Tempung terigu (S-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-16'),
  (SELECT id FROM products WHERE code = 'S-13'),
  'product',
  4,
  'gram',
  '1sp',
  2
);

-- Component 4: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-16'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  3
);

-- Component 5: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-16'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  4
);

-- Component 6: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-16'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  5
);

-- Component 7: Curcuma (H-15, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-16'),
  (SELECT id FROM products WHERE code = 'H-15'),
  'product',
  0.6,
  'gram',
  '1/8 tsp',
  6
);


-- Recipe R-17: Hasbrown burger (sandwich, 10 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-17',
  'R-17',
  'Hasbrown burger',
  '8107fe6e-e432-4315-9c46-ae52b4f267c9',
  1, -- portion_size (default to 1 serving)
  'piece',
  12980.00,
  'medium',
  15,
  10,
  true
);

-- Component 1: Salad Romain (V-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM products WHERE code = 'V-5'),
  'product',
  40,
  'gram',
  NULL,
  0
);

-- Component 2: Misuna (V-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM products WHERE code = 'V-6'),
  'product',
  15,
  'gram',
  NULL,
  1
);

-- Component 3: Timun (cucumber) (V-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM products WHERE code = 'V-8'),
  'product',
  12,
  'gram',
  '2sl',
  2
);

-- Component 4: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  20,
  'gram',
  '2pc',
  3
);

-- Component 5: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  5,
  'gram',
  '1/4 sl',
  4
);

-- Component 6: Beef slices 30g (was M-1) (P-22, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM preparations WHERE code = 'P-22'),
  'preparation',
  30,
  'gram',
  '2 sl',
  5
);

-- Component 7: Cream cheese (D-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM products WHERE code = 'D-3'),
  'product',
  19,
  'gram',
  '2 cut',
  6
);

-- Component 8: Terong ( Egg plane ) (V-28, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM products WHERE code = 'V-28'),
  'product',
  40,
  'gram',
  '2 sl',
  7
);

-- Component 9: Oil-Greek (P-11, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM preparations WHERE code = 'P-11'),
  'preparation',
  13,
  'ml',
  NULL,
  8
);

-- Component 10: Mushroom souce (P-7, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-17'),
  (SELECT id FROM preparations WHERE code = 'P-7'),
  'preparation',
  30,
  'ml',
  NULL,
  9
);


-- Recipe R-18: Big breakfast (breakfast, 16 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-18',
  'R-18',
  'Big breakfast',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  24572.80,
  'medium',
  15,
  10,
  true
);

-- Component 1: SourDough bread (B-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'B-3'),
  'product',
  1,
  'piece',
  '1 sl',
  0
);

-- Component 2: Beef slices 30g (was M-1) (P-22, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM preparations WHERE code = 'P-22'),
  'preparation',
  30,
  'gram',
  '2 sl',
  1
);

-- Component 3: Mozarella cheese (D-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'D-7'),
  'product',
  60,
  'gram',
  NULL,
  2
);

-- Component 4: Mayo (O-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'O-4'),
  'product',
  30,
  'gram',
  NULL,
  3
);

-- Component 5: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  1,
  'piece',
  NULL,
  4
);

-- Component 6: Grated potato (was V-3) (P-35, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM preparations WHERE code = 'P-35'),
  'preparation',
  100,
  'gram',
  NULL,
  5
);

-- Component 7: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  0.5,
  'piece',
  NULL,
  6
);

-- Component 8: Tempung terigu (S-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'S-13'),
  'product',
  15,
  'gram',
  '1sp',
  7
);

-- Component 9: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.5,
  'gram',
  '1/4 tsp',
  8
);

-- Component 10: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.5,
  'gram',
  '1/4 tsp',
  9
);

-- Component 11: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.5,
  'gram',
  '1/4 tsp',
  10
);

-- Component 12: Curcuma (H-15, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'H-15'),
  'product',
  0.5,
  'gram',
  '1/8 tsp',
  11
);

-- Component 13: Salad Romain (V-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'V-5'),
  'product',
  25,
  'gram',
  NULL,
  12
);

-- Component 14: Misuna (V-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'V-6'),
  'product',
  10,
  'gram',
  NULL,
  13
);

-- Component 15: Tomato local (V-26, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM products WHERE code = 'V-26'),
  'product',
  35,
  'gram',
  '2 sl',
  14
);

-- Component 16: Mushroom souce (P-7, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-18'),
  (SELECT id FROM preparations WHERE code = 'P-7'),
  'preparation',
  30,
  'ml',
  NULL,
  15
);


-- Recipe R-19: Simple breakfast (breakfast, 11 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-19',
  'R-19',
  'Simple breakfast',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  18677.60,
  'medium',
  15,
  10,
  true
);

-- Component 1: SourDough bread (B-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'B-3'),
  'product',
  1,
  'piece',
  '1 sl',
  0
);

-- Component 2: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  2,
  'piece',
  '2 ps',
  1
);

-- Component 3: Mozarella cheese (D-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'D-7'),
  'product',
  12,
  'gram',
  NULL,
  2
);

-- Component 4: Avocado (V-24, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'V-24'),
  'product',
  140,
  'gram',
  '1/2 pc',
  3
);

-- Component 5: Salad Romain (V-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'V-5'),
  'product',
  40,
  'gram',
  NULL,
  4
);

-- Component 6: Misuna (V-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'V-6'),
  'product',
  15,
  'gram',
  NULL,
  5
);

-- Component 7: Timun (cucumber) (V-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'V-8'),
  'product',
  36,
  'gram',
  '2sl',
  6
);

-- Component 8: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  22,
  'gram',
  '2pc',
  7
);

-- Component 9: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  8,
  'gram',
  '1/4 sl',
  8
);

-- Component 10: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.8,
  'gram',
  '1/4 tsp',
  9
);

-- Component 11: Oil-Greek (P-11, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-19'),
  (SELECT id FROM preparations WHERE code = 'P-11'),
  'preparation',
  13,
  'ml',
  NULL,
  10
);


-- Recipe R-20: Salmon ciabatta (sandwich, 9 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-20',
  'R-20',
  'Salmon ciabatta',
  '8107fe6e-e432-4315-9c46-ae52b4f267c9',
  1, -- portion_size (default to 1 serving)
  'piece',
  28145.20,
  'medium',
  15,
  10,
  true
);

-- Component 1: Ciabatta (B-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM products WHERE code = 'B-1'),
  'product',
  1,
  'piece',
  '1pc',
  0
);

-- Component 2: Avocado (V-24, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM products WHERE code = 'V-24'),
  'product',
  75,
  'gram',
  '1/4 pc',
  1
);

-- Component 3: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  1,
  'piece',
  '1pc',
  2
);

-- Component 4: Salmon portion 30g (was M-4) (P-18, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM preparations WHERE code = 'P-18'),
  'preparation',
  30,
  'gram',
  NULL,
  3
);

-- Component 5: Ricotta cheese (D-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM products WHERE code = 'D-6'),
  'product',
  35,
  'gram',
  '2 sp',
  4
);

-- Component 6: Basil leaf (V-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM products WHERE code = 'V-12'),
  'product',
  10,
  'gram',
  NULL,
  5
);

-- Component 7: Chili powder (H-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM products WHERE code = 'H-12'),
  'product',
  0.8,
  'gram',
  '1/4 tsp',
  6
);

-- Component 8: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.8,
  'gram',
  '1/8 tsp',
  7
);

-- Component 9: Holondaise basil (P-2, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-20'),
  (SELECT id FROM preparations WHERE code = 'P-2'),
  'preparation',
  36,
  'ml',
  NULL,
  8
);


-- Recipe R-21: Shakshuka (breakfast, 8 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-21',
  'R-21',
  'Shakshuka',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  21195.10,
  'hard',
  30,
  10,
  true
);

-- Component 1: SourDough bread (B-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM products WHERE code = 'B-3'),
  'product',
  1,
  'piece',
  NULL,
  0
);

-- Component 2: Tomato local (V-26, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM products WHERE code = 'V-26'),
  'product',
  150,
  'gram',
  '5 pcs',
  1
);

-- Component 3: Onion sliced (was V-29) (P-30, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM preparations WHERE code = 'P-30'),
  'preparation',
  20,
  'gram',
  '1 sl',
  2
);

-- Component 4: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  2,
  'piece',
  '2 ps',
  3
);

-- Component 5: Parsley (V-10, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM products WHERE code = 'V-10'),
  'product',
  5,
  'gram',
  NULL,
  4
);

-- Component 6: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  1,
  'gram',
  '1/4 tsp',
  5
);

-- Component 7: Chili powder (H-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM products WHERE code = 'H-12'),
  'product',
  1,
  'gram',
  '1/4 tsp',
  6
);

-- Component 8: Concase (P-3, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-21'),
  (SELECT id FROM preparations WHERE code = 'P-3'),
  'preparation',
  60,
  'ml',
  NULL,
  7
);


-- Recipe R-22: ZukiniHashbrown (breakfast, 7 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-22',
  'R-22',
  'ZukiniHashbrown',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  8741.00,
  'medium',
  15,
  10,
  true
);

-- Component 1: Grated zukini (was V-9) (P-36, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-22'),
  (SELECT id FROM preparations WHERE code = 'P-36'),
  'preparation',
  100,
  'gram',
  NULL,
  0
);

-- Component 2: Tempung terigu (S-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-22'),
  (SELECT id FROM products WHERE code = 'S-13'),
  'product',
  7,
  'gram',
  '1 sp',
  1
);

-- Component 3: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-22'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  0.5,
  'piece',
  '1/2',
  2
);

-- Component 4: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-22'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  3
);

-- Component 5: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-22'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  0.6,
  'gram',
  '1/8 tsp',
  4
);

-- Component 6: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-22'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  5
);

-- Component 7: Coriander herbs (H-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-22'),
  (SELECT id FROM products WHERE code = 'H-13'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  6
);


-- Recipe R-23: HeartyBreakfast (breakfast, 13 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-23',
  'R-23',
  'HeartyBreakfast',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  14129.00,
  'medium',
  15,
  10,
  true
);

-- Component 1: Bacon slices 30g (was M-6) (P-27, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM preparations WHERE code = 'P-27'),
  'preparation',
  30,
  'gram',
  '1 sl',
  0
);

-- Component 2: Oil goreng (C-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'C-7'),
  'product',
  18,
  'ml',
  NULL,
  1
);

-- Component 3: Telur (V-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'V-1'),
  'product',
  1,
  'piece',
  '1',
  2
);

-- Component 4: Jamur (V-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'V-2'),
  'product',
  40,
  'gram',
  NULL,
  3
);

-- Component 5: SourDough bread (B-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'B-3'),
  'product',
  1,
  'piece',
  '1sl',
  4
);

-- Component 6: Salad Romain (V-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'V-5'),
  'product',
  40,
  'gram',
  NULL,
  5
);

-- Component 7: Misuna (V-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'V-6'),
  'product',
  15,
  'gram',
  NULL,
  6
);

-- Component 8: Timun (cucumber) (V-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'V-8'),
  'product',
  15,
  'gram',
  '2sl',
  7
);

-- Component 9: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  13,
  'gram',
  '2pc',
  8
);

-- Component 10: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  5,
  'gram',
  '1/4 sl',
  9
);

-- Component 11: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  2,
  'gram',
  '1/4 tsp',
  10
);

-- Component 12: Oil-Greek (P-11, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM preparations WHERE code = 'P-11'),
  'preparation',
  13,
  'ml',
  NULL,
  11
);

-- Component 13: Cheese souce (P-9, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-23'),
  (SELECT id FROM preparations WHERE code = 'P-9'),
  'preparation',
  30,
  'ml',
  NULL,
  12
);


-- Recipe R-24: Porridge (breakfast, 7 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-24',
  'R-24',
  'Porridge',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  6679.00,
  'medium',
  10,
  10,
  true
);

-- Component 1: Rolled Oat (S-16, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-24'),
  (SELECT id FROM products WHERE code = 'S-16'),
  'product',
  50,
  'gram',
  NULL,
  0
);

-- Component 2: Santal kara (Coconut milk) (C-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-24'),
  (SELECT id FROM products WHERE code = 'C-4'),
  'product',
  21,
  'ml',
  NULL,
  1
);

-- Component 3: Banana (V-36, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-24'),
  (SELECT id FROM products WHERE code = 'V-36'),
  'product',
  40,
  'gram',
  '1/4',
  2
);

-- Component 4: Coconut flakes (S-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-24'),
  (SELECT id FROM products WHERE code = 'S-6'),
  'product',
  20,
  'gram',
  NULL,
  3
);

-- Component 5: Raisin (S-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-24'),
  (SELECT id FROM products WHERE code = 'S-7'),
  'product',
  30,
  'gram',
  NULL,
  4
);

-- Component 6: Gula pasir (S-9, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-24'),
  (SELECT id FROM products WHERE code = 'S-9'),
  'product',
  12,
  'gram',
  '1/4 tsp',
  5
);

-- Component 7: Water (A-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-24'),
  (SELECT id FROM products WHERE code = 'A-1'),
  'product',
  20,
  'ml',
  NULL,
  6
);


-- Recipe R-25: Quesadililia (breakfast, 10 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-25',
  'R-25',
  'Quesadililia',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  27100.90,
  'medium',
  15,
  10,
  true
);

-- Component 1: Tortilla Flour 25cm (F-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'F-4'),
  'product',
  2,
  'piece',
  '2 pc',
  0
);

-- Component 2: Mozarella cheese (D-7, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'D-7'),
  'product',
  100,
  'gram',
  NULL,
  1
);

-- Component 3: Jamur (V-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'V-2'),
  'product',
  40,
  'gram',
  NULL,
  2
);

-- Component 4: Basil leaf (V-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'V-12'),
  'product',
  1,
  'gram',
  NULL,
  3
);

-- Component 5: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  30,
  'gram',
  '4 pc',
  4
);

-- Component 6: Paprika merah (V-22, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'V-22'),
  'product',
  50,
  'gram',
  NULL,
  5
);

-- Component 7: Jalapeno NachoSlices 2.6kg (C-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'C-12'),
  'product',
  3,
  'ml',
  '1pc',
  6
);

-- Component 8: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.8,
  'gram',
  '1/4 tsp',
  7
);

-- Component 9: Black pepper crash (H-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM products WHERE code = 'H-5'),
  'product',
  0.8,
  'gram',
  '1/4 tsp',
  8
);

-- Component 10: Concase (P-3, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-25'),
  (SELECT id FROM preparations WHERE code = 'P-3'),
  'preparation',
  31,
  'ml',
  '5 sp',
  9
);


-- Recipe R-26: SmashAvo toast (sandwich, 8 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-26',
  'R-26',
  'SmashAvo toast',
  '8107fe6e-e432-4315-9c46-ae52b4f267c9',
  1, -- portion_size (default to 1 serving)
  'piece',
  17448.50,
  'medium',
  10,
  5,
  true
);

-- Component 1: SourDough bread (B-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM products WHERE code = 'B-3'),
  'product',
  1,
  'piece',
  '1pc',
  0
);

-- Component 2: Avocado half cleaned (was V-24) (P-38, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM preparations WHERE code = 'P-38'),
  'preparation',
  130,
  'gram',
  '1/2 pc',
  1
);

-- Component 3: Edamame (V-15, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM products WHERE code = 'V-15'),
  'product',
  20,
  'gram',
  NULL,
  2
);

-- Component 4: Tomato cherry (V-21, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM products WHERE code = 'V-21'),
  'product',
  25,
  'gram',
  '5 pc',
  3
);

-- Component 5: Jamur (V-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM products WHERE code = 'V-2'),
  'product',
  40,
  'gram',
  NULL,
  4
);

-- Component 6: Extra virgin olive oil (C-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM products WHERE code = 'C-8'),
  'product',
  7.5,
  'ml',
  '1 sp',
  5
);

-- Component 7: Lime (V-34, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM products WHERE code = 'V-34'),
  'product',
  17,
  'gram',
  '1/2',
  6
);

-- Component 8: Humus red (P-5, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-26'),
  (SELECT id FROM preparations WHERE code = 'P-5'),
  'preparation',
  40,
  'ml',
  '4 sp',
  7
);


-- Recipe R-27: Guacomole ciabatta (sandwich, 10 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-27',
  'R-27',
  'Guacomole ciabatta',
  '8107fe6e-e432-4315-9c46-ae52b4f267c9',
  1, -- portion_size (default to 1 serving)
  'piece',
  18666.00,
  'medium',
  15,
  10,
  true
);

-- Component 1: Ciabatta (B-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'B-1'),
  'product',
  1,
  'piece',
  NULL,
  0
);

-- Component 2: Avocado half cleaned (was V-24) (P-38, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM preparations WHERE code = 'P-38'),
  'preparation',
  130,
  'gram',
  '1/2 pc',
  1
);

-- Component 3: Basil leaf (V-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'V-12'),
  'product',
  1,
  'gram',
  NULL,
  2
);

-- Component 4: Tomato local (V-26, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'V-26'),
  'product',
  30,
  'gram',
  '1 pc',
  3
);

-- Component 5: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  2,
  'gram',
  '1/4 pc',
  4
);

-- Component 6: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  6.5,
  'gram',
  '1/4 sl',
  5
);

-- Component 7: Lime (V-34, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'V-34'),
  'product',
  10,
  'gram',
  '1/2',
  6
);

-- Component 8: Garam biasa (H-4, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'H-4'),
  'product',
  1,
  'gram',
  '1/4 sp',
  7
);

-- Component 9: Extra virgin olive oil (C-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM products WHERE code = 'C-8'),
  'product',
  8,
  'ml',
  '2 sp',
  8
);

-- Component 10: Humus (P-4, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-27'),
  (SELECT id FROM preparations WHERE code = 'P-4'),
  'preparation',
  25,
  'ml',
  '2 sp',
  9
);


-- Recipe R-28: Croissant salmon (sandwich, 8 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-28',
  'R-28',
  'Croissant salmon',
  '8107fe6e-e432-4315-9c46-ae52b4f267c9',
  1, -- portion_size (default to 1 serving)
  'piece',
  31143.60,
  'medium',
  15,
  10,
  true
);

-- Component 1: Croissant (B-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM products WHERE code = 'B-2'),
  'product',
  1,
  'piece',
  '1',
  0
);

-- Component 2: Salmon portion 22g (was M-4) (P-17, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM preparations WHERE code = 'P-17'),
  'preparation',
  22,
  'gram',
  NULL,
  1
);

-- Component 3: Avocado (V-24, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM products WHERE code = 'V-24'),
  'product',
  65,
  'gram',
  '1/4',
  2
);

-- Component 4: Ricotta cheese (D-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM products WHERE code = 'D-6'),
  'product',
  50,
  'gram',
  NULL,
  3
);

-- Component 5: Olive black (C-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM products WHERE code = 'C-6'),
  'product',
  2,
  'piece',
  '2 pc',
  4
);

-- Component 6: Timun (cucumber) (V-8, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM products WHERE code = 'V-8'),
  'product',
  3,
  'gram',
  '1 sl',
  5
);

-- Component 7: Dill (V-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM products WHERE code = 'V-11'),
  'product',
  1,
  'gram',
  '1/2 tsp',
  6
);

-- Component 8: Sesame white (S-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-28'),
  (SELECT id FROM products WHERE code = 'S-3'),
  'product',
  0.8,
  'gram',
  '1/4 tsp',
  7
);


-- Recipe R-29: Tuna ciabatta (sandwich, 13 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-29',
  'R-29',
  'Tuna ciabatta',
  '8107fe6e-e432-4315-9c46-ae52b4f267c9',
  1, -- portion_size (default to 1 serving)
  'piece',
  24463.90,
  'medium',
  15,
  10,
  true
);

-- Component 1: Ciabatta (B-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'B-1'),
  'product',
  1,
  'piece',
  NULL,
  0
);

-- Component 2: Tuna portion 100g (was M-2) (P-15, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM preparations WHERE code = 'P-15'),
  'preparation',
  100,
  'gram',
  NULL,
  1
);

-- Component 3: Edamame (V-15, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'V-15'),
  'product',
  20,
  'gram',
  NULL,
  2
);

-- Component 4: Tomato local (V-26, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'V-26'),
  'product',
  15,
  'gram',
  '1/2',
  3
);

-- Component 5: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  3,
  'gram',
  '1 pc',
  4
);

-- Component 6: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  10,
  'gram',
  '1/4 sl',
  5
);

-- Component 7: Oregano (H-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'H-2'),
  'product',
  0.5,
  'gram',
  '1/4 tsp',
  6
);

-- Component 8: Jalapeno NachoSlices 2.6kg (C-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'C-12'),
  'product',
  1.4,
  'ml',
  '1',
  7
);

-- Component 9: Oyster souce (C-20, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'C-20'),
  'product',
  4.2,
  'ml',
  '1 tsp',
  8
);

-- Component 10: Sesame white (S-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'S-3'),
  'product',
  0.6,
  'gram',
  '1/4 tsp',
  9
);

-- Component 11: Musted (O-5, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'O-5'),
  'product',
  2.5,
  'gram',
  '1 tsp',
  10
);

-- Component 12: Rosmarin (V-44, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM products WHERE code = 'V-44'),
  'product',
  1.2,
  'gram',
  '1 pc',
  11
);

-- Component 13: Concase (P-3, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-29'),
  (SELECT id FROM preparations WHERE code = 'P-3'),
  'preparation',
  25,
  'ml',
  '2 sp',
  12
);


-- Recipe R-30: Aus beef chiabatta (breakfast, 9 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-30',
  'R-30',
  'Aus beef chiabatta',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  32465.10,
  'medium',
  15,
  10,
  true
);

-- Component 1: SourDough bread (B-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM products WHERE code = 'B-3'),
  'product',
  1,
  'piece',
  NULL,
  0
);

-- Component 2: Beef slices 88g (was M-1) (P-23, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM preparations WHERE code = 'P-23'),
  'preparation',
  88,
  'gram',
  '3 sl',
  1
);

-- Component 3: Cream cheese (D-3, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM products WHERE code = 'D-3'),
  'product',
  33,
  'gram',
  '3 cut',
  2
);

-- Component 4: Eggplant slices grilled (was V-28) (P-33, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM preparations WHERE code = 'P-33'),
  'preparation',
  45,
  'gram',
  '3 sl',
  3
);

-- Component 5: Rosmarin (V-44, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM products WHERE code = 'V-44'),
  'product',
  3,
  'gram',
  '1 pc',
  4
);

-- Component 6: Tomato local (V-26, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM products WHERE code = 'V-26'),
  'product',
  20,
  'gram',
  '1/2',
  5
);

-- Component 7: Garlic (V-27, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM products WHERE code = 'V-27'),
  'product',
  20,
  'gram',
  '1 pc',
  6
);

-- Component 8: Onion (V-29, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM products WHERE code = 'V-29'),
  'product',
  5,
  'gram',
  '1/4 sl',
  7
);

-- Component 9: Concase (P-3, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-30'),
  (SELECT id FROM preparations WHERE code = 'P-3'),
  'preparation',
  40,
  'ml',
  '5 sp',
  8
);


-- Recipe R-31: Smoothie mango (smoothie, 7 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-31',
  'R-31',
  'Smoothie mango',
  '2c64178a-6566-4793-a039-d69e795eebbf',
  1, -- portion_size (default to 1 serving)
  'piece',
  17042.00,
  'easy',
  5,
  0,
  true
);

-- Component 1: Mango frozen 100g (was V-38) (P-40, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-31'),
  (SELECT id FROM preparations WHERE code = 'P-40'),
  'preparation',
  100,
  'gram',
  NULL,
  0
);

-- Component 2: Banana frozen 150g (was V-36) (P-39, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-31'),
  (SELECT id FROM preparations WHERE code = 'P-39'),
  'preparation',
  150,
  'gram',
  NULL,
  1
);

-- Component 3: Pineapple frozen 40g (was V-45) (P-43, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-31'),
  (SELECT id FROM preparations WHERE code = 'P-43'),
  'preparation',
  40,
  'gram',
  NULL,
  2
);

-- Component 4: Yogurt palin sour (D-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-31'),
  (SELECT id FROM products WHERE code = 'D-11'),
  'product',
  100,
  'ml',
  '3 sp',
  3
);

-- Component 5: Honey (C-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-31'),
  (SELECT id FROM products WHERE code = 'C-13'),
  'product',
  20,
  'ml',
  NULL,
  4
);

-- Component 6: Coconut flakes (S-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-31'),
  (SELECT id FROM products WHERE code = 'S-6'),
  'product',
  10,
  'gram',
  NULL,
  5
);

-- Component 7: Granola (S-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-31'),
  (SELECT id FROM products WHERE code = 'S-19'),
  'product',
  35,
  'gram',
  NULL,
  6
);


-- Recipe R-32: Smoothie papaya (smoothie, 7 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-32',
  'R-32',
  'Smoothie papaya',
  '2c64178a-6566-4793-a039-d69e795eebbf',
  1, -- portion_size (default to 1 serving)
  'piece',
  15242.00,
  'easy',
  5,
  0,
  true
);

-- Component 1: Papaya frozen 100g (was V-42) (P-41, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-32'),
  (SELECT id FROM preparations WHERE code = 'P-41'),
  'preparation',
  100,
  'gram',
  NULL,
  0
);

-- Component 2: Banana frozen 150g (was V-36) (P-39, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-32'),
  (SELECT id FROM preparations WHERE code = 'P-39'),
  'preparation',
  150,
  'gram',
  NULL,
  1
);

-- Component 3: Pineapple frozen 40g (was V-45) (P-43, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-32'),
  (SELECT id FROM preparations WHERE code = 'P-43'),
  'preparation',
  40,
  'gram',
  NULL,
  2
);

-- Component 4: Yogurt palin sour (D-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-32'),
  (SELECT id FROM products WHERE code = 'D-11'),
  'product',
  100,
  'ml',
  '3 sp',
  3
);

-- Component 5: Honey (C-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-32'),
  (SELECT id FROM products WHERE code = 'C-13'),
  'product',
  20,
  'ml',
  '2 sp',
  4
);

-- Component 6: Coconut flakes (S-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-32'),
  (SELECT id FROM products WHERE code = 'S-6'),
  'product',
  10,
  'gram',
  NULL,
  5
);

-- Component 7: Granola (S-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-32'),
  (SELECT id FROM products WHERE code = 'S-19'),
  'product',
  35,
  'gram',
  NULL,
  6
);


-- Recipe R-33: Smoothie dragon (smoothie, 7 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-33',
  'R-33',
  'Smoothie dragon',
  '2c64178a-6566-4793-a039-d69e795eebbf',
  1, -- portion_size (default to 1 serving)
  'piece',
  18060.00,
  'easy',
  5,
  0,
  true
);

-- Component 1: Banana frozen 150g (was V-36) (P-39, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-33'),
  (SELECT id FROM preparations WHERE code = 'P-39'),
  'preparation',
  150,
  'gram',
  NULL,
  0
);

-- Component 2: Strawberry frozen 100g (was F-1) (P-44, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-33'),
  (SELECT id FROM preparations WHERE code = 'P-44'),
  'preparation',
  100,
  'gram',
  NULL,
  1
);

-- Component 3: Dragon fruit frozen 30g (was V-37) (P-42, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-33'),
  (SELECT id FROM preparations WHERE code = 'P-42'),
  'preparation',
  30,
  'gram',
  NULL,
  2
);

-- Component 4: Yogurt palin sour (D-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-33'),
  (SELECT id FROM products WHERE code = 'D-11'),
  'product',
  100,
  'ml',
  '3 sp',
  3
);

-- Component 5: Honey (C-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-33'),
  (SELECT id FROM products WHERE code = 'C-13'),
  'product',
  20,
  'ml',
  '2 sp',
  4
);

-- Component 6: Coconut flakes (S-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-33'),
  (SELECT id FROM products WHERE code = 'S-6'),
  'product',
  10,
  'gram',
  NULL,
  5
);

-- Component 7: Granola (S-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-33'),
  (SELECT id FROM products WHERE code = 'S-19'),
  'product',
  35,
  'gram',
  NULL,
  6
);


-- Recipe R-34: Smoothie choco-coco (smoothie, 8 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-34',
  'R-34',
  'Smoothie choco-coco',
  '2c64178a-6566-4793-a039-d69e795eebbf',
  1, -- portion_size (default to 1 serving)
  'piece',
  17637.60,
  'easy',
  5,
  0,
  true
);

-- Component 1: Banana frozen 150g (was V-36) (P-39, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM preparations WHERE code = 'P-39'),
  'preparation',
  150,
  'gram',
  NULL,
  0
);

-- Component 2: Choco glaze (C-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM products WHERE code = 'C-11'),
  'product',
  10,
  'ml',
  NULL,
  1
);

-- Component 3: Cocao powder (S-12, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM products WHERE code = 'S-12'),
  'product',
  10,
  'gram',
  NULL,
  2
);

-- Component 4: Cashunut (N-2, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM products WHERE code = 'N-2'),
  'product',
  10,
  'gram',
  NULL,
  3
);

-- Component 5: Yogurt palin sour (D-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM products WHERE code = 'D-11'),
  'product',
  100,
  'ml',
  '3 sp',
  4
);

-- Component 6: Honey (C-13, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM products WHERE code = 'C-13'),
  'product',
  20,
  'ml',
  NULL,
  5
);

-- Component 7: Coconut flakes (S-6, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM products WHERE code = 'S-6'),
  'product',
  10,
  'gram',
  NULL,
  6
);

-- Component 8: Granola (S-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-34'),
  (SELECT id FROM products WHERE code = 'S-19'),
  'product',
  35,
  'gram',
  NULL,
  7
);


-- Recipe R-35: Fruit salad (salad, 7 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-35',
  'R-35',
  'Fruit salad',
  '4f231ea8-0cdf-47c3-912e-a1c131ad252d',
  1, -- portion_size (default to 1 serving)
  'piece',
  14274.50,
  'easy',
  5,
  0,
  true
);

-- Component 1: Banana (V-36, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-35'),
  (SELECT id FROM products WHERE code = 'V-36'),
  'product',
  100,
  'gram',
  NULL,
  0
);

-- Component 2: B. Naga (dragon) (V-37, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-35'),
  (SELECT id FROM products WHERE code = 'V-37'),
  'product',
  100,
  'gram',
  NULL,
  1
);

-- Component 3: Mango (V-38, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-35'),
  (SELECT id FROM products WHERE code = 'V-38'),
  'product',
  0,
  'gram',
  NULL,
  2
);

-- Component 4: Papaya frozen 100g (was V-42) (P-41, preparation)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-35'),
  (SELECT id FROM preparations WHERE code = 'P-41'),
  'preparation',
  100,
  'gram',
  NULL,
  3
);

-- Component 5: Strawberry (V-40, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-35'),
  (SELECT id FROM products WHERE code = 'V-40'),
  'product',
  35,
  'gram',
  '4 biji',
  4
);

-- Component 6: Yogurt palin sour (D-11, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-35'),
  (SELECT id FROM products WHERE code = 'D-11'),
  'product',
  50,
  'ml',
  '3 sp',
  5
);

-- Component 7: Granola (S-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-35'),
  (SELECT id FROM products WHERE code = 'S-19'),
  'product',
  35,
  'gram',
  NULL,
  6
);


-- Recipe R-36: Granola Yuogurt (breakfast, 3 components)
INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (
  'R-36',
  'R-36',
  'Granola Yuogurt',
  '304c60ed-f44c-442e-aa05-2ced2d24ca45',
  1, -- portion_size (default to 1 serving)
  'piece',
  11100.00,
  'easy',
  15,
  10,
  true
);

-- Component 1: Banana (V-36, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-36'),
  (SELECT id FROM products WHERE code = 'V-36'),
  'product',
  50,
  'gram',
  NULL,
  0
);

-- Component 2: Strawberry frozen (F-1, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-36'),
  (SELECT id FROM products WHERE code = 'F-1'),
  'product',
  20,
  'gram',
  NULL,
  1
);

-- Component 3: Granola (S-19, product)
INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (
  (SELECT id FROM recipes WHERE code = 'R-36'),
  (SELECT id FROM products WHERE code = 'S-19'),
  'product',
  100,
  'gram',
  NULL,
  2
);


COMMIT;

-- Summary:
-- Total recipes: 36
-- Total components: 357
-- Preparations used: 70
-- Products used: 287