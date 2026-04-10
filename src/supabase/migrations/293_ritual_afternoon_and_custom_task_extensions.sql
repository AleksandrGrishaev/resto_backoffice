-- Migration: 293_ritual_afternoon_and_custom_task_extensions
-- Description: Fix CHECK constraints to include 'afternoon', extend ritual_custom_tasks
-- Date: 2026-04-09

-- CONTEXT: Phase 4 of Kitchen Production Control — Ritual & Control Points.
-- The app supports 3 ritual types (morning/afternoon/evening) in TypeScript,
-- but DB CHECK constraints only allow 'morning' and 'evening'. This blocks
-- afternoon ritual completions.
-- Also extends custom tasks with requires_note and checklist_items for
-- structured control checks (fridge inspection, label verification, etc.)

-- 1. Fix ritual_custom_tasks CHECK constraint
ALTER TABLE ritual_custom_tasks DROP CONSTRAINT IF EXISTS ritual_custom_tasks_ritual_type_check;
ALTER TABLE ritual_custom_tasks ADD CONSTRAINT ritual_custom_tasks_ritual_type_check
  CHECK (ritual_type IN ('morning', 'afternoon', 'evening'));

-- 2. Fix ritual_completions CHECK constraint
ALTER TABLE ritual_completions DROP CONSTRAINT IF EXISTS ritual_completions_ritual_type_check;
ALTER TABLE ritual_completions ADD CONSTRAINT ritual_completions_ritual_type_check
  CHECK (ritual_type IN ('morning', 'afternoon', 'evening'));

-- 3. Extend ritual_custom_tasks with control features
-- requires_note: if true, completing this task requires a text note (e.g. "what expired items found?")
ALTER TABLE ritual_custom_tasks ADD COLUMN IF NOT EXISTS requires_note BOOLEAN DEFAULT FALSE;

-- checklist_items: JSONB array of sub-items for complex checks
-- e.g. [{"label": "Check fridge temperature", "required": true}, {"label": "Clean shelves", "required": false}]
ALTER TABLE ritual_custom_tasks ADD COLUMN IF NOT EXISTS checklist_items JSONB;
