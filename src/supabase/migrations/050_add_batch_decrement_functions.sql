-- =============================================================================
-- Migration 050: Add Batch Quantity Decrement Functions
-- =============================================================================
-- Description: RPC functions for sync adapters to decrement batch quantities
-- Required by: PreparationWriteOffSyncAdapter, ProductWriteOffSyncAdapter
-- Date: 2025-12-11
-- =============================================================================

-- Function to decrement preparation batch quantity (for write-offs)
CREATE OR REPLACE FUNCTION decrement_batch_quantity(
    p_batch_id uuid,
    p_quantity numeric
) RETURNS void AS $$
BEGIN
    UPDATE preparation_batches
    SET
        current_quantity = GREATEST(current_quantity - p_quantity, 0),
        updated_at = NOW()
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Preparation batch not found: %', p_batch_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION decrement_batch_quantity IS 'Decrements preparation batch quantity during write-off sync. Used by PreparationWriteOffSyncAdapter.';

-- Function to decrement storage batch quantity (for product write-offs)
CREATE OR REPLACE FUNCTION decrement_storage_batch_quantity(
    p_batch_id uuid,
    p_quantity numeric
) RETURNS void AS $$
BEGIN
    UPDATE storage_batches
    SET
        current_quantity = GREATEST(current_quantity - p_quantity, 0),
        updated_at = NOW()
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Storage batch not found: %', p_batch_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION decrement_storage_batch_quantity IS 'Decrements storage batch quantity during product write-off sync. Used by ProductWriteOffSyncAdapter.';

-- Validation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrement_batch_quantity') THEN
        RAISE NOTICE '✅ decrement_batch_quantity function created';
    ELSE
        RAISE WARNING '❌ decrement_batch_quantity function NOT created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrement_storage_batch_quantity') THEN
        RAISE NOTICE '✅ decrement_storage_batch_quantity function created';
    ELSE
        RAISE WARNING '❌ decrement_storage_batch_quantity function NOT created';
    END IF;
END$$;
