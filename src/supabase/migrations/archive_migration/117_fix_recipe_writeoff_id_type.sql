-- Migration: 117_fix_recipe_writeoff_id_type
-- Description: Change order_items.recipe_writeoff_id from UUID to TEXT
-- Reason: recipe_write_offs.id is TEXT type (rwo-xxx format), not UUID
-- Date: 2026-01-30

-- BUG: order_items.recipe_writeoff_id was UUID, but recipe_write_offs.id is TEXT
-- This caused 400 Bad Request when updating order_items with recipe write-off ID
-- Error: trying to insert "rwo-1769748671360-nuibmmmbz" into UUID column

-- SOLUTION: Change column type to TEXT to match recipe_write_offs.id format

-- Pre-migration check: ensure no existing data (column should be empty)
-- SELECT count(*) FROM order_items WHERE recipe_writeoff_id IS NOT NULL;

-- Alter column type from UUID to TEXT
ALTER TABLE order_items
ALTER COLUMN recipe_writeoff_id TYPE text;

-- Post-migration verification
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'order_items' AND column_name = 'recipe_writeoff_id';
