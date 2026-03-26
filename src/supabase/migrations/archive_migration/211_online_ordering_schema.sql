-- Migration: 211_online_ordering_schema
-- Description: Add online ordering support columns, order_counters table, kitchen_hours setting
-- Date: 2026-03-15

-- ============================================================
-- 1. New columns on orders table for online ordering
-- ============================================================

-- Customer phone (for takeaway/goshop contact)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Free-text table number preference from website (distinct from table_id FK)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number TEXT;

-- Pickup time: 'asap' or 'HH:MM' format
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_time TEXT;

-- Customer-facing comment (distinct from internal 'notes')
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comment TEXT;

-- Order source: where the order was created
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pos';

-- Fulfillment method for takeaway orders: self_pickup, goshop, courier
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_method TEXT;

-- ============================================================
-- 2. Order counters for sequential website order numbers (SK-{N})
-- ============================================================

CREATE TABLE IF NOT EXISTS order_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_date DATE NOT NULL UNIQUE,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service_role and authenticated POS users need access
ALTER TABLE order_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_counters_all" ON order_counters
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON order_counters TO service_role;
GRANT ALL ON order_counters TO authenticated;

-- ============================================================
-- 3. Kitchen hours in website_settings
-- ============================================================

INSERT INTO website_settings (key, value)
VALUES (
  'kitchen_hours',
  '{
    "enabled": true,
    "schedule": {
      "mon": { "open": "09:00", "close": "21:00" },
      "tue": { "open": "09:00", "close": "21:00" },
      "wed": { "open": "09:00", "close": "21:00" },
      "thu": { "open": "09:00", "close": "21:00" },
      "fri": { "open": "09:00", "close": "21:00" },
      "sat": { "open": "10:00", "close": "21:00" },
      "sun": { "open": "10:00", "close": "21:00" }
    }
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. Backfill existing orders with source = 'pos'
-- ============================================================

UPDATE orders SET source = 'pos' WHERE source IS NULL;
