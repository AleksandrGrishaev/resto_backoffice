# NextTodo.md - Current Sprint Tasks

---

## 📦 SPRINT 3: Simplify Negative Batches + Two COGS Calculation Methods

**Priority:** HIGH
**Complexity:** MEDIUM
**Risk Level:** MEDIUM (changes accounting logic)
**Estimated Effort:** 10-14 hours

### 🎯 Overview

**Two Goals:**

1. **Remove Account Transactions for Negative Batches**

   - Negative batches are technical records for monitoring, NOT financial transactions
   - accountStore (acc_1) should ONLY track real cash movements
   - NegativeInventoryReport is for error monitoring, NOT accounting

2. **Add Two COGS Calculation Methods to P&L**
   - Method 1: Accrual Basis (FIFO write-offs + adjustments) - Current
   - Method 2: Cash Basis (Payments + Inventory delta) - New

---

## 🎯 Goal 1: Simplify Negative Batches

### ✅ STATUS: GOAL 1 COMPLETE ✅

**Completed Core Changes:**

- ✅ Removed account transaction calls from reconciliationService.ts (preparation + storage)
- ✅ Removed account transaction calls from storageService.ts (4 locations)
- ✅ Added deficit dialog to DirectPreparationProductionDialog.vue
- ✅ Build successful, no TypeScript errors

**Completed Cleanup (Goal 1.5):**

- ✅ Removed orphaned functions from writeOffExpenseService.ts (5 functions deleted)
- ✅ Updated plReportStore.ts (removed food_cost & inventory_variance categories)
- ✅ Added calculateInventoryAdditions() function to plReportStore.ts
- ✅ Updated PLReportView.vue (removed Negative Batch Variance & Reconciliation Corrections sections)
- ✅ Updated NegativeInventoryReport.vue (removed Undo Reconciliation feature)
- ✅ Updated types.ts (cleaned InventoryAdjustments interface)
- ✅ Build successful after all cleanup

**Result:** Negative batches are now pure technical records. No account transactions created.

### Problem

Currently, when negative batches are created/reconciled, system creates account transactions in `acc_1`. This is WRONG because:

- Negative batches = technical records (inventory went negative)
- They are NOT real money movements
- They distort account balance

### Solution

- Keep negative batches as-is (technical records)
- **Remove** account transaction creation
- **Remove** "Loan" concept (redundant - batches already show deficit)
- Use NegativeInventoryReport **only for monitoring errors**

### Changes Needed

#### 1. Remove Account Transactions

**File:** `src/stores/preparation/reconciliationService.ts`

**Line 68:** DELETE call to `recordCorrectionIncome()`

```typescript
// DELETE THIS LINE:
await writeOffExpenseService.recordCorrectionIncome(...)

// KEEP THIS LINE (for monitoring):
await negativeBatchService.markAsReconciled(...)
```

**Search codebase for:**

- `recordNegativeBatchExpense(` - DELETE all calls
- `recordCorrectionIncome(` - DELETE all calls

**Keep:**

- Negative batch creation (technical record)
- `markAsReconciled()` (for monitoring)

---

#### 2. Add UI for Preparations with Deficit

**File:** `src/views/Preparation/components/DirectPreparationProductionDialog.vue`

**Add dialog when preparation has negative stock:**

```vue
<script setup lang="ts">
const showDeficitDialog = ref(false)
const deficitQuantity = ref(0)
const suggestedQuantity = ref(0)
const productionChoice = ref<'cover_deficit' | 'standard' | 'custom'>('cover_deficit')

// Watch on preparation selection
watch(selectedPreparationId, async newId => {
  if (!newId) return

  const prep = recipesStore.preparations.find(p => p.id === newId)
  if (!prep) return

  // Check for negative batches
  const negativeBatches = await negativeBatchService.getNegativeBatches({
    preparationId: prep.id,
    department: props.department,
    status: 'unreconciled'
  })

  if (negativeBatches.length > 0) {
    // Calculate total deficit
    deficitQuantity.value = negativeBatches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)

    // Suggest: standard output + deficit
    suggestedQuantity.value = prep.outputQuantity + deficitQuantity.value

    showDeficitDialog.value = true
  } else {
    quantity.value = prep.outputQuantity
  }
})

function applyQuantityChoice() {
  if (productionChoice.value === 'cover_deficit') {
    quantity.value = suggestedQuantity.value
  } else if (productionChoice.value === 'standard') {
    quantity.value = selectedPreparation.value?.outputQuantity || 0
  } else {
    quantity.value = customQuantity.value
  }
  showDeficitDialog.value = false
}
</script>

<template>
  <!-- NEW DIALOG -->
  <v-dialog v-model="showDeficitDialog" max-width="600">
    <v-card>
      <v-card-title>
        <v-icon color="warning">mdi-alert</v-icon>
        Negative Stock Detected
      </v-card-title>

      <v-card-text>
        <v-alert type="warning" variant="tonal" class="mb-4">
          This preparation has a deficit of
          <strong>{{ deficitQuantity }}{{ selectedPreparation?.outputUnit }}</strong>
        </v-alert>

        <p class="mb-4">How much do you want to produce?</p>

        <v-radio-group v-model="productionChoice">
          <v-radio value="cover_deficit" color="success">
            <template #label>
              <div>
                <div class="font-weight-bold">
                  Produce {{ suggestedQuantity }}{{ selectedPreparation?.outputUnit }}
                </div>
                <div class="text-caption">Covers deficit + standard batch</div>
              </div>
            </template>
          </v-radio>

          <v-radio value="standard" color="primary">
            <template #label>
              <div>
                <div class="font-weight-bold">
                  Produce {{ selectedPreparation?.outputQuantity
                  }}{{ selectedPreparation?.outputUnit }}
                </div>
                <div class="text-caption">Standard batch only, deficit remains</div>
              </div>
            </template>
          </v-radio>

          <v-radio value="custom">
            <template #label>Custom quantity</template>
          </v-radio>
        </v-radio-group>

        <v-text-field
          v-if="productionChoice === 'custom'"
          v-model.number="customQuantity"
          label="Custom Quantity"
          type="number"
          :suffix="selectedPreparation?.outputUnit"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="showDeficitDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="applyQuantityChoice">Continue</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

---

## 🎯 Goal 2: Two COGS Calculation Methods

### Method 1: Accrual Basis (Current)

**Formula:**

```
COGS = FIFO Write-offs (sales)
     + Spoilage/Loss Write-offs
     + Inventory Adjustments (physical count corrections)
```

**What we count:**

- Products actually used/sold (FIFO from batches)
- Products spoiled/lost
- **Inventory adjustments** (write-offs AND additions from physical count)

**Important:** Пересортица (inventory adjustments) включает:

- Write-offs (недостача при инвентаризации) - минус
- Additions (излишки при инвентаризации) - плюс

**Sources:**

```typescript
// 1. FIFO write-offs for sales
const salesWriteoffs = storageOperations.filter(
  op =>
    op.type === 'writeoff' &&
    ['sale', 'production_consumption'].includes(op.reason) &&
    op.createdAt in period
)
const fifoSales = salesWriteoffs.reduce((sum, op) => sum + op.totalCost, 0)

// 2. Spoilage/loss write-offs
const spoilageWriteoffs = storageOperations.filter(
  op =>
    op.type === 'writeoff' &&
    ['spoilage', 'loss', 'theft'].includes(op.reason) &&
    op.createdAt in period
)
const spoilage = spoilageWriteoffs.reduce((sum, op) => sum + op.totalCost, 0)

// 3. Inventory adjustments (write-offs from physical count)
const inventoryWriteoffs = storageOperations.filter(
  op => op.type === 'writeoff' && op.reason === 'inventory_adjustment' && op.createdAt in period
)
const inventoryWriteoffsValue = inventoryWriteoffs.reduce((sum, op) => sum + op.totalCost, 0)

// 4. Inventory additions (surplus from physical count)
const inventoryAdditions = storageReceipts.filter(
  r => r.reason === 'inventory_adjustment' && r.createdAt in period
)
const inventoryAdditionsValue = inventoryAdditions.reduce((sum, r) => sum + r.totalCost, 0)

const cogsAccrual = fifoSales + spoilage + inventoryWriteoffsValue - inventoryAdditionsValue
```

---

### Method 2: Cash Basis (New)

**Formula:**

```
COGS = Payments to Suppliers
     + Opening Inventory
     - Closing Inventory
```

**What we count:**

- Real cash paid to suppliers (from accountStore)
- Change in inventory value (delta)

**Sources:**

```typescript
// 1. Payments to suppliers
const purchases = accountStore.transactions.filter(
  t => t.type === 'expense' && t.expenseCategory?.category === 'product' && t.createdAt in period
)
const purchasesValue = purchases.reduce((sum, t) => sum + t.amount, 0)

// 2. Opening inventory (start of period)
const openingInventory = await inventoryValuationStore.getInventoryValue(period.start)

// 3. Closing inventory (end of period)
const closingInventory = await inventoryValuationStore.getInventoryValue(period.end)

const cogsCash = purchasesValue + openingInventory - closingInventory
```

---

### Implementation Plan

#### Phase 1: Update Types

**File:** `src/stores/analytics/types.ts`

```typescript
export type COGSMethod = 'accrual' | 'cash'

export interface COGSCalculation {
  method: COGSMethod

  // Accrual method details
  accrual?: {
    fifoSales: number // FIFO write-offs for sales
    spoilage: number // Spoilage/loss write-offs
    inventoryWriteoffs: number // Недостача при инвентаризации
    inventoryAdditions: number // Излишки при инвентаризации
    total: number // fifoSales + spoilage + writeoffs - additions
  }

  // Cash method details
  cash?: {
    purchases: number // Payments to suppliers
    openingInventory: number // Start of period
    closingInventory: number // End of period
    total: number // purchases + opening - closing
  }

  total: number // Final COGS value
}
```

---

#### Phase 2: Update plReportStore.ts

**File:** `src/stores/analytics/plReportStore.ts`

```typescript
async function calculateCOGS(
  params: { start: string; end: string },
  method: COGSMethod = 'accrual'
): Promise<COGSCalculation> {
  if (method === 'accrual') {
    // Method 1: Accrual Basis
    const storageOps = await storageStore.getOperations(params)
    const receipts = await storageStore.getReceipts(params)

    // FIFO sales
    const fifoSales = storageOps
      .filter(
        op => op.type === 'writeoff' && ['sale', 'production_consumption'].includes(op.reason)
      )
      .reduce((sum, op) => sum + op.totalCost, 0)

    // Spoilage
    const spoilage = storageOps
      .filter(op => op.type === 'writeoff' && ['spoilage', 'loss', 'theft'].includes(op.reason))
      .reduce((sum, op) => sum + op.totalCost, 0)

    // Inventory write-offs (недостача)
    const inventoryWriteoffs = storageOps
      .filter(op => op.type === 'writeoff' && op.reason === 'inventory_adjustment')
      .reduce((sum, op) => sum + op.totalCost, 0)

    // Inventory additions (излишки)
    const inventoryAdditions = receipts
      .filter(r => r.reason === 'inventory_adjustment')
      .reduce((sum, r) => sum + r.totalCost, 0)

    const total = fifoSales + spoilage + inventoryWriteoffs - inventoryAdditions

    return {
      method: 'accrual',
      accrual: {
        fifoSales,
        spoilage,
        inventoryWriteoffs,
        inventoryAdditions,
        total
      },
      total
    }
  } else {
    // Method 2: Cash Basis
    const accountStore = useAccountStore()
    const inventoryStore = useInventoryValuationStore()

    // Payments to suppliers
    const purchases = accountStore.transactions
      .filter(
        t =>
          t.type === 'expense' &&
          t.expenseCategory?.category === 'product' &&
          t.createdAt >= params.start &&
          t.createdAt <= params.end
      )
      .reduce((sum, t) => sum + t.amount, 0)

    // Opening/Closing inventory
    const openingInventory = await inventoryStore.getInventoryValue(params.start)
    const closingInventory = await inventoryStore.getInventoryValue(params.end)

    const total = purchases + openingInventory - closingInventory

    return {
      method: 'cash',
      cash: {
        purchases,
        openingInventory,
        closingInventory,
        total
      },
      total
    }
  }
}
```

---

#### Phase 3: Update PLReportView.vue

**File:** `src/views/backoffice/analytics/PLReportView.vue`

**Add toggle:**

```vue
<template>
  <div class="pl-report">
    <!-- Method selector -->
    <v-card class="mb-4">
      <v-card-title>COGS Calculation Method</v-card-title>
      <v-card-text>
        <v-radio-group v-model="cogsMethod" inline>
          <v-radio value="accrual" label="Accrual Basis (FIFO + Adjustments)" />
          <v-radio value="cash" label="Cash Basis (Payments + Inventory Δ)" />
        </v-radio-group>
      </v-card-text>
    </v-card>

    <!-- COGS Display -->
    <v-card>
      <v-card-title>Cost of Goods Sold (COGS)</v-card-title>
      <v-card-text>
        <v-table>
          <tbody>
            <!-- Accrual Method -->
            <template v-if="cogsMethod === 'accrual'">
              <tr>
                <td>FIFO Sales Write-offs</td>
                <td class="text-right">{{ formatIDR(report.cogs.accrual.fifoSales) }}</td>
              </tr>
              <tr>
                <td>Spoilage & Losses</td>
                <td class="text-right">{{ formatIDR(report.cogs.accrual.spoilage) }}</td>
              </tr>
              <tr>
                <td>Inventory Write-offs (недостача)</td>
                <td class="text-right">{{ formatIDR(report.cogs.accrual.inventoryWriteoffs) }}</td>
              </tr>
              <tr>
                <td>Inventory Additions (излишки)</td>
                <td class="text-right text-success">
                  -{{ formatIDR(report.cogs.accrual.inventoryAdditions) }}
                </td>
              </tr>
              <tr class="font-weight-bold">
                <td>Total COGS</td>
                <td class="text-right">{{ formatIDR(report.cogs.total) }}</td>
              </tr>
            </template>

            <!-- Cash Method -->
            <template v-else>
              <tr>
                <td>Opening Inventory</td>
                <td class="text-right">{{ formatIDR(report.cogs.cash.openingInventory) }}</td>
              </tr>
              <tr>
                <td>+ Purchases (Payments to Suppliers)</td>
                <td class="text-right">{{ formatIDR(report.cogs.cash.purchases) }}</td>
              </tr>
              <tr>
                <td>- Closing Inventory</td>
                <td class="text-right text-error">
                  -{{ formatIDR(report.cogs.cash.closingInventory) }}
                </td>
              </tr>
              <tr class="font-weight-bold">
                <td>Total COGS</td>
                <td class="text-right">{{ formatIDR(report.cogs.total) }}</td>
              </tr>
            </template>
          </tbody>
        </v-table>

        <!-- Info about difference -->
        <v-alert v-if="showMethodDifference" type="info" variant="tonal" class="mt-4">
          <strong>Difference between methods:</strong>
          {{ formatIDR(methodDifference) }}
          <br />
          This may indicate accounts payable, goods in transit, or inventory discrepancies.
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
const cogsMethod = ref<COGSMethod>('accrual')

const methodDifference = computed(() => {
  if (!report.value) return 0
  const accrualTotal = report.value.cogs.accrual?.total || 0
  const cashTotal = report.value.cogs.cash?.total || 0
  return Math.abs(accrualTotal - cashTotal)
})

const showMethodDifference = computed(() => {
  return report.value?.cogs.accrual && report.value?.cogs.cash
})

// Recalculate when method changes
watch(cogsMethod, async newMethod => {
  await regenerateReport(newMethod)
})
</script>
```

---

## 📋 Files to Modify

### Goal 1 (Negative Batches):

1. `src/stores/preparation/reconciliationService.ts` - remove recordCorrectionIncome
2. Search: `recordNegativeBatchExpense`, `recordCorrectionIncome` - remove all calls
3. `src/views/Preparation/components/DirectPreparationProductionDialog.vue` - add deficit dialog

### Goal 2 (Two COGS Methods):

1. `src/stores/analytics/types.ts` - add COGSMethod, COGSCalculation types
2. `src/stores/analytics/plReportStore.ts` - add calculateCOGS with both methods
3. `src/views/backoffice/analytics/PLReportView.vue` - add toggle and display

---

## 🧹 Goal 1.5: Cleanup Artifacts from Old Implementation

### Priority: HIGH (Must be done after Goal 1 core changes)

After removing account transactions from negative batches, we need to clean up all remaining artifacts:

---

#### Task 1: Remove Orphaned Functions from writeOffExpenseService.ts

**File:** `src/stores/storage/writeOffExpenseService.ts`

**Delete these functions (NO LONGER USED):**

```typescript
// Lines 27-86: DELETE
async recordNegativeBatchExpense(...)

// Lines 95-133: DELETE
async recordCorrectionIncome(...)

// Lines 191-209: DELETE
async getTotalNegativeBatchExpenses(...)

// Lines 219-236: DELETE
async getTotalReconciliationIncome(...)

// Lines 246-271: DELETE (if removing Undo feature)
async deleteReconciliationIncome(...)
```

**Reason:** These functions create account transactions for negative batches, which we no longer do.

---

#### Task 2: Update plReportStore.ts - Remove Obsolete Categories

**File:** `src/stores/analytics/plReportStore.ts`

**Changes:**

```typescript
// Line 103-104: REMOVE obsolete categories
const inventoryAdjustmentCategories = [
  // 'food_cost',           // ❌ REMOVE - negative batches don't create transactions
  // 'inventory_variance',  // ❌ REMOVE - reconciliation doesn't create transactions
  'inventory_adjustment' // ✅ KEEP - manual adjustments only
]

// Lines 149-151: REMOVE negativeBatch calculation
// This will always be 0 since no transactions are created
const negativeBatch = inventoryTransactions
  .filter(t => t.expenseCategory?.category === 'food_cost')
  .reduce((sum, t) => sum + Math.abs(t.amount), 0)
// ❌ DELETE THIS CALCULATION

// Lines 157-159: REMOVE reconciliation calculation
// This will always be 0 since no transactions are created
const reconciliation = inventoryTransactions
  .filter(t => t.expenseCategory?.category === 'inventory_variance')
  .reduce((sum, t) => sum + t.amount, 0)
// ❌ DELETE THIS CALCULATION

// Update return object:
const inventoryAdjustments = {
  losses: inventoryLosses,
  gains: inventoryGains,
  total: totalAdjustments,
  byCategory: {
    spoilage, // ✅ From manual write-offs
    shortage, // ✅ From manual write-offs with reason='inventory_adjustment'
    surplus // ✅ From manual additions with reason='inventory_adjustment'
    // negativeBatch,    // ❌ REMOVE
    // reconciliation    // ❌ REMOVE
  }
}
```

**NEW FUNCTION TO ADD:**

```typescript
/**
 * Calculate inventory additions (излишки) from surplus receipts
 * Used in Accrual COGS calculation
 */
async calculateInventoryAdditions(startDate: string, endDate: string): Promise<number> {
  const { useStorageStore } = await import('@/stores/storage')
  const storageStore = useStorageStore()

  // Get all receipts with reason='inventory_adjustment' (surplus from physical count)
  const receipts = storageStore.receipts.filter(r =>
    r.reason === 'inventory_adjustment' &&
    r.receiptDate >= startDate &&
    r.receiptDate <= endDate
  )

  return receipts.reduce((sum, r) => sum + r.totalCost, 0)
}
```

---

#### Task 3: Update PLReportView.vue - Remove Dead UI Sections

**File:** `src/views/backoffice/analytics/PLReportView.vue`

**DELETE these sections (they always show 0):**

```vue
<!-- Lines 265-288: DELETE "Negative Batch Variance" section -->
<v-card>
  <v-card-title>Negative Batch Variance</v-card-title>
  <v-card-text>
    {{ formatCurrency(report.inventoryAdjustments.byCategory.negativeBatch) }}
  </v-card-text>
</v-card>
<!-- ❌ DELETE THIS ENTIRE SECTION -->

<!-- Lines 310-336: DELETE "Reconciliation Corrections" section -->
<v-card>
  <v-card-title>Reconciliation Corrections</v-card-title>
  <v-card-text>
    {{ formatCurrency(report.inventoryAdjustments.byCategory.reconciliation) }}
  </v-card-text>
</v-card>
<!-- ❌ DELETE THIS ENTIRE SECTION -->
```

**KEEP these sections:**

- ✅ Losses (spoilage, shortage from manual write-offs)
- ✅ Gains (surplus from manual additions)
- ✅ Warning alert for negative inventory (lines 355-374) - links to NegativeInventoryReport

---

#### Task 4: Update NegativeInventoryReport.vue

**File:** `src/views/backoffice/analytics/NegativeInventoryReport.vue`

**Purpose:** Show ALL negative batches (reconciled + unreconciled) for history, but REMOVE Undo feature

**DELETE Undo Reconciliation Feature:**

```vue
<!-- Lines 205-215: DELETE Undo button from table -->
<v-btn @click="handleUndoReconciliation(item)">Undo</v-btn>
<!-- ❌ DELETE -->

<!-- Lines 356-401: DELETE Undo Reconciliation Dialog -->
<v-dialog v-model="showUndoDialog">
  <!-- ... entire undo dialog ... -->
</v-dialog>
<!-- ❌ DELETE ENTIRE DIALOG -->
```

```typescript
// Lines 412: REMOVE import
import { writeOffExpenseService } from '@/stores/storage/writeOffExpenseService'
// ❌ DELETE THIS IMPORT

// Lines 430-433: REMOVE undo state
const showUndoDialog = ref(false)
const selectedUndoItem = ref<any>(null)
// ❌ DELETE THESE

// Lines 520-560: REMOVE undo logic
async function handleUndoReconciliation(item: any) {
  // ... undo implementation ...
  await writeOffExpenseService.deleteReconciliationIncome(...)
}
// ❌ DELETE ENTIRE FUNCTION
```

**UPDATE description:**

```vue
<v-card-text>
  <!-- Old description -->
  This report shows negative inventory batches that occurred when stock was used while out of stock.

  <!-- New description -->
  This report shows ALL negative inventory batches (current and historical) for monitoring and audit purposes.
  Negative batches are technical records that do NOT affect account balances.
</v-card-text>
```

**KEEP:**

- ✅ Show all batches (reconciled + unreconciled)
- ✅ Status filter (can filter by reconciled/unreconciled)
- ✅ Export functionality
- ✅ All analytics and charts

---

#### Task 5: Update Types (if needed)

**File:** `src/stores/analytics/types.ts`

**Check if these fields exist in type definitions:**

```typescript
export interface InventoryAdjustments {
  losses: number
  gains: number
  total: number
  byCategory: {
    spoilage: number
    shortage: number
    surplus: number
    negativeBatch: number // ❌ REMOVE if exists
    reconciliation: number // ❌ REMOVE if exists
  }
}
```

**Update to:**

```typescript
export interface InventoryAdjustments {
  losses: number
  gains: number
  total: number
  byCategory: {
    spoilage: number // Manual write-offs (reason: spoilage/loss/theft)
    shortage: number // Manual write-offs (reason: inventory_adjustment)
    surplus: number // Manual additions (reason: inventory_adjustment)
  }
}
```

---

## ✅ Success Criteria

After implementation:

**Goal 1:**

- ✅ accountStore (acc_1) shows only real cash movements
- ✅ Negative batches are technical records (no account transactions)
- ✅ NegativeInventoryReport for monitoring only
- ✅ Preparations with deficit show quantity adjustment dialog

**Goal 2:**

- ✅ P&L has toggle between Accrual and Cash methods
- ✅ Accrual method includes FIFO + spoilage + inventory adjustments (write-offs AND additions)
- ✅ Cash method shows payments + inventory delta
- ✅ Shows difference between methods

---

**Last Updated:** 2025-12-02
**Status:** Goal 1 & 1.5 Complete, Goal 2 In Progress
**Next Steps:**

1. ✅ Remove account transactions for negative batches
2. ✅ Add deficit dialog for preparations
3. 🔄 Implement two COGS calculation methods
4. 🆕 Fix P&L architecture (Sprint 4)

---

---

## 📦 SPRINT 4: Fix P&L Architecture - Separate Data Sources

**Priority:** CRITICAL
**Complexity:** HIGH
**Risk Level:** HIGH (major refactoring of P&L logic)
**Estimated Effort:** 16-20 hours

### 🎯 Overview

**Problem:** P&L Report currently uses `accountStore.transactions` for EVERYTHING, including inventory write-offs and adjustments. This is WRONG because:

1. **Write-offs are NOT money movements** - they are inventory operations
2. **Inventory adjustments are NOT money movements** - they are corrections
3. **accountStore should ONLY track real cash** - payments, sales, expenses
4. **Double-counting issue** - money counted twice (at purchase + at write-off)

**Solution:** Create dedicated `plDataStore` that aggregates data from correct sources:

- **Revenue** → from `posStore` (sales transactions)
- **COGS** → from `storageStore` + `preparationStore` (operations, NOT transactions)
- **OPEX** → from `accountStore` (real expenses only)

---

### 🏗️ Architecture Change

#### Current (WRONG):

```
P&L Report
  ├─ Revenue: accountStore.transactions (income)
  ├─ COGS: accountStore.transactions (inventory_adjustment) ❌
  └─ OPEX: accountStore.transactions (other expenses)
```

**Problem:** Write-offs create transactions in accountStore (migrations 027-029), making inventory operations look like money movements.

#### New (CORRECT):

```
P&L Report → plDataStore
  ├─ Revenue: posStore.getSalesRevenue()
  ├─ COGS: storageStore + preparationStore operations ✅
  │   ├─ FIFO write-offs (storage_operations)
  │   ├─ Spoilage (storage_operations)
  │   ├─ Inventory adjustments (storage_operations + preparation_operations)
  │   └─ Preparation write-offs (preparation_operations)
  └─ OPEX: accountStore.transactions (real expenses only)
      ├─ Supplier payments (when paying, NOT when using)
      ├─ Rent, utilities, salaries
      └─ Other operational expenses
```

---

### 📋 Implementation Plan

#### Phase 1: Create plDataStore

**File:** `src/stores/analytics/plDataStore.ts`

```typescript
import { defineStore } from 'pinia'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useAccountStore } from '@/stores/account'
import { usePosStore } from '@/stores/pos'

interface DateRange {
  start: string
  end: string
}

interface COGSData {
  // Products (storage)
  productFifoWriteoffs: number // Sales write-offs
  productSpoilage: number // Spoilage/expired
  productShortage: number // Inventory adjustment (недостача)
  productSurplus: number // Inventory adjustment (излишки)

  // Preparations
  preparationFifoWriteoffs: number // Sales write-offs
  preparationSpoilage: number // Spoilage/expired
  preparationShortage: number // Inventory adjustment (недостача)
  preparationSurplus: number // Inventory adjustment (излишки)

  total: number
}

interface OPEXData {
  supplierPayments: number // Real cash to suppliers
  rent: number
  utilities: number
  salaries: number
  marketing: number
  other: number
  total: number
}

interface RevenueData {
  totalSales: number
  byCurrency: Record<string, number>
  byPaymentMethod: Record<string, number>
}

export const usePlDataStore = defineStore('plData', {
  state: () => ({
    initialized: false
  }),

  actions: {
    /**
     * Get COGS data from storage/preparation operations
     * Does NOT use accountStore transactions!
     */
    async getCOGS(range: DateRange): Promise<COGSData> {
      const storageStore = useStorageStore()
      const preparationStore = usePreparationStore()

      // 1. Product FIFO write-offs (sales)
      const productSalesOps = await storageStore.getOperations({
        type: 'write_off',
        reasons: ['sale', 'production_consumption'],
        dateRange: range
      })
      const productFifoWriteoffs = productSalesOps.reduce((sum, op) => sum + op.total_value, 0)

      // 2. Product spoilage
      const productSpoilageOps = await storageStore.getOperations({
        type: 'write_off',
        reasons: ['spoilage', 'expired', 'loss', 'theft'],
        dateRange: range
      })
      const productSpoilage = productSpoilageOps.reduce((sum, op) => sum + op.total_value, 0)

      // 3. Product inventory adjustments (shortage)
      const productShortageOps = await storageStore.getOperations({
        type: 'write_off',
        reasons: ['inventory_adjustment'],
        dateRange: range
      })
      const productShortage = productShortageOps.reduce((sum, op) => sum + op.total_value, 0)

      // 4. Product inventory adjustments (surplus)
      const productSurplusOps = await storageStore.getOperations({
        type: 'correction',
        correctionReason: 'inventory_adjustment',
        dateRange: range
      })
      const productSurplus = productSurplusOps.reduce((sum, op) => sum + op.total_value, 0)

      // 5-8. Same for preparations
      const preparationFifoWriteoffs = await this._getPreparationWriteoffs(range, [
        'sale',
        'production'
      ])
      const preparationSpoilage = await this._getPreparationWriteoffs(range, [
        'spoilage',
        'expired'
      ])
      const preparationShortage = await this._getPreparationWriteoffs(range, [
        'inventory_adjustment'
      ])
      const preparationSurplus = await this._getPreparationCorrections(range)

      const total =
        productFifoWriteoffs +
        productSpoilage +
        productShortage -
        productSurplus +
        preparationFifoWriteoffs +
        preparationSpoilage +
        preparationShortage -
        preparationSurplus

      return {
        productFifoWriteoffs,
        productSpoilage,
        productShortage,
        productSurplus,
        preparationFifoWriteoffs,
        preparationSpoilage,
        preparationShortage,
        preparationSurplus,
        total
      }
    },

    /**
     * Get OPEX from accountStore
     * ONLY real expense transactions (not inventory operations)
     */
    async getOPEX(range: DateRange): Promise<OPEXData> {
      const accountStore = useAccountStore()

      const expenses = accountStore.transactions.filter(
        t =>
          t.type === 'expense' &&
          t.created_at >= range.start &&
          t.created_at <= range.end &&
          // Exclude inventory adjustments (they are in COGS now)
          t.expense_category?.category !== 'inventory_adjustment'
      )

      const supplierPayments = expenses
        .filter(t => t.expense_category?.category === 'product')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const rent = expenses
        .filter(t => t.expense_category?.category === 'rent')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      // ... other categories

      return {
        supplierPayments,
        rent,
        utilities: 0,
        salaries: 0,
        marketing: 0,
        other: 0,
        total: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      }
    },

    /**
     * Get revenue from POS
     */
    async getRevenue(range: DateRange): Promise<RevenueData> {
      const posStore = usePosStore()

      // Get completed orders in range
      const orders = await posStore.getCompletedOrders(range)

      const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0)

      return {
        totalSales,
        byCurrency: {}, // TODO: implement
        byPaymentMethod: {} // TODO: implement
      }
    },

    async _getPreparationWriteoffs(range: DateRange, reasons: string[]): Promise<number> {
      const preparationStore = usePreparationStore()
      const ops = await preparationStore.getOperations({
        type: 'write_off',
        reasons,
        dateRange: range
      })
      return ops.reduce((sum, op) => sum + op.total_value, 0)
    },

    async _getPreparationCorrections(range: DateRange): Promise<number> {
      const preparationStore = usePreparationStore()
      const ops = await preparationStore.getOperations({
        type: 'correction',
        correctionReason: 'inventory_adjustment',
        dateRange: range
      })
      return ops.reduce((sum, op) => sum + op.total_value, 0)
    }
  }
})
```

---

#### Phase 2: Update plReportStore to use plDataStore

**File:** `src/stores/analytics/plReportStore.ts`

**Changes:**

```typescript
// OLD (WRONG):
const inventoryTransactions = accountStore.transactions.filter(
  t => t.expenseCategory?.category === 'inventory_adjustment'
)
const cogs = inventoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

// NEW (CORRECT):
const plDataStore = usePlDataStore()
const cogsData = await plDataStore.getCOGS({ start, end })
const cogs = cogsData.total

// OLD (WRONG):
const opex = accountStore.transactions
  .filter(t => t.type === 'expense')
  .reduce((sum, t) => sum + Math.abs(t.amount), 0)

// NEW (CORRECT):
const opexData = await plDataStore.getOPEX({ start, end })
const opex = opexData.total
```

---

#### Phase 3: Add Storage/Preparation Store Methods

**File:** `src/stores/storage/storageStore.ts`

```typescript
/**
 * Get storage operations filtered by criteria
 * Used by plDataStore for COGS calculation
 */
async getOperations(filter: {
  type?: 'write_off' | 'correction'
  reasons?: string[]
  correctionReason?: string
  dateRange: { start: string; end: string }
}): Promise<StorageOperation[]> {
  // Query from Supabase or localStorage
  let query = supabase
    .from('storage_operations')
    .select('*')
    .gte('operation_date', filter.dateRange.start)
    .lte('operation_date', filter.dateRange.end)

  if (filter.type) {
    query = query.eq('operation_type', filter.type)
  }

  if (filter.reasons) {
    query = query.in('write_off_details->>reason', filter.reasons)
  }

  if (filter.correctionReason) {
    query = query.eq('correction_details->>reason', filter.correctionReason)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}
```

**File:** `src/stores/preparation/preparationStore.ts`

```typescript
/**
 * Get preparation operations filtered by criteria
 * Used by plDataStore for COGS calculation
 */
async getOperations(filter: {
  type?: 'write_off' | 'correction'
  reasons?: string[]
  correctionReason?: string
  dateRange: { start: string; end: string }
}): Promise<PreparationOperation[]> {
  // Similar to storageStore.getOperations
  // Query from preparation_operations table
}
```

---

#### Phase 4: Rollback Migrations 027-029 (Optional but Recommended)

**Option A: Create rollback migration**

**File:** `src/supabase/migrations/031_rollback_writeoff_transactions.sql`

```sql
-- Migration: 031_rollback_writeoff_transactions
-- Description: Remove transactions created by migrations 027-029
-- Date: 2025-12-02
-- Author: Claude Code

-- CONTEXT:
-- Migrations 027-029 incorrectly created account transactions for write-offs.
-- Write-offs are inventory operations, NOT money movements.
-- This migration removes those transactions.

-- PRE-MIGRATION VALIDATION
DO $$
DECLARE
  backfill_count INTEGER;
  opex_count INTEGER;
  production_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfill_count
  FROM transactions
  WHERE performed_by->>'id' = 'migration_backfill';

  SELECT COUNT(*) INTO opex_count
  FROM transactions
  WHERE performed_by->>'id' = 'migration_opex_backfill';

  SELECT COUNT(*) INTO production_count
  FROM transactions
  WHERE performed_by->>'id' = 'production_migration';

  RAISE NOTICE '📊 Transactions to remove:';
  RAISE NOTICE '  From migration 027: %', backfill_count;
  RAISE NOTICE '  From migration 028: %', opex_count;
  RAISE NOTICE '  From migration 029: %', production_count;
  RAISE NOTICE '  Total: %', backfill_count + opex_count + production_count;
END $$;

-- ACTUAL CHANGES
-- Delete all transactions created by migrations 027-029
DELETE FROM transactions
WHERE performed_by->>'id' IN (
  'migration_backfill',
  'migration_opex_backfill',
  'production_migration'
);

-- POST-MIGRATION VALIDATION
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM transactions
  WHERE performed_by->>'id' IN (
    'migration_backfill',
    'migration_opex_backfill',
    'production_migration'
  );

  IF remaining_count > 0 THEN
    RAISE WARNING '⚠️  Still have % transactions!', remaining_count;
  ELSE
    RAISE NOTICE '✅ All migration transactions removed';
  END IF;
END $$;
```

**Option B: Keep migrations but stop using them**

- Don't rollback, just ignore `inventory_adjustment` transactions in P&L
- Update `plReportStore` to use `plDataStore` instead

---

### 📋 Implementation Steps

1. **Create `plDataStore`** (Phase 1)

   - New file: `src/stores/analytics/plDataStore.ts`
   - Add methods: `getCOGS()`, `getOPEX()`, `getRevenue()`

2. **Add query methods to Storage/Preparation stores** (Phase 3)

   - `storageStore.getOperations(filter)`
   - `preparationStore.getOperations(filter)`

3. **Update `plReportStore`** (Phase 2)

   - Replace `accountStore` queries with `plDataStore` calls
   - Remove `inventory_adjustment` category from OPEX

4. **Test on DEV database**

   - Compare old vs new P&L values
   - Verify COGS matches storage operations
   - Verify OPEX excludes inventory adjustments

5. **(Optional) Rollback migrations** (Phase 4)

   - Create migration 031
   - Apply to DEV first
   - Verify P&L still works

6. **Deploy to production**

---

### ✅ Success Criteria

- ✅ `plDataStore` created and working
- ✅ COGS calculated from `storage_operations` + `preparation_operations`
- ✅ OPEX calculated from `accountStore` (real expenses only)
- ✅ Revenue calculated from POS orders
- ✅ P&L Report shows correct values
- ✅ No double-counting of inventory costs
- ✅ `accountStore` only contains real money movements

---

### 🎯 Key Benefits

1. **Correct accounting** - money counted once (at payment time)
2. **Clear separation** - cash vs inventory operations
3. **Easier debugging** - each store responsible for its data
4. **Accrual vs Cash ready** - foundation for both methods
5. **Audit trail** - clear where each number comes from

---

**Last Updated:** 2025-12-02
**Status:** Sprint 4 - Ready to start
**Assigned to:** Claude & Developer
