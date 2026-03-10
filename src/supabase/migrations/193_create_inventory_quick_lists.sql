-- Migration: 193_create_inventory_quick_lists
-- Description: Table for Quick Inventory Lists (shared across devices)
-- Date: 2026-03-10

CREATE TABLE IF NOT EXISTS inventory_quick_lists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('kitchen', 'bar')),
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_quick_lists_updated_at
  BEFORE UPDATE ON inventory_quick_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE inventory_quick_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
  ON inventory_quick_lists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant access
GRANT ALL ON inventory_quick_lists TO authenticated;
GRANT ALL ON inventory_quick_lists TO service_role;
