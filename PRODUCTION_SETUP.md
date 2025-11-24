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
- ✅ Helper functions (`authenticate_with_pin`, `create_user_with_pin`, etc.)

## Step 2: Seed Users

After migration is applied, you have two options:

### Option A: Via SQL Editor (Recommended)

1. Stay in SQL Editor
2. Copy content from `src/scripts/seed/seedUsersProduction.sql`
3. Paste and Run

### Option B: Via Seed Script (if RPC works)

```bash
pnpm seed:users:prod
```

## Step 3: Verify

Check users were created:

```sql
SELECT id, name, email, roles, is_active
FROM public.users
WHERE email LIKE '%kitchen-app.com%'
ORDER BY name;
```

Expected result: 6 users (Admin, Manager, Cashier, Kitchen, Bar, Multi-Role)

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
