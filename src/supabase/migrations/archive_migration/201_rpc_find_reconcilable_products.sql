-- Migration: 201_rpc_find_reconcilable_products
-- Description: RPC to find products with both NEG unreconciled and positive active batches
-- Date: 2026-03-10
-- Context: Inventory finalization was calling reconciliation for ALL inventoried items (~166),
--   making ~330 sequential DB queries (~50 seconds). This RPC pre-filters to only products
--   where reconciliation can actually work, reducing to 1 query + only necessary work.

CREATE OR REPLACE FUNCTION find_reconcilable_products(p_product_ids TEXT[])
RETURNS TABLE(product_id TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT neg.item_id AS product_id
  FROM storage_batches neg
  INNER JOIN storage_batches pos
    ON neg.item_id = pos.item_id
    AND pos.item_type = 'product'
    AND pos.is_active = true
    AND (pos.is_negative = false OR pos.is_negative IS NULL)
    AND pos.current_quantity > 0
  WHERE neg.item_id = ANY(p_product_ids)
    AND neg.item_type = 'product'
    AND neg.is_negative = true
    AND neg.reconciled_at IS NULL
    AND neg.is_active = true;
$$;
