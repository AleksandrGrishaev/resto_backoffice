-- Migration: 011_make_recipe_preparation_codes_required
-- Description: Make code column required and add auto-generation support for recipes and preparations
-- Date: 2025-11-25
-- Author: Claude Code

-- ============================================================
-- CONTEXT
-- ============================================================
-- Previously, code was optional for recipes and required for preparations.
-- Now both recipe and preparation codes are required fields that are
-- auto-generated in the UI (P-001, P-002... for preparations, R-001, R-002... for recipes).

-- ============================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================
-- Check if there are any records without codes
DO $$
DECLARE
  recipes_without_code INTEGER;
  preparations_without_code INTEGER;
BEGIN
  SELECT COUNT(*) INTO recipes_without_code FROM recipes WHERE code IS NULL OR code = '';
  SELECT COUNT(*) INTO preparations_without_code FROM preparations WHERE code IS NULL OR code = '';

  IF recipes_without_code > 0 THEN
    RAISE EXCEPTION 'Found % recipes without code. Please fix before running this migration.', recipes_without_code;
  END IF;

  IF preparations_without_code > 0 THEN
    RAISE EXCEPTION 'Found % preparations without code. Please fix before running this migration.', preparations_without_code;
  END IF;

  RAISE NOTICE 'Pre-migration validation passed: all records have codes';
END $$;

-- ============================================================
-- STEP 1: Add unique constraints (if not exists)
-- ============================================================

-- Add unique constraint for recipes.code if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recipes_code_unique'
  ) THEN
    ALTER TABLE recipes ADD CONSTRAINT recipes_code_unique UNIQUE (code);
    RAISE NOTICE 'Added unique constraint: recipes_code_unique';
  ELSE
    RAISE NOTICE 'Unique constraint recipes_code_unique already exists';
  END IF;
END $$;

-- Add unique constraint for preparations.code if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'preparations_code_unique' OR conname = 'preparations_code_key'
  ) THEN
    ALTER TABLE preparations ADD CONSTRAINT preparations_code_unique UNIQUE (code);
    RAISE NOTICE 'Added unique constraint: preparations_code_unique';
  ELSE
    RAISE NOTICE 'Unique constraint for preparations.code already exists';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Make code columns NOT NULL
-- ============================================================

-- Make recipes.code NOT NULL
ALTER TABLE recipes
  ALTER COLUMN code SET NOT NULL;

-- Make preparations.code NOT NULL
ALTER TABLE preparations
  ALTER COLUMN code SET NOT NULL;

-- ============================================================
-- STEP 3: Add column documentation
-- ============================================================

COMMENT ON COLUMN recipes.code IS 'Unique recipe code (e.g., R-001), auto-generated in UI';
COMMENT ON COLUMN preparations.code IS 'Unique preparation code (e.g., P-001), auto-generated in UI';

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify constraints were applied
DO $$
DECLARE
  recipes_nullable TEXT;
  preparations_nullable TEXT;
BEGIN
  -- Check if columns are NOT NULL
  SELECT is_nullable INTO recipes_nullable
  FROM information_schema.columns
  WHERE table_name = 'recipes' AND column_name = 'code';

  SELECT is_nullable INTO preparations_nullable
  FROM information_schema.columns
  WHERE table_name = 'preparations' AND column_name = 'code';

  IF recipes_nullable = 'NO' AND preparations_nullable = 'NO' THEN
    RAISE NOTICE '✅ Migration successful: code columns are now NOT NULL';
  ELSE
    RAISE EXCEPTION 'Migration verification failed';
  END IF;
END $$;

-- Show current state
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  (SELECT COUNT(*) FROM pg_constraint
   WHERE conname LIKE '%' || table_name || '%code%'
   AND contype = 'u') as unique_constraints
FROM information_schema.columns
WHERE table_name IN ('recipes', 'preparations')
  AND column_name = 'code'
ORDER BY table_name;
