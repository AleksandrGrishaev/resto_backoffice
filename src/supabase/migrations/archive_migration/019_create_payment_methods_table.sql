-- Migration: 019_create_payment_methods_table
-- Description: Create payment_methods table for mapping payment types to accounts
-- Date: 2025-11-29
-- Author: Claude Code
-- Sprint: Payment Method to Account Mapping

-- CONTEXT:
-- The POS system needs to map different payment methods (cash, card, QR codes, etc.)
-- to specific accounting accounts. This enables:
-- 1. Accurate financial tracking per payment method
-- 2. Flexible payment method configuration without code changes
-- 3. Support for multiple payment methods mapping to the same account
-- 4. Easy addition of new payment methods (e-wallets, etc.)

-- ==============================================================================
-- 1. CREATE TABLE: payment_methods
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY DEFAULT ('pm_' || gen_random_uuid()::text),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core fields
  name TEXT NOT NULL, -- Display name (e.g., "Cash", "Credit Card", "GoPay")
  code TEXT NOT NULL UNIQUE, -- Unique code for programmatic use ('cash', 'card', 'qr', 'gopay')
  type TEXT NOT NULL, -- AccountType: 'cash' | 'bank' | 'card' | 'gojeck' | 'grab'

  -- Account mapping (can be null if not yet configured)
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_details BOOLEAN NOT NULL DEFAULT false, -- Requires card number, etc.
  display_order INTEGER NOT NULL DEFAULT 0, -- Sort order in UI

  -- Metadata (optional)
  icon TEXT, -- Material Design icon name (e.g., 'mdi-cash')
  description TEXT -- Optional description for internal use
);

-- ==============================================================================
-- 2. CREATE INDEXES
-- ==============================================================================

-- Index for active methods (frequently queried in POS UI)
CREATE INDEX idx_payment_methods_active
  ON payment_methods(is_active)
  WHERE is_active = true;

-- Index for code lookup (used in POS payment processing)
CREATE INDEX idx_payment_methods_code
  ON payment_methods(code);

-- Index for account_id (used in reporting)
CREATE INDEX idx_payment_methods_account_id
  ON payment_methods(account_id)
  WHERE account_id IS NOT NULL;

-- ==============================================================================
-- 3. CREATE TRIGGERS
-- ==============================================================================

-- Trigger: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- ==============================================================================
-- 4. SEED DATA: Default Payment Methods
-- ==============================================================================

-- Insert default payment methods with dynamic account lookup
-- This approach works with both string IDs (dev) and UUID (production)
-- Queries accounts by name instead of hardcoded IDs
DO $$
DECLARE
  cash_account_id TEXT;
  bank_account_id TEXT;
  card_account_id TEXT;
BEGIN
  -- Find accounts by name (works in both dev and production)
  SELECT id INTO cash_account_id FROM accounts WHERE name = 'Main Cash Register' LIMIT 1;
  SELECT id INTO bank_account_id FROM accounts WHERE name = 'Bank Account - BCA' LIMIT 1;
  SELECT id INTO card_account_id FROM accounts WHERE name = 'Card Terminal' LIMIT 1;

  -- Insert payment methods with found account IDs
  INSERT INTO payment_methods (name, code, type, account_id, is_active, requires_details, display_order, icon, description) VALUES
    -- Cash payments → Main Cash Register
    ('Cash', 'cash', 'cash', cash_account_id, true, false, 1, 'mdi-cash', 'Cash payments - Main cash register'),

    -- Card payments → Card Terminal Account
    ('Credit/Debit Card', 'card', 'card', card_account_id, true, true, 2, 'mdi-credit-card', 'Card payments via terminal'),

    -- QR Code payments → Bank Account - BCA
    ('QR Code (QRIS)', 'qr', 'bank', bank_account_id, true, false, 3, 'mdi-qrcode', 'QR code payments to bank account')

  ON CONFLICT (code) DO NOTHING;

  -- Log results
  RAISE NOTICE 'Payment methods created with account mappings:';
  RAISE NOTICE '  Cash → %', cash_account_id;
  RAISE NOTICE '  Card → %', card_account_id;
  RAISE NOTICE '  QR → %', bank_account_id;
END $$;

-- ==============================================================================
-- 5. RLS POLICIES
-- ==============================================================================

-- Enable Row Level Security
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read for all authenticated users
CREATE POLICY payment_methods_read ON payment_methods
  FOR SELECT
  USING (true);

-- Policy: Allow write for admins only
-- TODO: Add proper role-based check when auth is implemented
-- For now, allow all authenticated users (will be restricted later)
CREATE POLICY payment_methods_write ON payment_methods
  FOR ALL
  USING (true);

-- ==============================================================================
-- 6. TABLE COMMENTS
-- ==============================================================================

COMMENT ON TABLE payment_methods IS 'Payment method to account mapping for POS system. Maps payment types (cash, card, QR) to accounting accounts.';
COMMENT ON COLUMN payment_methods.code IS 'Unique code used in POS system (e.g., cash, card, qr). Must be lowercase alphanumeric.';
COMMENT ON COLUMN payment_methods.type IS 'Account type for categorization. Must match AccountType enum.';
COMMENT ON COLUMN payment_methods.account_id IS 'Target account where payments will be recorded. Can be null if not yet configured.';
COMMENT ON COLUMN payment_methods.is_active IS 'Whether this payment method is available in POS UI';
COMMENT ON COLUMN payment_methods.requires_details IS 'Whether additional details are required (e.g., card number for card payments)';
COMMENT ON COLUMN payment_methods.display_order IS 'Sort order in POS UI (lower numbers appear first)';

-- ==============================================================================
-- 7. POST-MIGRATION VALIDATION
-- ==============================================================================

-- Verify table was created
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_methods') THEN
    RAISE EXCEPTION 'Migration failed: payment_methods table was not created';
  END IF;

  -- Verify indexes were created
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'payment_methods' AND indexname = 'idx_payment_methods_code') THEN
    RAISE EXCEPTION 'Migration failed: idx_payment_methods_code index was not created';
  END IF;

  -- Verify seed data was inserted
  IF (SELECT COUNT(*) FROM payment_methods) < 3 THEN
    RAISE WARNING 'Migration warning: Expected at least 3 payment methods, found %', (SELECT COUNT(*) FROM payment_methods);
  END IF;

  RAISE NOTICE 'Migration 019 completed successfully: payment_methods table created with % records', (SELECT COUNT(*) FROM payment_methods);
END $$;
