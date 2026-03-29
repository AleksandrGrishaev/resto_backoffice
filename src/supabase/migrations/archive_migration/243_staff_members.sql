-- Migration: 243_staff_members
-- Description: Create staff_members table
-- Date: 2026-03-24

CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  department TEXT NOT NULL CHECK (department IN ('kitchen', 'bar', 'service', 'management')),
  rank_id UUID REFERENCES staff_ranks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all ON staff_members FOR ALL USING (is_staff()) WITH CHECK (is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON staff_members TO authenticated;
GRANT ALL ON staff_members TO service_role;
