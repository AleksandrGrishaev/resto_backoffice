-- Migration: Create product_categories table
-- Created: 2025-11-24
-- Description: Create normalized product categories table with proper RLS policies

-- Create product_categories table
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE UNIQUE INDEX idx_product_categories_key ON product_categories(key);
CREATE INDEX idx_product_categories_sort ON product_categories(sort_order);
CREATE INDEX idx_product_categories_active ON product_categories(is_active);

-- Enable Row Level Security
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow read for all authenticated users
CREATE POLICY "Allow read for authenticated users"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow all operations for admins
CREATE POLICY "Allow all for admins"
  ON product_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- Seed initial categories (migrated from PRODUCT_CATEGORIES constant)
INSERT INTO product_categories (key, name, color, sort_order) VALUES
  ('meat', 'Meat & Poultry', 'red', 1),
  ('vegetables', 'Vegetables', 'green', 2),
  ('fruits', 'Fruits', 'orange', 3),
  ('dairy', 'Dairy Products', 'blue', 4),
  ('cereals', 'Grains & Cereals', 'amber', 5),
  ('spices', 'Spices & Condiments', 'purple', 6),
  ('seafood', 'Seafood', 'cyan', 7),
  ('beverages', 'Beverages', 'indigo', 8),
  ('other', 'Other', 'grey', 9);

-- Add comment to table
COMMENT ON TABLE product_categories IS 'Product categories with localization and UI properties';
COMMENT ON COLUMN product_categories.key IS 'Unique English key for programmatic access';
COMMENT ON COLUMN product_categories.name IS 'Display name for UI';
COMMENT ON COLUMN product_categories.color IS 'Vuetify color name for UI chips';
COMMENT ON COLUMN product_categories.icon IS 'Material Design icon name';
COMMENT ON COLUMN product_categories.sort_order IS 'Display order in UI';
