# Production Recommendations System (v2)

How the system calculates what and how much the kitchen should produce each day.

## Overview

The system generates production tasks (recommendations) for preparations (semi-finished products). Recommendations are shown in **3 rituals** as checklists for kitchen staff:

- **Morning Ritual** (7:30-10:00): Short shelf-life items (<=1 day) — covers breakfast+lunch+early afternoon (7-16)
- **Afternoon Ritual** (14:00-16:00): Short shelf-life items (<=1 day) — covers dinner service (16-22), adjusted by actual remaining stock
- **Evening Ritual** (18:00-22:00): Long shelf-life items (>1 day) — full production for multiple days ahead

Rituals are like sprints — uncompleted tasks remain on the main task board after the ritual window closes.

```
Data pipeline:

POS Sale → recipe_write_off (decomposed_items JSONB)
        → recalculate_consumption_stats() RPC (auto-called, throttled 4h)
        → preparations table updated:
            avg_daily_usage, max_daily_usage, am_max_usage, pm_max_usage
        → recommendationsService.ts (generates per ritual)
        → production_schedule tasks (UI checklist with KPI tracking)
```

## Core Formula

### Short shelf-life items (shelf_life <= 1 day) — Split production

Produced twice per day to keep fresh. The system checks current Bali time to determine which slot:

```
Before 16:00 (morning ritual):
  target = am_max           ← max AM (7-16) consumption over last 3 days
  need = max(0, target - currentStock)

After 16:00 (afternoon ritual):
  target = pm_max           ← max PM (16-22) consumption over last 3 days
  need = max(0, target - currentStock)
```

The afternoon ritual is the correction mechanism — by 14:00 the system knows actual remaining stock after morning service and recommends only what's needed for dinner.

### Long shelf-life items (shelf_life > 1 day) — Single production

Produced once in the evening ritual:

```
target = max_daily × targetDays(shelfLife)
need = max(0, target - currentStock)
```

### targetDays Multiplier (shelf_life > 1)

Uses `max_daily` (peak day) as base, so multipliers are conservative:

| shelfLife | targetDays | Reasoning                                   |
| --------- | ---------- | ------------------------------------------- |
| 2 days    | 1.2        | Slight buffer since max already covers peak |
| 3 days    | 1.5        | Half day buffer                             |
| 4-6 days  | 2.0        | Comfortable margin                          |
| 7+ days   | 2.5        | Max — we produce every evening anyway       |

### Fixed Override

If `dailyTargetQuantity > 0` on a preparation (set via RitualSettings → "Fixed" mode), it overrides auto-calculation. For short shelf-life items, the fixed target is split proportionally between AM/PM based on consumption ratios.

### Urgent Override

Any item with `currentStock = 0` or `belowMinStock` gets `urgent` slot regardless of shelf life. Urgent items appear in the current ritual (morning or afternoon).

## Slot Assignment Logic

v2 uses **shelf life** to determine the production slot, not urgency-based stock days:

| Condition                                   | Slot        | Ritual    |
| ------------------------------------------- | ----------- | --------- |
| `isPremade = true`                          | `morning`   | Morning   |
| `shelf_life <= 1` + Bali hour < 16          | `morning`   | Morning   |
| `shelf_life <= 1` + Bali hour >= 16         | `afternoon` | Afternoon |
| `shelf_life > 1` + stock OK                 | `evening`   | Evening   |
| `shelf_life > 1` + critically low (< 1 day) | `urgent`    | Morning   |
| `shelf_life > 1` + low (< 2 days)           | `morning`   | Morning   |
| Any item, stock = 0 or belowMinStock        | `urgent`    | Current   |

Priority within a ritual: urgent (100) > morning (70) > afternoon (50) > evening (30).

## Pre-made Items

Items with `isPremade = true` (falafel, poached eggs, hashbrowns, etc.) are always assigned to the **morning** slot. They use `dailyTargetQuantity` if set, otherwise `calculateRecommendedQuantity` with shelf-life-aware targetDays.

## Types of Recommendations

### Production Tasks

Regular recommendations to produce a preparation. Assigned to slots by the rules above.

### Write-off Tasks

Generated when expired batches are detected. Always **urgent**. Task type = `write_off`. Appear in evening ritual.

### Zero Stock Items

Preparations with no batches at all:

- Pre-made → morning slot, quantity = `dailyTargetQuantity` or `outputQuantity`
- Short shelf-life → urgent, quantity = `am_max` (or `outputQuantity` fallback)
- Long shelf-life → urgent, quantity = `max_daily × targetDays` (or `outputQuantity` fallback)

## Data Sources

### Consumption Stats RPC

Calculated by `recalculate_consumption_stats()` (v2). Source: `recipe_write_offs.decomposed_items` JSONB.

**Lookback: 3 active business days** (days with actual write-offs).

**Auto-called** when TasksScreen generates recommendations, throttled to max once per 4 hours via localStorage. After RPC completes, preparations are re-fetched to pick up updated values.

Fields updated on each preparation:

| Field             | Formula                                              | Purpose                    |
| ----------------- | ---------------------------------------------------- | -------------------------- |
| `avg_daily_usage` | avg(daily_total) over last 3 active days             | Analytics, dashboards      |
| `max_daily_usage` | max(daily_total) over last 3 active days             | Target for long shelf-life |
| `am_max_usage`    | max(consumption 7:00-16:00) over last 3 active days  | Morning ritual target      |
| `pm_max_usage`    | max(consumption 16:00-22:00) over last 3 active days | Afternoon ritual target    |

Also updates `min_stock_threshold` and `daily_target_quantity` (only when currently 0, auto-fills from `max_daily × safety_factor`).

### What Counts as Consumption

The `recipe_write_offs` table is the **single source of truth** for consumption data. It records ONLY sales-driven consumption:

| operation_type        | Source                     | What it is                                  |
| --------------------- | -------------------------- | ------------------------------------------- |
| `auto_sales_writeoff` | POS (payment/kitchen send) | Automatic decomposition when a dish is sold |
| `sales_write_off`     | Manual sales correction    | Rare, manual adjustment tied to a sale      |

Both types always have `sales_transaction_id` — always linked to an actual sale.

### What Does NOT Count as Consumption

These operations go to **separate tables** and are NOT included in consumption stats:

| Operation             | Table                                        | Why excluded           |
| --------------------- | -------------------------------------------- | ---------------------- |
| Expired write-off     | `preparation_operations` (type=`write_off`)  | Loss, not demand       |
| Spoiled write-off     | `preparation_operations` (type=`write_off`)  | Loss, not demand       |
| Education/training    | `preparation_operations` (type=`write_off`)  | Not customer demand    |
| Raw product spoilage  | `storage_operations` (type=`write_off`)      | Not customer demand    |
| Inventory corrections | `preparation_operations` (type=`correction`) | Accounting, not demand |

**By design**: consumption stats reflect real customer demand (what was sold), not losses. If we counted spoilage as demand, recommendations would inflate — producing more, leading to more spoilage.

### "From Knife" Cooking

When a dish is sold but the preparation has no stock:

1. A `recipe_write_off` is created (with `decomposed_items`) — **consumption IS counted**
2. A negative batch is created in `preparation_batches` — stock goes below zero
3. Negative batches are reconciled when the kitchen produces a new batch (`autoReconcile`)
4. Reconciled negative batches are excluded from balance calculation (`!b.reconciledAt`)

So "from knife" cooking does NOT create a blind spot — the demand is fully captured.

### Fallback: Batch History Estimation

If `avg_daily_usage` is not available (0 or null) and no `maxDailyUsage`, the system estimates from recent batch production:

```
avgDaily = totalProduced(recentBatches) / daysBack
```

Less accurate because production != consumption, but better than nothing.

## Ritual Integration

### Morning Ritual (7:30-10:00)

Tasks included:

- All **pre-made** items
- **Urgent** tasks (stockout, expired, critically low long shelf-life items)
- **Morning** slot tasks — shelf_life ≤ 1 items, AM target covers 7:00-16:00
- Custom tasks assigned to morning

### Afternoon Ritual (14:00-16:00)

Tasks included:

- **Afternoon** slot tasks — shelf_life ≤ 1 items, PM target covers 16:00-22:00
- Remaining **urgent** tasks not completed in morning
- Custom tasks assigned to afternoon

The key advantage: by 14:00 the system sees actual remaining stock, so afternoon recommendations are **corrective** — if morning consumed less than expected, afternoon recommends less (or nothing).

### Evening Ritual (18:00-22:00)

Tasks included:

- **Evening** slot tasks — shelf_life > 1 items (max_daily × targetDays)
- **Write-off** tasks (expired items)
- Custom tasks assigned to evening

### Task Lifecycle

1. `autoGenerateIfNeeded()` runs when TasksScreen opens (12h staleness check, skip if pending tasks exist)
2. RPC refreshes consumption stats (4h throttle)
3. Preparations re-fetched with fresh stats
4. `generateRecommendations()` creates `ProductionRecommendation[]`
5. `applyAllToSchedule()` upserts into `production_schedule` table (unique: preparation_id + date + slot)
6. Ritual dialog shows tasks as 3-column kanban (TODO → IN PROGRESS → DONE)
7. Staff confirms quantity → creates preparation batch → KPI recorded
8. Ritual finishes → `ritual_completions` record → completion % tracked
9. Uncompleted tasks remain `pending` on main task board

### Auto-fulfill

Pending tasks are checked against current stock. If `currentStock >= targetQuantity`, the task is automatically marked completed with `completedByName: 'Auto-fulfilled'`.

## KPI Tracking

### Per-Task KPI

- `target_quantity` vs `completed_quantity` — did staff produce the recommended amount?
- `on-time` check: morning tasks < 12:00, afternoon 12:00-18:00, evening 18:00-22:00

### Per-Ritual KPI

- `completion_rate` = completedTasks / totalTasks × 100
- `duration_minutes` — how long the ritual took
- `current_streak` — consecutive days with all rituals completed

### Staff KPI (kitchen_bar_kpi table)

- `productions_completed`, `production_quantity_total`, `production_value_total`
- `on_time_completions`, `late_completions`
- `writeoffs_kpi_affecting`, `writeoff_value_kpi_affecting`

## Configuration

### Per-Preparation Settings (RitualSettings UI)

| Field                   | Purpose                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `target_mode`           | `auto` (formula) or `fixed` (manual target)                                                  |
| `daily_target_quantity` | Fixed target stock level (overrides formula). For shelf_life ≤ 1, split proportionally AM/PM |
| `shelf_life`            | Days until expiry — determines morning/afternoon vs evening slot                             |
| `is_premade`            | Always morning slot, separate UI group                                                       |
| `production_slot`       | Admin override for preferred time slot                                                       |
| `storage_location`      | fridge / shelf / freezer (display only)                                                      |
| `min_stock_threshold`   | Alert threshold for below-minimum warnings                                                   |

### System Constants (recommendationsService.ts)

| Constant                 | Value   | Purpose                                    |
| ------------------------ | ------- | ------------------------------------------ |
| `DEFAULT_AM_RATIO`       | 0.65    | Fallback AM split when no consumption data |
| `DEFAULT_PM_RATIO`       | 0.35    | Fallback PM split when no consumption data |
| `minRecommendedQuantity` | 50g     | Skip tiny recommendations                  |
| `RPC_THROTTLE_MS`        | 4 hours | Max RPC call frequency                     |

## Key Files

| File                                                            | Purpose                                      |
| --------------------------------------------------------------- | -------------------------------------------- |
| `src/stores/kitchenKpi/services/recommendationsService.ts`      | Core recommendation engine                   |
| `src/stores/kitchenKpi/kitchenKpiStore.ts`                      | Store: schedule state, 3 ritual windows, KPI |
| `src/stores/kitchenKpi/composables/useRecommendations.ts`       | Composable: RPC call + generate + apply      |
| `src/stores/kitchenKpi/types.ts`                                | Types: RITUAL_WINDOWS, RitualType, KPI types |
| `src/stores/preparation/preparationStore.ts`                    | Balance calculation (currentStock)           |
| `src/stores/recipes/types.ts`                                   | Preparation type with consumption fields     |
| `src/supabase/functions/recalculate_consumption_stats.sql`      | RPC v2: avg/max/AM/PM calculation            |
| `src/supabase/migrations/284_production_recommendations_v2.sql` | Migration: new fields + RPC                  |
| `src/views/kitchen/tasks/TasksScreen.vue`                       | Tasks UI with 3-ritual integration           |
| `src/views/kitchen/tasks/dialogs/RitualDialog.vue`              | Fullscreen 3-column ritual kanban            |
| `src/views/kitchen/tasks/RitualSettingsScreen.vue`              | Admin: per-preparation + custom tasks        |

## Examples (Real PROD Data, 2026-04)

### Short shelf-life (<=1 day) — split AM/PM

| Preparation | max_3d | am_max (7-16) | pm_max (16-22) | Morning target | Afternoon target |
| ----------- | ------ | ------------- | -------------- | -------------- | ---------------- |
| Avocado     | 1,470  | **1,410**     | 270            | 1,410g         | 270g             |
| Draniki     | 800    | **800**       | 150            | 800g           | 150g             |
| Rice        | 600    | 300           | **400**        | 300g           | 400g             |
| MushPotato  | 270    | 100           | **270**        | 100g           | 270g             |
| Ciabatta    | 360    | **360**       | 120            | 360g           | 120g             |

### Long shelf-life (>1 day) — evening ritual

| Preparation    | shelfLife | max_3d | targetDays | targetStock |
| -------------- | --------- | ------ | ---------- | ----------- |
| Grated zukini  | 2 days    | 1,300  | ×1.2       | 1,560g      |
| Salmon portion | 2 days    | 580    | ×1.2       | 696g        |
| Patty beef     | 3 days    | 360    | ×1.5       | 540g        |
| Cheese sauce   | 7 days    | 550    | ×2.5       | 1,375g      |
