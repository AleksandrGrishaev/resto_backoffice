-- Migration: 205_discount_events_stamp_card_id
-- Description: Add stamp_card_id to discount_events for audit trail
-- Date: 2026-03-10
-- Context: Phase 6 — link discount events to the stamp card that granted the reward

ALTER TABLE discount_events
  ADD COLUMN IF NOT EXISTS stamp_card_id UUID REFERENCES stamp_cards(id);

CREATE INDEX IF NOT EXISTS idx_discount_events_stamp_card_id
  ON discount_events(stamp_card_id)
  WHERE stamp_card_id IS NOT NULL;
