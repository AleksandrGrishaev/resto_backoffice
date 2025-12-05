-- Migration: 041_add_portion_type
-- Description: Add portion type support to preparations
-- Date: 2025-12-05

-- =============================================
-- PREPARATIONS TABLE
-- =============================================

-- Add portion_type column to preparations table
ALTER TABLE preparations
ADD COLUMN IF NOT EXISTS portion_type TEXT DEFAULT 'weight'
CHECK (portion_type IN ('weight', 'portion'));

-- Add portion_size column (grams per portion, only used when portion_type = 'portion')
ALTER TABLE preparations
ADD COLUMN IF NOT EXISTS portion_size NUMERIC DEFAULT NULL;

-- =============================================
-- PREPARATION_BATCHES TABLE
-- =============================================

-- Add portion_type to preparation_batches for tracking
ALTER TABLE preparation_batches
ADD COLUMN IF NOT EXISTS portion_type TEXT DEFAULT 'weight'
CHECK (portion_type IN ('weight', 'portion'));

-- Add portion_size to batches
ALTER TABLE preparation_batches
ADD COLUMN IF NOT EXISTS portion_size NUMERIC DEFAULT NULL;

-- Add portion_quantity to batches (number of portions, when applicable)
ALTER TABLE preparation_batches
ADD COLUMN IF NOT EXISTS portion_quantity NUMERIC DEFAULT NULL;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN preparations.portion_type IS
'How quantities are measured: weight (grams) or portion (fixed-size pieces). Default: weight';

COMMENT ON COLUMN preparations.portion_size IS
'Size of one portion in grams. Only used when portion_type = portion. NULL for weight-based preparations.';

COMMENT ON COLUMN preparation_batches.portion_type IS
'Portion type inherited from preparation at production time: weight or portion';

COMMENT ON COLUMN preparation_batches.portion_size IS
'Size of one portion in grams (copied from preparation at production time)';

COMMENT ON COLUMN preparation_batches.portion_quantity IS
'Number of portions in this batch. Only used when portion_type = portion. Calculated as: initial_quantity / portion_size';

-- =============================================
-- VALIDATION
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 041: Portion type support added to preparations and preparation_batches';
  RAISE NOTICE 'New columns: portion_type, portion_size (preparations), portion_quantity (batches)';
END $$;
