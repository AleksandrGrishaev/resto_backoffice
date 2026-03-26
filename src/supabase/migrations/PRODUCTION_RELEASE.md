# Production Release: Kitchen Ritual System

## Migrations to Apply

Apply in order. All are independent (no cross-dependencies), but sequential order is recommended.

| #   | File                                           | Description                                                                 |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | `248_add_is_premade_to_preparations.sql`       | Add `is_premade BOOLEAN DEFAULT false` to preparations                      |
| 2   | `249_add_task_type_to_production_schedule.sql` | Add `task_type TEXT DEFAULT 'production'` to production_schedule            |
| 3   | `251_ritual_custom_tasks.sql`                  | New table: custom checklist tasks for rituals (RLS + grants)                |
| 4   | `252_ritual_completions.sql`                   | New table: ritual completion history with JSONB task details (RLS + grants) |
| 5   | `253_add_target_mode_to_preparations.sql`      | Add `target_mode TEXT DEFAULT 'auto'` to preparations                       |

### Staff Work Hours — Time Slots & Shift Presets

| #   | File                                       | Description                                                                                        |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 6   | `254_add_time_slots_and_shift_presets.sql` | Add `time_slots JSONB` to staff_work_logs + new `staff_shift_presets` table with 3 default presets |

## Post-Migration Steps

After applying all migrations:

```sql
-- 1. Make restaurant_id nullable (app setting not configured in PostgREST)
ALTER TABLE ritual_completions ALTER COLUMN restaurant_id DROP NOT NULL;
ALTER TABLE ritual_custom_tasks ALTER COLUMN restaurant_id DROP NOT NULL;

-- 2. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

### After migration 254 (shift presets):

```sql
-- Verify shift presets seeded
SELECT name, start_hour, end_hour FROM staff_shift_presets ORDER BY sort_order;
-- Expected: Full Day (8-22), Morning (8-16), Evening (14-22)

-- Verify time_slots column
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'staff_work_logs' AND column_name = 'time_slots';

NOTIFY pgrst, 'reload schema';
```

## Verification

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE tablename IN ('ritual_custom_tasks', 'ritual_completions');

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('ritual_custom_tasks', 'ritual_completions');

-- Check grants
SELECT grantee, table_name FROM information_schema.table_privileges
WHERE table_name IN ('ritual_custom_tasks', 'ritual_completions') AND grantee = 'authenticated';

-- Check new columns on preparations
SELECT column_name, column_default FROM information_schema.columns
WHERE table_name = 'preparations' AND column_name IN ('is_premade', 'target_mode');

-- Check new column on production_schedule
SELECT column_name, column_default FROM information_schema.columns
WHERE table_name = 'production_schedule' AND column_name = 'task_type';
```

## Verification (migration 254)

```sql
-- Check table + RLS
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'staff_shift_presets';

-- Check grants
SELECT grantee, table_name FROM information_schema.table_privileges
WHERE table_name = 'staff_shift_presets' AND grantee = 'authenticated';
```

---

## Customer Invite Flow (migrations 255-259)

### Migrations to Apply

| #   | File                                 | Description                                                     |
| --- | ------------------------------------ | --------------------------------------------------------------- |
| 7   | `255_customer_invites.sql`           | New table: unified invite for customer + order QR flows (RLS)   |
| 8   | `256_rpc_create_customer_invite.sql` | RPC: staff generates 30-day invite for existing POS customer    |
| 9   | `257_rpc_create_order_invite.sql`    | RPC: staff generates 2-hour invite for order without customer   |
| 10  | `258_rpc_claim_invite.sql`           | RPC: customer claims invite after auth (both flows, race-safe)  |
| 11  | `259_rpc_get_invite_by_token.sql`    | RPC: safe anon lookup for /join page (returns type + name only) |

### Pre-requisite

```sql
-- Ensure pgcrypto extension (needed for token generation)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
```

### Post-Migration

```sql
-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

### Verification

```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE tablename = 'customer_invites';

-- Check RLS policies (should have staff_all only, NO anon SELECT)
SELECT policyname FROM pg_policies WHERE tablename = 'customer_invites';

-- Check RPCs registered
SELECT proname FROM pg_proc
WHERE proname IN ('create_customer_invite', 'create_order_invite', 'claim_invite', 'get_invite_by_token');

-- Test RPC (should return 'Unauthorized' for non-staff or 'Order not found')
SELECT create_order_invite('00000000-0000-0000-0000-000000000000'::uuid);
```

### Security Notes

- No anon SELECT policy on `customer_invites` — token lookup via `get_invite_by_token` RPC only
- `create_*_invite` RPCs require `is_staff()` — website customers cannot generate tokens
- `claim_invite` uses `FOR UPDATE SKIP LOCKED` — prevents double-claim race condition
- Generic error messages in EXCEPTION handlers — no DB internals leaked

---

## Feature Summary

- **Staff Time Slots**: Work hours now track exact time ranges (e.g. 08:00-16:00) instead of just total hours. Configurable shift presets (Full Day, Morning, Evening). POS dialog with hour-grid picker. Admin schedule timeline with infinite scroll and click-to-edit for future dates.
- **Ritual System**: Morning (7:30-10:00) and Evening (18:00-22:00) kitchen workflows
- **Custom Tasks**: Configurable checklist items (clean fridge, check expiry, etc.)
- **Preparation Scheduling**: Assign preparations to morning/evening with auto/fixed quantities
- **Pre-made Management**: Half-cooked items with short shelf life, separate config tab
- **KPI Tracking**: Completion rate, streak, avg duration, per-staff breakdown, history with detail view
- **Time Windows**: Auto-open/close rituals, session persistence for tablet restart recovery
- **Customer Invite QR (Order)**: Pre-bill auto-prints QR for orders without customer. Customer scans → registers → order linked via Supabase realtime. POS shows toast notification.
- **Customer Invite QR (Customer)**: Staff prints invite QR from LoyaltyPanel. Customer scans → registers → linked to existing POS profile (no duplicate). 30-day expiry.
- **ESC/POS QR Printing**: QR code generation added to thermal printer commands (GS ( k). Standalone invite print + embedded in pre-bill.
