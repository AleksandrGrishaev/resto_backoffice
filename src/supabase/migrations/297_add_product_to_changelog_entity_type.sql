-- Migration: 297_add_product_to_changelog_entity_type
-- Description: Add 'product' to entity_change_log entity_type CHECK constraint
-- Date: 2026-04-11

-- CONTEXT: Product changes (especially yield) need audit tracking via changelog.
-- Previously only recipes and preparations were tracked.

ALTER TABLE entity_change_log
  DROP CONSTRAINT entity_change_log_entity_type_check;

ALTER TABLE entity_change_log
  ADD CONSTRAINT entity_change_log_entity_type_check
  CHECK (entity_type = ANY (ARRAY['recipe'::text, 'preparation'::text, 'product'::text]));
