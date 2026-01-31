-- Migration: 119_fix_preparation_cost_issues
-- Description: Fix preparation cost calculation issues
-- Date: 2026-01-31
-- Author: Claude Code
--
-- CONTEXT:
-- 20+ preparation batches had cost_per_unit = 0 due to:
-- 1. getPreparationInfo() returning lastKnownCost: 0 when recipesStore not initialized
-- 2. Wrong call signature for createNegativeBatch() in preparationService.ts
-- 3. Unit conversion bug in transitBatchService.ts multiplying price by package size
--
-- This migration fixes the existing data. The code fixes are in:
-- - src/stores/storage/transitBatchService.ts (unit conversion)
-- - src/stores/preparation/preparationService.ts (async cost lookup, negative batch call)

-- ============================================
-- STEP 1: Fix Ham Aroma product (piece-based)
-- For piece-based products, base_cost_per_unit should equal cost
-- ============================================
UPDATE products
SET
  base_cost_per_unit = cost,
  last_known_cost = cost,
  updated_at = NOW()
WHERE id = 'b987ef8c-f85f-4557-a0e4-8d18c35be7e1'
  AND base_unit = 'piece'
  AND base_cost_per_unit != cost;

-- ============================================
-- STEP 2: Fix Ham slices 30g preparation
-- The correct cost is 152.00 Rp/g (from original batches before Jan 2)
-- ============================================
UPDATE preparations
SET
  last_known_cost = 152.00,
  updated_at = NOW()
WHERE id = '52157b2f-887e-4dfa-9e3c-3a9397dcb43b';

-- ============================================
-- STEP 3: Fix Ham slices batches with inflated cost (2634.62)
-- ============================================
UPDATE preparation_batches
SET
  cost_per_unit = 152.00,
  total_value = current_quantity * 152.00,
  updated_at = NOW()
WHERE preparation_id = '52157b2f-887e-4dfa-9e3c-3a9397dcb43b'
  AND cost_per_unit = 2634.62;

-- ============================================
-- STEP 4: Fix all zero-cost batches
-- Use each preparation's last_known_cost
-- ============================================
UPDATE preparation_batches pb
SET
  cost_per_unit = p.last_known_cost,
  total_value = pb.current_quantity * p.last_known_cost,
  updated_at = NOW()
FROM preparations p
WHERE pb.preparation_id = p.id
  AND (pb.cost_per_unit = 0 OR pb.cost_per_unit IS NULL)
  AND p.last_known_cost > 0;

-- ============================================
-- VALIDATION
-- ============================================
-- Run this to verify:
-- SELECT COUNT(*) FROM preparation_batches WHERE cost_per_unit = 0;
-- Should return 0 or only batches where preparation has no recipe (like Nori sheets)
