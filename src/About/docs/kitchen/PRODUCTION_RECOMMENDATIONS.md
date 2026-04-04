# Production Recommendations System (v2)

How the system calculates what and how much the kitchen should produce each day.

## Overview

The system generates production tasks (recommendations) for preparations (semi-finished products). Recommendations are shown in **3 rituals** as checklists for kitchen staff:

- **Morning Ritual** (7:30-10:00): Short shelf-life items (<=1 day) — AM portion for breakfast+lunch
- **Afternoon Ritual** (14:00-16:00): Short shelf-life items (<=1 day) — PM portion for dinner, adjusted by actual morning consumption
- **Evening Ritual** (18:00-22:00): Long shelf-life items (>1 day) — full production for multiple days

```
Data pipeline:

POS Sale → recipe_write_off (decomposed_items)
        → recalculate_consumption_stats() RPC (periodic)
        → preparations.avg_daily_usage (per item)
        → recommendationsService.ts (per morning ritual)
        → production_schedule tasks (UI checklist)
```

## Core Formula (v2)

### Short shelf-life items (shelf_life <= 1 day) — Split production

These items are produced twice a day (morning + afternoon rituals):

```
Morning ritual: need = max(0, am_max - currentStock)
Afternoon ritual: need = max(0, pm_max - currentStock)
```

- **am_max** — max AM (7-16) consumption over last 3 active business days
- **pm_max** — max PM (16-22) consumption over last 3 active business days

Morning production covers everything until afternoon production is ready (~16:00).
Afternoon ritual benefits from seeing actual remaining stock after morning+lunch service.

### Long shelf-life items (shelf_life > 1 day) — Single production

These items are produced once in the evening ritual:

```
targetStock = max_daily × targetDays(shelfLife)
needToProduce = max(0, targetStock - currentStock)
```

- **max_daily** — max total daily consumption over last 3 active business days

### Target Days by Shelf Life (for shelf_life > 1)

Uses `max_daily` as base, so multipliers are lower than v1 (which used avg).

| shelfLife | targetDays | Reasoning                                   |
| --------- | ---------- | ------------------------------------------- |
| 2 days    | 1.2        | Slight buffer since max already covers peak |
| 3 days    | 1.5        | 0.5 day buffer                              |
| 4-6 days  | 2.0        | Comfortable margin                          |
| 7+ days   | 2.5        | Max — we produce every evening anyway       |

### Fixed Override

If `dailyTargetQuantity > 0` on a preparation (set via RitualSettings → "Fixed" mode), it overrides the auto-calculation completely:

```
targetStock = dailyTargetQuantity   // admin-set value
needToProduce = max(0, targetStock - currentStock)
```

Use this for items where auto-calculation isn't accurate enough — the admin knows the exact target.

## Urgency (When to Produce)

Based on `daysUntilStockout = currentStock / avgDaily`:

| Condition              | Urgency   | Priority | Slot                |
| ---------------------- | --------- | -------- | ------------------- |
| Expired batches exist  | urgent    | 100      | ASAP                |
| Stock = 0 or below min | urgent    | 100      | ASAP                |
| <= 1 day of stock      | urgent    | 100      | ASAP                |
| Near-expiry batches    | morning   | 70       | Morning             |
| <= 2 days of stock     | morning   | 70       | Morning             |
| <= 3 days of stock     | afternoon | 50       | Afternoon           |
| 3-5 days of stock      | evening   | 30       | Evening             |
| > 5 days of stock      | —         | —        | Skip (enough stock) |

## Pre-made Items

Items with `isPremade = true` (falafel, poached eggs, hashbrowns, etc.) are always assigned to the **morning** slot regardless of stock level. They use the same formula but are grouped separately in the UI under "Morning Prep".

## Types of Recommendations

### Production Tasks

Regular recommendations to produce a preparation. Assigned to time slots based on urgency.

### Write-off Tasks

Generated when expired batches are detected. Always **urgent**. Task type = `write_off` instead of `production`.

### Zero Stock Items

Preparations with no batches at all get an urgent recommendation. Quantity = `dailyTargetQuantity` (if set) or `outputQuantity` (one recipe batch) as fallback.

## Data Sources

### Consumption Stats — What We Count and What We Don't

Calculated by the `recalculate_consumption_stats()` RPC function (v2). Source: `recipe_write_offs.decomposed_items` JSONB.

**Default lookback: 3 active business days** (changed from 30 in v1).

Fields updated on each preparation:

| Field             | Formula                                    | Purpose                    |
| ----------------- | ------------------------------------------ | -------------------------- |
| `avg_daily_usage` | avg(daily_total) over last 3 days          | Analytics, dashboards      |
| `max_daily_usage` | max(daily_total) over last 3 days          | Target for long shelf-life |
| `am_max_usage`    | max(AM consumption 7-16) over last 3 days  | Morning ritual target      |
| `pm_max_usage`    | max(PM consumption 16-22) over last 3 days | Afternoon ritual target    |

**Important**: This RPC must be called daily (ideally before morning ritual). If not called, recommendations will be based on stale data.

### What counts as consumption (recipe_write_offs)

The `recipe_write_offs` table is the **single source of truth** for consumption data. It records ONLY sales-driven consumption:

| operation_type        | Source                     | What it is                                  |
| --------------------- | -------------------------- | ------------------------------------------- |
| `auto_sales_writeoff` | POS (payment/kitchen send) | Automatic decomposition when a dish is sold |
| `sales_write_off`     | Manual sales correction    | Rare, manual adjustment tied to a sale      |

Both types always have `sales_transaction_id` — they are always linked to an actual sale.

### What does NOT count as consumption

These operations go to **separate tables** and are NOT included in `avg_daily_usage`:

| Operation             | Table                                        | Why excluded           |
| --------------------- | -------------------------------------------- | ---------------------- |
| Expired write-off     | `preparation_operations` (type=`write_off`)  | Loss, not demand       |
| Spoiled write-off     | `preparation_operations` (type=`write_off`)  | Loss, not demand       |
| Education/training    | `preparation_operations` (type=`write_off`)  | Not customer demand    |
| Raw product spoilage  | `storage_operations` (type=`write_off`)      | Not customer demand    |
| Inventory corrections | `preparation_operations` (type=`correction`) | Accounting, not demand |

**This is correct by design**: `avg_daily_usage` reflects real customer demand (what was sold), not losses. Recommendations should be based on what customers actually consume, not what the kitchen wastes. If we counted spoilage as demand, recommendations would inflate — producing even more, leading to even more spoilage.

### "From Knife" Cooking — Correctly Counted

When a dish is sold but the preparation has no stock:

1. A `recipe_write_off` is created (with `decomposed_items`) — **consumption IS counted**
2. A negative batch is created in `storage_batches` — stock goes below zero
3. Next morning, the recommendation sees the deficit and suggests production
4. When the kitchen produces, `autoReconcile` closes the negative batch

So "from knife" cooking does NOT create a blind spot — the demand is fully captured.

### Fallback: Batch History Estimation

If `avg_daily_usage` is not available (0 or null), the system estimates from recent batch production:

```
avgDaily = totalProduced(recentBatches) / daysBack
```

This is less accurate because production != consumption, but better than nothing.

### "From Knife" Cooking

When a dish is sold but the preparation has no stock, a **negative batch** is created. This:

1. Records consumption in `recipe_write_offs.decomposed_items` — so `recalculate_consumption_stats` counts it correctly
2. Makes currentStock negative — next morning's recommendation reflects the deficit
3. Auto-reconciles when a new batch is produced

## Ritual Integration

### Morning Ritual (7:30-10:00)

Tasks included:

- All **pre-made** items
- **Urgent** tasks (stockout, expired)
- **Morning** slot tasks — shelf_life ≤ 1 items, AM target (breakfast+lunch)
- Long shelf-life items critically low (< 2 days stock)

### Afternoon Ritual (14:00-16:00)

Tasks included:

- **Afternoon** slot tasks — shelf_life ≤ 1 items, PM target (dinner)
- Remaining **urgent** tasks not completed in morning

### Evening Ritual (18:00-22:00)

Tasks included:

- **Evening** slot tasks — shelf_life > 1 items (max_daily × targetDays)
- **Write-off** tasks (expired items)

### Auto-Generation

`TasksScreen.autoGenerateIfNeeded()` runs when the Tasks screen opens:

1. Checks if last generation was > 12 hours ago
2. Generates recommendations from current balances + avgDaily
3. Upserts tasks into `production_schedule` table

## Configuration

### Per-Preparation Settings (RitualSettings UI)

| Field                   | Purpose                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `target_mode`           | `auto` (formula) or `fixed` (manual target)                                                                                                                                                                  |
| `daily_target_quantity` | Fixed target stock level (overrides formula when > 0). **Note**: despite the name, this is used as a TARGET STOCK LEVEL, not a daily production amount. `needToProduce = dailyTargetQuantity - currentStock` |
| `shelf_life`            | Days until expiry — directly drives targetDays                                                                                                                                                               |
| `is_premade`            | Always morning slot, separate UI group                                                                                                                                                                       |
| `production_slot`       | Preferred time slot (morning/afternoon/evening/any)                                                                                                                                                          |
| `storage_location`      | fridge / shelf / freezer (display only)                                                                                                                                                                      |
| `min_stock_threshold`   | Alert threshold for below-minimum warnings                                                                                                                                                                   |

### System Config (RecommendationConfig)

| Parameter                | Default | Purpose                                   |
| ------------------------ | ------- | ----------------------------------------- |
| `daysForAverage`         | 3       | Days for batch-based consumption fallback |
| `urgentThresholdDays`    | 1       | Stock days → urgent                       |
| `morningThresholdDays`   | 2       | Stock days → morning                      |
| `afternoonThresholdDays` | 3       | Stock days → afternoon                    |
| `minRecommendedQuantity` | 50g     | Skip tiny recommendations                 |

## Key Files

| File                                                       | Purpose                               |
| ---------------------------------------------------------- | ------------------------------------- |
| `src/stores/kitchenKpi/services/recommendationsService.ts` | Core recommendation engine            |
| `src/stores/kitchenKpi/kitchenKpiStore.ts`                 | Store: schedule state, ritual actions |
| `src/stores/kitchenKpi/composables/useRecommendations.ts`  | Vue composable wrapper                |
| `src/stores/preparation/preparationStore.ts`               | Balance calculation (currentStock)    |
| `src/supabase/functions/recalculate_consumption_stats.sql` | RPC: avg_daily_usage calculation      |
| `src/views/kitchen/tasks/TasksScreen.vue`                  | Tasks UI with ritual integration      |
| `src/views/kitchen/tasks/RitualSettingsScreen.vue`         | Admin: per-preparation settings       |

## Examples (Real PROD Data, 2026-04, v2)

### Short shelf-life (<=1 day) — split AM/PM

| Preparation | avg_3d | max_3d | am_max | pm_max | Morning target | Afternoon target |
| ----------- | ------ | ------ | ------ | ------ | -------------- | ---------------- |
| Avocado     | 1,117  | 1,470  | 1,410  | 420    | 1,410g         | 420g             |
| Ciabatta    | 240    | 360    | 360    | 120    | 360g           | 120g             |
| Rice        | 400    | 600    | 200    | 400    | 200g           | 400g             |
| MushPotato  | 185    | 270    | 100    | 270    | 100g           | 270g             |
| Draniki     | 527    | 800    | 600    | 270    | 600g           | 270g             |

### Long shelf-life (>1 day) — evening ritual

| Preparation    | shelfLife | max_3d | targetDays | targetStock |
| -------------- | --------- | ------ | ---------- | ----------- |
| Grated zukini  | 2 days    | 1,300  | ×1.2       | 1,560g      |
| Salmon portion | 2 days    | 580    | ×1.2       | 696g        |
| Patty beef     | 3 days    | 360    | ×1.5       | 540g        |
| Cheese sauce   | 7 days    | 550    | ×2.5       | 1,375g      |

## Future: Mid-Day Dynamic Tasks

Currently recommendations are generated once (morning). If stock drops critically during service, the system does not re-evaluate until next morning.

Planned: real-time stock monitoring that creates **dynamic tasks** in the Tasks interface (not in rituals) when stock falls below a critical threshold during service hours.
