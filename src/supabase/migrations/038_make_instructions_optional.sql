-- Migration: 038_make_instructions_optional
-- Description: Make instructions field optional (nullable) in preparations table
-- Date: 2025-12-04
-- Author: Claude

-- CONTEXT:
-- Instructions are not always required for semi-finished products (preparations).
-- Some preparations are simple enough that they don't need detailed instructions.
-- Making this field optional improves usability without losing data integrity.

-- PRE-MIGRATION VALIDATION
DO $$
BEGIN
  -- Check if preparations table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'preparations') THEN
    RAISE EXCEPTION 'Table preparations does not exist';
  END IF;

  -- Check if instructions column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'preparations'
    AND column_name = 'instructions'
  ) THEN
    RAISE EXCEPTION 'Column instructions does not exist in preparations table';
  END IF;

  RAISE NOTICE 'Pre-migration validation passed';
END $$;

-- ACTUAL CHANGES
-- Remove NOT NULL constraint from instructions column
ALTER TABLE preparations
  ALTER COLUMN instructions DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN preparations.instructions IS 'Preparation instructions (optional). Can be null for simple preparations.';

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  v_is_nullable TEXT;
BEGIN
  -- Verify that instructions column is now nullable
  SELECT is_nullable INTO v_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'preparations'
    AND column_name = 'instructions';

  IF v_is_nullable != 'YES' THEN
    RAISE EXCEPTION 'Migration failed: instructions column is still NOT NULL';
  END IF;

  RAISE NOTICE 'Post-migration validation passed: instructions is now nullable';
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 038 completed successfully';
  RAISE NOTICE '   - instructions column in preparations table is now NULLABLE';
  RAISE NOTICE '   - Existing data preserved';
  RAISE NOTICE '   - New preparations can have NULL instructions';
END $$;
