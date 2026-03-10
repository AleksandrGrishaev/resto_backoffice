-- Migration: 175_create_stamp_cards
-- Description: Physical stamp cards (Block 1)
-- Date: 2026-03-09

CREATE TABLE stamp_cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number  TEXT UNIQUE NOT NULL,
  customer_id  UUID REFERENCES customers(id),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired')),
  cycle        INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_stamp_cards_number ON stamp_cards(card_number);
CREATE INDEX idx_stamp_cards_status ON stamp_cards(status);

GRANT ALL ON stamp_cards TO service_role;
