# Production Release: Kitchen Production Control

## Migrations to apply on PROD

### 1. Migration 290: Production Control Fields (DEV applied 2026-04-09)

```sql
-- Staff accountability (links to staff_members table)
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES staff_members(id);
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS staff_member_name TEXT;

-- Photo verification
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ;

-- Time tracking
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE production_schedule ADD COLUMN IF NOT EXISTS is_quick_completion BOOLEAN DEFAULT FALSE;

-- Index for staff queries
CREATE INDEX IF NOT EXISTS idx_production_schedule_staff ON production_schedule(staff_member_id) WHERE staff_member_id IS NOT NULL;

-- Index for KPI dashboard date range queries
CREATE INDEX IF NOT EXISTS idx_production_schedule_date_dept ON production_schedule(schedule_date, department);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

**Status:** DEV applied | PROD pending
**Risk:** Low (only adds nullable columns + index, no data changes)
**Dependencies:** `staff_members` table must exist on PROD (already exists with 8 active staff)

### 2. Migration 291: Production Photos Storage Bucket (DEV applied 2026-04-09)

```sql
-- Create bucket for production photos (public read, 5MB max, jpeg/png/webp)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-photos',
  'production-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: staff only (uses is_staff() check)
CREATE POLICY "Staff can upload production photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'production-photos' AND public.is_staff());

CREATE POLICY "Staff can update production photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'production-photos' AND public.is_staff());

CREATE POLICY "Staff can delete production photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'production-photos' AND public.is_staff());

CREATE POLICY "Public read access for production photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'production-photos');
```

**Status:** DEV applied | PROD pending
**Risk:** Low (creates new bucket + RLS policies, no existing data affected)
**Dependencies:** `is_staff()` function must exist on PROD (already exists)

---

### 3. Migration 292: Photo Cleanup Cron (DEV applied 2026-04-09)

```sql
-- Enable pg_cron extension (must be enabled in Supabase Dashboard first on Pro plan)
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

-- Daily cleanup at 03:00 UTC — delete photos older than 7 days
SELECT cron.schedule(
  'cleanup-production-photos',
  '0 3 * * *',
  $$
    DELETE FROM storage.objects
    WHERE bucket_id = 'production-photos'
      AND created_at < NOW() - INTERVAL '7 days';

    UPDATE production_schedule
    SET photo_url = NULL, photo_uploaded_at = NULL
    WHERE photo_url IS NOT NULL
      AND photo_uploaded_at < NOW() - INTERVAL '7 days';
  $$
);
```

**Status:** DEV applied | PROD pending
**Risk:** Low (creates cron job, no immediate data changes)
**Dependencies:** pg_cron must be enabled via Supabase Dashboard → Extensions BEFORE applying
**⚠️ NOTE:** If pg_cron is not available on your Supabase plan, skip this migration. Photos will accumulate but won't cause issues. Can be cleaned manually or via Edge Function later.

---

### 4. Migration 293: Ritual Afternoon + Custom Task Extensions (DEV applied 2026-04-09)

```sql
-- Fix CHECK constraints to include 'afternoon'
ALTER TABLE ritual_custom_tasks DROP CONSTRAINT IF EXISTS ritual_custom_tasks_ritual_type_check;
ALTER TABLE ritual_custom_tasks ADD CONSTRAINT ritual_custom_tasks_ritual_type_check
  CHECK (ritual_type IN ('morning', 'afternoon', 'evening'));

ALTER TABLE ritual_completions DROP CONSTRAINT IF EXISTS ritual_completions_ritual_type_check;
ALTER TABLE ritual_completions ADD CONSTRAINT ritual_completions_ritual_type_check
  CHECK (ritual_type IN ('morning', 'afternoon', 'evening'));

-- Extend custom tasks with control features
ALTER TABLE ritual_custom_tasks ADD COLUMN IF NOT EXISTS requires_note BOOLEAN DEFAULT FALSE;
ALTER TABLE ritual_custom_tasks ADD COLUMN IF NOT EXISTS checklist_items JSONB;
```

**Status:** DEV applied | PROD pending
**Risk:** Low (constraint replacement is safe with IF EXISTS, adds nullable columns)
**⚠️ NOTE:** If CHECK constraint names differ on PROD, the `DROP CONSTRAINT IF EXISTS` will silently skip. Verify constraint names first:

```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'ritual_custom_tasks'::regclass AND contype = 'c';
SELECT conname FROM pg_constraint WHERE conrelid = 'ritual_completions'::regclass AND contype = 'c';
```

---

### 5. Migration 294: Staff Production KPI RPC (DEV applied 2026-04-09)

```sql
-- See full RPC in: src/supabase/migrations/294_staff_production_kpi_rpc.sql
-- Creates: get_staff_production_kpi(p_date_from, p_date_to, p_department)
-- Returns JSONB with: summary, staffMetrics[], ritualSummary
```

**Status:** DEV applied | PROD pending
**Risk:** Low (creates new function, no table changes)
**Dependencies:** `production_schedule` and `ritual_completions` tables must exist

---

### 6. Seed: Control Check Tasks (DEV seeded 2026-04-09)

```sql
INSERT INTO ritual_custom_tasks (name, ritual_type, department, sort_order, requires_note, checklist_items) VALUES
-- Morning (5 tasks)
('Check fridge: remove expired items', 'morning', 'kitchen', 1, true, NULL),
('Check freezer: plan thawing for tomorrow', 'morning', 'kitchen', 2, false, NULL),
('Verify yesterday''s labels (date, expiry)', 'morning', 'kitchen', 3, false,
  '[{"label": "All containers labeled", "required": true}, {"label": "Dates visible and correct", "required": true}, {"label": "Expired items removed", "required": true}]'::jsonb),
('Check ingredient stock levels', 'morning', 'kitchen', 4, true, NULL),
('Clean and sanitize prep stations', 'morning', 'kitchen', 5, false, NULL),
-- Afternoon (3 tasks)
('Mid-day fridge temperature check', 'afternoon', 'kitchen', 1, true, NULL),
('Restock prep items running low', 'afternoon', 'kitchen', 2, false, NULL),
('Clean prep stations between shifts', 'afternoon', 'kitchen', 3, false, NULL),
-- Evening (4 tasks)
('Final fridge check: cover & label all items', 'evening', 'kitchen', 1, true, NULL),
('Clean and sanitize all stations', 'evening', 'kitchen', 2, false,
  '[{"label": "Cutting boards cleaned", "required": true}, {"label": "Knives washed and stored", "required": true}, {"label": "Surfaces sanitized", "required": true}, {"label": "Floor swept", "required": false}]'::jsonb),
('Check waste bins and disposal', 'evening', 'kitchen', 3, false, NULL),
('Secure storage: lock freezer/fridge', 'evening', 'kitchen', 4, false, NULL);
```

**Status:** DEV seeded | PROD pending
**Risk:** Low (INSERT only, no conflicts expected)
**⚠️ NOTE:** Run AFTER migration 293 (needs `requires_note` and `checklist_items` columns)

---

## Recommended Apply Order

Apply in this exact order to avoid dependency issues:

```
1. Migration 290 — production_schedule columns (depends on staff_members)
2. Migration 291 — storage bucket + RLS
3. Migration 292 — pg_cron cleanup (optional, needs pg_cron enabled first)
4. Migration 293 — ritual CHECK fix + columns
5. Seed control tasks — (after 293)
6. Migration 294 — KPI RPC (after 290)
7. NOTIFY pgrst, 'reload schema'; — reload PostgREST cache
```

## Pre-release Checklist

### Before applying

- [ ] Verify `staff_members` table exists on PROD with active staff
- [ ] Verify `is_staff()` function exists on PROD
- [ ] Verify CHECK constraint names on `ritual_custom_tasks` and `ritual_completions`
- [ ] If using pg_cron: enable via Supabase Dashboard → Extensions

### Apply migrations

- [ ] Apply migration 290 on PROD
- [ ] Apply migration 291 on PROD
- [ ] Apply migration 292 on PROD (optional — skip if no pg_cron)
- [ ] Apply migration 293 on PROD
- [ ] Seed control tasks on PROD
- [ ] Apply migration 294 on PROD
- [ ] Run `NOTIFY pgrst, 'reload schema';`

### Verify after applying

- [ ] Verify production_schedule columns: `SELECT column_name FROM information_schema.columns WHERE table_name = 'production_schedule' AND column_name IN ('staff_member_id', 'photo_url', 'started_at', 'actual_duration_minutes', 'is_quick_completion')`
- [ ] Verify storage bucket: `SELECT id FROM storage.buckets WHERE id = 'production-photos'`
- [ ] Verify ritual constraints: `SELECT conname FROM pg_constraint WHERE conrelid = 'ritual_custom_tasks'::regclass AND contype = 'c'`
- [ ] Verify control tasks seeded: `SELECT COUNT(*) FROM ritual_custom_tasks WHERE is_active = true`
- [ ] Verify KPI RPC works: `SELECT get_staff_production_kpi(CURRENT_DATE - 7, CURRENT_DATE, NULL)`

### Test on tablet

- [ ] Task expand → ProductionCard renders ingredients + StaffPicker
- [ ] Photo capture → upload → visible in production card
- [ ] Complete task with staff + photo + qty → verify DB row
- [ ] Ritual dialog → note dialog for requires_note tasks
- [ ] Ritual dialog → StaffPicker in numpad qty dialog
- [ ] Admin → Production KPI screen loads with data
