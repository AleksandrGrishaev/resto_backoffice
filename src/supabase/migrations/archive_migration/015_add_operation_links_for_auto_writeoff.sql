-- Migration: 015_add_operation_links_for_auto_writeoff
-- Description: Add linking fields between preparation_operations and storage_operations
--              to track automatic raw product write-offs during preparation production
-- Date: 2025-01-25
-- Author: Kitchen App Team
-- Phase: Phase 1 - Preparation Production with Auto Write-off

-- CONTEXT:
-- When a preparation batch is created, raw products are automatically written off from storage.
-- We need to link these operations for:
-- 1. Audit trail (which storage write-offs were triggered by which production)
-- 2. UI display (show linked operations in PreparationOperationsTable)
-- 3. Prevent double write-off (products written off during production, not again during sales)

-- =====================================================
-- PART 1: Add link from preparation_operations to storage_operations
-- =====================================================

-- Add array field to store IDs of related storage write-off operations
ALTER TABLE preparation_operations
ADD COLUMN related_storage_operation_ids text[];

COMMENT ON COLUMN preparation_operations.related_storage_operation_ids IS
'Array of storage_operations IDs. When raw products are automatically written off during preparation production, their operation IDs are stored here. Used for audit trail and UI display.';

-- Add index for better query performance
CREATE INDEX idx_prep_ops_related_storage_ops
ON preparation_operations USING GIN (related_storage_operation_ids)
WHERE related_storage_operation_ids IS NOT NULL;

COMMENT ON INDEX idx_prep_ops_related_storage_ops IS
'GIN index for efficient queries on related storage operation IDs array';

-- =====================================================
-- PART 2: Add link from storage_operations to preparation_operations
-- =====================================================

-- Add field to link storage write-off back to preparation production
ALTER TABLE storage_operations
ADD COLUMN related_preparation_operation_id uuid REFERENCES preparation_operations(id);

COMMENT ON COLUMN storage_operations.related_preparation_operation_id IS
'Link to preparation_operations when this storage write-off was triggered by preparation production. Used when operation_type = ''write_off'' and write_off_details.reason = ''production_consumption''.';

-- Add index for foreign key lookups
CREATE INDEX idx_storage_ops_related_prep_op
ON storage_operations(related_preparation_operation_id)
WHERE related_preparation_operation_id IS NOT NULL;

COMMENT ON INDEX idx_storage_ops_related_prep_op IS
'Index for efficient lookups of storage operations linked to preparation operations';

-- =====================================================
-- PART 3: Update write_off_details reason enum (documentation only)
-- =====================================================

-- NOTE: write_off_details is JSONB, so we don't enforce enum at database level.
-- The application uses these new reason values:
-- - 'production_consumption': Raw products consumed for preparation production (non-KPI affecting)
-- - 'sales_consumption': Products/preparations consumed for sales orders (Sprint 2, non-KPI affecting)

-- These are documented in application code:
-- - src/stores/storage/types.ts: WriteOffReason type
-- - src/stores/storage/types.ts: WRITE_OFF_CLASSIFICATION.NON_KPI_AFFECTING

-- =====================================================
-- PART 4: Validation queries
-- =====================================================

-- Verify columns were added
DO $$
DECLARE
  v_prep_column_exists boolean;
  v_storage_column_exists boolean;
BEGIN
  -- Check preparation_operations column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preparation_operations'
    AND column_name = 'related_storage_operation_ids'
  ) INTO v_prep_column_exists;

  -- Check storage_operations column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storage_operations'
    AND column_name = 'related_preparation_operation_id'
  ) INTO v_storage_column_exists;

  -- Report results
  IF v_prep_column_exists AND v_storage_column_exists THEN
    RAISE NOTICE '✅ Migration 015 completed successfully';
    RAISE NOTICE '  - related_storage_operation_ids added to preparation_operations';
    RAISE NOTICE '  - related_preparation_operation_id added to storage_operations';
    RAISE NOTICE '  - Indexes created';
  ELSE
    RAISE EXCEPTION '❌ Migration 015 failed: columns not created';
  END IF;
END $$;

-- =====================================================
-- ROLLBACK SCRIPT (for reference, DO NOT RUN)
-- =====================================================

/*
-- To rollback this migration (emergency only):

DROP INDEX IF EXISTS idx_prep_ops_related_storage_ops;
ALTER TABLE preparation_operations DROP COLUMN IF EXISTS related_storage_operation_ids;

DROP INDEX IF EXISTS idx_storage_ops_related_prep_op;
ALTER TABLE storage_operations DROP COLUMN IF EXISTS related_preparation_operation_id;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
