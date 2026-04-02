-- Migration: 242_staff_ranks
-- Description: Create staff_ranks table for salary grades
-- Date: 2026-03-24

CREATE TABLE staff_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON staff_ranks FOR ALL USING (is_staff()) WITH CHECK (is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff_ranks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON staff_ranks TO authenticated;
GRANT ALL ON staff_ranks TO service_role;

-- Seed default ranks
INSERT INTO staff_ranks (name, base_salary, sort_order) VALUES
  ('Junior', 2000000, 1),
  ('Senior', 2300000, 2);
