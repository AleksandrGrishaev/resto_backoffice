-- Migration: 014_fix_preparation_ingredients_id_type
-- Description: Change preparation_ingredients.id from text to uuid with auto-generation
-- Date: 2025-12-02

-- CONTEXT: The id column is currently text which requires manual UUID generation
-- Changing to uuid type with gen_random_uuid() default will simplify inserts

BEGIN;

-- Drop existing constraint if any
ALTER TABLE preparation_ingredients DROP CONSTRAINT IF EXISTS preparation_ingredients_pkey;

-- Change column type from text to uuid (existing UUIDs in text format will be converted)
ALTER TABLE preparation_ingredients
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Re-add primary key constraint
ALTER TABLE preparation_ingredients ADD PRIMARY KEY (id);

-- Verify change
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'preparation_ingredients'
  AND column_name = 'id';

COMMIT;
