# NextTodo.md - Current Sprint: P&L & Food Cost Implementation

## 🎯 PROJECT GOAL

Implement correct cost accounting, inventory tracking, and profit calculation for P&L reporting while eliminating double write-off of products.

---

## 📊 IMPLEMENTATION STATUS

### ✅ COMPLETED SPRINTS (Phase 1)

#### ✅ Sprint 1: Eliminate Double Write-Off - COMPLETED (Nov 2025)

**Status:** Preparations no longer recursively decompose to products during sales.

**Files:**

- `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` - stops at preparation level
- `src/stores/sales/recipeWriteOff/types.ts` - supports type: 'preparation'

**Verified:**

- ✅ Preparations returned as final elements (not decomposed to products)
- ✅ No double write-off of raw products

---

#### ✅ Sprint 2: FIFO Allocation for Actual Cost - COMPLETED (Nov 27, 2025)

**Status:** Actual cost calculation from FIFO batches fully implemented and tested.

**Files:**

- `src/stores/sales/types.ts` - ActualCostBreakdown, BatchAllocation types
- `src/stores/sales/composables/useActualCostCalculation.ts` - FIFO allocation logic
- `src/stores/sales/salesStore.ts` - integrated calculateActualCost()
- `src/stores/sales/composables/useProfitCalculation.ts` - uses actualCost
- `src/supabase/migrations/017_create_sales_transactions.sql` - sales_transactions table
- `src/supabase/migrations/018_add_actual_cost_to_sales_transactions.sql` - actual_cost column

**Verified:**

- ✅ FIFO allocation works correctly (finds batches, allocates quantities)
- ✅ SalesTransaction.actualCost saved to database
- ✅ Profit calculated from actualCost (not decomposition)
- ✅ Enhanced logging shows batch allocations and costs

**Known Issue:**

- Old batches created before Sprint 3 have `cost_per_unit = 0` (data issue, not code bug)
- New batches created with Sprint 3 have correct costs

---

#### ✅ Sprint 3: Auto Write-Off Raw Products on Production - COMPLETED (Nov 25-26, 2025)

**Status:** Automatic write-off of raw products fully implemented.

**Files:**

- `src/stores/preparation/preparationService.ts` - auto write-off logic (lines 692-758)
- `src/stores/preparation/types.ts` - relatedStorageOperationIds, skipAutoWriteOff
- `src/stores/storage/types.ts` - WriteOffReason: 'production_consumption'
- `src/supabase/migrations/015_add_operation_links_for_auto_writeoff.sql` - operation links

**Verified (via database query):**

- ✅ Auto write-off creates StorageOperation for each preparation production
- ✅ relatedStorageOperationIds populated in PreparationOperation
- ✅ cost_per_unit calculated correctly from consumed raw materials
  - Example: "Garlic Sauce Spread 1" → 8.33 IDR/g
  - Example: "Маринад для мяса" → 51.13 IDR/ml
- ✅ skipAutoWriteOff flag works for inventory corrections

---

### ✅ ALREADY IMPLEMENTED (Other Features)

#### 1. Counteragents Balance Tracking (Sprint 7) - FULLY COMPLETE

**Files:**

- `src/stores/counteragents/types.ts` - `currentBalance`, `balanceHistory`
- `src/stores/counteragents/services/balanceCorrectionService.ts` - balance corrections
- `src/stores/counteragents/composables/useCounteragentBalance.ts` - balance calculation
- `src/stores/counteragents/integrations/automatedPayments.ts` - auto-create debt on delivery

**What works:**

- ✅ `currentBalance` field (current supplier balance)
- ✅ Balance change history `balanceHistory`
- ✅ Auto-update balance when creating PendingPayment
- ✅ Auto-update balance on payment completion
- ✅ Balance = totalPaid - totalDebt

**What doesn't work:**

- ❌ UI for displaying payables/receivables
- ❌ Overdue payments report

---

#### 2. Account Transactions with Categories (Sprint 5 foundation) - FULLY COMPLETE

**Files:**

- `src/stores/account/types.ts` - Transaction, DailyExpenseCategory, PendingPayment

**Expense categories:**

- `DailyExpenseCategory`: product, takeaway, ayu_cake, utilities, salary, renovation, transport, cleaning, security, village, rent, other
- `PendingPayment.category`: supplier, service, utilities, salary, other, rent, maintenance

**Relationships:**

- ✅ `Transaction.counteragentId` - link to supplier
- ✅ `Transaction.relatedOrderIds` - link to orders
- ✅ `PendingPayment.linkedOrders` - link payments to orders

**What doesn't work:**

- ❌ P&L Report UI
- ❌ COGS (Cost of Goods Sold) calculation from sales transactions
- ❌ Separation: supplier payments vs food cost

---

## 🚀 REVISED PLAN (6 Sprints instead of 8)

### **PHASE 1: Fix Core Logic** (Sprints 1-2) - ✅ COMPLETED

---

## ✅ SPRINT 1: Eliminate Double Write-Off - COMPLETED

### Goal

Fix decomposition logic - preparations should NOT be recursively decomposed to raw products during sales.

### Current Problem

**File:** `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` (lines 220-255)

```typescript
// ❌ PROBLEM: Recursively decomposes preparation → products
async function decomposePreparation(comp, quantity, path) {
  for (const prepIngredient of preparation.recipe) {
    // Writes off raw products AGAIN!
    const items = await decomposeComposition(menuComp, quantity, path)
    results.push(...items)
  }
}
```

**Result:** Double write-off of products:

1. When creating preparation → write-off products
2. When selling → decompose preparation → write-off products AGAIN

---

### Tasks

#### 1.1 Modify `useDecomposition.ts`

**File:** `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts`

**Method `decomposePreparation()` - NEW LOGIC:**

```typescript
async function decomposePreparation(comp, quantity, path) {
  // ✅ STOP! Don't decompose to products!
  // Return preparation as final element

  return [
    {
      type: 'preparation', // ← NOT product!
      preparationId: comp.id,
      preparationName: preparation.name,
      quantity: comp.quantity * quantity,
      unit: preparation.outputUnit,
      // Cost will be calculated from FIFO batches in Sprint 2
      costPerUnit: null,
      totalCost: null,
      path: [...path, preparation.name]
    }
  ]
}
```

**Changes:**

- Remove recursive call to `decomposeComposition()`
- Return preparation as final element
- Type: `'preparation'` instead of `'product'`

---

#### 1.2 Update Types

**File:** `src/stores/sales/recipeWriteOff/types.ts`

**Update `DecomposedItem`:**

```typescript
interface DecomposedItem {
  type: 'product' | 'preparation' // ✅ Add 'preparation'

  // Product fields (if type === 'product')
  productId?: string
  productName?: string

  // Preparation fields (if type === 'preparation')
  preparationId?: string
  preparationName?: string

  quantity: number
  unit: string
  costPerUnit: number | null // null if not yet calculated
  totalCost: number | null
  path: string[]
}
```

**Update `DecompositionSummary`:**

```typescript
interface DecompositionSummary {
  totalProducts: number // Only raw products (can_be_sold = true)
  totalPreparations: number // ✅ NEW: Number of preparations
  totalCost: number
  decomposedItems: DecomposedItem[] // Mixed: products + preparations
  method: 'decomposition' | 'direct_sale'
}
```

---

#### 1.3 Testing

**Test Case 1: Preparation in Recipe**

1. Create preparation "Tomato Sauce" (200g):

   - Recipe: 100g tomatoes + 50g onions + 30g oil
   - Write off products via StorageOperation (manually or automatically in Sprint 3)

2. Create Recipe "Pasta with Sauce":

   - Component 1: 150g "Tomato Sauce" (preparation)
   - Component 2: 200g pasta (product, can_be_sold = false)

3. Add to Menu "Pasta with Sauce"

4. Sell via POS

5. **Verify decomposition:**

   ```typescript
   // ✅ CORRECT
   decomposedItems: [
     {
       type: 'preparation',
       preparationId: 'sauce_xxx',
       quantity: 150,
       unit: 'gram'
     },
     {
       type: 'product',
       productId: 'pasta_xxx',
       quantity: 200,
       unit: 'gram'
     }
   ]

   // ❌ INCORRECT (old behavior)
   decomposedItems: [
     { type: 'product', productId: 'tomatoes', quantity: 75 }, // ← DUPLICATE WRITE-OFF!
     { type: 'product', productId: 'onions', quantity: 37.5 },
     { type: 'product', productId: 'oil', quantity: 22.5 },
     { type: 'product', productId: 'pasta', quantity: 200 }
   ]
   ```

**Test Case 2: Product with can_be_sold = true**

1. Create Product "Beer Bottle" (can_be_sold = true)
2. Add to Menu "Beer"
3. Sell via POS

4. **Verify decomposition:**
   ```typescript
   // ✅ CORRECT
   decomposedItems: [{ type: 'product', productId: 'beer_xxx', quantity: 1, unit: 'piece' }]
   ```

---

### Acceptance Criteria

- ✅ Preparations returned as final elements (`type: 'preparation'`)
- ✅ No recursive decomposition `preparation → products`
- ✅ Products with `can_be_sold = true` decomposed directly
- ✅ Tests pass (Test Case 1 and 2)

---

## ✅ SPRINT 2: FIFO Allocation for Actual Cost - COMPLETED (Nov 27, 2025)

### Goal

Calculate actual cost of sales through FIFO allocation from batches (instead of product decomposition).

**Status:** ✅ FULLY IMPLEMENTED AND TESTED

### Architecture

**Current cost calculation (INCORRECT):**

```
MenuItem → Recipe → decomposePreparation() → Products → sum(product.baseCostPerUnit)
```

**New cost calculation (CORRECT):**

```
MenuItem → Recipe → Components (preparation | product)
  → allocateFromPreparationBatches(FIFO) + allocateFromStorageBatches(FIFO)
  → ActualCostBreakdown
```

---

### Tasks

#### 2.1 Create New Types

**File:** `src/stores/sales/types.ts`

**New interfaces:**

```typescript
// Actual cost from FIFO batches
export interface ActualCostBreakdown {
  totalCost: number
  preparationCosts: PreparationCostItem[]
  productCosts: ProductCostItem[]

  method: 'FIFO' | 'LIFO' | 'WeightedAverage'
  calculatedAt: string
}

// Preparation cost from FIFO batches
export interface PreparationCostItem {
  preparationId: string
  preparationName: string
  quantity: number
  unit: string

  // FIFO allocation
  batchAllocations: BatchAllocation[]
  averageCostPerUnit: number
  totalCost: number
}

// Product cost from FIFO batches
export interface ProductCostItem {
  productId: string
  productName: string
  quantity: number
  unit: string

  // FIFO allocation
  batchAllocations: BatchAllocation[]
  averageCostPerUnit: number
  totalCost: number
}

// Allocation from specific batch
export interface BatchAllocation {
  batchId: string
  batchNumber?: string
  allocatedQuantity: number
  costPerUnit: number
  totalCost: number
  batchCreatedAt: string
}
```

**Extend `SalesTransaction`:**

```typescript
export interface SalesTransaction extends BaseEntity {
  // ... existing fields

  // ✅ NEW FIELDS
  actualCost: ActualCostBreakdown // Actual cost
  preparationWriteOffIds?: string[] // Preparation write-offs
  productWriteOffIds?: string[] // Product write-offs (direct sale)
}
```

---

#### 2.2 Create ActualCostCalculator

**File (new):** `src/stores/sales/composables/useActualCostCalculation.ts`

**Main method:**

```typescript
export function useActualCostCalculation() {
  const preparationStore = usePreparationStore()
  const storageStore = useStorageStore()
  const recipesStore = useRecipesStore()
  const menuStore = useMenuStore()

  /**
   * Calculate actual cost from FIFO batches
   */
  async function calculateActualCost(
    menuItemId: string,
    variantId: string,
    quantity: number
  ): Promise<ActualCostBreakdown> {
    // 1. Get menu composition
    const composition = menuStore.getComposition(menuItemId, variantId)

    const preparationCosts: PreparationCostItem[] = []
    const productCosts: ProductCostItem[] = []

    // 2. For each component
    for (const comp of composition) {
      if (comp.type === 'preparation') {
        // FIFO allocation from PreparationBatch
        const prepCost = await allocateFromPreparationBatches(
          comp.id,
          comp.quantity * quantity,
          'kitchen' // or from menuItem.department
        )
        preparationCosts.push(prepCost)
      } else if (comp.type === 'product') {
        // FIFO allocation from StorageBatch
        const prodCost = await allocateFromStorageBatches(
          comp.id,
          comp.quantity * quantity,
          'kitchen'
        )
        productCosts.push(prodCost)
      }
    }

    // 3. Total cost
    const totalCost =
      preparationCosts.reduce((sum, c) => sum + c.totalCost, 0) +
      productCosts.reduce((sum, c) => sum + c.totalCost, 0)

    return {
      totalCost,
      preparationCosts,
      productCosts,
      method: 'FIFO',
      calculatedAt: TimeUtils.getCurrentLocalISO()
    }
  }

  /**
   * FIFO allocation from preparation batches
   */
  async function allocateFromPreparationBatches(
    preparationId: string,
    requiredQuantity: number,
    department: 'kitchen' | 'bar'
  ): Promise<PreparationCostItem> {
    // Get batches sorted by FIFO (oldest first)
    const batches = preparationStore
      .getBatchesByDepartment(preparationId, department)
      .filter(b => b.quantity > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    let remainingQuantity = requiredQuantity
    const allocations: BatchAllocation[] = []

    for (const batch of batches) {
      if (remainingQuantity <= 0) break

      const allocatedQty = Math.min(batch.quantity, remainingQuantity)

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        allocatedQuantity: allocatedQty,
        costPerUnit: batch.costPerUnit,
        totalCost: allocatedQty * batch.costPerUnit,
        batchCreatedAt: batch.createdAt
      })

      remainingQuantity -= allocatedQty
    }

    // Weighted average cost
    const totalCost = allocations.reduce((sum, a) => sum + a.totalCost, 0)
    const totalQty = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
    const avgCost = totalQty > 0 ? totalCost / totalQty : 0

    const preparation = recipesStore.preparations.find(p => p.id === preparationId)

    return {
      preparationId,
      preparationName: preparation?.name || 'Unknown',
      quantity: requiredQuantity,
      unit: preparation?.outputUnit || 'gram',
      batchAllocations: allocations,
      averageCostPerUnit: avgCost,
      totalCost
    }
  }

  /**
   * FIFO allocation from storage batches
   */
  async function allocateFromStorageBatches(
    productId: string,
    requiredQuantity: number,
    department: 'kitchen' | 'bar'
  ): Promise<ProductCostItem> {
    // Similar to allocateFromPreparationBatches, but from storageStore
    // ...
  }

  return {
    calculateActualCost,
    allocateFromPreparationBatches,
    allocateFromStorageBatches
  }
}
```

---

#### 2.3 Integrate into SalesStore

**File:** `src/stores/sales/salesStore.ts`

**Method `recordSalesTransaction()` - MODIFY:**

```typescript
async function recordSalesTransaction(paymentData) {
  // ... existing code

  // ❌ OLD LOGIC (remove)
  // const decomposedItems = await decomposeMenuItem(...)
  // const ingredientsCost = decomposedItems.reduce(...)

  // ✅ NEW LOGIC
  const { calculateActualCost } = useActualCostCalculation()

  for (const billItem of billItems) {
    const actualCost = await calculateActualCost(
      billItem.menuItemId,
      billItem.variantId,
      billItem.quantity
    )

    // Calculate profit with ACTUAL cost
    const profitCalculation = calculateItemProfit(
      billItem,
      actualCost.totalCost, // ← from FIFO batches
      allocatedDiscount
    )

    const transaction: SalesTransaction = {
      // ... existing fields
      actualCost, // ✅ NEW
      profitCalculation // ✅ UPDATED (with correct cost)
    }

    salesTransactions.push(transaction)
  }
}
```

---

#### 2.4 Update Profit Calculation

**File:** `src/stores/sales/composables/useProfitCalculation.ts`

**Method `calculateItemProfit()` - MODIFY:**

```typescript
function calculateItemProfit(
  billItem: PosBillItem,
  actualCost: number, // ✅ NEW PARAMETER (instead of decomposedItems)
  allocatedDiscount: number
): ProfitCalculation {
  const originalPrice = billItem.price * billItem.quantity
  const finalRevenue = originalPrice - billItem.discount - allocatedDiscount

  // ✅ USE actualCost instead of ingredientsCost
  const profit = finalRevenue - actualCost
  const profitMargin = finalRevenue > 0 ? (profit / finalRevenue) * 100 : 0

  return {
    originalPrice,
    finalRevenue,
    ingredientsCost: actualCost, // ✅ ACTUAL cost
    profit,
    profitMargin
  }
}
```

---

#### 2.5 Create Database Migration

**File (new):** `src/supabase/migrations/020_create_sales_transactions.sql`

```sql
-- Migration: 020_create_sales_transactions
-- Description: Create sales_transactions table for storing sales transactions
-- Date: 2025-01-27

CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  bill_id UUID,
  item_id UUID,
  shift_id UUID REFERENCES shifts(id),

  -- Menu data
  menu_item_id UUID NOT NULL,
  menu_item_name TEXT NOT NULL,
  variant_id UUID NOT NULL,
  variant_name TEXT NOT NULL,

  -- Sale data
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,

  -- DateTime
  sold_at TIMESTAMPTZ NOT NULL,
  processed_by TEXT NOT NULL,

  -- Recipe/Inventory links
  recipe_id UUID,
  recipe_write_off_id UUID,
  preparation_write_off_ids UUID[],
  product_write_off_ids UUID[],

  -- Profit calculation (JSONB)
  profit_calculation JSONB NOT NULL,

  -- ✅ Actual cost breakdown (JSONB)
  actual_cost JSONB NOT NULL,

  -- Sync
  synced_to_backoffice BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ,

  -- Department
  department TEXT NOT NULL CHECK (department IN ('kitchen', 'bar')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sales_transactions_payment_id ON sales_transactions(payment_id);
CREATE INDEX idx_sales_transactions_sold_at ON sales_transactions(sold_at DESC);
CREATE INDEX idx_sales_transactions_menu_item_id ON sales_transactions(menu_item_id);
CREATE INDEX idx_sales_transactions_department ON sales_transactions(department);
CREATE INDEX idx_sales_transactions_shift_id ON sales_transactions(shift_id);

-- RLS Policies
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
  ON sales_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users"
  ON sales_transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

---

#### 2.6 Testing

**Test Case: FIFO Allocation**

1. Create 2 batches of preparation "Tomato Sauce":

   - Batch 1: 500g, cost = 10,000 IDR/g, createdAt = 2025-01-20
   - Batch 2: 500g, cost = 12,000 IDR/g, createdAt = 2025-01-22

2. Sell "Pasta with Sauce" (requires 150g sauce)

3. **Verify actualCost:**

   ```typescript
   actualCost: {
     totalCost: 1,500,000, // 150g × 10,000 IDR/g (from Batch 1)
     preparationCosts: [{
       preparationId: 'sauce_xxx',
       quantity: 150,
       batchAllocations: [{
         batchId: 'batch1_xxx',
         allocatedQuantity: 150,
         costPerUnit: 10000,
         totalCost: 1500000
       }],
       averageCostPerUnit: 10000,
       totalCost: 1500000
     }],
     method: 'FIFO'
   }
   ```

4. **Verify profitCalculation:**
   ```typescript
   profitCalculation: {
     finalRevenue: 50000, // Sale price
     ingredientsCost: 1500000, // From actualCost (FIFO)
     profit: 50000 - 1500000 = -1450000, // Loss!
     profitMargin: -2900%
   }
   ```

---

### Acceptance Criteria

- ✅ `ActualCostBreakdown` calculated from FIFO batches
- ✅ `SalesTransaction.actualCost` saved to database
- ✅ Profit calculated correctly (revenue - actualCost)
- ✅ FIFO allocation works for preparations and products
- ✅ No double write-off of products

---

### **PHASE 2: Automation & Enhancement** (Sprints 3-4) - ✅ Sprint 3 COMPLETED, Sprint 4 TODO

---

## ✅ SPRINT 3: Auto Write-Off Raw Products on Production - COMPLETED (Nov 25-26, 2025)

### Goal

Automatically write off raw products from Storage when creating preparations (production).

**Status:** ✅ FULLY IMPLEMENTED (verified via database)

### Current State

**File:** `DirectPreparationProductionDialog.vue` (lines 319-341)

- ✅ Shows preview of raw products for write-off
- ✅ Calculates `rawProductsPreview` from `preparation.recipe`
- ❌ Does NOT trigger auto write-off when calling `preparationStore.createReceipt()`

---

### Tasks

#### 3.1 Update `preparationStore.createReceipt()`

**File:** `src/stores/preparation/preparationStore.ts`

**Method `createReceipt()` - ADD auto write-off:**

```typescript
async function createReceipt(data: CreatePreparationReceiptData) {
  try {
    // 1. Create preparation batch
    const operation = await preparationService.createReceipt(data)

    // 2. ✅ AUTO-WRITE-OFF raw products (if production)
    if (data.sourceType === 'production') {
      const storageWriteOffIds: string[] = []

      for (const item of data.items) {
        const preparation = recipesStore.preparations.find(p => p.id === item.preparationId)

        if (!preparation?.recipe || preparation.recipe.length === 0) {
          DebugUtils.warn(MODULE_NAME, 'Skipping auto write-off: no recipe', {
            preparationId: item.preparationId
          })
          continue
        }

        // Calculate required products from recipe
        const multiplier = item.quantity / preparation.outputQuantity
        const storageWriteOffItems = preparation.recipe.map(ingredient => ({
          itemId: ingredient.id,
          itemType: 'product' as const,
          quantity: ingredient.quantity * multiplier,
          notes: `Auto write-off for production: ${preparation.name} (${item.quantity}${preparation.outputUnit})`
        }))

        // Create storage write-off
        const storageOperation = await storageStore.createWriteOff({
          department: data.department,
          responsiblePerson: data.responsiblePerson,
          reason: 'production_consumption',
          items: storageWriteOffItems,
          notes: `Automatic write-off for preparation ${operation.documentNumber}`
        })

        storageWriteOffIds.push(storageOperation.id)
      }

      // 3. Link storage operations to preparation operation
      if (storageWriteOffIds.length > 0) {
        operation.relatedStorageOperationIds = storageWriteOffIds
        await preparationService.updateOperation(operation.id, {
          relatedStorageOperationIds: storageWriteOffIds
        })
      }
    }

    return operation
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create receipt', { error })
    throw error
  }
}
```

---

#### 3.2 Update StorageStore

**File:** `src/stores/storage/storageStore.ts`

**Add field `relatedPreparationOperationId`:**

```typescript
interface StorageOperation {
  // ... existing fields
  relatedPreparationOperationId?: string // ✅ NEW: reverse link
}

async function createWriteOff(data, relatedPreparationOperationId?: string) {
  const operation = {
    ...data,
    relatedPreparationOperationId // ✅ NEW
  }

  return await storageService.createOperation(operation)
}
```

---

#### 3.3 Create Migration

**File (new):** `src/supabase/migrations/021_add_operation_links.sql`

```sql
-- Migration: 021_add_operation_links
-- Description: Add fields for linking operations
-- Date: 2025-01-27

-- Add related_preparation_operation_id to storage_operations
ALTER TABLE storage_operations
ADD COLUMN IF NOT EXISTS related_preparation_operation_id UUID;

-- Add index
CREATE INDEX IF NOT EXISTS idx_storage_operations_related_prep_op
  ON storage_operations(related_preparation_operation_id);

-- Add foreign key constraint (soft reference, nullable)
-- Note: Not adding CASCADE DELETE to preserve history
```

---

#### 3.4 Testing

1. Open `DirectPreparationProductionDialog`
2. Select preparation with recipe
3. Enter quantity
4. Click "Confirm Production"

5. **Verify:**
   - ✅ PreparationBatch created
   - ✅ StorageOperation (write_off) created automatically
   - ✅ `relatedStorageOperationIds` populated
   - ✅ Product stock decreased

---

### Acceptance Criteria

- ✅ `createReceipt()` automatically creates `StorageOperation (write_off)`
- ✅ `relatedStorageOperationIds` populated
- ✅ Product stock correctly decreased
- ✅ Works for multiple items in one receipt

---

## SPRINT 4: Cost Calculation Improvement (1 week)

### Goal

Display planned vs actual cost in UI for recipes and menu items.

### Tasks

#### 4.1 Update `useCostCalculation.ts`

**File:** `src/stores/recipes/composables/useCostCalculation.ts`

**Add modes:**

```typescript
export function useCostCalculation() {
  /**
   * Calculate recipe cost
   * @param mode 'planned' - from recipe (theoretical), 'actual' - from FIFO batches (actual)
   */
  async function calculateRecipeCost(
    recipe: Recipe,
    mode: 'planned' | 'actual' = 'planned'
  ): Promise<number> {
    if (mode === 'planned') {
      // Current logic (from recipe)
      return calculatePlannedCost(recipe)
    } else {
      // New logic (from FIFO batches)
      const { calculateActualCost } = useActualCostCalculation()
      const actualCost = await calculateActualCost(recipe.id, null, 1)
      return actualCost.totalCost
    }
  }

  function calculatePlannedCost(recipe: Recipe): number {
    // Existing logic
  }

  return {
    calculateRecipeCost,
    calculatePlannedCost
  }
}
```

---

#### 4.2 Update UI

**File:** `src/views/backoffice/recipes/RecipeCard.vue`

```vue
<template>
  <v-card>
    <v-card-text>
      <div class="d-flex justify-space-between">
        <div>
          <div class="text-caption">Planned Cost</div>
          <div class="text-h6">{{ formatCurrency(plannedCost) }}</div>
        </div>
        <div>
          <div class="text-caption">Actual Cost (FIFO)</div>
          <div class="text-h6">{{ formatCurrency(actualCost) }}</div>
        </div>
        <div>
          <div class="text-caption">Variance</div>
          <div class="text-h6" :class="varianceColor">
            {{ variance > 0 ? '+' : '' }}{{ variance.toFixed(1) }}%
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const { calculateRecipeCost } = useCostCalculation()

const plannedCost = ref(0)
const actualCost = ref(0)

onMounted(async () => {
  plannedCost.value = await calculateRecipeCost(recipe, 'planned')
  actualCost.value = await calculateRecipeCost(recipe, 'actual')
})

const variance = computed(() => {
  if (plannedCost.value === 0) return 0
  return ((actualCost.value - plannedCost.value) / plannedCost.value) * 100
})

const varianceColor = computed(() => {
  return variance.value > 10 ? 'text-error' : variance.value < -10 ? 'text-success' : 'text-info'
})
</script>
```

---

### Acceptance Criteria

- ✅ Planned cost calculated from recipe
- ✅ Actual cost calculated from FIFO batches
- ✅ Variance displayed in UI
- ✅ Variance color: red (>10%), green (<-10%), neutral (otherwise)

---

### **PHASE 3: Analytics** (Sprints 5-6)

---

## SPRINT 5: P&L Report + Food Cost Dashboard (3-4 weeks)

### Goal

Create UI for P&L report and Food Cost analysis with expense integration.

### P&L Architecture

```
P&L Statement
├── Revenue (from sales_transactions)
├── COGS (Cost of Goods Sold)
│   ├── Food Cost (from actualCost in sales_transactions)
│   └── Beverage Cost (from actualCost in sales_transactions)
├── Gross Profit = Revenue - COGS
├── Operating Expenses (OPEX)
│   ├── Payments to Suppliers (from account_transactions.category = 'product')
│   ├── Utilities (from account_transactions.category = 'utilities')
│   ├── Salary (from account_transactions.category = 'salary')
│   ├── Rent (from account_transactions.category = 'rent')
│   ├── Transport (from account_transactions.category = 'transport')
│   ├── Cleaning (from account_transactions.category = 'cleaning')
│   ├── Security (from account_transactions.category = 'security')
│   ├── Renovation (from account_transactions.category = 'renovation')
│   └── Other (from account_transactions.category = 'other')
└── Net Profit = Gross Profit - OPEX
```

**IMPORTANT: Separation**

- **Food Cost** (in COGS) = actualCost from sales_transactions (cost of sold dishes)
- **Payments to Suppliers** (in OPEX) = supplier payments for purchases (from account_transactions)

---

### Tasks

#### 5.1 Create PLReportStore

**File (new):** `src/stores/analytics/plReportStore.ts`

```typescript
import { defineStore } from 'pinia'
import { useSalesStore } from '@/stores/sales'
import { useAccountStore } from '@/stores/account'

export interface PLReport {
  period: {
    dateFrom: string
    dateTo: string
  }

  // Revenue
  revenue: {
    total: number
    byDepartment: {
      kitchen: number
      bar: number
    }
    byCategory: Record<string, number>
  }

  // COGS
  cogs: {
    total: number
    foodCost: number // from sales actualCost (kitchen)
    beverageCost: number // from sales actualCost (bar)
  }

  // Gross Profit
  grossProfit: {
    amount: number
    margin: number // %
  }

  // OPEX
  opex: {
    total: number
    byCategory: {
      suppliersPayments: number // supplier payments
      utilities: number
      salary: number
      rent: number
      transport: number
      cleaning: number
      security: number
      renovation: number
      other: number
    }
  }

  // Net Profit
  netProfit: {
    amount: number
    margin: number // %
  }
}

export const usePLReportStore = defineStore('plReport', {
  state: () => ({
    currentReport: null as PLReport | null,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async generateReport(dateFrom: string, dateTo: string): Promise<PLReport> {
      try {
        this.loading = true
        this.error = null

        const salesStore = useSalesStore()
        const accountStore = useAccountStore()

        // 1. Calculate Revenue from sales_transactions
        const salesTransactions = await salesStore.getTransactionsByDateRange(dateFrom, dateTo)
        const revenue = {
          total: salesTransactions.reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0),
          byDepartment: {
            kitchen: salesTransactions
              .filter(t => t.department === 'kitchen')
              .reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0),
            bar: salesTransactions
              .filter(t => t.department === 'bar')
              .reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0)
          },
          byCategory: {} // TODO: group by menu category
        }

        // 2. Calculate COGS from actualCost
        const cogs = {
          foodCost: salesTransactions
            .filter(t => t.department === 'kitchen')
            .reduce((sum, t) => sum + t.actualCost.totalCost, 0),
          beverageCost: salesTransactions
            .filter(t => t.department === 'bar')
            .reduce((sum, t) => sum + t.actualCost.totalCost, 0),
          total: 0
        }
        cogs.total = cogs.foodCost + cogs.beverageCost

        // 3. Calculate Gross Profit
        const grossProfit = {
          amount: revenue.total - cogs.total,
          margin: revenue.total > 0 ? ((revenue.total - cogs.total) / revenue.total) * 100 : 0
        }

        // 4. Calculate OPEX from account_transactions
        const expenseTransactions = await accountStore.getExpensesByDateRange(dateFrom, dateTo)
        const opex = {
          byCategory: {
            suppliersPayments: this.sumByExpenseCategory(expenseTransactions, 'product'),
            utilities: this.sumByExpenseCategory(expenseTransactions, 'utilities'),
            salary: this.sumByExpenseCategory(expenseTransactions, 'salary'),
            rent: this.sumByExpenseCategory(expenseTransactions, 'rent'),
            transport: this.sumByExpenseCategory(expenseTransactions, 'transport'),
            cleaning: this.sumByExpenseCategory(expenseTransactions, 'cleaning'),
            security: this.sumByExpenseCategory(expenseTransactions, 'security'),
            renovation: this.sumByExpenseCategory(expenseTransactions, 'renovation'),
            other: this.sumByExpenseCategory(expenseTransactions, 'other')
          },
          total: 0
        }
        opex.total = Object.values(opex.byCategory).reduce((sum, v) => sum + v, 0)

        // 5. Calculate Net Profit
        const netProfit = {
          amount: grossProfit.amount - opex.total,
          margin: revenue.total > 0 ? ((grossProfit.amount - opex.total) / revenue.total) * 100 : 0
        }

        const report: PLReport = {
          period: { dateFrom, dateTo },
          revenue,
          cogs,
          grossProfit,
          opex,
          netProfit
        }

        this.currentReport = report
        return report
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to generate report'
        throw error
      } finally {
        this.loading = false
      }
    },

    sumByExpenseCategory(transactions: Transaction[], category: DailyExpenseCategory): number {
      return transactions
        .filter(t => t.expenseCategory?.category === category)
        .reduce((sum, t) => sum + t.amount, 0)
    }
  }
})
```

---

#### 5.2 Create PLReportView

**File (new):** `src/views/backoffice/analytics/PLReportView.vue`

(Full Vue component with date filters, P&L table, and formatting - see NextTodo.md lines 1157-1313 for complete implementation)

---

#### 5.3 Create FoodCostDashboardView

**File (new):** `src/views/backoffice/analytics/FoodCostDashboardView.vue`

Display:

- Food Cost % (COGS / Revenue)
- Target Food Cost % (planned)
- Variance
- Trend by days (chart)
- Top 10 items by cost

---

#### 5.4 Create InventoryValuationView

**File (new):** `src/views/backoffice/inventory/InventoryValuationView.vue`

Display:

- Total Inventory Value (FIFO)
- Products Inventory (sum of storage_batches.value)
- Preparations Inventory (sum of preparation_batches.value)
- Breakdown by department

---

#### 5.5 Update Router

**File:** `src/router/index.ts`

```typescript
{
  path: '/analytics/pl-report',
  name: 'PLReport',
  component: () => import('@/views/backoffice/analytics/PLReportView.vue'),
  meta: { allowedRoles: ['admin', 'manager'] }
},
{
  path: '/analytics/food-cost',
  name: 'FoodCostDashboard',
  component: () => import('@/views/backoffice/analytics/FoodCostDashboardView.vue'),
  meta: { allowedRoles: ['admin', 'manager'] }
},
{
  path: '/inventory/valuation',
  name: 'InventoryValuation',
  component: () => import('@/views/backoffice/inventory/InventoryValuationView.vue'),
  meta: { allowedRoles: ['admin', 'manager'] }
}
```

---

### Acceptance Criteria

- ✅ P&L Report shows correct data (Revenue, COGS, Gross Profit, OPEX, Net Profit)
- ✅ COGS calculated from actualCost (NOT from supplier payments!)
- ✅ OPEX broken down by expense categories
- ✅ Food Cost Dashboard functional
- ✅ Inventory Valuation calculated correctly (FIFO)

---

## SPRINT 6: Payables/Receivables UI + Cash Flow (2 weeks)

### Goal

Create UI for displaying debts and cash flow.

### Tasks

#### 6.1 Create PayablesView

**File (new):** `src/views/backoffice/finance/PayablesView.vue`

Display:

- Total Payables (sum of debts to suppliers)
- Overdue Payments (overdue payments)
- Suppliers Table:
  - Name
  - Current Balance
  - Total Debt
  - Overdue Amount
  - Payment Terms
  - Actions (Pay, View History)

---

#### 6.2 Create CashFlowReportView

**File (new):** `src/views/backoffice/finance/CashFlowReportView.vue`

Display:

- Cash Inflows (Revenue from sales)
- Cash Outflows (OPEX + Suppliers Payments)
- Net Cash Flow
- Accounts Balance (cash, bank, card, gojeck, grab)
- Inventory Value
- Accounts Payable (supplier debt)
- **Total Assets = Accounts Balance + Inventory Value - Accounts Payable**

---

### Acceptance Criteria

- ✅ Payables view shows current debts
- ✅ Overdue payments displayed
- ✅ Cash Flow report shows cash movement
- ✅ Total Assets calculated correctly

---

## 📁 FINAL FILE STRUCTURE

### New Files (to create)

**Composables:**

- `src/stores/sales/composables/useActualCostCalculation.ts` - FIFO allocation

**Stores:**

- `src/stores/analytics/plReportStore.ts` - P&L reports
- `src/stores/analytics/foodCostStore.ts` - Food Cost analytics
- `src/stores/analytics/types.ts` - analytics types

**Views:**

- `src/views/backoffice/analytics/PLReportView.vue` - P&L report
- `src/views/backoffice/analytics/FoodCostDashboardView.vue` - Food Cost dashboard
- `src/views/backoffice/analytics/components/PLSummaryCard.vue` - P&L component
- `src/views/backoffice/inventory/InventoryValuationView.vue` - inventory valuation
- `src/views/backoffice/finance/PayablesView.vue` - payables
- `src/views/backoffice/finance/CashFlowReportView.vue` - cash flow

**Migrations:**

- `src/supabase/migrations/020_create_sales_transactions.sql` - sales_transactions table
- `src/supabase/migrations/021_add_operation_links.sql` - operation links

---

### Modified Files

**Decomposition:**

- `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` - stop recursion
- `src/stores/sales/recipeWriteOff/types.ts` - add type: 'preparation'

**Sales:**

- `src/stores/sales/types.ts` - ActualCostBreakdown
- `src/stores/sales/salesStore.ts` - use calculateActualCost()
- `src/stores/sales/composables/useProfitCalculation.ts` - actualCost instead of decomposition

**Preparation:**

- `src/stores/preparation/preparationStore.ts` - auto write-off raw products
- `src/stores/preparation/types.ts` - use relatedStorageOperationIds

**Storage:**

- `src/stores/storage/storageStore.ts` - relatedPreparationOperationId

**Recipes:**

- `src/stores/recipes/composables/useCostCalculation.ts` - modes planned/actual
- `src/views/backoffice/recipes/RecipeCard.vue` - show planned vs actual

**Router:**

- `src/router/index.ts` - new routes

---

## ✅ ACCEPTANCE CRITERIA (overall)

### Phase 1 (Sprints 1-2)

- ✅ Preparations NOT decomposed to products
- ✅ ActualCost calculation works via FIFO
- ✅ No double write-off of products
- ✅ Profit calculated correctly

### Phase 2 (Sprints 3-4)

- ✅ Auto write-off raw products when creating preparations
- ✅ Operation links populated
- ✅ Planned vs Actual cost displayed

### Phase 3 (Sprints 5-6)

- ✅ P&L Report shows correct data
- ✅ COGS ≠ Suppliers Payments (separated!)
- ✅ Food Cost Dashboard functional
- ✅ Inventory Valuation correct
- ✅ Payables/Cash Flow displayed

---

## 🎯 NEXT STEPS

1. **Approve plan** with user
2. **Sprint 1:** Start with modifying `useDecomposition.ts`
3. **Testing:** After each sprint - testing and acceptance
4. **Documentation:** Update TODO.md as work progresses

---

**Current Focus:** Ready to start Sprint 1 (Eliminate Double Write-Off)
