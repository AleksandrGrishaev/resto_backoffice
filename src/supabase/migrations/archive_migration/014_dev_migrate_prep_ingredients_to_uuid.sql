-- Migration: 014_dev_migrate_prep_ingredients_to_uuid.sql
-- Description: Migrate preparation_ingredients from text IDs to UUIDs for DEV database
-- Date: 2025-12-03
-- Target: DEV database only (fjkfckjpnbcyuknsnchy)
-- Author: Claude Code

-- CONTEXT: DEV has text format IDs ("prep-tomato-sauce-ing-6") which cannot be
-- directly converted to UUID. This migration creates new UUIDs and replaces old IDs.

-- PRE-MIGRATION VALIDATION
-- Check current state before making changes
DO $$
DECLARE
  current_type TEXT;
  row_count INTEGER;
BEGIN
  -- Check current column type
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'preparation_ingredients' AND column_name = 'id';

  RAISE NOTICE 'Current id column type: %', current_type;

  -- Check row count
  SELECT COUNT(*) INTO row_count FROM preparation_ingredients;
  RAISE NOTICE 'Total rows to migrate: %', row_count;

  -- Safety check: abort if already uuid
  IF current_type = 'uuid' THEN
    RAISE EXCEPTION 'Column id is already UUID type. Migration already applied or not needed.';
  END IF;
END $$;

-- ACTUAL MIGRATION
BEGIN;

-- Step 1: Drop existing primary key constraint
ALTER TABLE preparation_ingredients DROP CONSTRAINT IF EXISTS preparation_ingredients_pkey;

-- Step 2: Add temporary UUID column with auto-generation
ALTER TABLE preparation_ingredients
  ADD COLUMN id_new UUID DEFAULT gen_random_uuid();

-- Step 3: Populate all rows with new UUIDs
UPDATE preparation_ingredients SET id_new = gen_random_uuid() WHERE id_new IS NULL;

-- Step 4: Make id_new NOT NULL
ALTER TABLE preparation_ingredients ALTER COLUMN id_new SET NOT NULL;

-- Step 5: Drop old text ID column
ALTER TABLE preparation_ingredients DROP COLUMN id;

-- Step 6: Rename new UUID column to 'id'
ALTER TABLE preparation_ingredients RENAME COLUMN id_new TO id;

-- Step 7: Add primary key constraint
ALTER TABLE preparation_ingredients ADD PRIMARY KEY (id);

-- Step 8: Set default for future inserts
ALTER TABLE preparation_ingredients
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;

-- POST-MIGRATION VALIDATION
-- Verify migration success
DO $$
DECLARE
  new_type TEXT;
  new_default TEXT;
  row_count INTEGER;
  sample_id UUID;
BEGIN
  -- Check new column type
  SELECT data_type, column_default INTO new_type, new_default
  FROM information_schema.columns
  WHERE table_name = 'preparation_ingredients' AND column_name = 'id';

  RAISE NOTICE '✅ New id column type: %', new_type;
  RAISE NOTICE '✅ New id column default: %', new_default;

  -- Verify row count unchanged
  SELECT COUNT(*) INTO row_count FROM preparation_ingredients;
  RAISE NOTICE '✅ Total rows after migration: %', row_count;

  -- Sample one new UUID
  SELECT id INTO sample_id FROM preparation_ingredients LIMIT 1;
  RAISE NOTICE '✅ Sample new UUID: %', sample_id;

  -- Final check
  IF new_type = 'uuid' AND new_default LIKE '%gen_random_uuid%' THEN
    RAISE NOTICE '✅✅✅ MIGRATION SUCCESSFUL ✅✅✅';
  ELSE
    RAISE EXCEPTION '❌ Migration validation failed. Type: %, Default: %', new_type, new_default;
  END IF;
END $$;

-- Display final structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'preparation_ingredients'
  AND column_name = 'id';

-- Expected result:
-- column_name | data_type | column_default      | is_nullable
-- ------------|-----------|---------------------|-------------
-- id          | uuid      | gen_random_uuid()   | NO
