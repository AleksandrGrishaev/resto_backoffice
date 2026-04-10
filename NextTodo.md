# Sprint: Kitchen Production Control System

## Status (2026-04-10)

| Phase                                   | Status   | Migrations     |
| --------------------------------------- | -------- | -------------- |
| 1. Foundation (DB + Staff + Categories) | ✅ Done  | 290 (DEV)      |
| 2. Production Card + v2 Redesign        | ✅ Done  | —              |
| 3. Photo Verification                   | ✅ Done  | 291, 292 (DEV) |
| 4. Ritual & Control Points              | ✅ Done  | 293 (DEV)      |
| 5. Help / Instructions                  | Deferred | —              |
| 6. KPI & Manager Dashboard              | ✅ Done  | 294 (DEV)      |
| Code Review Fixes                       | ✅ Done  | —              |

**PROD pending:** Migrations 290-294 + seed control tasks. See `PRODUCTION_RELEASE.md` for full checklist.

**Key files changed this sprint:**

- `ProductionCard.vue` — dialog with tabs (Complete + Recipe), numpad, yield, portions
- `TaskCard.vue` — opens dialog on tap
- `StaffPicker.vue` — self-initializing staffStore
- `RitualDialog.vue` — staff per task, note dialog, per-task timing, numpad fix
- `PhotoCaptureDialog.vue` + `useProductionPhoto.ts` — camera capture + upload
- `ProductionKpiScreen.vue` — admin dashboard with staff table
- `measurementUnits.ts` — unit alias mapping (gr→gram, pc→piece)
- `useRecipeScaling.ts` — yield adjustment for ingredients

---

## Problem

Kitchen staff doesn't use the system meaningfully. The digital system and physical kitchen are separate realities:

1. **No instructions** — tasks say WHAT to produce but not HOW. No step-by-step workflow
2. **No verification** — tasks completed in 1 min by tapping "done" without doing actual work
3. **No accountability** — PROD has ONE shared "Kitchen Staff" account for all cooks. No individual tracking
4. **Flat task list** — 63 preparations shown as identical rows, no grouping, no priority visualization
5. **No control points** — ritual custom tasks exist but are empty checkboxes, no structured checks
6. **No photo proof** — impossible to verify production and labeling actually happened
7. **No staff picker** — when completing a task, no way to select WHO actually did the work

## Solution: Controlled Production Flow

Transform Tasks + Preparation screens from passive checklists into an **active production workflow with verification**.

---

## TARGET FLOW (how it should work after changes)

### Morning (07:30) — Cook opens Tasks screen

```
STEP 1: Start Morning Ritual
  → System shows tasks GROUPED BY CATEGORY (not flat list):

  🥕 Vegetable Preps (5 tasks)
    [ ] Avocado cleaned — 1410g — Fridge
    [ ] Herbs washed & cut — 200g — Fridge
    [ ] Onion sliced — 300g — Shelf
    ...

  🥫 Sauces & Dressings (4 tasks)
    [ ] Dressing GARDEN — 330g — Fridge
    [ ] Honey mustard — 200g — Fridge
    ...

  🥩 Meat Portions (3 tasks)
    [ ] Chicken breast thawed 100g — 400g — Fridge
    [ ] Sausages (2pc) — 160g — Fridge
    ...

  🍞 Dough & Bread (2 tasks)
    [ ] Dough ciabatta — 1449g — Shelf
    ...

  ✅ Control Checks
    [ ] Check fridge: remove expired items (note required)
    [ ] Check freezer: plan thawing for tomorrow
    [ ] Verify yesterday's labels (date, expiry)

STEP 2: Cook taps a task (e.g., "Dressing GARDEN")
  → Task EXPANDS into a Production Card:

  +--------------------------------------------------+
  | 🥫 Dressing GARDEN                                |
  | Target: 330g  |  Stock: 66g  |  Storage: Fridge   |
  +--------------------------------------------------+
  | INGREDIENTS (scaled to 330g):                      |
  |   Olive oil........... 100ml   [Shelf]             |
  |   Lemon juice......... 50ml    [Fridge]            |
  |   Garlic, minced...... 15g     [Fridge]            |
  |   Mixed herbs......... 10g     [Shelf]             |
  +--------------------------------------------------+
  | INSTRUCTIONS:                                      |
  |   1. Combine olive oil and lemon juice             |
  |   2. Add minced garlic, herbs                      |
  |   3. Whisk 2 min until emulsified                  |
  |   4. Transfer to container, label with date        |
  +--------------------------------------------------+
  | Who did this: [ Adi ▼ ]  ← staff picker dropdown    |
  | Actual produced: [___] g                           |
  | [TAKE PHOTO] → mandatory before completion         |
  | [COMPLETE]                                         |
  +--------------------------------------------------+

STEP 3: Cook produces the prep, selects WHO, enters quantity, takes photo
  → Staff picker: dropdown of kitchen staff (filtered by department)
  → Quantity: manual entry (no pre-fill)
  → MUST take photo of:
     a) The finished preparation in container
     b) The label (date + expiry)
  → Photo uploaded to Supabase Storage (compressed, 7-day retention)
  → Task marked complete with: staff_member_id, when, quantity, photo_url

STEP 4: Control checks
  → "Check fridge" requires a TEXT NOTE (what was found/removed)
  → "Verify labels" is a simple checkbox
  → Staff picker: WHO performed the check

STEP 5: Ritual completes
  → Summary: X/Y tasks done, photos taken, notes recorded
  → Per-staff breakdown: Adi did 5 tasks, Budi did 3 tasks
  → KPI: actual time spent, quick-completion flags, production accuracy
```

### Preparation Management screen — what changes

```
CURRENT:                          AFTER:
Flat list A-Z                     Grouped by category:
  Avocado cleaned                   🥕 Vegetable Preps
  Bacon slices 30g                    Avocado cleaned    1200g OK
  Baguette slice                      Herbs washed       200g  LOW
  Beef slices by gr                   Onion sliced       0g    OUT
  Beef steak by gram                ...
  Black pepper sauce                🥫 Sauces & Dressings
  Cheese sauce                        Cheese sauce       168g  EXPIRED
  Chicken breast...                   Dressing GARDEN    66g   LOW
  ...                                 Honey mustard      146g  EXPIRED
  (63 items, no structure)          ...
                                    🥩 Meat Portions
                                      Chicken 100g       400g  OK
                                      Beef slices        82g   LOW
                                    ...

                                    Categories are collapsible.
                                    Each category shows summary:
                                      "3 OK, 1 LOW, 2 EXPIRED"
```

---

## WHAT WE CHANGE (interface by interface)

### 1. Tasks Screen (`TasksScreen.vue`)

| What           | Current                                                 | After                                                      |
| -------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Task grouping  | Flat list, filter by type (premade/production/writeoff) | **Grouped by preparation category** with emoji headers     |
| Task card      | Compact row: name + stock + qty + checkmark             | **Expandable card** with recipe ingredients + instructions |
| Staff picker   | None (uses logged-in user)                              | **Dropdown** of kitchen staff by department                |
| Quantity input | Pre-filled with target, one tap to complete             | **Empty field**, manual entry required                     |
| Photo          | None                                                    | **Mandatory photo** before completion                      |
| Ingredients    | Not shown                                               | **Scaled ingredients** from useRecipeScaling               |
| Instructions   | Not shown                                               | **Step-by-step** from preparation.instructions field       |
| Storage info   | Not shown                                               | **Storage location** icon on each task + each ingredient   |
| Time tracking  | None visible                                            | **Timer** shown from task start to complete                |
| Control tasks  | Simple checkbox                                         | **Checkbox + required note** for inspection tasks          |

### 2. Ritual Dialog (`RitualDialog.vue`)

| What                | Current                                | After                                                        |
| ------------------- | -------------------------------------- | ------------------------------------------------------------ |
| Layout              | 3-column kanban (Todo/InProgress/Done) | Same kanban but tasks **grouped by category** in Todo column |
| Task start          | Tap moves to InProgress                | Tap **expands production card** (ingredients + instructions) |
| Staff picker        | None                                   | **Dropdown** before quantity entry — who did this task       |
| Numpad              | Pre-filled target quantity             | **Empty**, manual entry                                      |
| Photo               | None                                   | **Camera capture step** after quantity entry, before Done    |
| Custom tasks        | Simple toggle                          | Toggle + **optional note field** for inspection tasks        |
| Quick-complete flag | None                                   | **Warning** if task completed < minimum time                 |

### 3. Preparation Screen (`PreparationScreen.vue`)

| What                 | Current                   | After                                               |
| -------------------- | ------------------------- | --------------------------------------------------- |
| List layout          | Flat alphabetical         | **Grouped by category** with collapsible sections   |
| Category header      | None                      | **Emoji + name + summary** (X OK, Y LOW, Z EXPIRED) |
| Sort within category | By status priority        | Same (expired first, then low, then OK)             |
| Filters              | Storage location + status | Same, but now also **filter by category**           |

### 4. TaskCard Component (`TaskCard.vue`)

| What            | Current                                        | After                                                             |
| --------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Default state   | Compact row (name + meta + qty input + button) | Same compact row but with **category color/emoji** prefix         |
| Expanded state  | None                                           | **Full production card**: ingredients, instructions, photo, timer |
| Expand trigger  | None                                           | Tap on card body (not on complete button)                         |
| Complete button | Always visible, one tap                        | Visible only in **expanded state**, requires qty + photo          |

### 5. New: PhotoCaptureDialog

```
+--------------------------------------------------+
|              Take Photo                    [X]    |
|                                                    |
|  +--------------------------------------------+  |
|  |                                              |  |
|  |          Camera viewfinder / Preview         |  |
|  |          (HTML5 capture="environment")        |  |
|  |                                              |  |
|  +--------------------------------------------+  |
|                                                    |
|  Photo of prepared item with visible label         |
|                                                    |
|  [ RETAKE ]                    [ USE PHOTO ]       |
+--------------------------------------------------+
```

- Opens device camera on tablet (HTML5 `<input capture="environment">`)
- Compresses to max 800x800 WebP (reuse pattern from useImageUpload)
- Uploads to `production-photos` Supabase Storage bucket
- Path: `{department}/{date}/{preparationId}_{timestamp}.webp`
- Returns public URL
- 7-day retention (cleanup via scheduled Edge Function or DB trigger)

---

## DATABASE CHANGES

### NEW: staff_members table

```sql
-- Lightweight staff roster (no auth, just names for picker)
-- Separate from `users` table — users are for login, staff_members are for accountability
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,                    -- "Adi", "Budi", "Wayan"
  department TEXT NOT NULL DEFAULT 'kitchen', -- kitchen / bar
  position TEXT,                         -- head_cook, cook, helper, dishwasher
  is_active BOOLEAN DEFAULT TRUE,
  phone TEXT,                            -- optional, for contact
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON staff_members FOR ALL USING (is_staff());

-- Index
CREATE INDEX idx_staff_members_dept ON staff_members(department, is_active);
```

**Why not use `users` table?**

- PROD has 1 shared "Kitchen Staff" login for all cooks
- Creating auth accounts for every cook adds complexity (passwords, PINs, sessions)
- `staff_members` is just a name list for the "Who did this?" dropdown
- Can link to `users` later if individual logins are added

### production_schedule table (add columns)

```sql
-- Staff accountability
staff_member_id UUID REFERENCES staff_members(id),  -- WHO did the task
staff_member_name TEXT,                              -- denormalized for display

-- Photo verification
photo_url TEXT,                          -- Supabase Storage public URL
photo_uploaded_at TIMESTAMPTZ,           -- when photo was taken

-- Time tracking
started_at TIMESTAMPTZ,                  -- when cook started working on task
actual_duration_minutes INTEGER,         -- computed: completed_at - started_at
is_quick_completion BOOLEAN DEFAULT FALSE, -- flagged if duration < min_completion_minutes
```

### preparations table (add column)

```sql
-- Instructions for kitchen staff (many preparations have this empty — need to fill)
-- `instructions` field already exists on Recipe type but NOT on preparations table
instructions TEXT,                        -- step-by-step cooking/assembly instructions
```

### ritual_custom_tasks table (fix + extend)

```sql
-- Fix: add 'afternoon' to CHECK constraint (currently only morning/evening)
ALTER TABLE ritual_custom_tasks DROP CONSTRAINT IF EXISTS ritual_custom_tasks_ritual_type_check;
ALTER TABLE ritual_custom_tasks ADD CONSTRAINT ritual_custom_tasks_ritual_type_check
  CHECK (ritual_type IN ('morning', 'afternoon', 'evening'));

-- Same fix for ritual_completions
ALTER TABLE ritual_completions DROP CONSTRAINT IF EXISTS ritual_completions_ritual_type_check;
ALTER TABLE ritual_completions ADD CONSTRAINT ritual_completions_ritual_type_check
  CHECK (ritual_type IN ('morning', 'afternoon', 'evening'));

-- Extend custom tasks
ALTER TABLE ritual_custom_tasks ADD COLUMN requires_note BOOLEAN DEFAULT FALSE;
ALTER TABLE ritual_custom_tasks ADD COLUMN checklist_items JSONB; -- sub-items for complex checks
```

### Supabase Storage

```sql
-- Create bucket for production photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-photos',
  'production-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS: staff can upload and read
CREATE POLICY "Staff can upload production photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'production-photos');

CREATE POLICY "Anyone can view production photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'production-photos');

CREATE POLICY "Staff can delete production photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'production-photos');
```

### Photo Cleanup (7-day retention)

Option A: Supabase Edge Function on cron (daily at 03:00):

```typescript
// Delete photos older than 7 days
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
const { data } = await supabase.storage.from('production-photos').list()
// filter by created_at < cutoff, then .remove()
```

Option B: PostgreSQL function + pg_cron:

```sql
-- Delete storage objects older than 7 days where bucket = 'production-photos'
SELECT cron.schedule('cleanup-production-photos', '0 3 * * *', $$
  DELETE FROM storage.objects
  WHERE bucket_id = 'production-photos'
  AND created_at < NOW() - INTERVAL '7 days';
$$);
```

---

## NEW FILES TO CREATE

```
src/
├── composables/
│   └── useProductionPhoto.ts              -- capture, compress, upload, delete
├── stores/
│   └── staff/
│       ├── staffStore.ts                  -- NEW: Pinia store for staff_members
│       ├── staffService.ts                -- NEW: Supabase CRUD for staff_members
│       └── types.ts                       -- NEW: StaffMember interface
├── views/kitchen/
│   ├── tasks/
│   │   ├── components/
│   │   │   ├── TaskCard.vue               -- MODIFY: expandable + category emoji
│   │   │   ├── CategoryGroup.vue          -- NEW: collapsible category section header
│   │   │   ├── ProductionCard.vue         -- NEW: expanded task (ingredients + instructions + photo + staff)
│   │   │   └── StaffPicker.vue            -- NEW: dropdown of staff by department
│   │   ├── dialogs/
│   │   │   ├── RitualDialog.vue           -- MODIFY: category grouping + photo + staff picker
│   │   │   └── PhotoCaptureDialog.vue     -- NEW: camera capture + preview + confirm
│   │   └── TasksScreen.vue                -- MODIFY: group by category + staff + photo
│   └── preparation/
│       └── components/
│           └── StockListTab.vue           -- MODIFY: group by category
```

## FILES TO MODIFY

```
src/stores/kitchenKpi/types.ts                     -- add photo_url, staff_member_id, started_at to ProductionScheduleItem
src/stores/kitchenKpi/kitchenKpiService.ts          -- map new fields
src/core/background/types.ts                        -- add photoUrl, staffMemberId to ScheduleCompleteTaskPayload
src/core/background/useBackgroundTasks.ts           -- pass photoUrl + staffMemberId in completion flow
src/views/kitchen/tasks/TasksScreen.vue              -- category grouping + photo + staff integration
src/views/kitchen/tasks/components/TaskCard.vue      -- expandable + require manual qty + staff
src/views/kitchen/tasks/dialogs/RitualDialog.vue     -- category grouping + photo + staff per task
src/views/kitchen/preparation/components/StockListTab.vue -- category grouping
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (DB + Staff + Categories) ✅ DONE

- [x] Create `staff_members` table + seed with real kitchen/bar staff names — already existed (DEV: 11 staff, PROD: 8 staff)
- [x] Create StaffPicker component (dropdown filtered by department) — `StaffPicker.vue`
- [x] DB migration: add staff_member_id, photo_url, started_at fields to production_schedule — migration 290 (DEV applied)
- [x] Group tasks by `preparation.type` (category UUID → name + emoji) — `TasksScreen.vue` + `CategoryGroup.vue`
- [x] Collapsible category sections with summary badges — `CategoryGroup.vue`
- [x] Group preparations in StockListTab by category — `StockListTab.vue` with collapsible headers + status summary
- [ ] Category filter chips — deferred (grouping is sufficient for now)
- [x] Staff store added to kitchen initialization dependencies — `dependencies.ts`

### Phase 2: Production Card (expandable task with staff picker) ✅ DONE

- [x] Create ProductionCard.vue with scaled ingredients (useRecipeScaling)
- [x] Show instructions field from preparation/recipe
- [x] Show storage location per ingredient (Fridge/Freezer/Shelf icon)
- [x] Make TaskCard expandable (tap to open ProductionCard, close to collapse)
- [x] Integrate StaffPicker into ProductionCard — required field for production, optional for write-off
- [x] Remove pre-fill of target quantity — empty field, manual entry required
- [x] Timer: track started_at when task expanded (MM:SS elapsed display)
- [x] Code review: fixed staff store init, error handling, stale data, write-off staff fields
- [x] **v2 Redesign**: ProductionCard → dialog with 2 tabs (Complete + Recipe)
- [x] **Numpad popup**: tap qty card → popup numpad, also for Scale-to calculator
- [x] **Yield support**: ingredients show purchase qty with yield % (e.g. "285.7 g (70% yield)")
- [x] **Portion support**: portion-type preps show toggle (portions / base unit), conversion display
- [x] **Unit aliases**: `gr→gram`, `pc→piece` fix in `measurementUnits.ts` (no more "?" units)
- [x] **StaffPicker self-init**: auto-loads staffStore if not initialized (fixes kitchen tablet)

### Phase 3: Photo Verification ✅ DONE

- [x] Create `production-photos` Supabase Storage bucket + RLS — migration 291 (DEV applied)
- [x] Create useProductionPhoto composable (capture + compress 800px WebP + upload) — `src/composables/useProductionPhoto.ts`
- [x] Create PhotoCaptureDialog (camera → preview → retake/confirm) — `src/views/kitchen/tasks/dialogs/PhotoCaptureDialog.vue`
- [x] Integrate into task completion: photo required for production tasks before "Complete" — ProductionCard + TaskCard + TasksScreen emit chain updated
- [x] Photo cleanup: 7-day retention via pg_cron — migration 292 (DEV applied, daily at 03:00 UTC)

### Phase 4: Ritual & Control Points ✅ DONE

- [x] Fix afternoon CHECK constraint on ritual_custom_tasks + ritual_completions — migration 293 (DEV applied)
- [x] Extend ritual custom tasks: requires_note, checklist_items — migration 293
- [x] Seed default control check tasks — 13 tasks (5 morning, 3 afternoon, 4 evening) on DEV
- [x] Add StaffPicker to RitualDialog — per-task "who did this" in both qty dialog and note dialog
- [x] Track per-task duration (taskStartTimes → taskDurations) — recorded in RitualTaskDetail.durationSeconds
- [x] Note dialog for requires_note custom tasks — text + staff picker
- [x] Per-custom-task completed_by tracking in ritual task_details JSONB — staffMemberId/staffMemberName/notes/durationSeconds

### Code Review Fixes (cross-phase, 2026-04-09)

- [x] Migration 291 idempotency: added `DROP POLICY IF EXISTS` before `CREATE POLICY`
- [x] Migration 292 idempotency: added `cron.unschedule` before `cron.schedule`
- [x] RLS `is_staff()` on storage policies (was `TO authenticated` only)
- [x] File size mismatch: client 5MB = bucket 5MB
- [x] Blob type validation: handle empty string `file.type`
- [x] Photo remove: added `.catch()` error handling
- [x] Optimistic update: added `staffMemberId`, `startedAt`, `photoUrl`
- [x] KPI dashboard timezone: Bali time (`Asia/Makassar`) instead of UTC
- [x] Performance index: `idx_production_schedule_date_dept(schedule_date, department)`
- [x] RitualDialog: hardcoded department → dynamic `noteDialogTask.department`
- [x] RitualDialog: non-null assertion → optional chaining
- [x] RitualDialog: numpad pre-fill replaces on first keypress
- [x] RitualDialog: custom task start time for non-requiresNote tasks

### Phase 5: Help / Instructions (separate sprint)

- [ ] Update /help/kitchen with current screens
- [ ] Add /help/kitchen/tasks — full Tasks + Rituals guide
- [ ] Add /help/kitchen/daily-workflow — step-by-step daily routine
- [ ] Fill in `instructions` field for all 63 active preparations
- [ ] Generate printable prep sheets (PDF)

### Phase 6: KPI & Manager Dashboard ✅ DONE

- [x] Per-staff KPI aggregation RPC `get_staff_production_kpi` — migration 294 (DEV applied)
- [x] Manager dashboard screen in Admin panel — `ProductionKpiScreen.vue` at admin/production-kpi
- [x] Summary cards: tasks completed, total produced, photo rate, quick completions, rituals, M/A/E breakdown
- [x] Per-staff sortable table: name, done count, qty, completion rate, photo rate, quick completions, avg duration, active days
- [x] Date range filter: Today / 7 Days / 30 Days
- [x] Ritual summary: total rituals, avg duration, avg completion rate, by type breakdown
- [ ] Weekly report: who did what, accuracy, speed (deferred — future sprint)
- [ ] Optional: task pre-assignment per person (deferred — future sprint)

---

## CATEGORIES (current, 63 active preparations)

| Emoji | Category                  | Count | Examples                                            |
| ----- | ------------------------- | ----- | --------------------------------------------------- |
| 🥕    | Vegetable Preps           | 14    | Avocado, Herbs, Onion, Mushroom, Cucumber rolls     |
| 🥫    | Sauces & Dressings        | 12    | Cheese sauce, Dressing GARDEN, Honey mustard, Ponzu |
| 🥩    | Meat Portions             | 9     | Chicken 100g/200g, Beef slices, Patty, Sausages     |
| 🐟    | Seafood Portions          | 6     | Dorado, Salmon, Shrimp, Tuna                        |
| 🍓    | Frozen Fruits             | 4     | Banana, Dragon berry, Mango, Papaya smoothie        |
| 🍞    | Dough & Bread             | 3     | Ciabatta, Dough, Sourdough                          |
| 🌿    | Garnishes & Toppings      | 2     | Rice, Spaghetti                                     |
| 🥣    | Dips & Spreads            | 2     | Humus, Humus red                                    |
| 👨‍🍳    | Cakes & Pastry            | 2     | Choco heart, Snow boll                              |
| 🧀    | Dairy Portions            | 2     | Mozarella 30g, 50g                                  |
| ❄️    | Frozen Portions           | 2     | Tom yam pack, Tom yam base                          |
| 🍳    | Custom Breakfast / Goreng | 2     | Baguette slice, Tempung goreng                      |
| 🫒    | Infused Oils              | 1     | Oil-Greek                                           |
| 🍯    | Condiments & Jams         | 1     | Strawberry jam                                      |
| 🍽️    | Side Dishes               | 1     | MushPotato                                          |
