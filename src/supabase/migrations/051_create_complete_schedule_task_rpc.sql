-- Migration: 051_create_complete_schedule_task_rpc
-- Description: Creates RPC function to complete production schedule tasks
-- Date: 2024-12-11
-- Author: Claude

-- CONTEXT: The production schedule system needs an RPC function to mark tasks as completed.
-- This function updates the task status, completion details, and returns the updated row.

-- RPC function to complete a production schedule task
-- Updates the task with completion details and returns the updated row

CREATE OR REPLACE FUNCTION complete_production_schedule_task(
  p_task_id UUID,
  p_completed_by UUID,
  p_completed_by_name TEXT,
  p_completed_quantity NUMERIC,
  p_batch_id UUID DEFAULT NULL
)
RETURNS production_schedule
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result production_schedule;
BEGIN
  -- Update the task with completion details
  UPDATE production_schedule
  SET
    status = 'completed',
    completed_at = NOW(),
    completed_by = p_completed_by,
    completed_by_name = p_completed_by_name,
    completed_quantity = p_completed_quantity,
    preparation_batch_id = p_batch_id,
    sync_status = 'synced',
    synced_at = NOW(),
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING * INTO v_result;

  -- Check if task was found
  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Task not found: %', p_task_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_production_schedule_task(UUID, UUID, TEXT, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_production_schedule_task(UUID, UUID, TEXT, NUMERIC, UUID) TO anon;

-- POST-MIGRATION VALIDATION
-- Test by calling: SELECT complete_production_schedule_task('task-uuid', 'user-uuid', 'User Name', 100, null);
