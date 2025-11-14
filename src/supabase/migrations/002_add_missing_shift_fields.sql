-- Sprint 7: Add missing shift fields
-- This migration adds critical fields that were missing from the initial schema

-- Add cash management fields
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS starting_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starting_cash_verified BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ending_cash DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS expected_cash DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS cash_discrepancy DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS cash_discrepancy_type TEXT CHECK (cash_discrepancy_type IN ('shortage', 'overage', 'none'));

-- Add additional shift data
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS total_transactions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration INTEGER, -- Duration in minutes
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Add JSONB fields for complex data
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS account_balances JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pending_payments JSONB NOT NULL DEFAULT '[]';

-- Add sync tracking fields
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed', 'offline')),
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_sync BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_queued_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN shifts.starting_cash IS 'Cash amount at shift start';
COMMENT ON COLUMN shifts.ending_cash IS 'Cash amount at shift end (filled when closing)';
COMMENT ON COLUMN shifts.expected_cash IS 'Expected cash amount (starting + sales - expenses)';
COMMENT ON COLUMN shifts.cash_discrepancy IS 'Difference between expected and actual cash';
COMMENT ON COLUMN shifts.account_balances IS 'Account balances tracked during shift (JSONB array)';
COMMENT ON COLUMN shifts.expense_operations IS 'All expense operations during shift (JSONB array)';
COMMENT ON COLUMN shifts.sync_status IS 'Current sync status for UI display';
COMMENT ON COLUMN shifts.pending_sync IS 'Whether shift has pending changes to sync';
