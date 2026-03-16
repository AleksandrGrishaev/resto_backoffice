-- Migration: 180_orders_loyalty_columns
-- Description: Add customer_id and stamp_card_id to orders for loyalty tracking
-- Date: 2026-03-09

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stamp_card_id UUID REFERENCES stamp_cards(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stamp_card ON orders(stamp_card_id);
