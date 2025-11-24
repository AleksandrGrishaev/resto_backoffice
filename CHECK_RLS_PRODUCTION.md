# Production RLS Policies Check

## Critical Tables That Need RLS

For production deployment, these tables MUST have proper RLS policies:

### 1. users ✅

Already has policies from migration 007:

- `users_view_own` - Users can view their own profile
- `users_update_own` - Users can update their own profile
- `admins_view_all_users_v2` - Admins can view all users
- `admins_update_users_v2` - Admins can update users
- `admins_create_users_v2` - Admins can create users

### 2. warehouses

Check if RLS is enabled and policies exist:

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'warehouses';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'warehouses';
```

If no policies, add basic ones:

```sql
-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view warehouses
CREATE POLICY "warehouses_view_authenticated"
  ON warehouses FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow admins/managers to manage warehouses
CREATE POLICY "warehouses_manage_admins"
  ON warehouses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (roles @> ARRAY['admin'] OR roles @> ARRAY['manager'])
    )
  );
```

### 3. products, menu_items, menu_categories

Similar approach - allow:

- **SELECT**: All authenticated users
- **INSERT/UPDATE/DELETE**: Admin and Manager only

### 4. orders, payments, shifts

POS tables - allow:

- **SELECT**: All authenticated users (with their own data)
- **INSERT/UPDATE**: Cashier, Admin, Manager
- **DELETE**: Admin only

## Quick Check Script

Run in Supabase SQL Editor:

```sql
-- List all tables with RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Expected Result

All critical tables should have:

- ✅ `rls_enabled = true`
- ✅ `policy_count > 0`

Tables marked "Unrestricted" in UI need policies!

## Next Steps After RLS Check

1. ✅ Add warehouse SQL and run
2. ✅ Verify RLS policies for critical tables
3. ✅ Add missing policies if needed
4. Deploy to Vercel
5. Test login with PIN authentication
