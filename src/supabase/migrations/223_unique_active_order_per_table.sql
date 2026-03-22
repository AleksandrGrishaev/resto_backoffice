-- Migration: 223_unique_active_order_per_table
-- Description: Prevent duplicate active orders for the same table (cross-device race condition)
-- Date: 2026-03-16

-- CONTEXT: Two tablets can simultaneously create orders for the same table,
-- resulting in duplicate orders. This partial unique index ensures only one
-- active (non-terminal) order can exist per table at any time.

-- ACTUAL CHANGE
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_order_per_table
ON orders (table_id)
WHERE table_id IS NOT NULL
  AND status NOT IN ('cancelled', 'served', 'collected', 'delivered');

-- POST-MIGRATION VALIDATION
-- Test: inserting a second active order for the same table should fail with 23505
-- SELECT indexname FROM pg_indexes WHERE indexname = 'idx_unique_active_order_per_table';
