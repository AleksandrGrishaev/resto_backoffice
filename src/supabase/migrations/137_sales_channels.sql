-- Migration: 137_sales_channels
-- Description: Create sales channels architecture for multi-channel pricing and tax rates
-- Date: 2026-02-05

-- 0. Ensure update_updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Sales Channels table
CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('internal', 'delivery_platform', 'pickup')),
  is_active BOOLEAN DEFAULT true,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 11,
  settings JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Channel Prices - override prices per variant per channel
CREATE TABLE IF NOT EXISTS channel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, menu_item_id, variant_id)
);

-- 3. Channel Menu Items - availability & external mapping
CREATE TABLE IF NOT EXISTS channel_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true,
  external_id TEXT,
  external_category_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, menu_item_id)
);

-- 4. Indexes
CREATE INDEX idx_channel_prices_channel ON channel_prices(channel_id);
CREATE INDEX idx_channel_prices_menu_item ON channel_prices(menu_item_id);
CREATE INDEX idx_channel_menu_items_channel ON channel_menu_items(channel_id);
CREATE INDEX idx_channel_menu_items_menu_item ON channel_menu_items(menu_item_id);
CREATE INDEX idx_channel_menu_items_external ON channel_menu_items(channel_id, external_id) WHERE external_id IS NOT NULL;

-- 5. Seed default channels
INSERT INTO sales_channels (code, name, type, is_active, commission_percent, tax_percent, sort_order)
VALUES
  ('dine_in', 'Dine In', 'internal', true, 0, 11, 1),
  ('takeaway', 'Takeaway', 'pickup', true, 0, 11, 2),
  ('gobiz', 'GoFood', 'delivery_platform', false, 20, 0, 3),
  ('grab', 'Grab Food', 'delivery_platform', false, 25, 0, 4)
ON CONFLICT (code) DO NOTHING;

-- 6. Add channel_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES sales_channels(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_status TEXT;

-- 7. Backfill existing orders with dine_in channel
UPDATE orders
SET channel_id = (SELECT id FROM sales_channels WHERE code = 'dine_in')
WHERE channel_id IS NULL;

-- 8. RLS Policies
ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read sales_channels" ON sales_channels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage sales_channels" ON sales_channels
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read channel_prices" ON channel_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage channel_prices" ON channel_prices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read channel_menu_items" ON channel_menu_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage channel_menu_items" ON channel_menu_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Update timestamp triggers
CREATE TRIGGER update_sales_channels_updated_at
  BEFORE UPDATE ON sales_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_channel_prices_updated_at
  BEFORE UPDATE ON channel_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_channel_menu_items_updated_at
  BEFORE UPDATE ON channel_menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
