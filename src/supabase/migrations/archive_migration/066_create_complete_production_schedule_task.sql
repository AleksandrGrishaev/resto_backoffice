-- Migration: 066_create_complete_production_schedule_task
-- Description: Create RPC function to complete production schedule tasks
-- Date: 2025-01-13
-- Author: Claude

-- CONTEXT:
-- ScheduleConfirmDialog uses background task processing to complete production schedule tasks.
-- This RPC function marks tasks as completed and links them to preparation batches.
-- p_completed_by is optional (NULL) for system actions like auto-fulfill.

-- Create or replace the function
CREATE OR REPLACE FUNCTION complete_production_schedule_task(
  p_task_id uuid,
  p_completed_by uuid DEFAULT NULL,
  p_completed_by_name text DEFAULT NULL,
  p_completed_quantity numeric DEFAULT NULL,
  p_batch_id uuid DEFAULT NULL
)
RETURNS production_schedule
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task production_schedule;
BEGIN
  -- Update the task
  UPDATE production_schedule
  SET
    status = 'completed',
    completed_at = NOW(),
    completed_by = p_completed_by,
    completed_by_name = COALESCE(p_completed_by_name, 'Unknown'),
    completed_quantity = COALESCE(p_completed_quantity, target_quantity),
    preparation_batch_id = p_batch_id,
    updated_at = NOW()
  WHERE id = p_task_id
    AND status IN ('pending', 'in_progress')
  RETURNING * INTO v_task;

  -- Check if task was found and updated
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found or already completed: %', p_task_id;
  END IF;

  RETURN v_task;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_production_schedule_task(uuid, uuid, text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_production_schedule_task(uuid, uuid, text, numeric, uuid) TO anon;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
