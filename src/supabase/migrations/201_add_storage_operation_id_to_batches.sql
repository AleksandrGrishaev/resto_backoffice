-- Migration: 201_add_storage_operation_id_to_batches
-- Description: Add storage_operation_id FK to storage_batches for traceability
-- Date: 2026-03-10

-- CONTEXT: Correction batches created during inventory finalization need a reliable
-- link back to their storage_operation. Previously we relied on fragile notes pattern
-- matching. This column enables direct lookups for receipt arrival conflict detection.

ALTER TABLE storage_batches
  ADD COLUMN IF NOT EXISTS storage_operation_id TEXT REFERENCES storage_operations(id);

CREATE INDEX IF NOT EXISTS idx_storage_batches_operation_id
  ON storage_batches(storage_operation_id)
  WHERE storage_operation_id IS NOT NULL;

COMMENT ON COLUMN storage_batches.storage_operation_id IS 'FK to the storage_operation that created this batch (corrections, receipts)';
