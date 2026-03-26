-- Migration: 251_ritual_custom_tasks
-- Description: Custom tasks for morning/evening rituals (e.g. "Clean fridge", "Check expiry dates")
-- Date: 2026-03-26

CREATE TABLE ritual_custom_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL DEFAULT (current_setting('app.restaurant_id', true))::uuid,
  name TEXT NOT NULL,
  ritual_type TEXT NOT NULL CHECK (ritual_type IN ('morning', 'evening')),
  department TEXT NOT NULL DEFAULT 'kitchen',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ritual_custom_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all" ON ritual_custom_tasks
  FOR ALL USING (is_staff());

-- Updated_at trigger
CREATE TRIGGER update_ritual_custom_tasks_updated_at
  BEFORE UPDATE ON ritual_custom_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index for querying active tasks by type
CREATE INDEX idx_ritual_custom_tasks_type_active
  ON ritual_custom_tasks (ritual_type, is_active);

-- Grants
GRANT ALL ON ritual_custom_tasks TO authenticated;
GRANT ALL ON ritual_custom_tasks TO service_role;

COMMENT ON TABLE ritual_custom_tasks IS 'Custom checklist tasks for morning/evening kitchen rituals';
COMMENT ON COLUMN ritual_custom_tasks.ritual_type IS 'morning or evening ritual';
COMMENT ON COLUMN ritual_custom_tasks.department IS 'Department this task belongs to (kitchen, bar, etc.)';
