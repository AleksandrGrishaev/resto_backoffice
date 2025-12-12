-- Migration: 061_add_item_cancellation_fields
-- Description: Add fields for tracking cancelled order items with reasons and write-off links
-- Date: 2025-12-12

-- Add cancellation tracking fields to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
ADD COLUMN IF NOT EXISTS cancelled_by text,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancellation_notes text,
ADD COLUMN IF NOT EXISTS write_off_operation_id uuid;

-- Add index for querying cancelled items
CREATE INDEX IF NOT EXISTS idx_order_items_cancelled_at
ON order_items(cancelled_at)
WHERE cancelled_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN order_items.cancelled_at IS 'Timestamp when item was cancelled';
COMMENT ON COLUMN order_items.cancelled_by IS 'User who cancelled the item';
COMMENT ON COLUMN order_items.cancellation_reason IS 'Reason for cancellation (kitchen_mistake, customer_refused, wrong_order, out_of_stock, other)';
COMMENT ON COLUMN order_items.cancellation_notes IS 'Additional notes for cancellation';
COMMENT ON COLUMN order_items.write_off_operation_id IS 'Link to storage write-off operation if ingredients were written off';
