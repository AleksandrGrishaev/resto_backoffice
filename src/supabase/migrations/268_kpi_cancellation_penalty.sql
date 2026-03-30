-- Migration: 268_kpi_cancellation_penalty
-- Description: Add cancellation penalty system to KPI bonus pools
-- Cancelled items with reason 'kitchen_mistake' deduct from department KPI pool
-- Date: 2026-03-30

-- 1. Add cancellation_penalty_rate to kpi_bonus_schemes (default 100% = full price deducted)
ALTER TABLE kpi_bonus_schemes
  ADD COLUMN IF NOT EXISTS cancellation_penalty_rate NUMERIC DEFAULT 100;

COMMENT ON COLUMN kpi_bonus_schemes.cancellation_penalty_rate IS
  'Percentage of cancelled item price (kitchen_mistake) to deduct from KPI pool. 100 = full price, 0 = disabled.';

-- 2. Add penalty tracking columns to kpi_bonus_snapshots
ALTER TABLE kpi_bonus_snapshots
  ADD COLUMN IF NOT EXISTS cancellation_penalty NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_total_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC DEFAULT 0;

COMMENT ON COLUMN kpi_bonus_snapshots.cancellation_penalty IS 'Amount deducted from unlocked_amount due to kitchen_mistake cancellations';
COMMENT ON COLUMN kpi_bonus_snapshots.cancellation_count IS 'Number of kitchen_mistake cancelled items in the period';
COMMENT ON COLUMN kpi_bonus_snapshots.cancellation_total_price IS 'Total selling price of cancelled items before penalty rate';
COMMENT ON COLUMN kpi_bonus_snapshots.final_amount IS 'unlocked_amount - cancellation_penalty (actual amount distributed to staff)';

-- Backfill final_amount = unlocked_amount for existing snapshots
UPDATE kpi_bonus_snapshots SET final_amount = unlocked_amount WHERE final_amount = 0 AND unlocked_amount > 0;
