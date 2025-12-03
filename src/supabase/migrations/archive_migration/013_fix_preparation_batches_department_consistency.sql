-- Migration: 013_fix_preparation_batches_department_consistency
-- Description: Fix department field inconsistency between preparations and preparation_batches tables
-- Date: 2025-11-25
-- Author: Claude Code

-- CONTEXT:
-- The preparation_batches table has a department field that was sometimes set incorrectly,
-- not matching the parent preparation's department. This caused preparations to appear in
-- the wrong department tab in the UI.
--
-- For example, "Garlic Sauce Spread 1" was defined as department='kitchen' in preparations,
-- but its batches had department='bar', causing it to appear in the Bar section instead of Kitchen.
--
-- This migration:
-- 1. Updates all existing batches to match their preparation's department
-- 2. Adds a trigger to ensure future inserts/updates maintain consistency
-- 3. Documents the fix for production deployment

-- PRE-MIGRATION VALIDATION
-- Check for mismatched departments
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO mismatch_count
  FROM preparation_batches pb
  JOIN preparations p ON p.id = pb.preparation_id
  WHERE pb.department != p.department;

  RAISE NOTICE 'Found % batches with mismatched department', mismatch_count;
END $$;

-- FIX EXISTING DATA
-- Update all preparation_batches to match their preparation's department
UPDATE preparation_batches pb
SET department = p.department,
    updated_at = NOW()
FROM preparations p
WHERE pb.preparation_id = p.id
  AND pb.department != p.department;

-- CREATE TRIGGER FUNCTION
-- This function ensures that preparation_batches.department always matches preparations.department
CREATE OR REPLACE FUNCTION sync_preparation_batch_department()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the department from the parent preparation
  SELECT department INTO NEW.department
  FROM preparations
  WHERE id = NEW.preparation_id;

  -- If preparation not found, raise error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preparation with id % not found', NEW.preparation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGER
-- This trigger fires on INSERT or UPDATE to ensure department consistency
DROP TRIGGER IF EXISTS sync_preparation_batch_department_trigger ON preparation_batches;

CREATE TRIGGER sync_preparation_batch_department_trigger
  BEFORE INSERT OR UPDATE OF preparation_id
  ON preparation_batches
  FOR EACH ROW
  EXECUTE FUNCTION sync_preparation_batch_department();

-- POST-MIGRATION VALIDATION
-- Verify that all batches now have matching departments
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO mismatch_count
  FROM preparation_batches pb
  JOIN preparations p ON p.id = pb.preparation_id
  WHERE pb.department != p.department;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: still found % batches with mismatched department', mismatch_count;
  END IF;

  RAISE NOTICE 'Migration successful: all batches now have matching department with their preparation';
END $$;

-- ROLLBACK INSTRUCTIONS (if needed):
-- DROP TRIGGER IF EXISTS sync_preparation_batch_department_trigger ON preparation_batches;
-- DROP FUNCTION IF EXISTS sync_preparation_batch_department();
-- Note: Data changes cannot be automatically rolled back. Manual data restoration required.

COMMENT ON FUNCTION sync_preparation_batch_department() IS
'Automatically syncs preparation_batches.department with preparations.department on INSERT/UPDATE';

COMMENT ON TRIGGER sync_preparation_batch_department_trigger ON preparation_batches IS
'Ensures department consistency between preparation_batches and preparations tables';
