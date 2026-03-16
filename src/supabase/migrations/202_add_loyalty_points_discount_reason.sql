-- Migration: 202_add_loyalty_points_discount_reason
-- Description: Add 'loyalty_points' and 'stamp_card_reward' to discount_events reason CHECK constraint
-- Date: 2026-03-10

-- Update the reason CHECK constraint to include new loyalty discount reasons
ALTER TABLE discount_events
  DROP CONSTRAINT IF EXISTS discount_events_reason_check;

ALTER TABLE discount_events
  ADD CONSTRAINT discount_events_reason_check
  CHECK (reason = ANY (ARRAY[
    'loyalty_card'::text,
    'loyalty_points'::text,
    'stamp_card_reward'::text,
    'promo_review'::text,
    'compliment'::text,
    'senior_agreement'::text,
    'kitchen_mistake'::text,
    'owner_family'::text,
    'other'::text
  ]));
