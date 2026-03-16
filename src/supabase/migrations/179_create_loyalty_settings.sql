-- Migration: 179_create_loyalty_settings
-- Description: Settings for both Block 1 (stamps) and Block 2 (points/tiers)
-- Date: 2026-03-09

CREATE TABLE loyalty_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Block 1: Stamps
  stamps_per_cycle      INTEGER NOT NULL DEFAULT 15,
  stamp_threshold       NUMERIC(12,2) NOT NULL DEFAULT 80000,
  stamp_lifetime_days   INTEGER NOT NULL DEFAULT 90,
  stamp_rewards         JSONB NOT NULL DEFAULT '[
    {"stamps": 5,  "category": "drinks",     "max_discount": 40000},
    {"stamps": 10, "category": "breakfast",   "max_discount": 75000},
    {"stamps": 15, "category": "any",         "max_discount": 100000}
  ]'::jsonb,
  -- Block 2: Points
  points_lifetime_days  INTEGER NOT NULL DEFAULT 90,
  conversion_bonus_pct  NUMERIC(5,2) NOT NULL DEFAULT 10,
  tier_window_days      INTEGER NOT NULL DEFAULT 90,
  max_tier_degradation  INTEGER NOT NULL DEFAULT 1,
  tiers                 JSONB NOT NULL DEFAULT '[
    {"name": "member",  "cashback_pct": 5,  "spending_threshold": 0},
    {"name": "regular", "cashback_pct": 7,  "spending_threshold": 1500000},
    {"name": "vip",     "cashback_pct": 10, "spending_threshold": 3000000}
  ]'::jsonb,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO loyalty_settings DEFAULT VALUES;

GRANT ALL ON loyalty_settings TO service_role;
