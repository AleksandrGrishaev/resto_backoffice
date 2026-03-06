-- Migration: 116_ready_triggered_writeoff
-- Description: Add write-off tracking columns for Ready-Triggered Write-off architecture
-- Date: 2026-01-30
-- Author: Claude
-- Context: Transition from Payment-triggered to Ready-triggered write-off for faster payments

-- ==============================================================================
-- PHASE 1: Add write-off tracking columns to order_items
-- ==============================================================================

-- 1. Add write_off_status column with default 'pending'
-- Values: 'pending' (initial), 'processing', 'completed', 'skipped'
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS write_off_status TEXT DEFAULT 'pending';

-- 2. Add timestamp for when write-off was triggered
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS write_off_at TIMESTAMPTZ;

-- 3. Add who/what triggered the write-off
-- Values: 'kitchen_ready', 'payment_fallback', 'cancellation'
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS write_off_triggered_by TEXT;

-- 4. Add cached actual cost (JSONB) - stores ActualCostBreakdown for fast payment
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS cached_actual_cost JSONB;

-- 5. Add link to recipe_writeoff record
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS recipe_writeoff_id UUID;

-- ==============================================================================
-- PHASE 2: Add offline tracking to orders
-- ==============================================================================

-- Mark orders created while offline (for Kitchen SYNC column)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS offline_created BOOLEAN DEFAULT false;

-- ==============================================================================
-- PHASE 3: Add indexes for write-off status queries
-- ==============================================================================

-- Index for efficient kitchen queries: "show me items needing write-off"
CREATE INDEX IF NOT EXISTS idx_order_items_write_off_status
ON order_items (order_id, write_off_status);

-- Index for finding items by recipe_writeoff_id (for linking transactions)
CREATE INDEX IF NOT EXISTS idx_order_items_recipe_writeoff
ON order_items (recipe_writeoff_id)
WHERE recipe_writeoff_id IS NOT NULL;

-- ==============================================================================
-- PHASE 4: Backfill existing paid orders
-- ==============================================================================

-- Mark all items from paid orders as 'completed' with 'payment_fallback' trigger
-- These were processed under the old payment-triggered system
UPDATE order_items oi
SET
  write_off_status = 'completed',
  write_off_triggered_by = 'payment_fallback',
  write_off_at = oi.updated_at
FROM orders o
WHERE oi.order_id = o.id
  AND o.payment_status = 'paid'
  AND oi.write_off_status = 'pending';

-- Mark cancelled items as 'skipped' (they don't need write-off processing)
UPDATE order_items
SET write_off_status = 'skipped'
WHERE status = 'cancelled'
  AND write_off_status = 'pending';

-- ==============================================================================
-- PHASE 5: Add helper comments
-- ==============================================================================

COMMENT ON COLUMN order_items.write_off_status IS
  'Write-off processing status: pending, processing, completed, skipped';

COMMENT ON COLUMN order_items.write_off_triggered_by IS
  'What triggered the write-off: kitchen_ready, payment_fallback, cancellation';

COMMENT ON COLUMN order_items.cached_actual_cost IS
  'Cached ActualCostBreakdown JSONB for fast payment (set at kitchen ready)';

COMMENT ON COLUMN order_items.recipe_writeoff_id IS
  'Link to recipe_write_offs record for audit trail';

COMMENT ON COLUMN orders.offline_created IS
  'True if order was created while Kitchen display was offline';
