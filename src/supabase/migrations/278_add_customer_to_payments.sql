-- Migration: 278_add_customer_to_payments
-- Description: Add customer_id and customer_name to payments table
-- Date: 2026-03-31
-- Context: Payment becomes source of truth for customer-order linkage (loyalty refactoring)

ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id) WHERE customer_id IS NOT NULL;

COMMENT ON COLUMN payments.customer_id IS 'Denormalized from bill.customerId at payment time';
COMMENT ON COLUMN payments.customer_name IS 'Snapshot of customer name at payment time';
