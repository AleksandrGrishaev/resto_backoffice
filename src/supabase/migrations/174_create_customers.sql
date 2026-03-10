-- Migration: 174_create_customers
-- Description: Customer profiles for digital loyalty (Block 2)
-- Date: 2026-03-09

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  telegram_id     TEXT UNIQUE,
  telegram_username TEXT,
  phone           TEXT,
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  tier            TEXT NOT NULL DEFAULT 'member' CHECK (tier IN ('member', 'regular', 'vip')),
  tier_updated_at TIMESTAMPTZ,
  loyalty_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent_90d       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_visits    INTEGER NOT NULL DEFAULT 0,
  average_check   NUMERIC(12,2) NOT NULL DEFAULT 0,
  first_visit_at  TIMESTAMPTZ,
  last_visit_at   TIMESTAMPTZ,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_telegram ON customers(telegram_id);
CREATE INDEX idx_customers_token ON customers(token);
CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_phone ON customers(phone);

CREATE OR REPLACE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON customers TO service_role;
