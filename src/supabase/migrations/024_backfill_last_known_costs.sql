-- Migration: 024_backfill_last_known_costs
-- Description: Backfill last_known_cost for existing products and preparations
-- Date: 2025-11-30
-- Author: Claude Code

-- ========================================
-- BACKFILL PRODUCTS: last_known_cost from most recent batch
-- ========================================

UPDATE products p
SET last_known_cost = (
  SELECT b.cost_per_unit
  FROM storage_batches b
  WHERE b.item_id = p.id::text
    AND b.item_type = 'product'
    AND (b.is_negative = FALSE OR b.is_negative IS NULL)
    AND b.current_quantity > 0
  ORDER BY b.created_at DESC
  LIMIT 1
);

-- ========================================
-- BACKFILL PREPARATIONS: last_known_cost from most recent batch
-- ========================================

UPDATE preparations p
SET last_known_cost = (
  SELECT b.cost_per_unit
  FROM preparation_batches b
  WHERE b.preparation_id = p.id
    AND (b.is_negative = FALSE OR b.is_negative IS NULL)
    AND b.current_quantity > 0
  ORDER BY b.created_at DESC
  LIMIT 1
);

-- ========================================
-- SET DEFAULT: Set to 0 if no batch history exists (prevent NULL)
-- ========================================

UPDATE products SET last_known_cost = 0 WHERE last_known_cost IS NULL;
UPDATE preparations SET last_known_cost = 0 WHERE last_known_cost IS NULL;

-- ========================================
-- VERIFICATION QUERY (for manual check after migration)
-- ========================================

-- SELECT
--   (SELECT COUNT(*) FROM products WHERE last_known_cost IS NOT NULL) as products_with_cost,
--   (SELECT COUNT(*) FROM products WHERE last_known_cost > 0) as products_with_nonzero_cost,
--   (SELECT COUNT(*) FROM preparations WHERE last_known_cost IS NOT NULL) as preps_with_cost,
--   (SELECT COUNT(*) FROM preparations WHERE last_known_cost > 0) as preps_with_nonzero_cost;
