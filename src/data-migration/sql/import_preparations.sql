-- Migration: Import preparations from Winter menu CSV
-- Generated: 2025-12-02T12:47:44.276Z
-- Total preparations: 5

-- Insert preparations
BEGIN;

INSERT INTO preparations (
    code, name, type, output_quantity, output_unit,
    cost_per_portion, preparation_time, instructions,
    is_active, department, shelf_life
  ) VALUES (
    'P-1',
    'MushPotato',
    'f34b25fa-82de-414f-94e3-f124fd42f045',
    210,
    'gr',
    23.9,
    30,
    'See recipe card for detailed instructions',
    true,
    'kitchen',
    2
  );
INSERT INTO preparations (
    code, name, type, output_quantity, output_unit,
    cost_per_portion, preparation_time, instructions,
    is_active, department, shelf_life
  ) VALUES (
    'P-2',
    'Holondaise basil',
    '559b9a35-30b2-4b15-b0a4-f27c8870c1d4',
    300,
    'ml',
    75.9,
    30,
    'See recipe card for detailed instructions',
    true,
    'kitchen',
    2
  );
INSERT INTO preparations (
    code, name, type, output_quantity, output_unit,
    cost_per_portion, preparation_time, instructions,
    is_active, department, shelf_life
  ) VALUES (
    'P-3',
    'Concase',
    '559b9a35-30b2-4b15-b0a4-f27c8870c1d4',
    0.5,
    'ml',
    158.5,
    30,
    'See recipe card for detailed instructions',
    true,
    'kitchen',
    2
  );
INSERT INTO preparations (
    code, name, type, output_quantity, output_unit,
    cost_per_portion, preparation_time, instructions,
    is_active, department, shelf_life
  ) VALUES (
    'P-5',
    'Humus red',
    '93ee052f-498c-4b25-9c7c-6686806da9ae',
    150,
    'ml',
    97.8,
    30,
    'See recipe card for detailed instructions',
    true,
    'kitchen',
    2
  );
INSERT INTO preparations (
    code, name, type, output_quantity, output_unit,
    cost_per_portion, preparation_time, instructions,
    is_active, department, shelf_life
  ) VALUES (
    'P-4',
    'Humus',
    '93ee052f-498c-4b25-9c7c-6686806da9ae',
    140,
    'ml',
    86.7,
    30,
    'See recipe card for detailed instructions',
    true,
    'kitchen',
    2
  );

-- Insert preparation ingredients

INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-1'),
    'product',
    (SELECT id FROM products WHERE code = 'V-3'),
    200,
    'gr',
    NULL,
    0
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-1'),
    'product',
    (SELECT id FROM products WHERE code = 'D-1'),
    40,
    'ml',
    NULL,
    1
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-1'),
    'product',
    (SELECT id FROM products WHERE code = 'D-9'),
    10,
    'gr',
    NULL,
    2
  );

INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-2'),
    'product',
    (SELECT id FROM products WHERE code = 'D-6'),
    250,
    'gr',
    NULL,
    0
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-2'),
    'product',
    (SELECT id FROM products WHERE code = 'V-12'),
    30,
    'gr',
    NULL,
    1
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-2'),
    'product',
    (SELECT id FROM products WHERE code = 'V-1'),
    0.5,
    'pc',
    NULL,
    2
  );

INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'H-2'),
    250,
    'gr',
    '1/2 tsp',
    0
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'H-5'),
    30,
    'gr',
    '1/2 tsp',
    1
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'H-7'),
    0.5,
    'gr',
    '1 tsp',
    2
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'C-9'),
    0.5,
    'ml',
    '1/2 tsp',
    3
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'O-10'),
    30,
    'gr',
    NULL,
    4
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'V-26'),
    800,
    'gr',
    NULL,
    5
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'V-27'),
    50,
    'gr',
    NULL,
    6
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-3'),
    'product',
    (SELECT id FROM products WHERE code = 'V-29'),
    50,
    'gr',
    NULL,
    7
  );

INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'D-2'),
    80,
    'ml',
    NULL,
    0
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'C-8'),
    30,
    'ml',
    '3 sp',
    1
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'S-15'),
    300,
    'gr',
    NULL,
    2
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'V-13'),
    0.5,
    'gr',
    '1/2 tsp',
    3
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'C-16'),
    10,
    'ml',
    '1 sp',
    4
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'A-1'),
    30,
    'ml',
    NULL,
    5
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'H-4'),
    5,
    'gr',
    '1/2 tsp',
    6
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'H-5'),
    5,
    'gr',
    '1/2 tsp',
    7
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-5'),
    'product',
    (SELECT id FROM products WHERE code = 'V-43'),
    50,
    'gr',
    NULL,
    8
  );

INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'D-2'),
    80,
    'ml',
    NULL,
    0
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'C-8'),
    30,
    'ml',
    '3 sp',
    1
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'S-15'),
    300,
    'gr',
    NULL,
    2
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'V-13'),
    0.5,
    'gr',
    '1/2 tsp',
    3
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'H-11'),
    30,
    'gr',
    '1/2 tsp',
    4
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'A-1'),
    30,
    'ml',
    NULL,
    5
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'H-4'),
    5,
    'gr',
    '1/2 tsp',
    6
  );
INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = 'P-4'),
    'product',
    (SELECT id FROM products WHERE code = 'H-5'),
    5,
    'gr',
    '1/2 tsp',
    7
  );

COMMIT;
