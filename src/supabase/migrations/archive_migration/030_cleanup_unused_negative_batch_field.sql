-- Migration: 030_cleanup_unused_negative_batch_field
-- Description: Remove unused source_batch_id field from negative batch tables
-- Date: 2025-12-02
-- Author: Claude Code

-- CONTEXT:
-- The source_batch_id field was originally intended to track which batch
-- was used to calculate negative batch cost, but it was never implemented.
-- After analyzing production data, 0 out of 6 negative batches use this field.
-- Removing it simplifies the schema and reduces confusion.

-- PRE-MIGRATION VALIDATION
-- Verify that source_batch_id is not being used
DO $$
DECLARE
  storage_usage_count INTEGER;
  prep_usage_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO storage_usage_count
  FROM storage_batches
  WHERE source_batch_id IS NOT NULL;

  SELECT COUNT(*) INTO prep_usage_count
  FROM preparation_batches
  WHERE source_batch_id IS NOT NULL;

  RAISE NOTICE '📊 Pre-migration validation:';
  RAISE NOTICE '  storage_batches with source_batch_id: %', storage_usage_count;
  RAISE NOTICE '  preparation_batches with source_batch_id: %', prep_usage_count;

  IF storage_usage_count > 0 OR prep_usage_count > 0 THEN
    RAISE EXCEPTION '⚠️  source_batch_id is in use! Cannot drop column safely.';
  END IF;
END $$;

-- ACTUAL CHANGES
-- Drop source_batch_id column from storage_batches
ALTER TABLE storage_batches DROP COLUMN IF EXISTS source_batch_id;

-- Drop source_batch_id column from preparation_batches
ALTER TABLE preparation_batches DROP COLUMN IF EXISTS source_batch_id;

-- Drop related indexes (if they exist)
DROP INDEX IF EXISTS idx_storage_batches_source_batch_id;
DROP INDEX IF EXISTS idx_preparation_batches_source_batch_id;

-- POST-MIGRATION VALIDATION
-- Verify columns were dropped
DO $$
DECLARE
  storage_column_exists BOOLEAN;
  prep_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storage_batches'
      AND column_name = 'source_batch_id'
  ) INTO storage_column_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preparation_batches'
      AND column_name = 'source_batch_id'
  ) INTO prep_column_exists;

  IF storage_column_exists OR prep_column_exists THEN
    RAISE WARNING '⚠️  Columns still exist after migration!';
  ELSE
    RAISE NOTICE '✅ All source_batch_id columns removed successfully';
  END IF;
END $$;

-- Show remaining negative batch fields (for confirmation)
DO $$
BEGIN
  RAISE NOTICE '📋 Remaining negative batch fields:';
  RAISE NOTICE '  ✅ is_negative - identifies negative batches';
  RAISE NOTICE '  ✅ negative_created_at - timestamp of creation';
  RAISE NOTICE '  ✅ negative_reason - reason for shortage';
  RAISE NOTICE '  ✅ source_operation_type - operation that caused shortage';
  RAISE NOTICE '  ✅ affected_recipe_ids - affected recipes';
  RAISE NOTICE '  ✅ reconciled_at - when covered with new stock';
  RAISE NOTICE '  ❌ source_batch_id - REMOVED (unused)';
END $$;

RAISE NOTICE '✅ Migration 030_cleanup_unused_negative_batch_field completed successfully';
