-- Migration: 157_add_marketing_subcategories
-- Description: Add parent_id and channel_code to transaction_categories, create marketing subcategories by channel
-- Date: 2026-02-25
-- Context: Channel profitability sprint — marketing expenses linked to sales channels (cafe/gobiz/grab)

-- 1. Add parent_id column (self-referencing FK for subcategories)
ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES transaction_categories(id);

-- 2. Add channel_code column (link category to business channel: cafe/gobiz/grab)
ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS channel_code text;

-- 3. Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_transaction_categories_parent_id ON transaction_categories(parent_id);

-- 4. Create index for channel_code lookups
CREATE INDEX IF NOT EXISTS idx_transaction_categories_channel_code ON transaction_categories(channel_code);

-- 5. Insert marketing subcategories by sales channel
INSERT INTO transaction_categories (id, code, name, type, is_opex, is_system, parent_id, channel_code, sort_order, description)
VALUES
  (gen_random_uuid(), 'marketing_cafe',   'Marketing Cafe',   'expense', true, false,
    (SELECT id FROM transaction_categories WHERE code = 'marketing'), 'cafe',  81,
    'Marketing for cafe (dine-in + takeaway)'),
  (gen_random_uuid(), 'marketing_gojek',  'Marketing GoJek',  'expense', true, false,
    (SELECT id FROM transaction_categories WHERE code = 'marketing'), 'gobiz', 82,
    'Marketing for GoFood platform'),
  (gen_random_uuid(), 'marketing_grab',   'Marketing Grab',   'expense', true, false,
    (SELECT id FROM transaction_categories WHERE code = 'marketing'), 'grab',  83,
    'Marketing for Grab Food platform'),
  (gen_random_uuid(), 'marketing_other',  'Marketing Other',  'expense', true, false,
    (SELECT id FROM transaction_categories WHERE code = 'marketing'), NULL,    84,
    'General marketing not attributed to a specific channel');

-- 6. Update the parent marketing category description
UPDATE transaction_categories
SET description = 'Parent category for marketing expenses. Use subcategories for channel-specific tracking.'
WHERE code = 'marketing';
