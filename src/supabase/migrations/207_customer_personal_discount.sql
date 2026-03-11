-- Migration: 207_customer_personal_discount
-- Description: Add personal discount fields to customers table
-- Date: 2026-03-11
-- Author: Claude

-- CONTEXT: Founders get 50% discount, some VIP clients get custom discounts.
-- Personal discount auto-applies at checkout and replaces all other discounts.
-- Option to disable loyalty accrual (stamps/cashback) for discounted customers.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS personal_discount NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (personal_discount >= 0 AND personal_discount <= 100),
  ADD COLUMN IF NOT EXISTS disable_loyalty_accrual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_note TEXT;

-- POST-MIGRATION VALIDATION
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'personal_discount') = 1,
    'personal_discount column not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'disable_loyalty_accrual') = 1,
    'disable_loyalty_accrual column not created';
  RAISE NOTICE 'Migration 207: Customer personal discount columns added successfully';
END $$;
