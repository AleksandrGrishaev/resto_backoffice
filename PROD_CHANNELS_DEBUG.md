# PROD Debug: Order Type Dialog - Sales Channels Not Showing

## Problem

In production POS, the order type dialog (+ ADD button) shows empty — no channel options (Takeaway, GoFood, Grab Food). Only "CANCEL" button visible.

## Root Cause (Hypothesis)

Channel-related migrations (137-146) likely NOT applied to PROD database (`bkntdcvzatawencxghob`).

The `channelsService.loadChannels()` query JOINs multiple tables:

```sql
SELECT *, channel_taxes(..., taxes(...)), channel_payment_methods(..., payment_methods(...))
FROM sales_channels ORDER BY sort_order
```

If ANY of these tables don't exist, the query fails silently → dialog shows empty.

## Error Chain

1. `channelsService.loadChannels()` → PostgREST error (table/relationship not found)
2. `channelsStore.initialize()` → catches, re-throws
3. `ProductionInitializationStrategy` → catches, returns `{ success: false }` (non-critical)
4. Dialog watcher in `OrderTypeDialog.vue:95-108` → catches in try-finally
5. Dialog renders with empty `channelOptions` → blank dialog

## DEV Database Status (Verified)

- `sales_channels`: 4 rows, all `is_active: true` (dine_in, takeaway, gobiz, grab)
- `channel_taxes`: exists, linked
- `channel_payment_methods`: exists, linked
- `taxes`: exists (Service Tax 5%, Local Tax 10%)
- Everything works correctly

## PROD Database — NEEDS VERIFICATION

MCP is now pointed at PROD (`bkntdcvzatawencxghob`). Run these checks:

### Step 1: Check if tables exist

```
mcp__supabase__list_tables({ schemas: ['public'] })
```

Look for: `sales_channels`, `channel_prices`, `channel_menu_items`, `channel_taxes`, `taxes`, `channel_payment_methods`

### Step 2: If tables exist, check data

```sql
SELECT code, name, type, is_active, sort_order FROM sales_channels ORDER BY sort_order;
```

### Step 3: If tables DON'T exist, apply migrations in order

Apply these migrations from `src/supabase/migrations/` to PROD **in order**:

1. `137_sales_channels.sql` — creates `sales_channels`, `channel_prices`, `channel_menu_items` + seeds 4 channels
2. `140_add_channel_code_to_orders.sql` — adds `channel_code` column to orders
3. `141_taxes_and_channel_taxes.sql` — creates `taxes`, `channel_taxes`, adds `tax_mode` to sales_channels
4. `142_grant_permissions_taxes_and_channels.sql` — grants for service_role
5. `144_channel_payment_methods.sql` — creates `channel_payment_methods` junction table
6. `146_add_channel_commission_categories.sql` — adds commission expense categories

### Step 4: After migrations, activate channels

```sql
UPDATE sales_channels SET is_active = true WHERE code IN ('takeaway', 'gobiz', 'grab');
```

(Migration 137 seeds gobiz/grab as `is_active: false` by default)

### Step 5: Reload PostgREST schema cache

```sql
NOTIFY pgrst, 'reload schema';
```

## Key Files

- `src/views/pos/tables/dialogs/OrderTypeDialog.vue` — the dialog component
- `src/stores/channels/channelsStore.ts` — store with `activeChannels` getter
- `src/stores/channels/channelsService.ts:21-35` — the Supabase query with JOINs
- `src/stores/channels/supabaseMappers.ts` — DB→JS mappers
- `src/core/initialization/ProductionInitializationStrategy.ts:1000-1029` — channels init (non-critical)

## Optional Code Fix

After confirming PROD issue, consider making `loadChannels()` resilient:

- Try full query with JOINs first
- If fails, fallback to `SELECT *` without JOINs (channels still work, just without tax/payment method links)
- This prevents blank dialog even if some migration tables are missing
