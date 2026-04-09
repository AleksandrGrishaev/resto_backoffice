-- Migration: 285_batch_storage_transfer
-- Description: Add storage_location and parent_batch_id to preparation_batches,
--              add shelf_life_frozen/shelf_life_thawed to preparations,
--              new source_type values: 'freeze', 'thaw',
--              new operation_type: 'transfer'
-- Date: 2026-04-08
-- Author: Claude

-- CONTEXT: Preparations can now be split across storage locations (fridge, freezer, shelf)
-- with different expiry dates. A batch of mash potato can be partially frozen,
-- then later thawed with a new shelf life. Each sub-batch tracks its own
-- storage_location and expiry_date independently.

-- =====================================================
-- 1. Add storage_location to preparation_batches
-- =====================================================
ALTER TABLE preparation_batches
  ADD COLUMN IF NOT EXISTS storage_location text DEFAULT 'fridge';

-- Add CHECK constraint for valid values
DO $$ BEGIN
  ALTER TABLE preparation_batches
    ADD CONSTRAINT chk_batch_storage_location
    CHECK (storage_location IN ('shelf', 'fridge', 'freezer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for filtering by storage location
CREATE INDEX IF NOT EXISTS idx_preparation_batches_storage_location
  ON preparation_batches (storage_location)
  WHERE is_active = true;

-- =====================================================
-- 2. Add parent_batch_id for tracking batch splits
-- =====================================================
ALTER TABLE preparation_batches
  ADD COLUMN IF NOT EXISTS parent_batch_id uuid REFERENCES preparation_batches(id);

-- Index for finding child batches
CREATE INDEX IF NOT EXISTS idx_preparation_batches_parent
  ON preparation_batches (parent_batch_id)
  WHERE parent_batch_id IS NOT NULL;

-- =====================================================
-- 3. Update source_type CHECK constraint to allow 'freeze' and 'thaw'
-- =====================================================
-- Drop old constraint and recreate with new values
ALTER TABLE preparation_batches DROP CONSTRAINT IF EXISTS preparation_batches_source_type_check;
ALTER TABLE preparation_batches DROP CONSTRAINT IF EXISTS chk_preparation_batches_source_type;

ALTER TABLE preparation_batches
  ADD CONSTRAINT chk_preparation_batches_source_type
  CHECK (source_type IN (
    'production', 'correction', 'opening_balance', 'inventory_adjustment',
    'negative_correction', 'auto_production',
    'freeze', 'thaw'
  ));

-- =====================================================
-- 4. Update operation_type on preparation_operations to allow 'transfer'
-- =====================================================
ALTER TABLE preparation_operations DROP CONSTRAINT IF EXISTS preparation_operations_operation_type_check;
ALTER TABLE preparation_operations DROP CONSTRAINT IF EXISTS chk_preparation_operations_type;

ALTER TABLE preparation_operations
  ADD CONSTRAINT chk_preparation_operations_type
  CHECK (operation_type IN ('receipt', 'inventory', 'write_off', 'correction', 'transfer'));

-- =====================================================
-- 5. Add transfer_details JSONB to preparation_operations
-- =====================================================
ALTER TABLE preparation_operations
  ADD COLUMN IF NOT EXISTS transfer_details jsonb;

COMMENT ON COLUMN preparation_operations.transfer_details IS 'Transfer details: fromLocation, toLocation, sourceBatchId, newBatchId, newExpiryDate';

-- =====================================================
-- 6. Add shelf_life_frozen and shelf_life_thawed to preparations
-- =====================================================
ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS shelf_life_frozen integer;

ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS shelf_life_thawed integer;

COMMENT ON COLUMN preparations.shelf_life IS 'Default shelf life in days (fridge)';
COMMENT ON COLUMN preparations.shelf_life_frozen IS 'Shelf life in days when frozen';
COMMENT ON COLUMN preparations.shelf_life_thawed IS 'Shelf life in days after thawing';

COMMENT ON COLUMN preparation_batches.storage_location IS 'Current storage: shelf, fridge, or freezer';
COMMENT ON COLUMN preparation_batches.parent_batch_id IS 'Parent batch ID when batch was split (freeze/thaw)';

-- =====================================================
-- 7. Backfill storage_location from preparation default
-- =====================================================
UPDATE preparation_batches pb
SET storage_location = COALESCE(p.storage_location, 'fridge')
FROM preparations p
WHERE pb.preparation_id = p.id
  AND pb.is_active = true
  AND pb.storage_location = 'fridge';

-- =====================================================
-- 8. Set reasonable defaults for shelf_life_frozen
-- =====================================================
-- Most preparations can be frozen for 30 days
UPDATE preparations
SET shelf_life_frozen = 30
WHERE shelf_life_frozen IS NULL;

-- Thawed items typically have 1 day shelf life
UPDATE preparations
SET shelf_life_thawed = 1
WHERE shelf_life_thawed IS NULL;

-- =====================================================
-- POST-MIGRATION VALIDATION
-- =====================================================
DO $$
DECLARE
  batch_col_exists boolean;
  parent_col_exists boolean;
  frozen_col_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preparation_batches' AND column_name = 'storage_location'
  ) INTO batch_col_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preparation_batches' AND column_name = 'parent_batch_id'
  ) INTO parent_col_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preparations' AND column_name = 'shelf_life_frozen'
  ) INTO frozen_col_exists;

  IF NOT batch_col_exists THEN
    RAISE EXCEPTION 'storage_location column not created on preparation_batches';
  END IF;
  IF NOT parent_col_exists THEN
    RAISE EXCEPTION 'parent_batch_id column not created on preparation_batches';
  END IF;
  IF NOT frozen_col_exists THEN
    RAISE EXCEPTION 'shelf_life_frozen column not created on preparations';
  END IF;

  RAISE NOTICE '✅ Migration 285 validated successfully';
END $$;
