# Database Migrations

This directory contains all database schema migrations for the Kitchen App.

## ⚠️ Important

- **Development Database**: Migrations are automatically applied via MCP tools during development
- **Production Database**: Migrations MUST be applied manually using Supabase SQL Editor or CLI

## Migration Files

Migrations are numbered sequentially: `NNN_descriptive_name.sql`

### Current Migrations

| #   | File                                             | Description               | Status     |
| --- | ------------------------------------------------ | ------------------------- | ---------- |
| 001 | `001_initial_schema.sql`                         | Initial database schema   | ✅ Applied |
| 002 | `002_add_missing_shift_fields.sql`               | Add shift fields          | ✅ Applied |
| 003 | `003_update_orders_payments_schema.sql`          | Update orders/payments    | ✅ Applied |
| 004 | `004_create_menu_tables.sql`                     | Create menu tables        | ✅ Applied |
| 005 | `005_update_products_schema.sql`                 | Update products schema    | ✅ Applied |
| 006 | `006_enable_rls_policies.sql`                    | Enable RLS policies       | ✅ Applied |
| 007 | `007_create_users_table.sql`                     | Create users table        | ✅ Applied |
| 008 | `008_create_product_categories.sql`              | Create product categories | ✅ Applied |
| 009 | `009_migrate_preparations_type_to_uuid.sql`      | Migrate preparations type | ✅ Applied |
| 009 | `009_migrate_products_category.sql`              | Migrate products category | ✅ Applied |
| 010 | `010_cleanup_preparations_category_id.sql`       | Cleanup preparations      | ✅ Applied |
| 011 | `011_make_recipe_preparation_codes_required.sql` | Make codes required       | 🔄 Pending |

## How to Apply Migrations to Production

### Option 1: Supabase SQL Editor (Recommended)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select **Production Project** (`bkntdcvzatawencxghob`)
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the migration file content
6. Paste and **Run** the query
7. Verify the results
8. Update this README with ✅ status

### Option 2: Supabase CLI

```bash
# Make sure you're connected to PRODUCTION
supabase link --project-ref bkntdcvzatawencxghob

# Apply the migration
supabase db push

# Or apply specific migration file
psql \
  -h db.bkntdcvzatawencxghob.supabase.co \
  -U postgres \
  -d postgres \
  -f src/supabase/migrations/011_make_recipe_preparation_codes_required.sql
```

### Option 3: Direct SQL Client

```bash
# Use psql or any PostgreSQL client
psql "postgresql://postgres:[PASSWORD]@db.bkntdcvzatawencxghob.supabase.co:5432/postgres" \
  -f src/supabase/migrations/011_make_recipe_preparation_codes_required.sql
```

## Pre-Migration Checklist

Before applying a migration to production:

- [ ] Migration tested on **DEV database** via MCP
- [ ] Migration file created with proper validation
- [ ] Code changes deployed and tested
- [ ] Backup created (Supabase auto-backups, but verify)
- [ ] Team notified of schema change
- [ ] Migration reviewed by another developer (if possible)

## Post-Migration Checklist

After applying a migration to production:

- [ ] Verify migration success (check output)
- [ ] Test affected functionality in production
- [ ] Update this README with ✅ status
- [ ] Monitor for errors in Supabase logs
- [ ] Update team on completion

## Migration File Template

```sql
-- Migration: NNN_descriptive_name
-- Description: Clear description of what this migration does
-- Date: YYYY-MM-DD
-- Author: Your name

-- ============================================================
-- CONTEXT
-- ============================================================
-- Why this change is needed, what problem it solves

-- ============================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================
-- Check data integrity, existing constraints, etc.
DO $$
BEGIN
  -- Validation logic here
  RAISE NOTICE 'Pre-migration validation passed';
END $$;

-- ============================================================
-- ACTUAL CHANGES
-- ============================================================
-- DDL statements here

-- ============================================================
-- POST-MIGRATION VALIDATION
-- ============================================================
-- Verify changes were applied correctly
DO $$
BEGIN
  -- Verification logic here
  RAISE NOTICE '✅ Migration successful';
END $$;
```

## Rollback Strategy

If a migration fails or causes issues:

1. **Identify the problem**: Check Supabase logs and error messages
2. **Create rollback migration**: Write a new migration that reverses the changes
3. **Test rollback on DEV**: Verify it works correctly
4. **Apply rollback to PROD**: Follow the same process as normal migration
5. **Update README**: Document the rollback

**Example**: If `011_make_codes_required.sql` fails, create `012_rollback_codes_required.sql`

## Contact

For questions about migrations, contact the development team or check CLAUDE.md for detailed instructions.
