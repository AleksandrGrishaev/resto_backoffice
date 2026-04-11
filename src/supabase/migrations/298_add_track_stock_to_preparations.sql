-- Migration: 297_add_track_stock_to_preparations
-- Description: Add track_stock flag to preparations. When false, the preparation
-- is made "from knife" — no stock tracking, decomposition engine decomposes
-- to raw ingredients instead of consuming from preparation batches.
-- Date: 2026-04-11

ALTER TABLE preparations ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN preparations.track_stock IS 'When false, preparation is made fresh (from knife) — no stock tracking, decomposed to raw ingredients at sale time';
