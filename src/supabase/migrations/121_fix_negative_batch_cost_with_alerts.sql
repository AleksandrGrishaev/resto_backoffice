-- Migration: 121_fix_negative_batch_cost_with_alerts
-- Description: Fix cost calculation order and add alerts for missing cost data
-- Date: 2026-01-31
--
-- Cost fallback order:
-- 1. Active batch (текущий остаток)
-- 2. Depleted batch (последний из истории)
-- 3. last_known_cost (кеш последней закупки)
-- 4. base_cost_per_unit (ручной fallback)
-- 5. 0 + CREATE ALERT (показать проблему)

CREATE OR REPLACE FUNCTION batch_process_negative_batches(
  p_shortages shortage_item[]
)
RETURNS shortage_result[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  v_counter int := 0;
  v_product_name text;
  v_product_unit text;
BEGIN
  FOREACH v_shortage IN ARRAY p_shortages
  LOOP
    v_counter := v_counter + 1;

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
      -- Get product info for alerts
      SELECT name, base_unit INTO v_product_name, v_product_unit
      FROM products WHERE id = v_shortage.product_id;

      -- ==========================================
      -- COST CALCULATION (correct order)
      -- ==========================================

      -- 1. Active batch (текущий остаток)
      SELECT cost_per_unit INTO v_cost
      FROM storage_batches
      WHERE item_id = v_shortage.product_id::text
        AND item_type = 'product'
        AND (is_negative = false OR is_negative IS NULL)
        AND current_quantity > 0
        AND cost_per_unit > 0
      ORDER BY created_at DESC
      LIMIT 1;

      -- 2. Depleted batch (последний из истории)
      IF v_cost IS NULL OR v_cost <= 0 THEN
        SELECT cost_per_unit INTO v_cost
        FROM storage_batches
        WHERE item_id = v_shortage.product_id::text
          AND item_type = 'product'
          AND (is_negative = false OR is_negative IS NULL)
          AND status IN ('consumed', 'depleted')
          AND cost_per_unit > 0
        ORDER BY receipt_date DESC
        LIMIT 1;
      END IF;

      -- 3. last_known_cost (кеш последней закупки)
      IF v_cost IS NULL OR v_cost <= 0 THEN
        SELECT last_known_cost INTO v_cost
        FROM products
        WHERE id = v_shortage.product_id
          AND last_known_cost > 0;
      END IF;

      -- 4. base_cost_per_unit (ручной fallback)
      IF v_cost IS NULL OR v_cost <= 0 THEN
        SELECT base_cost_per_unit INTO v_cost
        FROM products
        WHERE id = v_shortage.product_id
          AND base_cost_per_unit > 0;
      END IF;

      -- 5. Zero - показать проблему + создать alert
      IF v_cost IS NULL OR v_cost <= 0 THEN
        v_cost := 0;

        -- Create alert for missing cost data
        INSERT INTO operations_alerts (
          id, category, type, severity, title, description, metadata, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          'inventory',
          'missing_cost_data',
          'warning',
          'Missing cost data for product',
          format('Product "%s" has no cost data. Negative batch created with cost=0. Please set base_cost_per_unit or create a receipt.', v_product_name),
          jsonb_build_object(
            'product_id', v_shortage.product_id,
            'product_name', v_product_name,
            'shortage_quantity', v_shortage.shortage_quantity,
            'unit', COALESCE(v_product_unit, v_shortage.unit),
            'reason', v_shortage.reason,
            'source_operation_type', v_shortage.source_operation_type
          ),
          'new',
          v_now,
          v_now
        );
      END IF;

      -- ==========================================
      -- NEGATIVE BATCH PROCESSING
      -- ==========================================

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
        -- Update existing negative batch
        UPDATE storage_batches
        SET
          current_quantity = current_quantity - v_shortage.shortage_quantity,
          initial_quantity = initial_quantity - v_shortage.shortage_quantity,
          cost_per_unit = v_cost,
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
        -- Create new negative batch
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
$$;
