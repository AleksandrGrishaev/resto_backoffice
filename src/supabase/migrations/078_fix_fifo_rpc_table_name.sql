-- Migration: 078_fix_fifo_rpc_table_name
-- Description: Fix allocate_product_fifo to use storage_batches instead of product_batches
-- Date: 2025-12-25
-- Issue: RPC function was using non-existent table 'product_batches' causing Cost=0 in sales transactions

-- Drop existing function
DROP FUNCTION IF EXISTS public.allocate_product_fifo(uuid, numeric, numeric);

-- Recreate with correct table name: storage_batches
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.allocate_product_fifo(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_product_fifo(UUID, NUMERIC, NUMERIC) TO anon;

COMMENT ON FUNCTION public.allocate_product_fifo IS 'FIFO cost allocation for product batches from storage_batches (read-only)';
