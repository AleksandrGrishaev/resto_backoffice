-- Migration: 295_add_defrost_task_type
-- Description: Add 'defrost' to task_type CHECK constraint on production_schedule
-- Date: 2026-04-11

-- Drop old constraint and add new one with 'defrost' value
ALTER TABLE production_schedule DROP CONSTRAINT IF EXISTS chk_task_type;

ALTER TABLE production_schedule ADD CONSTRAINT chk_task_type
  CHECK (task_type IN ('production', 'write_off', 'defrost'));

COMMENT ON COLUMN production_schedule.task_type IS 'Task type: production (make something), write_off (dispose expired), or defrost (move from freezer to fridge)';
