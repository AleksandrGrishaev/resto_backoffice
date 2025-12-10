-- Migration: 045_add_templates_to_menu_items
-- Description: Add templates JSONB column to menu_items for quick select templates
-- Date: 2025-12-10

-- Add templates column for storing variant templates
-- Templates allow customers to quickly select pre-configured modifier combinations
-- Structure: [{ id, name, description?, selectedModifiers: [{ groupId, optionIds[] }], sortOrder? }]

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS templates JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN menu_items.templates IS 'JSONB array of variant templates for quick selection in POS. Structure:
[{
  id: string,
  name: string,
  description?: string,
  selectedModifiers: [{ groupId: string, optionIds: string[] }],
  sortOrder?: number
}]';

-- Ensure existing menu_items have empty array (not null)
UPDATE menu_items
SET templates = '[]'::jsonb
WHERE templates IS NULL;
