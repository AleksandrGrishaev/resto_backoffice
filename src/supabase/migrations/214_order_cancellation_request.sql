-- Migration: 214_order_cancellation_request
-- Description: Add cancellation request fields to orders table for website cancellation flow
-- Date: 2026-03-15
--
-- CONTEXT: When a website customer cancels an order that is already cooking/ready,
-- the cancellation becomes a REQUEST that POS cashier must review.
-- For orders in 'waiting' status, cancellation remains instant.

-- Add cancellation request columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_resolved_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_resolved_by UUID;

-- Index for finding pending cancellation requests
CREATE INDEX IF NOT EXISTS idx_orders_cancellation_requested
  ON orders (cancellation_requested_at)
  WHERE cancellation_requested_at IS NOT NULL AND cancellation_resolved_at IS NULL;

-- POST-MIGRATION VALIDATION
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancellation_requested_at') THEN
    RAISE EXCEPTION 'Column cancellation_requested_at not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancellation_reason') THEN
    RAISE EXCEPTION 'Column cancellation_reason not created';
  END IF;
  RAISE NOTICE 'Migration 214: Order cancellation request columns added successfully';
END $$;
