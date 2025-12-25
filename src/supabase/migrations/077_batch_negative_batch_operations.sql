-- Migration: 077_batch_negative_batch_operations
-- Description: Create RPC for batch negative batch operations to optimize write-off performance
-- Date: 2025-01-09
-- Author: Claude
-- CONTEXT: Write-off for 11 items takes ~11 seconds due to 33+ sequential DB calls
--          This RPC batches all negative batch operations into a single round-trip

-- =====================================================================
-- Type for shortage input
-- =====================================================================
DROP TYPE IF EXISTS shortage_item CASCADE;
CREATE TYPE shortage_item AS (
  product_id uuid,
  warehouse_id uuid,
  shortage_quantity numeric,
  unit text,
  reason text,
  source_operation_type text
);

-- =====================================================================
-- Type for shortage result
-- =====================================================================
DROP TYPE IF EXISTS shortage_result CASCADE;
CREATE TYPE shortage_result AS (
  product_id uuid,
  batch_id uuid,
  batch_number text,
  quantity numeric,
  cost_per_unit numeric,
  total_cost numeric,
  is_new boolean,
  error text
);

-- =====================================================================
-- Batch process negative batches RPC
-- =====================================================================
CREATE OR REPLACE FUNCTION batch_process_negative_batches(
  p_shortages shortage_item[]
)
RETURNS shortage_result[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shortage shortage_item;
  v_result shortage_result;
  v_results shortage_result[] := ARRAY[]::shortage_result[];
  v_cost numeric;
  v_existing_batch RECORD;
  v_new_batch RECORD;
  v_batch_number text;
  v_batch_id uuid;
  v_now timestamptz := now();
BEGIN
  -- Process each shortage
  FOREACH v_shortage IN ARRAY p_shortages
  LOOP
    v_result := ROW(
      v_shortage.product_id,
      NULL::uuid,
      NULL::text,
      v_shortage.shortage_quantity,
      0::numeric,
      0::numeric,
      false,
      NULL::text
    )::shortage_result;

    BEGIN
      -- 1. Calculate cost (try multiple sources)
      -- First: last active batch
      SELECT cost_per_unit INTO v_cost
      FROM storage_batches
      WHERE item_id = v_shortage.product_id
        AND item_type = 'product'
        AND (is_negative = false OR is_negative IS NULL)
        AND current_quantity > 0
      ORDER BY created_at DESC
      LIMIT 1;

      -- Second: average from depleted batches
      IF v_cost IS NULL OR v_cost <= 0 THEN
        SELECT AVG(cost_per_unit) INTO v_cost
        FROM storage_batches
        WHERE item_id = v_shortage.product_id
          AND item_type = 'product'
          AND (is_negative = false OR is_negative IS NULL)
          AND status IN ('consumed', 'depleted')
          AND cost_per_unit > 0;
      END IF;

      -- Third: product's last_known_cost
      IF v_cost IS NULL OR v_cost <= 0 THEN
        SELECT COALESCE(last_known_cost, base_cost_per_unit, 0) INTO v_cost
        FROM products
        WHERE id = v_shortage.product_id;
      END IF;

      -- Default to 0 if nothing found (makes problem visible)
      v_cost := COALESCE(v_cost, 0);

      -- 2. Check for existing negative batch
      SELECT * INTO v_existing_batch
      FROM storage_batches
      WHERE item_id = v_shortage.product_id
        AND item_type = 'product'
        AND warehouse_id = v_shortage.warehouse_id
        AND is_negative = true
        AND is_active = true
        AND reconciled_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_existing_batch.id IS NOT NULL THEN
        -- 3a. Update existing negative batch
        UPDATE storage_batches
        SET
          current_quantity = current_quantity - v_shortage.shortage_quantity,
          initial_quantity = initial_quantity - v_shortage.shortage_quantity,
          total_value = (current_quantity - v_shortage.shortage_quantity) * v_cost,
          updated_at = v_now
        WHERE id = v_existing_batch.id
        RETURNING id, batch_number, current_quantity, cost_per_unit
        INTO v_new_batch;

        v_result.batch_id := v_new_batch.id;
        v_result.batch_number := v_new_batch.batch_number;
        v_result.cost_per_unit := v_cost;
        v_result.total_cost := v_shortage.shortage_quantity * v_cost;
        v_result.is_new := false;
      ELSE
        -- 3b. Create new negative batch
        v_batch_id := gen_random_uuid();
        v_batch_number := 'NEG-' || extract(epoch from v_now)::bigint::text;

        INSERT INTO storage_batches (
          id, batch_number, item_id, item_type, warehouse_id,
          initial_quantity, current_quantity, unit, cost_per_unit, total_value,
          receipt_date, source_type, status, is_active, is_negative,
          negative_created_at, negative_reason, source_operation_type,
          created_at, updated_at
        ) VALUES (
          v_batch_id, v_batch_number, v_shortage.product_id, 'product', v_shortage.warehouse_id,
          -v_shortage.shortage_quantity, -v_shortage.shortage_quantity, v_shortage.unit, v_cost, -v_shortage.shortage_quantity * v_cost,
          v_now, 'correction', 'active', true, true,
          v_now, v_shortage.reason, v_shortage.source_operation_type,
          v_now, v_now
        );

        v_result.batch_id := v_batch_id;
        v_result.batch_number := v_batch_number;
        v_result.cost_per_unit := v_cost;
        v_result.total_cost := v_shortage.shortage_quantity * v_cost;
        v_result.is_new := true;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_result.error := SQLERRM;
    END;

    v_results := array_append(v_results, v_result);
  END LOOP;

  RETURN v_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION batch_process_negative_batches(shortage_item[]) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_process_negative_batches(shortage_item[]) TO anon;

-- =====================================================================
-- Batch update storage batches RPC (for allocation updates)
-- =====================================================================
DROP TYPE IF EXISTS batch_update_item CASCADE;
CREATE TYPE batch_update_item AS (
  batch_id uuid,
  quantity_to_subtract numeric
);

DROP TYPE IF EXISTS batch_update_result CASCADE;
CREATE TYPE batch_update_result AS (
  batch_id uuid,
  new_quantity numeric,
  new_status text,
  success boolean,
  error text
);

CREATE OR REPLACE FUNCTION batch_update_storage_batches(
  p_updates batch_update_item[]
)
RETURNS batch_update_result[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_update batch_update_item;
  v_result batch_update_result;
  v_results batch_update_result[] := ARRAY[]::batch_update_result[];
  v_batch RECORD;
  v_new_quantity numeric;
  v_new_status text;
  v_now timestamptz := now();
BEGIN
  FOREACH v_update IN ARRAY p_updates
  LOOP
    v_result := ROW(
      v_update.batch_id,
      0::numeric,
      NULL::text,
      false,
      NULL::text
    )::batch_update_result;

    BEGIN
      -- Get current batch
      SELECT * INTO v_batch
      FROM storage_batches
      WHERE id = v_update.batch_id
      FOR UPDATE;

      IF v_batch IS NULL THEN
        v_result.error := 'Batch not found';
      ELSE
        v_new_quantity := v_batch.current_quantity - v_update.quantity_to_subtract;
        v_new_status := CASE
          WHEN v_new_quantity <= 0 THEN 'consumed'
          ELSE 'active'
        END;

        UPDATE storage_batches
        SET
          current_quantity = v_new_quantity,
          total_value = v_new_quantity * cost_per_unit,
          status = v_new_status,
          is_active = v_new_quantity > 0,
          updated_at = v_now
        WHERE id = v_update.batch_id;

        v_result.new_quantity := v_new_quantity;
        v_result.new_status := v_new_status;
        v_result.success := true;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_result.error := SQLERRM;
    END;

    v_results := array_append(v_results, v_result);
  END LOOP;

  RETURN v_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION batch_update_storage_batches(batch_update_item[]) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_storage_batches(batch_update_item[]) TO anon;

-- =====================================================================
-- Post-migration validation
-- =====================================================================
DO $$
BEGIN
  -- Verify functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'batch_process_negative_batches'
  ) THEN
    RAISE EXCEPTION 'Function batch_process_negative_batches was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'batch_update_storage_batches'
  ) THEN
    RAISE EXCEPTION 'Function batch_update_storage_batches was not created';
  END IF;

  RAISE NOTICE 'Migration 077: Batch negative batch operations created successfully';
END;
$$;
