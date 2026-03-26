-- Migration: 191_grant_loyalty_tables_access
-- Description: Grant authenticated/service_role access to loyalty tables
-- Date: 2026-03-09
-- Context: POS cashiers need to search/create customers, manage stamp cards

GRANT SELECT, INSERT, UPDATE ON customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stamp_cards TO authenticated;
GRANT SELECT ON loyalty_settings TO authenticated;
GRANT SELECT, INSERT ON loyalty_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON loyalty_points TO authenticated;

GRANT ALL ON customers TO service_role;
GRANT ALL ON stamp_cards TO service_role;
GRANT ALL ON loyalty_settings TO service_role;
GRANT ALL ON loyalty_transactions TO service_role;
GRANT ALL ON loyalty_points TO service_role;
