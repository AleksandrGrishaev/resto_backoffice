-- Migration: 076_fifo_allocation_rpc
-- Description: FIFO batch allocation RPC functions for cost calculation
-- Date: 2025-12-25
-- Purpose: Reduce client-server round-trips and ensure atomic FIFO allocation
--
-- IMPORTANT: Uses storage_batches (for products) and preparation_batches tables
-- Tables structure:
--   storage_batches: id (TEXT), item_id (TEXT), item_type, current_quantity, cost_per_unit, receipt_date
--   preparation_batches: id (UUID), preparation_id (UUID), current_quantity, cost_per_unit, created_at

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.allocate_product_fifo(uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.allocate_preparation_fifo(uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.allocate_batch_fifo(jsonb, numeric);

-- =============================================================================
-- 1. allocate_product_fifo - Uses storage_batches table
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

  -- Iterate through storage_batches in FIFO order (oldest first)
  FOR v_batch IN
    SELECT
      id,
      batch_number,
      current_quantity,
      cost_per_unit,
      receipt_date
    FROM storage_batches
    WHERE item_id = p_product_id::TEXT
      AND item_type = 'product'
      AND current_quantity > 0
      AND is_active = true
    ORDER BY receipt_date ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

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

  -- Handle zero-cost allocation
  IF v_total_allocated > 0 AND v_avg_cost = 0 THEN
    v_avg_cost := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);

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

  -- Handle deficit
  IF v_remaining > 0 THEN
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
    'usedFallback', v_avg_cost > 0 AND jsonb_array_length(v_allocations) = 1
                    AND (v_allocations->0->>'batchId') IN ('fallback-zero-cost', 'no-batches-fallback')
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
-- 2. allocate_preparation_fifo - Uses preparation_batches table (UUID ids)
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

  -- Handle case when NO batches found at all
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

  -- Handle zero-cost allocation
  IF v_total_allocated > 0 AND v_avg_cost = 0 THEN
    v_avg_cost := COALESCE(NULLIF(v_last_known_cost, 0), p_fallback_cost, 0);

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

  -- Handle deficit
  IF v_remaining > 0 THEN
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
    'usedFallback', v_avg_cost > 0 AND jsonb_array_length(v_allocations) = 1
                    AND (v_allocations->0->>'batchId') IN ('fallback-zero-cost', 'no-batches-fallback')
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
-- 3. allocate_batch_fifo - Batch allocation for multiple items
-- =============================================================================
CREATE OR REPLACE FUNCTION public.allocate_batch_fifo(
  p_items JSONB,
  p_fallback_cost NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_result JSONB;
  v_results JSONB := '[]'::JSONB;
  v_total_cost NUMERIC := 0;
  v_product_count INT := 0;
  v_preparation_count INT := 0;
BEGIN
  -- Process each item in the array
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    id TEXT,
    type TEXT,
    quantity NUMERIC,
    fallbackCost NUMERIC
  )
  LOOP
    IF v_item.type = 'product' THEN
      v_result := allocate_product_fifo(
        v_item.id::UUID,
        v_item.quantity,
        COALESCE(v_item.fallbackCost, p_fallback_cost, 0)
      );
      v_product_count := v_product_count + 1;
    ELSIF v_item.type = 'preparation' THEN
      v_result := allocate_preparation_fifo(
        v_item.id::UUID,
        v_item.quantity,
        COALESCE(v_item.fallbackCost, p_fallback_cost, 0)
      );
      v_preparation_count := v_preparation_count + 1;
    ELSE
      v_result := jsonb_build_object(
        'success', false,
        'error', 'Unknown item type: ' || v_item.type,
        'id', v_item.id
      );
    END IF;

    v_results := v_results || v_result;

    IF (v_result->>'success')::BOOLEAN THEN
      v_total_cost := v_total_cost + COALESCE((v_result->>'totalCost')::NUMERIC, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'results', v_results,
    'summary', jsonb_build_object(
      'totalCost', ROUND(v_total_cost, 2),
      'productItems', v_product_count,
      'preparationItems', v_preparation_count,
      'totalItems', v_product_count + v_preparation_count
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'results', v_results
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.allocate_product_fifo(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_batch_fifo(JSONB, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_product_fifo(UUID, NUMERIC, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION public.allocate_preparation_fifo(UUID, NUMERIC, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION public.allocate_batch_fifo(JSONB, NUMERIC) TO anon;

-- Add comments
COMMENT ON FUNCTION public.allocate_product_fifo IS 'FIFO cost allocation for product batches from storage_batches (read-only)';
COMMENT ON FUNCTION public.allocate_preparation_fifo IS 'FIFO cost allocation for preparation batches (read-only)';
COMMENT ON FUNCTION public.allocate_batch_fifo IS 'Batch FIFO allocation for multiple items in single call';
