-- Migration: 077_fix_portion_cost_normalization
-- Description: Fix FIFO cost calculation for portion-type preparations
-- Date: 2025-12-26
-- Author: Claude
--
-- PROBLEM:
-- For portion-type preparations, `last_known_cost` stores cost PER PORTION,
-- but the RPC was using it as cost per gram (base unit).
-- Example: Slice SourDough bread has last_known_cost=3000 (per 30g portion)
-- When requesting 30 grams, RPC calculated: 30 * 3000 = 90,000 (WRONG!)
-- Should be: 30 * (3000/30) = 3,000 (CORRECT!)
--
-- FIX:
-- Normalize last_known_cost by portion_size when portion_type = 'portion'

-- =============================================================================
-- 1. allocate_preparation_fifo - FIXED version with portion cost normalization
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
  v_portion_type TEXT;
  v_portion_size NUMERIC;
  v_normalized_fallback_cost NUMERIC;
BEGIN
  -- Get preparation info for fallback (including portion_type and portion_size)
  SELECT name, last_known_cost, portion_type, portion_size
  INTO v_preparation_name, v_last_known_cost, v_portion_type, v_portion_size
  FROM preparations
  WHERE id = p_preparation_id;

  -- ✅ FIX: Normalize last_known_cost for portion-type preparations
  -- last_known_cost is stored as cost PER PORTION, but we need cost PER GRAM
  IF v_portion_type = 'portion' AND v_portion_size IS NOT NULL AND v_portion_size > 0 THEN
    v_normalized_fallback_cost := COALESCE(v_last_known_cost, 0) / v_portion_size;
  ELSE
    v_normalized_fallback_cost := COALESCE(v_last_known_cost, 0);
  END IF;

  -- Use provided fallback if normalized cost is 0
  IF v_normalized_fallback_cost = 0 THEN
    v_normalized_fallback_cost := p_fallback_cost;
  END IF;

  -- Iterate through preparation_batches in FIFO order (oldest first)
  FOR v_batch IN
    SELECT
      id,
      batch_number,
      current_quantity,
      cost_per_unit,
      created_at
    FROM preparation_batches
    WHERE preparation_id = p_preparation_id
      AND current_quantity > 0
      AND is_active = true
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_allocated := LEAST(v_batch.current_quantity, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batchId', v_batch.id,
      'batchNumber', v_batch.batch_number,
      'allocatedQuantity', v_allocated,
      'costPerUnit', v_batch.cost_per_unit,
      'totalCost', v_allocated * v_batch.cost_per_unit,
      'batchCreatedAt', v_batch.created_at
    );

    v_total_cost := v_total_cost + (v_allocated * v_batch.cost_per_unit);
    v_total_allocated := v_total_allocated + v_allocated;
    v_remaining := v_remaining - v_allocated;
  END LOOP;

  IF v_total_allocated > 0 THEN
    v_avg_cost := v_total_cost / v_total_allocated;
  END IF;

  -- Handle case when NO batches found at all (use normalized fallback for entire quantity)
  IF v_total_allocated = 0 AND v_remaining > 0 THEN
    v_avg_cost := v_normalized_fallback_cost;

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

  -- Handle zero-cost allocation (batches exist but have costPerUnit = 0)
  IF v_total_allocated > 0 AND v_avg_cost = 0 THEN
    v_avg_cost := v_normalized_fallback_cost;

    IF v_avg_cost > 0 THEN
      v_total_cost := v_total_allocated * v_avg_cost;
      v_allocations := jsonb_build_array(
        jsonb_build_object(
          'batchId', 'fallback-zero-cost',
          'batchNumber', 'FALLBACK',
          'allocatedQuantity', v_total_allocated,
          'costPerUnit', v_avg_cost,
          'totalCost', v_total_cost,
          'batchCreatedAt', NOW()
        )
      );
    END IF;
  END IF;

  -- Handle deficit (use normalized fallback cost)
  IF v_remaining > 0 THEN
    DECLARE
      v_deficit_cost NUMERIC := v_normalized_fallback_cost;
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
    'usedFallback', v_avg_cost > 0 AND jsonb_array_length(v_allocations) = 1
                    AND (v_allocations->0->>'batchId') IN ('fallback-zero-cost', 'no-batches-fallback'),
    'portionTypeNormalized', v_portion_type = 'portion'
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO anon;

-- Update comment
COMMENT ON FUNCTION public.allocate_preparation_fifo IS 'FIFO cost allocation for preparation batches. Normalizes portion-type costs to per-gram basis.';
