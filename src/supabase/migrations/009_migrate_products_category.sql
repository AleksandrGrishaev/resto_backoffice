-- Migration: Migrate products.category from string to UUID foreign key
-- Created: 2025-11-24
-- Description: Convert products.category from text key to UUID reference to product_categories table

-- Step 1: Add new temporary column for UUID category
ALTER TABLE products ADD COLUMN category_new UUID;

-- Step 2: Populate new column by matching text key to product_categories.id
UPDATE products
SET category_new = pc.id
FROM product_categories pc
WHERE products.category = pc.key;

-- Step 3: Check for any products that didn't match (should be 0)
-- This will help identify data integrity issues before proceeding
DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmatched_count
  FROM products
  WHERE category_new IS NULL;

  IF unmatched_count > 0 THEN
    RAISE NOTICE 'Warning: % products have no matching category', unmatched_count;
    -- Set unmatched products to 'other' category as fallback
    UPDATE products
    SET category_new = (SELECT id FROM product_categories WHERE key = 'other')
    WHERE category_new IS NULL;
  END IF;
END $$;

-- Step 4: Drop old text column
ALTER TABLE products DROP COLUMN category;

-- Step 5: Rename new column to original name
ALTER TABLE products RENAME COLUMN category_new TO category;

-- Step 6: Add NOT NULL constraint
ALTER TABLE products ALTER COLUMN category SET NOT NULL;

-- Step 7: Add foreign key constraint
ALTER TABLE products
  ADD CONSTRAINT fk_products_category
  FOREIGN KEY (category)
  REFERENCES product_categories(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Step 8: Add index for foreign key (performance)
CREATE INDEX idx_products_category ON products(category);

-- Add comment
COMMENT ON COLUMN products.category IS 'Foreign key to product_categories table (UUID)';
