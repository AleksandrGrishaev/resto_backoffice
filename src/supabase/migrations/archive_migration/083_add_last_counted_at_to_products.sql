-- Migration: 083_add_last_counted_at_to_products
-- Description: Add last_counted_at field to products for tracking inventory count dates
-- Date: 2025-01-01
-- Purpose: Enable filtering/sorting products by how recently they were inventoried

-- ============================================================================
-- ADD COLUMN
-- ============================================================================

-- Add last_counted_at column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS last_counted_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN products.last_counted_at IS
  'Timestamp of the last inventory count for this product. Updated when inventory is finalized.';

-- ============================================================================
-- CREATE INDEX
-- ============================================================================

-- Create index for efficient queries (e.g., "find products not counted in 7 days")
CREATE INDEX IF NOT EXISTS idx_products_last_counted_at
ON products(last_counted_at);

-- ============================================================================
-- BACKFILL FROM EXISTING INVENTORY DATA
-- ============================================================================

-- Derive last_counted_at from existing inventory_documents
-- This updates products based on the most recent confirmed inventory where they appear
WITH last_counts AS (
  SELECT DISTINCT ON (item->>'itemId')
    (item->>'itemId')::uuid as item_id,
    inventory_date as last_counted
  FROM inventory_documents,
    jsonb_array_elements(items) as item
  WHERE status = 'confirmed'
    AND item->>'itemId' IS NOT NULL
  ORDER BY item->>'itemId', inventory_date DESC
)
UPDATE products p
SET last_counted_at = lc.last_counted
FROM last_counts lc
WHERE p.id = lc.item_id
  AND p.last_counted_at IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Log the results (without deleted_at filter - not all environments have this column)
DO $$
DECLARE
  total_products INTEGER;
  products_with_count INTEGER;
  products_without_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO products_with_count FROM products WHERE last_counted_at IS NOT NULL;
  products_without_count := total_products - products_with_count;

  RAISE NOTICE 'Migration 083 completed:';
  RAISE NOTICE '  Total products: %', total_products;
  RAISE NOTICE '  Products with last_counted_at: %', products_with_count;
  RAISE NOTICE '  Products never inventoried: %', products_without_count;
END $$;
