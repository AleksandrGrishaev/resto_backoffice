-- Sprint 7: Orders & Payments Schema Update
-- This migration adds critical fields for Orders and Payments tables
-- Required before implementing Payments and Orders store migrations

-- ==================================================
-- ORDERS TABLE UPDATES
-- ==================================================

-- Fix status constraint (incompatible with TypeScript OrderStatus type)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('draft', 'waiting', 'cooking', 'ready', 'served', 'collected', 'delivered', 'cancelled'));

-- Add missing payment tracking fields
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0;

-- Add waiter and timing fields
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS waiter_name TEXT,
  ADD COLUMN IF NOT EXISTS estimated_ready_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_ready_time TIMESTAMPTZ;

-- Add explicit amount fields (for clarity and calculations)
-- Note: These duplicate some existing fields but with clearer naming
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10, 2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN orders.payment_ids IS 'Array of payment IDs linked to this order (supports multiple payments)';
COMMENT ON COLUMN orders.paid_amount IS 'Total amount paid so far (for partial payments)';
COMMENT ON COLUMN orders.waiter_name IS 'Name of waiter who created the order';
COMMENT ON COLUMN orders.estimated_ready_time IS 'Estimated time when order will be ready';
COMMENT ON COLUMN orders.actual_ready_time IS 'Actual time when order was marked ready';
COMMENT ON COLUMN orders.total_amount IS 'Total amount before discounts and tax';
COMMENT ON COLUMN orders.discount_amount IS 'Total discount applied';
COMMENT ON COLUMN orders.tax_amount IS 'Tax amount';
COMMENT ON COLUMN orders.final_amount IS 'Final amount after discounts and tax';
COMMENT ON COLUMN orders.items IS 'Order items stored as JSONB array (bills are flattened with bill metadata)';

-- ==================================================
-- PAYMENTS TABLE UPDATES
-- ==================================================

-- Add core payment tracking fields
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bill_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS item_ids TEXT[] DEFAULT '{}';

-- Add cash handling fields
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10, 2);

-- Add refund support fields
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_by TEXT,
  ADD COLUMN IF NOT EXISTS original_payment_id UUID REFERENCES payments(id);

-- Add reconciliation fields
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by TEXT;

-- Add receipt and sync tracking
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_printed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_by_name TEXT;

-- Add check constraint for sync_status
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_sync_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_sync_status_check
  CHECK (sync_status IN ('pending', 'synced', 'failed', 'offline'));

-- Add comments for documentation
COMMENT ON COLUMN payments.payment_number IS 'Unique payment identifier (e.g., PAY-20251115-123456)';
COMMENT ON COLUMN payments.bill_ids IS 'Array of bill IDs this payment covers (for split/partial payments)';
COMMENT ON COLUMN payments.item_ids IS 'Array of item IDs this payment covers (for item-level payments)';
COMMENT ON COLUMN payments.received_amount IS 'Amount received from customer (cash payments)';
COMMENT ON COLUMN payments.change_amount IS 'Change given to customer (cash payments)';
COMMENT ON COLUMN payments.refunded_at IS 'Timestamp when payment was refunded';
COMMENT ON COLUMN payments.refund_reason IS 'Reason for refund';
COMMENT ON COLUMN payments.refunded_by IS 'Name of person who processed refund';
COMMENT ON COLUMN payments.original_payment_id IS 'Reference to original payment (for refund records)';
COMMENT ON COLUMN payments.reconciled_at IS 'Timestamp when payment was reconciled';
COMMENT ON COLUMN payments.reconciled_by IS 'Name of person who reconciled payment';
COMMENT ON COLUMN payments.receipt_printed IS 'Whether receipt was printed';
COMMENT ON COLUMN payments.sync_status IS 'Synchronization status (pending, synced, failed, offline)';
COMMENT ON COLUMN payments.synced_at IS 'Timestamp when payment was synced to server';
COMMENT ON COLUMN payments.processed_by_name IS 'Name of cashier who processed payment';

-- ==================================================
-- INDEXES FOR PERFORMANCE
-- ==================================================

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_payment_ids ON orders USING GIN (payment_ids);
CREATE INDEX IF NOT EXISTS idx_orders_waiter_name ON orders(waiter_name);
CREATE INDEX IF NOT EXISTS idx_orders_estimated_ready_time ON orders(estimated_ready_time);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_bill_ids ON payments USING GIN (bill_ids);
CREATE INDEX IF NOT EXISTS idx_payments_item_ids ON payments USING GIN (item_ids);
CREATE INDEX IF NOT EXISTS idx_payments_original_payment_id ON payments(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON payments(sync_status);
CREATE INDEX IF NOT EXISTS idx_payments_processed_by_name ON payments(processed_by_name);

-- ==================================================
-- MIGRATION VERIFICATION
-- ==================================================

-- Verify orders columns
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_ids'), 'orders.payment_ids not created';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'waiter_name'), 'orders.waiter_name not created';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_amount'), 'orders.total_amount not created';
  RAISE NOTICE '✅ Orders table migration complete';
END $$;

-- Verify payments columns
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_number'), 'payments.payment_number not created';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'bill_ids'), 'payments.bill_ids not created';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'refunded_at'), 'payments.refunded_at not created';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'sync_status'), 'payments.sync_status not created';
  RAISE NOTICE '✅ Payments table migration complete';
  RAISE NOTICE '✅ Migration 003 completed successfully';
END $$;
