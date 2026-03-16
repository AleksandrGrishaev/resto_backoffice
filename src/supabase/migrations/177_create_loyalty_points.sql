-- Migration: 177_create_loyalty_points
-- Description: Points with individual expiration dates for FIFO redemption
-- Date: 2026-03-09

CREATE TABLE loyalty_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount      NUMERIC(12,2) NOT NULL,
  remaining   NUMERIC(12,2) NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('cashback', 'conversion', 'adjustment', 'bonus')),
  order_id    UUID REFERENCES orders(id),
  description TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX idx_loyalty_points_expires ON loyalty_points(expires_at);
CREATE INDEX idx_loyalty_points_active ON loyalty_points(customer_id, remaining) WHERE remaining > 0;

GRANT ALL ON loyalty_points TO service_role;
