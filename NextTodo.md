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

### Phase 2.1: Enhanced Write-Off Logic ⏳

- [ ] Updated useWriteOff with negative batch support
- [ ] Updated usePreparationWriteOff with negative batch support
- [ ] Tested write-off with insufficient inventory
- [ ] Verified negative batch creation
- [ ] Verified expense transaction recording

### Phase 2.2: Expense Service ✅

- [x] writeOffExpenseService created (Sprint 1)

### Phase 2.3: Auto-Reconciliation ⏳

- [ ] Created reconciliationService for products
- [ ] Created reconciliationService for preparations
- [ ] Tested reconciliation on new batch arrival
- [ ] Verified income transaction recording
- [ ] Verified negative batch marked as reconciled

### Phase 2.4: Integration Points ⏳

- [ ] Integrated reconciliation into storageStore.createReceipt()
- [ ] Integrated reconciliation into preparationStore.createReceipt()
- [ ] Tested end-to-end flow (negative batch → reconciliation)

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
- ✅ All tests pass
- ✅ No TypeScript errors

**Ready for Sprint 3:** Reports and Analytics
