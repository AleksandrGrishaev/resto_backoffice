# Production Release Notes

## Release: fix/kitchen-duplicate-on-website-order-merge

**Date:** 2026-04-01

### Summary

Fix kitchen order duplication when website orders are moved/merged to a table in POS.
Also: extract `KITCHEN_ACTIVE_STATUSES` constant, update `types.gen.ts` for `accrual_date`.

### DB Migrations Required

**None.** This is a frontend-only fix.

Migration `282_add_accrual_date_to_transactions.sql` — already applied to PROD ✅

### What Changed

#### Bug Fix: Kitchen Duplication on Merge

**Problem:** When a website order was merged into an existing dine-in order (occupied table), the kitchen display showed items twice — under both old and new order numbers. Additionally, `source: 'website'` and customer metadata were lost.

**Fix (2 files):**

1. **`src/stores/kitchen/index.ts`** — When an `order_items` UPDATE event arrives with a changed `order_id` (merge), remove the item from the old order in kitchen store before adding to new. Guard: only scans when `oldItem.order_id !== item.order_id` (requires `REPLICA IDENTITY FULL` on `order_items` — already set on both DEV and PROD).

2. **`src/stores/pos/orders/ordersStore.ts`** — New `preserveWebsiteMetadata()` function copies `source`, `externalOrderId`, `customerPhone`, `comment`, `fulfillmentMethod`, `pickupTime`, `estimatedReadyTime` from source to target order during merge. Called in both `moveOrderToTable` and `convertOrderToDineIn`.

#### Refactoring

3. **`src/stores/pos/types.ts`** — New `KITCHEN_ACTIVE_STATUSES` constant (`['scheduled', 'waiting', 'cooking', 'ready']`). Replaces 7 inline duplicates across 4 kitchen files.

4. **`src/supabase/types.gen.ts`** — Added `accrual_date` to transactions table types (column already exists in both DBs). Removes `as any` casts from `src/stores/account/supabaseMappers.ts`.

### Pre-deploy Checklist

- [ ] Verify `REPLICA IDENTITY FULL` on `order_items` table (required for migration guard):
  ```sql
  SELECT relreplident FROM pg_class WHERE relname = 'order_items';
  -- Expected: 'f' (full)
  ```
- [ ] Deploy to Vercel (push to `main`)

### Post-deploy Verification

1. **Kitchen duplication test:**

   - Create order from website
   - In POS, convert to dine-in → select an occupied table (merge)
   - Verify kitchen display shows items only ONCE under target order number
   - Verify no duplicate notification sound

2. **Website metadata test:**

   - Create order from website with customer name + comment
   - Merge into existing order in POS
   - Verify target order shows `source: 'website'`, customer name, comment

3. **Normal kitchen flow (regression):**
   - Create regular POS order, send to kitchen
   - Verify items appear correctly
   - Change status (waiting → cooking → ready) — verify updates work
