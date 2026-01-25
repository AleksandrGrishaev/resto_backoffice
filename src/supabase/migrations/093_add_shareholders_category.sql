-- Migration: 093_add_shareholders_category
-- Description: Add shareholders payout category for profit distribution
-- Date: 2026-01-25

-- Add shareholders category (if not exists)
INSERT INTO transaction_categories (code, name, type, is_opex, is_system, sort_order, description)
VALUES ('shareholders', 'Shareholders Payout', 'expense', false, false, 100, 'Profit distribution to shareholders/investors')
ON CONFLICT (code) DO NOTHING;
