# Kitchen App - Todo

## Current Sprint: Kitchen Time KPI

### Overview

50;870F8O A8AB5<K >BA;56820=8O 2@5<5=8 ?@83>B>2;5=8O 8 KPI 4;O :CE=8/10@0.

### User Decisions

- **Timer Start**: @8 A>E@0=5=88 bill, :>340 AB0BCA <5=O5BAO =0 `waiting`
- **Plan Values**: $8:A8@>20==K5 - Kitchen: 15 <8=, Bar: 5 <8=
- **Storage**: "01;8F0 4;O 8AB>@88 + realtime 4;O A53>4=O
- **Store**: 0AH8@8BL ACI5AB2CNI89 `kitchenKpi` store

---

## Phase 1: Database & Data Layer

### 1.1 Create Migration

- [ ] `src/supabase/migrations/052_create_kitchen_time_kpi_table.sql`

```sql
CREATE TABLE IF NOT EXISTS kitchen_time_kpi (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_date date NOT NULL,
    department text NOT NULL DEFAULT 'kitchen',
    avg_waiting_time_seconds numeric NOT NULL DEFAULT 0,
    avg_cooking_time_seconds numeric NOT NULL DEFAULT 0,
    avg_total_time_seconds numeric NOT NULL DEFAULT 0,
    plan_total_time_seconds numeric NOT NULL DEFAULT 900,
    items_completed integer NOT NULL DEFAULT 0,
    items_exceeded_plan integer NOT NULL DEFAULT 0,
    hourly_breakdown jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (period_date, department),
    CHECK (department IN ('kitchen', 'bar'))
);
```

### 1.2 Add `cookingStartedAt` to Types

- [ ] `src/stores/pos/types.ts` - Add `cookingStartedAt?: string` to PosBillItem

### 1.3 Update Supabase Mappers

- [ ] `src/stores/pos/orders/supabaseMappers.ts`
  - Add `cookingStartedAt` to FlattenedItem
  - Add to `flattenBillsToItems()` and `reconstructBillsFromItems()`

### 1.4 Fix Kitchen Service Timestamps

- [ ] `src/stores/kitchen/kitchenService.ts`
  - Remove incorrect `sentToKitchenAt` setting (already set in POS)
  - Add `cookingStartedAt` when status � 'cooking'

---

## Phase 2: Fix Timer Display

### 2.1 Update KitchenDish Interface

- [ ] `src/stores/kitchen/composables/useKitchenDishes.ts`
  - Add `cookingStartedAt?: string`

### 2.2 Fix DishCard Timer

- [ ] `src/views/kitchen/orders/components/DishCard.vue`

```typescript
const updateTimer = () => {
  const now = new Date()
  if (props.dish.status === 'waiting') {
    // Waiting time: since sent to kitchen
    const start = props.dish.sentToKitchenAt
      ? new Date(props.dish.sentToKitchenAt)
      : new Date(props.dish.createdAt)
    elapsedSeconds.value = Math.floor((now.getTime() - start.getTime()) / 1000)
  } else if (props.dish.status === 'cooking') {
    // Cooking time: since cooking started
    const start = props.dish.cookingStartedAt
      ? new Date(props.dish.cookingStartedAt)
      : new Date(props.dish.sentToKitchenAt || props.dish.createdAt)
    elapsedSeconds.value = Math.floor((now.getTime() - start.getTime()) / 1000)
  } else if (props.dish.status === 'ready') {
    // Total time (frozen)
    const start = new Date(props.dish.sentToKitchenAt || props.dish.createdAt)
    const end = new Date(props.dish.preparedAt || now)
    elapsedSeconds.value = Math.floor((end.getTime() - start.getTime()) / 1000)
  }
}
```

---

## Phase 3: KPI Store Extension

### 3.1 Add Time KPI Types

- [ ] `src/stores/kitchenKpi/types.ts`
  - `KitchenTimeKpiEntry`
  - `RealtimeTimeKpi`

### 3.2 Create Time KPI Service

- [ ] `src/stores/kitchenKpi/services/timeKpiService.ts` (NEW)
  - `getTimeKpiEntries(filters)` - Historical data
  - `aggregateTimeKpi(date, department)` - RPC call
  - `calculateRealtimeKpi(dishes, department)` - Realtime calculation

### 3.3 Create Time KPI Composable

- [ ] `src/stores/kitchenKpi/composables/useTimeKpi.ts` (NEW)
  - `kitchenRealtimeKpi` - computed
  - `barRealtimeKpi` - computed
  - `formatTime(seconds)` - helper
  - `calculateDeviation(actual, plan)` - helper

---

## Phase 4: Kitchen Monitor KPI Tab

### 4.1 Create TimeKpiWidget

- [ ] `src/views/kitchen/orders/components/TimeKpiWidget.vue` (NEW)

| Metric         | Real     | Plan      | Deviation |
| -------------- | -------- | --------- | --------- |
| Waiting Time   | X:XX     | -         | -         |
| Cooking Time   | X:XX     | -         | -         |
| **Total Time** | **X:XX** | **15:00** | **+10%**  |

### 4.2 Create KpiScreen

- [ ] `src/views/kitchen/kpi/KpiScreen.vue` (NEW)
  - Two widgets: Kitchen + Bar side-by-side
  - Auto-refresh indicator

### 4.3 Update Navigation

- [ ] `src/views/kitchen/components/KitchenSidebar.vue` - Add KPI menu item
- [ ] `src/views/kitchen/KitchenMainView.vue` - Add KPI screen routing

---

## Phase 5: Backoffice Report

### 5.1 Create Report View

- [ ] `src/views/backoffice/analytics/KitchenTimeKpiView.vue` (NEW)
  - Date range filter
  - Department filter
  - Historical data table/chart
  - Summary cards

### 5.2 Add Route

- [ ] `src/router/index.ts`

```typescript
{
  path: '/analytics/kitchen-time-kpi',
  name: 'kitchen-time-kpi',
  component: () => import('@/views/backoffice/analytics/KitchenTimeKpiView.vue'),
  meta: { allowedRoles: ['admin', 'manager'] }
}
```

---

## Files Summary

### Modify (7 files)

| File                                                 | Changes                |
| ---------------------------------------------------- | ---------------------- |
| `src/stores/pos/types.ts`                            | Add `cookingStartedAt` |
| `src/stores/pos/orders/supabaseMappers.ts`           | Add field to mappers   |
| `src/stores/kitchen/kitchenService.ts`               | Fix timestamp logic    |
| `src/stores/kitchen/composables/useKitchenDishes.ts` | Add field              |
| `src/views/kitchen/orders/components/DishCard.vue`   | Fix timer              |
| `src/views/kitchen/KitchenMainView.vue`              | Add KPI screen         |
| `src/router/index.ts`                                | Add report route       |

### Create (6 files)

| File                                                            | Purpose          |
| --------------------------------------------------------------- | ---------------- |
| `src/supabase/migrations/052_create_kitchen_time_kpi_table.sql` | DB table         |
| `src/stores/kitchenKpi/services/timeKpiService.ts`              | API/calculations |
| `src/stores/kitchenKpi/composables/useTimeKpi.ts`               | Composable       |
| `src/views/kitchen/orders/components/TimeKpiWidget.vue`         | Widget           |
| `src/views/kitchen/kpi/KpiScreen.vue`                           | KPI screen       |
| `src/views/backoffice/analytics/KitchenTimeKpiView.vue`         | Report           |

---

## Key Insight

**`sentToKitchenAt` C65 ?@028;L=> CAB0=02;8205BAO 2 POS:**

```typescript
// src/stores/pos/orders/services.ts:152-157
if (item.status === 'draft') {
  item.status = 'waiting'
  item.sentToKitchenAt = new Date().toISOString() // Correct!
}
```

**03 2 `kitchenService.ts`** - =5?@028;L=> CAB0=02;820; `sentToKitchenAt` ?@8 ?5@5E>45 2 `cooking`.
