-- Migration: 062_add_cogs_indexes
-- Description: Add indexes for get_cogs_by_date_range performance
-- Date: 2025-12-12
-- Context: Support efficient COGS queries across storage_operations, preparation_operations,
--          inventory_documents, and sales_transactions

-- Index for storage_operations queries by date and type
CREATE INDEX IF NOT EXISTS idx_storage_ops_date_type
ON storage_operations(operation_date, operation_type);

-- Index for preparation_operations queries by date and type
CREATE INDEX IF NOT EXISTS idx_prep_ops_date_type
ON preparation_operations(operation_date, operation_type);

-- Index for inventory_documents queries by date and status
CREATE INDEX IF NOT EXISTS idx_inventory_docs_date_status
ON inventory_documents(inventory_date, status);

-- Index for sales_transactions queries by sold_at
CREATE INDEX IF NOT EXISTS idx_sales_trans_sold_at
ON sales_transactions(sold_at);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
