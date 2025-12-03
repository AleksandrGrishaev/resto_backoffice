-- Migration: 021_simplify_payment_type
-- Description: Simplify payment type to 'cash' or 'bank'
-- Date: 2025-11-29
-- Status: OPTIONAL (for future)

-- Update existing types to simplified version
UPDATE payment_methods SET type = 'cash' WHERE type IN ('cash');
UPDATE payment_methods SET type = 'bank' WHERE type IN ('card', 'bank', 'ewallet', 'gojeck', 'grab');

-- Add check constraint
ALTER TABLE payment_methods
ADD CONSTRAINT payment_methods_type_check
CHECK (type IN ('cash', 'bank'));

COMMENT ON COLUMN payment_methods.type IS
  'Payment mechanism: cash (physical cash) or bank (electronic: card, QR, e-wallet)';
