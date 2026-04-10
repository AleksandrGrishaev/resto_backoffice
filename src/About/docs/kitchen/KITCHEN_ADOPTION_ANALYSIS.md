# Kitchen System Adoption: Analysis & Action Plan

## Problem Statement

The system has all the technical capability for preparation management (FIFO tracking, recommendations, rituals, write-offs, KPI). But the kitchen staff doesn't use it meaningfully. Tasks are completed in 1 minute by tapping "done, done, done" without actually doing the work. The digital system and the real kitchen are two separate realities.

## Root Cause Analysis

### 1. No connection between SYSTEM and PHYSICAL REALITY

**Current state:** The Tasks screen shows a flat list of prep names with quantities. The Preparation screen shows batches with expiry dates. But none of this maps to what the cook physically sees when they open the fridge.

**Problem:** A cook opens the fridge, sees containers. They don't think "I need to produce 400g of Chicken breast thawed 200g." They think "the chicken container is half-empty, the sauce is full."

**Fix needed:** Visual representation of storage locations (Fridge / Freezer / Shelf) with what's inside, how much, and what's expiring. The system should mirror what they physically see.

### 2. No step-by-step instructions (HOW to do things)

**Current state:** Tasks say WHAT to produce (name + quantity). But they don't say HOW. There's no cooking instruction visible during task execution. The `instructions` field exists on recipes but is never shown in the task workflow.

**Problem:** A new cook sees "Produce 400g Dressing GARDEN" — what do they do? Where's the recipe? What are the steps? They need to navigate away to Catalog, find the item, hope instructions exist.

**Fix needed:** Each task should expand to show step-by-step instructions with ingredients, quantities, technique, timing. Like a recipe card embedded in the task.

### 3. Tasks are too easy to fake-complete

**Current state:** Tap the green checkmark, task is done. No verification. No quantity input required (pre-filled target auto-accepted). No photo proof. No time tracking of actual work.

**Problem:** It's faster to tap "done" than to actually cook. The system rewards speed of clicking, not quality of work.

**Fix needed:** Completion friction — require entering actual produced quantity (not pre-filled), minimum time threshold, and for critical items photo verification or manager confirmation.

### 4. No personal accountability

**Current state:** `completed_by` is recorded but not prominently displayed. There's no "this is YOUR task" assignment. Everyone sees the same list.

**Problem:** When everyone is responsible for everything, nobody is responsible for anything.

**Fix needed:** Task assignment to specific people. "Chef A: Morning preps (sauces, dressings). Chef B: Morning preps (proteins, dough)." With visible name on each task.

### 5. No workflow structure (the business process is missing)

**Current state:** Tasks appear as a flat list. There's no sequence, no dependencies, no "first do X, then do Y."

**Problem:** A cook doesn't know: Do I start with the dough (needs rising time)? Or the sauce (quick but needs cooling)? What's the optimal order?

**Fix needed:** Tasks should have ordering, grouping by workflow stage, and time estimates. "Start these first (30 min lead time) → While waiting, do these → Finish these last."

### 6. Rituals are gamified but not operational

**Current state:** Rituals have progress bars, congratulations screens, streaks. But the actual work content is the same flat checklist.

**Problem:** The gamification rewards completion speed, not quality. A cook who taps through everything in 2 minutes gets the same "congratulations" as one who spent 90 minutes actually producing everything.

**Fix needed:** Rituals should track actual production time, flag suspiciously fast completions, and tie KPI to accuracy (produced vs target) not just completion.

---

## Proposed Solutions

### Phase 1: Visual Kitchen Map (bridge system to reality)

**Add a "Kitchen View" mode to the Preparation screen** that shows storage by physical location:

```
+--------------------+  +--------------------+  +--------------------+
|   FRIDGE           |  |   FREEZER          |  |   SHELF            |
|                    |  |                    |  |                    |
| [Chicken 200g]    |  | [Salmon portions]  |  | [Oil-Greek]        |
|  600g / 2 days    |  |  500g / OK         |  |  71ml / 3 days     |
|  Status: OK       |  |  Status: OK        |  |  Status: LOW       |
|                    |  |                    |  |                    |
| [Dressing GARDEN] |  | [Beef slices]      |  | [Honey mustard]    |
|  66g / 1 day      |  |  82g / LOW         |  |  146g / EXPIRED    |
|  Status: LOW      |  |                    |  |  Status: EXPIRED   |
|                    |  | [Dorado unfrozen]  |  |                    |
| [Cheese sauce]    |  |  120g / OK         |  | [Mushroom sauce]   |
|  168g / EXPIRED   |  |                    |  |  487ml / OK        |
+--------------------+  +--------------------+  +--------------------+
```

**Key design principles:**

- Color coding: Green=OK, Yellow=Low/Expiring, Red=Expired/Out
- Each item is a card showing: name, quantity, days of supply, status
- Tap to expand: see batches, actions (write-off, transfer, produce more)
- Staff should be able to look at the screen, look at the fridge, and see the SAME picture

### Phase 2: Recipe Cards in Task Flow

**When a cook starts a task, show the full recipe card:**

```
+--------------------------------------------------+
| TASK: Produce Dressing GARDEN                      |
| Target: 330g  |  Current stock: 66g               |
+--------------------------------------------------+
|                                                    |
| RECIPE (scaled to 330g):                           |
|                                                    |
| Ingredients:                                       |
|   Olive oil.............. 100ml  [Shelf]           |
|   Lemon juice............ 50ml   [Fridge]          |
|   Garlic, minced......... 15g    [Fridge]          |
|   Mixed herbs............ 10g    [Shelf]           |
|   Salt................... 5g     [Shelf]           |
|   Black pepper........... 3g     [Shelf]           |
|                                                    |
| Steps:                                             |
| 1. Combine olive oil and lemon juice in bowl       |
| 2. Add minced garlic, herbs                        |
| 3. Whisk for 2 minutes until emulsified            |
| 4. Season with salt and pepper to taste            |
| 5. Transfer to labeled container                   |
| 6. Label: "GARDEN [today's date] [expiry date]"   |
|                                                    |
| Storage: FRIDGE  |  Shelf life: 2 days             |
+--------------------------------------------------+
| [ Actual quantity produced: ___g ]  [ COMPLETE ]   |
+--------------------------------------------------+
```

**Implementation:**

- Use existing `instructions` field on Recipe/Preparation
- Add `RecipeStep[]` to all preparations (currently only on recipes)
- Show ingredient quantities scaled to the target amount (via existing `useRecipeScaling`)
- Show storage location for each ingredient (where to find it)
- Require manual entry of actual produced quantity

### Phase 3: Completion Verification

**Replace instant tap-to-complete with a structured flow:**

1. **Start task** — records start time, shows recipe card
2. **Work** — timer runs visibly, cook follows recipe steps
3. **Complete** — requires:
   - Actual quantity produced (manual entry, no pre-fill)
   - Storage location confirmation (fridge/freezer/shelf)
   - If time < minimum threshold: warning flag (not blocking, but logged)

**Minimum time thresholds** (configurable per preparation):

- Simple assembly: 5 minutes
- Cooking required: 15 minutes
- Complex preparation: 30 minutes
- Custom tasks (cleaning): 10 minutes

**If completed in < 2 minutes (clearly fake):**

- Mark as "quick-completed" in KPI
- Show warning: "Completed very quickly. Was this task actually done?"
- Manager dashboard shows quick-completions as a metric

### Phase 4: Task Assignment & Accountability

**Add personal task assignment:**

```
+--------------------------------------------------+
| Morning Ritual — Chef Adi                          |
| Your tasks (8):                                    |
+--------------------------------------------------+
| [1] Dressing GARDEN      330g   [START]            |
| [2] Mushroom sauce       500ml  [START]            |
| [3] Chicken thawed 100g  400g   [START]            |
| ...                                                |
+--------------------------------------------------+
| Morning Ritual — Chef Budi                         |
| Your tasks (6):                                    |
+--------------------------------------------------+
| [1] Avocado              1410g  [START]            |
| [2] Rice                 300g   [START]            |
| ...                                                |
+--------------------------------------------------+
```

**Implementation options:**

1. **Fixed assignment by preparation** — each preparation has a default responsible person (set in RitualSettings)
2. **Daily rotation** — manager assigns tasks at shift start via drag-and-drop
3. **Self-assignment** — cooks claim tasks from an unassigned pool (first-come)

**Recommendation:** Start with option 1 (fixed by preparation category/station), add option 2 later.

### Phase 5: Workflow Ordering

**Group tasks by workflow stage, not just type:**

```
STAGE 1: Start First (long lead time)
  [ ] Dough ciabatta — 90 min rise time
  [ ] Chicken thaw 200g — 30 min thaw time

STAGE 2: While Waiting
  [ ] Dressing GARDEN — 10 min
  [ ] Honey mustard — 15 min
  [ ] Oil-Greek — 5 min

STAGE 3: Finish When Ready
  [ ] Ciabatta bake — needs dough from Stage 1
  [ ] Chicken portion — needs thawed chicken from Stage 1

STAGE 4: Write-offs (do last)
  [ ] Cheese sauce — 168g EXPIRED, write off
  [ ] Honey mustard — 146g EXPIRED, write off
```

**Implementation:**

- Add `lead_time_minutes` and `depends_on` fields to preparations
- Topological sort tasks by dependencies and lead time
- Show estimated total time for the ritual

---

## Quick Wins (can implement this week)

### 1. Require actual quantity input on task completion

- Remove auto-fill of target quantity in the completion field
- Force manual entry — takes 5 extra seconds but prevents fake completions
- Log discrepancy between target and actual

### 2. Add minimum completion time warning

- If task completed in < 2 minutes, show warning banner
- Log as "quick_completion" in KPI data
- Show on manager dashboard

### 3. Show recipe ingredients on TaskCard expansion

- When tapping a task, expand to show scaled ingredients
- Use existing `useRecipeScaling` composable
- No new data needed, just UI change

### 4. Add storage location filter icons to Tasks screen

- Show fridge/freezer/shelf icon next to each task
- Add filter chips matching Preparation screen (Fridge/Shelf/Freezer)

### 5. Create printable prep sheet

- "Print" button on Tasks screen
- Generates PDF with: prep name, target quantity, ingredients list, storage location
- Kitchen staff can work from paper and confirm in system after

---

## Operational Changes (not code)

### 1. Morning briefing protocol

- Manager opens Tasks screen on shared display
- Reviews today's tasks with team
- Assigns tasks to people (verbally or via system)
- Sets expectations for completion timing

### 2. Kitchen instruction cards (physical)

- For each preparation, print a laminated recipe card
- Post near the preparation station
- Include: ingredients, steps, photos, storage location, shelf life
- System generates these from recipe data (PDF export already exists in Catalog)

### 3. Spot-check protocol

- Manager checks 3-5 random completed tasks per shift
- Verifies quantity actually produced matches system entry
- Checks labeling (date, expiry) on containers
- Weekly KPI review with staff

### 4. Accountability meeting

- Weekly: review KPI dashboard with kitchen team
- Highlight: who completed most tasks, who had most quick-completions
- Discuss: what's hard, what doesn't make sense, what to improve

### 5. Training sessions

- New staff: 30 min training on system with supervised practice
- All staff: monthly 15 min refresher on workflow
- Key message: "The system helps you, it's not surveillance"

---

## Database Changes Needed

### New fields on `preparations` table

```sql
-- Workflow ordering
lead_time_minutes INTEGER DEFAULT 0,        -- how long this prep takes
workflow_stage INTEGER DEFAULT 2,            -- 1=start first, 2=middle, 3=finish last
depends_on UUID REFERENCES preparations(id), -- dependency for ordering

-- Assignment
default_assignee TEXT,                       -- default responsible person
station TEXT DEFAULT 'general',              -- grill, cold, pastry, bar, general

-- Completion verification
min_completion_minutes INTEGER DEFAULT 5,    -- minimum expected time
requires_photo BOOLEAN DEFAULT FALSE,        -- require photo proof
requires_manager_approval BOOLEAN DEFAULT FALSE
```

### New fields on `production_schedule` table

```sql
-- Assignment
assigned_to TEXT,                -- user ID of assigned cook
assigned_by TEXT,                -- who assigned it

-- Time tracking
started_at TIMESTAMPTZ,         -- when cook started working
actual_duration_minutes INTEGER, -- calculated from started_at to completed_at
is_quick_completion BOOLEAN DEFAULT FALSE, -- flagged if too fast

-- Verification
photo_url TEXT,                 -- photo proof if required
manager_approved BOOLEAN,       -- manager verification
manager_approved_by TEXT,
manager_approved_at TIMESTAMPTZ,

-- Quantity tracking
actual_quantity_entered BOOLEAN DEFAULT FALSE -- was quantity manually entered vs auto-filled
```

---

## Priority Roadmap

| Priority | What                                    | Type    | Effort | Impact                           |
| -------- | --------------------------------------- | ------- | ------ | -------------------------------- |
| 1        | Require manual quantity entry           | Code    | 2h     | High - prevents fake completions |
| 2        | Quick-completion warning                | Code    | 4h     | High - surfaces fake completions |
| 3        | Recipe card in task expansion           | Code    | 8h     | High - teaches cooks HOW         |
| 4        | Kitchen Map view (fridge/freezer/shelf) | Code    | 16h    | High - bridges physical/digital  |
| 5        | Printable prep sheets                   | Code    | 4h     | Medium - physical backup         |
| 6        | Task assignment to people               | Code+DB | 16h    | Medium - accountability          |
| 7        | Workflow ordering (stages)              | Code+DB | 16h    | Medium - efficiency              |
| 8        | Manager spot-check dashboard            | Code    | 8h     | Medium - oversight               |
| 9        | Physical recipe cards (print/laminate)  | Ops     | 4h     | High - immediate training aid    |
| 10       | Morning briefing protocol               | Ops     | 0      | High - immediate cultural change |
| 11       | Weekly KPI review meetings              | Ops     | 0      | Medium - long-term adoption      |

---

## Success Metrics

| Metric                                  | Current (estimated) | Target (3 months) |
| --------------------------------------- | ------------------- | ----------------- |
| Average task completion time            | < 1 min (fake)      | 10-30 min (real)  |
| Quick completions (< 2 min)             | ~80%                | < 10%             |
| Actual vs target quantity match         | Unknown             | Within 20%        |
| Expired items written off on time       | Rarely              | Same-day          |
| Staff can describe workflow from memory | No                  | Yes               |
| System stock matches physical stock     | Often mismatched    | Within 15%        |

---

## Summary

The problem is NOT the system's logic (recommendations, FIFO, KPI — all solid). The problem is:

1. **No visual bridge** between physical kitchen and digital system
2. **No instructions** — tasks say WHAT but not HOW
3. **No friction** — too easy to fake-complete
4. **No accountability** — everyone's task = nobody's task
5. **No workflow** — flat list instead of ordered process
6. **No operational culture** — no briefings, no spot-checks, no reviews

The fix is 50% code (better UI, verification, instructions) and 50% operations (briefings, training, accountability protocols). Neither alone will work.
