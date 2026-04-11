-- Migration: 299_fix_alerts_category_constraint
-- Description: Add 'inventory' to operations_alerts category CHECK constraint
-- Date: 2026-04-11
-- Context: batch_process_negative_batches RPC uses category='inventory' for shortage alerts,
--          but the CHECK constraint only allowed ('shift','account','product','supplier').
--          This caused: "new row violates check constraint operations_alerts_category_check"

-- Drop old constraint
ALTER TABLE operations_alerts DROP CONSTRAINT IF EXISTS operations_alerts_category_check;

-- Add updated constraint with 'inventory' category
ALTER TABLE operations_alerts ADD CONSTRAINT operations_alerts_category_check
  CHECK (category IN ('shift', 'account', 'product', 'supplier', 'inventory'));
