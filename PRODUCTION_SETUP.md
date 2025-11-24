# Production Database Setup Guide

**⚠️ IMPORTANT:** MCP Supabase is connected to DEV database, not production!

Production URL: https://bkntdcvzatawencxghob.supabase.co

## Step 1: Apply Users Table Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/bkntdcvzatawencxghob
2. Go to **SQL Editor**
3. Copy the entire content of `src/supabase/migrations/007_create_users_table.sql`
4. Paste into SQL Editor and click **Run**

This will create:

- ✅ `public.users` table
- ✅ Indexes for performance
- ✅ RLS policies

## Step 2: Create PIN Auth Functions

**CRITICAL:** Migration 007 does NOT include all required RPC functions!

1. Stay in SQL Editor
2. Copy content from `src/scripts/seed/createPinAuthFunctions.sql`
3. Paste and Run

This creates 4 required functions:

- ✅ `authenticate_with_pin` - Simple PIN validation
- ✅ `get_pin_user_credentials` - PIN → credentials (CRITICAL for login!)
- ✅ `create_user_with_pin` - Create users with PIN
- ✅ `update_user_pin` - Update user PIN

## Step 3: Seed Users (public.users)

After migration is applied, you have two options:

### Option A: Via SQL Editor (Recommended)

1. Stay in SQL Editor
2. Copy content from `src/scripts/seed/seedUsersProduction.sql`
3. Paste and Run

### Option B: Via Seed Script (if RPC works)

```bash
pnpm seed:users:prod
```

## Step 4: Create Auth Users (auth.users)

**CRITICAL:** PIN login requires auth.users records for Supabase Auth!

1. Stay in SQL Editor
2. Copy content from `src/scripts/seed/createAuthUsersProduction.sql`
3. Paste and Run

This creates auth.users for all 12 users with temporary passwords following pattern:

- Format: `first4chars + role + 123`
- Example: "Admin User" + "admin" → "admiadmin123"

### Optional: Sync Additional DEV Users

If you need to match DEV database exactly:

1. Copy content from `src/scripts/seed/syncUsersFromDev.sql`
2. Paste and Run

This adds 6 more users from DEV (resto.local + internal.local domains).

## Step 5: Verify

Check `public.users` created:

```sql
SELECT id, name, email, roles, is_active
FROM public.users
ORDER BY email;
```

Expected result: 12 users total

Check `auth.users` created:

```sql
SELECT
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'is_pin_user' as is_pin_user
FROM auth.users
ORDER BY email;
```

Expected result: 12 auth users with confirmed emails

## User Credentials

See `PRODUCTION_CREDENTIALS.md` for login credentials.

## Common Issues

### Issue: Table not visible in Table Editor UI

**Cause:** PostgREST schema cache not updated

**Solution:**

```sql
NOTIFY pgrst, 'reload schema';
```

Then refresh the page.

### Issue: RLS blocks queries

**Cause:** Using anon key without proper auth

**Solution:** Use service key or authenticate first

## Next Steps

After users are seeded:

- [ ] Seed warehouse/storage data
- [ ] Configure Vercel environment variables
- [ ] Test login with production credentials
- [ ] Deploy to Vercel
