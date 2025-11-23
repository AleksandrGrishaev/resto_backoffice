# Supabase Setup Guide

This guide walks through setting up separate Supabase databases for development and production environments.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Command line access
- Git repository access

## Overview

We'll create two separate Supabase projects:

- **kitchen-app-dev** - Development database (testing, debugging)
- **kitchen-app-prod** - Production database (live restaurant operations)

**Why separate databases?**
- Prevents accidental data corruption
- Allows safe testing of migrations
- Different RLS policies for dev (more permissive) vs prod (strict)
- Independent scaling and monitoring

## Phase 3.1: Create Supabase Projects

### Development Project

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Click "New Project"

2. **Configure Development Project**
   - **Name**: `kitchen-app-dev`
   - **Database Password**: Generate strong password (save securely!)
   - **Region**: Select closest to your location (e.g., Southeast Asia for Indonesia)
   - **Pricing Plan**: Free tier is fine for development

3. **Wait for provisioning** (~2 minutes)

4. **Get API Credentials**
   - Go to Settings → API
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **anon/public key** (safe to expose, used by client)
   - Copy **service_role key** (⚠️ DANGEROUS, only for dev testing!)

5. **Update .env.development**
   ```bash
   VITE_SUPABASE_URL=https://your-dev-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...your-dev-anon-key
   VITE_SUPABASE_SERVICE_KEY=eyJhbG...your-dev-service-key
   ```

### Production Project

Repeat the same steps but:

1. **Name**: `kitchen-app-prod`
2. **Use different database password** (save securely!)
3. **Same region** as dev (for consistency)
4. **Consider paid plan** for production (better performance, more storage, backups)

5. **Update .env.production**
   ```bash
   VITE_SUPABASE_URL=https://your-prod-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...your-prod-anon-key
   # ⚠️ DO NOT SET SERVICE_KEY IN PRODUCTION!
   ```

## Phase 3.2: Apply Database Migrations

### Check Existing Migrations

```bash
# List all migrations in your project
npx supabase migration list
```

### Apply Migrations to Development

```bash
# Get your database URL from Supabase dashboard:
# Settings → Database → Connection string → URI

# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Apply all migrations to dev
npx supabase db push --db-url "postgresql://postgres:[DEV-PASSWORD]@db.[DEV-PROJECT-REF].supabase.co:5432/postgres"
```

Expected output:
```
Applying migration 20240101000000_create_products_table.sql...
Applying migration 20240102000000_create_orders_table.sql...
...
✅ All migrations applied successfully
```

### Apply Migrations to Production

```bash
# ⚠️ CAREFUL! This affects production data!
# Always test in dev first!

npx supabase db push --db-url "postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres"
```

### Verify Migrations

1. Go to Supabase Dashboard → Table Editor
2. Check that all tables exist:
   - `products`
   - `recipes`
   - `orders`
   - `order_items`
   - `payments`
   - `shifts`
   - `tables`
   - `users` (will be created in Phase 4)
   - etc.

## Phase 3.3: Configure Row Level Security (RLS)

RLS policies are **CRITICAL** for security. They control who can access what data.

### Apply RLS Policies

We've prepared migration files with RLS policies. Apply them:

```bash
# Apply RLS migration to dev
npx supabase migration up --db-url "postgresql://postgres:[DEV-PASSWORD]@db.[DEV-PROJECT-REF].supabase.co:5432/postgres"

# Apply RLS migration to production
npx supabase migration up --db-url "postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres"
```

### Verify RLS Policies

1. **Check in Supabase Dashboard**
   - Go to Authentication → Policies
   - Each table should show "RLS enabled"
   - Each table should have policies listed

2. **Test RLS with API**
   ```bash
   # Try to access data without authentication (should fail)
   curl https://your-project.supabase.co/rest/v1/products \
     -H "apikey: YOUR_ANON_KEY"

   # Expected: Empty result or permission error (good!)
   ```

3. **Test with authenticated user**
   - Create test user in Supabase Dashboard
   - Try accessing data with JWT token
   - Should only see data according to RLS policies

### Common RLS Policies

See `supabase/migrations/[timestamp]_rls_policies.sql` for full details.

**Key policies:**

- **products**: Read for all, write for admin/manager
- **orders**: Read/write for admin/cashier/manager
- **users**: Users can view own profile, admins can view all
- **shifts**: Only assigned user can close shift
- **payments**: Only authorized roles can create/view payments

## Phase 3.4: Seed Initial Data

### Option 1: Using Supabase Dashboard

1. Go to Table Editor
2. Click on table (e.g., `products`)
3. Click "Insert row"
4. Fill in data
5. Repeat for initial data

**Recommended for:**
- Small datasets
- One-time setup
- Quick testing

### Option 2: Using SQL Scripts

```bash
# Run seed script
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < scripts/seeds/initial-data.sql
```

### Option 3: Using Custom Scripts

```bash
# Our product seeder
pnpm seed:products

# Custom admin user seeder (Phase 4)
pnpm seed:admin-user
```

### Minimal Production Seed Data

At minimum, production needs:

1. **Admin user** (email + password)
   ```sql
   -- Will be created in Phase 4
   ```

2. **Basic product categories**
   ```sql
   INSERT INTO categories (id, name) VALUES
     ('cat_1', 'Food'),
     ('cat_2', 'Drinks'),
     ('cat_3', 'Desserts');
   ```

3. **Units of measurement**
   ```sql
   INSERT INTO units (id, name, symbol) VALUES
     ('unit_kg', 'Kilogram', 'kg'),
     ('unit_l', 'Liter', 'L'),
     ('unit_pcs', 'Pieces', 'pcs');
   ```

4. **Default cashier accounts** (with PIN)
   ```sql
   -- Will be created in Phase 4
   ```

## Phase 3.5: Configure Backups

### Automatic Backups

1. **Go to Supabase Dashboard**
   - Settings → Database → Backups

2. **Configure backup schedule**
   - **Daily backups**: Enabled (retained for 7 days)
   - **Weekly backups**: Enabled (retained for 4 weeks)
   - **Point-in-Time Recovery (PITR)**: Enable if on paid plan

### Manual Backup

```bash
# Backup entire database
npx supabase db dump --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql

# Backup specific table
npx supabase db dump --db-url "..." --table products > products_backup.sql
```

### Test Restore Process

**CRITICAL**: Test restore on dev database BEFORE production issues occur!

```bash
# 1. Backup dev database
npx supabase db dump --db-url "[DEV-URL]" > dev_backup.sql

# 2. Drop all tables (⚠️ DESTRUCTIVE!)
# In Supabase Dashboard: SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# 3. Restore from backup
psql "[DEV-URL]" < dev_backup.sql

# 4. Verify data restored correctly
```

### Backup Strategy

**Development:**
- Manual backups before major migrations
- Daily automated backups (7-day retention)

**Production:**
- Daily automated backups (7-day retention minimum)
- Weekly backups (4-week retention minimum)
- Manual backup before ANY schema change
- PITR enabled (if available)
- Store critical backups off-site (download and store securely)

## Phase 3.6: Security Checklist

Before going to production:

- [ ] **RLS enabled on ALL tables**
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
  -- All tables should show rowsecurity = true
  ```

- [ ] **No SERVICE_KEY in production env**
  ```bash
  # Check .env.production
  grep "VITE_SUPABASE_SERVICE_KEY" .env.production
  # Should return nothing or be commented out
  ```

- [ ] **Anon key has correct permissions**
  - Test API calls with anon key
  - Should NOT have admin access
  - Should respect RLS policies

- [ ] **Database password is strong**
  - Minimum 20 characters
  - Mix of letters, numbers, symbols
  - Stored securely (password manager)

- [ ] **Backups configured and tested**
  - Automatic backups enabled
  - Test restore process works
  - Know how to restore quickly

- [ ] **Connection pooling configured** (for production)
  - Supabase Dashboard → Settings → Database
  - Use connection pooler for better performance

## Troubleshooting

### Migration fails with "permission denied"

**Problem**: User doesn't have permission to create tables/functions

**Solution**:
```sql
-- Run as postgres user
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

### RLS blocks all queries

**Problem**: RLS policies too restrictive, can't access data

**Solution**:
```sql
-- Temporarily disable RLS for testing (DEV ONLY!)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Better: Fix the policy
CREATE POLICY "products_read_all" ON products
  FOR SELECT USING (true);
```

### Can't connect to database

**Problem**: Connection string incorrect or database not accessible

**Solutions**:
1. Check connection string format
2. Verify project is not paused (free tier auto-pauses)
3. Check firewall/network settings
4. Verify password is correct

### Migration applied twice

**Problem**: Ran migration script manually after it was already applied

**Solution**:
```bash
# Check migration history
SELECT * FROM supabase_migrations.schema_migrations;

# Rollback last migration
npx supabase migration rollback

# Re-apply correctly
npx supabase migration up
```

## Next Steps

After completing Supabase setup:

1. **Update environment files** with actual credentials
2. **Test connection** from local development
3. **Proceed to Phase 4**: Authentication Migration
4. **Keep credentials secure** - never commit to git!

## Monitoring & Maintenance

### Regular Checks

**Weekly:**
- Check database size (Settings → Database → Size)
- Review slow queries (Settings → Database → Query Performance)
- Check error logs (Settings → Logs)

**Monthly:**
- Review RLS policies (add/remove as needed)
- Update dependencies
- Test backup restore process
- Review user permissions

### Performance Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_products_category ON products(category_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM orders WHERE table_id = 'table_1';
```

### Cost Monitoring

- Free tier limits: 500 MB database, 1 GB bandwidth, 2 GB storage
- Monitor usage in Supabase Dashboard → Settings → Usage
- Upgrade to paid plan before hitting limits in production

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Discord Community**: https://discord.supabase.com
- **GitHub Issues**: https://github.com/supabase/supabase/issues

---

**Phase 3 Complete!** ✅

After completing this setup, you should have:
- ✅ Dev and prod Supabase projects created
- ✅ Database migrations applied
- ✅ RLS policies configured
- ✅ Initial data seeded
- ✅ Backups configured
- ✅ Security validated

**Next: Phase 4 - Authentication Migration** →
