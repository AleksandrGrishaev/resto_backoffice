-- Migration: 111_support_active_negative_batches_fifo
-- Description: Update FIFO RPC functions to support active negative batches
-- Date: 2026-01-29
-- Author: Claude Code
--
-- CONTEXT:
-- Negative batches will now remain active (is_active=true) instead of being
-- immediately reconciled during receipt completion. This allows proper FIFO
-- cost tracking across: sale → negative batch → new receipt → sale cycles.
--
-- CHANGES:
-- 1. Remove `current_quantity > 0` filter from FIFO queries
-- 2. Add custom ORDER BY to process positive batches first, then negative
-- 3. Handle negative batch allocation in the loop
--
-- IMPACT:
-- - Balance calculations already handle active negative batches (SUM)
-- - FIFO allocation will now use negative batch costs when needed
-- - Improves cost accuracy when stock goes negative between receipts

-- =============================================================================
-- Drop existing functions
-- =============================================================================
DROP FUNCTION IF EXISTS public.allocate_product_fifo(uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.allocate_preparation_fifo(uuid, numeric, numeric);

-- =============================================================================
-- 1. allocate_product_fifo - Updated to support active negative batches
-- =============================================================================
CREATE OR REPLACE FUNCTION public.allocate_product_fifo(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_fallback_cost NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining NUMERIC := p_quantity;
  v_batch RECORD;
  v_allocated NUMERIC;
  v_allocations JSONB := '[]'::JSONB;
  v_total_cost NUMERIC := 0;
  v_total_allocated NUMERIC := 0;
  v_avg_cost NUMERIC := 0;
  v_product_name TEXT;
  v_last_known_cost NUMERIC;
BEGIN
  -- Get product info for fallback
  SELECT name, last_known_cost
  INTO v_product_name, v_last_known_cost
  FROM products
  WHERE id = p_product_id;

  -- ✅ CHANGED: Removed current_quantity > 0 filter
  -- ✅ CHANGED: Added custom ORDER BY to process positive batches first
  FOR v_batch IN
    SELECT
      id,
      batch_number,
      current_quantity,
      cost_per_unit,
      receipt_date,
      is_negative
    FROM storage_batches
    WHERE item_id = p_product_id::TEXT
      AND item_type = 'product'
      AND is_active = true              -- ✅ KEEP: Exclude reconciled batches
    ORDER BY
      CASE WHEN current_quantity > 0 THEN 0 ELSE 1 END,  -- Positive first
      receipt_date ASC                  -- Then FIFO within each group
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- ✅ NEW: Skip zero-quantity batches
    IF v_batch.current_quantity = 0 THEN
      CONTINUE;
    END IF;

    -- ✅ NEW: Handle negative batches
    IF v_batch.current_quantity < 0 THEN
      -- Allocate from negative batch (uses absolute value)
      v_allocated := LEAST(v_remaining, ABS(v_batch.current_quantity));

      v_allocations := v_allocations || jsonb_build_object(
        'batchId', v_batch.id,
        'batchNumber', v_batch.batch_number,
        'allocatedQuantity', v_allocated,
        'costPerUnit', v_batch.cost_per_unit,
        'totalCost', v_allocated * v_batch.cost_per_unit,
        'batchCreatedAt', v_batch.receipt_date,
        'isNegative', true
      );

      v_total_cost := v_total_cost + (v_allocated * v_batch.cost_per_unit);
      v_total_allocated := v_total_allocated + v_allocated;
      v_remaining := v_remaining - v_allocated;

      CONTINUE;
    END IF;

    -- ✅ EXISTING: Handle positive batches (no changes)
    v_allocated := LEAST(v_batch.current_quantity, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batchId', v_batch.id,
      'batchNumber', v_batch.batch_number,
      'allocatedQuantity', v_allocated,
      'costPerUnit', v_batch.cost_per_unit,
      'totalCost', v_allocated * v_batch.cost_per_unit,
      'batchCreatedAt', v_batch.receipt_date
    );

    v_total_cost := v_total_cost + (v_allocated * v_batch.cost_per_unit);
    v_total_allocated := v_total_allocated + v_allocated;
    v_remaining := v_remaining - v_allocated;
  END LOOP;

  IF v_total_allocated > 0 THEN
    v_avg_cost := v_total_cost / v_total_allocated;
  END IF;

  -- Handle case when NO batches found at all (use fallback for entire quantity)
  IF v_total_allocated = 0 AND v_remaining > 0 THEN
    v_avg_cost := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);

    IF v_avg_cost > 0 THEN
      v_total_cost := v_remaining * v_avg_cost;
      v_total_allocated := v_remaining;
      v_remaining := 0;
      v_allocations := jsonb_build_array(
        jsonb_build_object(
          'batchId', 'no-batches-fallback',
          'batchNumber', 'FALLBACK',
          'allocatedQuantity', v_total_allocated,
          'costPerUnit', v_avg_cost,
          'totalCost', v_total_cost,
          'batchCreatedAt', NOW()
        )
      );
    END IF;
  END IF;

  -- Handle partial deficit (some allocated, some remaining)
  IF v_remaining > 0 AND v_total_allocated > 0 THEN
    DECLARE
      v_deficit_cost NUMERIC := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);
    BEGIN
      v_allocations := v_allocations || jsonb_build_object(
        'batchId', 'deficit',
        'batchNumber', 'DEFICIT',
        'allocatedQuantity', v_remaining,
        'costPerUnit', v_deficit_cost,
        'totalCost', v_remaining * v_deficit_cost,
        'isDeficit', true,
        'batchCreatedAt', NOW()
      );

      v_total_cost := v_total_cost + (v_remaining * v_deficit_cost);
      v_total_allocated := v_total_allocated + v_remaining;

      IF v_total_allocated > 0 THEN
        v_avg_cost := v_total_cost / v_total_allocated;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'productId', p_product_id,
    'productName', v_product_name,
    'requestedQuantity', p_quantity,
    'allocatedQuantity', v_total_allocated,
    'deficit', GREATEST(0, p_quantity - v_total_allocated + v_remaining),
    'allocations', v_allocations,
    'totalCost', ROUND(v_total_cost::NUMERIC, 2),
    'averageCostPerUnit', ROUND(v_avg_cost::NUMERIC, 2),
    'usedFallback', false
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'productId', p_product_id,
    'requestedQuantity', p_quantity
  );
END;
$$;

-- =============================================================================
-- 2. allocate_preparation_fifo - Updated to support active negative batches
-- =============================================================================
CREATE OR REPLACE FUNCTION public.allocate_preparation_fifo(
  p_preparation_id UUID,
  p_quantity NUMERIC,
  p_fallback_cost NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining NUMERIC := p_quantity;
  v_batch RECORD;
  v_allocated NUMERIC;
  v_allocations JSONB := '[]'::JSONB;
  v_total_cost NUMERIC := 0;
  v_total_allocated NUMERIC := 0;
  v_avg_cost NUMERIC := 0;
  v_preparation_name TEXT;
  v_last_known_cost NUMERIC;
BEGIN
  -- Get preparation info for fallback
  SELECT name, last_known_cost
  INTO v_preparation_name, v_last_known_cost
  FROM preparations
  WHERE id = p_preparation_id;

  -- ✅ CHANGED: Removed current_quantity > 0 filter
  -- ✅ CHANGED: Added custom ORDER BY to process positive batches first
  FOR v_batch IN
    SELECT
      id,
      batch_number,
      current_quantity,
      cost_per_unit,
      production_date,
      created_at,
      is_negative
    FROM preparation_batches
    WHERE preparation_id = p_preparation_id
      AND is_active = true              -- ✅ KEEP: Exclude reconciled batches
    ORDER BY
      CASE WHEN current_quantity > 0 THEN 0 ELSE 1 END,  -- Positive first
      COALESCE(production_date, created_at) ASC  -- Then FIFO
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- ✅ NEW: Skip zero-quantity batches
    IF v_batch.current_quantity = 0 THEN
      CONTINUE;
    END IF;

    -- ✅ NEW: Handle negative batches
    IF v_batch.current_quantity < 0 THEN
      -- Allocate from negative batch (uses absolute value)
      v_allocated := LEAST(v_remaining, ABS(v_batch.current_quantity));

      v_allocations := v_allocations || jsonb_build_object(
        'batchId', v_batch.id,
        'batchNumber', v_batch.batch_number,
        'allocatedQuantity', v_allocated,
        'costPerUnit', v_batch.cost_per_unit,
        'totalCost', v_allocated * v_batch.cost_per_unit,
        'batchCreatedAt', COALESCE(v_batch.production_date, v_batch.created_at),
        'isNegative', true
      );

      v_total_cost := v_total_cost + (v_allocated * v_batch.cost_per_unit);
      v_total_allocated := v_total_allocated + v_allocated;
      v_remaining := v_remaining - v_allocated;

      CONTINUE;
    END IF;

    -- ✅ EXISTING: Handle positive batches (no changes)
    v_allocated := LEAST(v_batch.current_quantity, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batchId', v_batch.id,
      'batchNumber', v_batch.batch_number,
      'allocatedQuantity', v_allocated,
      'costPerUnit', v_batch.cost_per_unit,
      'totalCost', v_allocated * v_batch.cost_per_unit,
      'batchCreatedAt', COALESCE(v_batch.production_date, v_batch.created_at)
    );

    v_total_cost := v_total_cost + (v_allocated * v_batch.cost_per_unit);
    v_total_allocated := v_total_allocated + v_allocated;
    v_remaining := v_remaining - v_allocated;
  END LOOP;

  IF v_total_allocated > 0 THEN
    v_avg_cost := v_total_cost / v_total_allocated;
  END IF;

  -- Handle case when NO batches found (use fallback)
  IF v_total_allocated = 0 AND v_remaining > 0 THEN
    v_avg_cost := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);

    IF v_avg_cost > 0 THEN
      v_total_cost := v_remaining * v_avg_cost;
      v_total_allocated := v_remaining;
      v_remaining := 0;
      v_allocations := jsonb_build_array(
        jsonb_build_object(
          'batchId', 'no-batches-fallback',
          'batchNumber', 'FALLBACK',
          'allocatedQuantity', v_total_allocated,
          'costPerUnit', v_avg_cost,
          'totalCost', v_total_cost,
          'batchCreatedAt', NOW()
        )
      );
    END IF;
  END IF;

  -- Handle partial deficit
  IF v_remaining > 0 AND v_total_allocated > 0 THEN
    DECLARE
      v_deficit_cost NUMERIC := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);
    BEGIN
      v_allocations := v_allocations || jsonb_build_object(
        'batchId', 'deficit',
        'batchNumber', 'DEFICIT',
        'allocatedQuantity', v_remaining,
        'costPerUnit', v_deficit_cost,
        'totalCost', v_remaining * v_deficit_cost,
        'isDeficit', true,
        'batchCreatedAt', NOW()
      );

      v_total_cost := v_total_cost + (v_remaining * v_deficit_cost);
      v_total_allocated := v_total_allocated + v_remaining;

      IF v_total_allocated > 0 THEN
        v_avg_cost := v_total_cost / v_total_allocated;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'preparationId', p_preparation_id,
    'preparationName', v_preparation_name,
    'requestedQuantity', p_quantity,
    'allocatedQuantity', v_total_allocated,
    'deficit', GREATEST(0, p_quantity - v_total_allocated + v_remaining),
    'allocations', v_allocations,
    'totalCost', ROUND(v_total_cost::NUMERIC, 2),
    'averageCostPerUnit', ROUND(v_avg_cost::NUMERIC, 2),
    'usedFallback', false
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'preparationId', p_preparation_id,
    'requestedQuantity', p_quantity
  );
END;
$$;

-- =============================================================================
-- Grant Permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.allocate_product_fifo(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_product_fifo(UUID, NUMERIC, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO anon;

-- =============================================================================
-- Documentation
-- =============================================================================
COMMENT ON FUNCTION public.allocate_product_fifo IS
'FIFO cost allocation supporting both positive and active negative batches.
Prioritizes positive batches first, then uses negative batch costs if needed.
Returns detailed allocation breakdown with costs per batch.';

COMMENT ON FUNCTION public.allocate_preparation_fifo IS
'FIFO cost allocation for preparations supporting both positive and active negative batches.
Prioritizes positive batches first, then uses negative batch costs if needed.
Returns detailed allocation breakdown with costs per batch.';
