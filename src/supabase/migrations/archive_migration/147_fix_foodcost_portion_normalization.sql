-- Migration: 147_fix_foodcost_portion_normalization
-- Description: Fix food cost calculation for portion-type preparations
-- Date: 2026-02-07
-- Author: Claude Code
--
-- ROOT CAUSE ANALYSIS:
-- preparations.last_known_cost for portion-type preparations was stored as
-- "cost per portion" (e.g., 8500 for 120g chicken = Rp 8500/portion) instead of
-- "cost per base unit" (e.g., 70.83/gram). The FIFO RPC function used this value
-- directly for FALLBACK/DEFICIT allocation without normalizing, causing 100-200x
-- cost inflation.
--
-- FIXES:
-- 1. RPC allocate_preparation_fifo: normalize last_known_cost by dividing by
--    portion_size for portion-type preparations
-- 2. DATA: Update last_known_cost for 18 portion-type preparations to per-gram
-- 3. DATA: Fix Beef Steak recipe — French fries quantity 100→1 portions
-- 4. RECALC: Recalculate affected sales_transactions from Feb 1
--
-- AFFECTED TRANSACTIONS (before fix):
-- Feb 5: Tuna Steak Rp 3,758,282 → Rp 36,982 (deficit cost 22000/g → 110/g)
-- Feb 5: Beef Steak Rp 532,213 → Rp 86,713 (french fries 10000g → 100g)
-- Feb 6: Chicken Steak ×2 Rp 2,850,688 → Rp 31,520 (fallback 14167/g → 70.83/g)
--
-- Daily food cost impact:
-- Feb 5: 129.5% → 41.1%
-- Feb 6: 125.0% → 44.2%

-- =============================================================================
-- 1. Fix allocate_preparation_fifo — normalize last_known_cost
-- =============================================================================
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
  v_portion_type TEXT;
  v_portion_size NUMERIC;
BEGIN
  -- Get preparation info (including portion fields for normalization)
  SELECT name, last_known_cost, portion_type, portion_size
  INTO v_preparation_name, v_last_known_cost, v_portion_type, v_portion_size
  FROM preparations
  WHERE id = p_preparation_id;

  -- Normalize last_known_cost for portion-type preparations
  -- last_known_cost may be stored as cost PER PORTION, but FIFO needs cost PER BASE UNIT
  IF v_portion_type = 'portion' AND v_portion_size IS NOT NULL AND v_portion_size > 0
     AND v_last_known_cost IS NOT NULL AND v_last_known_cost > v_portion_size THEN
    v_last_known_cost := v_last_known_cost / v_portion_size;
  END IF;

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

  -- No batches: use normalized fallback
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

  -- Partial deficit: use normalized fallback
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
'FIFO cost allocation for preparations (v3). Normalizes last_known_cost for
portion-type preparations to prevent cost inflation in fallback/deficit scenarios.';

-- =============================================================================
-- 2. Fix last_known_cost data for portion-type preparations
-- =============================================================================
UPDATE preparations
SET last_known_cost = last_known_cost / portion_size,
    updated_at = NOW()
WHERE portion_type = 'portion'
  AND portion_size IS NOT NULL
  AND portion_size > 0
  AND last_known_cost IS NOT NULL
  AND last_known_cost > portion_size;

-- =============================================================================
-- 3. Fix French fries recipe quantity in Beef Steak: 100 → 1
-- =============================================================================
UPDATE recipe_components
SET quantity = 1
WHERE recipe_id = '22c67eed-c83b-4aed-a36c-c39f48b5c974'  -- Beef steak
  AND component_id = 'bb16cad8-ddff-453c-be3c-df8ecb1e2d12'  -- French fries portion 100g
  AND quantity = 100;

-- =============================================================================
-- 4. Recalculate affected sales_transactions (Feb 1+)
-- NOTE: Run recalculate_feb_transactions() after applying this migration.
--   The function is created by migration 149 and fixes FALLBACK/DEFICIT costs
--   and Beef Steak French fries quantities in sales_transactions.
-- =============================================================================
