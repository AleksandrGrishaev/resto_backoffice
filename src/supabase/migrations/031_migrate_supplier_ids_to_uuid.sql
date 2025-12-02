-- Migration: 012_migrate_supplier_ids_to_uuid
-- Description: Migrate products.primary_supplier_id from old string format to UUID format
-- Date: 2025-12-02
-- Author: Claude Code

-- CONTEXT:
-- Products table has primary_supplier_id field with old string values like 'sup-dairy-fresh'
-- Need to migrate these to proper UUID references to counteragents table

-- =============================================
-- STEP 1: Create mapping table (temporary)
-- =============================================
CREATE TEMP TABLE supplier_id_mapping (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL,
  supplier_name TEXT
);

-- =============================================
-- STEP 2: Insert mapping data
-- =============================================
-- Based on counteragents table and logical name matching
INSERT INTO supplier_id_mapping (old_id, new_id, supplier_name) VALUES
  ('sup-dairy-fresh', 'ec9f8799-aad8-4ebf-94db-40ef5eeb28a2', 'PT Susu Indo Jaya (Indo Dairy)'),
  ('sup-fresh-veg-market', '166912ab-f999-409e-abb7-e3571fe21ac0', 'Toko Sayur Segar (Fresh Veggies)'),
  ('sup-beverage-distribution', '61061126-a0b9-4aed-80f3-bf7a3e78d54f', 'PT Minuman Berkah (Beverage Distributor)'),
  ('sup-premium-meat-co', '6dc91de9-2a9b-42d6-9b41-2c98d4cc4abf', 'PT Sumber Daging Segar (Fresh Meat Supplier)'),
  ('sup-bakery', '3cc695fb-eee5-4619-8764-d5c99010f515', 'CV Bahan Baku Utama (Main Ingredients)'),
  ('sup-basic-supplies', '3cc695fb-eee5-4619-8764-d5c99010f515', 'CV Bahan Baku Utama (Main Ingredients)'),
  ('sup-spice-world', 'ca562672-a1cd-424e-a28d-526128954220', 'UD Bumbu Rempah (Spice House)'),
  ('sup-seafood-market', 'ac4e8e1a-0666-443b-9b2a-12d8ce280985', 'CV Laut Nusantara (Seafood Fresh)'),
  ('sup-specialty-foods', '3cc695fb-eee5-4619-8764-d5c99010f515', 'CV Bahan Baku Utama (Main Ingredients)');

-- =============================================
-- STEP 3: Pre-migration validation
-- =============================================
DO $$
DECLARE
  unmapped_count INTEGER;
  product_count INTEGER;
BEGIN
  -- Check for products with unmapped supplier IDs
  SELECT COUNT(*) INTO unmapped_count
  FROM products p
  WHERE p.primary_supplier_id IS NOT NULL
    AND p.primary_supplier_id != ''
    AND NOT EXISTS (
      SELECT 1 FROM supplier_id_mapping m
      WHERE m.old_id = p.primary_supplier_id
    );

  IF unmapped_count > 0 THEN
    RAISE NOTICE 'WARNING: % products have unmapped supplier IDs', unmapped_count;
  END IF;

  -- Report total products to migrate
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE primary_supplier_id IS NOT NULL AND primary_supplier_id != '';

  RAISE NOTICE 'Total products with supplier IDs: %', product_count;
END $$;

-- =============================================
-- STEP 4: Backup current state (for rollback)
-- =============================================
-- Store old values in a temporary table for potential rollback
CREATE TEMP TABLE products_supplier_backup AS
SELECT id, primary_supplier_id
FROM products
WHERE primary_supplier_id IS NOT NULL AND primary_supplier_id != '';

-- =============================================
-- STEP 5: Perform migration
-- =============================================
-- Update products with mapped supplier IDs
UPDATE products p
SET
  primary_supplier_id = m.new_id::text,
  updated_at = NOW()
FROM supplier_id_mapping m
WHERE p.primary_supplier_id = m.old_id;

-- =============================================
-- STEP 6: Post-migration validation
-- =============================================
DO $$
DECLARE
  migrated_count INTEGER;
  uuid_format_count INTEGER;
  old_format_count INTEGER;
BEGIN
  -- Count migrated products
  SELECT COUNT(*) INTO migrated_count
  FROM products p
  INNER JOIN supplier_id_mapping m ON p.primary_supplier_id = m.new_id::text;

  RAISE NOTICE 'Successfully migrated % products to UUID format', migrated_count;

  -- Check for valid UUID format
  SELECT COUNT(*) INTO uuid_format_count
  FROM products
  WHERE primary_supplier_id IS NOT NULL
    AND primary_supplier_id != ''
    AND primary_supplier_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  RAISE NOTICE 'Products with valid UUID format: %', uuid_format_count;

  -- Check for remaining old format IDs
  SELECT COUNT(*) INTO old_format_count
  FROM products
  WHERE primary_supplier_id IS NOT NULL
    AND primary_supplier_id != ''
    AND primary_supplier_id ~ '^sup-';

  IF old_format_count > 0 THEN
    RAISE WARNING 'Still have % products with old format supplier IDs', old_format_count;
  ELSE
    RAISE NOTICE 'All supplier IDs migrated successfully!';
  END IF;
END $$;

-- =============================================
-- STEP 7: Verify referential integrity
-- =============================================
-- Check that all migrated IDs reference valid counteragents
DO $$
DECLARE
  invalid_refs INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_refs
  FROM products p
  WHERE p.primary_supplier_id IS NOT NULL
    AND p.primary_supplier_id != ''
    AND NOT EXISTS (
      SELECT 1 FROM counteragents c
      WHERE c.id::text = p.primary_supplier_id
    );

  IF invalid_refs > 0 THEN
    RAISE WARNING '% products have invalid counteragent references!', invalid_refs;
  ELSE
    RAISE NOTICE 'All supplier references are valid';
  END IF;
END $$;

-- =============================================
-- STEP 8: Update data type (optional - for future)
-- =============================================
-- Note: Currently primary_supplier_id is TEXT type
-- If we want to change it to UUID type in the future:
-- ALTER TABLE products ALTER COLUMN primary_supplier_id TYPE UUID USING primary_supplier_id::UUID;
-- This is commented out for now to avoid breaking changes

-- =============================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================
-- Uncomment and run if migration needs to be reverted:
/*
UPDATE products p
SET
  primary_supplier_id = b.primary_supplier_id,
  updated_at = NOW()
FROM products_supplier_backup b
WHERE p.id = b.id;
*/

-- =============================================
-- MIGRATION SUMMARY
-- =============================================
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM products WHERE primary_supplier_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') as uuid_format_count,
  (SELECT COUNT(*) FROM products WHERE primary_supplier_id ~ '^sup-') as old_format_count,
  (SELECT COUNT(*) FROM products WHERE primary_supplier_id IS NULL OR primary_supplier_id = '') as null_count;
