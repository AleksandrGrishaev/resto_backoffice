-- Migration: 296_add_used_frozen_to_preparations
-- Description: Add used_frozen flag to preparations — items that are used directly from freezer
-- (e.g. soup bases) and should NOT generate defrost tasks
-- Date: 2026-04-11

ALTER TABLE preparations ADD COLUMN IF NOT EXISTS used_frozen BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN preparations.used_frozen IS 'When true, this preparation is used directly from freezer (e.g. soup base) and does not need defrosting';
