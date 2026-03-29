-- Migration: 249_add_task_type_to_production_schedule
-- Description: Add task_type column to support write-off tasks in production schedule
-- Date: 2026-03-25

-- CONTEXT: Write-off tasks (expired items) should appear in the same checklist
-- as production tasks, so kitchen staff sees everything in one place.

ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'production';

-- Add check constraint
ALTER TABLE production_schedule ADD CONSTRAINT chk_task_type
  CHECK (task_type IN ('production', 'write_off'));

COMMENT ON COLUMN production_schedule.task_type IS 'Task type: production (make something) or write_off (dispose expired)';
