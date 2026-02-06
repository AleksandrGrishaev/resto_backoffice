-- Migration: 145_add_platform_commission_category
-- Description: Add platform_commission transaction category for delivery platform fees
-- Date: 2026-02-05

-- CONTEXT: When shifts sync to Account Store, commission expenses need to be recorded
-- for delivery channels (GoFood 20%, Grab 25%, etc.). This category tracks those fees.

INSERT INTO transaction_categories (id, code, name, type, is_opex, is_system, is_active, sort_order, description)
VALUES (
  gen_random_uuid(), 'platform_commission', 'Platform Commission', 'expense',
  false, true, true, 23,
  'Commission fees charged by delivery platforms (GoFood, Grab, etc.)'
) ON CONFLICT (code) DO NOTHING;
