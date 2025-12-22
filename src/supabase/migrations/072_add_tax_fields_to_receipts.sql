-- Migration: 072_add_tax_fields_to_receipts
-- Description: Add tax_amount and tax_percentage fields to supplierstore_receipts table
-- Date: 2025-01-22
-- Author: Claude Code

-- CONTEXT:
-- Adding support for tax tracking in supplier receipts.
-- Tax is INCLUDED in item prices and distributed proportionally across items.
-- Both absolute amount (IDR) and percentage (for reference) are stored.

-- PRE-MIGRATION VALIDATION
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'supplierstore_receipts'
  ) THEN
    RAISE EXCEPTION 'Table supplierstore_receipts does not exist';
  END IF;

  -- Check if columns already exist
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'supplierstore_receipts'
    AND column_name IN ('tax_amount', 'tax_percentage')
  ) THEN
    RAISE NOTICE 'Tax columns already exist, skipping migration';
  END IF;
END $$;

-- ACTUAL CHANGES
-- Add tax_amount column (absolute amount in IDR)
ALTER TABLE supplierstore_receipts
ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2);

-- Add tax_percentage column (percentage for reference)
ALTER TABLE supplierstore_receipts
ADD COLUMN IF NOT EXISTS tax_percentage numeric(5,2);

-- Add column comments for documentation
COMMENT ON COLUMN supplierstore_receipts.tax_amount IS 'Total tax amount in IDR (included in item prices)';
COMMENT ON COLUMN supplierstore_receipts.tax_percentage IS 'Tax percentage for reference (e.g., 10.00 for 10%)';

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  v_tax_amount_exists boolean;
  v_tax_percentage_exists boolean;
BEGIN
  -- Verify tax_amount column was created
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'supplierstore_receipts'
    AND column_name = 'tax_amount'
  ) INTO v_tax_amount_exists;

  -- Verify tax_percentage column was created
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'supplierstore_receipts'
    AND column_name = 'tax_percentage'
  ) INTO v_tax_percentage_exists;

  -- Verify both columns exist
  IF NOT v_tax_amount_exists OR NOT v_tax_percentage_exists THEN
    RAISE EXCEPTION 'Migration failed: Tax columns were not created successfully';
  END IF;

  RAISE NOTICE 'Migration completed successfully: tax_amount and tax_percentage columns added';
END $$;
