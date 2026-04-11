# Kitchen Tasks System

Production task management for the kitchen tablet interface. Covers daily production scheduling, ritual workflows, write-off tracking, and staff accountability.

## Architecture Overview

```
Views (src/views/kitchen/tasks/)
  TasksScreen.vue          -- Main kanban board (To Do | Done)
  RitualSettingsScreen.vue -- Admin config for ritual tasks
  components/
    TaskCard.vue           -- Task card in kanban columns
    ProductionCard.vue     -- Fullscreen dialog: recipe + complete tabs
    CategoryGroup.vue      -- Collapsible task category group
    RitualBanner.vue       -- Ritual session banner with progress
    RitualCongratulations  -- Post-ritual completion overlay
    StaffPicker.vue        -- Staff member selector
  dialogs/
    RitualDialog.vue       -- Fullscreen 3-column kanban for active ritual
    PhotoCaptureDialog.vue -- Camera capture for production evidence

Store (src/stores/kitchenKpi/)
  kitchenKpiStore.ts       -- Pinia store: schedule CRUD, ritual state, auto-fulfill
  kitchenKpiService.ts     -- Supabase service layer
  types.ts                 -- All type definitions
  offlineCache.ts          -- Offline schedule caching
  composables/
    useRecommendations.ts  -- Auto-generate production recommendations
    useProductionSchedule  -- Schedule management composable
    useRitualKpi.ts        -- Ritual completion metrics
    useFoodCostKpi.ts      -- Food cost KPI
    useTimeKpi.ts          -- Order processing time KPI
  services/
    recommendationsService -- Recommendation generation logic
```

## Core Concepts

### Task Types

| Type         | Description                              | Auto-fulfill?                     |
| ------------ | ---------------------------------------- | --------------------------------- |
| `production` | Produce a preparation (cook, assemble)   | Yes -- if current stock >= target |
| `write_off`  | Dispose expired/damaged stock            | No -- requires manual action      |
| `defrost`    | Move frozen stock from freezer to fridge | No -- requires manual action      |

### Production Slots

| Slot        | When        | Purpose                                |
| ----------- | ----------- | -------------------------------------- |
| `urgent`    | Anytime     | Expired write-offs, critical shortages |
| `morning`   | 07:30-10:00 | Breakfast + lunch prep                 |
| `afternoon` | 14:00-16:00 | Dinner prep based on remaining stock   |
| `evening`   | 18:00-22:00 | Next-day prep + write-offs             |
| `any`       | Anytime     | Flexible tasks                         |

### Ritual System

Rituals are timed production sessions with 3-column kanban (To Do -> In Progress -> Done).

**Time windows** (`RITUAL_WINDOWS` in `types.ts:31`):

- Morning: 07:30 - 10:00
- Afternoon: 14:00 - 16:00
- Evening: 18:00 - 22:00

**Custom tasks**: Admin-defined checklist items (e.g., "Check fridge temperature"). Each requires a rating (Bad/Good/Excellent) on completion. Bad rating requires a comment.

**Ritual completion** is saved to `ritual_completions` table with full `task_details` JSONB (including ratings, staff, timing per task).

## Data Flow

### Task Generation

```
1. TasksScreen.loadData()
   |
   +-- kpiStore.loadSchedule()          -- Fetch today's tasks from Supabase
   +-- kpiStore.loadCustomTasks()       -- Fetch ritual custom tasks
   +-- preparationStore.fetchBalances() -- Fetch current stock levels
   |
2. autoGenerateIfNeeded()
   |
   +-- ensureExpiredWriteOffTasks()     -- Create write-off tasks for expired batches
   |     Checks preparation balances for hasExpired
   |     Skips if pending write-off already exists for that prep
   |     Creates with taskType='write_off', slot='urgent', priority=100
   |
   +-- generateRecommendations()       -- Generate production recommendations
   |     Uses useRecommendations composable
   |     Based on avg consumption, current stock, min thresholds
   |
   +-- applyAllToSchedule()            -- Upsert recommendations to production_schedule
         Uses on_conflict(preparation_id, schedule_date, production_slot)
```

### Task Completion

```
User taps task -> ProductionCard dialog
  |
  +-- Enter quantity (numpad)
  +-- Select staff member
  +-- Take photo (production only)
  +-- Confirm
       |
       +-- Optimistic UI update (status -> 'completed')
       +-- addScheduleCompleteTask()  -- Background task
       |     Creates preparation batch (receipt)
       |     Records KPI entry
       |     Updates schedule in Supabase
       |
       +-- OR addPrepWriteOffTask()   -- For write-off tasks
             FIFO allocation from batches
             Creates write-off operation
             Records KPI entry
```

### Auto-Fulfillment

`autoFulfillTasks()` in `kitchenKpiStore.ts:629`

Runs when PreparationScreen loads. For **production tasks only** (not write-offs): if current stock already meets the target, the task is auto-completed with `completedByName: 'Auto-fulfilled'`.

## Key Files Reference

| File                                                           | Purpose                                             |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `src/views/kitchen/tasks/TasksScreen.vue`                      | Main board, task generation, completion handlers    |
| `src/views/kitchen/tasks/dialogs/RitualDialog.vue`             | Ritual session UI, rating dialog, timing            |
| `src/views/kitchen/tasks/components/ProductionCard.vue`        | Task completion dialog with recipe/numpad/photo     |
| `src/stores/kitchenKpi/kitchenKpiStore.ts`                     | Store: schedule state, auto-fulfill, ritual session |
| `src/stores/kitchenKpi/kitchenKpiService.ts`                   | Supabase CRUD for schedule, KPI, rituals            |
| `src/stores/kitchenKpi/types.ts`                               | All types: schedule items, rituals, KPI entries     |
| `src/stores/kitchenKpi/composables/useRecommendations.ts`      | Production recommendations                          |
| `src/stores/kitchenKpi/services/recommendationsService.ts`     | Recommendation calculation logic                    |
| `src/core/background/useBackgroundTasks.ts`                    | Async task queue for completions/write-offs         |
| `src/stores/preparation/composables/usePreparationWriteOff.ts` | Write-off with FIFO allocation                      |
| `src/stores/preparation/preparationService.ts`                 | FIFO batch allocation, batch management             |

## Database Tables

| Table                    | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `production_schedule`    | Daily task schedule (unique: prep_id + date + slot) |
| `ritual_completions`     | Completed ritual records with task_details JSONB    |
| `ritual_custom_tasks`    | Admin-defined custom checklist tasks                |
| `kitchen_kpi_entries`    | Per-staff daily KPI records                         |
| `preparation_batches`    | Stock batches for FIFO allocation                   |
| `preparation_operations` | Write-off/production operation records              |

## FIFO Allocation Notes

`calculateFifoAllocation` in `preparationService.ts:731`:

- Filters batches by `preparationId`, `status=active`, `currentQuantity > 0`
- Does NOT filter by `storageLocation` (freezer batches included -- kitchen uses frozen preps directly)
- Does NOT filter by batch `department` field (uses preparation's department from recipesStore instead, matching `recalculateBalances` logic)
- Write-offs clamp to available stock instead of throwing errors
