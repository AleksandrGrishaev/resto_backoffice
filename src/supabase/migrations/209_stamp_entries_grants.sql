-- Migration: 209_stamp_entries_grants
-- Description: Add missing grants for stamp_entries and stamp_cards DELETE
-- Date: 2026-03-11
-- Context: stamp_entries had no grants for authenticated role,
--   causing 403 errors when admin edits stamp counts.
--   stamp_cards lacked DELETE grant for card removal.

GRANT SELECT, INSERT, UPDATE, DELETE ON stamp_entries TO authenticated;
GRANT DELETE ON stamp_cards TO authenticated;
