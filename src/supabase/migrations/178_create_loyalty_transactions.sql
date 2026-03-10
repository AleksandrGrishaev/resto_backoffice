-- Migration: 178_create_loyalty_transactions
-- Description: Full log of all loyalty operations (cashback, redemption, expiration, etc.)
-- Date: 2026-03-09

CREATE TABLE loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  type          TEXT NOT NULL CHECK (type IN ('cashback', 'redemption', 'conversion', 'adjustment', 'expiration')),
  amount        NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  order_id      UUID REFERENCES orders(id),
  description   TEXT,
  performed_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_tx_customer ON loyalty_transactions(customer_id);

GRANT ALL ON loyalty_transactions TO service_role;
