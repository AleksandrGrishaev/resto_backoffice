-- Migration: 204_create_stamp_reward_redemptions
-- Description: Track stamp card reward redemptions (one-time per tier per cycle)
-- Date: 2026-03-10
-- Context: Phase 6 — prevent infinite reward reuse

CREATE TABLE IF NOT EXISTS stamp_reward_redemptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id           UUID NOT NULL REFERENCES stamp_cards(id),
  cycle             INTEGER NOT NULL DEFAULT 1,
  order_id          UUID REFERENCES orders(id),
  payment_id        UUID REFERENCES payments(id),
  discount_event_id UUID REFERENCES discount_events(id),
  reward_tier       INTEGER NOT NULL,          -- stamps threshold (5, 10, 15)
  category          TEXT NOT NULL,             -- display label ("drinks", "breakfast", "any")
  category_ids      JSONB NOT NULL DEFAULT '[]', -- menu_categories UUIDs used for validation
  max_discount      NUMERIC(12,2) NOT NULL,
  actual_discount   NUMERIC(12,2) NOT NULL,
  stamps_at_redemption INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_stamp_reward_redemptions_card_id ON stamp_reward_redemptions(card_id);
CREATE INDEX idx_stamp_reward_redemptions_card_cycle ON stamp_reward_redemptions(card_id, cycle);
CREATE INDEX idx_stamp_reward_redemptions_order_id ON stamp_reward_redemptions(order_id);

-- Unique: each tier can only be redeemed once per card per cycle
CREATE UNIQUE INDEX idx_stamp_reward_redemptions_unique_tier
  ON stamp_reward_redemptions(card_id, cycle, reward_tier);

-- Grants
GRANT ALL ON stamp_reward_redemptions TO authenticated;
GRANT ALL ON stamp_reward_redemptions TO service_role;

-- RLS
ALTER TABLE stamp_reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on stamp_reward_redemptions"
  ON stamp_reward_redemptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
