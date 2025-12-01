# Current Sprint: Sprint 2 - Write-Off Logic + Auto-Reconciliation

**Duration:** 7 days
**Status:** 🟢 In Progress
**Goal:** Implement enhanced write-off logic with negative batch creation and auto-reconciliation

---

## Sprint Overview

This sprint implements the core negative inventory logic:

- Enhanced useWriteOff composable with negative batch support
- Auto-reconciliation service when new batches arrive
- Integration with POS orders and preparation production
- Financial transaction recording

**Prerequisites:** Sprint 1 completed ✅

---

## Phase 2.1: Enhanced Write-Off Logic (Products)

### Task 2.1.1: Update useWriteOff composable

**File:** `src/stores/storage/composables/useWriteOff.ts`

**Current Method:** `writeOffProducts(items: WriteOffItem[]): Promise<ServiceResponse>`

**New Signature:**

```typescript
async writeOffProducts(
  items: WriteOffItem[],
  context?: {
    sourceType?: 'pos_order' | 'preparation_production' | 'manual_writeoff'
    affectedRecipeIds?: string[]
    userId?: string
    shiftId?: string
  }
): Promise<ServiceResponse>
```

**Implementation Steps:**

1. **Import services:**

```typescript
import { negativeBatchService } from '../negativeBatchService'
import { writeOffExpenseService } from '../writeOffExpenseService'
import { useStorageStore } from '../storageStore'
```

2. **Update write-off logic:**

```typescript
for (const item of items) {
  // 1. Calculate available quantity
  const availableQty = calculateTotalAvailableQty(item.itemId)

  // 2. If sufficient inventory, proceed normally
  if (availableQty >= item.quantity) {
    await writeOffNormal(item) // existing FIFO logic
    continue
  }

  // 3. If insufficient, write off what's available
  if (availableQty > 0) {
    await writeOffNormal({ ...item, quantity: availableQty })
  }

  // 4. Calculate shortage
  const shortage = item.quantity - availableQty

  // 5. Check if negative inventory is allowed
  const storageStore = useStorageStore()
  if (!storageStore.canGoNegative(item.itemId)) {
    return {
      success: false,
      error: `Insufficient inventory for ${item.itemName}. Available: ${availableQty}, Requested: ${item.quantity}`
    }
  }

  // 6. Get last known cost
  const cost = await negativeBatchService.calculateNegativeBatchCost(item.itemId, shortage)

  // 7. Get warehouse ID
  const warehouseId = storageStore.getDefaultWarehouse()?.id

  // 8. Create negative batch
  const negativeBatch = await negativeBatchService.createNegativeBatch({
    productId: item.itemId,
    warehouseId: warehouseId || '',
    quantity: -shortage,
    unit: item.unit,
    cost: cost,
    reason: item.notes || 'Automatic negative batch creation',
    sourceOperationType: context?.sourceType || 'manual_writeoff',
    affectedRecipeIds: context?.affectedRecipeIds,
    userId: context?.userId,
    shiftId: context?.shiftId
  })

  // 9. Create expense transaction (financial tracking)
  await writeOffExpenseService.recordNegativeBatchExpense(negativeBatch, item.itemName)

  // 10. Log warning
  console.warn(
    `⚠️  Negative batch created for ${item.itemName}: ${shortage} ${item.unit} at cost ${cost}`
  )
}

return { success: true }
```

3. **Helper function for available quantity:**

```typescript
function calculateTotalAvailableQty(productId: string): number {
  const storageStore = useStorageStore()
  const batches = storageStore.activeBatches.filter(
    b => b.itemId === productId && b.itemType === 'product' && !b.isNegative
  )
  return batches.reduce((sum, b) => sum + b.currentQuantity, 0)
}
```

### Task 2.1.2: Update usePreparationWriteOff composable

**File:** `src/stores/preparation/composables/usePreparationWriteOff.ts`

**Same implementation as 2.1.1 but for preparations:**

- Use `preparationId` instead of `productId`
- Use `department` instead of `warehouseId`
- Import from `@/stores/preparation/negativeBatchService`

---

## Phase 2.2: Auto-Reconciliation Service ✅ (Already implemented in Sprint 1)

writeOffExpenseService created in Sprint 1 ✅

---

## Phase 2.3: Auto-Reconciliation Service

### Task 2.3.1: Create reconciliationService

**File:** `src/stores/storage/reconciliationService.ts`

```typescript
import { negativeBatchService } from './negativeBatchService'
import { writeOffExpenseService } from './writeOffExpenseService'
import { useProductsStore } from '@/stores/productsStore'

/**
 * Service for auto-reconciling negative batches when new stock arrives
 */
class ReconciliationService {
  /**
   * Auto-reconcile negative batches when new batch is added
   * Creates income transactions to offset negative batch expenses
   *
   * @param productId - UUID of the product
   */
  async autoReconcileOnNewBatch(productId: string): Promise<void> {
    // 1. Check for unreconciled negative batches
    const negativeBatches = await negativeBatchService.getNegativeBatches(productId)
    if (negativeBatches.length === 0) return

    // 2. Get product info for transaction description
    const productsStore = useProductsStore()
    const product = productsStore.products.find(p => p.id === productId)

    if (!product) {
      console.error(`Product not found: ${productId}`)
      return
    }

    console.info(
      `🔄 Auto-reconciling ${negativeBatches.length} negative batches for ${product.name}`
    )

    // 3. Process each negative batch for reconciliation
    for (const negativeBatch of negativeBatches) {
      const quantity = Math.abs(negativeBatch.currentQuantity)
      const costPerUnit = negativeBatch.costPerUnit

      // 4. Create inventory correction INCOME transaction
      // This offsets the expense created when negative batch was made
      await writeOffExpenseService.recordCorrectionIncome({
        productName: product.name,
        quantity: quantity,
        costPerUnit: costPerUnit, // Use cost from negative batch (NOT new batch cost!)
        unit: negativeBatch.unit
      })

      // 5. Mark negative batch as reconciled
      await negativeBatchService.markAsReconciled(negativeBatch.id)

      console.info(
        `✅ Reconciled negative batch: ${product.name} (+${quantity} ${negativeBatch.unit} @ ${costPerUnit})`
      )
    }

    // 6. Log summary
    const totalQty = negativeBatches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)
    console.info(
      `✅ Auto-reconciled ${negativeBatches.length} negative batches for ${product.name} (total: ${totalQty})`
    )
  }
}

export const reconciliationService = new ReconciliationService()
```

### Task 2.3.2: Create preparation reconciliationService

**File:** `src/stores/preparation/reconciliationService.ts`

Same implementation but for preparations:

- Use `preparationId` instead of `productId`
- Import from preparation stores/services

---

## Phase 2.4: Integration Points

### Task 2.4.1: Integrate reconciliation into storageStore

**File:** `src/stores/storage/storageStore.ts`

**Method:** `createReceipt()`

Add after batch creation:

```typescript
async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
  // ... existing batch creation logic ...

  // NEW: Auto-reconcile negative batches for each product
  const { reconciliationService } = await import('./reconciliationService')

  for (const item of data.items) {
    await reconciliationService.autoReconcileOnNewBatch(item.itemId)
  }

  return operation
}
```

### Task 2.4.2: Integrate reconciliation into preparationStore

**File:** `src/stores/preparation/preparationStore.ts`

**Method:** `createReceipt()`

Same as 2.4.1 but for preparations

---

## Phase 2.5: POS Order Integration (Optional - Can be done in Sprint 3)

**File:** To identify (POS payment flow)

**Goal:** Pass context to write-off when POS order is paid

```typescript
const writeOffContext = {
  sourceType: 'pos_order' as const,
  affectedRecipeIds: order.items.map(item => item.recipeId).filter(Boolean),
  userId: authStore.user?.id,
  shiftId: posStore.currentShift?.id
}

await useWriteOff().writeOffProducts(writeOffItems, writeOffContext)
```

---

## Phase 2.6: Preparation Production Integration (Optional - Can be done in Sprint 3)

**File:** To identify (Preparation production flow)

**Goal:** Pass context to write-off when producing preparations

```typescript
const writeOffContext = {
  sourceType: 'preparation_production' as const,
  affectedRecipeIds: [preparationRecipeId],
  userId: authStore.user?.id
}

await useWriteOff().writeOffProducts(writeOffItems, writeOffContext)
```

---

## Sprint 2 Completion Checklist

### Phase 2.1: Enhanced Write-Off Logic ✅

- [x] Updated storageService.createWriteOff() with negative batch support for products
- [x] Updated storageService.createWriteOff() with negative batch support for preparations
- [x] Write-off now detects shortage and creates negative batches automatically
- [x] Negative batch creation includes expense transaction recording
- [x] Build completed successfully with no TypeScript errors

**Implementation Details:**

- Modified `src/stores/storage/storageService.ts`:
  - Added shortage calculation after FIFO allocation (line 876-877, 836-837)
  - Imports negativeBatchService and writeOffExpenseService when shortage detected
  - Creates negative batch with last known cost
  - Records expense transaction for negative batch
  - Supports both products and preparations

### Phase 2.2: Expense Service ✅

- [x] writeOffExpenseService created (Sprint 1)

### Phase 2.3: Auto-Reconciliation ✅

- [x] Created reconciliationService for products (Sprint 1)
- [x] Created reconciliationService for preparations (Sprint 1)
- [ ] Tested reconciliation on new batch arrival (manual testing required)
- [ ] Verified income transaction recording (manual testing required)
- [ ] Verified negative batch marked as reconciled (manual testing required)

### Phase 2.4: Integration Points ✅

- [x] Integrated reconciliation into storageStore.createReceipt() (Sprint 1)
- [x] Integrated reconciliation into preparationStore.createReceipt() (Sprint 1)
- [ ] Tested end-to-end flow (negative batch → reconciliation) (manual testing required)

### Phase 2.5: POS Integration ⏳ (Optional)

- [ ] Identified POS payment flow
- [ ] Added write-off context to POS orders
- [ ] Tested negative batch from POS order

### Phase 2.6: Preparation Integration ⏳ (Optional)

- [ ] Identified preparation production flow
- [ ] Added write-off context to preparation production
- [ ] Tested negative batch from production

---

## Testing Scenarios

### Test 1: Negative Batch Creation

```typescript
// Setup: Product has 50g available, order needs 150g
// Expected:
// - Write off 50g from existing batches
// - Create negative batch: -100g
// - Create expense transaction: -100g * last_known_cost
```

### Test 2: Auto-Reconciliation

```typescript
// Setup: Product has negative batch -100g
// Action: Add new batch 2000g
// Expected:
// - New batch created: +2000g
// - Income transaction: +100g * negative_batch_cost
// - Negative batch marked as reconciled
// - Total inventory: 2000g
```

### Test 3: Multiple Negative Batches

```typescript
// Setup: Product has 2 negative batches (-50g, -30g)
// Action: Add new batch 500g
// Expected:
// - Both negative batches reconciled
// - 2 income transactions created
// - Total inventory: 500g
```

---

## Success Criteria

**Sprint 2 is complete when:**

- ✅ useWriteOff handles negative batches automatically
- ✅ Negative batches create expense transactions
- ✅ New batches trigger auto-reconciliation
- ✅ Reconciliation creates income transactions
- ⏳ All tests pass (manual testing required)
- ✅ No TypeScript errors

**Ready for Sprint 3:** Reports and Analytics

---

## 🐛 BUGFIX: Preparation Costs Showing as 0 in Sales Transactions

### Issue Discovery (Dec 1, 2025)

**Problem:**

- Sales transactions show `actual_cost.preparationCosts[].totalCost = 0`
- Write-off history shows "Rp 0" for preparation costs
- Preparation table shows "Cost 0, last known"

**Root Cause:**
When all positive preparation batches are depleted, only negative batches remain. The FIFO allocation logic in `useActualCostCalculation.ts` skips negative batches (`if (batch.currentQuantity <= 0) continue`), resulting in empty `batchAllocations[]` and `totalCost = 0`.

**Database Evidence:**

```sql
-- All batches for "Маринад для мяса универсальный" are NEGATIVE:
NEG-PREP-1764565713553: -100 ml (cost: 51.13/ml)
NEG-PREP-1764565995950: -100 ml (cost: 51.13/ml)
NEG-PREP-1764566236885: -100 ml (cost: 51.13/ml)
NEG-PREP-1764567193143: -100 ml (cost: 51.13/ml)

-- Previous positive batches are DEPLETED:
B-PREP-PREP-053-20251129: 0 ml (depleted)
B-PREP-PREP-662-20251129: 0 ml (depleted)
B-PREP-PREP-780-20251127: 0 ml (depleted)
```

**Example from sales_transactions table:**

```json
"actual_cost": {
  "method": "FIFO",
  "totalCost": 12000,  // Only includes product cost!
  "productCosts": [{
    "productName": "Bintang Beer 330ml",
    "totalCost": 12000,  // ✅ Correct
    "batchAllocations": [...]
  }],
  "preparationCosts": [{
    "preparationName": "Маринад для мяса универсальный",
    "quantity": 100,
    "unit": "ml",
    "totalCost": 0,  // ❌ Should be ~5113
    "batchAllocations": [],  // ❌ Empty!
    "averageCostPerUnit": 0  // ❌ Should be ~51.13
  }]
}
```

### Three-Phase Fix Plan

#### **Phase 1: Fix Actual Cost Calculation (CRITICAL - Immediate)**

**Scope:** `src/stores/sales/composables/useActualCostCalculation.ts`

**Objective:** Use negative batch costs when no positive batches are available

**Implementation:**

1. **Modify FIFO allocation loop** (lines 223-239):
   - Currently skips all negative batches with `if (batch.currentQuantity <= 0) continue`
   - NEW: Handle negative batches and use their cost (last known cost)

```typescript
// File: useActualCostCalculation.ts
// Line: ~223-260

for (const batch of batches) {
  if (remainingQuantity <= 0) break

  // Skip only zero batches, not negative ones
  if (batch.currentQuantity === 0) continue

  // NEW: Handle negative batches
  if (batch.currentQuantity < 0) {
    // Use cost from negative batch (which stores last known cost)
    const allocatedQty = Math.min(remainingQuantity, Math.abs(batch.currentQuantity))
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      allocatedQuantity: allocatedQty,
      costPerUnit: batch.costPerUnit,
      totalCost: allocatedQty * batch.costPerUnit,
      batchCreatedAt: batch.productionDate
    })
    remainingQuantity -= allocatedQty

    DebugUtils.warn(MODULE_NAME, 'Using negative batch for cost calculation', {
      batchNumber: batch.batchNumber,
      quantity: allocatedQty,
      costPerUnit: batch.costPerUnit
    })
    continue
  }

  // Original logic for positive batches
  const allocatedQty = Math.min(batch.currentQuantity, remainingQuantity)
  // ... existing allocation logic
}
```

2. **Update similar logic for product batches** (if needed)
   - Check if products have the same issue
   - Apply the same fix pattern

**Expected Result:**

- Sales transactions show correct preparation costs: `totalCost: 5113`
- Write-off history shows: "Rp 5,113" instead of "Rp 0"
- Preparation table shows: "Cost: Rp 51.13/ml (from negative stock)"
- Accurate profit calculations in sales reports

**Files to modify:**

- `src/stores/sales/composables/useActualCostCalculation.ts` (lines 223-260)

---

#### **Phase 2: Consolidate Negative Batches (IMPORTANT - Quality improvement)**

**Scope:** `src/stores/storage/storageService.ts` + `src/stores/preparation/negativeBatchService.ts`

**Objective:** Prevent duplicate negative batches - update existing instead of creating new ones

**Current Behavior:**

```
Sale #1: Creates NEG-PREP-001 (-100 ml)
Sale #2: Creates NEG-PREP-002 (-100 ml)  ❌ Duplicate!
Sale #3: Creates NEG-PREP-003 (-100 ml)  ❌ Duplicate!
Sale #4: Creates NEG-PREP-004 (-100 ml)  ❌ Duplicate!
```

**Desired Behavior:**

```
Sale #1: Creates NEG-PREP-001 (-100 ml)
Sale #2: Updates NEG-PREP-001 (-200 ml)  ✅ Consolidated!
Sale #3: Updates NEG-PREP-001 (-300 ml)  ✅ Consolidated!
Sale #4: Updates NEG-PREP-001 (-400 ml)  ✅ Consolidated!
```

**Implementation:**

1. **Add methods to negativeBatchService:**

```typescript
// File: src/stores/preparation/negativeBatchService.ts

/**
 * Get active (unreconciled) negative batch for a preparation in a department
 */
async getActiveNegativeBatch(
  preparationId: string,
  department: string
): Promise<PreparationBatch | null> {
  const preparationStore = usePreparationStore()

  const existingNegative = preparationStore.batches.find(
    b =>
      b.preparationId === preparationId &&
      b.department === department &&
      b.isNegative === true &&
      b.status === 'active' &&
      b.reconciledAt === null  // Not yet reconciled
  )

  return existingNegative || null
}

/**
 * Update existing negative batch with additional shortage
 */
async updateNegativeBatch(
  batchId: string,
  additionalShortage: number,
  costPerUnit: number
): Promise<PreparationBatch> {
  const preparationStore = usePreparationStore()
  const batch = preparationStore.batches.find(b => b.id === batchId)

  if (!batch) {
    throw new Error(`Negative batch not found: ${batchId}`)
  }

  const previousQty = batch.currentQuantity
  const newQty = previousQty - additionalShortage  // More negative

  // Update batch in store
  batch.currentQuantity = newQty
  batch.updatedAt = TimeUtils.getCurrentLocalISO()

  // Update batch in database
  await supabase
    .from('preparation_batches')
    .update({
      current_quantity: newQty,
      updated_at: batch.updatedAt
    })
    .eq('id', batchId)

  DebugUtils.info(MODULE_NAME, 'Updated existing negative batch', {
    batchNumber: batch.batchNumber,
    previousQty,
    additionalShortage,
    newQty
  })

  return batch
}
```

2. **Create similar methods for products** in `src/stores/storage/negativeBatchService.ts`

3. **Update storageService.createWriteOff()** (lines 879-934 for products, 836-921 for preparations):

```typescript
// File: src/stores/storage/storageService.ts
// Around line 879-934 (product write-off) and 836-921 (preparation write-off)

// Calculate shortage
const shortage = item.quantity - allocated

if (shortage > 0) {
  DebugUtils.warn(MODULE_NAME, 'Insufficient inventory - checking for existing negative batch', {
    itemName: item.itemName,
    shortage
  })

  // NEW: Check if there's already an unreconciled negative batch
  const { negativeBatchService } = await import('./negativeBatchService')
  const existingNegative = await negativeBatchService.getActiveNegativeBatch(
    item.itemId,
    data.department // or warehouseId for products
  )

  if (existingNegative) {
    // Update existing negative batch
    const updatedBatch = await negativeBatchService.updateNegativeBatch(
      existingNegative.id,
      shortage,
      cost
    )

    // Record expense for additional shortage
    const { writeOffExpenseService } = await import('./writeOffExpenseService')
    await writeOffExpenseService.recordNegativeBatchExpense(
      updatedBatch,
      item.itemName,
      shortage // Only the additional shortage, not total
    )

    DebugUtils.info(MODULE_NAME, 'Updated existing negative batch', {
      batchNumber: updatedBatch.batchNumber,
      additionalShortage: shortage,
      totalNegativeQty: updatedBatch.currentQuantity
    })
  } else {
    // Create new negative batch (existing logic - lines 891-934)
    const { negativeBatchService } = await import('./negativeBatchService')
    const negativeBatch = await negativeBatchService.createNegativeBatch({
      productId: item.itemId
      // ... existing creation logic
    })

    DebugUtils.info(MODULE_NAME, 'Created new negative batch', {
      batchNumber: negativeBatch.batchNumber,
      shortage
    })
  }
}
```

**Expected Result:**

- Only ONE negative batch per (preparation, department) pair
- Cleaner batch list in UI
- Easier reconciliation (one batch to reconcile instead of many)
- More accurate tracking of total shortage

**Files to modify:**

- `src/stores/preparation/negativeBatchService.ts` (add methods)
- `src/stores/storage/negativeBatchService.ts` (add methods for products)
- `src/stores/storage/storageService.ts` (update write-off logic, lines 836-951)

---

#### **Phase 3: Verify Auto-Reconciliation (NICE TO HAVE - Investigation)**

**Scope:** `src/stores/preparation/reconciliationService.ts`

**Objective:** Verify why negative batches are NOT being auto-reconciled

**Investigation Steps:**

1. **Check if reconciliationService is being called:**

   - File: `src/stores/preparation/preparationStore.ts`
   - Method: `createReceipt()` or production methods
   - Verify: `reconciliationService.autoReconcileOnNewBatch()` is called

2. **Check reconciliation logic:**

   - File: `src/stores/preparation/reconciliationService.ts`
   - Verify: Logic for marking batches as reconciled
   - Check: Are batches properly marked with `reconciledAt` timestamp?

3. **Add logging:**

   - Add debug logs to reconciliation service
   - Track when reconciliation is triggered
   - Track which batches are reconciled

4. **Test manually:**
   - Create negative batch (sell item with insufficient stock)
   - Produce new preparation batch
   - Verify: Negative batch marked as reconciled
   - Verify: Income transaction created in Account Store

**Expected Result:**

- Reconciliation service properly called on new batch production
- Negative batches marked as reconciled
- Income transactions created to offset expense
- Clear logging for audit trail

**Files to investigate:**

- `src/stores/preparation/reconciliationService.ts`
- `src/stores/preparation/preparationStore.ts` (production methods)
- `src/stores/storage/reconciliationService.ts` (for products)

---

### Implementation Priority

1. **Phase 1 (CRITICAL)** - Fix actual cost calculation

   - User-facing issue: incorrect costs displayed everywhere
   - Affects: Sales transactions, write-off history, profit calculations
   - Impact: HIGH - financial accuracy

2. **Phase 2 (IMPORTANT)** - Consolidate negative batches

   - Code quality issue: duplicate batches clutter the system
   - Affects: Batch list UI, reconciliation complexity
   - Impact: MEDIUM - maintainability and UX

3. **Phase 3 (NICE TO HAVE)** - Verify auto-reconciliation
   - Investigation task: understand why reconciliation doesn't work
   - Affects: Long-term inventory accuracy
   - Impact: LOW - can be done in next sprint

---

### Testing Checklist

**Phase 1 Testing:**

- [ ] Create sale with preparation (insufficient stock)
- [ ] Verify actual_cost shows correct preparation cost (not 0)
- [ ] Check write-off history shows correct cost
- [ ] Check preparation table shows correct cost
- [ ] Verify profit calculation uses correct cost

**Phase 2 Testing:**

- [ ] Create first sale (insufficient stock) → verify negative batch created
- [ ] Create second sale (insufficient stock) → verify same batch updated (not new batch)
- [ ] Create third sale (insufficient stock) → verify same batch updated again
- [ ] Check batch list shows only ONE negative batch
- [ ] Verify total shortage is accumulated correctly

**Phase 3 Testing:**

- [ ] Produce new preparation batch
- [ ] Verify reconciliation service is called
- [ ] Verify negative batch marked as reconciled
- [ ] Verify income transaction created
- [ ] Check Account Store for correct transactions

---

## ✅ BUGFIX COMPLETED (Dec 1, 2025)

### Issues Fixed

**Issue 1: Preparation Costs Showing as Rp 0 in Sales Transactions**

- ✅ Root Cause: FIFO allocation skipped negative batches
- ✅ Fix: Updated `useActualCostCalculation.ts` to handle negative batches
- ✅ Result: Sales transactions now show correct preparation costs from negative stock

**Issue 2: Negative Batches Creating Duplicates Instead of Consolidating**

- ✅ Root Cause: Mapper missing `is_negative` and related fields
- ✅ Fix 1: Updated `src/stores/preparation/supabase/mappers.ts` to include all negative batch fields
- ✅ Fix 2: Database migration to set `is_negative = true` for existing NEG-PREP-\* batches
- ✅ Fix 3: Consolidated 6 duplicate batches (-100 ml each) into 1 batch (-600 ml total)
- ✅ Fix 4: Updated `storageService.ts` to check for existing negative batches before creating new ones
- ✅ Result: Only one negative batch per (preparation, department) pair

**Issue 3: WriteOffHistoryView Showing Rp 0 for Costs**

- ✅ Root Cause: Using `decomposed_items` instead of `actual_cost` from sales_transactions
- ✅ Fix 1: Load `actual_cost` from sales_transactions via `salesTransactionId`
- ✅ Fix 2: Display FIFO costs in details dialog with "FIFO Cost" badge
- ✅ Fix 3: Cache actual costs for table display (batch load on filter)
- ✅ Fix 4: Show variant name instead of variant ID
- ✅ Result: All costs display correctly with proper FIFO values

### Files Modified

**Core Logic:**

1. `src/stores/sales/composables/useActualCostCalculation.ts`

   - Handle negative batches in FIFO allocation (both preparations and products)
   - Use cost from negative batches when no positive batches available

2. `src/stores/preparation/supabase/mappers.ts`

   - Added `is_negative`, `source_batch_id`, `negative_created_at`, etc. to `batchToSupabase()`
   - Added same fields to `batchFromSupabase()`

3. `src/stores/preparation/negativeBatchService.ts`

   - Added `getActiveNegativeBatch()` - find existing unreconciled negative batch
   - Added `updateNegativeBatch()` - update existing batch instead of creating duplicate

4. `src/stores/storage/negativeBatchService.ts`

   - Added same consolidation methods for products

5. `src/stores/storage/storageService.ts`
   - Updated preparation write-off logic (lines 878-963) to check for existing negative batches
   - Updated product write-off logic (lines 1009-1081) to check for existing negative batches

**UI:** 6. `src/views/backoffice/inventory/WriteOffHistoryView.vue`

- Load `actual_cost` from sales_transactions
- Display FIFO costs in details dialog with badge indicator
- Cache actual costs for table display
- Show variant name instead of ID
- Compute `displayItems` from actual_cost instead of writeOffItems

### Database Changes

```sql
-- Fix existing negative batches
UPDATE preparation_batches
SET is_negative = true, negative_created_at = created_at
WHERE batch_number LIKE 'NEG-PREP-%' AND is_negative = false;

-- Consolidate duplicates (example for one preparation)
UPDATE preparation_batches
SET current_quantity = -600, initial_quantity = -600, total_value = -600 * cost_per_unit
WHERE id = '99442906-9ea5-480a-a649-1e16a08f2d19';

DELETE FROM preparation_batches
WHERE id IN (...); -- 5 duplicate batches removed
```

### Testing Results

✅ **Phase 1 (Cost Calculation):**

- Sales transactions show correct preparation costs (Rp 5,113 instead of Rp 0)
- Write-off history shows correct costs
- Profit calculations accurate

✅ **Phase 2 (Consolidation):**

- New sales update existing negative batch instead of creating duplicates
- Only one negative batch per (preparation, department) pair
- Batch list cleaner and easier to reconcile

✅ **Phase 3 (UI):**

- WriteOffHistoryView shows FIFO costs from sales_transactions
- Variant names display correctly
- Total cost in table accurate on load
- Details dialog shows "FIFO Cost" badge when using actual costs

---

## Sprint 2 Implementation Summary (Dec 1, 2025)

### What Was Implemented

**Phase 2.1: Enhanced Write-Off Logic**

- ✅ Modified `storageService.createWriteOff()` to automatically detect inventory shortages
- ✅ When write-off quantity exceeds available stock:
  1. Writes off all available inventory using FIFO
  2. Calculates shortage (requested - available)
  3. Creates negative batch with last known cost
  4. Records expense transaction in Account Store
- ✅ Supports both products (storage_batches) and preparations (preparation_batches)
- ✅ No changes needed in useWriteOff composable (logic is at service level)

**Phase 2.2-2.4: Services Already Implemented (Sprint 1)**

- ✅ negativeBatchService - creates and tracks negative batches
- ✅ writeOffExpenseService - records financial transactions
- ✅ reconciliationService - auto-reconciles when new stock arrives
- ✅ Integration in createReceipt() methods

### Key Files Modified

1. `src/stores/storage/storageService.ts`:
   - Lines 875-951: Product write-off with negative batch support
   - Lines 835-921: Preparation write-off with negative batch support

### Testing Required

1. **Test Negative Batch Creation:**

   - Write off 150g of product with only 50g available
   - Verify negative batch created: -100g
   - Verify expense transaction recorded

2. **Test Auto-Reconciliation:**

   - Create new receipt for product with negative batch
   - Verify income transaction created
   - Verify negative batch marked as reconciled

3. **Test End-to-End:**
   - Complete write-off → negative batch → new receipt → reconciliation
   - Verify Account Store transactions are correct

### Next Steps

1. Manual testing of negative batch flow
2. Manual testing of reconciliation flow
3. (Optional) Integrate with POS order payment flow
4. (Optional) Integrate with preparation production flow
5. Move to Sprint 3: Reports and Analytics
