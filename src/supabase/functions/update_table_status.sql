-- update_table_status RPC
-- Atomic table status update with row-level locking and idempotent re-occupy
-- Returns JSONB { success, data (full row), error?, noop? }
--
-- Replaces client-side optimistic lock (.in('status', ['available']))
-- which couldn't handle re-occupy of same order's table

CREATE OR REPLACE FUNCTION update_table_status(
  p_table_id UUID,
  p_status TEXT,                    -- 'available' | 'occupied' | 'reserved'
  p_order_id UUID DEFAULT NULL,
  p_expected_order_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table RECORD;
  v_result RECORD;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT * INTO v_table FROM tables WHERE id = p_table_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table not found');
  END IF;

  -- OCCUPY logic
  IF p_status = 'occupied' THEN
    IF v_table.status = 'available' OR v_table.status = 'reserved' THEN
      -- Normal occupy: table is free or reserved -> allow
      NULL; -- proceed to update below
    ELSIF v_table.status = 'occupied' AND v_table.current_order_id IS NOT DISTINCT FROM p_order_id THEN
      -- Idempotent re-occupy: same order already owns this table -> no-op success
      RETURN jsonb_build_object(
        'success', true,
        'data', row_to_json(v_table)::jsonb,
        'noop', true
      );
    ELSE
      -- Table occupied by a different order -> reject
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Table is already occupied by another order',
        'current_order_id', v_table.current_order_id
      );
    END IF;
  END IF;

  -- FREE logic with conditional guard
  IF p_status = 'available' AND p_expected_order_id IS NOT NULL THEN
    IF v_table.current_order_id IS DISTINCT FROM p_expected_order_id THEN
      -- Table owned by a different order -> no-op (not an error, table already reassigned)
      RETURN jsonb_build_object(
        'success', true,
        'data', row_to_json(v_table)::jsonb,
        'noop', true
      );
    END IF;
  END IF;

  -- Perform the update
  UPDATE tables
  SET status = p_status,
      current_order_id = CASE WHEN p_status = 'available' THEN NULL ELSE p_order_id END,
      updated_at = NOW()
  WHERE id = p_table_id
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_result)::jsonb
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
