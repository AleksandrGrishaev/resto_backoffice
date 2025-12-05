# Sprint: Write-Off Cost Calculation Improvement

## =� Sprint Progress

### Phase 1: Core Cost Calculation Logic � IN PROGRESS

- [ ] **Task 1**: Auto-update `last_known_cost` for Products
- [ ] **Task 2**: Auto-update `last_known_cost` for Preparations
- [ ] **Task 3**: Simplify Product Negative Batch Cost Fallback
- [ ] **Task 4**: Simplify Preparation Negative Batch Cost Fallback
- [ ] **Task 5**: Enhanced Error Logging System

### Phase 2: Validation & UI Warnings

- [ ] **Task 6**: Validate `last_known_cost` at Product Creation
- [ ] **Task 7**: Validate `last_known_cost` at Preparation Creation
- [ ] **Task 8**: Add UI Warning for Products with Zero Cost
- [ ] **Task 9**: Add UI Warning for Preparations with Zero Cost

### Phase 3: Documentation & Testing

- [ ] **Task 10**: Update SALE_FLOW.md Documentation
- [ ] **Task 11**: Test Fallback Chain with Real Data
- [ ] **Task 12**: Create Database Check Migration (Optional)

**Current Phase:** Phase 1 - Core Logic Implementation
**Overall Progress:** 0% (0/12 tasks completed)

---

## <� Sprint Goal

**Eliminate arbitrary fallback costs (100 IDR) and establish clear, predictable cost calculation hierarchy based on `last_known_cost` and batch history.**

---

## =� Current State Analysis

### Problem Summary

The current write-off system has **TWO ENTRY POINTS** with a **6-level fallback chain** that ends with an arbitrary hardcoded value:

**Entry Point 1: Preparation Production**

```
DirectPreparationProductionDialog � preparationService.createReceipt() �
Auto write-off raw products � FIFO allocation � Negative batch if shortage
```

**Entry Point 2: Product Sales**

```
salesStore.recordSalesTransaction() � decomposeMenuItem() �
calculateActualCost() � recipeWriteOffStore.processItemWriteOff() �
FIFO allocation � Negative batch if shortage
```

### Current Fallback Chain (6 Levels)

**Files:**

- `src/stores/storage/negativeBatchService.ts:53-215`
- `src/stores/preparation/negativeBatchService.ts:53-196`

```
1. Last Active Batch Cost           BEST (most recent production)
2. Average of Last 5 Depleted        FALLBACK 1 (historical average)
3. last_known_cost from DB          � FALLBACK 2 (never auto-updated!)
4. Dynamic calc from ingredients    � FALLBACK 3 (can fail silently)
5. Any Historical Batch Cost        � FALLBACK 4 (very old data)
6. Hardcoded 100 IDR                L FALLBACK 5 (ARBITRARY VALUE!)
```

### Critical Issues

1. **Arbitrary Fallback Cost**: Final fallback = 100 IDR (hardcoded, meaningless)
2. **`last_known_cost` Never Updated**: Field exists but is never auto-populated from batches
3. **Silent Failures**: Dynamic calculation can fail without clear error messages
4. **Inaccurate Profit**: When cost = 100 IDR, profit calculations are completely wrong

### Example Error Log

```
L NO COST DATA FOUND for product 5212289c-a471-48a1-a438-bdd44abd6f85 (Dragon).
Using estimated cost: 20 for 40 gram.
THIS SHOULD BE FIXED!
```

---

## = Proposed Solution

### New Simplified Fallback Chain (4 Levels)

```
1. Last Active Batch Cost           BEST (most recent)
2. Average of Last 5 Depleted        FALLBACK 1 (historical)
3. last_known_cost from DB           FALLBACK 2 (auto-updated from batches!)
4. 0 + CRITICAL ERROR LOG            FINAL (visible failure, not arbitrary)
```

**Key Changes:**

- L Remove: Dynamic calculation from ingredients (step 4)
- L Remove: Any historical batch cost (step 5)
- L Remove: Hardcoded 100 IDR (step 6)
-  Add: Auto-update `last_known_cost` when creating batches
-  Add: Return 0 with CRITICAL error log instead of arbitrary value

---

## =� Detailed Task Breakdown

### Task 1: Auto-update `last_known_cost` for Products

**File:** `src/stores/storage/storageService.ts`

**Location:** Receipt operation creation (when product batches are created)

**Implementation:**

```typescript
// After creating product batch in receipt operation
const batch = await supabase
  .from('storage_batches')
  .insert({
    product_id: productId,
    cost_per_unit: costPerUnit
    // ... other fields
  })
  .select()
  .single()

// NEW: Update last_known_cost
await supabase.from('products').update({ last_known_cost: costPerUnit }).eq('id', productId)

DebugUtils.info(MODULE_NAME, ' Updated product last_known_cost', {
  productId,
  costPerUnit
})
```

**Success Criteria:**

- Every product batch creation updates `products.last_known_cost`
- Log confirms update
- Field never NULL (use 0 as default)

---

### Task 2: Auto-update `last_known_cost` for Preparations

**File:** `src/stores/preparation/preparationService.ts`

**Location:** `createReceipt()` method (lines 701-877)

**Implementation:**

```typescript
// After creating preparation batch
const batch = await supabase
  .from('preparation_batches')
  .insert({
    preparation_id: preparationId,
    cost_per_unit: costPerUnit
    // ... other fields
  })
  .select()
  .single()

// NEW: Update last_known_cost
await supabase.from('preparations').update({ last_known_cost: costPerUnit }).eq('id', preparationId)

DebugUtils.info(MODULE_NAME, ' Updated preparation last_known_cost', {
  preparationId,
  costPerUnit
})
```

**Success Criteria:**

- Every preparation batch creation updates `preparations.last_known_cost`
- Log confirms update
- Field never NULL (use 0 as default)

---

### Task 3: Simplify Product Negative Batch Cost Fallback

**File:** `src/stores/preparation/negativeBatchService.ts`

**Method:** `calculateNegativeBatchCost()` (lines 53-215)

**Changes:**

**BEFORE:**

```typescript
// 6 fallback levels ending with 100 IDR
const defaultCostPerUnit = 100
console.error(`L NO COST DATA FOUND`)
return defaultCostPerUnit
```

**AFTER:**

```typescript
async calculateNegativeBatchCost(productId: string, requestedQty: number): Promise<number> {
  const product = await supabase
    .from('products')
    .select('name, base_unit')
    .eq('id', productId)
    .single()

  // 1. Try last active batch
  const lastBatch = await this.getLastActiveBatch(productId)
  if (lastBatch?.costPerUnit && lastBatch.costPerUnit > 0) {
    DebugUtils.info(MODULE_NAME, ' Using last active batch cost', {
      productId,
      cost: lastBatch.costPerUnit
    })
    return lastBatch.costPerUnit
  }

  // 2. Try depleted batches (average of last 5)
  const depletedBatches = await supabase
    .from('storage_batches')
    .select('cost_per_unit, batch_number, production_date')
    .eq('product_id', productId)
    .eq('status', 'depleted')
    .gt('cost_per_unit', 0)
    .order('production_date', { ascending: false })
    .limit(5)

  if (depletedBatches && depletedBatches.length > 0) {
    const avgCost = depletedBatches.reduce((sum, b) => sum + b.cost_per_unit, 0) / depletedBatches.length
    DebugUtils.info(MODULE_NAME, ' Using depleted batches average cost', {
      productId,
      avgCost,
      batchCount: depletedBatches.length
    })
    return avgCost
  }

  // 3. Try last_known_cost from product
  const { data: productData } = await supabase
    .from('products')
    .select('last_known_cost')
    .eq('id', productId)
    .single()

  if (productData?.last_known_cost && productData.last_known_cost > 0) {
    DebugUtils.info(MODULE_NAME, ' Using last_known_cost from DB', {
      productId,
      cost: productData.last_known_cost
    })
    return productData.last_known_cost
  }

  // 4. FINAL FALLBACK: 0 with CRITICAL ERROR
  const errorContext = {
    timestamp: new Date().toISOString(),
    itemId: productId,
    itemName: product?.name || 'Unknown',
    itemType: 'product',
    requestedQuantity: requestedQty,
    unit: product?.base_unit || 'unknown',
    failedFallbacks: ['last_active_batch', 'depleted_batches_avg', 'last_known_cost'],
    suggestedAction: 'Create receipt operation or set base_cost_per_unit in products table'
  }

  DebugUtils.error(MODULE_NAME,
    `L CRITICAL: NO COST DATA FOUND for product "${product?.name}" (${productId})`,
    errorContext
  )

  console.error('=� COST CALCULATION FAILED', errorContext)

  // Return 0 instead of arbitrary 100 IDR
  return 0
}
```

**Success Criteria:**

- Fallback chain simplified to 4 levels
- Final fallback returns 0 (not 100 IDR)
- Comprehensive error logging with context
- Clear suggested actions for user

---

### Task 4: Simplify Preparation Negative Batch Cost Fallback

**File:** `src/stores/preparation/negativeBatchService.ts`

**Method:** `calculateNegativeBatchCost()` (lines 53-196)

**Changes:**

Apply same logic as Task 3, but for preparations:

```typescript
async calculateNegativeBatchCost(preparationId: string, requestedQty: number): Promise<number> {
  const preparation = await supabase
    .from('preparations')
    .select('name, output_unit')
    .eq('id', preparationId)
    .single()

  // 1. Try last active batch
  const lastBatch = await this.getLastActiveBatch(preparationId)
  if (lastBatch?.costPerUnit && lastBatch.costPerUnit > 0) {
    return lastBatch.costPerUnit
  }

  // 2. Try depleted batches (average of last 5)
  const depletedBatches = await supabase
    .from('preparation_batches')
    .select('cost_per_unit, batch_number, production_date')
    .eq('preparation_id', preparationId)
    .eq('status', 'depleted')
    .gt('cost_per_unit', 0)
    .order('production_date', { ascending: false })
    .limit(5)

  if (depletedBatches && depletedBatches.length > 0) {
    const avgCost = depletedBatches.reduce((sum, b) => sum + b.cost_per_unit, 0) / depletedBatches.length
    return avgCost
  }

  // 3. Try last_known_cost from preparation
  const { data: prepData } = await supabase
    .from('preparations')
    .select('last_known_cost')
    .eq('id', preparationId)
    .single()

  if (prepData?.last_known_cost && prepData.last_known_cost > 0) {
    return prepData.last_known_cost
  }

  // 4. FINAL FALLBACK: 0 with CRITICAL ERROR
  const errorContext = {
    timestamp: new Date().toISOString(),
    itemId: preparationId,
    itemName: preparation?.name || 'Unknown',
    itemType: 'preparation',
    requestedQuantity: requestedQty,
    unit: preparation?.output_unit || 'unknown',
    failedFallbacks: ['last_active_batch', 'depleted_batches_avg', 'last_known_cost'],
    suggestedAction: 'Create production receipt for this preparation'
  }

  DebugUtils.error(MODULE_NAME,
    `L CRITICAL: NO COST DATA FOUND for preparation "${preparation?.name}" (${preparationId})`,
    errorContext
  )

  console.error('=� COST CALCULATION FAILED', errorContext)

  return 0
}
```

**Success Criteria:**

- Same as Task 3 but for preparations
- No more dynamic calculation from ingredients
- Return 0 with error instead of 100 IDR

---

### Task 5: Enhanced Error Logging System

**Files:**

- `src/stores/storage/negativeBatchService.ts`
- `src/stores/preparation/negativeBatchService.ts`

**Create structured error interface:**

```typescript
interface CostCalculationError {
  timestamp: string
  itemId: string
  itemName: string
  itemType: 'product' | 'preparation'
  requestedQuantity: number
  unit: string
  failedFallbacks: string[]
  suggestedAction: string
  context?: {
    operation?: string
    orderId?: string
    salesTransactionId?: string
  }
}
```

**Optional: Write to error log file**

```typescript
// In negativeBatchService
private async logCriticalError(error: CostCalculationError) {
  // Console error (always)
  console.error('=� COST CALCULATION FAILED', error)

  // DebugUtils error
  DebugUtils.error(MODULE_NAME,
    `L CRITICAL: NO COST DATA for ${error.itemType} "${error.itemName}"`,
    error
  )

  // Optional: Write to error tracking file/service
  // await ErrorTrackingService.logError('COST_CALCULATION_FAILURE', error)
}
```

**Success Criteria:**

- Structured error format
- Comprehensive context logging
- Clear user-facing error messages
- Optional: Integration with error tracking system

---

### Task 6-7: Validate `last_known_cost` at Creation

**Files:**

- `src/stores/productsStore/index.ts` (createProduct)
- `src/stores/recipes/recipesStore.ts` (createPreparation)

**Implementation:**

```typescript
// For products (productsStore)
async createProduct(productData) {
  const newProduct = {
    ...productData,
    last_known_cost: productData.base_cost_per_unit || 0,
    // ... other fields
  }

  if (newProduct.last_known_cost === 0) {
    DebugUtils.warn(MODULE_NAME, '� Product created with 0 cost', {
      productId: newProduct.id,
      name: newProduct.name
    })
  }

  await supabase.from('products').insert(newProduct)
}

// For preparations (recipesStore)
async createPreparation(prepData) {
  const newPrep = {
    ...prepData,
    last_known_cost: 0, // Will be updated on first batch creation
    // ... other fields
  }

  DebugUtils.info(MODULE_NAME, '9 Preparation created with 0 cost (will update on first batch)', {
    preparationId: newPrep.id,
    name: newPrep.name
  })

  await supabase.from('preparations').insert(newPrep)
}
```

**Success Criteria:**

- `last_known_cost` field never NULL
- Default to 0 if no cost data available
- Log warnings when cost = 0

---

### Task 8-9: Add UI Warnings for Zero Cost

**Files:**

- `src/views/products/components/ProductForm.vue` (or equivalent)
- `src/views/preparation/components/DirectPreparationProductionDialog.vue`

**Implementation:**

```vue
<template>
  <!-- Product Form -->
  <v-alert
    v-if="product.base_cost_per_unit === 0 || product.last_known_cost === 0"
    type="warning"
    variant="tonal"
    class="mb-4"
  >
    <v-alert-title>� Cost Not Set</v-alert-title>
    <div>
      This product has no cost data. Profit calculations will be inaccurate until you add supplier
      pricing or create a receipt operation.
    </div>
    <div class="mt-2">
      <strong>Suggested Actions:</strong>
      <ul>
        <li>Set "Base Cost Per Unit" in the form below</li>
        <li>Create a receipt operation with actual cost</li>
        <li>Link to supplier with pricing</li>
      </ul>
    </div>
  </v-alert>

  <!-- Preparation Form -->
  <v-alert v-if="preparation.last_known_cost === 0" type="info" variant="tonal" class="mb-4">
    <v-alert-title>9 Cost Will Update Automatically</v-alert-title>
    <div>
      This preparation has no cost history yet. Cost will be automatically calculated when you
      create the first production batch.
    </div>
  </v-alert>
</template>
```

**Success Criteria:**

- Clear, user-friendly warning messages
- Specific suggested actions
- Only shown when cost = 0
- Non-blocking (allows save)

---

### Task 10: Update SALE_FLOW.md Documentation

**File:** `src/About/docs/sale/write-off/SALE_FLOW.md`

**Section to update:** Lines 609-672 (Section 4.4 " 0AG5B AB>8<>AB8 4;O Negative Batch")

**Changes:**

````markdown
### 4.4. 0AG5B AB>8<>AB8 4;O Negative Batch

**$09;:** `src/stores/preparation/negativeBatchService.ts`

**Fallback chain (2 ?>@O4:5 ?@8>@8B5B0):**

```typescript
async calculateNegativeBatchCost(preparationId, quantity) {
  // 1.  Last active batch cost (FIFO - A0<0O B>G=0O)
  const lastBatch = await getLastActiveBatch(preparationId)
  if (lastBatch?.costPerUnit > 0) {
    return lastBatch.costPerUnit
  }

  // 2.  Average from depleted batches (recent 5)
  const depletedBatches = await getDepletedBatches(preparationId, limit: 5)
  if (depletedBatches.length > 0) {
    const avgCost = sum(depletedBatches.map(b => b.costPerUnit)) / count
    return avgCost
  }

  // 3.  Cached last_known_cost from DB (auto-updated!)
  const preparation = await supabase
    .from('preparations')
    .select('last_known_cost, name')
    .eq('id', preparationId)
    .single()

  if (preparation?.last_known_cost > 0) {
    return preparation.last_known_cost
  }

  // 4. L CRITICAL ERROR: No cost data available
  console.error(`L CRITICAL: NO COST DATA FOUND for ${preparationId}`)

  // Return 0 instead of arbitrary value
  // This makes the problem visible in reports
  return 0
}
```
````

**2B><0B8G5A:>5 >1=>2;5=85 `last_known_cost`:**

-  @8 A>740=88 product batch � `products.last_known_cost` >1=>2;O5BAO
-  @8 A>740=88 preparation batch � `preparations.last_known_cost` >1=>2;O5BAO
-  >;5 =8:>340 =5 NULL (default = 0)

**#AB@0=5=85 ?@>1;5<:**

- L >;LH5 =5B hardcoded 100 IDR
- L >;LH5 =5B 48=0<8G5A:>3> @0AG5B0 87 8=3@5485=B>2
-  >72@0B 0 45;05B ?@>1;5<C 2848<>9 (=5 <0A:8@C5B ?@>872>;L=K< 7=0G5=85<)
-  >4@>1=>5 ;>38@>20=85 4;O >B;04:8

````

**Success Criteria:**
- Documentation reflects new 4-level fallback chain
- Removed references to dynamic calculation
- Added section on auto-update mechanism
- Clear troubleshooting guide

---

### Task 11: Test Fallback Chain with Real Data

**Test Scenarios:**

1. **Scenario 1: Normal Flow (Best Case)**
   - Create product receipt with cost = 50,000 IDR/kg
   - Verify `last_known_cost` updated
   - Sell product � verify cost = 50,000 IDR/kg
   - Create negative batch � verify cost = 50,000 IDR/kg

2. **Scenario 2: No Active Batches (Depleted Average)**
   - Deplete all batches for product X
   - Sell product X � verify cost = average of last 5 depleted batches
   - Check logs confirm fallback level 2

3. **Scenario 3: No Batches at All (last_known_cost)**
   - Create new product with base_cost = 10,000 IDR
   - Verify `last_known_cost` = 10,000 IDR
   - Sell product � verify cost = 10,000 IDR
   - Check logs confirm fallback level 3

4. **Scenario 4: No Cost Data (Critical Error)**
   - Create new product with base_cost = 0
   - No batches created
   - Sell product � verify cost = 0
   - Check error log shows CRITICAL error
   - Verify error includes all context

**Success Criteria:**
- All 4 scenarios tested
- Logs confirm correct fallback level
- Error messages clear and actionable
- No arbitrary 100 IDR costs

---

### Task 12: Create Database Check Migration (Optional)

**File:** `src/supabase/migrations/039_check_missing_costs.sql`

**Purpose:** Identify all products/preparations with missing cost data

```sql
-- Migration: 039_check_missing_costs
-- Description: Identify items with missing cost data
-- Date: 2025-12-05

-- Check products with missing costs
SELECT
  id,
  name,
  base_unit,
  base_cost_per_unit,
  last_known_cost,
  CASE
    WHEN base_cost_per_unit IS NULL OR base_cost_per_unit = 0 THEN 'Missing base_cost_per_unit'
    WHEN last_known_cost IS NULL OR last_known_cost = 0 THEN 'Missing last_known_cost'
    ELSE 'OK'
  END as status
FROM products
WHERE
  (base_cost_per_unit IS NULL OR base_cost_per_unit = 0)
  OR (last_known_cost IS NULL OR last_known_cost = 0)
ORDER BY name;

-- Check preparations with missing costs
SELECT
  id,
  name,
  output_unit,
  last_known_cost,
  CASE
    WHEN last_known_cost IS NULL OR last_known_cost = 0 THEN 'Missing last_known_cost'
    ELSE 'OK'
  END as status
FROM preparations
WHERE
  last_known_cost IS NULL OR last_known_cost = 0
ORDER BY name;

-- Summary counts
SELECT
  'Products with missing base_cost' as category,
  COUNT(*) as count
FROM products
WHERE base_cost_per_unit IS NULL OR base_cost_per_unit = 0

UNION ALL

SELECT
  'Products with missing last_known_cost' as category,
  COUNT(*) as count
FROM products
WHERE last_known_cost IS NULL OR last_known_cost = 0

UNION ALL

SELECT
  'Preparations with missing last_known_cost' as category,
  COUNT(*) as count
FROM preparations
WHERE last_known_cost IS NULL OR last_known_cost = 0;
````

**Success Criteria:**

- Migration identifies all items with missing costs
- Admin can review and fix before going live
- Provides clear summary counts

---

##  Definition of Done

### Sprint Complete When:

1.  **All fallback chains simplified** (6 levels � 4 levels)
2.  **`last_known_cost` auto-updates** from batch operations
3.  **No more hardcoded 100 IDR** (replaced with 0 + error)
4.  **Clear error logging** with full context
5.  **UI warnings** guide users to fix missing costs
6.  **Documentation updated** (SALE_FLOW.md)
7.  **All test scenarios pass**
8.  **No regressions** in existing write-off flows

---

## = Related Files Reference

### Core Logic

- `src/stores/storage/storageService.ts` - Product write-offs, receipt operations
- `src/stores/preparation/preparationService.ts` - Preparation write-offs, batch creation
- `src/stores/storage/negativeBatchService.ts` - Product negative batch cost calculation
- `src/stores/preparation/negativeBatchService.ts` - Preparation negative batch cost calculation

### UI Components

- `src/views/products/components/ProductForm.vue`
- `src/views/preparation/components/DirectPreparationProductionDialog.vue`
- `src/views/recipes/components/UnifiedRecipeDialog.vue`

### Documentation

- `src/About/docs/sale/write-off/SALE_FLOW.md`

### Database

- `src/supabase/migrations/039_check_missing_costs.sql` (new)

---

## =� Expected Impact

### Before

- L Cost = 100 IDR (arbitrary) when no data available
- L `last_known_cost` never updated
- L Silent failures in dynamic calculation
- L Inaccurate profit calculations
- L 6-level fallback chain (complex, unclear)

### After

-  Cost = 0 + CRITICAL ERROR (visible problem)
-  `last_known_cost` auto-updates from batches
-  Clear error messages with context
-  Accurate profit when cost data available
-  4-level fallback chain (simple, predictable)

---

**Sprint Started:** 2025-12-05
**Expected Duration:** 2-3 days
**Priority:** HIGH (affects profit calculation accuracy)
