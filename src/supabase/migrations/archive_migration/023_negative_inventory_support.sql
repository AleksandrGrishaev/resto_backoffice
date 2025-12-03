-- Migration: 023_negative_inventory_support
-- Description: Add negative inventory tracking to batches, products, and preparations
-- Date: 2025-11-30
-- Author: Claude Code

-- ========================================
-- STORAGE_BATCHES TABLE: Add negative batch fields
-- ========================================

ALTER TABLE storage_batches ADD COLUMN IF NOT EXISTS is_negative BOOLEAN DEFAULT FALSE;
ALTER TABLE storage_batches ADD COLUMN IF NOT EXISTS source_batch_id TEXT REFERENCES storage_batches(id);
ALTER TABLE storage_batches ADD COLUMN IF NOT EXISTS negative_created_at TIMESTAMPTZ;
ALTER TABLE storage_batches ADD COLUMN IF NOT EXISTS negative_reason TEXT;
ALTER TABLE storage_batches ADD COLUMN IF NOT EXISTS source_operation_type TEXT;
ALTER TABLE storage_batches ADD COLUMN IF NOT EXISTS affected_recipe_ids TEXT[];
ALTER TABLE storage_batches ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

-- Add check constraint for source_operation_type
ALTER TABLE storage_batches ADD CONSTRAINT storage_batches_source_operation_type_check
  CHECK (source_operation_type IN ('pos_order', 'preparation_production', 'manual_writeoff', NULL));

COMMENT ON COLUMN storage_batches.is_negative IS 'True if this batch represents negative inventory (shortage)';
COMMENT ON COLUMN storage_batches.source_batch_id IS 'Reference to the batch that was used to calculate negative cost';
COMMENT ON COLUMN storage_batches.negative_created_at IS 'Timestamp when negative batch was created';
COMMENT ON COLUMN storage_batches.negative_reason IS 'Reason for negative inventory (e.g., POS order, production)';
COMMENT ON COLUMN storage_batches.source_operation_type IS 'Type of operation that caused negative inventory';
COMMENT ON COLUMN storage_batches.affected_recipe_ids IS 'Array of recipe IDs affected by this negative batch';
COMMENT ON COLUMN storage_batches.reconciled_at IS 'Timestamp when negative batch was reconciled with new stock';

-- ========================================
-- PREPARATION_BATCHES TABLE: Add negative batch fields
-- ========================================

ALTER TABLE preparation_batches ADD COLUMN IF NOT EXISTS is_negative BOOLEAN DEFAULT FALSE;
ALTER TABLE preparation_batches ADD COLUMN IF NOT EXISTS source_batch_id UUID REFERENCES preparation_batches(id);
ALTER TABLE preparation_batches ADD COLUMN IF NOT EXISTS negative_created_at TIMESTAMPTZ;
ALTER TABLE preparation_batches ADD COLUMN IF NOT EXISTS negative_reason TEXT;
ALTER TABLE preparation_batches ADD COLUMN IF NOT EXISTS source_operation_type TEXT;
ALTER TABLE preparation_batches ADD COLUMN IF NOT EXISTS affected_recipe_ids UUID[];
ALTER TABLE preparation_batches ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

-- Add check constraint for source_operation_type
ALTER TABLE preparation_batches ADD CONSTRAINT preparation_batches_source_operation_type_check
  CHECK (source_operation_type IN ('pos_order', 'preparation_production', 'manual_writeoff', NULL));

COMMENT ON COLUMN preparation_batches.is_negative IS 'True if this batch represents negative inventory (shortage)';
COMMENT ON COLUMN preparation_batches.source_batch_id IS 'Reference to the batch that was used to calculate negative cost';
COMMENT ON COLUMN preparation_batches.negative_created_at IS 'Timestamp when negative batch was created';
COMMENT ON COLUMN preparation_batches.negative_reason IS 'Reason for negative inventory (e.g., POS order, production)';
COMMENT ON COLUMN preparation_batches.source_operation_type IS 'Type of operation that caused negative inventory';
COMMENT ON COLUMN preparation_batches.affected_recipe_ids IS 'Array of recipe IDs affected by this negative batch';
COMMENT ON COLUMN preparation_batches.reconciled_at IS 'Timestamp when negative batch was reconciled with new stock';

-- ========================================
-- PRODUCTS TABLE: Add negative inventory config
-- ========================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_negative_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_known_cost NUMERIC(10,2);

COMMENT ON COLUMN products.allow_negative_inventory IS 'Whether this product can have negative inventory';
COMMENT ON COLUMN products.last_known_cost IS 'Cached cost from most recent batch (for performance)';

-- ========================================
-- PREPARATIONS TABLE: Add negative inventory config
-- ========================================

ALTER TABLE preparations ADD COLUMN IF NOT EXISTS allow_negative_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE preparations ADD COLUMN IF NOT EXISTS last_known_cost NUMERIC(10,2);

COMMENT ON COLUMN preparations.allow_negative_inventory IS 'Whether this preparation can have negative inventory';
COMMENT ON COLUMN preparations.last_known_cost IS 'Cached cost from most recent batch (for performance)';
