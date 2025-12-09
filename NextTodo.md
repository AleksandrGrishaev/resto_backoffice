# Sprint: Unification of DecompositionEngine

---

## Progress

| Phase               | Status  | Notes                                     |
| ------------------- | ------- | ----------------------------------------- |
| Phase 1: Foundation | ✅ DONE | Core engine, types, utils created         |
| Phase 2: Adapters   | ✅ DONE | WriteOffAdapter, CostAdapter created      |
| Code Review         | ✅ DONE | 4 issues fixed, build passing             |
| Phase 3: Migration  | ✅ DONE | recipeWriteOffStore + salesStore migrated |
| Phase 4: Cleanup    | ✅ DONE | ~1,728 lines deleted, docs updated        |

### Phase 4 Completed (2025-12-09)

**Executed steps:**

1. ✅ Created `batchAllocationUtils.ts` - shared FIFO allocation functions
2. ✅ Updated `CostAdapter.ts` - uses batchAllocationUtils
3. ✅ Updated `useCostCalculation.ts` - uses batchAllocationUtils
4. ✅ Updated index exports
5. ✅ Build check - passing
6. ✅ Deleted `useKitchenDecomposition.ts` (~540 lines)
7. ✅ Deleted `useDecomposition.ts` (~533 lines)
8. ✅ Deleted `useActualCostCalculation.ts` (~655 lines)
9. ✅ Updated documentation (DECOMPOSITION_ARCHITECTURE.md, SALE_FLOW.md)
10. ✅ Final verification - build passing, no old imports

**Total code removed:** ~1,728 lines

**New file created:**

- `src/core/decomposition/utils/batchAllocationUtils.ts` - shared FIFO allocation logic

### Phase 3 Completed (2025-12-09)

**Files Updated:**
| File | Changes |
|------|---------|
| `recipeWriteOffStore.ts` | Replaced `useDecomposition()` with `DecompositionEngine + WriteOffAdapter` |
| `salesStore.ts` | Replaced `useDecomposition()` + `useActualCostCalculation()` with `DecompositionEngine + WriteOffAdapter + CostAdapter` |

**Deferred to Phase 4:**

- `useCostCalculation.ts` - uses different signature for batch allocation (direct parameters vs nodes). Will be updated when `useActualCostCalculation.ts` is deleted.

**Build:** ✅ Passing

---

### Code Review Completed (2025-12-09)

**Issues Fixed:**
| # | Severity | File | Issue | Status |
|---|----------|------|-------|--------|
| 1 | Minor | DecompositionEngine.ts | Unused import `DEFAULT_WRITEOFF_OPTIONS` | ✅ Fixed |
| 5 | Medium | CostAdapter.ts | Duplicate types (BatchAllocation, etc.) | ✅ Fixed - import from sales/types |
| 6 | Medium | CostAdapter.ts | `any` types for stores | ✅ Fixed - added store type definitions |
| 8 | Minor | CostAdapter.ts | Batch priority order incorrect | ✅ Fixed - positive first, then negative |

**Deferred to Phase 4:**

- Issue #2: `require()` → dynamic `import()` (minor)
- Issue #3: menuStore initialization check (minor)
- Issue #4: Unit tests (info)
- Issue #9: Error handling in CostAdapter (info)

**Build:** ✅ Passing

---

### Phase 2 Completed (2025-12-09)

**Files created:**

```
src/core/decomposition/adapters/
├── IDecompositionAdapter.ts    # Interface + config types
├── WriteOffAdapter.ts          # For inventory write-off (DecomposedItem[])
├── CostAdapter.ts              # For FIFO cost calculation (ActualCostBreakdown)
└── index.ts                    # Adapter exports
```

**Key exports:**

- `WriteOffAdapter` - transforms DecomposedNodes to WriteOffItem[]
  - `createWriteOffAdapter(config?)` - factory function
  - `WriteOffResult` - includes items, totals, metadata
- `CostAdapter` - FIFO allocation from batches
  - `createCostAdapter(config?)` - factory function
  - `calculateActualCostFromNodes(nodes, config?)` - convenience function
  - `ActualCostBreakdown` - includes totalCost, preparationCosts, productCosts
- `IDecompositionAdapter<TOutput>` - interface for custom adapters

**WriteOffAdapter features:**

- Keeps preparations as final elements (not decomposed further)
- Converts DecomposedNodes to WriteOffItem[] format
- Merges duplicate items by type+id+unit
- Calculates base cost from product catalog
- Preparations have `costPerUnit: null` (FIFO in CostAdapter)

**CostAdapter features:**

- FIFO allocation from storage batches (products)
- FIFO allocation from preparation batches
- Handles negative batches (uses their cost)
- Falls back to baseCostPerUnit if no batches
- Calculates weighted average cost per item
- Lazy store initialization

---

### Phase 1 Completed (2025-12-09)

**Files created:**

```
src/core/decomposition/
├── types.ts                    # All types, StoreProvider, DecompositionError
├── DecompositionEngine.ts      # Main engine + factory + utilities
├── index.ts                    # Public exports
└── utils/
    ├── replacementUtils.ts     # getReplacementKey, buildReplacementMap
    ├── portionUtils.ts         # convertPortionToGrams, getPortionMultiplier
    └── yieldUtils.ts           # applyYieldAdjustment
```

**Key exports:**

- `DecompositionEngine` - class with `traverse()` method
- `createDecompositionEngine()` - async factory with auto-initialization
- `ensureStoresInitialized()` - lazy store initialization
- `DEFAULT_WRITEOFF_OPTIONS`, `DEFAULT_COST_OPTIONS` - presets
- Utility functions: `calculateTotalBaseCost`, `getNodeNames`, `filterProductNodes`, `filterPreparationNodes`

**Code review fixes applied:**

- Added `ensureStoresInitialized()` for lazy store initialization
- Added utility functions (`calculateTotalBaseCost`, `getNodeNames`, etc.)
- `createDecompositionEngine()` now async with `autoInitialize` parameter

---

## 1. Problem Analysis

### 1.1 Current Architecture Issue

The system has **2 main write-off points** where inventory is deducted:

#### Point 1: Preparation Production (Semi-finished products)

**When:** Chef creates a batch of preparation (e.g., 1kg of "Beef Stock")

**What happens:**

1. User goes to `Storage > Preparations > Create Receipt`
2. Selects preparation and quantity
3. System automatically writes off raw products (ingredients)
4. Creates new preparation batch with FIFO cost from ingredients

**Code flow:**

```
preparationService.createReceipt()
  → Step 0: Calculate ingredients from preparation.recipe
  → storageService.createWriteOff(raw products)
    → allocateFIFO() for each product
    → UPDATE storage_batches (reduce current_quantity)
    → CREATE storage_operations (type: write_off)
  → Step 1: CREATE preparation_batches (new batch)
  → Step 2: CREATE preparation_operations (type: receipt)
    → related_storage_operation_ids: [write-off IDs]
```

**Key files involved:**

- `src/stores/preparation/preparationService.ts:803-1088` - main logic
- `src/stores/storage/storageService.ts` - createWriteOff, allocateFIFO
- `src/stores/storage/negativeBatchService.ts` - negative batches for products

**DB tables affected:**

- `preparation_batches` - new batch created
- `preparation_operations` - receipt operation logged
- `storage_batches` - raw products reduced
- `storage_operations` - write-off operation logged

---

#### Point 2: POS Sale (Menu item sale)

**When:** Cashier completes payment for an order

**What happens:**

1. User in POS selects items, applies modifiers, discounts
2. Clicks "Pay" → PaymentDialog
3. Payment processed → Background job starts
4. System decomposes menu item → writes off preparations/products

**Code flow:**

```
PaymentDialog.vue → handleConfirm()
  → paymentsStore.processSimplePayment()
    → paymentsService.processPayment()
    → CREATE payments record
    → queueBackgroundSalesRecording() ← ASYNC!

queueBackgroundSalesRecording()
  → salesStore.recordSalesTransaction()
    → For each bill item:
      → decomposeMenuItem() ← useDecomposition
      → calculateActualCost() ← useActualCostCalculation (FIFO)
      → calculateItemProfit()
      → CREATE sales_transactions
      → recipeWriteOffStore.processItemWriteOff()
        → decomposeMenuItem() ← AGAIN!
        → storageService.createWriteOff() for products
        → preparationService.writeOffPreparations() for preparations
        → CREATE recipe_write_offs
```

**Key files involved:**

- `src/views/pos/payment/PaymentDialog.vue` - entry point
- `src/stores/pos/payments/paymentsStore.ts:87-314` - processSimplePayment
- `src/stores/sales/salesStore.ts:146-429` - recordSalesTransaction
- `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts` - processItemWriteOff

**DB tables affected:**

- `payments` - payment record
- `orders` - status updated
- `sales_transactions` - sale with profit_calculation, actual_cost
- `recipe_write_offs` - decomposition trace
- `storage_batches` / `preparation_batches` - quantities reduced
- `storage_operations` / `preparation_operations` - write-off logged

---

### 1.2 The Decomposition Problem

Both write-off points need to **decompose menu items** to understand what to write off.
Currently there are **3 separate services** doing similar work:

| Service                    | Location                                       | Purpose   | Preparations |
| -------------------------- | ---------------------------------------------- | --------- | ------------ |
| `useDecomposition`         | `src/stores/sales/recipeWriteOff/composables/` | Write-off | Keeps as-is  |
| `useActualCostCalculation` | `src/stores/sales/composables/`                | FIFO cost | Keeps as-is  |

**Note:** `useKitchenDecomposition` exists at `src/stores/pos/orders/composables/` but is **DEAD CODE** (never imported or used). Kitchen Display shows dish names + modifiers + comments, not ingredient decomposition. Will be deleted in Phase 4.

### 1.3 Duplicated Code (~250-300 lines)

**Identical in all 3 files:**

```typescript
// getReplacementKey() - 6 lines × 3 files
function getReplacementKey(target: TargetComponent): string {
  if (target.sourceType === 'recipe' && target.recipeId) {
    return `${target.recipeId}_${target.componentId}`
  }
  return `variant_${target.componentId}`
}

// buildReplacementMap - 15 lines × 3 files
const replacements = new Map<string, SelectedModifier>()
for (const modifier of selectedModifiers) {
  if (modifier.groupType === 'replacement' && !modifier.isDefault) {
    const key = getReplacementKey(modifier.targetComponent)
    replacements.set(key, modifier)
  }
}
```

**Similar traversal logic - 60 lines × 3 files:**

- Recipe component iteration
- Replacement check and swap
- Yield adjustment
- Portion to grams conversion
- Merge duplicates

### 1.4 Why This Is A Problem

1. **Bug in one place** → Need to fix in 3 places
2. **New feature (Replacement Modifiers)** → Changed 3 files
3. **Inconsistent behavior** → Each service has slight differences
4. **Hard to maintain** → 3× testing effort

---

## 2. Solution Architecture

### 2.1 New Structure

```
src/core/decomposition/
├── index.ts                        # Public exports
├── types.ts                        # All types and interfaces
├── DecompositionEngine.ts          # Single traversal engine
├── utils/
│   ├── replacementUtils.ts         # getReplacementKey, buildReplacementMap
│   ├── portionUtils.ts             # convertPortionToGrams, getPortionMultiplier
│   └── yieldUtils.ts               # applyYieldAdjustment
└── adapters/
    ├── IDecompositionAdapter.ts    # Adapter interface
    ├── WriteOffAdapter.ts          # For inventory write-off
    └── CostAdapter.ts              # For FIFO cost calculation
```

### 2.2 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    DecompositionEngine                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  traverse(input, options)                                 │  │
│  │  - Get menu item + variant                               │  │
│  │  - Build replacement map                                 │  │
│  │  - Iterate composition                                   │  │
│  │  - Apply replacements                                    │  │
│  │  - Apply yield (optional)                                │  │
│  │  - Convert portions (optional)                           │  │
│  │  - Recurse into recipes/preparations (optional)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                     │
           ▼                                     ▼
    WriteOffAdapter                        CostAdapter
    - keep preps                           - keep preps
    - apply yield                          - apply yield
    - convert portions                     - convert portions
    - merge duplicates                     - FIFO allocation
           │                                     │
           ▼                                     ▼
    DecomposedItem[]                  ActualCostBreakdown
```

### 2.3 Adapter Configuration

| Option                | WriteOff          | Cost         |
| --------------------- | ----------------- | ------------ |
| `preparationStrategy` | `'keep'`          | `'keep'`     |
| `applyYield`          | `true`            | `true`       |
| `convertPortions`     | `true`            | `true`       |
| `includePath`         | `true`            | `false`      |
| `costSource`          | `baseCostPerUnit` | FIFO batches |

---

## 3. Implementation Plan

### Phase 1: Foundation (2 days)

**Goal:** Create core engine with no external dependencies

**Tasks:**

- [ ] Create `src/core/decomposition/types.ts`
  - TraversalOptions interface
  - DecomposedNode interface
  - TraversalResult interface
  - MenuItemInput interface
- [ ] Create `src/core/decomposition/utils/replacementUtils.ts`
  - Extract `getReplacementKey()` from useDecomposition
  - Extract `buildReplacementMap()` from useDecomposition
- [ ] Create `src/core/decomposition/utils/portionUtils.ts`
  - Extract `convertPortionToGrams()` from useDecomposition
  - Extract `getPortionMultiplier()` from useKitchenDecomposition
- [ ] Create `src/core/decomposition/utils/yieldUtils.ts`
  - Extract `applyYieldAdjustment()` from useDecomposition
- [ ] Create `src/core/decomposition/DecompositionEngine.ts`
  - Main `traverse()` method
  - Private `traverseComposition()` recursive method
  - Store initialization check
- [ ] Create `src/core/decomposition/index.ts`
  - Export all public APIs

**Reference code to extract from:**

- `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` (primary)
- `src/stores/menu/types.ts` for type definitions

---

### Phase 2: Adapters (2 days)

**Goal:** Create adapters for each use case

**Tasks:**

- [ ] Create `src/core/decomposition/adapters/IDecompositionAdapter.ts`
  - Define adapter interface
- [ ] Create `src/core/decomposition/adapters/WriteOffAdapter.ts`
  - `getTraversalOptions()` - keep preps, apply yield
  - `transform()` - convert to DecomposedItem[]
  - `mergeDuplicates()` - by type+id+unit
- [ ] Create `src/core/decomposition/adapters/CostAdapter.ts`
  - `getTraversalOptions()` - keep preps, apply yield
  - `transform()` - FIFO allocation from batches
  - Extract FIFO logic from `useActualCostCalculation`
  - `allocateFromPreparationBatches()` method
  - `allocateFromStorageBatches()` method

**Reference code to extract from:**

- `src/stores/sales/composables/useActualCostCalculation.ts` for CostAdapter

---

### Phase 3: Migration (2 days) - ✅ COMPLETED

**Goal:** Switch consumers to new engine

**Tasks:**

- [x] Update `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`
  - Replace useDecomposition() with DecompositionEngine + WriteOffAdapter
  - Update `processItemWriteOff()` function
- [x] Update `src/stores/sales/salesStore.ts`
  - Replace useActualCostCalculation() with DecompositionEngine + CostAdapter
  - Update `recordSalesTransaction()` function
- [ ] ~~Update `src/stores/recipes/composables/useCostCalculation.ts`~~ → Deferred to Phase 4
  - Reason: Different API signature (direct params vs nodes), will update when deleting useActualCostCalculation
- [ ] Run `/db-clear` to clean test data
- [ ] Manual testing (see Testing section below)

---

### Phase 4: Cleanup (1 day)

**Goal:** Remove old code, update docs
**Approach:** Extract batch allocation to shared utilities (cleanest architecture)

#### Critical Issue Found

`useCostCalculation.ts` (line 5) imports `useActualCostCalculation`:

- Line 134: `calculatePreparationCost()` mode='actual'
- Line 390: `calculateRecipeCost()` mode='actual'

**Solution:** Create shared `batchAllocationUtils.ts` before deleting.

---

#### Step 1: Create Batch Allocation Utilities

- [ ] Create `src/core/decomposition/utils/batchAllocationUtils.ts`
  - Extract `allocateFromPreparationBatches()` from useActualCostCalculation
  - Extract `allocateFromStorageBatches()` from useActualCostCalculation
  - **Rationale:** Shared utilities, not CostAdapter-specific

```typescript
// Signature:
export async function allocateFromPreparationBatches(
  preparationId: string,
  requiredQuantity: number,
  department: 'kitchen' | 'bar'
): Promise<PreparationCostItem>

export async function allocateFromStorageBatches(
  productId: string,
  requiredQuantity: number,
  warehouseId: string
): Promise<ProductCostItem>
```

#### Step 2: Update CostAdapter

- [ ] Update `src/core/decomposition/adapters/CostAdapter.ts`
  - Import from `batchAllocationUtils.ts`
  - Remove duplicate code

#### Step 3: Update useCostCalculation.ts

- [ ] Update `src/stores/recipes/composables/useCostCalculation.ts`
  - **Before:** `import { useActualCostCalculation } from '@/stores/sales/composables/useActualCostCalculation'`
  - **After:** `import { allocateFromPreparationBatches, allocateFromStorageBatches } from '@/core/decomposition'`

#### Step 4: Update Index Exports

- [ ] Update `src/core/decomposition/index.ts`
  - Add exports for new batch allocation utilities

#### Step 5: Build Check

- [ ] Run `pnpm build` - verify no errors

#### Step 6: Delete Dead Code

- [ ] Delete `src/stores/pos/orders/composables/useKitchenDecomposition.ts`
  - Status: **DEAD CODE** - exported but never imported anywhere
  - Kitchen Display shows dish names, not ingredients
- [ ] Update `src/stores/pos/orders/composables/index.ts` - remove exports

#### Step 7: Delete Old Decomposition Files

- [ ] Delete `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts`
- [ ] Check if composables/index.ts needs update

#### Step 8: Delete useActualCostCalculation.ts

- [ ] Delete `src/stores/sales/composables/useActualCostCalculation.ts`
- [ ] Check if composables/index.ts needs update

#### Step 9: Update Documentation

- [ ] Update `src/About/docs/sale/write-off/DECOMPOSITION_ARCHITECTURE.md`
- [ ] Update `src/About/docs/sale/write-off/SALE_FLOW.md` if needed

#### Step 10: Final Verification

- [ ] Run `pnpm build`
- [ ] Run `pnpm lint`
- [ ] Grep for old imports

---

**Files Summary:**

| Action | File                                                                           |
| ------ | ------------------------------------------------------------------------------ |
| CREATE | `src/core/decomposition/utils/batchAllocationUtils.ts`                         |
| MODIFY | `src/core/decomposition/adapters/CostAdapter.ts`                               |
| MODIFY | `src/core/decomposition/index.ts`                                              |
| MODIFY | `src/stores/recipes/composables/useCostCalculation.ts`                         |
| MODIFY | `src/stores/pos/orders/composables/index.ts`                                   |
| DELETE | `src/stores/pos/orders/composables/useKitchenDecomposition.ts` (~540 lines)    |
| DELETE | `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` (~533 lines) |
| DELETE | `src/stores/sales/composables/useActualCostCalculation.ts` (~655 lines)        |

**Total code removed:** ~1,728 lines of duplicated code

---

## 4. Manual Testing Checklist

### 4.1 Before Testing

```bash
# Clean database
/db-clear

# Seed test data
pnpm seed:products
pnpm seed:users
```

### 4.2 Test: Preparation Production

**UI Path:** Backoffice → Storage → Preparations → "+" button → Create Receipt

**Steps:**

1. Select a preparation with ingredients (e.g., "Beef Stock")
2. Enter quantity (e.g., 1000g)
3. Click "Create"

**Expected Results:**

- [ ] Receipt created successfully (toast notification)
- [ ] New batch appears in preparation batches list
- [ ] Batch has correct `cost_per_unit` (FIFO from ingredients)
- [ ] Raw products reduced in storage (check Storage → Products → Batches)
- [ ] If ingredient shortage: negative batch created
- [ ] `preparation_operations` has new record with `related_storage_operation_ids`

**DB Verification:**

```sql
-- Check new preparation batch
SELECT * FROM preparation_batches ORDER BY created_at DESC LIMIT 1;

-- Check storage write-off
SELECT * FROM storage_operations WHERE operation_type = 'write_off' ORDER BY created_at DESC LIMIT 1;

-- Check product batches reduced
SELECT * FROM storage_batches WHERE item_id = '<product_id>' ORDER BY receipt_date;
```

---

### 4.3 Test: POS Sale (Simple)

**UI Path:** POS → Select table → Add items → Pay

**Steps:**

1. Login as cashier
2. Start shift (if not active)
3. Select a table or create takeaway order
4. Add menu item with preparation composition (e.g., dish with "Beef Stock")
5. Click "Pay"
6. Select payment method (Cash)
7. Enter received amount
8. Click "Complete Payment"

**Expected Results:**

- [ ] Payment dialog closes immediately (optimistic UI)
- [ ] Order marked as paid
- [ ] Table becomes available (if dine-in)
- [ ] After ~5 seconds, background job completes
- [ ] `sales_transactions` created with `profit_calculation`
- [ ] `recipe_write_offs` created with decomposition
- [ ] Preparation batches reduced
- [ ] If shortage: negative batch created/updated

**DB Verification:**

```sql
-- Check sales transaction
SELECT id, menu_item_name, profit_calculation, actual_cost
FROM sales_transactions ORDER BY created_at DESC LIMIT 1;

-- Check recipe write-off
SELECT * FROM recipe_write_offs ORDER BY created_at DESC LIMIT 1;

-- Check preparation batch reduced
SELECT * FROM preparation_batches WHERE preparation_id = '<prep_id>' ORDER BY production_date;
```

---

### 4.4 Test: POS Sale with Modifiers

**UI Path:** POS → Add modifiable item → Apply modifier → Pay

**Steps:**

1. Add menu item with modifier groups (e.g., Coffee with milk choice)
2. Click on item → Customization dialog opens
3. Select replacement modifier (e.g., "Oat Milk" instead of "Regular Milk")
4. Add to order
5. Complete payment

**Expected Results:**

- [ ] Modifier applied correctly in order
- [ ] Price adjustment shown
- [ ] After payment:
  - [ ] Decomposition uses replacement composition
  - [ ] Original ingredient NOT written off
  - [ ] Replacement ingredient written off instead
- [ ] `sales_transactions.profit_calculation` reflects modifier cost

---

### 4.5 Test: Sale with No Stock (Negative Batch)

**Steps:**

1. Ensure preparation has 0 stock (or very low)
2. Sell menu item that requires this preparation
3. Complete payment

**Expected Results:**

- [ ] Sale completes successfully (never block sales!)
- [ ] Negative batch created in `preparation_batches`
  - `is_negative: true`
  - `current_quantity: -X` (negative value)
  - `negative_reason: 'POS order'`
- [ ] Cost calculated using fallback chain:
  1. Last active batch cost
  2. Average of last 5 depleted batches
  3. `last_known_cost` from preparation
  4. 0 + CRITICAL error log

---

### 4.6 Test: Bill Discount

**UI Path:** POS → Order → Apply discount → Pay

**Steps:**

1. Add items to order
2. Open discount dialog
3. Apply bill discount (e.g., 10% or fixed amount)
4. Complete payment

**Expected Results:**

- [ ] Discount shown in order total
- [ ] `discount_events` record created
- [ ] `sales_transactions.profit_calculation` includes:
  - `allocatedBillDiscount` for each item
  - `finalRevenue` reduced by discount
- [ ] Profit calculated correctly (revenue - discount - cost)

---

## 5. Files Reference

### Files to DELETE (Phase 4):

1. ⏳ `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` (~533 lines)
2. ⏳ `src/stores/pos/orders/composables/useKitchenDecomposition.ts` (~540 lines) - **DEAD CODE**
3. ⏳ `src/stores/sales/composables/useActualCostCalculation.ts` (~655 lines) - **BLOCKER: useCostCalculation depends on it**

**Total to remove:** ~1,728 lines of duplicated code

### Files to CREATE:

1. ✅ `src/core/decomposition/types.ts`
2. ✅ `src/core/decomposition/index.ts`
3. ✅ `src/core/decomposition/DecompositionEngine.ts`
4. ✅ `src/core/decomposition/utils/replacementUtils.ts`
5. ✅ `src/core/decomposition/utils/portionUtils.ts`
6. ✅ `src/core/decomposition/utils/yieldUtils.ts`
7. ✅ `src/core/decomposition/adapters/IDecompositionAdapter.ts`
8. ✅ `src/core/decomposition/adapters/WriteOffAdapter.ts`
9. ✅ `src/core/decomposition/adapters/CostAdapter.ts`
10. ⏳ `src/core/decomposition/utils/batchAllocationUtils.ts` ← **Phase 4**

### Files to MODIFY:

1. ✅ `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts` - use WriteOffAdapter
2. ✅ `src/stores/sales/salesStore.ts` - use CostAdapter
3. ⏳ `src/stores/recipes/composables/useCostCalculation.ts` - use batchAllocationUtils ← **Phase 4**
4. ⏳ `src/core/decomposition/adapters/CostAdapter.ts` - use batchAllocationUtils ← **Phase 4**
5. ⏳ `src/core/decomposition/index.ts` - add exports ← **Phase 4**
6. ⏳ `src/stores/pos/orders/composables/index.ts` - remove exports ← **Phase 4**

### Documentation to UPDATE:

1. `src/About/docs/sale/write-off/DECOMPOSITION_ARCHITECTURE.md`
2. `src/About/docs/sale/write-off/SALE_FLOW.md`

---

## 6. Source of Truth (Not Changed)

| Data               | Table                                           | Notes                 |
| ------------------ | ----------------------------------------------- | --------------------- |
| Revenue/Profit     | `sales_transactions.profit_calculation`         | Snapshot at sale time |
| FIFO Cost          | `storage_batches` + `preparation_batches`       | Live queue            |
| Operations History | `storage_operations` + `preparation_operations` | Audit trail           |
| Expenses (OPEX)    | `transactions`                                  | Financial operations  |

---

## 7. Success Criteria

1. [ ] All existing functionality works (no regressions)
2. [ ] ~250 lines of duplicated code removed
3. [ ] Single implementation for replacement modifiers
4. [ ] POS sales work correctly with all modifier types
5. [ ] Preparation production works correctly
6. [ ] Negative batches created when needed
7. [ ] FIFO cost calculation accurate
8. [ ] Manual testing checklist passes
