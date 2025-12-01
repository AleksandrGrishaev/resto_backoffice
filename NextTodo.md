# Current Sprint: Sprint 3 - P&L Report Enhancement + Negative Inventory Report MVP

**Duration:** 6.5 days (0.5 + 3 + 3)
**Status:** 🟢 Ready to Start
**Start Date:** December 1, 2025
**Goal:** Implement inventory adjustments in P&L Report and create basic Negative Inventory Report

---

## Sprint Overview

This sprint enhances financial reporting with accurate "Real Food Cost" calculations and provides operational visibility into negative inventory events.

**Objectives:**

1. Add expense categories for inventory adjustments (foundation)
2. Update P&L Report to show "Real Food Cost" including inventory variances
3. Create MVP Negative Inventory Report (list, filters, export)

**Prerequisites:**

- ✅ Sprint 1 completed (database schema, services)
- ✅ Sprint 2 completed (negative batch creation, auto-reconciliation)
- ✅ Negative batches are being created and tracked
- ✅ Expense/income transactions are being recorded

**Approach:** Step-by-step MVP implementation (as requested by user)

---

## Phase 3.1: Add Expense Categories (Day 1 Morning - 0.5 days)

### Priority: CRITICAL - Foundation for all reporting

**Status:** ⏳ PENDING

**Objective:** Add 3 new expense categories to support inventory adjustment tracking

### Task 3.1.1: Update Account Store Types

**File:** `src/stores/account/types.ts`

**Current Code:**

```typescript
export type DailyExpenseCategory =
  | 'product'
  | 'takeaway'
  | 'ayu_cake'
  | 'utilities'
  | 'salary'
  | 'renovation'
  | 'transport'
  | 'cleaning'
  | 'security'
  | 'village'
  | 'rent'
  | 'other'
```

**New Code:**

```typescript
export type DailyExpenseCategory =
  | 'product'
  | 'food_cost' // NEW - Negative batch write-offs (from POS sales/production)
  | 'inventory_variance' // NEW - Reconciliation corrections (auto surplus/deficit)
  | 'inventory_adjustment' // NEW - Monthly physical count adjustments, spoilage
  | 'takeaway'
  | 'ayu_cake'
  | 'utilities'
  | 'salary'
  | 'renovation'
  | 'transport'
  | 'cleaning'
  | 'security'
  | 'village'
  | 'rent'
  | 'other'
```

**Category Usage:**

| Category               | Type           | Description                                       | Example                            |
| ---------------------- | -------------- | ------------------------------------------------- | ---------------------------------- |
| `food_cost`            | expense        | Negative batch write-offs during sales/production | -100ml Marinade @ 51.13 = -5113₽   |
| `inventory_variance`   | income/expense | Auto-reconciliation corrections (surplus/deficit) | +100ml correction @ 51.13 = +5113₽ |
| `inventory_adjustment` | expense        | Monthly physical count discrepancies, spoilage    | -2000g variance @ 60 = -120,000₽   |

**Notes:**

- ✅ No database migration needed (categories are enum values only)
- ✅ Already used in `writeOffExpenseService.ts` (Sprint 2)
- ✅ Backward compatible (existing categories unchanged)

**Implementation Steps:**

1. Open `src/stores/account/types.ts`
2. Locate `DailyExpenseCategory` type definition
3. Add 3 new categories after `'product'`
4. Save file
5. Run `pnpm build` to verify TypeScript compilation

**Manual Testing:**

- [ ] Build completes without TypeScript errors
- [ ] Account Store transactions can use new categories
- [ ] (Optional) Check category dropdown in transaction creation UI displays new options

**Estimated Time:** 30 minutes

---

## Phase 3.2: P&L Report - Inventory Adjustments Section (Day 1-4 - 3 days)

### Priority: HIGH - Critical business requirement (Issue 3)

**Status:** ⏳ PENDING

**Objective:** Show accurate "Real Food Cost" by separating inventory adjustments from operating expenses

### Business Logic

**Formula:**

```
Real Food Cost = Pure Sales Food Cost + All Losses - All Surplus

Components:
  Pure Sales Food Cost:    Sales COGS from POS transactions
  Losses (expenses):       Spoilage, Shortage, Negative Batches
  Gains (income):          Surplus, Reconciliation Corrections
```

**Example:**

```
Revenue: 5,000,000₽

COST OF GOODS SOLD (COGS):
  Sales Food Cost:          -1,000,000₽  (from POS orders)
  Sales Beverage Cost:        -300,000₽  (from POS orders)
  ────────────────────────────────────────────
  Total Sales COGS:         -1,300,000₽

Gross Profit (from Sales): 3,700,000₽

INVENTORY ADJUSTMENTS:  ← NEW SECTION
  Losses:
    Spoilage/Expired:         -200,000₽  (category: inventory_adjustment)
    Inventory Shortage:       -150,000₽  (category: inventory_adjustment)
    Negative Batch Variance:   -40,000₽  (category: food_cost)

  Gains:
    Inventory Surplus:         +60,000₽  (category: inventory_adjustment)
    Reconciliation Corrections: +40,000₽  (category: inventory_variance)
  ────────────────────────────────────────────
  Total Adjustments:          -290,000₽

Real Food Cost: -1,590,000₽  (Sales COGS + Adjustments)

OPERATING EXPENSES (OPEX):
  Utilities:                  -100,000₽
  Salary:                     -800,000₽
  Rent:                       -400,000₽
  Transport:                   -50,000₽
  ────────────────────────────────────────────
  Total OPEX:               -1,350,000₽

Net Profit: 1,760,000₽
```

### Task 3.2.1: Identify P&L Report Files

**Step 1: Find P&L Report Store**

Expected locations:

- `src/stores/analytics/plReportStore.ts`
- `src/stores/analytics/profitLossStore.ts`
- `src/stores/reports/plReportStore.ts`

**Action:** Search codebase for P&L calculation logic

```bash
# Search for P&L-related files
find src -name "*pl*" -o -name "*profit*" -o -name "*loss*" | grep -E "\.(ts|js)$"

# Search for revenue/COGS calculations
grep -r "grossProfit\|netProfit\|salesCOGS" src/stores/ src/views/
```

**Step 2: Find P&L Report View**

Expected locations:

- `src/views/backoffice/analytics/PLReportView.vue`
- `src/views/reports/ProfitLossReport.vue`
- `src/views/analytics/PLReport.vue`

**Action:** Search for P&L UI components

```bash
# Search for P&L view files
find src/views -name "*PL*" -o -name "*profit*" -o -name "*loss*" | grep ".vue$"

# Search for P&L UI references
grep -r "P&L\|Profit.*Loss\|Net Profit" src/views/
```

**Deliverable:** Document exact file paths for store and view

---

### Task 3.2.2: Update P&L Calculation Logic

**File:** [To be determined in Task 3.2.1]

**Current Logic (Expected):**

```typescript
// Typical P&L calculation
async calculatePL(dateFrom: Date, dateTo: Date) {
  const revenue = await salesStore.getTotalRevenue(dateFrom, dateTo)
  const salesCOGS = await salesStore.getTotalCOGS(dateFrom, dateTo)
  const expenses = await accountStore.getExpensesByDateRange(dateFrom, dateTo)

  // Current: OPEX includes all expenses
  const opex = expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0)

  return {
    revenue,
    salesCOGS,
    grossProfit: revenue - salesCOGS,
    opex,
    netProfit: revenue - salesCOGS - opex
  }
}
```

**New Logic:**

```typescript
async calculatePL(dateFrom: Date, dateTo: Date) {
  const revenue = await salesStore.getTotalRevenue(dateFrom, dateTo)
  const salesCOGS = await salesStore.getTotalCOGS(dateFrom, dateTo)
  const allTransactions = await accountStore.getTransactionsByDateRange(dateFrom, dateTo)

  // ============================================
  // NEW: Separate inventory adjustments from OPEX
  // ============================================

  // 1. Filter inventory adjustment transactions
  const inventoryAdjustments = allTransactions.filter(t => {
    if (!t.expenseCategory) return false
    const category = t.expenseCategory.category
    return ['food_cost', 'inventory_variance', 'inventory_adjustment'].includes(category)
  })

  // 2. Separate losses (expenses) vs gains (income)
  const inventoryLosses = inventoryAdjustments
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const inventoryGains = inventoryAdjustments
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalAdjustments = -inventoryLosses + inventoryGains  // Net impact

  // 3. Calculate Real Food Cost
  const realFoodCost = salesCOGS + totalAdjustments

  // 4. OPEX excludes inventory adjustments
  const opexTransactions = allTransactions.filter(t => {
    if (!t.expenseCategory) return false
    const category = t.expenseCategory.category
    return !['food_cost', 'inventory_variance', 'inventory_adjustment'].includes(category)
  })

  const opex = opexTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // ============================================
  // Return new P&L structure
  // ============================================

  return {
    revenue,
    salesCOGS,
    grossProfit: revenue - salesCOGS,

    // NEW: Inventory Adjustments breakdown
    inventoryAdjustments: {
      losses: inventoryLosses,        // Always positive number
      gains: inventoryGains,          // Always positive number
      total: totalAdjustments,        // Can be negative or positive

      // Optional: Breakdown by category
      byCategory: {
        spoilage: inventoryAdjustments
          .filter(t => t.description?.includes('Spoilage') || t.description?.includes('Expired'))
          .reduce((sum, t) => sum + Math.abs(t.amount), 0),

        shortage: inventoryAdjustments
          .filter(t => t.expenseCategory?.category === 'inventory_adjustment' && t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0),

        negativeBatch: inventoryAdjustments
          .filter(t => t.expenseCategory?.category === 'food_cost')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0),

        surplus: inventoryAdjustments
          .filter(t => t.expenseCategory?.category === 'inventory_adjustment' && t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0),

        reconciliation: inventoryAdjustments
          .filter(t => t.expenseCategory?.category === 'inventory_variance')
          .reduce((sum, t) => sum + t.amount, 0)
      }
    },

    realFoodCost,  // Sales COGS + Adjustments
    opex,          // Excluding inventory adjustments
    netProfit: revenue - realFoodCost - opex
  }
}
```

**Key Changes:**

1. ✅ Separate inventory adjustments from OPEX
2. ✅ Calculate losses vs gains
3. ✅ Compute Real Food Cost = Sales COGS + Adjustments
4. ✅ Optional category breakdown for detailed reporting

**Testing:**

- [ ] Verify inventory adjustments calculate correctly
- [ ] Test with various transaction types
- [ ] Validate formula: Real Food Cost = Sales COGS + Adjustments
- [ ] Ensure OPEX excludes inventory categories
- [ ] Check edge cases (no adjustments, all losses, all gains)

**Estimated Time:** 1 day

---

### Task 3.2.3: Update P&L Report UI

**File:** [To be determined in Task 3.2.1]

**Current UI (Expected):**

```vue
<template>
  <div class="pl-report">
    <!-- Revenue Section -->
    <section class="revenue">
      <h3>Revenue</h3>
      <div class="amount">{{ formatIDR(report.revenue) }}</div>
    </section>

    <!-- COGS Section -->
    <section class="cogs">
      <h3>Cost of Goods Sold (Sales)</h3>
      <div class="total">{{ formatIDR(report.salesCOGS) }}</div>
    </section>

    <!-- Gross Profit -->
    <div class="gross-profit">
      <h3>Gross Profit</h3>
      <div class="amount">{{ formatIDR(report.grossProfit) }}</div>
    </div>

    <!-- OPEX Section -->
    <section class="opex">
      <h3>Operating Expenses</h3>
      <div class="total">{{ formatIDR(report.opex) }}</div>
    </section>

    <!-- Net Profit -->
    <div class="net-profit">
      <h3>Net Profit</h3>
      <div class="amount">{{ formatIDR(report.netProfit) }}</div>
    </div>
  </div>
</template>
```

**New UI (Add Inventory Adjustments Section):**

```vue
<template>
  <div class="pl-report">
    <!-- Revenue Section -->
    <section class="revenue">
      <h3>Revenue</h3>
      <div class="amount positive">{{ formatIDR(report.revenue) }}</div>
    </section>

    <!-- COGS Section -->
    <section class="cogs">
      <h3>Cost of Goods Sold (Sales)</h3>
      <div class="line-item">
        <span>Food Cost (Sales):</span>
        <span class="negative">{{ formatIDR(report.salesFoodCost) }}</span>
      </div>
      <div class="line-item">
        <span>Beverage Cost (Sales):</span>
        <span class="negative">{{ formatIDR(report.salesBeverageCost) }}</span>
      </div>
      <div class="total">
        <span>Total Sales COGS:</span>
        <span class="negative">{{ formatIDR(report.salesCOGS) }}</span>
      </div>
    </section>

    <!-- Gross Profit -->
    <div class="gross-profit section-divider">
      <h3>Gross Profit (from Sales)</h3>
      <div class="amount">{{ formatIDR(report.grossProfit) }}</div>
    </div>

    <!-- ============================================ -->
    <!-- NEW: Inventory Adjustments Section -->
    <!-- ============================================ -->
    <section class="inventory-adjustments">
      <h3>Inventory Adjustments</h3>

      <!-- Losses Subsection -->
      <div class="subsection losses">
        <h4>Losses:</h4>

        <div class="line-item">
          <span>Spoilage/Expired:</span>
          <span class="negative">
            {{ formatIDR(report.inventoryAdjustments.byCategory.spoilage) }}
          </span>
        </div>

        <div class="line-item">
          <span>Inventory Shortage:</span>
          <span class="negative">
            {{ formatIDR(report.inventoryAdjustments.byCategory.shortage) }}
          </span>
        </div>

        <div class="line-item">
          <span>Negative Batch Variance:</span>
          <span class="negative">
            {{ formatIDR(report.inventoryAdjustments.byCategory.negativeBatch) }}
          </span>
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" size="small" class="ml-2">mdi-information</v-icon>
            </template>
            <span>Cost from negative batches during sales/production</span>
          </v-tooltip>
        </div>
      </div>

      <!-- Gains Subsection -->
      <div class="subsection gains">
        <h4>Gains:</h4>

        <div class="line-item">
          <span>Inventory Surplus:</span>
          <span class="positive">
            {{ formatIDR(report.inventoryAdjustments.byCategory.surplus) }}
          </span>
        </div>

        <div class="line-item">
          <span>Reconciliation Corrections:</span>
          <span class="positive">
            {{ formatIDR(report.inventoryAdjustments.byCategory.reconciliation) }}
          </span>
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" size="small" class="ml-2">mdi-information</v-icon>
            </template>
            <span>Auto-corrections when new stock reconciles negative batches</span>
          </v-tooltip>
        </div>
      </div>

      <!-- Total Adjustments -->
      <div class="total-adjustments" :class="{ negative: report.inventoryAdjustments.total < 0 }">
        <span class="label">Total Adjustments:</span>
        <span class="amount">
          {{ formatIDR(report.inventoryAdjustments.total) }}
        </span>
      </div>

      <!-- Alert if negative inventory detected -->
      <v-alert v-if="hasNegativeInventory" type="warning" variant="tonal" class="mt-4">
        <div class="d-flex align-center justify-space-between">
          <div>
            <v-icon>mdi-alert</v-icon>
            <span class="ml-2">Negative inventory detected in this period</span>
          </div>
          <v-btn
            color="warning"
            variant="outlined"
            size="small"
            @click="$router.push('/reports/negative-inventory')"
          >
            View Details
          </v-btn>
        </div>
      </v-alert>
    </section>

    <!-- Real Food Cost -->
    <div class="real-food-cost section-divider">
      <h3>Real Food Cost</h3>
      <div class="amount negative">{{ formatIDR(report.realFoodCost) }}</div>
      <div class="formula text-caption text-medium-emphasis mt-1">
        Sales COGS ({{ formatIDR(report.salesCOGS) }}) + Adjustments ({{
          formatIDR(report.inventoryAdjustments.total)
        }})
      </div>
    </div>

    <!-- OPEX Section -->
    <section class="opex">
      <h3>Operating Expenses</h3>
      <!-- ... existing OPEX items ... -->
      <div class="total">
        <span>Total OPEX:</span>
        <span class="negative">{{ formatIDR(report.opex) }}</span>
      </div>
    </section>

    <!-- Net Profit -->
    <div class="net-profit section-divider">
      <h3>Net Profit</h3>
      <div
        class="amount"
        :class="{ positive: report.netProfit > 0, negative: report.netProfit < 0 }"
      >
        {{ formatIDR(report.netProfit) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils/currency'

// ... existing code ...

const hasNegativeInventory = computed(() => {
  return report.value.inventoryAdjustments.byCategory.negativeBatch > 0
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pl-report {
  // ... existing styles ...
}

.section-divider {
  border-top: 2px solid var(--color-divider);
  padding-top: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.inventory-adjustments {
  margin: var(--spacing-lg) 0;

  h3 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
  }

  .subsection {
    margin-bottom: var(--spacing-md);
    padding-left: var(--spacing-md);

    h4 {
      font-size: var(--text-base);
      font-weight: 500;
      margin-bottom: var(--spacing-sm);
    }

    &.losses h4 {
      color: var(--color-error);
    }

    &.gains h4 {
      color: var(--color-success);
    }
  }

  .line-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) 0;
    font-size: var(--text-sm);
  }

  .total-adjustments {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    margin-top: var(--spacing-md);
    background: var(--color-surface-variant);
    border-radius: var(--radius-md);
    font-weight: 600;

    &.negative .amount {
      color: var(--color-error);
    }
  }
}

.real-food-cost {
  .formula {
    opacity: 0.7;
  }
}

.positive {
  color: var(--color-success);
}

.negative {
  color: var(--color-error);
}

.amount {
  font-size: var(--text-xl);
  font-weight: 700;
}
</style>
```

**Key UI Changes:**

1. ✅ New "Inventory Adjustments" section between Gross Profit and OPEX
2. ✅ Separate "Losses" and "Gains" subsections
3. ✅ Breakdown by category (spoilage, shortage, negative batch, surplus, reconciliation)
4. ✅ Total Adjustments summary
5. ✅ Warning alert if negative inventory detected (links to report)
6. ✅ Real Food Cost section with formula explanation
7. ✅ Color coding (red for losses, green for gains)
8. ✅ Tooltips for complex categories

**Testing:**

- [ ] Verify all sections render correctly
- [ ] Test with various data scenarios (no adjustments, all losses, all gains, mixed)
- [ ] Check negative/positive number formatting and colors
- [ ] Verify link to Negative Inventory Report works
- [ ] Test responsive layout on mobile/tablet
- [ ] Verify tooltips display helpful information

**Estimated Time:** 2 days

---

### Phase 3.2 Completion Checklist

- [ ] P&L Report store and view files identified
- [ ] Calculation logic updated to separate inventory adjustments
- [ ] Real Food Cost formula implemented correctly
- [ ] UI updated with new Inventory Adjustments section
- [ ] Losses/Gains subsections display correctly
- [ ] Warning alert links to Negative Inventory Report
- [ ] Manual testing completed with various scenarios
- [ ] Build succeeds without TypeScript errors
- [ ] No console errors in browser

**Estimated Total Time for Phase 3.2:** 3 days

---

## Phase 3.3: Negative Inventory Report - MVP (Day 5-7 - 3 days)

### Priority: MEDIUM - Operational insights (basic version)

**Status:** ⏳ PENDING

**Objective:** Create basic report showing all negative inventory events with filters and export

### MVP Scope

**Included:**

- ✅ List all items (products + preparations) with negative batches
- ✅ Summary cards (total items, total cost impact, most frequent entity type)
- ✅ Basic filters (date range, category, entity type, status)
- ✅ Sortable table
- ✅ CSV export
- ✅ Navigation link from P&L Report

**Deferred to Sprint 4 (Advanced Features):**

- ❌ Recipe analysis (which recipes cause negatives)
- ❌ Root cause tracking (detailed source operation breakdown)
- ❌ Reconciliation history timeline
- ❌ Trend analysis charts
- ❌ Automated alerts/notifications

### Task 3.3.1: Create Report Store

**New File:** `src/stores/reports/negativeInventoryReportStore.ts`

**Implementation:**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorageStore } from '@/stores/storage/storageStore'
import { usePreparationStore } from '@/stores/preparation/preparationStore'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import type { Batch } from '@/types/storage'
import type { PreparationBatch } from '@/types/preparation'

const MODULE_NAME = 'NegativeInventoryReportStore'

export interface NegativeInventoryItem {
  entityId: string
  entityName: string
  entityType: 'product' | 'preparation'
  category: string
  unit: string
  negativeBatches: (Batch | PreparationBatch)[]
  totalNegativeQty: number
  totalCostImpact: number
  firstOccurrence: Date
  lastOccurrence: Date
  occurrenceCount: number
  unreconciledCount: number
  reconciledCount: number
}

export interface ReportFilters {
  dateFrom?: Date
  dateTo?: Date
  category?: string
  entityType?: 'product' | 'preparation' | 'all'
  status?: 'active' | 'reconciled' | 'all'
}

export const useNegativeInventoryReportStore = defineStore('negativeInventoryReport', () => {
  // ============================================
  // State
  // ============================================

  const items = ref<NegativeInventoryItem[]>([])
  const filters = ref<ReportFilters>({
    entityType: 'all',
    status: 'active' // Default: show only unreconciled
  })
  const loading = ref(false)

  // ============================================
  // Computed
  // ============================================

  const filteredItems = computed(() => {
    return items.value.filter(item => {
      // Entity type filter
      if (filters.value.entityType !== 'all' && item.entityType !== filters.value.entityType) {
        return false
      }

      // Category filter
      if (filters.value.category && item.category !== filters.value.category) {
        return false
      }

      // Status filter
      if (filters.value.status === 'active' && item.unreconciledCount === 0) {
        return false
      }
      if (filters.value.status === 'reconciled' && item.reconciledCount === 0) {
        return false
      }

      // Date range filter
      if (filters.value.dateFrom && item.lastOccurrence < filters.value.dateFrom) {
        return false
      }
      if (filters.value.dateTo && item.firstOccurrence > filters.value.dateTo) {
        return false
      }

      return true
    })
  })

  const summary = computed(() => {
    const filtered = filteredItems.value

    return {
      totalItems: filtered.length,
      totalCostImpact: filtered.reduce((sum, item) => sum + item.totalCostImpact, 0),
      totalUnreconciledBatches: filtered.reduce((sum, item) => sum + item.unreconciledCount, 0),
      mostFrequentType:
        filtered.filter(i => i.entityType === 'product').length >
        filtered.filter(i => i.entityType === 'preparation').length
          ? 'product'
          : 'preparation'
    }
  })

  // ============================================
  // Actions
  // ============================================

  async function fetchNegativeInventoryData() {
    loading.value = true

    try {
      const storageStore = useStorageStore()
      const preparationStore = usePreparationStore()
      const productsStore = useProductsStore()

      const results: NegativeInventoryItem[] = []

      // ============================================
      // Process Product Negative Batches
      // ============================================

      const productNegativeBatches = storageStore.batches.filter(b => b.isNegative)

      // Group by product
      const productGroups = new Map<string, Batch[]>()
      productNegativeBatches.forEach(batch => {
        const existing = productGroups.get(batch.itemId) || []
        productGroups.set(batch.itemId, [...existing, batch])
      })

      // Create report items
      productGroups.forEach((batches, productId) => {
        const product = productsStore.products.find(p => p.id === productId)
        if (!product) return

        const unreconciledBatches = batches.filter(b => !b.reconciledAt)
        const reconciledBatches = batches.filter(b => b.reconciledAt)

        const totalNegativeQty = batches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)

        const totalCostImpact = batches.reduce(
          (sum, b) => sum + Math.abs(b.currentQuantity) * b.costPerUnit,
          0
        )

        const dates = batches.map(b => new Date(b.negativeCreatedAt || b.createdAt))

        results.push({
          entityId: productId,
          entityName: product.name,
          entityType: 'product',
          category: product.category || 'Other',
          unit: batches[0].unit,
          negativeBatches: batches,
          totalNegativeQty,
          totalCostImpact,
          firstOccurrence: new Date(Math.min(...dates.map(d => d.getTime()))),
          lastOccurrence: new Date(Math.max(...dates.map(d => d.getTime()))),
          occurrenceCount: batches.length,
          unreconciledCount: unreconciledBatches.length,
          reconciledCount: reconciledBatches.length
        })
      })

      // ============================================
      // Process Preparation Negative Batches
      // ============================================

      const preparationNegativeBatches = preparationStore.batches.filter(b => b.isNegative)

      // Group by preparation
      const preparationGroups = new Map<string, PreparationBatch[]>()
      preparationNegativeBatches.forEach(batch => {
        const existing = preparationGroups.get(batch.preparationId) || []
        preparationGroups.set(batch.preparationId, [...existing, batch])
      })

      // Create report items
      preparationGroups.forEach((batches, preparationId) => {
        const preparation = preparationStore.preparations.find(p => p.id === preparationId)
        if (!preparation) return

        const unreconciledBatches = batches.filter(b => !b.reconciledAt)
        const reconciledBatches = batches.filter(b => b.reconciledAt)

        const totalNegativeQty = batches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)

        const totalCostImpact = batches.reduce(
          (sum, b) => sum + Math.abs(b.currentQuantity) * b.costPerUnit,
          0
        )

        const dates = batches.map(b => new Date(b.negativeCreatedAt || b.createdAt))

        results.push({
          entityId: preparationId,
          entityName: preparation.name,
          entityType: 'preparation',
          category: preparation.category || 'Other',
          unit: batches[0].unit,
          negativeBatches: batches,
          totalNegativeQty,
          totalCostImpact,
          firstOccurrence: new Date(Math.min(...dates.map(d => d.getTime()))),
          lastOccurrence: new Date(Math.max(...dates.map(d => d.getTime()))),
          occurrenceCount: batches.length,
          unreconciledCount: unreconciledBatches.length,
          reconciledCount: reconciledBatches.length
        })
      })

      items.value = results

      DebugUtils.info(MODULE_NAME, 'Negative inventory data fetched', {
        totalItems: results.length,
        products: productGroups.size,
        preparations: preparationGroups.size
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch negative inventory data', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters: Partial<ReportFilters>) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function resetFilters() {
    filters.value = {
      entityType: 'all',
      status: 'active'
    }
  }

  function exportToCSV(): string {
    const headers = [
      'Item Name',
      'Type',
      'Category',
      'Unit',
      'Total Negative Qty',
      'Cost Impact',
      'Occurrences',
      'Unreconciled',
      'Reconciled',
      'First Occurrence',
      'Last Occurrence'
    ]

    const rows = filteredItems.value.map(item => [
      item.entityName,
      item.entityType,
      item.category,
      item.unit,
      item.totalNegativeQty.toString(),
      item.totalCostImpact.toString(),
      item.occurrenceCount.toString(),
      item.unreconciledCount.toString(),
      item.reconciledCount.toString(),
      item.firstOccurrence.toLocaleDateString(),
      item.lastOccurrence.toLocaleDateString()
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

    return csv
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    items,
    filters,
    loading,

    // Computed
    filteredItems,
    summary,

    // Actions
    fetchNegativeInventoryData,
    setFilters,
    resetFilters,
    exportToCSV
  }
})
```

**Testing:**

- [ ] Store initializes correctly
- [ ] fetchNegativeInventoryData() loads all negative batches
- [ ] Products and preparations are grouped correctly
- [ ] Filters work (entity type, category, status, date range)
- [ ] Summary calculations are accurate
- [ ] CSV export contains all required data

**Estimated Time:** 1 day

---

### Task 3.3.2: Create Report View Component

**New File:** `src/views/reports/NegativeInventoryReport.vue`

**Implementation:**

```vue
<template>
  <div class="negative-inventory-report pa-6">
    <!-- Header -->
    <div class="report-header mb-6">
      <h1 class="text-h4">Negative Inventory Report</h1>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Track items with insufficient stock and their cost impact
      </p>
    </div>

    <!-- Summary Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Total Items</div>
            <div class="text-h5 mt-2">{{ summary.totalItems }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Total Cost Impact</div>
            <div class="text-h5 mt-2 error--text">
              {{ formatIDR(summary.totalCostImpact) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Unreconciled Batches</div>
            <div class="text-h5 mt-2">{{ summary.totalUnreconciledBatches }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Most Frequent Type</div>
            <div class="text-h5 mt-2 text-capitalize">
              {{ summary.mostFrequentType }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.entityType"
              :items="entityTypeOptions"
              label="Entity Type"
              density="compact"
              @update:model-value="reportStore.setFilters({ entityType: $event })"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              density="compact"
              @update:model-value="reportStore.setFilters({ status: $event })"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateFrom"
              type="date"
              label="Date From"
              density="compact"
              @update:model-value="
                reportStore.setFilters({ dateFrom: $event ? new Date($event) : undefined })
              "
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateTo"
              type="date"
              label="Date To"
              density="compact"
              @update:model-value="
                reportStore.setFilters({ dateTo: $event ? new Date($event) : undefined })
              "
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <v-btn variant="outlined" size="small" @click="reportStore.resetFilters()">
              Reset Filters
            </v-btn>

            <v-btn variant="outlined" size="small" color="primary" class="ml-2" @click="exportCSV">
              <v-icon left>mdi-download</v-icon>
              Export CSV
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :loading="loading"
        :items-per-page="25"
        class="negative-inventory-table"
      >
        <!-- Item Name -->
        <template #item.entityName="{ item }">
          <div class="d-flex align-center">
            <v-chip
              size="x-small"
              :color="item.entityType === 'product' ? 'blue' : 'purple'"
              class="mr-2"
            >
              {{ item.entityType === 'product' ? 'P' : 'R' }}
            </v-chip>
            <span class="font-weight-medium">{{ item.entityName }}</span>
          </div>
        </template>

        <!-- Total Negative Qty -->
        <template #item.totalNegativeQty="{ item }">
          <span class="error--text font-weight-bold">
            -{{ item.totalNegativeQty }} {{ item.unit }}
          </span>
        </template>

        <!-- Cost Impact -->
        <template #item.totalCostImpact="{ item }">
          <span class="error--text">{{ formatIDR(item.totalCostImpact) }}</span>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <v-chip size="small" :color="item.unreconciledCount > 0 ? 'warning' : 'success'">
            {{ item.unreconciledCount > 0 ? 'Active' : 'Reconciled' }}
          </v-chip>
        </template>

        <!-- First Occurrence -->
        <template #item.firstOccurrence="{ item }">
          {{ formatDate(item.firstOccurrence) }}
        </template>

        <!-- Last Occurrence -->
        <template #item.lastOccurrence="{ item }">
          {{ formatDate(item.lastOccurrence) }}
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn icon="mdi-eye" size="small" variant="text" @click="viewDetails(item)" />
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNegativeInventoryReportStore } from '@/stores/reports/negativeInventoryReportStore'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

const reportStore = useNegativeInventoryReportStore()

// ============================================
// State
// ============================================

const filters = computed(() => reportStore.filters)
const filteredItems = computed(() => reportStore.filteredItems)
const summary = computed(() => reportStore.summary)
const loading = computed(() => reportStore.loading)

const entityTypeOptions = [
  { title: 'All', value: 'all' },
  { title: 'Products', value: 'product' },
  { title: 'Preparations', value: 'preparation' }
]

const statusOptions = [
  { title: 'All', value: 'all' },
  { title: 'Active (Unreconciled)', value: 'active' },
  { title: 'Reconciled', value: 'reconciled' }
]

const headers = [
  { title: 'Item Name', key: 'entityName', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Total Negative Qty', key: 'totalNegativeQty', sortable: true },
  { title: 'Cost Impact', key: 'totalCostImpact', sortable: true },
  { title: 'Occurrences', key: 'occurrenceCount', sortable: true },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'First Occurrence', key: 'firstOccurrence', sortable: true },
  { title: 'Last Occurrence', key: 'lastOccurrence', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// ============================================
// Methods
// ============================================

function formatDate(date: Date): string {
  return TimeUtils.formatDateForDisplay(date)
}

function exportCSV() {
  const csv = reportStore.exportToCSV()
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `negative-inventory-report-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function viewDetails(item: any) {
  // TODO: Open details dialog showing batch list, reconciliation history
  console.log('View details for:', item)
}

// ============================================
// Lifecycle
// ============================================

onMounted(async () => {
  await reportStore.fetchNegativeInventoryData()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.negative-inventory-report {
  max-width: 1400px;
  margin: 0 auto;
}

.report-header {
  border-bottom: 2px solid var(--color-divider);
  padding-bottom: var(--spacing-md);
}

.negative-inventory-table {
  ::v-deep(.v-data-table__td) {
    font-size: var(--text-sm);
  }
}
</style>
```

**Testing:**

- [ ] Report loads and displays negative inventory items
- [ ] Summary cards show correct totals
- [ ] Filters work correctly (entity type, status, date range)
- [ ] Table sorting works
- [ ] CSV export downloads with correct data
- [ ] Status chips display correctly (Active vs Reconciled)
- [ ] Date formatting is consistent
- [ ] Responsive layout on mobile/tablet

**Estimated Time:** 1.5 days

---

### Task 3.3.3: Navigation Integration

**Files to Update:**

1. `src/router/index.ts` - Add route
2. Main navigation menu - Add link
3. `src/views/backoffice/analytics/PLReportView.vue` - Link from P&L (already in Phase 3.2)

**Router Update:**

```typescript
// src/router/index.ts

// ... existing imports ...

{
  path: '/reports/negative-inventory',
  name: 'NegativeInventoryReport',
  component: () => import('@/views/reports/NegativeInventoryReport.vue'),
  meta: {
    requiresAuth: true,
    allowedRoles: ['admin', 'manager'],
    title: 'Negative Inventory Report'
  }
}
```

**Navigation Menu Update:**

Find the Reports section in main navigation and add:

```vue
<v-list-item
  to="/reports/negative-inventory"
  prepend-icon="mdi-alert-circle"
  title="Negative Inventory"
/>
```

**Testing:**

- [ ] Route navigates to report correctly
- [ ] Menu link displays in Reports section
- [ ] Only admin/manager roles can access
- [ ] Page title displays correctly
- [ ] Link from P&L Report warning works

**Estimated Time:** 0.5 days

---

### Phase 3.3 Completion Checklist

- [ ] negativeInventoryReportStore created and tested
- [ ] NegativeInventoryReport.vue created and styled
- [ ] Summary cards display correct metrics
- [ ] Filters work (entity type, status, date range)
- [ ] Data table displays all items correctly
- [ ] CSV export works
- [ ] Navigation integrated (router + menu + P&L link)
- [ ] Manual testing completed
- [ ] Build succeeds without errors

**Estimated Total Time for Phase 3.3:** 3 days

---

## Sprint 3 Timeline Summary

| Phase                              | Tasks                        | Duration     | Status     |
| ---------------------------------- | ---------------------------- | ------------ | ---------- |
| **3.1: Expense Categories**        | Add 3 categories to types.ts | 0.5 days     | ⏳ PENDING |
| **3.2: P&L Report**                | Update calculation + UI      | 3 days       | ⏳ PENDING |
| **3.3: Negative Inventory Report** | Store + View + Navigation    | 3 days       | ⏳ PENDING |
| **Testing & Validation**           | Manual testing, bug fixes    | Included     | ⏳ PENDING |
| **TOTAL**                          |                              | **6.5 days** |            |

---

## Manual Testing Checklist

### Phase 3.1 Testing

- [ ] Build succeeds without TypeScript errors
- [ ] New categories available in Account Store
- [ ] Existing expense transactions unaffected

### Phase 3.2 Testing

- [ ] P&L Report displays new Inventory Adjustments section
- [ ] Losses subsection shows: spoilage, shortage, negative batch
- [ ] Gains subsection shows: surplus, reconciliation
- [ ] Total Adjustments calculates correctly
- [ ] Real Food Cost = Sales COGS + Adjustments
- [ ] Warning alert appears when negative inventory detected
- [ ] Link to Negative Inventory Report works
- [ ] Tooltips display helpful information
- [ ] Number formatting correct (negative/positive, colors)

**Test Scenarios:**

1. **No Adjustments:**

   - Real Food Cost = Sales COGS
   - Adjustments section shows all zeros
   - No warning alert

2. **Losses Only:**

   - Total Adjustments negative
   - Real Food Cost > Sales COGS
   - Warning alert appears

3. **Gains Only:**

   - Total Adjustments positive
   - Real Food Cost < Sales COGS
   - Warning alert may appear (if negative batches exist)

4. **Mixed:**
   - Total Adjustments = Losses - Gains
   - Real Food Cost = Sales COGS + (Losses - Gains)
   - Warning alert if negative batches exist

### Phase 3.3 Testing

- [ ] Report loads all negative inventory items
- [ ] Summary cards display correct totals
- [ ] Entity type filter works (All, Products, Preparations)
- [ ] Status filter works (All, Active, Reconciled)
- [ ] Date range filter works
- [ ] Table sorting works on all columns
- [ ] CSV export downloads with correct data
- [ ] Status chips color-coded correctly
- [ ] View details button works (or shows placeholder)
- [ ] Responsive on mobile/tablet

**Test Data:**

- Create negative batches for products (Bintang, Olive Oil, etc.)
- Create negative batches for preparations (Marinade, etc.)
- Create some reconciled batches (add new stock)
- Test with date ranges
- Test with different categories

---

## Success Criteria

**Sprint 3 Complete When:**

1. **Phase 3.1:**

   - ✅ 3 new expense categories added
   - ✅ TypeScript builds without errors

2. **Phase 3.2:**

   - ✅ P&L Report shows "Real Food Cost"
   - ✅ Inventory Adjustments section displays Losses/Gains
   - ✅ Warning alert links to Negative Inventory Report
   - ✅ Manual testing passes

3. **Phase 3.3:**
   - ✅ Negative Inventory Report displays all items
   - ✅ Filters work correctly
   - ✅ CSV export functional
   - ✅ Navigation integrated
   - ✅ Manual testing passes

**Ready for Sprint 4:** Deployment & Migration to Production

---

## Dependencies & Blockers

**Prerequisites (All ✅ Complete):**

- ✅ Sprint 1: Database schema with negative batch support
- ✅ Sprint 2: Write-off logic creating negative batches
- ✅ Sprint 2: Auto-reconciliation service
- ✅ Sprint 2: Expense/income transactions being recorded

**External Dependencies:**

- None (all work is internal)

**Known Blockers:**

- None identified

---

## Risk Assessment

**Low Risk:**

- ✅ Adding enum values (non-breaking)
- ✅ UI-only changes (no schema modifications)
- ✅ Read-only reporting (no data mutations)

**Medium Risk:**

- ⚠️ P&L Report calculation changes (need thorough testing)
- ⚠️ Dependency on finding correct P&L files (Task 3.2.1)

**Mitigation:**

- Start with Phase 3.1 (foundation, low risk)
- Identify P&L files early (Task 3.2.1)
- Test P&L calculations with multiple scenarios
- MVP approach for Negative Inventory Report (advanced features deferred)

---

## Notes for Implementation

1. **Step-by-Step Approach:**

   - Complete Phase 3.1 first (foundation for everything)
   - Identify P&L files before starting Phase 3.2
   - Test each phase before moving to next

2. **File Identification:**

   - Use search commands to find P&L Report files
   - Document exact paths before making changes
   - Review existing code structure

3. **Testing:**

   - Test each phase independently
   - Use real data from Sprint 2 (existing negative batches)
   - Validate formulas with manual calculations

4. **User Feedback:**
   - Since user requested "step by step", ask for approval after each phase
   - Show progress with screenshots if needed
   - Adjust based on feedback before moving forward

---

## Sprint 4 Preview (Future)

After Sprint 3 completion, Sprint 4 will focus on:

1. **Advanced Negative Inventory Report Features:**

   - Recipe analysis (which recipes cause negatives)
   - Root cause tracking
   - Reconciliation history timeline
   - Trend analysis charts

2. **Production Deployment:**

   - Database migration testing (DEV → PROD)
   - Backfill existing data
   - Performance optimization
   - Monitoring setup

3. **Documentation:**
   - User guide for P&L Report
   - User guide for Negative Inventory Report
   - Admin guide for expense categories

---

_This document tracks Sprint 3 implementation: P&L Report Enhancement + Negative Inventory Report MVP. Start with Phase 3.1 (Add Expense Categories) after user approval._
