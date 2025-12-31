-- Migration: 084_set_default_last_counted_at
-- Description: Set last_counted_at to 100 days ago for products without a value
-- Date: 2025-01-01
-- Purpose: Ensure all products have a last_counted_at value for inventory tracking
--          Products set to 100 days ago will appear as "stale" in inventory UI

-- ============================================================================
-- UPDATE PRODUCTS WITHOUT LAST_COUNTED_AT
-- ============================================================================

-- Set last_counted_at to 100 days ago for products that:
-- 1. Don't have a value (NULL)
-- 2. Have a very recent value (less than 5 days) - likely from incorrect backfill
UPDATE products
SET
  last_counted_at = NOW() - INTERVAL '100 days',
  updated_at = NOW()
WHERE last_counted_at IS NULL
   OR last_counted_at > NOW() - INTERVAL '5 days';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  total_products INTEGER;
  products_with_date INTEGER;
  products_stale INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO products_with_date FROM products WHERE last_counted_at IS NOT NULL;
  SELECT COUNT(*) INTO products_stale FROM products
    WHERE last_counted_at < NOW() - INTERVAL '7 days';

  RAISE NOTICE 'Migration 084 completed:';
  RAISE NOTICE '  Total products: %', total_products;
  RAISE NOTICE '  Products with last_counted_at: %', products_with_date;
  RAISE NOTICE '  Products marked as stale (>7 days): %', products_stale;
END $$;
