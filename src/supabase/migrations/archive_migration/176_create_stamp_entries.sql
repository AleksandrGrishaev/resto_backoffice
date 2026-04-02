-- Migration: 176_create_stamp_entries
-- Description: Individual stamp records with expiration
-- Date: 2026-03-09

CREATE TABLE stamp_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID NOT NULL REFERENCES stamp_cards(id),
  order_id     UUID REFERENCES orders(id),
  order_amount NUMERIC(12,2) NOT NULL,
  stamps       INTEGER NOT NULL,
  cycle        INTEGER NOT NULL DEFAULT 1,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stamp_entries_card ON stamp_entries(card_id);
CREATE INDEX idx_stamp_entries_expires ON stamp_entries(expires_at);

GRANT ALL ON stamp_entries TO service_role;
