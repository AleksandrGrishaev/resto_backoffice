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

## Feature Summary

- **Staff Time Slots**: Work hours now track exact time ranges (e.g. 08:00-16:00) instead of just total hours. Configurable shift presets (Full Day, Morning, Evening). POS dialog with hour-grid picker. Admin schedule timeline with infinite scroll and click-to-edit for future dates.
- **Ritual System**: Morning (7:30-10:00) and Evening (18:00-22:00) kitchen workflows
- **Custom Tasks**: Configurable checklist items (clean fridge, check expiry, etc.)
- **Preparation Scheduling**: Assign preparations to morning/evening with auto/fixed quantities
- **Pre-made Management**: Half-cooked items with short shelf life, separate config tab
- **KPI Tracking**: Completion rate, streak, avg duration, per-staff breakdown, history with detail view
- **Time Windows**: Auto-open/close rituals, session persistence for tablet restart recovery
