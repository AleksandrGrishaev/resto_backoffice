-- Migration: 089_make_display_name_required
-- Description: Make display_name NOT NULL in counteragents table
--              and fix supplier_name in orders to use display_name
-- Date: 2026-01-04

-- Step 1: Fill missing display_name in counteragents
UPDATE counteragents
SET display_name = name
WHERE display_name IS NULL OR display_name = '';

-- Step 2: Make display_name NOT NULL
ALTER TABLE counteragents
ALTER COLUMN display_name SET NOT NULL;

-- Step 3: Fix existing orders with wrong supplier_name
-- Update orders where supplier_name doesn't match counteragent's display_name
UPDATE supplierstore_orders o
SET supplier_name = c.display_name, updated_at = NOW()
FROM counteragents c
WHERE o.supplier_id = c.id::text
  AND o.supplier_name != c.display_name;
