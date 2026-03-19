-- Migration: 234_create_website_menu_tables
-- Description: Create tables for website menu categories and items (client-facing menu structure)
-- Date: 2026-03-19

-- ============================================================
-- 1. Website menu categories (client-facing, separate from POS categories)
-- ============================================================

CREATE TABLE IF NOT EXISTS website_menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  slug TEXT UNIQUE,
  image_url TEXT,
  parent_id UUID REFERENCES website_menu_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Website menu items (links menu_items to website categories)
-- ============================================================

CREATE TABLE IF NOT EXISTS website_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES website_menu_categories(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  variant_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_name TEXT,
  display_description TEXT,
  display_image_url TEXT,
  variant_display_mode TEXT NOT NULL DEFAULT 'options' CHECK (variant_display_mode IN ('options', 'separate')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (category_id, menu_item_id, variant_id)
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_website_menu_items_category ON website_menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_website_menu_items_menu_item ON website_menu_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_website_menu_categories_parent ON website_menu_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_website_menu_categories_slug ON website_menu_categories(slug);

-- ============================================================
-- 4. Updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_website_menu_categories_updated_at ON website_menu_categories;
CREATE TRIGGER trg_website_menu_categories_updated_at
  BEFORE UPDATE ON website_menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_website_menu_items_updated_at ON website_menu_items;
CREATE TRIGGER trg_website_menu_items_updated_at
  BEFORE UPDATE ON website_menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================

ALTER TABLE website_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_menu_items ENABLE ROW LEVEL SECURITY;

-- Read: everyone (public website reads these)
CREATE POLICY "website_menu_categories_select" ON website_menu_categories FOR SELECT USING (true);
CREATE POLICY "website_menu_items_select" ON website_menu_items FOR SELECT USING (true);

-- Write: authenticated users (admin/manager enforced at app level)
CREATE POLICY "website_menu_categories_insert" ON website_menu_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "website_menu_categories_update" ON website_menu_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "website_menu_categories_delete" ON website_menu_categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "website_menu_items_insert" ON website_menu_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "website_menu_items_update" ON website_menu_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "website_menu_items_delete" ON website_menu_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 6. Grants
-- ============================================================

GRANT ALL ON website_menu_categories TO service_role;
GRANT ALL ON website_menu_items TO service_role;
GRANT ALL ON website_menu_categories TO authenticated;
GRANT ALL ON website_menu_items TO authenticated;
GRANT SELECT ON website_menu_categories TO anon;
GRANT SELECT ON website_menu_items TO anon;
