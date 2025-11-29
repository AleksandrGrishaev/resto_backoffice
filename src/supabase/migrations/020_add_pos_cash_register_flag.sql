-- Migration: 020_add_pos_cash_register_flag
-- Description: Add flag to identify main POS cash register
-- Date: 2025-11-29

-- Add new column
ALTER TABLE payment_methods
ADD COLUMN is_pos_cash_register BOOLEAN NOT NULL DEFAULT false;

-- Create unique partial index (only one can be true)
CREATE UNIQUE INDEX idx_payment_methods_pos_cash_register
  ON payment_methods(is_pos_cash_register)
  WHERE is_pos_cash_register = true;

-- Set Cash as default POS cash register
UPDATE payment_methods
SET is_pos_cash_register = true
WHERE code = 'cash';

-- Add constraint check function
CREATE OR REPLACE FUNCTION check_single_pos_cash_register()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_pos_cash_register = true THEN
    -- Unset all other records
    UPDATE payment_methods
    SET is_pos_cash_register = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER ensure_single_pos_cash_register
  BEFORE UPDATE OF is_pos_cash_register ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION check_single_pos_cash_register();

COMMENT ON COLUMN payment_methods.is_pos_cash_register IS
  'Identifies the main cash register for POS shift management. Only one can be true.';
