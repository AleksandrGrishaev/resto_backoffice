-- Migration: 141_taxes_and_channel_taxes
-- Description: Create taxes table, channel_taxes junction, add tax_mode to sales_channels
-- Date: 2026-02-05

-- =====================================================
-- 1. CREATE TAXES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
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

CREATE TRIGGER set_taxes_updated_at
  BEFORE UPDATE ON taxes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxes_select_authenticated" ON taxes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "taxes_insert_authenticated" ON taxes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "taxes_update_authenticated" ON taxes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "taxes_delete_authenticated" ON taxes
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 2. CREATE CHANNEL_TAXES JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS channel_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  tax_id UUID NOT NULL REFERENCES taxes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, tax_id)
);

CREATE INDEX idx_channel_taxes_channel_id ON channel_taxes(channel_id);
CREATE INDEX idx_channel_taxes_tax_id ON channel_taxes(tax_id);

-- RLS
ALTER TABLE channel_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_taxes_select_authenticated" ON channel_taxes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "channel_taxes_insert_authenticated" ON channel_taxes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "channel_taxes_update_authenticated" ON channel_taxes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "channel_taxes_delete_authenticated" ON channel_taxes
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 3. ADD TAX_MODE TO SALES_CHANNELS
-- =====================================================

ALTER TABLE sales_channels
  ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'exclusive'
  CHECK (tax_mode IN ('exclusive', 'inclusive'));

-- =====================================================
-- 4. SEED DATA
-- =====================================================

-- Insert default taxes
INSERT INTO taxes (name, percentage, is_active, sort_order)
VALUES
  ('Service Tax', 5, true, 1),
  ('Local Tax', 10, true, 2)
ON CONFLICT DO NOTHING;

-- Set tax_mode: dine_in/takeaway = exclusive, gobiz/grab = inclusive
UPDATE sales_channels SET tax_mode = 'inclusive' WHERE code IN ('gobiz', 'grab');
UPDATE sales_channels SET tax_mode = 'exclusive' WHERE code IN ('dine_in', 'takeaway');

-- Link both taxes to all 4 channels
INSERT INTO channel_taxes (channel_id, tax_id)
SELECT sc.id, t.id
FROM sales_channels sc
CROSS JOIN taxes t
WHERE sc.code IN ('dine_in', 'takeaway', 'gobiz', 'grab')
ON CONFLICT (channel_id, tax_id) DO NOTHING;

-- Update tax_percent to 15 for all seeded channels (5 + 10)
UPDATE sales_channels SET tax_percent = 15 WHERE code IN ('dine_in', 'takeaway', 'gobiz', 'grab');

-- =====================================================
-- 5. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_taxes_is_active ON taxes(is_active);
CREATE INDEX IF NOT EXISTS idx_taxes_sort_order ON taxes(sort_order);
