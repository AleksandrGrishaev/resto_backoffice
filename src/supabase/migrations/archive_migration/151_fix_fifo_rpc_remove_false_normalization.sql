-- Migration: 151_fix_fifo_rpc_remove_false_normalization
-- Description: Remove last_known_cost normalization from allocate_preparation_fifo RPC.
--   Migration 147 already normalized all last_known_cost values to per-base-unit (gram/piece).
--   The heuristic "cost > portion_size → divide" is wrong for expensive ingredients with
--   small portions (e.g., Dorado 126.94/g with portion_size=120 → falsely becomes 1.06/g).
-- Date: 2026-02-07
-- Author: Claude Code
--
-- AFFECTED PREPARATIONS (would get falsely normalized):
-- Choco heart: 260/g → 17.3/g (15g portion)
-- Dorado unfrozen: 126.94/g → 1.06/g (120g portion)
-- Dressing GREEK: 164.07/g → 5.47/g (30g portion)
-- Mozarella 100gr: 126.18/g → 1.26/g (100g portion)
-- Mozarella 50gr: 126.18/g → 2.52/g (50g portion)
-- Shrimp thawed: 270/g → 16.2/g (16.67g portion)
-- Snow boll: 260/g → 17.3/g (15g portion)
-- Tuna saku 70g: 135/g → 1.93/g (70g portion)

DROP FUNCTION IF EXISTS public.allocate_preparation_fifo(uuid, numeric, numeric);

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
  -- last_known_cost is always per BASE UNIT (gram/piece) since migration 147
  SELECT name, last_known_cost
  INTO v_preparation_name, v_last_known_cost
  FROM preparations
  WHERE id = p_preparation_id;

  FOR v_batch IN
    SELECT
      id, batch_number, current_quantity, cost_per_unit,
      production_date, created_at, is_negative
    FROM preparation_batches
    WHERE preparation_id = p_preparation_id
      AND is_active = true
    ORDER BY
      CASE WHEN current_quantity > 0 THEN 0 ELSE 1 END,
      COALESCE(production_date, created_at) ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF v_batch.current_quantity = 0 THEN
      CONTINUE;
    END IF;

    IF v_batch.current_quantity < 0 THEN
      v_allocated := LEAST(v_remaining, ABS(v_batch.current_quantity));
      IF v_allocated <= 0 THEN EXIT; END IF;

      v_allocations := v_allocations || jsonb_build_object(
        'batchId', v_batch.id, 'batchNumber', v_batch.batch_number,
        'allocatedQuantity', v_allocated, 'costPerUnit', v_batch.cost_per_unit,
        'totalCost', v_allocated * v_batch.cost_per_unit,
        'batchCreatedAt', COALESCE(v_batch.production_date, v_batch.created_at),
        'isNegative', true
      );
      v_total_cost := v_total_cost + (v_allocated * v_batch.cost_per_unit);
      v_total_allocated := v_total_allocated + v_allocated;
      v_remaining := v_remaining - v_allocated;
      CONTINUE;
    END IF;

    v_allocated := LEAST(v_batch.current_quantity, v_remaining);
    IF v_allocated <= 0 THEN EXIT; END IF;

    v_allocations := v_allocations || jsonb_build_object(
      'batchId', v_batch.id, 'batchNumber', v_batch.batch_number,
      'allocatedQuantity', v_allocated, 'costPerUnit', v_batch.cost_per_unit,
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

  -- No batches: use fallback (already per base unit)
  IF v_total_allocated = 0 AND v_remaining > 0 THEN
    v_avg_cost := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);
    IF v_avg_cost > 0 THEN
      v_total_cost := v_remaining * v_avg_cost;
      v_total_allocated := v_remaining;
      v_remaining := 0;
      v_allocations := jsonb_build_array(jsonb_build_object(
        'batchId', 'no-batches-fallback', 'batchNumber', 'FALLBACK',
        'allocatedQuantity', v_total_allocated, 'costPerUnit', v_avg_cost,
        'totalCost', v_total_cost, 'batchCreatedAt', NOW()
      ));
    END IF;
  END IF;

  -- Partial deficit: use fallback (already per base unit)
  IF v_remaining > 0 AND v_total_allocated > 0 THEN
    DECLARE
      v_deficit_cost NUMERIC := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);
    BEGIN
      v_allocations := v_allocations || jsonb_build_object(
        'batchId', 'deficit', 'batchNumber', 'DEFICIT',
        'allocatedQuantity', v_remaining, 'costPerUnit', v_deficit_cost,
        'totalCost', v_remaining * v_deficit_cost,
        'isDeficit', true, 'batchCreatedAt', NOW()
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
    'deficit', CASE WHEN v_total_allocated >= p_quantity THEN 0
      ELSE p_quantity - v_total_allocated END,
    'allocations', v_allocations,
    'totalCost', ROUND(v_total_cost::NUMERIC, 2),
    'averageCostPerUnit', ROUND(v_avg_cost::NUMERIC, 2),
    'usedFallback', false
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 'error', SQLERRM,
    'preparationId', p_preparation_id,
    'requestedQuantity', p_quantity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO anon;

COMMENT ON FUNCTION public.allocate_preparation_fifo IS
'FIFO cost allocation for preparations (v4). No normalization — last_known_cost is always
per base unit (gram/piece) since migration 147. Removes false normalization heuristic
that was causing cost deflation for expensive ingredients with small portions.';
