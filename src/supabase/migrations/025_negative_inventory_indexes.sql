-- Migration: 025_negative_inventory_indexes
-- Description: Add performance indexes for negative inventory queries
-- Date: 2025-11-30
-- Author: Claude Code

-- ========================================
-- STORAGE_BATCHES INDEXES
-- ========================================

-- Index for fast negative batch lookups
CREATE INDEX IF NOT EXISTS idx_storage_batches_is_negative
  ON storage_batches(is_negative)
  WHERE is_negative = TRUE;

-- Index for source batch lookups
CREATE INDEX IF NOT EXISTS idx_storage_batches_source_batch_id
  ON storage_batches(source_batch_id)
  WHERE source_batch_id IS NOT NULL;

-- Index for reconciliation status
CREATE INDEX IF NOT EXISTS idx_storage_batches_reconciled_at
  ON storage_batches(reconciled_at)
  WHERE is_negative = TRUE;

-- Index for source operation type filtering
CREATE INDEX IF NOT EXISTS idx_storage_batches_source_operation_type
  ON storage_batches(source_operation_type)
  WHERE source_operation_type IS NOT NULL;

-- Composite index for product batch queries (FIFO + last known cost)
CREATE INDEX IF NOT EXISTS idx_storage_batches_item_fifo
  ON storage_batches(item_id, created_at DESC)
  WHERE item_id IS NOT NULL AND (is_negative = FALSE OR is_negative IS NULL);

-- ========================================
-- PREPARATION_BATCHES INDEXES
-- ========================================

-- Index for fast negative batch lookups
CREATE INDEX IF NOT EXISTS idx_preparation_batches_is_negative
  ON preparation_batches(is_negative)
  WHERE is_negative = TRUE;

-- Index for source batch lookups
CREATE INDEX IF NOT EXISTS idx_preparation_batches_source_batch_id
  ON preparation_batches(source_batch_id)
  WHERE source_batch_id IS NOT NULL;

-- Index for reconciliation status
CREATE INDEX IF NOT EXISTS idx_preparation_batches_reconciled_at
  ON preparation_batches(reconciled_at)
  WHERE is_negative = TRUE;

-- Index for source operation type filtering
CREATE INDEX IF NOT EXISTS idx_preparation_batches_source_operation_type
  ON preparation_batches(source_operation_type)
  WHERE source_operation_type IS NOT NULL;

-- Composite index for preparation batch queries (FIFO + last known cost)
CREATE INDEX IF NOT EXISTS idx_preparation_batches_prep_fifo
  ON preparation_batches(preparation_id, created_at DESC)
  WHERE preparation_id IS NOT NULL AND (is_negative = FALSE OR is_negative IS NULL);

-- ========================================
-- PRODUCTS & PREPARATIONS INDEXES
-- ========================================

-- Index for products allowing negative inventory
CREATE INDEX IF NOT EXISTS idx_products_allow_negative
  ON products(allow_negative_inventory)
  WHERE allow_negative_inventory = TRUE;

-- Index for preparations allowing negative inventory
CREATE INDEX IF NOT EXISTS idx_preparations_allow_negative
  ON preparations(allow_negative_inventory)
  WHERE allow_negative_inventory = TRUE;

-- ========================================
-- VERIFICATION QUERY (for manual check after migration)
-- ========================================

-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE tablename IN ('storage_batches', 'preparation_batches', 'products', 'preparations')
--   AND indexname LIKE 'idx_%negative%'
-- ORDER BY tablename, indexname;
