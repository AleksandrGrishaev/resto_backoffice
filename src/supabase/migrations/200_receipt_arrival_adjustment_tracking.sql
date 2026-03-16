-- Migration: 200_receipt_arrival_adjustment_tracking
-- Description: Add columns to supplierstore_receipts to track arrival time conflict adjustments
-- Date: 2026-03-10

-- CONTEXT: When products arrive before the office enters them, inventory counts may
-- record the surplus as correction batches. When the receipt is later entered with
-- the actual arrival time, the system detects and adjusts these surplus batches.
-- These columns track whether an adjustment was applied.

ALTER TABLE supplierstore_receipts
  ADD COLUMN IF NOT EXISTS arrival_adjustment_applied BOOLEAN DEFAULT false;

ALTER TABLE supplierstore_receipts
  ADD COLUMN IF NOT EXISTS arrival_adjustment_details JSONB;

-- Add comment for documentation
COMMENT ON COLUMN supplierstore_receipts.arrival_adjustment_applied IS 'Whether inventory surplus corrections were adjusted due to late receipt entry';
COMMENT ON COLUMN supplierstore_receipts.arrival_adjustment_details IS 'JSONB details of which inventory documents and items were adjusted';
