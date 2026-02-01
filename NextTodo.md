# NextTodo - Current Sprint

## Refactor Preparation Costs - Split into Unit and Portion

### Problem

`last_known_cost` хранит одно значение, но используется по-разному:

- Для weight-type: cost per gram
- Для portion-type: неясно - то cost per portion, то per gram (путаница!)

**Пример путаницы:**

- Chicken breast 120g: `last_known_cost = 70.83` (Rp/gram)
- Batch cost = 8,500 Rp (70.83 × 120 = cost per portion)
- Мы "исправили" на 70.83 - но это cost per GRAM!

### Solution

Добавить два явных поля:

```sql
last_known_cost_unit DECIMAL    -- cost per base unit (gram/ml/piece)
last_known_cost_portion DECIMAL -- cost per portion (для portion_type='portion')
```

### Files to Modify

1. **Database Migration** - `src/supabase/migrations/123_split_preparation_costs.sql`
2. **Types** - `src/stores/recipes/types.ts`
3. **Service Layer**:
   - `src/stores/preparation/preparationService.ts`
   - `src/stores/preparation/negativeBatchService.ts`
4. **Mappers** - `src/stores/preparation/supabase/mappers.ts`
5. **UI**:
   - `src/views/kitchen/preparation/dialogs/PrepItemDetailsDialog.vue`
   - `src/views/kitchen/preparation/dialogs/SimpleProductionDialog.vue`
6. **Documentation** - `src/About/docs/preparation/PREPARATION_COST_ARCHITECTURE.md`

### Migration Strategy

1. Add columns (nullable)
2. Migrate data: `last_known_cost` → `last_known_cost_unit`
3. Calculate `last_known_cost_portion` = unit × portion_size
4. Update code to use new fields
5. Keep old field for backward compatibility

### Status

- [ ] Create migration
- [ ] Update types
- [ ] Update preparationService.ts
- [ ] Update negativeBatchService.ts
- [ ] Update mappers
- [ ] Update UI components
- [ ] Update documentation
- [ ] Test on DEV
- [ ] Apply to PROD

---

## Refactor: Standardize Cost Parameter Naming

> **Status:** Ready for implementation
> **Scope:** LOW RISK - Debug layer only
> **Date:** 2026-01-31

### Problem

Inconsistent parameter naming between:

- `avgCostPerUnit` (old, used in debug layer)
- `averageCostPerUnit` (correct, used in core business logic)

Views have defensive code checking both spellings - cleanup needed.

### Analysis Results

#### Already Correct ✅ (No changes needed)

- **Type Definitions:**
  - `ActualCostBreakdown` → `productCosts`, `preparationCosts` ✅
  - `ProductCostItem`, `PreparationCostItem` → `averageCostPerUnit` ✅
- **Core Business Logic:**
  - `batchAllocationUtils.ts` - returns `averageCostPerUnit` ✅
  - `CostAdapter.ts` - uses `preparationCosts`, `productCosts` ✅
  - `salesStore.ts` - type guard checks `productCosts`, `preparationCosts` ✅
- **RPC Functions:**
  - All migrations return `averageCostPerUnit` ✅
  - `076_fifo_allocation_rpc.sql`, `111_support_active_negative_batches_fifo.sql`, etc.

#### Needs Refactoring ⚠️

| #   | File                                                 | Line | Issue                            |
| --- | ---------------------------------------------------- | ---- | -------------------------------- |
| 1   | `src/stores/debug/types.ts`                          | 91   | Interface uses `avgCostPerUnit`  |
| 2   | `src/stores/debug/debugService.ts`                   | 979  | Calculates `avgCostPerUnit`      |
| 3   | `src/stores/debug/composables/useDebugFormatting.ts` | 89   | Blacklist has `avgCostPerUnit`   |
| 4   | `src/stores/debug/composables/useDebugFormatting.ts` | 343  | Formats `metrics.avgCostPerUnit` |

#### Defensive Code to Cleanup (after debug fix)

| #   | File                        | Lines            | Current Code                           |
| --- | --------------------------- | ---------------- | -------------------------------------- |
| 5   | `SalesTransactionsView.vue` | 340, 354         | `avgCostPerUnit ?? averageCostPerUnit` |
| 6   | `WriteOffHistoryView.vue`   | 472-473, 494-495 | `avgCostPerUnit ?? averageCostPerUnit` |

### Implementation Plan

#### Phase 1: Update Debug Layer (breaking change for debug only)

**Step 1.1: Update Debug Types**

```typescript
// src/stores/debug/types.ts:91
// OLD:
avgCostPerUnit: number

// NEW:
averageCostPerUnit: number
```

**Step 1.2: Update Debug Service**

```typescript
// src/stores/debug/debugService.ts:979
// OLD:
avgCostPerUnit: this.calculateAverage(products, 'baseCostPerUnit'),

// NEW:
averageCostPerUnit: this.calculateAverage(products, 'baseCostPerUnit'),
```

**Step 1.3: Update Debug Formatting**

```typescript
// src/stores/debug/composables/useDebugFormatting.ts

// Line 89 - Update blacklist:
// OLD: 'avgCostPerUnit',
// NEW: 'averageCostPerUnit',

// Line 343 - Update format:
// OLD: avgCost: metrics.avgCostPerUnit ? formatIDR(metrics.avgCostPerUnit) : 'N/A',
// NEW: avgCost: metrics.averageCostPerUnit ? formatIDR(metrics.averageCostPerUnit) : 'N/A',
```

#### Phase 2: Cleanup Defensive Code in Views

**Step 2.1: Simplify SalesTransactionsView.vue**

```typescript
// src/views/backoffice/sales/SalesTransactionsView.vue

// Line 340, 354:
// OLD: costPerUnit: prep.avgCostPerUnit ?? prep.averageCostPerUnit ?? 0,
// NEW: costPerUnit: prep.averageCostPerUnit ?? 0,
```

**Step 2.2: Simplify WriteOffHistoryView.vue**

```typescript
// src/views/backoffice/inventory/WriteOffHistoryView.vue

// Lines 472-473, 494-495:
// OLD:
//   prep.avgCostPerUnit ??
//   prep.averageCostPerUnit ??
// NEW:
//   prep.averageCostPerUnit ??
```

### Risk Assessment

| Aspect              | Risk Level | Notes                                |
| ------------------- | ---------- | ------------------------------------ |
| Core Business Logic | ✅ NONE    | Already uses correct naming          |
| Database/RPC        | ✅ NONE    | Already returns `averageCostPerUnit` |
| COGS Calculation    | ✅ NONE    | No changes needed                    |
| Write-off Flow      | ✅ NONE    | Already correct                      |
| Debug Layer         | ⚠️ LOW     | Only affects debug UI                |
| View Components     | ⚠️ LOW     | Cleanup only, not functional change  |

### Backward Compatibility Notes

1. **Database:** No changes needed - RPC already returns `averageCostPerUnit`
2. **Cached Data:** Old `actualCost` in `order_items.cached_actual_cost` may have old naming
   - Views already have defensive code (Step 2 keeps this working)
   - Consider keeping defensive code for 1 sprint, then remove
3. **Debug Tools:** May need restart after update

### Testing Checklist

- [ ] Build passes (`pnpm build`)
- [ ] Debug panel shows costs correctly
- [ ] SalesTransactionsView displays cost breakdown
- [ ] WriteOffHistoryView shows item costs
- [ ] No console errors related to undefined properties
- [ ] Check cached_actual_cost from old orders still renders

### Status

- [ ] Update debug/types.ts
- [ ] Update debug/debugService.ts
- [ ] Update debug/composables/useDebugFormatting.ts
- [ ] Cleanup SalesTransactionsView.vue (keep defensive for now)
- [ ] Cleanup WriteOffHistoryView.vue (keep defensive for now)
- [ ] Test on DEV
- [ ] Remove defensive code (next sprint)
