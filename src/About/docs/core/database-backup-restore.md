# Database Backup & Restore

## Overview

This document describes the backup and restore process for Supabase databases. The project has two separate databases (DEV and PROD), and these scripts allow you to:

- Create full backups of production database
- Restore backups to development database for testing

## Database Configuration

| Database | Project Ref            | Pooler Host                                | Direct Host                           |
| -------- | ---------------------- | ------------------------------------------ | ------------------------------------- |
| DEV      | `fjkfckjpnbcyuknsnchy` | `aws-1-ap-southeast-1.pooler.supabase.com` | `db.fjkfckjpnbcyuknsnchy.supabase.co` |
| PROD     | `bkntdcvzatawencxghob` | `aws-1-ap-southeast-2.pooler.supabase.com` | `db.bkntdcvzatawencxghob.supabase.co` |

## Commands

```bash
# Backup production database
pnpm backup:prod

# Restore latest backup to dev database
pnpm restore:dev

# Restore specific backup to dev
pnpm restore:dev prod_2025-12-09T15-53-46
```

## Backup Process

### Script Location

`scripts/backup-database.mjs`

### What It Does

1. Tries direct connection first, falls back to session pooler
2. Creates schema-only backup (`schema.sql`)
3. Dumps each table individually in compressed custom format (`tables/*.dump`)
4. Tables that fail COPY mode are retried with INSERT mode (`tables/*.sql`)
5. Exports grants, real-time publication, extensions, auth users
6. Saves metadata (`metadata.json`)

### Why Table-by-Table?

Supabase session pooler drops SSL connections during long-running `COPY` operations on large tables (e.g., `recipe_write_offs` ~20MB). Dumping each table in a separate connection avoids this. Tables that still fail via COPY are automatically retried using INSERT statements (`--inserts --rows-per-insert=100`).

### Connection Strategy

1. **Direct connection** (`db.xxx.supabase.co:5432`) — tried first, more stable
2. **Session pooler** (`aws-1-ap-southeast-2.pooler.supabase.com:5432`) — fallback for IPv4-only networks
3. **Password** via `PGPASSWORD` env var — avoids special character issues in URL
4. **Keepalives** enabled (`keepalives_idle=30s`) to prevent idle timeout

### Output Structure

```
backups/
└── prod_YYYY-MM-DDTHH-MM-SS/
    ├── schema.sql       # Full schema (DDL, functions, triggers, indexes, RLS)
    ├── tables/          # Individual table data dumps
    │   ├── users.dump           # Custom format (compressed)
    │   ├── products.dump
    │   ├── recipe_write_offs.sql  # INSERT fallback (if COPY failed)
    │   └── ...                    # One file per table
    ├── backup.sql       # Schema-only SQL (human-readable reference)
    ├── grants.sql       # GRANT permissions for Supabase roles
    ├── realtime.sql     # Real-time publication table memberships
    ├── extensions.sql   # Enabled PostgreSQL extensions
    ├── auth_users.sql   # Auth users metadata (SECURITY SENSITIVE!)
    └── metadata.json    # Backup info (tables count, sizes, timing)
```

### What's Included

| Component                 | Included | Location             |
| ------------------------- | -------- | -------------------- |
| Schema (DDL)              | Yes      | `schema.sql`         |
| Table data                | Yes      | `tables/*.dump/sql`  |
| Functions                 | Yes      | `schema.sql`         |
| RLS Policies              | Yes      | `schema.sql`         |
| Triggers                  | Yes      | `schema.sql`         |
| Indexes                   | Yes      | `schema.sql`         |
| **GRANT permissions**     | **Yes**  | **`grants.sql`**     |
| **Real-time publication** | **Yes**  | **`realtime.sql`**   |
| **PostgreSQL extensions** | **Yes**  | **`extensions.sql`** |
| **Auth users metadata**   | **Yes**  | **`auth_users.sql`** |

### What's NOT Included

- Supabase system schemas (`auth`, `storage`, `realtime`) - except auth.users metadata
- Auth users **passwords** (only email, metadata, and role are exported)
- Storage buckets and files (S3 data)

### Configuration

Create `.env.backup` file:

```bash
DB_PASSWORD=your_prod_database_password
```

Password can contain special characters (`*`, `@`, etc.) — it's passed via `PGPASSWORD` env var, not in the URL.

Get password from: https://supabase.com/dashboard/project/bkntdcvzatawencxghob/settings/database

## Restore Process

### Script Location

`scripts/restore-database.mjs`

### What It Does

1. Reads backup from `backups/` folder
2. Cleans backup file (removes problematic directives)
3. **DROPS entire public schema** in DEV database
4. Recreates public schema with proper grants
5. Restores schema from `schema.sql`
6. Restores data from `tables/` directory (custom format via `pg_restore`, SQL via `psql`)
7. Reloads PostgREST schema cache
8. Verifies restore (table/function count)

### Configuration

Create `.env.restore.dev` file:

```bash
# DEV Database credentials for restore
DB_PASSWORD=your_dev_database_password
DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
DB_PROJECT_REF=fjkfckjpnbcyuknsnchy
```

Get password from: https://supabase.com/dashboard/project/fjkfckjpnbcyuknsnchy/settings/database

### Important Notes

1. **Restore is DESTRUCTIVE** - it completely replaces DEV database
2. **Extensions must be pre-enabled** in DEV database (`pgcrypto`, `uuid-ossp`)

## Requirements

- PostgreSQL client tools (`pg_dump`, `psql`, `pg_restore`)
- macOS: `brew install libpq`
- Ubuntu: `sudo apt install postgresql-client`

## Typical Workflow

### Sync DEV with PROD data

```bash
# 1. Create fresh backup of prod
pnpm backup:prod

# 2. Restore to dev
pnpm restore:dev

# 3. Apply additional SQL files (grants, realtime, extensions, auth users)
# See "Post-Restore Steps" section below

# 4. Verify in app or via MCP
mcp__supabase_dev__list_tables({ schemas: ['public'] })
```

### Post-Restore Steps

After running `pnpm restore:dev`, apply the additional SQL files from the backup:

**1. Extensions (do this first!):**

```bash
# Apply via MCP or Supabase SQL Editor
cat backups/prod_YYYY-MM-DDTHH-MM-SS/extensions.sql
# Copy and paste to SQL Editor or use psql
```

**2. GRANT permissions:**

```bash
# Apply via MCP or Supabase SQL Editor
cat backups/prod_YYYY-MM-DDTHH-MM-SS/grants.sql
# This fixes "permission denied" errors
```

**3. Real-time publication:**

```bash
# Apply via MCP or Supabase SQL Editor
cat backups/prod_YYYY-MM-DDTHH-MM-SS/realtime.sql
# This restores Kitchen/POS real-time sync
```

**4. Auth users (optional, if needed):**

```bash
# SECURITY SENSITIVE! Only if you need to restore test users
cat backups/prod_YYYY-MM-DDTHH-MM-SS/auth_users.sql
# NOTE: Passwords are NOT included, users will need to reset passwords
```

**Quick restore script (recommended):**

```bash
# After pnpm restore:dev, run this to apply all SQL files
BACKUP_DIR="backups/prod_YYYY-MM-DDTHH-MM-SS"
psql $DEV_CONNECTION_STRING < $BACKUP_DIR/extensions.sql
psql $DEV_CONNECTION_STRING < $BACKUP_DIR/grants.sql
psql $DEV_CONNECTION_STRING < $BACKUP_DIR/realtime.sql
# Optional: psql $DEV_CONNECTION_STRING < $BACKUP_DIR/auth_users.sql
```

### Before major changes

```bash
# 1. Backup current prod state
pnpm backup:prod

# 2. Test changes on dev
# ... make changes ...

# 3. If something breaks, restore dev from backup
pnpm restore:dev prod_2025-12-09T15-53-46
```

## Troubleshooting

### "password authentication failed"

- Check password in `.env.backup` or `.env.restore.dev`
- Password with special characters is OK (passed via `PGPASSWORD` env var)
- Reset password in Supabase Dashboard if needed

### "pg_dump/psql not found"

```bash
# macOS
brew install libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc

# Ubuntu
sudo apt install postgresql-client
```

### SSL connection drops during backup

This is handled automatically by the table-by-table strategy:

1. Each table is dumped in a separate connection (avoids long-running COPY)
2. Failed tables are retried with INSERT mode (slower but avoids COPY/SSL issues)
3. Keepalives are enabled to prevent idle timeout

If a table still fails both COPY and INSERT modes, it will be listed in `metadata.json` under `tables_failed`.

### Restore shows errors but completes

Some warnings are normal:

- "already exists" - duplicate objects (usually OK)
- "NOTICE:" messages - informational only

Check final stats - if tables/functions count matches, restore succeeded.

### Real-time subscriptions not working after restore

After restoring from backup, Supabase real-time stops working because the `supabase_realtime` publication loses its table subscriptions.

**Symptoms:**

- Kitchen/POS views don't update in real-time
- Console shows `[KitchenRealtime]: Kitchen Realtime connected` (SUBSCRIBED) but no update events
- Changes only appear after page refresh

**Diagnosis:**

```sql
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- If empty (tablename: null), real-time is broken
```

**Fix — apply `realtime.sql` from backup, or manually:**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Verify
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

---

### "permission denied for table X" after restore

This is the most common issue! `pg_dump` doesn't export GRANT permissions for Supabase-specific roles (`anon`, `authenticated`, `service_role`).

**Fix — apply `grants.sql` from backup, or run this SQL:**

```sql
-- 1. Grant permissions on all tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.tablename);
  END LOOP;
END;
$$;

-- 2. Grant permissions on all sequences
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq.sequencename);
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.%I TO authenticated', seq.sequencename);
    EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO service_role', seq.sequencename);
  END LOOP;
END;
$$;

-- 3. Grant permissions on all functions
DO $$
DECLARE
  func RECORD;
BEGIN
  FOR func IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', func.proname, func.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', func.proname, func.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', func.proname, func.args);
  END LOOP;
END;
$$;

-- 4. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- 5. Reload PostgREST cache
NOTIFY pgrst, 'reload schema';
```

**Verify fix:**

```sql
SELECT grantee, string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_name = 'users' AND table_schema = 'public'
GROUP BY grantee;
```

Should show:

- `anon`: SELECT
- `authenticated`: DELETE, INSERT, SELECT, UPDATE
- `service_role`: all privileges

## Security

**NEVER commit these files to git:**

- `.env.backup` - PROD database password
- `.env.restore.dev` - DEV database password
- `backups/` folder - contains sensitive data

All are already in `.gitignore`.
