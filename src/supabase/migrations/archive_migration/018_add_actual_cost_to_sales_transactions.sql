-- Migration: 018_add_actual_cost_to_sales_transactions
-- Description: Add actual_cost and write-off tracking fields to sales_transactions table
-- Date: 2025-01-27
-- Sprint: 2 - FIFO Allocation for Actual Cost

-- CONTEXT: Adding FIFO-based actual cost tracking to existing sales_transactions table

-- ================================================================
-- ADD NEW COLUMNS
-- ================================================================

-- Add actual_cost JSONB column for FIFO cost breakdown
ALTER TABLE sales_transactions
ADD COLUMN IF NOT EXISTS actual_cost JSONB;

-- Add preparation write-off IDs array
ALTER TABLE sales_transactions
ADD COLUMN IF NOT EXISTS preparation_write_off_ids UUID[];

-- Add product write-off IDs array (for direct product sales)
ALTER TABLE sales_transactions
ADD COLUMN IF NOT EXISTS product_write_off_ids UUID[];

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON COLUMN sales_transactions.actual_cost IS
  'JSONB: Actual cost breakdown from FIFO batch allocation (Sprint 2)';

COMMENT ON COLUMN sales_transactions.preparation_write_off_ids IS
  'Array of UUIDs: Links to preparation write-off operations';

COMMENT ON COLUMN sales_transactions.product_write_off_ids IS
  'Array of UUIDs: Links to product write-off operations (for direct product sales)';

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Check that columns were added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_transactions' AND column_name = 'actual_cost'
  ) THEN
    RAISE EXCEPTION 'Column actual_cost was not added to sales_transactions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_transactions' AND column_name = 'preparation_write_off_ids'
  ) THEN
    RAISE EXCEPTION 'Column preparation_write_off_ids was not added to sales_transactions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_transactions' AND column_name = 'product_write_off_ids'
  ) THEN
    RAISE EXCEPTION 'Column product_write_off_ids was not added to sales_transactions';
  END IF;

  RAISE NOTICE 'All columns successfully added to sales_transactions';
END $$;
