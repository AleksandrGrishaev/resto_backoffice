-- Migration: 146_add_channel_commission_categories
-- Description: Add channel-specific commission categories for GoJek and Grab
-- Date: 2026-02-06

-- CONTEXT: ShiftSyncAdapter creates commission expense transactions when syncing
-- delivery channel orders. Channel-specific categories allow P&L to break down
-- commissions by platform. These are Cost of Revenue (is_opex=false), not OPEX.

-- Ensure platform_commission exists (from migration 145)
INSERT INTO transaction_categories (id, code, name, type, is_opex, is_system, is_active, sort_order, description)
VALUES (gen_random_uuid(), 'platform_commission', 'Platform Commission', 'expense', false, true, true, 23, 'Generic platform commission (fallback)')
ON CONFLICT (code) DO NOTHING;

-- Channel-specific commission categories
INSERT INTO transaction_categories (id, code, name, type, is_opex, is_system, is_active, sort_order, description)
VALUES
  (gen_random_uuid(), 'gojek_commission', 'GoJek Commission', 'expense', false, true, true, 24, 'GoFood/GoBiz platform commission'),
  (gen_random_uuid(), 'grab_commission', 'Grab Commission', 'expense', false, true, true, 25, 'GrabFood platform commission')
ON CONFLICT (code) DO NOTHING;
