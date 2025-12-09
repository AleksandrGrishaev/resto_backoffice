-- Migration: 042_add_nested_categories
-- Description: Add parent_id support for nested categories (max 1 level)
-- Date: 2025-12-09

-- =============================================
-- ADD PARENT_ID COLUMN
-- =============================================

-- Add parent_id column to menu_categories table
ALTER TABLE menu_categories
ADD COLUMN IF NOT EXISTS parent_id UUID DEFAULT NULL
REFERENCES menu_categories(id) ON DELETE SET NULL;

-- =============================================
-- CONSTRAINT: Only 1 level of nesting
-- =============================================

-- Create function to validate nesting depth
CREATE OR REPLACE FUNCTION validate_category_nesting()
RETURNS TRIGGER AS $$
BEGIN
  -- If parent_id is set, verify parent has no parent (is root)
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM menu_categories
      WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Cannot create subcategory of a subcategory. Max nesting depth is 1 level.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS check_category_nesting ON menu_categories;
CREATE TRIGGER check_category_nesting
  BEFORE INSERT OR UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION validate_category_nesting();

-- =============================================
-- CONSTRAINT: Prevent circular references
-- =============================================

-- Subcategory cannot be set as parent (category with children cannot become subcategory)
CREATE OR REPLACE FUNCTION prevent_circular_category_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- If this category is becoming a subcategory, check it has no children
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM menu_categories
      WHERE parent_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Category with subcategories cannot become a subcategory itself.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_circular_category_reference ON menu_categories;
CREATE TRIGGER check_circular_category_reference
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_category_reference();

-- =============================================
-- INDEX FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_menu_categories_parent_id
ON menu_categories(parent_id);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN menu_categories.parent_id IS
'Reference to parent category. NULL = root category. Only root categories can have children (max 1 level nesting).';

-- =============================================
-- VALIDATION
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 042: Nested categories support added';
  RAISE NOTICE 'New column: parent_id (references menu_categories.id)';
  RAISE NOTICE 'Constraints: Max 1 level nesting, no circular references';
  RAISE NOTICE 'All existing categories are now root categories (parent_id = NULL)';
END $$;
