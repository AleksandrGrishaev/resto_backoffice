-- Migration: 118_fix_batch_negative_batch_unique_numbers
-- Description: Fix duplicate batch_number generation in batch_process_negative_batches RPC
-- Date: 2026-01-30
-- Author: Claude

-- CONTEXT:
-- Bug: When batch processing multiple shortages, all got the same batch_number
-- because v_now was set once at the start of the function, generating:
--   'NEG-' || extract(epoch from v_now)::bigint::text
-- which was identical for all shortages in the batch.
--
-- This caused "duplicate key value violates unique constraint" errors.
--
-- Fix: Added a counter that increments for each shortage, appended to batch number:
--   'NEG-' || timestamp || '-' || counter

CREATE OR REPLACE FUNCTION public.batch_process_negative_batches(p_shortages shortage_item[])
 RETURNS shortage_result[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_shortage shortage_item;
  v_result shortage_result;
  v_results shortage_result[] := ARRAY[]::shortage_result[];
  v_cost numeric;
  v_existing_batch RECORD;
  v_new_batch RECORD;
  v_batch_number text;
  v_batch_id text;
  v_now timestamptz := now();
  v_counter int := 0;  -- Counter for unique batch numbers
BEGIN
  -- Process each shortage
  FOREACH v_shortage IN ARRAY p_shortages
  LOOP
    v_counter := v_counter + 1;  -- Increment counter for each item

    v_result := ROW(
      v_shortage.product_id,
      NULL::text,
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
      WHERE item_id = v_shortage.product_id::text
        AND item_type = 'product'
        AND (is_negative = false OR is_negative IS NULL)
        AND current_quantity > 0
      ORDER BY created_at DESC
      LIMIT 1;

      -- Second: average from depleted batches
      IF v_cost IS NULL OR v_cost <= 0 THEN
        SELECT AVG(cost_per_unit) INTO v_cost
        FROM storage_batches
        WHERE item_id = v_shortage.product_id::text
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
      WHERE item_id = v_shortage.product_id::text
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
        -- FIX: Generate unique batch number with counter suffix
        v_batch_id := gen_random_uuid()::text;
        v_batch_number := 'NEG-' || extract(epoch from v_now)::bigint::text || '-' || v_counter::text;

        INSERT INTO storage_batches (
          id, batch_number, item_id, item_type, warehouse_id,
          initial_quantity, current_quantity, unit, cost_per_unit, total_value,
          receipt_date, source_type, status, is_active, is_negative,
          negative_created_at, negative_reason, source_operation_type,
          created_at, updated_at
        ) VALUES (
          v_batch_id, v_batch_number, v_shortage.product_id::text, 'product', v_shortage.warehouse_id,
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
$function$;
