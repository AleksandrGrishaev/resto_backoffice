-- Migration: 162_add_status_and_last_edited_at
-- Description: Add `status` (draft/active/archived) and `last_edited_at` to all core tables
-- Date: 2026-03-06
--
-- `status` replaces boolean `is_active` with 3-state lifecycle
-- `last_edited_at` tracks manual user edits only (not batch recalculations)
-- `is_active` kept for backwards compatibility, will be deprecated

-- 1. menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

UPDATE menu_items SET status = CASE WHEN is_active THEN 'active' ELSE 'draft' END;
UPDATE menu_items SET last_edited_at = created_at WHERE last_edited_at IS NULL;

-- 2. recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

UPDATE recipes SET status = CASE WHEN is_active THEN 'active' ELSE 'draft' END;
UPDATE recipes SET last_edited_at = created_at WHERE last_edited_at IS NULL;

-- 3. preparations
ALTER TABLE preparations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

UPDATE preparations SET status = CASE WHEN is_active THEN 'active' ELSE 'draft' END;
UPDATE preparations SET last_edited_at = created_at WHERE last_edited_at IS NULL;

-- 4. products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

UPDATE products SET status = CASE WHEN is_active THEN 'active' ELSE 'draft' END;
UPDATE products SET last_edited_at = created_at WHERE last_edited_at IS NULL;

-- 5. CHECK constraints
ALTER TABLE menu_items ADD CONSTRAINT chk_menu_items_status CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE recipes ADD CONSTRAINT chk_recipes_status CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE preparations ADD CONSTRAINT chk_preparations_status CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE products ADD CONSTRAINT chk_products_status CHECK (status IN ('draft', 'active', 'archived'));

-- 6. Indexes on status
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status);
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
CREATE INDEX IF NOT EXISTS idx_preparations_status ON preparations(status);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 7. Indexes on last_edited_at
CREATE INDEX IF NOT EXISTS idx_menu_items_last_edited ON menu_items(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_last_edited ON recipes(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_preparations_last_edited ON preparations(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_last_edited ON products(last_edited_at DESC);

-- 8. Grant permissions for service_role
GRANT ALL ON menu_items TO service_role;
GRANT ALL ON recipes TO service_role;
GRANT ALL ON preparations TO service_role;
GRANT ALL ON products TO service_role;
