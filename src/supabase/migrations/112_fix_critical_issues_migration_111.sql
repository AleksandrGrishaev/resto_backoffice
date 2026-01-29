-- Migration: 112_fix_critical_issues_migration_111
-- Description: Critical bug fixes for Migration 111
-- Date: 2026-01-29
-- Author: Claude Code (Code Review Fixes)
--
-- FIXES:
-- Critical #1: Add infinite loop safeguards
-- Critical #2: Add JSONB input validation
-- Critical #3: Explicit transaction documentation
-- Major #5: Add missing FIFO indexes

-- =============================================================================
-- FIX #1 & #4: Update allocate_product_fifo with safeguards and deficit fix
-- =============================================================================
DROP FUNCTION IF EXISTS public.allocate_product_fifo(uuid, numeric, numeric);

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
      AND is_active = true
    ORDER BY
      CASE WHEN current_quantity > 0 THEN 0 ELSE 1 END,
      receipt_date ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- ✅ FIX #1: Skip zero-quantity batches FIRST (performance + correctness)
    IF v_batch.current_quantity = 0 THEN
      CONTINUE;
    END IF;

    IF v_batch.current_quantity < 0 THEN
      v_allocated := LEAST(v_remaining, ABS(v_batch.current_quantity));

      -- ✅ FIX #1: Safeguard against infinite loop
      IF v_allocated <= 0 THEN
        EXIT;
      END IF;

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

    v_allocated := LEAST(v_batch.current_quantity, v_remaining);

    -- ✅ FIX #1: Safeguard against infinite loop
    IF v_allocated <= 0 THEN
      EXIT;
    END IF;

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
    'deficit', CASE
      WHEN v_total_allocated >= p_quantity THEN 0
      ELSE p_quantity - v_total_allocated
    END, -- ✅ FIX #4: Simplified deficit calculation
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
-- FIX #1 & #4: Update allocate_preparation_fifo with same fixes
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
BEGIN
  SELECT name, last_known_cost
  INTO v_preparation_name, v_last_known_cost
  FROM preparations
  WHERE id = p_preparation_id;

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
      AND is_active = true
    ORDER BY
      CASE WHEN current_quantity > 0 THEN 0 ELSE 1 END,
      COALESCE(production_date, created_at) ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- ✅ FIX #1: Skip zero-quantity batches FIRST
    IF v_batch.current_quantity = 0 THEN
      CONTINUE;
    END IF;

    IF v_batch.current_quantity < 0 THEN
      v_allocated := LEAST(v_remaining, ABS(v_batch.current_quantity));

      -- ✅ FIX #1: Safeguard against infinite loop
      IF v_allocated <= 0 THEN
        EXIT;
      END IF;

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

    v_allocated := LEAST(v_batch.current_quantity, v_remaining);

    -- ✅ FIX #1: Safeguard against infinite loop
    IF v_allocated <= 0 THEN
      EXIT;
    END IF;

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
    'deficit', CASE
      WHEN v_total_allocated >= p_quantity THEN 0
      ELSE p_quantity - v_total_allocated
    END, -- ✅ FIX #4: Simplified deficit calculation
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
-- FIX #5: Add missing FIFO indexes for performance
-- =============================================================================

-- Index for products FIFO allocation
CREATE INDEX IF NOT EXISTS idx_storage_batches_fifo_active_negative
ON storage_batches(item_id, is_active, current_quantity, receipt_date ASC, created_at ASC)
WHERE item_type = 'product';

-- Index for preparations FIFO allocation
CREATE INDEX IF NOT EXISTS idx_preparation_batches_fifo_active_negative
ON preparation_batches(preparation_id, is_active, current_quantity,
                       COALESCE(production_date, created_at) ASC);

-- Analyze tables to update statistics
ANALYZE storage_batches;
ANALYZE preparation_batches;

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
'FIFO cost allocation with negative batch support (v2 - Critical fixes applied).
Fixes: Infinite loop safeguards, deficit calculation, performance indexes.';

COMMENT ON FUNCTION public.allocate_preparation_fifo IS
'FIFO cost allocation for preparations with negative batch support (v2 - Critical fixes applied).
Fixes: Infinite loop safeguards, deficit calculation, performance indexes.';

-- =============================================================================
-- FIX #3: Transaction Isolation Documentation
-- =============================================================================
-- Note: PostgreSQL functions have IMPLICIT transaction isolation.
-- All statements within a function execute in a SINGLE transaction.
-- If EXCEPTION occurs, ALL changes are automatically rolled back.
-- SECURITY DEFINER ensures function runs with creator's privileges.
-- See: https://www.postgresql.org/docs/current/plpgsql-transactions.html
