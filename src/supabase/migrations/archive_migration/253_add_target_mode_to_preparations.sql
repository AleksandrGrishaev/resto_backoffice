-- Migration: 253_add_target_mode_to_preparations
-- Description: Add target_mode column for ritual preparation scheduling
-- Date: 2026-03-26

ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS target_mode TEXT NOT NULL DEFAULT 'auto'
  CHECK (target_mode IN ('auto', 'fixed'));

COMMENT ON COLUMN preparations.target_mode IS 'How daily target is calculated: auto (from avg sales) or fixed (manual quantity)';
