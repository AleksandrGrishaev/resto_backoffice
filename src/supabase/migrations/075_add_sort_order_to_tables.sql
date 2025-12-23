-- Migration: 075_add_sort_order_to_tables
-- Description: Add sort_order column and Alex table for proper table ordering
-- Date: 2025-12-23

-- Add sort_order column
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

COMMENT ON COLUMN tables.sort_order IS 'Display order for tables in POS UI (lower numbers appear first)';

-- Add Alex table
INSERT INTO tables (table_number, area, capacity, status, sort_order)
VALUES ('Alex', 'VIP', 1, 'available', 11)
ON CONFLICT DO NOTHING;

-- Set sort_order for existing tables
-- TB 1-5 = positions 1-5
UPDATE tables SET sort_order = 1 WHERE table_number = 'TB-1';
UPDATE tables SET sort_order = 2 WHERE table_number = 'TB-2';
UPDATE tables SET sort_order = 3 WHERE table_number = 'TB-3';
UPDATE tables SET sort_order = 4 WHERE table_number = 'TB-4';
UPDATE tables SET sort_order = 5 WHERE table_number = 'TB-5';

-- TI 1-5 = positions 6-10
UPDATE tables SET sort_order = 6 WHERE table_number = 'TI-1';
UPDATE tables SET sort_order = 7 WHERE table_number = 'TI-2';
UPDATE tables SET sort_order = 8 WHERE table_number = 'TI-3';
UPDATE tables SET sort_order = 9 WHERE table_number = 'TI-4';
UPDATE tables SET sort_order = 10 WHERE table_number = 'TI-5';

-- Alex = position 11
UPDATE tables SET sort_order = 11 WHERE table_number = 'Alex';
