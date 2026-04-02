# Production Recommendations System

How the system calculates what and how much the kitchen should produce each day.

## Overview

The system generates daily production tasks (recommendations) for preparations (semi-finished products). Recommendations are shown in **morning/evening rituals** as a checklist for kitchen staff.

```
Data pipeline:

POS Sale → recipe_write_off (decomposed_items)
        → recalculate_consumption_stats() RPC (periodic)
        → preparations.avg_daily_usage (per item)
        → recommendationsService.ts (per morning ritual)
        → production_schedule tasks (UI checklist)
```

## Core Formula

```
targetStock = avgDaily × targetDays(shelfLife)
needToProduce = max(0, targetStock - currentStock)
```

Two inputs:

- **avgDaily** — average daily consumption from `recipe_write_offs` (set by `recalculate_consumption_stats` RPC)
- **shelfLife** — how many days the preparation can be stored (set on each preparation)

### Target Days by Shelf Life

The system produces daily (morning ritual). More shelf life = more buffer days allowed.

| shelfLife | targetDays | Buffer    | Reasoning                                                          |
| --------- | ---------- | --------- | ------------------------------------------------------------------ |
| 1 day     | 1.2        | +20%      | Cannot store for tomorrow. 20% covers demand spikes within one day |
| 2 days    | 1.5        | +0.5 day  | Half day buffer before next production                             |
| 3 days    | 2.0        | +1 day    | Full day buffer                                                    |
| 4-6 days  | 2.5        | +1.5 days | Comfortable margin                                                 |
| 7+ days   | 3.0        | +2 days   | Max — we produce every morning anyway                              |

**Key principle**: `targetDays` never exceeds `shelfLife`. The extra days ARE the safety buffer — no separate multiplier.

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

### avg_daily_usage — What We Count and What We Don't

Calculated by the `recalculate_consumption_stats()` RPC function. Source: `recipe_write_offs.decomposed_items` JSONB.

```sql
avg_daily_usage = total_consumed / active_business_days
```

- Only counts days with actual write-offs (active business days)
- Requires minimum 3 active days
- Updates `preparations.avg_daily_usage` directly

**Important**: This RPC must be called periodically. If not called, `avg_daily_usage` becomes stale and recommendations will be based on old data.

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
- **Morning** slot tasks (1-2 days of stock)

### Evening Ritual (18:00-22:00)

Tasks included:

- **Evening** slot tasks (3-5 days of stock, prep for tomorrow)
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

## Examples (Real PROD Data, 2026-04)

| Preparation         | shelfLife | avgDaily | targetStock  | Previous (v1) |
| ------------------- | --------- | -------- | ------------ | ------------- |
| MushPotato          | 1 day     | 605g     | 726g (×1.2)  | 1814g (×3)    |
| Rice                | 1 day     | 361g     | 433g (×1.2)  | 1084g (×3)    |
| Grated zukini       | 2 days    | 619g     | 929g (×1.5)  | 1858g (×3)    |
| Salmon portion      | 2 days    | 196g     | 295g (×1.5)  | 589g (×3)     |
| Chicken breast 200g | 3 days    | 471g     | 942g (×2.0)  | 1413g (×3)    |
| Mushroom sauce      | 3 days    | 381g     | 762g (×2.0)  | 1144g (×3)    |
| Cheese sauce        | 7 days    | 379g     | 1136g (×3.0) | 1136g (×3)    |
| French fries        | 30 days   | 1029g    | 3087g (×3.0) | 3087g (×3)    |

## Future: Mid-Day Dynamic Tasks

Currently recommendations are generated once (morning). If stock drops critically during service, the system does not re-evaluate until next morning.

Planned: real-time stock monitoring that creates **dynamic tasks** in the Tasks interface (not in rituals) when stock falls below a critical threshold during service hours.
