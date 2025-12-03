-- Migration: Fix product units to use full names
-- Description: Update base_unit and unit columns to use full unit names (gram, ml, piece)
-- Date: 2025-12-02
-- Author: Claude

-- CONTEXT: Products were imported with short unit names (gr, pc) but the app
-- uses full names (gram, piece) defined in src/types/measurementUnits.ts

BEGIN;

-- Update base_unit: gr → gram
UPDATE products
SET base_unit = 'gram', unit = 'gram'
WHERE base_unit = 'gr';

-- Update base_unit: pc → piece
UPDATE products
SET base_unit = 'piece', unit = 'piece'
WHERE base_unit = 'pc';

-- Update base_unit: lt → liter (if any)
UPDATE products
SET base_unit = 'liter', unit = 'liter'
WHERE base_unit = 'lt';

-- Verification query
DO $$
DECLARE
  gram_count INT;
  ml_count INT;
  piece_count INT;
  invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO gram_count FROM products WHERE base_unit = 'gram';
  SELECT COUNT(*) INTO ml_count FROM products WHERE base_unit = 'ml';
  SELECT COUNT(*) INTO piece_count FROM products WHERE base_unit = 'piece';
  SELECT COUNT(*) INTO invalid_count FROM products
  WHERE base_unit NOT IN ('gram', 'ml', 'piece', 'liter', 'kg');

  RAISE NOTICE '✅ Products with gram: %', gram_count;
  RAISE NOTICE '✅ Products with ml: %', ml_count;
  RAISE NOTICE '✅ Products with piece: %', piece_count;

  IF invalid_count > 0 THEN
    RAISE WARNING '⚠️  Products with invalid units: %', invalid_count;
  ELSE
    RAISE NOTICE '✅ All units are valid!';
  END IF;
END $$;

COMMIT;
