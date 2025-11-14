# Supabase Integration - Sprint 7

## Overview

This directory contains Supabase client configuration and database schema for the Kitchen App MVP.

## Files

- `config.ts` - Supabase client configuration
- `client.ts` - Supabase client singleton
- `types.ts` - TypeScript database types (will be auto-generated)
- `index.ts` - Export barrel
- `migrations/001_initial_schema.sql` - Initial database schema

## Setup Instructions

### 1. Supabase Project

You already have a Supabase project:

- URL: `https://fjkfckjpnbcyuknsnchy.supabase.co`
- Project ID: `fjkfckjpnbcyuknsnchy`

### 2. Run Database Migration

**Option A: Via Supabase Dashboard (Recommended for MVP)**

1. Go to https://supabase.com/dashboard/project/fjkfckjpnbcyuknsnchy
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `migrations/001_initial_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl/Cmd + Enter`
7. Verify success - you should see confirmation messages

**Option B: Via Supabase CLI (For Production)**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref fjkfckjpnbcyuknsnchy

# Run migrations
supabase db push
```

### 3. Verify Tables Created

Run this query in SQL Editor to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('shifts', 'tables', 'orders', 'payments', 'products')
ORDER BY table_name;
```

You should see 5 tables:

- `orders`
- `payments`
- `products`
- `shifts`
- `tables`

### 4. Set Up Authentication

**Enable Email/Password Auth:**

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. Configure email templates (optional for MVP)
4. Save changes

**Create Test Users:**

For development, create test users via SQL:

```sql
-- Note: In production, users should sign up via the app
-- This is just for testing during development

-- Create test users (Supabase will handle password hashing)
-- You can create users via the Supabase Dashboard instead
```

**Or via Dashboard:**

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email and password
4. Save

### 5. Generate TypeScript Types (Optional)

To auto-generate TypeScript types from your schema:

```bash
# Install Supabase CLI
npm install -g supabase

# Generate types
supabase gen types typescript --project-id fjkfckjpnbcyuknsnchy > src/supabase/types.ts
```

For MVP, we're using manually defined types which match the schema.

### 6. Test Connection

Restart your dev server:

```bash
pnpm dev
```

Check the browser console - you should see:

```
✅ Supabase client initialized: { url: '...', hasAnonKey: true }
```

## Environment Variables

The following environment variables are required:

```env
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://fjkfckjpnbcyuknsnchy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These are already configured in:

- `.env.development`
- `.env.production`

## Database Schema

### Tables

1. **shifts** - Cashier shift management

   - Tracks shift opening/closing
   - Financial totals (cash, card, QR)
   - Sync status to accounting

2. **tables** - Restaurant tables

   - Table number, area, capacity
   - Status: available, occupied, reserved

3. **orders** - Customer orders

   - Dine-in, takeaway, delivery
   - Order items (JSONB)
   - Payment status

4. **payments** - Payment records

   - Links to orders and shifts
   - Multiple payment methods
   - Transaction tracking

5. **products** - Product catalog
   - Menu items, ingredients
   - Pricing, stock tracking
   - Categories and tags

### Row Level Security (RLS)

For MVP, we use simple policies:

- All authenticated users can access all data
- No user isolation (single restaurant)

For production (Sprint 11), we'll add:

- Multi-tenancy (restaurant_id filtering)
- Role-based access control
- User-specific data isolation

## Usage in Code

### Import Supabase Client

```typescript
import { supabase } from '@/supabase'

// Query data
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true)

// Insert data
const { data, error } = await supabase
  .from('orders')
  .insert({ order_number: 'ORD-001', type: 'dine_in', ... })
  .select()
  .single()

// Update data
const { data, error } = await supabase
  .from('shifts')
  .update({ status: 'completed', end_time: new Date().toISOString() })
  .eq('id', shiftId)

// Delete data
const { error } = await supabase
  .from('orders')
  .delete()
  .eq('id', orderId)
```

### Error Handling

```typescript
import { getSupabaseErrorMessage } from '@/supabase'

const { data, error } = await supabase.from('products').select()

if (error) {
  const message = getSupabaseErrorMessage(error)
  console.error('Supabase error:', message)
}
```

### Check Configuration

```typescript
import { isSupabaseConfigured } from '@/supabase'
import { ENV } from '@/config/environment'

if (ENV.supabase.enabled && isSupabaseConfigured()) {
  // Supabase is ready
}
```

## Troubleshooting

### "Supabase is not configured" Error

Check:

1. Environment variables are set correctly
2. `.env` file is loaded (restart dev server)
3. `VITE_USE_SUPABASE=true` is set

### "relation does not exist" Error

This means tables haven't been created yet:

1. Run the migration SQL in Supabase Dashboard
2. Verify tables exist with the verification query above

### RLS Policy Errors

If you get "permission denied" errors:

1. Check that RLS policies are created (run migration)
2. Ensure user is authenticated
3. Check `auth.role()` is 'authenticated'

### TypeScript Errors

If you get type errors:

1. The types in `types.ts` match your actual schema
2. Restart TypeScript server in your IDE
3. Run `pnpm build` to check for type errors

## Next Steps

After database setup is complete:

1. **Week 1 Day 3-4**: Update `authStore` to use Supabase Auth
2. **Week 2**: Migrate stores to use Supabase (shifts, orders, payments, products)
3. **Week 3**: Deploy to production

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)
