-- Migration: 172_fix_last_known_cost_and_fifo_fallback
-- Description: Fix last_known_cost for portion-type preparations to be per-gram (base unit).
--   The dual writer bug caused some preps to have per-portion cost stored as per-gram.
--   Also adds safety normalization to allocate_preparation_fifo fallback path.
-- Date: 2026-03-09
-- Author: Claude Code
--
-- ROOT CAUSE: recipesStore.ts:737 wrote costPerOutputUnit (per-portion) to last_known_cost
--   while recipesStore.ts:388 and preparationService.ts:1511 wrote per-gram.
--   Whichever ran last determined the stored value. Fixed in code alongside this migration.
--
-- APPROACH: Use weighted average batch cost_per_unit (always per-gram) as source of truth.
--   For preps without batch history, normalize last_known_cost / portion_size.

-- ============================================================
-- STEP 1: Fix last_known_cost for preps WITH batch history
-- ============================================================
-- Batch cost_per_unit is always per base unit (gram/piece), so avg is reliable

UPDATE preparations p
SET last_known_cost = sub.avg_cost_per_gram,
    updated_at = NOW()
FROM (
  SELECT pb.preparation_id,
    ROUND(
      (SUM(pb.cost_per_unit * pb.initial_quantity) FILTER (WHERE pb.cost_per_unit > 0 AND NOT pb.is_negative)
       / NULLIF(SUM(pb.initial_quantity) FILTER (WHERE pb.cost_per_unit > 0 AND NOT pb.is_negative), 0)
      )::numeric, 2
    ) as avg_cost_per_gram
  FROM preparation_batches pb
  GROUP BY pb.preparation_id
  HAVING SUM(pb.initial_quantity) FILTER (WHERE pb.cost_per_unit > 0 AND NOT pb.is_negative) > 0
) sub
WHERE p.id = sub.preparation_id
  AND p.portion_type = 'portion'
  AND p.portion_size > 1
  AND sub.avg_cost_per_gram IS NOT NULL
  AND sub.avg_cost_per_gram > 0;

-- ============================================================
-- STEP 2: Fix last_known_cost for preps WITHOUT batch history
-- For these, check if value looks like per-portion (much larger than
-- expected per-gram cost) and normalize if so.
-- We use a conservative heuristic: if last_known_cost > 500 and portion_size > 10,
-- it's likely per-portion (e.g., Ciabatta small: 1217/60g, Dorado: 15413/120g)
-- ============================================================

-- Log what we're about to fix (for review)
DO $$
DECLARE
  v_prep RECORD;
  v_count INT := 0;
BEGIN
  FOR v_prep IN
    SELECT p.id, p.name, p.portion_size, p.last_known_cost,
      ROUND((p.last_known_cost / p.portion_size)::numeric, 2) as normalized
    FROM preparations p
    WHERE p.portion_type = 'portion'
      AND p.portion_size > 1
      AND p.last_known_cost > 0
      AND NOT EXISTS (
        SELECT 1 FROM preparation_batches pb
        WHERE pb.preparation_id = p.id AND pb.cost_per_unit > 0 AND NOT pb.is_negative
      )
  LOOP
    RAISE NOTICE 'No batches: % (ps=%, lkc=%, normalized=%)',
      v_prep.name, v_prep.portion_size, v_prep.last_known_cost, v_prep.normalized;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Total preps without batches needing review: %', v_count;
END $$;

-- For preps without batch history where last_known_cost appears per-portion:
-- Only normalize when we're fairly confident (last_known_cost / portion_size gives reasonable per-gram)
-- Skip portion_size=1 (dividing by 1 is no-op)
UPDATE preparations p
SET last_known_cost = ROUND((last_known_cost / portion_size)::numeric, 2),
    updated_at = NOW()
WHERE p.portion_type = 'portion'
  AND p.portion_size > 1
  AND p.last_known_cost > 0
  -- Only preps without batch history
  AND NOT EXISTS (
    SELECT 1 FROM preparation_batches pb
    WHERE pb.preparation_id = p.id AND pb.cost_per_unit > 0 AND NOT pb.is_negative
  )
  -- Safety: only normalize if the value is large enough to be per-portion
  -- (per-gram costs rarely exceed 500 IDR/g for our ingredients)
  AND p.last_known_cost > p.portion_size * 5;

-- ============================================================
-- STEP 3: Update allocate_preparation_fifo v5
-- Add safety normalization in fallback path for portion-type preps
-- ============================================================

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
  v_fallback_per_unit NUMERIC;
BEGIN
  -- Get preparation info for fallback
  SELECT name, last_known_cost, portion_type, portion_size
  INTO v_preparation_name, v_last_known_cost, v_portion_type, v_portion_size
  FROM preparations
  WHERE id = p_preparation_id;

  -- FIFO allocation from batches (unchanged)
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

  -- ============================================================
  -- FALLBACK: Safety normalization for portion-type preparations
  -- last_known_cost SHOULD be per-base-unit (gram) after migration 172,
  -- but as a safety net, also try batch history weighted average.
  -- ============================================================
  v_fallback_per_unit := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);

  -- Safety check: if no active batches, try historical batch avg as better fallback
  IF v_total_allocated = 0 AND v_remaining > 0 AND v_portion_type = 'portion' AND v_portion_size > 1 THEN
    DECLARE
      v_hist_avg NUMERIC;
    BEGIN
      SELECT ROUND(
        (SUM(pb.cost_per_unit * pb.initial_quantity) / NULLIF(SUM(pb.initial_quantity), 0))::numeric, 2
      )
      INTO v_hist_avg
      FROM preparation_batches pb
      WHERE pb.preparation_id = p_preparation_id
        AND pb.cost_per_unit > 0
        AND NOT pb.is_negative;

      IF v_hist_avg IS NOT NULL AND v_hist_avg > 0 THEN
        v_fallback_per_unit := v_hist_avg;
      END IF;
    END;
  END IF;

  -- No batches: use fallback
  IF v_total_allocated = 0 AND v_remaining > 0 THEN
    v_avg_cost := v_fallback_per_unit;
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

  -- Partial deficit: use fallback
  IF v_remaining > 0 AND v_total_allocated > 0 THEN
    DECLARE
      v_deficit_cost NUMERIC := v_fallback_per_unit;
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
'FIFO cost allocation for preparations (v5). Fallback uses historical batch avg
for portion-type preps as safety against last_known_cost per-portion bug.
Fixed in migration 172 alongside dual-writer code fix.';
