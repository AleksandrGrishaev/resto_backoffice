# Production Release: Migrations 160-163

**Status:** NOT APPLIED TO PROD
**Date prepared:** 2026-03-06
**Apply after:** Testing on DEV complete

## Migrations to apply (in order):

1. **160_menu_collections.sql** — menu_collections + menu_collection_items tables
2. **161_normalize_output_units.sql** — normalize preparation output units
3. **162_add_status_and_last_edited_at.sql** — status + last_edited_at on menu_items, recipes, preparations, products
4. **163_fix_modifier_target_component_ids.sql** — fix modifier targetComponents: row UUID -> stable entity ID

## Pre-flight checklist:

- [ ] All migrations tested on DEV
- [ ] App works correctly with new schema
- [ ] Modifier replacements verified (Big Breakfast, Beef Steak, coffee drinks)
- [ ] Apply in sequence via `mcp__supabase_prod__apply_migration`
