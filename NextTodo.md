# Kitchen History Tab Enhancement: Unified Operations View

## Sprint: Kitchen History Unification

**Status**: Ready to Start
**Priority**: Medium

---

## Problem Statement

The History tab in Kitchen (`src/views/kitchen/preparation/components/HistoryTab.vue`) currently only shows completed **production schedule tasks**. Write-off operations (preparation and product write-offs) are not displayed, even though they are important kitchen operations.

**User Expectation**: See ALL completed operations in one place - productions AND write-offs.

---

## Current Architecture

### Data Sources:

1. **Production Schedule Tasks** - `production_schedule` table

   - Status = 'completed'
   - Type: `ProductionScheduleItem`
   - Fields: `preparationName`, `completedQuantity`, `completedAt`, `completedByName`, `productionSlot`

2. **Preparation Write-offs** - `preparation_operations` table

   - Type: 'write_off'
   - Fields: `items` (JSONB), `operation_date`, `responsible_person`, `write_off_details`

3. **Product Write-offs** - `storage_operations` table
   - Type: 'write_off'
   - Fields: `items` (JSONB), `operation_date`, `responsible_person`, `write_off_details`

### Current Components:

- `HistoryTab.vue` - receives `completedTasks: ProductionScheduleItem[]`
- `HistoryTaskCard.vue` - displays single production task (green styling)
- `PreparationScreen.vue` - provides data via `kpiStore.scheduleItems.filter(status === 'completed')`

---

## Task List

### Phase 1: Create Unified History Type

- [ ] **1.1 Create unified history item type** in `src/stores/kitchenKpi/types.ts`:

  ```typescript
  type HistoryOperationType = 'production' | 'prep_writeoff' | 'product_writeoff'

  interface KitchenHistoryItem {
    id: string
    operationType: HistoryOperationType
    itemName: string // preparation or product name
    quantity: number
    unit: string
    completedAt: string
    completedBy: string
    department: 'kitchen' | 'bar'
    // Production-specific
    productionSlot?: string
    targetQuantity?: number
    // Write-off specific
    reason?: string
    affectsKpi?: boolean
    totalCost?: number
  }
  ```

### Phase 2: Backend Data Loading

- [ ] **2.1 Add service methods** in `kitchenKpiService.ts`:

  - `getPreparationWriteOffs(date, department)` - fetch from `preparation_operations`
  - `getProductWriteOffs(date, department)` - fetch from `storage_operations`

- [ ] **2.2 Add mapper functions** to convert DB rows to `KitchenHistoryItem`:

  - `productionToHistoryItem()`
  - `prepWriteOffToHistoryItem()`
  - `productWriteOffToHistoryItem()`

- [ ] **2.3 Add store computed** `kitchenHistory: KitchenHistoryItem[]` that merges all sources

### Phase 3: UI Components

- [ ] **3.1 Create `HistoryWriteOffCard.vue`** - new card component for write-offs:

  - Red/orange color scheme (vs green for production)
  - Show: item name, quantity, reason, cost
  - Icon: `mdi-package-variant-remove` or `mdi-delete-outline`

- [ ] **3.2 Update `HistoryTab.vue`**:

  - Change prop type to `historyItems: KitchenHistoryItem[]`
  - Render appropriate card based on `operationType`
  - Update summary to show: X Produced, Y Written Off
  - Add filter chips: All | Productions | Write-offs

- [ ] **3.3 Update `PreparationScreen.vue`**:
  - Replace `completedTasks` with `kitchenHistory`
  - Update badge count to include write-offs

### Phase 4: Real-time Updates

- [ ] **4.1 Update `@completed` handlers** to refresh history data
- [ ] **4.2 Consider Supabase realtime subscription** for history updates

---

## Visual Design

### Production Card (existing - green):

```
┌────────────────────────────────────┐
│ ✅ Dough ciabatta           Urgent │
│ ⚖️ 1.6kg  🕐 13:56  👤 Kitchen Staff │
└────────────────────────────────────┘
```

### Write-off Card (new - red/orange):

```
┌────────────────────────────────────┐
│ 🗑️ Bacon slices              -60g │
│ Reason: Expired  💰 Rp 15,000     │
│ 🕐 14:23  👤 Kitchen Staff         │
└────────────────────────────────────┘
```

---

## Database Queries

### Preparation Write-offs:

```sql
SELECT * FROM preparation_operations
WHERE operation_type = 'write_off'
  AND department = 'kitchen'
  AND DATE(operation_date) = CURRENT_DATE
ORDER BY operation_date DESC
```

### Product Write-offs:

```sql
SELECT * FROM storage_operations
WHERE operation_type = 'write_off'
  AND department = 'kitchen'
  AND DATE(operation_date) = CURRENT_DATE
ORDER BY operation_date DESC
```

---

## Files to Modify

1. `src/stores/kitchenKpi/types.ts` - add `KitchenHistoryItem` type
2. `src/stores/kitchenKpi/kitchenKpiService.ts` - add write-off fetch methods
3. `src/stores/kitchenKpi/kitchenKpiStore.ts` - add `kitchenHistory` computed
4. `src/views/kitchen/preparation/components/HistoryTab.vue` - update to use unified type
5. `src/views/kitchen/preparation/components/HistoryTaskCard.vue` - rename to `HistoryProductionCard.vue`
6. `src/views/kitchen/preparation/components/HistoryWriteOffCard.vue` - NEW
7. `src/views/kitchen/preparation/PreparationScreen.vue` - update data binding

---

## Testing

- [ ] Production tasks still appear correctly (regression)
- [ ] Prep write-offs appear with correct styling
- [ ] Product write-offs appear with correct styling
- [ ] Sorting works (newest first) across all types
- [ ] Filter chips work correctly
- [ ] Summary counts are accurate
- [ ] Badge on History tab shows total count
