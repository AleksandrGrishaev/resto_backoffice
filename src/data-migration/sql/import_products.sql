-- Migration: Import products from Winter menu CSV
-- Generated: 2025-12-02T13:30:24.507Z
-- Total products: 167

-- Insert products
BEGIN;

INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-1',
    'Fresh milk',
    'Fresh milk',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'ml',
    19.1,
    100,
    1000,
    57,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-2',
    'Whipping cream',
    'Whipping cream',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'ml',
    105.8,
    100,
    6000,
    317,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-3',
    'Cream cheese ',
    'Cream cheese ',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'gram',
    135,
    100,
    2000,
    405,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-4',
    'Parmesan',
    'Parmesan',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'gram',
    368,
    100,
    1000,
    1104,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-5',
    'feta cheese',
    'feta cheese',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'gram',
    300,
    100,
    2000,
    900,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-6',
    'Ricotta cheese ',
    'Ricotta cheese ',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'piece',
    80.5,
    100,
    1000,
    242,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-7',
    'Mozarella cheese',
    'Mozarella cheese',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'gram',
    119.9,
    100,
    1000,
    360,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-8',
    'Cooking cream ',
    'Cooking cream ',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'ml',
    1,
    100,
    1000,
    3,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-9',
    'Unsalted butter',
    'Unsalted butter',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'gram',
    1,
    100,
    0,
    3,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-10',
    'Yogurt plain sweet',
    'Yogurt plain sweet',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    NULL,
    'piece',
    1,
    100,
    0,
    3,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-11',
    'Yogurt palin sour',
    'Yogurt palin sour',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'piece',
    54.4,
    100,
    0,
    163,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-12',
    'Yakult light pack',
    'Yakult light pack',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    '19818992-0e49-43aa-bb89-eb81f7d3015e',
    'piece',
    2666.7,
    100,
    1000,
    8000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-13',
    'Sour cream',
    'Sour cream',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'gram',
    112.2,
    100,
    1000,
    337,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'D-14',
    'Cooking cream',
    'Cooking cream',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'gram',
    101.7,
    100,
    1000,
    305,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'F-1',
    'Strawberry frozen',
    'Strawberry frozen',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    'beb97b3c-5ecb-41f6-826e-617175a29bd8',
    'gram',
    40,
    100,
    5000,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'F-2',
    'French fries potato',
    'French fries potato',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    '70e53f54-0579-4efe-8ed3-c809cf1c342a',
    'gram',
    45,
    100,
    1000,
    135,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'F-3',
    'Ice tube',
    'Ice tube',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    '19818992-0e49-43aa-bb89-eb81f7d3015e',
    'gram',
    1.6,
    100,
    1000,
    5,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'F-4',
    'Tortilla Flour 25cm',
    'Tortilla Flour 25cm',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    'bd0525ed-a78f-4b45-83ba-607a4cc853bf',
    'piece',
    2468.6,
    100,
    1000,
    7406,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-1',
    'Basil',
    'Basil',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    1000,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-2',
    'Oregano',
    'Oregano',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    70,
    100,
    1000,
    210,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-3',
    'Garam kasar',
    'Garam kasar',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    15,
    100,
    1000,
    45,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-4',
    'Garam biasa',
    'Garam biasa',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    25,
    100,
    3000,
    75,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-5',
    'Black pepper crash',
    'Black pepper crash',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    85,
    100,
    300,
    255,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-6',
    'Black pepper biji',
    'Black pepper biji',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-7',
    'Thyme',
    'Thyme',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-8',
    'Bay leaf',
    'Bay leaf',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-9',
    'Glove',
    'Glove',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-10',
    'Cinamon',
    'Cinamon',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-11',
    'Garlik powder',
    'Garlik powder',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-12',
    'Chili powder',
    'Chili powder',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-13',
    'Coriander herbs',
    'Coriander herbs',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-14',
    'Madras curry',
    'Madras curry',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'H-15',
    'Curcuma',
    'Curcuma',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    NULL,
    'gram',
    0,
    100,
    500,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-1',
    'Monin',
    'Monin',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'ml',
    228.6,
    100,
    2000,
    686,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-2',
    'Soy milk',
    'Soy milk',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'ml',
    50,
    100,
    2000,
    150,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-3',
    'Oat milk',
    'Oat milk',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'ml',
    40,
    100,
    2000,
    120,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-4',
    'Santal kara (Coconut milk)',
    'Santal kara (Coconut milk)',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    50,
    100,
    3000,
    150,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-5',
    'Olive green',
    'Olive green',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'gram',
    1,
    100,
    3000,
    3,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-6',
    'Olive black',
    'Olive black',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    '4f4c2bad-b17a-4bce-a627-40764bd087a6',
    'piece',
    70,
    100,
    3000,
    210,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-7',
    'Oil goreng',
    'Oil goreng',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    22,
    100,
    5000,
    66,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-8',
    'Extra virgin olive oil',
    'Extra virgin olive oil',
    '72fcfb7a-7f7d-4a18-a7d5-4c3abeec84a3',
    '4f4c2bad-b17a-4bce-a627-40764bd087a6',
    'piece',
    166,
    100,
    5000,
    498,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-9',
    'Apple vinegar ',
    'Apple vinegar ',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    NULL,
    'ml',
    1,
    100,
    0,
    3,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-10',
    'Balzamic vinegar ',
    'Balzamic vinegar ',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'piece',
    174,
    100,
    500,
    522,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-11',
    'Choco glaze',
    'Choco glaze',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    NULL,
    'ml',
    1,
    100,
    0,
    3,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-12',
    'Jalapeno NachoSlices 2.6kg',
    'Jalapeno NachoSlices 2.6kg',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    NULL,
    'ml',
    1,
    100,
    0,
    3,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-13',
    'Honey',
    'Honey',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'ml',
    52.8,
    100,
    1000,
    158,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-14',
    'Saori souce (soyu)',
    'Saori souce (soyu)',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'ml',
    62,
    100,
    1000,
    186,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-15',
    'Saos raja rasa',
    'Saos raja rasa',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    66.7,
    100,
    1000,
    200,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-16',
    'Sesame oil ',
    'Sesame oil ',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    131.7,
    100,
    1000,
    395,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-17',
    'Lemon refil',
    'Lemon refil',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    32,
    100,
    1000,
    96,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-18',
    'Thousand iland',
    'Thousand iland',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    57.1,
    100,
    1000,
    171,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-19',
    'Soy souce',
    'Soy souce',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    57.1,
    100,
    1000,
    171,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-20',
    'Oyster souce',
    'Oyster souce',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    57.1,
    100,
    1000,
    171,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'C-21',
    'Wasabi',
    'Wasabi',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    NULL,
    'piece',
    57.1,
    100,
    1000,
    171,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'BV-1',
    'Coca-cola',
    'Coca-cola',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '0341ab43-287d-4d29-979b-d8b1b4464129',
    'piece',
    20,
    100,
    6000,
    60,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'BV-2',
    'Coca-cola light',
    'Coca-cola light',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '0341ab43-287d-4d29-979b-d8b1b4464129',
    'piece',
    20,
    100,
    3000,
    60,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'BV-3',
    'Schweppes tonic',
    'Schweppes tonic',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '0341ab43-287d-4d29-979b-d8b1b4464129',
    'piece',
    20,
    100,
    6000,
    60,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'BV-4',
    'Coca-cola',
    'Coca-cola',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '0341ab43-287d-4d29-979b-d8b1b4464129',
    'piece',
    20,
    100,
    6000,
    60,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'R-1',
    'Dumplings potato',
    'Dumplings potato',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    '8948e92e-2b5e-4b55-942c-141188fab19c',
    'piece',
    3272.7,
    100,
    1000,
    9818,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'R-2',
    'Dumpling pork/beef',
    'Dumpling pork/beef',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    '8948e92e-2b5e-4b55-942c-141188fab19c',
    'piece',
    1724.1,
    100,
    2000,
    5172,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'R-3',
    'Syrniki',
    'Syrniki',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    '1a1fa4b6-efc2-498b-8a3a-f3d5c674954f',
    'piece',
    8666.7,
    100,
    4000,
    26000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-1',
    'Beef sliced ',
    'Beef sliced ',
    'a4d98a6b-05b4-4c25-a6a3-e07be9ce9c50',
    '70e53f54-0579-4efe-8ed3-c809cf1c342a',
    'gram',
    185,
    100,
    1000,
    555,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-2',
    'Tuna lion',
    'Tuna lion',
    '350c4896-db61-4c57-a096-752cba4bbd25',
    '2e655014-c59a-4289-a2d7-bf7583e88adf',
    'gram',
    98,
    100,
    1500,
    294,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-3',
    'Tuna saku',
    'Tuna saku',
    '350c4896-db61-4c57-a096-752cba4bbd25',
    '2e655014-c59a-4289-a2d7-bf7583e88adf',
    'gram',
    135,
    100,
    500,
    405,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-4',
    'Salmon filet',
    'Salmon filet',
    '350c4896-db61-4c57-a096-752cba4bbd25',
    '2e655014-c59a-4289-a2d7-bf7583e88adf',
    'gram',
    291.5,
    90,
    2000,
    875,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-5',
    'Ham',
    'Ham',
    'a4d98a6b-05b4-4c25-a6a3-e07be9ce9c50',
    '70e53f54-0579-4efe-8ed3-c809cf1c342a',
    'piece',
    152,
    100,
    0,
    456,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-6',
    'Frozen bacon',
    'Frozen bacon',
    'a4d98a6b-05b4-4c25-a6a3-e07be9ce9c50',
    '70e53f54-0579-4efe-8ed3-c809cf1c342a',
    'gram',
    115,
    100,
    0,
    345,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-7',
    'Beef steak',
    'Beef steak',
    'a4d98a6b-05b4-4c25-a6a3-e07be9ce9c50',
    '70e53f54-0579-4efe-8ed3-c809cf1c342a',
    'gram',
    235,
    100,
    0,
    705,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-8',
    'Ayum Filet dada',
    'Ayum Filet dada',
    'a4d98a6b-05b4-4c25-a6a3-e07be9ce9c50',
    '70e53f54-0579-4efe-8ed3-c809cf1c342a',
    'gram',
    62,
    100,
    0,
    186,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-9',
    'Udang',
    'Udang',
    '350c4896-db61-4c57-a096-752cba4bbd25',
    NULL,
    'piece',
    3375,
    100,
    0,
    10125,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'M-10',
    'Cumi',
    'Cumi',
    '350c4896-db61-4c57-a096-752cba4bbd25',
    '70e53f54-0579-4efe-8ed3-c809cf1c342a',
    'gram',
    95,
    100,
    0,
    285,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-2',
    'Flax seed ',
    'Flax seed ',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    '537975ea-f5f9-45e5-9c76-54b7c46d63c7',
    'gram',
    0,
    100,
    0,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-3',
    'Sesame white',
    'Sesame white',
    '5c3f9ca6-a9cc-4ca3-996f-0f1c10c61089',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    750,
    100,
    200,
    2250,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-4',
    'Sesame black',
    'Sesame black',
    '5c3f9ca6-a9cc-4ca3-996f-0f1c10c61089',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    850,
    100,
    0,
    2550,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-5',
    'Coconut disicated',
    'Coconut disicated',
    '5c3f9ca6-a9cc-4ca3-996f-0f1c10c61089',
    '537975ea-f5f9-45e5-9c76-54b7c46d63c7',
    'gram',
    55,
    100,
    3000,
    165,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-6',
    'Coconut flakes',
    'Coconut flakes',
    '5c3f9ca6-a9cc-4ca3-996f-0f1c10c61089',
    '537975ea-f5f9-45e5-9c76-54b7c46d63c7',
    'gram',
    62,
    100,
    3000,
    186,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-7',
    'Raisin',
    'Raisin',
    '5c3f9ca6-a9cc-4ca3-996f-0f1c10c61089',
    '537975ea-f5f9-45e5-9c76-54b7c46d63c7',
    'gram',
    64.5,
    100,
    3000,
    194,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-8',
    'Dates',
    'Dates',
    '5c3f9ca6-a9cc-4ca3-996f-0f1c10c61089',
    '537975ea-f5f9-45e5-9c76-54b7c46d63c7',
    'gram',
    0,
    100,
    0,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-9',
    'Gula pasir',
    'Gula pasir',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'gram',
    17,
    100,
    1000,
    51,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-10',
    'Suger brown',
    'Suger brown',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'gram',
    28,
    100,
    1000,
    84,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-11',
    'Cholate dark',
    'Cholate dark',
    'cf214bab-9635-49f5-9e26-31c6b34b3980',
    '3f7a6c33-abd2-44d7-9f7f-c7b4c98deebd',
    'gram',
    0,
    100,
    0,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-12',
    'Cocao powder',
    'Cocao powder',
    'cf214bab-9635-49f5-9e26-31c6b34b3980',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'piece',
    175.8,
    100,
    3000,
    527,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-13',
    'Tempung terigu',
    'Tempung terigu',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    19,
    100,
    1000,
    57,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-14',
    'Tempung mizena',
    'Tempung mizena',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    16,
    100,
    1000,
    48,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-15',
    'Chick Peas',
    'Chick Peas',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    '537975ea-f5f9-45e5-9c76-54b7c46d63c7',
    'gram',
    40,
    100,
    3000,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-16',
    'Rolled Oat',
    'Rolled Oat',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    '537975ea-f5f9-45e5-9c76-54b7c46d63c7',
    'gram',
    29,
    100,
    3000,
    87,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-17',
    'Black tea',
    'Black tea',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '4f4c2bad-b17a-4bce-a627-40764bd087a6',
    'gram',
    0,
    100,
    0,
    0,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-18',
    'Matcha green',
    'Matcha green',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '4f4c2bad-b17a-4bce-a627-40764bd087a6',
    'piece',
    570,
    100,
    3000,
    1710,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-19',
    'Granola',
    'Granola',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    'a2b5a5e7-a22f-4800-ae81-245a7987ab25',
    'gram',
    93,
    100,
    1000,
    279,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-20',
    'Rice',
    'Rice',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    15,
    100,
    1000,
    45,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'S-21',
    'Kopi',
    'Kopi',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '92b9776f-81dd-49b3-a7fd-b07f5f78a273',
    'piece',
    2750,
    100,
    5000,
    8250,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-1',
    'Baking powder',
    'Baking powder',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-2',
    'Soda kue',
    'Soda kue',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-3',
    'Vanilla essence',
    'Vanilla essence',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-4',
    'Mayo',
    'Mayo',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    35,
    100,
    1000,
    105,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-5',
    'Musted ',
    'Musted ',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-6',
    'Ketchup',
    'Ketchup',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    20,
    100,
    1000,
    60,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-7',
    'Nori tabur',
    'Nori tabur',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    433.3,
    100,
    2000,
    1300,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-8',
    'Nori original',
    'Nori original',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    3480,
    100,
    1000,
    10440,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-9',
    'Spagetti',
    'Spagetti',
    '2bf2e446-8bfe-4c22-865e-9a2509d9ad04',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    19,
    100,
    1000,
    57,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-10',
    'Tomato paste',
    'Tomato paste',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'O-11',
    'Tom yam paste',
    'Tom yam paste',
    '4499ee6d-baac-467c-b6c8-a2648c5ac6f5',
    '4f4c2bad-b17a-4bce-a627-40764bd087a6',
    'piece',
    140,
    100,
    1000,
    420,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-1',
    'Telur',
    'Telur',
    '42cd1588-b643-460f-b0ce-8aa239dd17d2',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    2000,
    100,
    60000,
    6000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-2',
    'Jamur',
    'Jamur',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    47,
    100,
    1500,
    141,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-3',
    'Kentang ( potato)',
    'Kentang ( potato)',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    20,
    100,
    1500,
    60,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-4',
    'Salad bulat',
    'Salad bulat',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    40,
    100,
    1500,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-5',
    'Salad Romain',
    'Salad Romain',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    55,
    100,
    1500,
    165,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-6',
    'Misuna',
    'Misuna',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    55,
    100,
    1500,
    165,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-7',
    'Broccoly',
    'Broccoly',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    70,
    100,
    500,
    210,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-8',
    'Timun (cucumber)',
    'Timun (cucumber)',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    16,
    100,
    1000,
    48,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-9',
    'Zukini',
    'Zukini',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    75,
    100,
    1500,
    225,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-10',
    'Parsley',
    'Parsley',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    40,
    100,
    150,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-11',
    'Dill',
    'Dill',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    75,
    100,
    150,
    225,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-12',
    'Basil leaf',
    'Basil leaf',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    55,
    100,
    1500,
    165,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-13',
    'Coriander leaf',
    'Coriander leaf',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    40,
    100,
    200,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-14',
    'Red redish',
    'Red redish',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    700,
    100,
    400,
    2100,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-15',
    'Edamame',
    'Edamame',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    45,
    50,
    1000,
    135,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-16',
    'Kol ungu ( red cabbage)',
    'Kol ungu ( red cabbage)',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    35,
    100,
    500,
    105,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-17',
    'Lobak putih ( daikon)',
    'Lobak putih ( daikon)',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    25,
    100,
    500,
    75,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-18',
    'Pumpking',
    'Pumpking',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    13,
    70,
    2000,
    39,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-19',
    'Jagung manis ( corn)',
    'Jagung manis ( corn)',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    16,
    40,
    1000,
    48,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-20',
    'Carrot',
    'Carrot',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    20,
    100,
    1000,
    60,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-21',
    'Tomato cherry',
    'Tomato cherry',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    40,
    100,
    1500,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-22',
    'Paprika merah',
    'Paprika merah',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    40,
    100,
    200,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-23',
    'Paprika kuning',
    'Paprika kuning',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    50,
    100,
    200,
    150,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-24',
    'Avocado',
    'Avocado',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    43.8,
    75,
    1500,
    131,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-25',
    'Kacang bujang( beans )',
    'Kacang bujang( beans )',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    20,
    100,
    500,
    60,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-26',
    'Tomato local ',
    'Tomato local ',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    30,
    100,
    1500,
    90,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-27',
    'Garlic',
    'Garlic',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    45,
    100,
    300,
    135,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-28',
    'Terong ( Egg plane ) ',
    'Terong ( Egg plane ) ',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    17,
    100,
    1000,
    51,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-29',
    'Onion',
    'Onion',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    25,
    100,
    1000,
    75,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-30',
    'Ginger',
    'Ginger',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    32,
    100,
    1500,
    96,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-31',
    'Sereh ( Lemon grass )',
    'Sereh ( Lemon grass )',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    18,
    100,
    1500,
    54,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-32',
    'Kefir leaf ',
    'Kefir leaf ',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'piece',
    100,
    100,
    1500,
    300,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-33',
    'Mint',
    'Mint',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    55,
    100,
    100,
    165,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-34',
    'Lime',
    'Lime',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    25,
    100,
    1500,
    75,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-35',
    'Lemon',
    'Lemon',
    '3ea64d6a-5b47-4da4-b068-40b6e9078c29',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    38.5,
    90,
    500,
    116,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-36',
    'Banana',
    'Banana',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    20,
    100,
    1500,
    60,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-37',
    'B. Naga (dragon)',
    'B. Naga (dragon)',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    23,
    100,
    2500,
    69,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-38',
    'Mango',
    'Mango',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    30,
    100,
    1500,
    90,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-39',
    'Jeruk lumajang ',
    'Jeruk lumajang ',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    22,
    100,
    3000,
    66,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-40',
    'Strawberry',
    'Strawberry',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    80,
    100,
    500,
    240,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-41',
    'Watermelon',
    'Watermelon',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    '19818992-0e49-43aa-bb89-eb81f7d3015e',
    'gram',
    21,
    100,
    1500,
    63,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-42',
    'Papapya',
    'Papapya',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    12,
    100,
    1500,
    36,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-43',
    'Akar bit ( beetroot)',
    'Akar bit ( beetroot)',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    40,
    100,
    1500,
    120,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-44',
    'Rosmarin',
    'Rosmarin',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    200,
    100,
    1500,
    600,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'V-45',
    'Nanas',
    'Nanas',
    '1c4fc4da-820b-4514-80ea-482212ba1201',
    'e02ae4f6-df99-4388-9ed9-d941603f6d3a',
    'gram',
    16.8,
    60,
    1500,
    50,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'W-1',
    'Cheescake',
    'Cheescake',
    'cf214bab-9635-49f5-9e26-31c6b34b3980',
    '2101415e-45f6-4ced-b6c9-79a71d8e1f93',
    'piece',
    29166.7,
    100,
    2000,
    87500,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'W-2',
    'Merenga',
    'Merenga',
    'cf214bab-9635-49f5-9e26-31c6b34b3980',
    '2101415e-45f6-4ced-b6c9-79a71d8e1f93',
    'piece',
    28000,
    100,
    1000,
    84000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'W-3',
    'Potato',
    'Potato',
    'cf214bab-9635-49f5-9e26-31c6b34b3980',
    '2101415e-45f6-4ced-b6c9-79a71d8e1f93',
    'piece',
    14000,
    100,
    6000,
    42000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'W-4',
    'Eclair',
    'Eclair',
    'cf214bab-9635-49f5-9e26-31c6b34b3980',
    '2101415e-45f6-4ced-b6c9-79a71d8e1f93',
    'piece',
    20000,
    100,
    15000,
    60000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'B-1',
    'Ciabatta',
    'Ciabatta',
    '2c3dbdf0-6a8a-45f3-a770-a3ad9372450d',
    '4f4c2bad-b17a-4bce-a627-40764bd087a6',
    'piece',
    8000,
    100,
    12000,
    24000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'B-2',
    'Croissant',
    'Croissant',
    '2c3dbdf0-6a8a-45f3-a770-a3ad9372450d',
    '71d63ed2-c0dc-43ec-81dc-e0c6c3e2f838',
    'piece',
    17000,
    100,
    3000,
    51000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'B-3',
    'SourDough bread',
    'SourDough bread',
    '2c3dbdf0-6a8a-45f3-a770-a3ad9372450d',
    '71d63ed2-c0dc-43ec-81dc-e0c6c3e2f838',
    'piece',
    2400,
    100,
    3000,
    7200,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'N-1',
    'Almount',
    'Almount',
    'effe093d-4eab-44d6-9c31-766a726b7a88',
    NULL,
    'piece',
    0,
    100,
    0,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'N-2',
    'Cashunut',
    'Cashunut',
    'effe093d-4eab-44d6-9c31-766a726b7a88',
    NULL,
    'gram',
    250,
    100,
    0,
    750,
    'gram',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'N-3',
    'Hazernuts',
    'Hazernuts',
    'effe093d-4eab-44d6-9c31-766a726b7a88',
    NULL,
    'piece',
    0,
    100,
    0,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'N-4',
    'Peanut',
    'Peanut',
    'effe093d-4eab-44d6-9c31-766a726b7a88',
    NULL,
    'piece',
    0,
    100,
    0,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'T-1',
    'Lunch box',
    'Lunch box',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    70000,
    100,
    1000,
    210000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'T-2',
    'Papper bag 25*14',
    'Papper bag 25*14',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'T-3',
    'Papper bag M',
    'Papper bag M',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    22500,
    100,
    1000,
    67500,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'T-9',
    'Cup holder',
    'Cup holder',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    34000,
    100,
    1000,
    102000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'T-10',
    'Papper straw',
    'Papper straw',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    47000,
    100,
    1000,
    141000,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'T-11',
    'Tissu brown',
    'Tissu brown',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'T-12',
    'Tissu white',
    'Tissu white',
    '3b09bb8f-ec57-48a0-9420-ffbd3a671432',
    NULL,
    'piece',
    0,
    100,
    1000,
    0,
    'piece',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'A-1',
    'Water',
    'Water',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    NULL,
    'ml',
    0,
    100,
    1000,
    0,
    'ml',
    true,
    true
  );
INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    'A-2',
    'Water cleo',
    'Water cleo',
    'b5e3b23a-bcf8-46d4-895b-88a5d47c3725',
    '8ac3e196-b993-4f3e-9bf8-26906d40b884',
    'piece',
    1.1,
    100,
    1000,
    3,
    'piece',
    true,
    true
  );

-- Insert package options

INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-1'),
    '1000 lt',
    1000,
    'lt',
    19070,
    19.1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-2'),
    '1000 lt',
    1000,
    'lt',
    105820,
    105.8,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-3'),
    '1000 kg',
    1000,
    'kg',
    135000,
    135,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-4'),
    '250 kg',
    250,
    'kg',
    92000,
    368,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-5'),
    '250 kg',
    250,
    'kg',
    75000,
    300,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-6'),
    '1000 pk',
    1000,
    'pk',
    80475,
    80.5,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-7'),
    '1000 kg',
    1000,
    'kg',
    119880,
    119.9,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-8'),
    '0 lt',
    0,
    'lt',
    0,
    1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-9'),
    '0 kg',
    0,
    'kg',
    0,
    1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-10'),
    '0 ',
    0,
    '',
    0,
    1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-11'),
    '1000 ',
    1000,
    '',
    54390,
    54.4,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-12'),
    '6 pk',
    6,
    'pk',
    16000,
    2666.7,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-13'),
    '950 kg',
    950,
    'kg',
    106560,
    112.2,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'D-14'),
    '950 kg',
    950,
    'kg',
    96570,
    101.7,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'F-1'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'F-2'),
    '1000 kg',
    1000,
    'kg',
    45000,
    45,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'F-3'),
    '5000 kg',
    5000,
    'kg',
    8000,
    1.6,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'F-4'),
    '25 pk',
    25,
    'pk',
    61716,
    2468.6,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-1'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-2'),
    '1000 kg',
    1000,
    'kg',
    70000,
    70,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-3'),
    '1000 kg',
    1000,
    'kg',
    15000,
    15,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-4'),
    '1000 kg',
    1000,
    'kg',
    25000,
    25,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-5'),
    '1000 kg',
    1000,
    'kg',
    85000,
    85,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-6'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-7'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-8'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-9'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-10'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-11'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-12'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-13'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-14'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'H-15'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-1'),
    '700 bt',
    700,
    'bt',
    160000,
    228.6,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-2'),
    '1000 lt',
    1000,
    'lt',
    50000,
    50,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-3'),
    '1000 lt',
    1000,
    'lt',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-4'),
    '200 pc',
    200,
    'pc',
    10000,
    50,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-5'),
    '0 kg',
    0,
    'kg',
    0,
    1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-6'),
    '3000 kg',
    3000,
    'kg',
    210000,
    70,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-7'),
    '5000 5lt',
    5000,
    '5lt',
    110000,
    22,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-8'),
    '5000 5lt',
    5000,
    '5lt',
    830000,
    166,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-9'),
    '0 lt',
    0,
    'lt',
    0,
    1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-10'),
    '500 pc',
    500,
    'pc',
    87000,
    174,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-11'),
    '0 lt',
    0,
    'lt',
    0,
    1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-12'),
    '0 lt',
    0,
    'lt',
    0,
    1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-13'),
    '625 lt',
    625,
    'lt',
    33000,
    52.8,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-14'),
    '1000 lt',
    1000,
    'lt',
    62000,
    62,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-15'),
    '600 pc',
    600,
    'pc',
    40000,
    66.7,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-16'),
    '600 pc',
    600,
    'pc',
    79000,
    131.7,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-17'),
    '1000 pc',
    1000,
    'pc',
    32000,
    32,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-18'),
    '700 pc',
    700,
    'pc',
    40000,
    57.1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-19'),
    '700 pc',
    700,
    'pc',
    40000,
    57.1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-20'),
    '700 pc',
    700,
    'pc',
    40000,
    57.1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'C-21'),
    '700 pc',
    700,
    'pc',
    40000,
    57.1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'BV-1'),
    '250 pc',
    250,
    'pc',
    5000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'BV-2'),
    '250 pc',
    250,
    'pc',
    5000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'BV-3'),
    '250 pc',
    250,
    'pc',
    5000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'BV-4'),
    '250 pc',
    250,
    'pc',
    5000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'R-1'),
    '33 kg',
    33,
    'kg',
    108000,
    3272.7,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'R-2'),
    '83 kg',
    83,
    'kg',
    143100,
    1724.1,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'R-3'),
    '12 pk',
    12,
    'pk',
    104000,
    8666.7,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-1'),
    '1000 kg',
    1000,
    'kg',
    185000,
    185,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-2'),
    '1000 kg',
    1000,
    'kg',
    98000,
    98,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-3'),
    '1000 kg',
    1000,
    'kg',
    135000,
    135,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-4'),
    '1000 kg',
    1000,
    'kg',
    265000,
    291.5,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-5'),
    '250 pk',
    250,
    'pk',
    38000,
    152,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-6'),
    '1000 kg',
    1000,
    'kg',
    115000,
    115,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-7'),
    '1000 kg',
    1000,
    'kg',
    235000,
    235,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-8'),
    '1000 kg',
    1000,
    'kg',
    62000,
    62,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-9'),
    '40 kg',
    40,
    'kg',
    135000,
    3375,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'M-10'),
    '1000 kg',
    1000,
    'kg',
    95000,
    95,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-2'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-3'),
    '100 kg',
    100,
    'kg',
    75000,
    750,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-4'),
    '100 kg',
    100,
    'kg',
    85000,
    850,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-5'),
    '1000 kg',
    1000,
    'kg',
    55000,
    55,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-6'),
    '1000 kg',
    1000,
    'kg',
    62000,
    62,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-7'),
    '1000 kg',
    1000,
    'kg',
    64500,
    64.5,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-8'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-9'),
    '1000 kg',
    1000,
    'kg',
    17000,
    17,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-10'),
    '1000 kg',
    1000,
    'kg',
    28000,
    28,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-11'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-12'),
    '165 pc',
    165,
    'pc',
    29000,
    175.8,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-13'),
    '1000 kg',
    1000,
    'kg',
    19000,
    19,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-14'),
    '1000 kg',
    1000,
    'kg',
    16000,
    16,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-15'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-16'),
    '1000 kg',
    1000,
    'kg',
    29000,
    29,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-17'),
    '1000 kg',
    1000,
    'kg',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-18'),
    '500 pk',
    500,
    'pk',
    285000,
    570,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-19'),
    '1000 kg',
    1000,
    'kg',
    93000,
    93,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-20'),
    '5000 5kg',
    5000,
    '5kg',
    75000,
    15,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'S-21'),
    '1000 1',
    1000,
    '1',
    2750000,
    2750,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-1'),
    '1000 1',
    1000,
    '1',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-2'),
    '1000 1',
    1000,
    '1',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-3'),
    '1000 1',
    1000,
    '1',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-4'),
    '1000 1',
    1000,
    '1',
    35000,
    35,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-5'),
    '1000 1',
    1000,
    '1',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-6'),
    '1000 1',
    1000,
    '1',
    20000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-7'),
    '60 pk',
    60,
    'pk',
    26000,
    433.3,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-8'),
    '50 pk',
    50,
    'pk',
    174000,
    3480,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-9'),
    '1000 pk',
    1000,
    'pk',
    19000,
    19,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-10'),
    '1000 pk',
    1000,
    'pk',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'O-11'),
    '500 pk',
    500,
    'pk',
    70000,
    140,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-1'),
    '0 pc',
    0,
    'pc',
    2000,
    2000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-2'),
    '1000 kg',
    1000,
    'kg',
    47000,
    47,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-3'),
    '1000 kg',
    1000,
    'kg',
    20000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-4'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-5'),
    '1000 kg',
    1000,
    'kg',
    55000,
    55,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-6'),
    '1000 kg',
    1000,
    'kg',
    55000,
    55,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-7'),
    '1000 kg',
    1000,
    'kg',
    70000,
    70,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-8'),
    '1000 kg',
    1000,
    'kg',
    16000,
    16,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-9'),
    '1000 kg',
    1000,
    'kg',
    75000,
    75,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-10'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-11'),
    '1000 kg',
    1000,
    'kg',
    75000,
    75,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-12'),
    '1000 kg',
    1000,
    'kg',
    55000,
    55,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-13'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-14'),
    '1000 kg',
    1000,
    'kg',
    700000,
    700,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-15'),
    '1000 kg',
    1000,
    'kg',
    30000,
    45,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-16'),
    '1000 kg',
    1000,
    'kg',
    35000,
    35,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-17'),
    '1000 kg',
    1000,
    'kg',
    25000,
    25,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-18'),
    '1000 kg',
    1000,
    'kg',
    10000,
    13,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-19'),
    '1000 kg',
    1000,
    'kg',
    10000,
    16,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-20'),
    '1000 kg',
    1000,
    'kg',
    20000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-21'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-22'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-23'),
    '1000 kg',
    1000,
    'kg',
    50000,
    50,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-24'),
    '1000 kg',
    1000,
    'kg',
    35000,
    43.8,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-25'),
    '1000 kg',
    1000,
    'kg',
    20000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-26'),
    '1000 kg',
    1000,
    'kg',
    30000,
    30,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-27'),
    '1000 kg',
    1000,
    'kg',
    45000,
    45,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-28'),
    '1000 kg',
    1000,
    'kg',
    17000,
    17,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-29'),
    '1000 kg',
    1000,
    'kg',
    25000,
    25,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-30'),
    '1000 kg',
    1000,
    'kg',
    32000,
    32,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-31'),
    '1000 kg',
    1000,
    'kg',
    18000,
    18,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-32'),
    '20 kg',
    20,
    'kg',
    2000,
    100,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-33'),
    '1000 kg',
    1000,
    'kg',
    55000,
    55,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-34'),
    '1000 kg',
    1000,
    'kg',
    25000,
    25,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-35'),
    '1000 kg',
    1000,
    'kg',
    35000,
    38.5,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-36'),
    '1000 kg',
    1000,
    'kg',
    20000,
    20,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-37'),
    '1000 kg',
    1000,
    'kg',
    23000,
    23,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-38'),
    '1000 kg',
    1000,
    'kg',
    30000,
    30,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-39'),
    '1000 kg',
    1000,
    'kg',
    22000,
    22,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-40'),
    '1000 kg',
    1000,
    'kg',
    80000,
    80,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-41'),
    '1000 kg',
    1000,
    'kg',
    21000,
    21,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-42'),
    '1000 kg',
    1000,
    'kg',
    12000,
    12,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-43'),
    '1000 kg',
    1000,
    'kg',
    40000,
    40,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-44'),
    '1000 kg',
    1000,
    'kg',
    200000,
    200,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'V-45'),
    '1000 kg',
    1000,
    'kg',
    12000,
    16.8,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'W-1'),
    '12 pc',
    12,
    'pc',
    350000,
    29166.7,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'W-2'),
    '5 pc',
    5,
    'pc',
    140000,
    28000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'W-3'),
    '0 pc',
    0,
    'pc',
    14000,
    14000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'W-4'),
    '0 pc',
    0,
    'pc',
    20000,
    20000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'B-1'),
    '0 pc',
    0,
    'pc',
    8000,
    8000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'B-2'),
    '0 pc',
    0,
    'pc',
    17000,
    17000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'B-3'),
    '10 pc',
    10,
    'pc',
    24000,
    2400,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'N-1'),
    '0 ',
    0,
    '',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'N-2'),
    '1000 kg',
    1000,
    'kg',
    250000,
    250,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'N-3'),
    '0 ',
    0,
    '',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'N-4'),
    '0 ',
    0,
    '',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'T-1'),
    '0 pk',
    0,
    'pk',
    70000,
    70000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'T-2'),
    '0 pk',
    0,
    'pk',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'T-3'),
    '0 pk',
    0,
    'pk',
    22500,
    22500,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'T-9'),
    '0 pk',
    0,
    'pk',
    34000,
    34000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'T-10'),
    '0 pk',
    0,
    'pk',
    47000,
    47000,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'T-11'),
    '0 pk',
    0,
    'pk',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'T-12'),
    '0 pk',
    0,
    'pk',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'A-1'),
    '0 ml',
    0,
    'ml',
    0,
    0,
    true
  );
INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = 'A-2'),
    '19000 pk',
    19000,
    'pk',
    21000,
    1.1,
    true
  );

COMMIT;
