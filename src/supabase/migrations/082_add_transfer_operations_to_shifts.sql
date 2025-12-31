-- Migration: 082_add_transfer_operations_to_shifts
-- Description: Add transfer_operations JSONB column to shifts table for tracking incoming transfers
-- Date: 2024-12-31
-- Sprint: 10 - Transfer confirmation feature

-- CONTEXT:
-- POS shifts need to track incoming transfers from backoffice accounts
-- Transfers require manual confirmation by cashier before being added to cash balance
-- This column stores the confirmation status, timestamps, and related transaction IDs

-- Add transfer_operations column to shifts table
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS transfer_operations JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the column structure
COMMENT ON COLUMN shifts.transfer_operations IS 'Array of transfer operations with structure:
{
  id: string,                    -- Unique operation ID
  shiftId: string,               -- Reference to shift
  type: "incoming_transfer",     -- Operation type
  transactionId: string,         -- Reference to account transaction
  fromAccountId: string,         -- Source account ID
  fromAccountName: string,       -- Source account name
  toAccountId: string,           -- Target account (POS cash register)
  amount: number,                -- Transfer amount
  description: string,           -- Transfer description
  status: "pending" | "confirmed" | "rejected",
  confirmedBy: { type, id, name }, -- Who confirmed/rejected
  confirmedAt: string,           -- Confirmation timestamp
  rejectionReason: string,       -- Reason if rejected
  reverseTransactionId: string,  -- Reverse transaction ID if rejected
  syncStatus: "pending" | "synced" | "error",
  notes: string,                 -- Additional notes
  createdAt: string,
  updatedAt: string
}';

-- POST-MIGRATION VALIDATION
-- Verify the column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shifts'
    AND column_name = 'transfer_operations'
  ) THEN
    RAISE EXCEPTION 'Migration failed: transfer_operations column not found in shifts table';
  END IF;

  RAISE NOTICE 'Migration 082 completed successfully: transfer_operations column added to shifts table';
END $$;
