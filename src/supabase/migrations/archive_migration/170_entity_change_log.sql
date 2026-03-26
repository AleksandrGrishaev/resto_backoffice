-- Migration: 170_entity_change_log
-- Description: Audit log for recipe and preparation changes
-- Date: 2026-03-08

CREATE TABLE entity_change_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('recipe', 'preparation')),
  entity_id       UUID NOT NULL,
  entity_name     TEXT NOT NULL,
  changed_by      UUID,
  changed_by_name TEXT NOT NULL DEFAULT 'Unknown',
  change_type     TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'archived', 'restored', 'cloned')),
  changes         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecl_entity ON entity_change_log(entity_type, entity_id);
CREATE INDEX idx_ecl_created_at ON entity_change_log(created_at DESC);
CREATE INDEX idx_ecl_changed_by ON entity_change_log(changed_by);

GRANT ALL ON entity_change_log TO service_role;
GRANT ALL ON entity_change_log TO anon, authenticated;
