-- Migration: 068_add_tax_income_categories
-- Description: Add income categories for separate tax tracking (service_tax, local_tax)
-- Date: 2025-12-14
-- Author: Claude

-- CONTEXT:
-- Currently all POS income goes to 'sales' category.
-- We need to track taxes separately:
-- - sales: pure revenue (without taxes)
-- - service_tax: service charge 5%
-- - local_tax: local tourist tax 10%

-- Add service tax income category
INSERT INTO transaction_categories (id, code, name, type, is_opex, is_system, is_active, sort_order, description)
VALUES (
    gen_random_uuid(),
    'service_tax',
    'Service Tax (5%)',
    'income',
    false,
    true,
    true,
    32,
    'Service tax collected from customers (5%)'
)
ON CONFLICT (code) DO NOTHING;

-- Add local tax income category
INSERT INTO transaction_categories (id, code, name, type, is_opex, is_system, is_active, sort_order, description)
VALUES (
    gen_random_uuid(),
    'local_tax',
    'Local Tax (10%)',
    'income',
    false,
    true,
    true,
    33,
    'Local tourist tax collected from customers (10%)'
)
ON CONFLICT (code) DO NOTHING;

-- POST-MIGRATION VALIDATION
-- Verify categories were created:
-- SELECT code, name, type FROM transaction_categories WHERE code IN ('service_tax', 'local_tax');
