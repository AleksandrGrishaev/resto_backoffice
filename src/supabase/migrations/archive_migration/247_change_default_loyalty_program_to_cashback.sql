-- Migration: 247_change_default_loyalty_program_to_cashback
-- Description: Change default loyalty_program from 'stamps' to 'cashback'
-- Date: 2026-03-25
--
-- CONTEXT: Customers created from POS (LoyaltyPanel.vue) without a stamp card
-- were assigned loyalty_program='stamps' by default. Since no stamp card was
-- created for them, they earned neither stamps nor cashback — effectively
-- getting zero rewards despite repeat visits.
--
-- With 'cashback' as default, new customers immediately start earning
-- tier-based cashback (5% member, 7% regular, 10% family).
-- Customers who DO get a physical stamp card will still be set to 'stamps'
-- explicitly via the stamp card creation flow.

ALTER TABLE customers ALTER COLUMN loyalty_program SET DEFAULT 'cashback';
