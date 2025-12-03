-- Migration: Import Winter Menu Preparations (P-6 to P-49)
-- Description: Import 44 new preparations for Winter menu recipes
-- Date: 2025-12-02
-- Generated: Manual creation based on recipe analysis

-- CONTEXT: These preparations are required for Winter menu recipes
-- They include thawed portions, sauces, vegetable preps, and frozen fruits

BEGIN;

-- ==================================================
-- CATEGORY: Sauces (Missing from initial import)
-- ==================================================

-- P-6: Pepper sauce
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-6',
  'Pepper sauce',
  '559b9a35-30b2-4b15-b0a4-f27c8870c1d4', -- sauces
  'Black pepper sauce for beef steak',
  11,
  'ml',
  15,
  3,
  'kitchen',
  'See recipe card for detailed instructions',
  0,
  true
);

-- P-7: Mushroom sauce
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-7',
  'Mushroom sauce',
  '559b9a35-30b2-4b15-b0a4-f27c8870c1d4', -- sauces
  'Creamy mushroom sauce for ciabatta and breakfast dishes',
  20,
  'ml',
  20,
  3,
  'kitchen',
  'See recipe card for detailed instructions',
  0,
  true
);

-- P-8: Lemongrass sushi
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-8',
  'Lemongrass sushi',
  '559b9a35-30b2-4b15-b0a4-f27c8870c1d4', -- sauces
  'Lemongrass infusion for poke bowls and sushi',
  30,
  'ml',
  10,
  5,
  'kitchen',
  'See recipe card for detailed instructions',
  0,
  true
);

-- P-9: Cheese sauce
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-9',
  'Cheese sauce',
  '559b9a35-30b2-4b15-b0a4-f27c8870c1d4', -- sauces
  'Creamy cheese sauce for hearty breakfast',
  30,
  'ml',
  15,
  3,
  'kitchen',
  'See recipe card for detailed instructions',
  0,
  true
);

-- ==================================================
-- CATEGORY: Oils
-- ==================================================

-- P-11: Oil-Greek
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-11',
  'Oil-Greek',
  'eb5b82d0-bc65-45d7-a04d-772fe5c589d4', -- oils
  'Greek salad dressing oil blend',
  13,
  'ml',
  5,
  14,
  'kitchen',
  'See recipe card for detailed instructions',
  0,
  true
);

-- ==================================================
-- CATEGORY: Condiments
-- ==================================================

-- P-12: Jam - sweet dragon
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-12',
  'Jam - sweet dragon',
  '11f541d2-1bb2-40ec-b5c2-faedcdca04de', -- condiments
  'Dragon fruit jam for syrniki',
  30,
  'ml',
  30,
  7,
  'kitchen',
  'See recipe card for detailed instructions',
  0,
  true
);

-- ==================================================
-- CATEGORY: Seafood Portions (Thawed & Portioned)
-- ==================================================

-- P-13: Tuna portion 30g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-13',
  'Tuna portion 30g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed tuna portion for sushi wrap',
  30,
  'gr',
  120,
  2,
  'kitchen',
  'Thaw frozen tuna in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-13'),
  'ad7de479-e141-45fa-901f-e34f2600e964', -- M-3 Tuna saku
  30,
  'gr'
);

-- P-14: Tuna portion 70g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-14',
  'Tuna portion 70g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed tuna portion for poke tuna',
  70,
  'gr',
  120,
  2,
  'kitchen',
  'Thaw frozen tuna in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-14'),
  'ad7de479-e141-45fa-901f-e34f2600e964', -- M-3 Tuna saku
  70,
  'gr'
);

-- P-15: Tuna portion 100g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-15',
  'Tuna portion 100g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed tuna portion for tuna ciabatta',
  100,
  'gr',
  120,
  2,
  'kitchen',
  'Thaw frozen tuna in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-15'),
  'c501a8b3-3e11-415f-b1e8-f769dbf77306', -- M-2 Tuna lion
  100,
  'gr'
);

-- P-16: Tuna portion 150g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-16',
  'Tuna portion 150g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed tuna portion for tuna steak',
  150,
  'gr',
  120,
  2,
  'kitchen',
  'Thaw frozen tuna in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-16'),
  'c501a8b3-3e11-415f-b1e8-f769dbf77306', -- M-2 Tuna lion
  150,
  'gr'
);

-- P-17: Salmon portion 22g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-17',
  'Salmon portion 22g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed salmon portion for croissant',
  22,
  'gr',
  120,
  2,
  'kitchen',
  'Thaw frozen salmon in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-17'),
  '63f1fb5f-fb06-4610-8f72-31ad70e83c64', -- M-4 Salmon filet
  22,
  'gr'
);

-- P-18: Salmon portion 30g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-18',
  'Salmon portion 30g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed salmon portion for ciabatta and sushi wrap',
  30,
  'gr',
  120,
  2,
  'kitchen',
  'Thaw frozen salmon in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-18'),
  '63f1fb5f-fb06-4610-8f72-31ad70e83c64', -- M-4 Salmon filet
  30,
  'gr'
);

-- P-19: Salmon portion 44g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-19',
  'Salmon portion 44g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed salmon portion for poke salmon',
  44,
  'gr',
  120,
  2,
  'kitchen',
  'Thaw frozen salmon in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-19'),
  '63f1fb5f-fb06-4610-8f72-31ad70e83c64', -- M-4 Salmon filet
  44,
  'gr'
);

-- P-20: Shrimp thawed 4pc/100g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-20',
  'Shrimp thawed 4pc',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed shrimp for tom yum (4 pieces, ~100g)',
  100,
  'gr',
  120,
  1,
  'kitchen',
  'Thaw frozen shrimp in refrigerator for 2 hours. Keep refrigerated and use within 24 hours.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-20'),
  '0592c1ee-8e53-4a81-a67f-9e74c5bfde1c', -- M-9 Udang
  4,
  'pc'
);

-- P-21: Squid rings thawed 70g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-21',
  'Squid rings thawed 70g',
  '87bbdc73-35f4-4839-9aca-39c97448cbb8', -- seafood_portions
  'Thawed squid rings for tom yum',
  70,
  'gr',
  120,
  1,
  'kitchen',
  'Thaw frozen squid in refrigerator for 2 hours. Keep refrigerated and use within 24 hours.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-21'),
  '3295f009-1f7f-4224-a7b7-eea982856e3f', -- M-10 Cumi
  70,
  'gr'
);

-- ==================================================
-- CATEGORY: Meat Portions (Thawed & Portioned)
-- ==================================================

-- P-22: Beef slices 30g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-22',
  'Beef slices 30g',
  'f6d0e2a9-a3be-4480-a0bf-d639c8a86d24', -- meat_portions
  'Thawed beef slices for pasta, burger, breakfast (2 slices)',
  30,
  'gr',
  180,
  2,
  'kitchen',
  'Thaw frozen beef in refrigerator for 3 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-22'),
  '31a49573-ca53-43e6-b223-197201733f07', -- M-1 Beef sliced
  30,
  'gr'
);

-- P-23: Beef slices 88g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-23',
  'Beef slices 88g',
  'f6d0e2a9-a3be-4480-a0bf-d639c8a86d24', -- meat_portions
  'Thawed beef slices for aus beef ciabatta (3 slices)',
  88,
  'gr',
  180,
  2,
  'kitchen',
  'Thaw frozen beef in refrigerator for 3 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-23'),
  '31a49573-ca53-43e6-b223-197201733f07', -- M-1 Beef sliced
  88,
  'gr'
);

-- P-24: Beef steak 210g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-24',
  'Beef steak 210g',
  'f6d0e2a9-a3be-4480-a0bf-d639c8a86d24', -- meat_portions
  'Thawed beef steak',
  210,
  'gr',
  180,
  2,
  'kitchen',
  'Thaw frozen beef steak in refrigerator for 3 hours. Keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-24'),
  '16096d55-402a-46b3-a892-971111c69c48', -- M-7 Beef steak
  210,
  'gr'
);

-- P-25: Chicken breast thawed 150g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-25',
  'Chicken breast thawed 150g',
  'f6d0e2a9-a3be-4480-a0bf-d639c8a86d24', -- meat_portions
  'Thawed chicken breast for chicken steak',
  150,
  'gr',
  180,
  2,
  'kitchen',
  'Thaw frozen chicken breast in refrigerator for 3 hours. Keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-25'),
  'a8718fad-eb34-48ba-a3ae-1681560f6630', -- M-8 Ayum Filet dada
  150,
  'gr'
);

-- P-26: Ham slices 30g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-26',
  'Ham slices 30g',
  'f6d0e2a9-a3be-4480-a0bf-d639c8a86d24', -- meat_portions
  'Ham slices for carbonara and moza ciabatta (1 slice)',
  30,
  'gr',
  5,
  5,
  'kitchen',
  'Portion ham slices. Store refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-26'),
  'b987ef8c-f85f-4557-a0e4-8d18c35be7e1', -- M-5 Ham
  30,
  'gr'
);

-- P-27: Bacon slices 30g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-27',
  'Bacon slices 30g',
  'f6d0e2a9-a3be-4480-a0bf-d639c8a86d24', -- meat_portions
  'Thawed bacon slices for hearty breakfast (1 slice)',
  30,
  'gr',
  120,
  3,
  'kitchen',
  'Thaw frozen bacon in refrigerator for 2 hours. Portion and keep refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-27'),
  '9cd41cb2-43d4-41fa-be11-d712f4e47957', -- M-6 Frozen bacon
  30,
  'gr'
);

-- ==================================================
-- CATEGORY: Vegetable Preps (Pre-cut & Prepared)
-- ==================================================

-- P-28: Mushroom sliced
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-28',
  'Mushroom sliced',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-sliced mushrooms for various dishes',
  50,
  'gr',
  5,
  2,
  'kitchen',
  'Wash and slice mushrooms. Store in airtight container refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-28'),
  '5abf79cd-679c-483e-bcc2-d80e8430c414', -- V-2 Jamur
  50,
  'gr'
);

-- P-29: Garlic peeled
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-29',
  'Garlic peeled',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Peeled garlic cloves ready to use',
  10,
  'gr',
  2,
  3,
  'kitchen',
  'Peel garlic cloves. Store in airtight container refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-29'),
  '2b83ad67-1bae-4356-8c57-f8f8aff6dc62', -- V-27 Garlic
  10,
  'gr'
);

-- P-30: Onion sliced
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-30',
  'Onion sliced',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-sliced onion for various dishes',
  20,
  'gr',
  3,
  2,
  'kitchen',
  'Peel and slice onion. Store in airtight container refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-30'),
  'd74dc938-cb94-4862-9c3b-6e8d044862e4', -- V-29 Onion
  20,
  'gr'
);

-- P-31: Salad mix cut
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-31',
  'Salad mix cut',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-cut salad mix (Romain + Misuna)',
  50,
  'gr',
  10,
  1,
  'kitchen',
  'Wash and cut salad greens. Store in airtight container refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES
  (
    (SELECT id FROM preparations WHERE code = 'P-31'),
    'b23526b7-22f5-4d02-8205-a9f9550a6dac', -- V-5 Salad Romain
    30,
    'gr'
  ),
  (
    (SELECT id FROM preparations WHERE code = 'P-31'),
    '4b0c402e-3ac5-4abb-a3d1-9ab06f4a2119', -- V-6 Misuna
    20,
    'gr'
  );

-- P-32: Herbs washed & cut
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-32',
  'Herbs washed & cut',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-washed and cut herbs (Basil, Parsley, Coriander)',
  5,
  'gr',
  5,
  1,
  'kitchen',
  'Wash and cut herbs. Store in damp paper towel in container refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES
  (
    (SELECT id FROM preparations WHERE code = 'P-32'),
    '12e7c338-5f62-4ed1-949f-0f67a1c786e3', -- V-12 Basil leaf
    2,
    'gr'
  ),
  (
    (SELECT id FROM preparations WHERE code = 'P-32'),
    'b82d4dd2-c074-4c2b-9af4-3cff71bc2f72', -- V-10 Parsley
    2,
    'gr'
  ),
  (
    (SELECT id FROM preparations WHERE code = 'P-32'),
    'f39e47f9-ae52-4cc2-91c1-ce938e5650bc', -- V-13 Coriander leaf
    1,
    'gr'
  );

-- P-33: Eggplant slices grilled
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-33',
  'Eggplant slices grilled',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-grilled eggplant slices for burger and ciabatta',
  45,
  'gr',
  15,
  2,
  'kitchen',
  'Slice eggplant and grill until tender. Store refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-33'),
  '773ae418-6367-4bb7-83f0-51b966e247af', -- V-28 Terong (Egg plane)
  45,
  'gr'
);

-- P-34: Cucumber rolls/slices
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-34',
  'Cucumber rolls',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-cut cucumber rolls/slices for salads',
  20,
  'gr',
  5,
  1,
  'kitchen',
  'Wash and slice/roll cucumber. Store in airtight container refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-34'),
  'bee6da09-5074-4678-9d63-3ba67b0f8532', -- V-8 Timun (cucumber)
  20,
  'gr'
);

-- P-35: Grated potato
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-35',
  'Grated potato',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Grated raw potato for hashbrown',
  100,
  'gr',
  10,
  1,
  'kitchen',
  'Peel and grate potato. Keep in water to prevent browning. Drain before use.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-35'),
  '91088d41-211a-4796-8486-cd65c4e2f8d1', -- V-3 Kentang (potato)
  100,
  'gr'
);

-- P-36: Grated zukini
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-36',
  'Grated zukini',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Grated raw zukini for hashbrown',
  100,
  'gr',
  10,
  1,
  'kitchen',
  'Wash and grate zukini. Squeeze excess water. Store refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-36'),
  '2b447ab2-2c11-4f39-b6bf-c863a9151563', -- V-9 Zukini
  100,
  'gr'
);

-- P-37: Edamame cooked
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-37',
  'Edamame cooked',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-cooked edamame for poke bowls and toast',
  50,
  'gr',
  15,
  3,
  'kitchen',
  'Boil edamame in salted water for 5-7 minutes. Drain and cool. Store refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-37'),
  '4c5e289a-b460-4fc3-a186-ca277fb01553', -- V-15 Edamame
  50,
  'gr'
);

-- P-38: Avocado half cleaned
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-38',
  'Avocado half cleaned',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Half avocado peeled and ready to use',
  130,
  'gr',
  5,
  1,
  'kitchen',
  'Cut avocado in half, remove pit, peel. Brush with lemon to prevent browning.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-38'),
  'dbf8494a-06b4-4c49-8b10-421a5fba2bff', -- V-24 Avocado
  130,
  'gr'
);

-- ==================================================
-- CATEGORY: Frozen Fruits (for Smoothies)
-- ==================================================

-- P-39: Banana frozen 150g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-39',
  'Banana frozen 150g',
  'bc50afe1-c2ec-43c2-9a03-62bc22cf6b5c', -- frozen_fruits
  'Frozen banana portion for smoothies',
  150,
  'gr',
  10,
  30,
  'kitchen',
  'Peel and slice banana. Freeze in portions. Store in freezer bags.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-39'),
  'f751ce54-8ee4-40bb-b681-4e58d527f2d0', -- V-36 Banana
  150,
  'gr'
);

-- P-40: Mango frozen 100g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-40',
  'Mango frozen 100g',
  'bc50afe1-c2ec-43c2-9a03-62bc22cf6b5c', -- frozen_fruits
  'Frozen mango portion for smoothie mango',
  100,
  'gr',
  10,
  30,
  'kitchen',
  'Peel and cube mango. Freeze in portions. Store in freezer bags.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-40'),
  '58996176-7fef-42ee-8438-77940cd4d9d2', -- V-38 Mango
  100,
  'gr'
);

-- P-41: Papaya frozen 100g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-41',
  'Papaya frozen 100g',
  'bc50afe1-c2ec-43c2-9a03-62bc22cf6b5c', -- frozen_fruits
  'Frozen papaya portion for smoothie papaya',
  100,
  'gr',
  10,
  30,
  'kitchen',
  'Peel and cube papaya. Remove seeds. Freeze in portions. Store in freezer bags.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-41'),
  '739e28b2-9cf0-498c-90d4-36da038c869e', -- V-42 Papapya
  100,
  'gr'
);

-- P-42: Dragon fruit frozen 30g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-42',
  'Dragon fruit frozen 30g',
  'bc50afe1-c2ec-43c2-9a03-62bc22cf6b5c', -- frozen_fruits
  'Frozen dragon fruit portion for smoothie dragon',
  30,
  'gr',
  10,
  30,
  'kitchen',
  'Peel and cube dragon fruit. Freeze in portions. Store in freezer bags.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-42'),
  'd3b105ca-94be-4c68-89fd-76650c5f531b', -- V-37 B. Naga (dragon)
  30,
  'gr'
);

-- P-43: Pineapple frozen 40g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-43',
  'Pineapple frozen 40g',
  'bc50afe1-c2ec-43c2-9a03-62bc22cf6b5c', -- frozen_fruits
  'Frozen pineapple portion for smoothies',
  40,
  'gr',
  10,
  30,
  'kitchen',
  'Peel and cube pineapple. Freeze in portions. Store in freezer bags.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-43'),
  '6a65303a-ca7d-41db-bf89-5a91eac054a6', -- V-45 Nanas
  40,
  'gr'
);

-- P-44: Strawberry frozen 100g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-44',
  'Strawberry frozen 100g',
  'bc50afe1-c2ec-43c2-9a03-62bc22cf6b5c', -- frozen_fruits
  'Frozen strawberry portion for smoothie dragon',
  100,
  'gr',
  5,
  30,
  'kitchen',
  'Already frozen. Portion and store in freezer bags.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-44'),
  'a8157918-ae92-45d2-ba7a-cf971e565f5b', -- F-1 Strawberry frozen
  100,
  'gr'
);

-- ==================================================
-- CATEGORY: Frozen Portions
-- ==================================================

-- P-45: French fries portion 100g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-45',
  'French fries portion 100g',
  'd1fe3e3c-ac2b-4b30-b533-8222c46f0f45', -- frozen_portions
  'Pre-portioned french fries for beef steak',
  100,
  'gr',
  5,
  90,
  'kitchen',
  'Portion french fries from bulk package. Store in freezer bags.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-45'),
  '4bf72edc-5f74-4049-b7fd-6d816b1eff70', -- F-2 French fries potato
  100,
  'gr'
);

-- P-46: Tom yam seafood pack
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-46',
  'Tom yam seafood pack',
  'd1fe3e3c-ac2b-4b30-b533-8222c46f0f45', -- frozen_portions
  'Pre-packed frozen seafood for tom yum',
  170,
  'gr',
  10,
  30,
  'kitchen',
  'Pack shrimp and squid together. Label and freeze.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES
  (
    (SELECT id FROM preparations WHERE code = 'P-46'),
    '0592c1ee-8e53-4a81-a67f-9e74c5bfde1c', -- M-9 Udang
    4,
    'pc'
  ),
  (
    (SELECT id FROM preparations WHERE code = 'P-46'),
    '3295f009-1f7f-4224-a7b7-eea982856e3f', -- M-10 Cumi
    70,
    'gr'
  );

-- P-47: Tom yam soup base 80ml
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-47',
  'Tom yam soup base 80ml',
  'd1fe3e3c-ac2b-4b30-b533-8222c46f0f45', -- frozen_portions
  'Pre-made frozen tom yam broth',
  80,
  'ml',
  30,
  30,
  'kitchen',
  'Prepare tom yam broth with paste, coconut milk, and aromatics. Cool and freeze in portions.',
  0,
  true
);

-- P-48: Nori sheets cut
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-48',
  'Nori sheets cut',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-cut nori sheets for sushi and poke',
  1,
  'pc',
  3,
  90,
  'kitchen',
  'Cut nori sheets to size. Store in airtight container.',
  0,
  true
);

-- P-49: Pumpkin cooked 150g
INSERT INTO preparations (code, name, type, description, output_quantity, output_unit, preparation_time, shelf_life, department, instructions, cost_per_portion, is_active)
VALUES (
  'P-49',
  'Pumpkin cooked 150g',
  'ebd61ee2-9777-4e5d-8037-282cf84d249c', -- vegetable_preps
  'Pre-cooked pumpkin for pumpkin soup',
  150,
  'gr',
  30,
  3,
  'kitchen',
  'Peel and cube pumpkin. Steam or roast until tender. Store refrigerated.',
  0,
  true
);

INSERT INTO preparation_ingredients (preparation_id, product_id, quantity, unit)
VALUES (
  (SELECT id FROM preparations WHERE code = 'P-49'),
  'f24a4df3-3641-4f5c-88ed-518e3fbd578c', -- V-18 Pumpking
  150,
  'gr'
);

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Count new preparations by category
SELECT
  pc.name as category,
  COUNT(p.id) as prep_count
FROM preparations p
JOIN preparation_categories pc ON p.type::uuid = pc.id
WHERE p.code ~ '^P-[0-9]+$' AND CAST(SUBSTRING(p.code FROM 3) AS INTEGER) >= 6
GROUP BY pc.name, pc.sort_order
ORDER BY pc.sort_order;

-- List all new preparations
SELECT
  p.code,
  p.name,
  pc.name as category,
  p.output_quantity,
  p.output_unit,
  p.shelf_life,
  p.preparation_time
FROM preparations p
JOIN preparation_categories pc ON p.type::uuid = pc.id
WHERE p.code ~ '^P-[0-9]+$' AND CAST(SUBSTRING(p.code FROM 3) AS INTEGER) >= 6
ORDER BY p.code;

-- Count ingredients per preparation
SELECT
  p.code,
  p.name,
  COUNT(pi.id) as ingredient_count
FROM preparations p
LEFT JOIN preparation_ingredients pi ON p.id = pi.preparation_id
WHERE p.code ~ '^P-[0-9]+$' AND CAST(SUBSTRING(p.code FROM 3) AS INTEGER) >= 6
GROUP BY p.code, p.name
ORDER BY p.code;

COMMIT;
