-- Migration: 213_create_website_homepage_tables
-- Description: Create tables for website homepage sections and featured items
-- Date: 2026-03-15

-- ============================================================
-- 1. Homepage sections (4 configurable slots on landing page)
-- ============================================================

CREATE TABLE IF NOT EXISTS website_homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_position INTEGER NOT NULL UNIQUE CHECK (slot_position BETWEEN 1 AND 4),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  title TEXT, -- optional override for category name
  max_items INTEGER NOT NULL DEFAULT 6,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Featured items within homepage sections
-- ============================================================

CREATE TABLE IF NOT EXISTS website_homepage_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES website_homepage_sections(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (section_id, menu_item_id)
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_homepage_items_section ON website_homepage_items(section_id);

-- ============================================================
-- 4. Updated_at trigger for sections
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_homepage_sections_updated_at ON website_homepage_sections;
CREATE TRIGGER trg_homepage_sections_updated_at
  BEFORE UPDATE ON website_homepage_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================

ALTER TABLE website_homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_homepage_items ENABLE ROW LEVEL SECURITY;

-- Read: everyone (public website reads these)
CREATE POLICY "homepage_sections_select" ON website_homepage_sections FOR SELECT USING (true);
CREATE POLICY "homepage_items_select" ON website_homepage_items FOR SELECT USING (true);

-- Write: authenticated users (admin/manager enforced at app level)
CREATE POLICY "homepage_sections_insert" ON website_homepage_sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "homepage_sections_update" ON website_homepage_sections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "homepage_sections_delete" ON website_homepage_sections FOR DELETE TO authenticated USING (true);

CREATE POLICY "homepage_items_insert" ON website_homepage_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "homepage_items_update" ON website_homepage_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "homepage_items_delete" ON website_homepage_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 6. Grants
-- ============================================================

GRANT ALL ON website_homepage_sections TO service_role;
GRANT ALL ON website_homepage_items TO service_role;
GRANT SELECT ON website_homepage_sections TO anon;
GRANT SELECT ON website_homepage_items TO anon;
