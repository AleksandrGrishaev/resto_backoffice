-- Migration: 252_ritual_completions
-- Description: Records of completed morning/evening rituals with task details
-- Date: 2026-03-26

CREATE TABLE ritual_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL DEFAULT (current_setting('app.restaurant_id', true))::uuid,
  ritual_type TEXT NOT NULL CHECK (ritual_type IN ('morning', 'evening')),
  department TEXT NOT NULL DEFAULT 'kitchen',
  completed_by UUID,
  completed_by_name TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  custom_tasks_completed INTEGER NOT NULL DEFAULT 0,
  schedule_tasks_completed INTEGER NOT NULL DEFAULT 0,
  task_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ritual_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all" ON ritual_completions
  FOR ALL USING (is_staff());

-- Indexes
CREATE INDEX idx_ritual_completions_type_date
  ON ritual_completions (ritual_type, completed_at DESC);

CREATE INDEX idx_ritual_completions_department_date
  ON ritual_completions (department, completed_at DESC);

CREATE INDEX idx_ritual_completions_completed_by
  ON ritual_completions (completed_by);

-- Grants
GRANT ALL ON ritual_completions TO authenticated;
GRANT ALL ON ritual_completions TO service_role;

COMMENT ON TABLE ritual_completions IS 'History of completed kitchen rituals with timing and task details';
COMMENT ON COLUMN ritual_completions.task_details IS 'JSONB array: [{taskId, name, type, completed, completedAt, quantity?}]';
COMMENT ON COLUMN ritual_completions.duration_minutes IS 'Time from ritual start to finish in minutes';
