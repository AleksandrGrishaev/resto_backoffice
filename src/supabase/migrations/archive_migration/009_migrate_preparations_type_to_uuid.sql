-- Migration: Migrate preparations.type from TEXT to UUID foreign key
-- Created: 2025-11-24
-- Description: Convert preparations.type column to reference preparation_categories table
-- Applied to DEV: 2025-11-24 (version 20251124122314)
-- Applied to PROD: [PENDING]

-- =============================================
-- CONTEXT
-- =============================================
-- Before: preparations.type was TEXT with values like 'sauce', 'garnish', etc.
-- After:  preparations.type is UUID foreign key to preparation_categories.id
--
-- This follows the same pattern as products.category migration (009_migrate_products_category.sql)

-- =============================================
-- PRE-MIGRATION CHECK
-- =============================================
-- Verify preparation_categories table exists and has data
DO $$
DECLARE
  category_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_count FROM preparation_categories;

  IF category_count = 0 THEN
    RAISE EXCEPTION 'preparation_categories table is empty. Cannot proceed with migration.';
  END IF;

  RAISE NOTICE 'Found % preparation categories', category_count;
END $$;

-- =============================================
-- MIGRATION
-- =============================================

-- Step 1: Add new temporary column for UUID type
ALTER TABLE preparations ADD COLUMN type_new UUID;

-- Step 2: Populate new column by matching text key to preparation_categories.id
-- Map old TEXT keys (sauce, garnish, etc.) to new UUID from preparation_categories
UPDATE preparations
SET type_new = pc.id
FROM preparation_categories pc
WHERE preparations.type = pc.key;

-- Step 3: Handle unmapped values (if any)
-- Check for preparations with NULL type_new (no match found)
DO $$
DECLARE
  unmapped_count INTEGER;
  other_category_id UUID;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM preparations
  WHERE type_new IS NULL;

  IF unmapped_count > 0 THEN
    -- Get 'other' category id
    SELECT id INTO other_category_id
    FROM preparation_categories
    WHERE key = 'other';

    IF other_category_id IS NULL THEN
      RAISE EXCEPTION 'Cannot find "other" category in preparation_categories';
    END IF;

    -- Map unmapped preparations to 'other' category
    UPDATE preparations
    SET type_new = other_category_id
    WHERE type_new IS NULL;

    RAISE NOTICE 'Mapped % unmapped preparations to "other" category', unmapped_count;
  END IF;
END $$;

-- Step 4: Verify all preparations have a valid type_new
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM preparations
  WHERE type_new IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Still have % preparations with NULL type_new. Migration failed.', null_count;
  END IF;
END $$;

-- Step 5: Drop old TEXT column
ALTER TABLE preparations DROP COLUMN type;

-- Step 6: Rename new column to original name
ALTER TABLE preparations RENAME COLUMN type_new TO type;

-- Step 7: Add NOT NULL constraint
ALTER TABLE preparations ALTER COLUMN type SET NOT NULL;

-- Step 8: Add foreign key constraint
ALTER TABLE preparations
  ADD CONSTRAINT fk_preparations_type
  FOREIGN KEY (type)
  REFERENCES preparation_categories(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Step 9: Add index for foreign key (performance)
CREATE INDEX IF NOT EXISTS idx_preparations_type ON preparations(type);

-- Step 10: Add comment
COMMENT ON COLUMN preparations.type IS 'Reference to preparation_categories.id (formerly TEXT key)';

-- =============================================
-- VERIFICATION
-- =============================================
-- After migration, verify:
--
-- 1. Check column type is UUID:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'preparations' AND column_name = 'type';
--
-- 2. Check all preparations have valid category:
-- SELECT COUNT(*) FROM preparations WHERE type IS NULL;
-- Expected: 0
--
-- 3. Check foreign key exists:
-- SELECT constraint_name, column_name
-- FROM information_schema.key_column_usage
-- WHERE table_name = 'preparations' AND column_name = 'type';
--
-- 4. Check data distribution:
-- SELECT pc.name, COUNT(p.id) as prep_count
-- FROM preparation_categories pc
-- LEFT JOIN preparations p ON p.type = pc.id
-- GROUP BY pc.id, pc.name
-- ORDER BY prep_count DESC;
