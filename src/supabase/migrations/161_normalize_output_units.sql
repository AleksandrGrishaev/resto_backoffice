-- Migration: 161_normalize_output_units
-- Description: Normalize preparation output_unit values (gr->gram, pc->piece)
-- Date: 2026-03-05

-- Normalize legacy abbreviations to standard values
UPDATE preparations SET output_unit = 'gram' WHERE output_unit = 'gr';
UPDATE preparations SET output_unit = 'piece' WHERE output_unit = 'pc';
