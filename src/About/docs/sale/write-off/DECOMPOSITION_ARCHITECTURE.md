# Decomposition Architecture

## Overview

Decomposition - процесс разворачивания позиции меню до конечных ингредиентов (products/preparations) для:

- Списания со склада (Write-Off)
- Расчета себестоимости (FIFO Cost Calculation)

---

## Current Architecture (Phase 4 - Unified)

### Core Module

```
src/core/decomposition/
├── index.ts                        # Public exports
├── types.ts                        # All types and interfaces
├── DecompositionEngine.ts          # Main traversal engine
├── utils/
│   ├── replacementUtils.ts         # getReplacementKey, buildReplacementMap
│   ├── portionUtils.ts             # convertPortionToGrams, getPortionMultiplier
│   ├── yieldUtils.ts               # applyYieldAdjustment
│   └── batchAllocationUtils.ts     # FIFO allocation (shared)
└── adapters/
    ├── IDecompositionAdapter.ts    # Adapter interface
    ├── WriteOffAdapter.ts          # For inventory write-off
    └── CostAdapter.ts              # For FIFO cost calculation
```

### Architecture Diagram

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
    WriteOffResult                      ActualCostBreakdown
    (WriteOffItem[])                   (PreparationCostItem[] +
                                        ProductCostItem[])
```

### Key Files

| File                                                     | Purpose                      |
| -------------------------------------------------------- | ---------------------------- |
| `src/core/decomposition/DecompositionEngine.ts`          | Unified traversal logic      |
| `src/core/decomposition/adapters/WriteOffAdapter.ts`     | Transforms to WriteOffItem[] |
| `src/core/decomposition/adapters/CostAdapter.ts`         | FIFO cost calculation        |
| `src/core/decomposition/utils/batchAllocationUtils.ts`   | Shared FIFO allocation       |
| `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts` | Uses WriteOffAdapter         |
| `src/stores/sales/salesStore.ts`                         | Uses CostAdapter             |
| `src/stores/recipes/composables/useCostCalculation.ts`   | Uses batchAllocationUtils    |

---

## Removed Files (Phase 4 Cleanup)

The following files were deleted as part of the unification:

| File                                                              | Lines | Reason                                                        |
| ----------------------------------------------------------------- | ----- | ------------------------------------------------------------- |
| `src/stores/pos/orders/composables/useKitchenDecomposition.ts`    | ~540  | Dead code - Kitchen Display shows dish names, not ingredients |
| `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` | ~533  | Migrated to DecompositionEngine + WriteOffAdapter             |
| `src/stores/sales/composables/useActualCostCalculation.ts`        | ~655  | Migrated to CostAdapter + batchAllocationUtils                |

**Total removed:** ~1,728 lines of duplicated code

---

## Usage Examples

### Write-Off (recipeWriteOffStore)

```typescript
import { createDecompositionEngine, createWriteOffAdapter } from '@/core/decomposition'

const engine = await createDecompositionEngine()
const adapter = createWriteOffAdapter()

const traversalResult = await engine.traverse(
  {
    menuItemId,
    variantId,
    quantity,
    selectedModifiers
  },
  adapter.getTraversalOptions()
)

const writeOffResult = await adapter.transform(traversalResult, input)
// writeOffResult.items = WriteOffItem[]
```

### Cost Calculation (salesStore)

```typescript
import { createDecompositionEngine, createCostAdapter } from '@/core/decomposition'

const engine = await createDecompositionEngine()
const adapter = createCostAdapter({ department: 'kitchen' })

const traversalResult = await engine.traverse(
  {
    menuItemId,
    variantId,
    quantity,
    selectedModifiers
  },
  adapter.getTraversalOptions()
)

const costBreakdown = await adapter.transform(traversalResult, input)
// costBreakdown.totalCost, costBreakdown.preparationCosts, costBreakdown.productCosts
```

### Direct FIFO Allocation (useCostCalculation)

```typescript
import { allocateFromPreparationBatches, allocateFromStorageBatches } from '@/core/decomposition'

// For preparations
const prepCost = await allocateFromPreparationBatches(preparationId, requiredQuantity, 'kitchen')

// For products
const prodCost = await allocateFromStorageBatches(productId, requiredQuantity, warehouseId)
```

---

## Replacement Modifiers Support

### Concept

Replacement Modifier allows replacing a recipe component with an alternative:

```
Recipe: Cappuccino
├── Espresso: 30ml
└── Regular Milk: 150ml  ← target for replacement

MenuItem: Cappuccino (modifiable)
├── Variant: [recipe: Cappuccino]
└── ModifierGroup: "Choose Milk" (type: replacement)
    ├── targetComponent → Milk in Cappuccino recipe
    └── options:
        ├── Regular Milk (isDefault) → uses original
        ├── Oat Milk (+5000) → replaces with oat milk composition
        └── Coconut Milk (+7000) → replaces with coconut milk composition
```

### Implementation

DecompositionEngine handles replacements via `buildReplacementMap()`:

```typescript
// In DecompositionEngine.traverse()
const replacements = buildReplacementMap(selectedModifiers)

// For each recipe component:
const replacement = getReplacementForComponent(recipe.id, component.id, replacements)
if (replacement) {
  // Use replacement.composition instead of original component
}
```

---

## Portion Conversion Utilities

### Overview

The `portionUtils.ts` module provides utilities for converting portion-type preparations to base units (grams).

**Location:** `src/core/decomposition/utils/portionUtils.ts`

### Key Functions

#### 1. `convertPortionToGrams()`

Converts portion-type preparation quantities to grams.

```typescript
/**
 * Convert portion-type preparation quantity to grams
 * If unit is 'portion' and preparation has portionType='portion',
 * multiply by portionSize to get grams
 */
function convertPortionToGrams(
  composition: MenuComposition,
  preparation: PreparationForDecomposition,
  multiplier: number
): PortionConversionResult

// Example:
// composition: { quantity: 2, unit: 'portion' }
// preparation: { portionSize: 30, portionType: 'portion' }
// multiplier: 1
// Result: { quantity: 60, unit: 'gram', wasConverted: true }
```

**Logic:**

- Checks if `composition.unit === 'portion'` AND `preparation.portionType === 'portion'`
- If yes: `quantity = composition.quantity × multiplier × portionSize`
- If no: returns original quantity with `preparation.outputUnit`

#### 2. `getPortionMultiplier()`

Gets the portion multiplier for menu variants (e.g., "no ice" = 1.3x).

```typescript
function getPortionMultiplier(portionMultiplier?: number): number

// Returns portionMultiplier if > 0, otherwise 1.0
```

#### 3. `isPortionUnit()`

Checks if a unit represents portions (not weight/volume).

```typescript
function isPortionUnit(unit: string): boolean

// Returns true for: 'portion', 'portions', 'piece', 'pieces', 'pcs', 'serving', 'servings'
```

#### 4. `normalizeUnit()`

Normalizes unit strings to standard format.

```typescript
function normalizeUnit(unit: string): string

// Examples:
// 'g' → 'gram'
// 'ml' → 'milliliter'
// 'pcs' → 'piece'
```

### Usage in DecompositionEngine

```typescript
// In DecompositionEngine.processPreparationComponent()
import { convertPortionToGrams } from './utils/portionUtils'

// Apply portion conversion if needed
if (options.convertPortions) {
  const conversionResult = convertPortionToGrams(composition, preparation, quantity)

  if (conversionResult.wasConverted) {
    DebugUtils.debug(MODULE_NAME, 'Converted portions to grams', {
      preparationId: preparation.id,
      preparation: preparation.name,
      originalQuantity: composition.quantity * quantity,
      convertedQuantity: conversionResult.quantity,
      portionSize: preparation.portionSize
    })
  }

  totalQuantity = conversionResult.quantity
  outputUnit = conversionResult.unit
}
```

**Critical:** Conversion happens **ONCE** in DecompositionEngine. All downstream code (CostAdapter, WriteOffAdapter, batchAllocationUtils) works with grams only.

---

## Portion-Type Preparations Handling

### Overview

Portion-type preparations (`portionType='portion'`) are stored in **base units (grams)** but displayed in **portions** in UI.

### Key Principle

**"Storage in Grams, Display in Portions"**

- All batch quantities stored in **grams** (base unit)
- All batch costs stored **per-gram** (IDR/gram)
- UI converts to portions for display only

### Example: Bacon Slices 30g

**Preparation Definition:**

```typescript
{
  name: "Bacon slices 30g",
  portionType: "portion",
  portionSize: 30,        // 1 portion = 30 grams
  outputUnit: "gram",     // Base unit for storage
  lastKnownCost: 115      // IDR per gram
}
```

**Production Batch (stored in DB):**

```typescript
{
  unit: "gram",
  initialQuantity: 120,   // 4 portions (120 / 30 = 4)
  currentQuantity: 90,    // 3 portions (90 / 30 = 3)
  costPerUnit: 115,       // IDR per gram
  totalValue: 10350       // 90 × 115
}
```

**UI Display:**

```
Quantity: "3/4 portions"  (converted from 90/120 grams)
Cost: "Rp 115/gram (Rp 3,450/portion)"  (115 × 30)
```

### Flow for Portion-Type Preparations

```
Menu Composition: "1 portion of Bacon"
         ↓
DecompositionEngine:
  - Input: 1 portion
  - Convert: 1 × 30g = 30 grams
  - Output: { quantity: 30, unit: 'gram' }
         ↓
FIFO Allocation (batchAllocationUtils):
  - Required: 30 grams
  - Allocate from batches (stored in grams)
  - Cost: 30g × 115 IDR/gram = 3,450 IDR
  - NO CONVERSION NEEDED (already per-gram)
         ↓
Storage/Display:
  - Store: quantity=30g, cost=115 IDR/gram
  - Display: "1 portion (30g)", "Rp 3,450/portion"
```

### Critical Rules

1. **Storage Layer (Database):**

   - ✅ Always store `quantity` in **grams** (base unit)
   - ✅ Always store `cost_per_unit` in **IDR/gram** (per base unit)
   - ✅ Use `unit='gram'` for all batches (production & negative)

2. **Decomposition Layer:**

   - ✅ Convert portions → grams **once** in DecompositionEngine (via `portionUtils.ts`)
   - ✅ Output quantity always in grams
   - ✅ **No `portionSize` in DecomposedPreparationNode** (removed in Phase 4)

   **Why `portionSize` was removed:**

   - Previously included to "help" cost calculation, but caused confusion
   - All batch costs are already stored per-gram (base unit)
   - Conversion happens **once** in DecompositionEngine, not in cost calculation
   - Including `portionSize` in node suggested conversion was needed downstream (it's not!)
   - Code reference: `DecompositionEngine.ts:355-363`, comment at line 362

3. **Cost Calculation Layer:**

   - ✅ All costs are per-gram (base unit)
   - ✅ NO conversion in batchAllocationUtils
   - ✅ NO conversion in CostAdapter
   - ✅ Multiply: `quantity(grams) × cost(per-gram) = total`

4. **UI Layer:**
   - ✅ Convert grams → portions **for display only**
   - ✅ Show both: "Rp 115/gram (Rp 3,450/portion)"
   - ✅ Use `formatBatchQuantity()` to display portions

### Common Mistakes to Avoid

❌ **WRONG: Storing quantity in portions**

```typescript
// BAD
{
  unit: "portion",
  currentQuantity: 3,    // WRONG!
  costPerUnit: 3450      // per-portion - WRONG!
}
```

✅ **CORRECT: Storing quantity in grams**

```typescript
// GOOD
{
  unit: "gram",
  currentQuantity: 90,   // 3 portions = 90 grams
  costPerUnit: 115       // per-gram
}
```

❌ **WRONG: Converting cost in allocation**

```typescript
// BAD - leads to wrong cost
if (portionSize) {
  cost = cost / portionSize // WRONG!
}
```

✅ **CORRECT: Use cost as-is**

```typescript
// GOOD - cost is already per-gram
totalCost = quantity * costPerUnit
```

---

## Negative Batch Cost Fallback Chain

When creating negative batch (no stock), system uses fallback chain:

### For Products (via batchAllocationUtils)

```
1. Active batches FIFO           ← Allocate from oldest first
   ↓ EXHAUSTED
2. base_cost_per_unit fallback   ← From product catalog
   ↓ FAIL
3. 0 + WARNING log               ← Logs insufficient stock
```

### For Preparations (via batchAllocationUtils)

```
1. Active batches FIFO           ← Allocate from oldest first
   ↓ EXHAUSTED
2. lastKnownCost fallback        ← From preparation record
   ↓ FAIL
3. 0 + WARNING log               ← Logs insufficient stock
```

### Key Files

| File                                                   | Entity                               |
| ------------------------------------------------------ | ------------------------------------ |
| `src/core/decomposition/utils/batchAllocationUtils.ts` | Shared FIFO allocation               |
| `src/stores/storage/negativeBatchService.ts`           | Products negative batch creation     |
| `src/stores/preparation/negativeBatchService.ts`       | Preparations negative batch creation |

---

## Debugging

### Debug Logging System

The decomposition system uses extensive debug logging via `DebugUtils` to trace execution flow and diagnose issues.

**Enable debug logs:** Set `ENV.debugEnabled = true` in development mode.

### Key Log Categories

#### 1. **DecompositionEngine Logs**

```typescript
// Starting decomposition
[INFO] [DecompositionEngine]: Starting decomposition {
  menuItemId: 'ed14a91d-a30d-4840-8c26-6c4602a964a3',
  variantId: '255acc73-739b-424e-adae-6b6a431d9570',
  quantity: 1,
  modifiersCount: 1
}

// Processing preparation component
[DEBUG] [DecompositionEngine]: 📦 Processing preparation {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  preparationName: 'Bacon slices 30g',
  compQuantity: 1,
  multiplier: 1,
  totalBeforeConversion: 1
}

// Portion conversion
[DEBUG] [DecompositionEngine]: Converted portions to grams {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  preparation: 'Bacon slices 30g',
  originalQuantity: 1,
  convertedQuantity: 30,
  portionSize: 30
}

// Creating node
[DEBUG] [DecompositionEngine]: ✅ Creating preparation node {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  preparationName: 'Bacon slices 30g',
  finalQuantity: 30,
  unit: 'gram'
}

// Decomposition complete
[INFO] [DecompositionEngine]: Decomposition complete {
  totalNodes: 3,
  products: 1,
  preparations: 2
}
```

#### 2. **CostAdapter Logs**

```typescript
// Starting cost calculation
[INFO] [CostAdapter]: Calculating actual cost from FIFO batches {
  nodesCount: 3,
  menuItem: 'Test recipe'
}

// Allocating preparation
[DEBUG] [CostAdapter]: 🔵 Allocating preparation from batches {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  preparationName: 'Bacon slices 30g',
  quantity: 30,
  unit: 'gram',
  department: 'kitchen'
}

// Cost calculated
[DEBUG] [CostAdapter]: ✅ Preparation cost allocated {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  preparationName: 'Bacon slices 30g',
  requestedQuantity: 30,
  allocatedQuantity: 30,
  unit: 'gram',
  totalCost: 3450
}

// Final result
[INFO] [CostAdapter]: Actual cost calculated {
  totalCost: 13820.9,
  preparationItems: 2,
  productItems: 1
}
```

#### 3. **BatchAllocationUtils Logs**

```typescript
// Allocating from batches
[INFO] [BatchAllocationUtils]: Allocating from preparation batches {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  requiredQuantity: 30,
  department: 'kitchen'
}

// Available batches
[DEBUG] [BatchAllocationUtils]: Available preparation batches {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  batchCount: 1,
  positiveBatches: 1,
  negativeBatches: 0,
  totalAvailable: 120
}

// Allocation success
[INFO] [BatchAllocationUtils]: Preparation stock allocated successfully {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  required: 30,
  allocated: 30,
  batchesUsed: 1
}

// Cost breakdown
[INFO] [BatchAllocationUtils]: Preparation cost breakdown {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  preparationName: 'Bacon slices 30g',
  totalCost: 3450,
  avgCostPerUnit: 115,
  allocations: [{
    batchId: 'ad2375c4',
    qty: 30,
    cost: 115,
    total: 3450
  }]
}

// Fallback used (when no batches)
[INFO] [BatchAllocationUtils]: Using lastKnownCost fallback for preparation {
  preparationId: '701d0e2d-38fa-42bc-acdb-99889fc638a9',
  preparationName: 'Bacon slices 30g',
  deficitQuantity: 30,
  fallbackCost: 115
}
```

#### 4. **Replacement Modifiers Logs**

```typescript
// Replacement registered
🔄 [DecompositionEngine] Replacement registered: {
  key: 'recipe-id_component-id',
  targetName: 'Milk 3.2%',
  replacementOption: 'Oat Milk'
}

// Component replaced
🔄 [DecompositionEngine] Replacing component: {
  original: 'Milk 3.2%',
  replacement: 'Oat Milk'
}
```

#### 5. **WriteOffAdapter Logs**

```typescript
[INFO] [WriteOffAdapter]: Transforming traversal result for write-off {
  nodesCount: 3,
  menuItem: 'Test recipe'
}

[INFO] [WriteOffAdapter]: Write-off transformation complete {
  totalItems: 3,
  products: 1,
  preparations: 2,
  totalBaseCost: 5840
}
```

### Debugging Checklist

When investigating issues:

1. **Check decomposition output:**

   - Look for "Decomposition complete" log
   - Verify `totalNodes`, `products`, `preparations` counts

2. **Verify portion conversion:**

   - Look for "Converted portions to grams" log
   - Check `originalQuantity`, `convertedQuantity`, `portionSize`

3. **Check batch allocation:**

   - Look for "Available preparation batches" log
   - Verify `batchCount`, `totalAvailable`

4. **Verify cost calculation:**

   - Look for "Preparation cost breakdown" log
   - Check `totalCost`, `avgCostPerUnit`, `allocations`

5. **Check for fallbacks:**
   - Look for "Using lastKnownCost fallback" warnings
   - Verify fallback values are correct

---

## Version History

| Date       | Change                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2025-12-09 | **Phase 4 Complete:** Unified DecompositionEngine, deleted 1,728 lines |
| 2025-12-09 | Created batchAllocationUtils.ts for shared FIFO logic                  |
| 2025-12-09 | Migrated recipeWriteOffStore to WriteOffAdapter                        |
| 2025-12-09 | Migrated salesStore to CostAdapter                                     |
| 2025-12-09 | Migrated useCostCalculation to use batchAllocationUtils                |
| 2025-12-09 | Fixed updateNegativeBatch to use new cost when existing cost is 0      |
| 2025-12-09 | Added base_cost_per_unit fallback for products                         |
| 2025-12-09 | Added Replacement Modifiers support                                    |
| 2025-12-04 | Initial documentation                                                  |
