# Website Integration — Merge to Main Checklist

> **Branch**: `website-integration` > **Created**: 2026-03-15
> **Status**: Testing on DEV

## Pre-merge: Apply Migrations to PROD

These migrations are applied on DEV but NOT on PROD yet.

### 1. Migration 210: Website Settings Table

```
mcp__supabase_prod__apply_migration — use SQL from:
src/supabase/migrations/210_create_website_settings.sql
```

### 2. Migration 211: Online Ordering Schema

```
mcp__supabase_prod__apply_migration — use SQL from:
src/supabase/migrations/211_online_ordering_schema.sql
```

Adds to `orders` table:

- `customer_phone TEXT`
- `table_number TEXT`
- `pickup_time TEXT`
- `comment TEXT`
- `source TEXT DEFAULT 'pos'`
- `fulfillment_method TEXT`

Creates `order_counters` table and seeds `kitchen_hours` in `website_settings`.

### 3. Migration 212: RPC Functions

Apply each function separately via `mcp__supabase_prod__apply_migration`:

- [ ] `create_online_order` — from `src/supabase/functions/create_online_order.sql`
- [ ] `cancel_online_order` — from `src/supabase/functions/cancel_online_order.sql`
- [ ] `update_online_order` — from `src/supabase/functions/update_online_order.sql`
- [ ] `add_to_online_order` — from `src/supabase/functions/add_to_online_order.sql`
- [ ] `get_my_orders` v2 — from `src/supabase/functions/get_my_orders_v2.sql`

### 4. Verify PROD after migrations

```sql
-- Check new columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('source','fulfillment_method','customer_phone','table_number','pickup_time','comment');

-- Check order_counters table
SELECT * FROM order_counters LIMIT 1;

-- Check kitchen_hours setting
SELECT * FROM website_settings WHERE key = 'kitchen_hours';

-- Check RPC functions registered
SELECT proname FROM pg_proc WHERE proname IN ('create_online_order','cancel_online_order','update_online_order','add_to_online_order','get_my_orders');
```

## Merge Steps

```bash
# 1. Ensure branch is up to date with main
git checkout website-integration
git pull origin main --rebase

# 2. Run build check (optional but recommended)
pnpm build

# 3. Merge to main
git checkout main
git merge website-integration

# 4. Push (triggers Vercel production deploy)
git push origin main

# 5. Clean up branch (optional)
git branch -d website-integration
```

## Post-merge: web-winter Integration

After PROD migrations are applied and code is deployed:

1. **Share with frontend team**:

   - `src/About/Frontend/ONLINE_ORDERING_UI_TASKS.md` — UI task spec
   - RPC function signatures (input/output format)

2. **Frontend replaces stubs** in web-winter:

   - `useCreateOrder()` → `supabase.rpc('create_online_order', { p_data: {...} })`
   - `useOrderActions().cancelOrder()` → `supabase.rpc('cancel_online_order', { p_order_id: id })`
   - `useOrderActions().updateOrder()` → `supabase.rpc('update_online_order', { p_order_id, p_items })`
   - `useOrderActions().addToOrder()` → `supabase.rpc('add_to_online_order', { p_order_id, p_items })`

3. **Enable Realtime** subscription on `orders` table for `customer_id` filter (already supported by Supabase, no extra config needed).

## Known Limitations

- `kitchen_hours` uses `Asia/Jakarta` timezone hardcoded in RPC
- Order counter resets daily (SK-1, SK-2...) — no global sequence
- No tax calculation in online orders yet (subtotal = total)
- Fulfillment method (`goshop`, `courier`) is stored but not enforced in business logic
- RLS on `orders` is permissive (`true` for public) — RPCs use SECURITY DEFINER as guard
