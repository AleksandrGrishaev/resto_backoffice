-- Migration: 254_add_time_slots_and_shift_presets
-- Description: Add time_slots JSONB to work logs + shift presets table
-- Date: 2026-03-26

-- 1. Add time_slots column to staff_work_logs
ALTER TABLE staff_work_logs ADD COLUMN IF NOT EXISTS time_slots JSONB DEFAULT NULL;
-- Format: [{"start": 8, "end": 16}, {"start": 18, "end": 22}]
-- NULL = legacy entry (hours_worked is authoritative)
-- When present, hours_worked is auto-computed from slots in app layer

-- 2. Create shift presets table
CREATE TABLE IF NOT EXISTS staff_shift_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_hour INT NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour INT NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24 AND end_hour > start_hour),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_shift_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON staff_shift_presets FOR ALL USING (is_staff()) WITH CHECK (is_staff());

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff_shift_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON staff_shift_presets TO authenticated;
GRANT ALL ON staff_shift_presets TO service_role;

-- 3. Seed default presets
INSERT INTO staff_shift_presets (name, start_hour, end_hour, sort_order) VALUES
  ('Full Day', 8, 22, 1),
  ('Morning', 8, 16, 2),
  ('Evening', 14, 22, 3);
