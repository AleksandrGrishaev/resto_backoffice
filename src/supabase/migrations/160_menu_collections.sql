-- Migration: 160_menu_collections
-- Description: Create menu_collections and menu_collection_items tables for organizing menu items into collections
-- Date: 2026-03-05

-- ============================================
-- TABLE: menu_collections
-- ============================================
CREATE TABLE IF NOT EXISTS menu_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'draft' | 'seasonal'
  status TEXT NOT NULL DEFAULT 'draft',      -- 'draft' | 'published' | 'archived'
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER menu_collections_updated_at
  BEFORE UPDATE ON menu_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TABLE: menu_collection_items
-- ============================================
CREATE TABLE IF NOT EXISTS menu_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES menu_collections(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, menu_item_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_menu_collection_items_collection_id ON menu_collection_items(collection_id);
CREATE INDEX idx_menu_collection_items_menu_item_id ON menu_collection_items(menu_item_id);
CREATE INDEX idx_menu_collections_status ON menu_collections(status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE menu_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_collection_items ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated users
CREATE POLICY "menu_collections_select" ON menu_collections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "menu_collection_items_select" ON menu_collection_items
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE for authenticated users (role check at app level)
CREATE POLICY "menu_collections_insert" ON menu_collections
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "menu_collections_update" ON menu_collections
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "menu_collections_delete" ON menu_collections
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "menu_collection_items_insert" ON menu_collection_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "menu_collection_items_update" ON menu_collection_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "menu_collection_items_delete" ON menu_collection_items
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- GRANTS (Edge Function access)
-- ============================================
GRANT ALL ON menu_collections TO service_role;
GRANT ALL ON menu_collection_items TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
