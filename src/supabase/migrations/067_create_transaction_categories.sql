-- Migration: 067_create_transaction_categories
-- Description: Create unified transaction_categories table for financial categories
-- Date: 2025-12-14

-- Create table
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    is_opex BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read for authenticated" ON transaction_categories FOR SELECT USING (true);
CREATE POLICY "Write for admin" ON transaction_categories FOR ALL USING (true);

-- Seed data (17 categories)
INSERT INTO transaction_categories (code, name, type, is_opex, is_system, sort_order) VALUES
-- OPEX (Operating Expenses) - 12 categories
('utilities', 'Utilities', 'expense', true, false, 1),
('salary', 'Salary', 'expense', true, false, 2),
('rent', 'Rent', 'expense', true, false, 3),
('transport', 'Transport', 'expense', true, false, 4),
('cleaning', 'Cleaning', 'expense', true, false, 5),
('security', 'Security', 'expense', true, false, 6),
('renovation', 'Renovation', 'expense', true, false, 7),
('marketing', 'Marketing', 'expense', true, false, 8),
('maintenance', 'Maintenance', 'expense', true, false, 9),
('service', 'Service', 'expense', true, false, 10),
('takeaway', 'Takeaway', 'expense', true, false, 11),
('other', 'Other Expenses', 'expense', true, false, 12),
-- Non-OPEX Expenses - 3 categories
('supplier', 'Supplier Payment', 'expense', false, true, 20),
('tax', 'Tax', 'expense', false, false, 21),
('invest', 'Investment', 'expense', false, false, 22),
-- Income - 2 categories
('sales', 'Sales', 'income', false, true, 30),
('other_income', 'Other Income', 'income', false, false, 31);

-- Create index for common queries
CREATE INDEX idx_transaction_categories_type ON transaction_categories(type);
CREATE INDEX idx_transaction_categories_is_active ON transaction_categories(is_active);
