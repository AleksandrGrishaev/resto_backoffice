-- Sprint 7: Menu Store → Supabase Migration
-- This migration creates Menu Categories and Menu Items tables
-- Critical for POS MenuSection to persist menu data

-- ==================================================
-- MENU CATEGORIES TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Ordering and status
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for menu_categories
CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON menu_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort_order ON menu_categories(sort_order);

-- Comments for menu_categories
COMMENT ON TABLE menu_categories IS 'Menu categories (Appetizers, Mains, Beverages, etc.)';
COMMENT ON COLUMN menu_categories.name IS 'Category name (e.g., "Appetizers", "Main Courses")';
COMMENT ON COLUMN menu_categories.sort_order IS 'Display order in menu (0 = first)';
COMMENT ON COLUMN menu_categories.is_active IS 'Whether category is visible in POS';

-- ==================================================
-- MENU ITEMS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Category relationship
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,

  -- Pricing
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cost NUMERIC(10, 2) DEFAULT 0,

  -- Dish configuration
  dish_type TEXT CHECK (dish_type IN ('component-based', 'addon-based', 'final')),

  -- Complex nested data stored as JSONB
  -- modifier_groups: [{id, name, groupStyle, minSelection, maxSelection, options: [{id, name, price}]}]
  modifier_groups JSONB DEFAULT '[]'::jsonb,

  -- variants: [{id, name, price, cost}]
  variants JSONB DEFAULT '[]'::jsonb,

  -- Status and ordering
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Media
  image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for menu_items
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_dish_type ON menu_items(dish_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON menu_items(sort_order);

-- Comments for menu_items
COMMENT ON TABLE menu_items IS 'Menu items available for ordering in POS';
COMMENT ON COLUMN menu_items.name IS 'Menu item name (e.g., "Nasi Goreng", "Bintang Beer")';
COMMENT ON COLUMN menu_items.name_en IS 'English name (optional)';
COMMENT ON COLUMN menu_items.price IS 'Base price for menu item';
COMMENT ON COLUMN menu_items.cost IS 'Cost to prepare (for profit margin calculation)';
COMMENT ON COLUMN menu_items.dish_type IS 'Type of dish: component-based (built from parts), addon-based (base + addons), or final (ready to serve)';
COMMENT ON COLUMN menu_items.modifier_groups IS 'JSONB array of modifier groups (e.g., [{id, name, groupStyle: "component", options: [{id, name, price}]}])';
COMMENT ON COLUMN menu_items.variants IS 'JSONB array of variants (e.g., [{id: "small", name: "Small", price: 25000}, {id: "large", name: "Large", price: 35000}])';
COMMENT ON COLUMN menu_items.is_active IS 'Whether item is available for ordering';
COMMENT ON COLUMN menu_items.sort_order IS 'Display order within category';

-- ==================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ==================================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (will implement proper RLS in future sprint)
CREATE POLICY "Enable all operations for authenticated users" ON menu_categories
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON menu_items
  FOR ALL USING (true) WITH CHECK (true);

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Run these to verify migration success:
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'menu_categories' ORDER BY ordinal_position;
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'menu_items' ORDER BY ordinal_position;
-- SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('menu_categories', 'menu_items');
