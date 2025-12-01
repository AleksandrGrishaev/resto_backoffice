# Current Sprint: Negative Inventory Management & Cost Accounting

## Strategic Overview

### Business Problem

When inventory runs out during operations (kitchen production, POS sales), the system cannot handle write-offs that exceed available stock. This causes:

1. **Operational blocks**: Cannot complete orders when stock shows zero
2. **Cost tracking gaps**: Lost inventory costs not recorded in financial reports
3. **Recipe accuracy issues**: Cannot identify if recipes are incorrect or portions are wrong
4. **Inventory corrections**: When new stock arrives after negative balance, no audit trail

### Strategic Goals

1. **Operational continuity**: Enable operations even when stock is zero (create negative batches)
2. **Cost accuracy**: Track all inventory costs including estimated costs from negative scenarios
3. **Root cause analysis**: Identify why products go negative (recipe issues, portioning problems, missing inventory records)
4. **Audit trail**: Full history of negative inventory events and reconciliations

### Success Criteria

- ✅ Operations never blocked by zero inventory
- ✅ All write-off costs tracked in expense reports
- ✅ Negative inventory reconciled automatically when new stock arrives
- ✅ Reports show which recipes/products frequently go negative
- ✅ Finance team has accurate COGS (Cost of Goods Sold) data

---

## Tactical Overview

### Core Mechanism: Negative Batches

When a write-off operation requests more quantity than available:

1. Write off all available inventory normally (FIFO)
2. Calculate shortage: `shortage = requested_qty - available_qty`
3. Get last known cost from most recent batch
4. Create **negative batch**: `quantity = -shortage`, `cost = last_known_cost`, `is_negative = true`
5. Record source operation (POS order, preparation production, manual write-off)
6. Create expense transaction for financial tracking

### Auto-Reconciliation on New Stock Arrival

When new batch arrives while negative inventory exists:

1. User adds new batch with actual arrival quantity (e.g., 2000g)
2. System detects existing negative batches (e.g., -100g)
3. System creates new batch with full quantity (2000g)
4. System auto-creates **inventory_correction** transaction (+100g) to balance the negative
5. System marks negative batch as reconciled with timestamp
6. Total inventory: -100g + 2000g + 100g (correction) = 2000g actual

**Example:**

```
Day 1: Stock runs out during POS order
  - Available: 0g
  - Order needs: 100g
  - Action: Create negative batch (-100g, cost from last batch)

Day 2: New delivery arrives (2000g)
  - User enters: 2000g at new cost
  - System creates: Batch #1 (2000g, new cost)
  - System creates: Correction transaction (+100g, inventory_correction category)
  - System marks: Negative batch as reconciled
  - Net result: 2000g available, +100g correction recorded as surplus
```

### Root Cause Tracking

Each negative batch records:

- **source_operation_type**: 'pos_order' | 'preparation_production' | 'manual_writeoff'
- **affected_recipe_ids**: Which recipes/menu items caused the shortage
- **shift_id**: Which shift was active
- **user_id**: Who performed the operation
- **negative_reason**: Text description

**Purpose**: Identify patterns

- Recipes with incorrect ingredient quantities
- Popular items that need better stock forecasting
- Kitchen staff not recording semi-finished product production
- Portion sizes not matching recipes

### Cost Accounting Strategy: FIFO with Fixed Price Correction (Variant A)

**Core Principle:**

- Negative batch uses **last known cost** (from most recent batch before it ran out)
- Correction transaction uses **same cost as negative batch** (not new arrival cost)
- Price variance is **acceptable** and will be corrected during periodic inventory reconciliation

**Why This Approach:**

- ✅ Simple implementation (FIFO standard)
- ✅ Follows restaurant industry best practices (Toast POS, Square, Lightspeed)
- ✅ Price variance typically 5-10% (acceptable for food products)
- ✅ Variance corrected during monthly inventory count
- ✅ Clear separation: food_cost (usage) vs inventory_variance (corrections)

**Transaction Types:**

1. **Negative batch write-off**:

   - Type: `expense`
   - Category: `food_cost`
   - Tracks actual product usage

2. **Inventory correction** (reconciliation):
   - Type: `income`
   - Category: `inventory_variance`
   - Tracks surplus found during reconciliation (offset negative)

**P&L Structure:**

```
Revenue: XXX

Cost of Goods Sold (COGS):
  - Food Cost: XXX  (includes negative batch expenses)
  - Beverage Cost: XXX
  Total COGS: XXX

Gross Profit: XXX

Operating Expenses (OPEX):
  - Utilities, Salary, Rent, etc.
  Total OPEX: XXX

Inventory Adjustments:  // NEW SECTION
  - Reconciliation surplus: +XXX (from negative batch corrections)
  - Manual corrections: -/+ XXX
  - Spoilage/Expired: -XXX
  Total Variance: XXX

Net Profit: XXX
```

---

### Practical Example: Real-World Scenario

**Scenario:** Cook takes potatoes from new delivery before it's entered in system

**Timeline:**

**Day 1 (Morning): Cook needs 1000g potatoes, but system shows 0g**

```
System State:
  - Available: 0g
  - Last batch: 2000g @ 55₽/g (fully consumed yesterday)

POS Order: Mashed potatoes (needs 1000g)

System Action:
  1. Detect shortage: 1000g - 0g = 1000g
  2. Get last known cost: 55₽/g
  3. Create negative batch:
     - Quantity: -1000g
     - Cost: 55₽/g
     - Total: -55,000₽
     - is_negative: true
     - source_operation_type: 'pos_order'

  4. Create expense transaction:
     - Type: expense
     - Category: food_cost
     - Amount: -55,000₽
     - Description: "POS order write-off: Potatoes (negative batch)"

Result: Order completed ✅, Food Cost: -55,000₽
```

**Day 2 (Afternoon): New delivery arrives - 4000g @ 60₽/g**

```
Warehouse Manager enters: 4000g @ 60₽/g

System Action:
  1. Create new batch:
     - Quantity: +4000g
     - Cost: 60₽/g
     - Total: 240,000₽

  2. Detect unreconciled negative batches: -1000g @ 55₽/g

  3. Create correction transaction:
     - Quantity: +1000g
     - Cost: 55₽/g (from negative batch, NOT 60₽!)
     - Total: +55,000₽
     - Type: income
     - Category: inventory_variance
     - Description: "Auto-reconciliation: surplus from negative batch"

  4. Mark negative batch as reconciled:
     - reconciled_at: 2024-01-02 14:30

Result:
  - Inventory: 5000g (negative -1000g + correction +1000g + new 4000g)
  - Food Cost: -55,000₽ (unchanged)
  - Inventory Variance: +55,000₽ (offset)
  - Net Impact: 0₽ ✅
```

**Day 3 (End of Month): Physical inventory count**

```
System shows: 5000g
Physical count: 3000g
Discrepancy: -2000g

Analysis:
  - Cook actually used 1000g from NEW batch (60₽/g)
  - System recorded as OLD batch (55₽/g)
  - Price variance: (60₽ - 55₽) × 1000g = 5,000₽
  - Plus phantom +1000g correction (doesn't physically exist)

Inventory Reconciliation:
  - Write-off: -2000g @ 60₽/g = -120,000₽
  - Type: expense
  - Category: inventory_adjustment
  - Reason: "Monthly physical count variance"

Final P&L Impact (cumulative):
  - Food Cost: -55,000₽ (Day 1: negative batch)
  - Inventory Variance: +55,000₽ (Day 2: correction)
  - Inventory Adjustment: -120,000₽ (Day 3: physical count)
  - Total Cost: -120,000₽ ✅ Correct! (2000g × 60₽)

Price Variance: 5,000₽ (8.3%)
Status: Acceptable ✅ (within 10% threshold)
```

**Key Insights:**

1. **Immediate operations**: Never blocked (negative batch created automatically)
2. **Short-term accuracy**: 91.7% accurate (55₽ vs 60₽)
3. **Long-term accuracy**: 100% accurate (corrected at monthly inventory)
4. **Traceability**: Full audit trail (negative batch → correction → physical count)

**Cost Variance Tracking:**

```typescript
// In Negative Inventory Report
interface CostVarianceMetric {
  productName: string // "Potatoes"
  negativeBatchCost: number // 55₽/g
  actualCost: number // 60₽/g (from monthly inventory)
  variance: number // 5₽/g
  variancePercent: number // 8.3%
  quantityAffected: number // 1000g
  totalImpact: number // 5,000₽
  reconciledAt: Date // 2024-01-31
}
```

**When Price Variance is Problematic:**

- ❌ Variance > 15% regularly → Consider Variant B (cost recalculation)
- ❌ High-value products (meat, seafood) → Consider actual cost tracking
- ❌ Volatile pricing (import products) → Consider weighted average

**For Most Restaurants:**

- ✅ Variance 5-10% is normal and acceptable
- ✅ Monthly inventory reconciliation corrects discrepancies
- ✅ Simplicity > precision for bulk products (vegetables, grains)

---

### Expense Recording (minimal integration):

- When negative batch is created → create account transaction (type: expense, category: food_cost)
- When correction created → create account transaction (type: income, category: inventory_variance)
- Use existing `accountStore.createOperation()` method (no changes to accountStore)
- Existing P&L report will automatically include these expenses
- Just add link to Negative Inventory Report from P&L

### Permission & Automation

- **Always automatic** - no approval workflow (speed is critical for POS operations)
- No UI changes to existing Storage/Preparation views
- Focus on backend logic and new reporting

---

---

## Implementation Readiness Check

### ✅ What We Have (No Changes Needed)

**Account Store - Transaction System:**

- ✅ `createOperation(data: CreateOperationDto)` method exists
- ✅ Supports `type: 'income' | 'expense' | 'transfer' | 'correction'`
- ✅ Has `expenseCategory` field with existing categories:
  - `'product'` - ✅ We'll use this for food_cost
  - `'other'` - ✅ Can use for inventory_variance
- ✅ Transaction validation: requires expenseCategory for expense type
- ✅ P&L report already consumes expense transactions

**Storage/Preparation System:**

- ✅ Write-off composables exist: `useWriteOff()`, `usePreparationWriteOff()`
- ✅ FIFO logic implemented
- ✅ Batch management in storageStore/preparationStore
- ✅ Storage operations tracking

### ⚠️ What We Need to Add

**1. New Expense Categories** (Minor Change)

**File**: `src/stores/account/types.ts`

**Current:**

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

**Need to Add:**

```typescript
export type DailyExpenseCategory =
  | 'product' // ✅ Already exists - use for food_cost
  | 'food_cost' // ❌ NEW - explicit food cost tracking
  | 'inventory_variance' // ❌ NEW - for correction transactions (income)
  | 'inventory_adjustment' // ❌ NEW - for monthly physical count adjustments
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

**Alternative (Simpler):**

- Use existing `'product'` for food_cost
- Use `'other'` for inventory_variance
- Add description to differentiate

**Decision needed:** Add new categories OR reuse existing?

**Recommendation:** Add new categories for clarity and better P&L reporting

**2. Database Schema** (Required)

**Tables to modify:**

- `batches` - add negative inventory fields ❌ Not exists yet
- `products` - add `last_known_cost` ❌ Not exists yet
- `preparations` - add `last_known_cost` ❌ Not exists yet

**3. Services** (Required)

- `negativeBatchService.ts` ❌ Not exists
- `writeOffExpenseService.ts` ❌ Not exists
- `reconciliationService.ts` ❌ Not exists

**4. Enhanced Write-Off Logic** (Required)

- `useWriteOff.ts` - needs enhancement ⚠️ Exists but needs update
- `usePreparationWriteOff.ts` - needs enhancement ⚠️ Exists but needs update

**5. Reporting** (Required)

- `negativeInventoryReportStore.ts` ❌ Not exists
- `NegativeInventoryReport.vue` ❌ Not exists

---

## Current State Analysis

### What Already Exists

**✅ Account Store** (`src/stores/account/`):

- Full transaction system with expense categories
- Method: `createOperation(accountId, type, amount, category, description)`
- P&L Report integration: `getExpensesByDateRange(dateFrom, dateTo)`
- Expense categories include: `product`, `utilities`, `salary`, `rent`, etc.
- **No changes needed** - we'll use existing methods

**✅ P&L Report** (`src/stores/analytics/plReportStore.ts`, `src/views/backoffice/analytics/PLReportView.vue`):

- Calculates: Revenue - COGS - OPEX = Net Profit
- COGS from sales transactions (actualCost field)
- OPEX from account expense transactions
- **Minimal change needed** - just add link to new Negative Inventory Report

**✅ Write-Off System** (`src/stores/storage/composables/useWriteOff.ts`):

- FIFO write-off logic for products
- Storage operations tracking
- Write-off reasons: expired, spoiled, education, test, production_consumption, sales_consumption
- **Needs enhancement** - add negative batch creation when insufficient inventory

**✅ Storage Store** (`src/stores/storage/storageStore.ts`):

- Product and batch management
- Inventory operations
- Service layer integration
- **Needs enhancement** - add last_known_cost caching

**✅ Preparation System** (`src/stores/preparation/`):

- Semi-finished product management
- Recipe-based production
- Write-off composable
- **Needs same enhancements as storage**

### What's Missing (Gaps to Fill)

**❌ Negative Batch Support**:

- No database fields for `is_negative`, `source_batch_id`, `negative_reason`
- No service to create/manage negative batches
- No cost caching mechanism (`last_known_cost`)

**❌ Auto-Reconciliation Logic**:

- When new batch arrives, no automatic correction transaction
- No detection of existing negative batches
- No marking of reconciled negative batches

**❌ Root Cause Tracking**:

- Negative batches don't record source operation
- No link to affected recipes/menu items
- Cannot analyze why products go negative

**❌ Expense Integration**:

- Write-offs don't create account transactions
- Negative inventory costs not in financial reports
- No way to see total COGS including negative scenarios

**❌ Reporting**:

- No visibility into negative inventory events
- Cannot see reconciliation history
- Cannot identify problematic recipes/products

---

## Implementation Plan (4 Sprints)

### Sprint 1: Foundation - Database & Services (5 days)

**Phase 1.1: Database Schema**

- Migration: `src/supabase/migrations/023_negative_inventory_support.sql`

**Tables to Modify**:

```
batches:
  + is_negative: boolean (default false)
  + source_batch_id: uuid (references batches.id)
  + negative_created_at: timestamptz
  + negative_reason: text
  + source_operation_type: text ('pos_order' | 'preparation_production' | 'manual_writeoff')
  + affected_recipe_ids: uuid[] (array of recipe IDs)
  + reconciled_at: timestamptz (null until reconciled)

products:
  + allow_negative_inventory: boolean (default true)
  + last_known_cost: decimal(10,2)

preparations:
  + allow_negative_inventory: boolean (default true)
  + last_known_cost: decimal(10,2)
```

**Phase 1.2: Negative Batch Service**

**New File**: `src/stores/storage/services/negativeBatchService.ts`

**Methods**:

```typescript
interface INegativeBatchService {
  // Get the most recent batch with cost information
  getLastActiveBatch(productId: string): Promise<Batch | null>

  // Calculate cost for negative batch from last known pricing
  calculateNegativeBatchCost(productId: string, requestedQty: number): Promise<number>

  // Create negative batch with full metadata
  createNegativeBatch(params: {
    productId: string
    quantity: number // negative value
    cost: number // from last active batch
    reason: string
    sourceOperationType: 'pos_order' | 'preparation_production' | 'manual_writeoff'
    affectedRecipeIds?: string[]
    userId?: string
    shiftId?: string
  }): Promise<Batch>

  // Check if product has unreconciled negative batches
  hasNegativeBatches(productId: string): Promise<boolean>

  // Get all unreconciled negative batches for product
  getNegativeBatches(productId: string): Promise<Batch[]>

  // Mark negative batch as reconciled
  markAsReconciled(batchId: string): Promise<void>
}
```

**New File**: `src/stores/preparation/services/negativeBatchService.ts`

- Same interface as above, but for preparations

**Phase 1.3: Storage Store Integration**

**File**: `src/stores/storage/storageStore.ts`

**New Methods**:

```typescript
// Called after any batch creation/update to cache cost
async updateProductLastKnownCost(productId: string): Promise<void> {
  const lastBatch = await negativeBatchService.getLastActiveBatch(productId)
  if (lastBatch) {
    await supabase
      .from('products')
      .update({ last_known_cost: lastBatch.cost_per_unit })
      .eq('id', productId)
  }
}

// Check if product allows negative inventory (configurable per product)
canGoNegative(productId: string): boolean {
  const product = this.products.find(p => p.id === productId)
  return product?.allow_negative_inventory ?? true
}
```

**Phase 1.4: Preparation Store Integration**

**File**: `src/stores/preparation/preparationStore.ts`

- Same methods as storage store (for preparations)

---

### Sprint 2: Write-Off Logic + Auto-Reconciliation (7 days)

**Phase 2.1: Enhanced Write-Off Logic**

**File**: `src/stores/storage/composables/useWriteOff.ts`

**Method to Update**: `writeOffProducts(items: WriteOffItem[]): Promise<ServiceResponse>`

**Current Logic**:

```typescript
// Existing FIFO write-off
for (const item of items) {
  const batches = getBatchesForProduct(item.productId)
  // Write off from batches using FIFO
}
```

**New Logic**:

```typescript
async writeOffProducts(items: WriteOffItem[], context?: {
  sourceType?: 'pos_order' | 'preparation_production' | 'manual_writeoff'
  affectedRecipeIds?: string[]
  userId?: string
  shiftId?: string
}): Promise<ServiceResponse> {
  for (const item of items) {
    // 1. Calculate available quantity
    const availableQty = calculateTotalAvailableQty(item.productId)

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
    if (!storageStore.canGoNegative(item.productId)) {
      return {
        success: false,
        error: `Insufficient inventory for product ${item.productName}. Available: ${availableQty}, Requested: ${item.quantity}`
      }
    }

    // 6. Get last known cost
    const cost = await negativeBatchService.calculateNegativeBatchCost(item.productId, shortage)

    // 7. Create negative batch
    const negativeBatch = await negativeBatchService.createNegativeBatch({
      productId: item.productId,
      quantity: -shortage,
      cost: cost,
      reason: item.reason || 'Automatic negative batch creation',
      sourceOperationType: context?.sourceType || 'manual_writeoff',
      affectedRecipeIds: context?.affectedRecipeIds,
      userId: context?.userId,
      shiftId: context?.shiftId
    })

    // 8. Create expense transaction (financial tracking)
    await writeOffExpenseService.recordNegativeBatchExpense(negativeBatch)

    // 9. Log warning
    console.warn(`⚠️ Negative batch created for ${item.productName}: ${shortage} units at cost ${cost}`)
  }

  return { success: true }
}
```

**File**: `src/stores/preparation/composables/usePreparationWriteOff.ts`

- Same enhancement for preparations

**Phase 2.2: Write-Off Expense Service**

**New File**: `src/stores/storage/services/writeOffExpenseService.ts`

```typescript
import { useAccountStore } from '@/stores/account'
import type { Batch } from '@/types/storage'

class WriteOffExpenseService {
  // Record expense when negative batch is created
  async recordNegativeBatchExpense(batch: Batch): Promise<void> {
    const accountStore = useAccountStore()

    // Get default expense account (acc_1 or configurable)
    const defaultAccount = accountStore.accounts.find(a => a.name === 'acc_1')
    if (!defaultAccount) {
      console.error('No default account found for expense recording')
      return
    }

    // Calculate total cost
    const totalCost = Math.abs(batch.quantity) * batch.cost_per_unit

    // Create expense transaction using existing method
    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: 'expense',
      amount: -totalCost, // negative amount for expense
      description: `Negative inventory write-off: ${batch.product_name || 'Unknown'} (${Math.abs(batch.quantity)} ${batch.unit})`,
      expenseCategory: {
        type: 'daily',
        category: 'food_cost' // NEW category (or use 'product' if not adding new)
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })
  }

  // Record income when correction transaction is created (reconciliation)
  async recordCorrectionIncome(params: {
    productName: string
    quantity: number
    costPerUnit: number
    unit: string
  }): Promise<void> {
    const accountStore = useAccountStore()

    const defaultAccount = accountStore.accounts.find(a => a.name === 'acc_1')
    if (!defaultAccount) {
      console.error('No default account found for correction recording')
      return
    }

    const totalCost = params.quantity * params.costPerUnit

    // Create INCOME transaction (not expense!)
    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: 'income', // ← Important: INCOME, not expense
      amount: totalCost, // positive amount
      description: `Inventory correction (surplus): ${params.productName} (${params.quantity} ${params.unit})`,
      expenseCategory: {
        type: 'daily',
        category: 'inventory_variance' // NEW category (or use 'other' if not adding new)
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })
  }
}

export const writeOffExpenseService = new WriteOffExpenseService()
```

**Note:** `createOperation()` accepts `CreateOperationDto`:

```typescript
interface CreateOperationDto {
  accountId: string
  type: 'income' | 'expense' | 'transfer' | 'correction'
  amount: number
  description: string
  expenseCategory?: ExpenseCategory // Required for expense, optional for income
  performedBy: TransactionPerformer
  counteragentId?: string
  counteragentName?: string
  relatedOrderIds?: string[]
  relatedPaymentId?: string
}
```

**Phase 2.3: Auto-Reconciliation Service**

**New File**: `src/stores/storage/services/reconciliationService.ts`

```typescript
import { negativeBatchService as productNegativeBatchService } from './negativeBatchService'
import { negativeBatchService as preparationNegativeBatchService } from '@/stores/preparation/services/negativeBatchService'
import { writeOffExpenseService } from './writeOffExpenseService'
import { useStorageStore } from '@/stores/storage/storageStore'
import { usePreparationStore } from '@/stores/preparation/preparationStore'

class ReconciliationService {
  // Called when new batch is added to product/preparation
  async autoReconcileOnNewBatch(
    entityId: string,
    entityType: 'product' | 'preparation'
  ): Promise<void> {
    const negativeBatchService =
      entityType === 'product' ? productNegativeBatchService : preparationNegativeBatchService

    const entityStore = entityType === 'product' ? useStorageStore() : usePreparationStore()

    // 1. Check for unreconciled negative batches
    const negativeBatches = await negativeBatchService.getNegativeBatches(entityId)
    if (negativeBatches.length === 0) return

    // 2. Get entity info for transaction description
    const entity =
      entityType === 'product'
        ? entityStore.products.find(p => p.id === entityId)
        : entityStore.preparations.find(p => p.id === entityId)

    if (!entity) {
      console.error(`Entity not found: ${entityType} ${entityId}`)
      return
    }

    // 3. Process each negative batch for reconciliation
    for (const negativeBatch of negativeBatches) {
      const quantity = Math.abs(negativeBatch.quantity)
      const costPerUnit = negativeBatch.cost_per_unit

      // 4. Create inventory correction INCOME transaction
      // This offsets the expense created when negative batch was made
      await writeOffExpenseService.recordCorrectionIncome({
        productName: entity.name,
        quantity: quantity,
        costPerUnit: costPerUnit, // Use cost from negative batch (NOT new batch cost!)
        unit: negativeBatch.unit
      })

      // 5. Mark negative batch as reconciled
      await negativeBatchService.markAsReconciled(negativeBatch.id)

      console.info(
        `✅ Reconciled negative batch: ${entity.name} (+${quantity} ${negativeBatch.unit} @ ${costPerUnit})`
      )
    }

    // 6. Log summary
    const totalQty = negativeBatches.reduce((sum, b) => sum + Math.abs(b.quantity), 0)
    console.info(
      `✅ Auto-reconciled ${negativeBatches.length} negative batches for ${entityType} ${entity.name} (total: ${totalQty})`
    )
  }
}

export const reconciliationService = new ReconciliationService()
```

**Key Points:**

- Uses `writeOffExpenseService.recordCorrectionIncome()` to create INCOME transaction
- Cost from negative batch (not new batch) → maintains FIFO principle
- Each negative batch reconciled separately (for audit trail)
- Marks batches as reconciled after transaction created

**Integration Point**:

- Call `reconciliationService.autoReconcileOnNewBatch()` when user adds new batch in inventory management UI
- Hook into existing "Add Batch" flows in Storage and Preparation stores

**Phase 2.4: POS Order Integration**

**File**: `src/views/pos/payment/PaymentDialog.vue` (or extract to service)

**Current Flow**:

```
Order Payment → Write off inventory → Complete payment
```

**Updated Flow**:

```typescript
// When processing payment, pass context to write-off
const writeOffContext = {
  sourceType: 'pos_order' as const,
  affectedRecipeIds: order.items.map(item => item.recipeId).filter(Boolean),
  userId: authStore.user?.id,
  shiftId: posStore.currentShift?.id
}

// Call enhanced write-off
await useWriteOff().writeOffProducts(writeOffItems, writeOffContext)
```

**Phase 2.5: Preparation Production Integration**

**File**: `src/views/Preparation/components/DirectPreparationProductionDialog.vue`

**Updated Flow**:

```typescript
// When producing preparations, pass context
const writeOffContext = {
  sourceType: 'preparation_production' as const,
  affectedRecipeIds: [preparationRecipeId],
  userId: authStore.user?.id
}

// Raw product write-offs may create negative batches
await useWriteOff().writeOffProducts(rawProductItems, writeOffContext)
```

---

### Sprint 3: Negative Inventory Report (4 days)

**Phase 3.1: Report Data Store**

**New File**: `src/stores/reports/negativeInventoryReportStore.ts`

```typescript
interface NegativeInventoryReportStore {
  // Fetch all products/preparations with negative batches
  async fetchNegativeInventoryData(filters: {
    dateFrom?: Date
    dateTo?: Date
    category?: string
    entityType?: 'product' | 'preparation' | 'all'
  }): Promise<NegativeInventoryItem[]>

  // Get reconciliation history for entity
  async getReconciliationHistory(entityId: string): Promise<ReconciliationEvent[]>

  // Calculate cost impact
  calculateTotalCostImpact(items: NegativeInventoryItem[]): number

  // Group by source operation type
  groupBySourceOperation(items: NegativeInventoryItem[]): Map<string, NegativeInventoryItem[]>

  // Identify frequently affected recipes
  getProblematicRecipes(items: NegativeInventoryItem[]): RecipeAnalysis[]
}

interface NegativeInventoryItem {
  entityId: string
  entityName: string
  entityType: 'product' | 'preparation'
  category: string
  negativeBatches: Batch[]
  totalNegativeQty: number
  totalCostImpact: number
  firstOccurrence: Date
  lastOccurrence: Date
  occurrenceCount: number
  sourceOperations: string[]
  affectedRecipes: Recipe[]
  reconciledCount: number
  unreconciledCount: number
}
```

**Phase 3.2: Report View Component**

**New File**: `src/views/reports/NegativeInventoryReport.vue`

**UI Sections**:

1. **Summary Cards**:

   - Total products with negative inventory
   - Total cost impact
   - Most frequent source operation
   - Top 5 problematic recipes

2. **Main Table** (sortable, filterable):

   - Columns: Product/Prep Name, Category, Negative Qty, Cost Impact, First Occurrence, Last Occurrence, Count, Source Operations, Status (Reconciled/Active)
   - Default sort: **Oldest first** + **Largest quantity discrepancy**
   - Actions: View details, View reconciliation history, Export

3. **Recipe Analysis Section**:

   - List recipes that frequently cause negative inventory
   - Show: Recipe name, Times caused negative, Total qty impact, Affected ingredients
   - Purpose: Identify recipe errors or portioning issues

4. **Filters**:

   - Date range
   - Product category
   - Entity type (product/preparation/both)
   - Status (active/reconciled/all)
   - Source operation type

5. **Export**:
   - CSV/Excel export
   - Include all data + reconciliation history

**Phase 3.3: Navigation Integration**

**File**: `src/router/index.ts`

- Add route: `/reports/negative-inventory`

**File**: `src/layouts/MainLayout.vue` (or navigation component)

- Add link in Reports section

**File**: `src/views/backoffice/analytics/PLReportView.vue`

- Add conditional alert/link if negative inventory detected:
  ```vue
  <v-alert v-if="hasNegativeInventory" type="warning" class="mb-4">
    Negative inventory detected.
    <router-link to="/reports/negative-inventory">View Negative Inventory Report</router-link>
  </v-alert>
  ```

---

### Sprint 4: Migration & Deployment (3 days)

**Phase 4.1: Database Migrations**

**Migration 023**: `src/supabase/migrations/023_negative_inventory_support.sql`

```sql
-- Add negative inventory support to batches table
ALTER TABLE batches ADD COLUMN is_negative BOOLEAN DEFAULT FALSE;
ALTER TABLE batches ADD COLUMN source_batch_id UUID REFERENCES batches(id);
ALTER TABLE batches ADD COLUMN negative_created_at TIMESTAMPTZ;
ALTER TABLE batches ADD COLUMN negative_reason TEXT;
ALTER TABLE batches ADD COLUMN source_operation_type TEXT;
ALTER TABLE batches ADD COLUMN affected_recipe_ids UUID[];
ALTER TABLE batches ADD COLUMN reconciled_at TIMESTAMPTZ;

-- Add negative inventory support to products table
ALTER TABLE products ADD COLUMN allow_negative_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN last_known_cost DECIMAL(10,2);

-- Add negative inventory support to preparations table
ALTER TABLE preparations ADD COLUMN allow_negative_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE preparations ADD COLUMN last_known_cost DECIMAL(10,2);

-- Add check constraint for source_operation_type
ALTER TABLE batches ADD CONSTRAINT batches_source_operation_type_check
  CHECK (source_operation_type IN ('pos_order', 'preparation_production', 'manual_writeoff'));
```

**Migration 024**: `src/supabase/migrations/024_backfill_last_known_costs.sql`

```sql
-- Backfill last_known_cost for products from most recent batch
UPDATE products p
SET last_known_cost = (
  SELECT b.cost_per_unit
  FROM batches b
  WHERE b.product_id = p.id
    AND b.is_negative = FALSE
    AND b.quantity > 0
  ORDER BY b.created_at DESC
  LIMIT 1
);

-- Backfill last_known_cost for preparations from most recent batch
UPDATE preparations p
SET last_known_cost = (
  SELECT b.cost_per_unit
  FROM batches b
  WHERE b.preparation_id = p.id
    AND b.is_negative = FALSE
    AND b.quantity > 0
  ORDER BY b.created_at DESC
  LIMIT 1
);

-- Set to 0 if no batch history exists
UPDATE products SET last_known_cost = 0 WHERE last_known_cost IS NULL;
UPDATE preparations SET last_known_cost = 0 WHERE last_known_cost IS NULL;
```

**Migration 025**: `src/supabase/migrations/025_negative_inventory_indexes.sql`

```sql
-- Index for fast negative batch lookups
CREATE INDEX idx_batches_is_negative ON batches(is_negative) WHERE is_negative = TRUE;

-- Index for source batch lookups
CREATE INDEX idx_batches_source_batch_id ON batches(source_batch_id) WHERE source_batch_id IS NOT NULL;

-- Index for reconciliation status
CREATE INDEX idx_batches_reconciled_at ON batches(reconciled_at) WHERE is_negative = TRUE;

-- Index for products allowing negative inventory
CREATE INDEX idx_products_allow_negative ON products(allow_negative_inventory) WHERE allow_negative_inventory = TRUE;

-- Index for preparations allowing negative inventory
CREATE INDEX idx_preparations_allow_negative ON preparations(allow_negative_inventory) WHERE allow_negative_inventory = TRUE;

-- Index for source operation type filtering
CREATE INDEX idx_batches_source_operation_type ON batches(source_operation_type) WHERE source_operation_type IS NOT NULL;
```

**Migration 026**: `src/supabase/migrations/026_negative_inventory_rls.sql`

```sql
-- RLS policies for negative batches (assuming existing RLS enabled on batches table)

-- Allow authenticated users to read negative batches
-- (Assuming existing policy allows reading all batches, this is just explicit)
CREATE POLICY "Allow authenticated users to read negative batches"
  ON batches FOR SELECT
  TO authenticated
  USING (is_negative = TRUE);

-- Allow admin, manager, cashier to insert negative batches
-- (This should align with existing batch insert policies)
CREATE POLICY "Allow authorized roles to insert negative batches"
  ON batches FOR INSERT
  TO authenticated
  WITH CHECK (
    is_negative = TRUE
    AND auth.jwt() ->> 'role' IN ('admin', 'manager', 'cashier')
  );

-- Allow only admin to delete negative batches (audit trail preservation)
CREATE POLICY "Allow only admin to delete negative batches"
  ON batches FOR DELETE
  TO authenticated
  USING (
    is_negative = TRUE
    AND auth.jwt() ->> 'role' = 'admin'
  );

-- Allow authorized users to mark batches as reconciled (update reconciled_at)
CREATE POLICY "Allow authorized roles to reconcile negative batches"
  ON batches FOR UPDATE
  TO authenticated
  USING (
    is_negative = TRUE
    AND auth.jwt() ->> 'role' IN ('admin', 'manager')
  )
  WITH CHECK (
    is_negative = TRUE
    AND auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

-- Allow authenticated users to read last_known_cost
-- (Assuming existing policies allow reading products/preparations, this is explicit)
-- Products
CREATE POLICY "Allow authenticated users to read product last_known_cost"
  ON products FOR SELECT
  TO authenticated
  USING (last_known_cost IS NOT NULL);

-- Preparations
CREATE POLICY "Allow authenticated users to read preparation last_known_cost"
  ON preparations FOR SELECT
  TO authenticated
  USING (last_known_cost IS NOT NULL);

-- Allow only admin to modify allow_negative_inventory flag
CREATE POLICY "Allow admin to modify allow_negative_inventory for products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow admin to modify allow_negative_inventory for preparations"
  ON preparations FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

**Phase 4.2: Migration Testing (DEV Database)**

**Process**:

1. Use MCP tools to apply migrations to DEV database:

   ```typescript
   mcp__supabase__apply_migration({
     name: '023_negative_inventory_support',
     query: '-- SQL from migration file --'
   })
   ```

2. Verify schema changes:

   ```typescript
   mcp__supabase__list_tables({ schemas: ['public'] })
   ```

3. Test backfill migration:

   ```typescript
   mcp__supabase__execute_sql({
     query: 'SELECT id, name, last_known_cost FROM products LIMIT 10;'
   })
   ```

4. Verify indexes:

   ```typescript
   mcp__supabase__execute_sql({
     query: `
       SELECT schemaname, tablename, indexname
       FROM pg_indexes
       WHERE tablename IN ('batches', 'products', 'preparations')
       ORDER BY tablename, indexname;
     `
   })
   ```

5. Check RLS policies:
   ```typescript
   mcp__supabase__get_advisors({ type: 'security' })
   ```

**Phase 4.3: Production Deployment**

**Pre-Deployment Checklist**:

- [ ] All migrations tested on DEV database
- [ ] Schema changes verified (columns, constraints, indexes)
- [ ] RLS policies tested
- [ ] Backfill migration completed successfully on DEV
- [ ] Code deployed to staging/preview environment
- [ ] Manual testing completed on staging
- [ ] Production database backup created

**Deployment Steps**:

1. **Apply migrations to production** (via Supabase SQL Editor or CLI):

   - Execute 023_negative_inventory_support.sql
   - Execute 024_backfill_last_known_costs.sql
   - Execute 025_negative_inventory_indexes.sql
   - Execute 026_negative_inventory_rls.sql

2. **Verify migration success**:

   ```sql
   -- Check row counts
   SELECT
     (SELECT COUNT(*) FROM products WHERE last_known_cost IS NOT NULL) as products_with_cost,
     (SELECT COUNT(*) FROM preparations WHERE last_known_cost IS NOT NULL) as preps_with_cost,
     (SELECT COUNT(*) FROM batches WHERE is_negative = TRUE) as existing_negative_batches;

   -- Check indexes
   SELECT tablename, indexname FROM pg_indexes
   WHERE tablename IN ('batches', 'products', 'preparations')
   AND indexname LIKE 'idx_%negative%';
   ```

3. **Deploy application code** (Vercel auto-deploy from main branch)

4. **Monitor for 24 hours**:

   - Check error logs: `mcp__supabase__get_logs({ service: 'api' })`
   - Monitor negative batch creation frequency
   - Verify expense transactions are created
   - Check P&L report includes new expenses

5. **Post-deployment verification**:
   - Test POS order with insufficient inventory
   - Test direct preparation production with low stock
   - Verify negative inventory report shows data
   - Test auto-reconciliation when adding new batch
   - Verify expense appears in P&L report

**Phase 4.4: Monitoring & Alerts**

**Key Metrics to Track**:

- Negative batch creation frequency (per day/week)
- Products that frequently go negative
- Recipes with highest negative impact
- Cost accuracy (estimated vs actual when reconciled)
- Reconciliation lag time (time between negative creation and reconciliation)

**Potential Issues**:

- High frequency of negative batches → recipe accuracy problem
- Specific products always negative → forecasting problem
- Same recipes repeatedly → portioning training needed
- Large cost discrepancies → last_known_cost not updating properly

---

## File Structure Summary

### New Files (10 total)

```
src/stores/storage/services/negativeBatchService.ts
src/stores/preparation/services/negativeBatchService.ts
src/stores/storage/services/writeOffExpenseService.ts
src/stores/storage/services/reconciliationService.ts
src/stores/reports/negativeInventoryReportStore.ts
src/views/reports/NegativeInventoryReport.vue
src/supabase/migrations/023_negative_inventory_support.sql
src/supabase/migrations/024_backfill_last_known_costs.sql
src/supabase/migrations/025_negative_inventory_indexes.sql
src/supabase/migrations/026_negative_inventory_rls.sql
```

### Modified Files (8 total)

```
src/types/storage.ts (add negative batch types)
src/types/preparation.ts (add negative batch types)
src/stores/storage/storageStore.ts (add updateProductLastKnownCost, canGoNegative)
src/stores/preparation/preparationStore.ts (add updatePreparationLastKnownCost, canGoNegative)
src/stores/storage/composables/useWriteOff.ts (enhance with negative batch creation)
src/stores/preparation/composables/usePreparationWriteOff.ts (enhance with negative batch creation)
src/views/pos/payment/PaymentDialog.vue (pass context to write-offs)
src/views/Preparation/components/DirectPreparationProductionDialog.vue (pass context to write-offs)
```

### Minimal Changes (2 files)

```
src/router/index.ts (add route for negative inventory report)
src/views/backoffice/analytics/PLReportView.vue (add alert/link if negative inventory exists)
```

**Total**: 20 files (10 new, 8 modified, 2 minimal changes)

**No changes needed**:

- ❌ Account Store (using existing methods)
- ❌ P&L calculation logic (existing logic works)
- ❌ Storage/Preparation views (no UI changes)
- ❌ Inventory adjustment dialogs (existing work fine)

---

## Timeline Summary

**Sprint 1**: 5 days (Database + Services)
**Sprint 2**: 7 days (Write-off logic + Auto-reconciliation)
**Sprint 3**: 4 days (Reporting)
**Sprint 4**: 3 days (Migration + Deployment)

**Total**: 19 days (~4 weeks)

---

## Key Business Rules (Reference)

1. **Negative batch creation**: Automatic, no approval needed
2. **Cost calculation**: Use last_known_cost from most recent batch
3. **Auto-reconciliation**: When new batch arrives, create +correction transaction
4. **Expense recording**: Create account transaction (type: expense, category: product)
5. **Root cause tracking**: Record source operation + affected recipes
6. **Report sorting**: Oldest first + largest quantity discrepancies
7. **Permission**: All authenticated users can trigger negative batches (via operations)
8. **FIFO costing**: Negative batches keep old cost, new batches have new cost

---

## Open Questions for Review

1. **Notification system**: Should managers receive alerts when negative batches are created? (Email/SMS/In-app?)
2. **Thresholds**: Should there be a maximum allowed negative quantity per product? (e.g., max -1000g)
3. **Manual reconciliation**: Should users be able to manually reconcile negative batches without adding new stock?
4. **Batch merging**: When correcting, should negative batch be merged with new batch, or kept separate for audit?
5. **Historical cutoff**: How long should reconciled negative batches be retained? (1 month, 6 months, forever?)
6. **Cost adjustment**: When reconciling, should user be able to adjust the estimated cost if it was incorrect?

---

## Dependencies

- ✅ Supabase database access (DEV: MCP tools, PROD: SQL Editor)
- ✅ Account Store (existing, no changes)
- ✅ P&L Report (existing, minimal changes)
- ✅ Write-off system (existing, enhancement needed)
- ✅ User authentication (for userId tracking)
- ✅ Shift management (for shiftId tracking)
- ✅ Recipe system (for affected recipe tracking)

---

## Risk Mitigation

**High-Risk Areas**:

1. **Concurrent write-offs**: Multiple users writing off same product simultaneously

   - Mitigation: Database-level locking, transaction isolation
   - Test: Simulate concurrent POS orders

2. **Cost accuracy**: Estimated costs may differ from actual

   - Mitigation: Regular audits via Negative Inventory Report
   - Alert managers when cost discrepancies are large

3. **Performance**: Querying last active batch on every write-off

   - Mitigation: Cache via `last_known_cost` field
   - Index on `batches(product_id, is_negative, created_at)`

4. **Data integrity**: Negative batches not reconciled properly
   - Mitigation: Auto-reconciliation + manual override
   - Report shows unreconciled batches prominently

**Medium-Risk Areas**:

1. **User confusion**: Staff may not understand negative inventory concept

   - Mitigation: Clear UI indicators (future sprint if needed)
   - Training documentation

2. **Abuse**: Staff may rely on negative inventory instead of proper stock management
   - Mitigation: Report highlights frequent offenders
   - Manager review workflow (future enhancement)

---

## Success Metrics (Post-Deployment)

**Week 1**:

- ✅ No operational blocks due to zero inventory
- ✅ All negative batches recorded with source operation
- ✅ Expense transactions created automatically
- ✅ P&L report includes negative inventory costs

**Week 2-4**:

- ✅ Auto-reconciliation working correctly
- ✅ Negative inventory report shows actionable data
- ✅ Identified top 5 problematic recipes
- ✅ Finance team confirms COGS accuracy

**Month 1**:

- ✅ Reduction in negative inventory frequency (due to recipe corrections)
- ✅ Improved stock forecasting based on negative patterns
- ✅ Staff trained on proper portioning
- ✅ System stable with no performance issues

---

## Final Implementation Checklist

### Phase 0: Preparation (Before Sprint 1)

**Decision: Expense Categories**

Option A: Add new categories to `src/stores/account/types.ts`

```typescript
export type DailyExpenseCategory =
  | 'product'
  | 'food_cost'              // NEW - explicit food cost from negative batches
  | 'inventory_variance'     // NEW - corrections (income/expense)
  | 'inventory_adjustment'   // NEW - monthly physical count adjustments
  | 'takeaway'
  | ... // rest
```

Option B: Reuse existing categories (simpler, no schema change)

```typescript
// Use 'product' for food_cost
// Use 'other' for inventory_variance
// Differentiate by transaction description
```

**Recommendation:** Option A (better P&L reporting, clearer categorization)

**Action Items:**

- [ ] Decide on expense categories (A or B)
- [ ] If Option A: Update `src/stores/account/types.ts`
- [ ] If Option A: Update database `account_transactions` table constraint (if exists)
- [ ] Review current P&L report calculation to ensure it handles new categories

---

### Sprint-by-Sprint Readiness

**Sprint 1: Foundation** ✅ Ready to Start

- Database migrations prepared (023-026)
- Service interfaces defined
- No blockers identified

**Sprint 2: Write-Off Logic** ⚠️ Requires Sprint 1 Complete

- Dependencies: negativeBatchService, database schema
- Integration points: useWriteOff, POS payment flow
- Testing: Create test scenarios for negative inventory

**Sprint 3: Reporting** ⚠️ Requires Sprint 2 Complete

- Dependencies: Negative batches exist in database
- Data aggregation from batches + transactions
- UI framework: Vuetify (already in use)

**Sprint 4: Deployment** ⚠️ Requires All Sprints Complete

- Migration testing on DEV
- Backfill validation
- Production deployment plan

---

## Critical Path & Dependencies

```
Sprint 1 (Database + Services)
  ↓
  ├─→ Migration 023 (schema)
  ├─→ Migration 024 (backfill)
  ├─→ negativeBatchService
  └─→ writeOffExpenseService
      ↓
Sprint 2 (Write-Off Logic)
  ↓
  ├─→ Enhanced useWriteOff
  ├─→ reconciliationService
  ├─→ POS integration
  └─→ Preparation integration
      ↓
Sprint 3 (Reporting)
  ↓
  ├─→ negativeInventoryReportStore
  └─→ NegativeInventoryReport.vue
      ↓
Sprint 4 (Deployment)
  ↓
  ├─→ Migration 025 (indexes)
  ├─→ Migration 026 (RLS)
  └─→ Production rollout
```

---

## Potential Issues & Solutions

### Issue 1: Account Store Signature Mismatch

**Problem:** `createOperation()` signature may require adjustments

**Current Signature (from exploration):**

```typescript
async createOperation(data: CreateOperationDto): Promise<Transaction>
```

**What We Need:**

```typescript
// Our writeOffExpenseService calls:
await accountStore.createOperation({
  accountId: string,
  type: 'expense' | 'income',
  amount: number,
  description: string,
  expenseCategory: { type: 'daily', category: string },
  performedBy: { type: 'api', id: string, name: string }
})
```

**Solution:** ✅ Already compatible (confirmed from types.ts read)

---

### Issue 2: Income Transaction with expenseCategory

**Problem:** Can we use `expenseCategory` field for `type: 'income'`?

**Why This Matters:**

When we create correction transaction (reconciliation), it's an **INCOME** transaction with a category:

```typescript
// Correction transaction = INCOME (surplus found)
await accountStore.createOperation({
  type: 'income', // ← This is income, not expense
  amount: +55000, // positive
  expenseCategory: {
    // ← But field name is "expenseCategory"
    type: 'daily',
    category: 'inventory_variance'
  }
})
```

**Current Validation (from accountStore.ts:373):**

```typescript
if (data.type === 'expense' && !data.expenseCategory) {
  throw new Error('Expense category is required for expense operations')
}
```

**Analysis:**

- ✅ Validation only **requires** expenseCategory for expense
- ✅ Does NOT **forbid** expenseCategory for income
- ✅ Field is **optional** in TypeScript (expenseCategory?: ExpenseCategory)

**Conclusion:** ✅ **Safe to use** - we can pass expenseCategory for income transactions

**Example:**

```typescript
// This works ✅
await accountStore.createOperation({
  type: 'income',
  amount: 55000,
  expenseCategory: { type: 'daily', category: 'inventory_variance' },
  description: 'Inventory correction'
})

// This also works ✅
await accountStore.createOperation({
  type: 'expense',
  amount: -55000,
  expenseCategory: { type: 'daily', category: 'food_cost' },
  description: 'Negative batch write-off'
})
```

**Note:** Field name `expenseCategory` is misleading but functional. In the future, could rename to `transactionCategory` for clarity, but NOT required for this sprint.

**Action:** ✅ RESOLVED - Use expenseCategory for both income and expense

---

### Issue 3: P&L Report Structure - Inventory Adjustments Section

**Business Logic (Your Requirement):**

```
Real Food Cost = Pure Sales Food Cost + All Losses - All Surplus

Example:
  Pure Sales Food Cost:  1,000,000₽  (normal POS orders)
  + Spoilage/Expired:      200,000₽  (rotten products written off)
  + Inventory Shortage:    150,000₽  (недостача при инвентаризации)
  - Inventory Surplus:     -60,000₽  (излишки при инвентаризации)
  ──────────────────────────────────
  = Real Food Cost:      1,290,000₽  (actual product expenses)
```

**P&L Report Structure (Updated):**

```
Revenue: 5,000,000₽

──────────────────────────────────────────────
COST OF GOODS SOLD (COGS):
──────────────────────────────────────────────
  Sales Food Cost:          -1,000,000₽  (from POS orders)
  Sales Beverage Cost:        -300,000₽  (from POS orders)
  ────────────────────────────────────────────
  Total Sales COGS:         -1,300,000₽

Gross Profit (from Sales): 3,700,000₽

──────────────────────────────────────────────
INVENTORY ADJUSTMENTS:  ← NEW SECTION
──────────────────────────────────────────────
  Losses:
    Spoilage/Expired:         -200,000₽  (category: write_off_spoilage)
    Inventory Shortage:       -150,000₽  (category: inventory_adjustment, amount < 0)
    Negative Batch Variance:   -40,000₽  (category: food_cost, from negative batches)

  Gains:
    Inventory Surplus:         +60,000₽  (category: inventory_variance, amount > 0)
    Reconciliation Corrections: +40,000₽  (category: inventory_variance, from auto-reconciliation)
  ────────────────────────────────────────────
  Total Adjustments:          -290,000₽

Real Food Cost: -1,590,000₽  (Sales COGS + Adjustments)

──────────────────────────────────────────────
OPERATING EXPENSES (OPEX):
──────────────────────────────────────────────
  Utilities:                  -100,000₽
  Salary:                     -800,000₽
  Rent:                       -400,000₽
  Transport:                   -50,000₽
  ────────────────────────────────────────────
  Total OPEX:               -1,350,000₽

──────────────────────────────────────────────
Net Profit: 1,760,000₽
──────────────────────────────────────────────
```

**Implementation Plan:**

**File:** `src/stores/analytics/plReportStore.ts`

**Current Code:**

```typescript
// Existing P&L calculation
const revenue = await salesStore.getTotalRevenue(dateFrom, dateTo)
const salesCOGS = await salesStore.getTotalCOGS(dateFrom, dateTo)
const expenses = await accountStore.getExpensesByDateRange(dateFrom, dateTo)
const opex = sumByExpenseCategory(expenses) // Excludes food_cost categories

const netProfit = revenue - salesCOGS - opex
```

**New Code (Add Inventory Adjustments Section):**

```typescript
// 1. Get all transactions with inventory-related categories
const allTransactions = await accountStore.getAllTransactions()
const dateFiltered = allTransactions.filter(t => t.createdAt >= dateFrom && t.createdAt <= dateTo)

// 2. Extract inventory adjustment transactions
const inventoryAdjustments = dateFiltered.filter(t => {
  if (!t.expenseCategory) return false

  const category = t.expenseCategory.category
  return [
    'food_cost', // Negative batch write-offs
    'inventory_variance', // Reconciliation corrections (income/expense)
    'inventory_adjustment' // Monthly physical count adjustments
    // Future: add more specific categories if needed
  ].includes(category)
})

// 3. Separate into losses and gains
const inventoryLosses = inventoryAdjustments
  .filter(t => t.amount < 0)
  .reduce((sum, t) => sum + Math.abs(t.amount), 0)

const inventoryGains = inventoryAdjustments
  .filter(t => t.amount > 0)
  .reduce((sum, t) => sum + t.amount, 0)

const totalAdjustments = -inventoryLosses + inventoryGains

// 4. Calculate Real Food Cost
const realFoodCost = salesCOGS + totalAdjustments

// 5. Updated P&L structure
const plReport = {
  revenue,
  salesCOGS,
  grossProfit: revenue - salesCOGS,

  // NEW SECTION
  inventoryAdjustments: {
    losses: inventoryLosses, // Always positive number
    gains: inventoryGains, // Always positive number
    total: totalAdjustments // Can be negative or positive
  },

  realFoodCost, // Sales COGS + Adjustments
  opex,
  netProfit: revenue - realFoodCost - opex
}
```

**Categories Mapping:**

| Transaction Type          | Category               | Type    | Description                                       |
| ------------------------- | ---------------------- | ------- | ------------------------------------------------- |
| Negative batch write-off  | `food_cost`            | expense | When inventory goes negative during POS order     |
| Reconciliation correction | `inventory_variance`   | income  | Auto-correction when new batch arrives (+surplus) |
| Monthly shortage          | `inventory_adjustment` | expense | Physical count shows less than system (-shortage) |
| Monthly surplus           | `inventory_adjustment` | income  | Physical count shows more than system (+surplus)  |
| Spoilage                  | `inventory_adjustment` | expense | Expired/rotten products written off               |

**UI Display (P&L Report View):**

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

    <div class="gross-profit">
      <h3>Gross Profit (from Sales)</h3>
      <div class="amount">{{ formatIDR(report.grossProfit) }}</div>
    </div>

    <!-- NEW: Inventory Adjustments Section -->
    <section class="inventory-adjustments">
      <h3>Inventory Adjustments</h3>

      <div class="subsection">
        <h4>Losses:</h4>
        <div class="line-item">
          <span>Spoilage/Expired:</span>
          <span class="negative">{{ formatIDR(report.inventoryAdjustments.spoilage) }}</span>
        </div>
        <div class="line-item">
          <span>Inventory Shortage:</span>
          <span class="negative">{{ formatIDR(report.inventoryAdjustments.shortage) }}</span>
        </div>
        <div class="line-item">
          <span>Negative Batch Variance:</span>
          <span class="negative">{{ formatIDR(report.inventoryAdjustments.negativeBatch) }}</span>
        </div>
      </div>

      <div class="subsection">
        <h4>Gains:</h4>
        <div class="line-item">
          <span>Inventory Surplus:</span>
          <span class="positive">{{ formatIDR(report.inventoryAdjustments.surplus) }}</span>
        </div>
        <div class="line-item">
          <span>Reconciliation Corrections:</span>
          <span class="positive">{{ formatIDR(report.inventoryAdjustments.reconciliation) }}</span>
        </div>
      </div>

      <div class="total" :class="{ negative: report.inventoryAdjustments.total < 0 }">
        <span>Total Adjustments:</span>
        <span>{{ formatIDR(report.inventoryAdjustments.total) }}</span>
      </div>

      <!-- Link to Negative Inventory Report -->
      <v-alert v-if="hasNegativeInventory" type="warning" class="mt-4">
        <div class="d-flex align-center justify-space-between">
          <span>Negative inventory detected in this period</span>
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

    <!-- Real Food Cost (Sales COGS + Adjustments) -->
    <div class="real-food-cost">
      <h3>Real Food Cost</h3>
      <div class="amount negative">{{ formatIDR(report.realFoodCost) }}</div>
      <div class="formula">
        Sales COGS ({{ formatIDR(report.salesCOGS) }}) + Adjustments ({{
          formatIDR(report.inventoryAdjustments.total)
        }})
      </div>
    </div>

    <!-- OPEX Section -->
    <section class="opex">
      <h3>Operating Expenses</h3>
      <!-- ... existing OPEX items ... -->
    </section>

    <!-- Net Profit -->
    <div class="net-profit">
      <h3>Net Profit</h3>
      <div class="amount">{{ formatIDR(report.netProfit) }}</div>
    </div>
  </div>
</template>
```

**Action Items:**

1. ✅ **Add new categories** to `src/stores/account/types.ts`:

   - `food_cost`
   - `inventory_variance`
   - `inventory_adjustment`

2. ⚠️ **Update `plReportStore.ts`**:

   - Add inventory adjustments calculation
   - Separate losses vs gains
   - Calculate Real Food Cost

3. ⚠️ **Update `PLReportView.vue`**:
   - Add Inventory Adjustments section UI
   - Show losses and gains separately
   - Display Real Food Cost prominently
   - Add link to Negative Inventory Report

**Action:** Update P&L Report implementation in Sprint 3 (after negative batches are working)

---

### Issue 4: Batch Cost Field Name

**Assumption:** Batches have `cost_per_unit` field

**Need to verify:**

- `src/types/storage.ts` - Batch interface
- Database `batches` table schema

**If field name is different:**

- Update all references in services
- Update migration SQL

**Action:** Verify Batch type definition before Sprint 1

---

## Pre-Sprint 1 Verification Tasks

Before starting implementation, verify these assumptions:

### 1. Database Schema Check

```typescript
mcp__supabase__list_tables({ schemas: ['public'] })
```

**Verify tables exist:**

- ✅ `batches` table
- ✅ `products` table
- ✅ `preparations` table
- ✅ `account_transactions` table

**Verify columns:**

- `batches.cost_per_unit` (or similar)
- `batches.product_id` / `batches.preparation_id`
- `batches.quantity`
- `batches.unit`

### 2. Types Check

**Files to verify:**

```
src/types/storage.ts
src/types/preparation.ts
src/stores/account/types.ts
```

**Verify interfaces:**

- `Batch` interface has cost field
- `Product` interface structure
- `Preparation` interface structure
- `CreateOperationDto` accepts our parameters

### 3. Account Store Methods Check

**Verify methods exist:**

- `createOperation(data: CreateOperationDto)`
- `getExpensesByDateRange(from, to)` (for P&L)

**Verify expenseCategory handling:**

- Can we use it for income type?
- Validation rules

### 4. Write-Off Composables Check

**Files:**

```
src/stores/storage/composables/useWriteOff.ts
src/stores/preparation/composables/usePreparationWriteOff.ts
```

**Verify:**

- Current FIFO logic
- WriteOffItem interface
- Return type (ServiceResponse)
- Where to inject negative batch logic

---

## Next Steps (Action Plan)

### Immediate (Before Coding)

1. **Run verification tasks** (database schema, types, methods)
2. **Decide on expense categories** (Option A or B)
3. **Review with team** (confirm business logic, priorities)
4. **Set up DEV environment** (ensure MCP tools working)

### Sprint 1 Start

1. **Create migration 023** (test on DEV first)
2. **Implement negativeBatchService** (products first, then preparations)
3. **Implement writeOffExpenseService** (test with mock data)
4. **Update storageStore** (add updateProductLastKnownCost method)
5. **Test end-to-end** (create negative batch → verify expense transaction)

### After Each Sprint

1. **Manual testing** (key scenarios)
2. **Code review** (team review)
3. **Update documentation** (if needed)
4. **Demo to stakeholders** (show progress)

---

## Questions to Resolve Before Starting

1. ✅ **Cost accounting approach:** Variant A (FIFO with fixed price correction) - **DECIDED**
2. ✅ **Auto-reconciliation:** Create correction transaction on new batch arrival - **DECIDED**
3. ✅ **Permissions:** Always automatic, no approval - **DECIDED**
4. ✅ **Root cause tracking:** Track source operation + affected recipes - **DECIDED**
5. ✅ **Expense categories:** Add new categories (food_cost, inventory_variance, inventory_adjustment) - **DECIDED**
6. ✅ **Income transactions:** Can use expenseCategory field for income type (validation allows) - **RESOLVED**
7. ✅ **P&L report:** Add separate Inventory Adjustments section with Losses/Gains subsections - **DECIDED**

---

## Summary: Ready to Proceed?

**✅ GREEN (Ready to Start):**

- ✅ Strategic approach defined (Variant A - FIFO with fixed price correction)
- ✅ Practical example documented (potato scenario with 3-day timeline)
- ✅ Database migrations prepared (023-026)
- ✅ Service architecture designed (negativeBatchService, writeOffExpenseService, reconciliationService)
- ✅ Integration points identified (useWriteOff, POS payment, preparation production)
- ✅ **NEW: Expense categories decided** (add food_cost, inventory_variance, inventory_adjustment)
- ✅ **NEW: Income transaction handling resolved** (can use expenseCategory field)
- ✅ **NEW: P&L structure defined** (separate Inventory Adjustments section with Real Food Cost)

**⚠️ YELLOW (Needs Verification Before Sprint 1):**

- ⚠️ Batch cost field name (`cost_per_unit` vs other)
- ⚠️ Database schema check (verify tables exist)
- ⚠️ TypeScript types check (Batch, Product, Preparation interfaces)
- ⚠️ Write-off composables current implementation

**❌ RED (Blockers):**

- None identified ✅

**Decision Summary:**

| Decision              | Choice                            | Rationale                                             |
| --------------------- | --------------------------------- | ----------------------------------------------------- |
| Cost Accounting       | Variant A (FIFO fixed price)      | Simple, industry standard, 5-10% variance acceptable  |
| Auto-Reconciliation   | Correction = Income transaction   | Offsets negative batch expense, maintains audit trail |
| Correction Price      | Use negative batch cost (not new) | FIFO principle, consistent accounting                 |
| Expense Categories    | Add 3 new categories              | Clear P&L reporting, better analysis                  |
| Income Category Field | Use expenseCategory for both      | Validation allows, no schema change needed            |
| P&L Structure         | Separate Adjustments section      | Shows Real Food Cost = Sales COGS + Adjustments       |

**New Categories to Add:**

```typescript
// src/stores/account/types.ts
export type DailyExpenseCategory =
  | 'product'
  | 'food_cost' // ← NEW: Negative batch write-offs
  | 'inventory_variance' // ← NEW: Reconciliation corrections (income/expense)
  | 'inventory_adjustment' // ← NEW: Monthly physical count, spoilage
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

**P&L Report Formula:**

```
Real Food Cost = Sales COGS + Inventory Adjustments

Where:
  Inventory Adjustments = Losses - Gains
  Losses = Spoilage + Shortage + Negative Batch Variance
  Gains = Surplus + Reconciliation Corrections

Example:
  Sales COGS:             -1,000,000₽
  Spoilage:                 -200,000₽
  Shortage:                 -150,000₽
  Negative Batch:            -40,000₽
  Surplus:                   +60,000₽
  Reconciliation:            +40,000₽
  ────────────────────────────────────
  Real Food Cost:         -1,290,000₽
```

**Next Steps:**

1. ✅ **Phase 0: Add expense categories** (5 min)

   - Update `src/stores/account/types.ts`
   - No database migration needed (category is just enum value)

2. ⚠️ **Verification Tasks** (30 min)

   - Run database schema check
   - Verify Batch type definition
   - Check write-off composables

3. ✅ **Sprint 1: Start Implementation** (5 days)
   - Create migration 023
   - Implement negativeBatchService
   - Test on DEV database

**Estimated Time to Production:** 19 days (4 sprints) + 0.5 day (verification) = **19.5 days**

**Ready to start?** ✅ YES - All critical decisions made, only verification tasks remain
