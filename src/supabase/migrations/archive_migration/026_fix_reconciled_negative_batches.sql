-- Migration: 012_fix_reconciled_negative_batches
-- Description: Fix existing reconciled negative batches with incorrect status/is_active fields
-- Date: 2025-12-01
-- Author: Claude Code

-- CONTEXT:
-- The markAsReconciled() function was only updating reconciled_at field,
-- but leaving status='active' and is_active=true unchanged.
-- This caused reconciled batches to still appear in active batch queries,
-- leading to incorrect inventory displays and duplicate batch creation.

-- PRE-MIGRATION VALIDATION
-- Count how many reconciled batches will be affected
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM storage_batches
  WHERE
    is_negative = true
    AND reconciled_at IS NOT NULL
    AND (is_active = true OR status != 'reconciled');

  RAISE NOTICE 'Found % reconciled negative batches with incorrect status', affected_count;
END $$;

-- ACTUAL CHANGES
-- Update all reconciled negative batches to have correct status and is_active
-- Note: Using 'consumed' status because DB constraint doesn't allow 'reconciled'
UPDATE storage_batches
SET
  status = 'consumed',
  is_active = false,
  updated_at = NOW()
WHERE
  is_negative = true
  AND reconciled_at IS NOT NULL
  AND (is_active = true OR status = 'active');

-- POST-MIGRATION VALIDATION
-- Verify all reconciled negative batches now have correct fields
DO $$
DECLARE
  fixed_count INTEGER;
  remaining_issues INTEGER;
BEGIN
  -- Count fixed batches
  SELECT COUNT(*) INTO fixed_count
  FROM storage_batches
  WHERE
    is_negative = true
    AND reconciled_at IS NOT NULL
    AND status = 'consumed'
    AND is_active = false;

  -- Check for remaining issues
  SELECT COUNT(*) INTO remaining_issues
  FROM storage_batches
  WHERE
    is_negative = true
    AND reconciled_at IS NOT NULL
    AND (is_active = true OR status = 'active');

  RAISE NOTICE '✅ Fixed % reconciled negative batches', fixed_count;

  IF remaining_issues > 0 THEN
    RAISE WARNING '⚠️  Still have % batches with issues - manual review needed', remaining_issues;
  ELSE
    RAISE NOTICE '✅ All reconciled negative batches are now correct';
  END IF;
END $$;

-- Create index for efficient queries on reconciled batches (if not exists)
CREATE INDEX IF NOT EXISTS idx_storage_batches_negative_reconciled
  ON storage_batches(is_negative, reconciled_at)
  WHERE is_negative = true;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 012_fix_reconciled_negative_batches completed successfully';
END $$;
