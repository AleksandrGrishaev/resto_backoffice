-- Migration: Create recipe_categories table
-- Created: 2025-11-24
-- Description: Create normalized recipe categories table (following product_categories pattern)

-- Create recipe_categories table
CREATE TABLE recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE UNIQUE INDEX idx_recipe_categories_key ON recipe_categories(key);
CREATE INDEX idx_recipe_categories_sort ON recipe_categories(sort_order);
CREATE INDEX idx_recipe_categories_active ON recipe_categories(is_active);

-- Enable Row Level Security
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow read for all authenticated users
CREATE POLICY "Allow read for authenticated users"
  ON recipe_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow all operations for admins
CREATE POLICY "Allow all for admins"
  ON recipe_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- Seed initial categories (migrated from RECIPE_CATEGORIES constant)
INSERT INTO recipe_categories (key, name, description, color, icon, sort_order) VALUES
  ('main_dish', 'Main Dishes', 'Primary courses and entrees', 'red-darken-2', 'mdi-food-steak', 1),
  ('side_dish', 'Side Dishes', 'Accompaniments and sides', 'green-darken-2', 'mdi-food-variant', 2),
  ('dessert', 'Desserts', 'Sweet dishes and treats', 'pink-darken-2', 'mdi-cake', 3),
  ('appetizer', 'Appetizers', 'Starters and small plates', 'orange-darken-2', 'mdi-food-apple', 4),
  ('beverage', 'Beverages', 'Drinks and cocktails', 'blue-darken-2', 'mdi-glass-cocktail', 5),
  ('sauce', 'Sauces', 'Sauces and condiments', 'purple-darken-2', 'mdi-bottle-tonic', 6);

-- Add comments to table
COMMENT ON TABLE recipe_categories IS 'Recipe categories with localization and UI properties';
COMMENT ON COLUMN recipe_categories.key IS 'Unique English key for programmatic access';
COMMENT ON COLUMN recipe_categories.name IS 'Display name for UI';
COMMENT ON COLUMN recipe_categories.color IS 'Vuetify color name for UI chips';
COMMENT ON COLUMN recipe_categories.icon IS 'Material Design icon name';
COMMENT ON COLUMN recipe_categories.sort_order IS 'Display order in UI';
