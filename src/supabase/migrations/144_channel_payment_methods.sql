-- Migration: 144_channel_payment_methods
-- Description: Junction table linking sales channels to payment methods
-- Date: 2026-02-05

-- CONTEXT: Each channel can have specific payment methods (e.g. GoJek only shows GoPay)

CREATE TABLE IF NOT EXISTS channel_payment_methods (
  id TEXT PRIMARY KEY DEFAULT ('cpm_' || gen_random_uuid()),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, payment_method_id)
);

-- RLS
ALTER TABLE channel_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read" ON channel_payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write" ON channel_payment_methods FOR ALL TO authenticated USING (true);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_payment_methods TO authenticated;
GRANT SELECT ON channel_payment_methods TO anon;

-- Seed: link ALL active payment methods to ALL channels by default
INSERT INTO channel_payment_methods (channel_id, payment_method_id)
SELECT sc.id, pm.id
FROM sales_channels sc
CROSS JOIN payment_methods pm
WHERE pm.is_active = true
ON CONFLICT DO NOTHING;
