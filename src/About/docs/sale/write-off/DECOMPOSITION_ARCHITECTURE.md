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

### Key Logs

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

// FIFO allocation
✅ [BatchAllocationUtils] Preparation stock allocated successfully: {
  preparationId, required, allocated, batchesUsed
}

// Fallback used
⚠️ [BatchAllocationUtils] Using base_cost_per_unit fallback: {
  productId, productName, deficitQuantity, baseCostPerUnit
}
```

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
