-- Migration: 248_add_is_premade_to_preparations
-- Description: Add is_premade flag to preparations table for semi-cooked items
-- Date: 2026-03-25

-- CONTEXT: Pre-made items are preparations that need to be prepared ahead of time
-- (falafel, poached eggs, hashbrowns, boiled eggs, etc.)
-- They have shorter shelf life and are typically prepared in morning shifts.

ALTER TABLE preparations ADD COLUMN IF NOT EXISTS is_premade BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN preparations.is_premade IS 'Pre-made flag: semi-cooked items prepared ahead (falafel, poached eggs, etc.)';
