# NextTodo - Fix Nested Preparations Cost Calculation

## Problem

Cost calculation fails with error: `Missing items: Preparation: UUID`

**Root cause:** When a preparation uses another preparation as ingredient (`type: 'preparation'`), the code calls `getProductCallback` which only searches in `productsStore`. Since preparations are NOT products, it returns `null` and the calculation fails.

**Affected code:** `src/stores/recipes/composables/useCostCalculation.ts`

```typescript
// Line 237 - BUG: Uses getProductCallback for preparations!
} else if (ingredient.type === 'preparation') {
  const prep = (await getProductCallback(ingredient.id)) as any // <-- WRONG! Should search in preparations
```

## Solution

Add a new callback `getPreparationCallback` that searches in preparations store, and use it when `ingredient.type === 'preparation'`.

---

## Implementation Steps

### Step 1: Add GetPreparationCallback type

**File:** `src/stores/recipes/types.ts`

```typescript
// Add after GetProductCallback (line 226)
export type GetPreparationCallback = (id: string) => Promise<Preparation | null>
```

### Step 2: Update useCostCalculation.ts

**File:** `src/stores/recipes/composables/useCostCalculation.ts`

#### 2.1 Add import

```typescript
import type {
  // ... existing imports
  GetPreparationCallback // <-- ADD
  // ...
} from '../types'
```

#### 2.2 Add callback variable (after line 33)

```typescript
let getProductCallback: GetProductCallback | null = null
let getPreparationCallback: GetPreparationCallback | null = null // <-- ADD
let getPreparationCostCallback: GetPreparationCostCallback | null = null
```

#### 2.3 Update setIntegrationCallbacks function

```typescript
function setIntegrationCallbacks(
  getProduct: GetProductCallback,
  getPreparation: GetPreparationCallback, // <-- ADD
  getPreparationCost: GetPreparationCostCallback
): void {
  getProductCallback = getProduct
  getPreparationCallback = getPreparation // <-- ADD
  getPreparationCostCallback = getPreparationCost
  DebugUtils.debug(MODULE_NAME, 'Integration callbacks configured')
}
```

#### 2.4 Fix calculatePreparationCost for nested preparations (around line 234-299)

Replace:

```typescript
} else if (ingredient.type === 'preparation') {
  // P PHASE 1: NEW LOGIC - Preparation ingredients
  // Get preparation by ID
  const prep = (await getProductCallback(ingredient.id)) as any // Reuse callback, will be typed later
```

With:

```typescript
} else if (ingredient.type === 'preparation') {
  // P PHASE 1: NEW LOGIC - Preparation ingredients
  if (!getPreparationCallback) {
    DebugUtils.warn(MODULE_NAME, 'Preparation callback not set')
    missingPreparations.push(ingredient.id)
    continue
  }

  // Get preparation by ID using the correct callback
  const prep = await getPreparationCallback(ingredient.id)
```

### Step 3: Update recipesStore.ts

**File:** `src/stores/recipes/recipesStore.ts`

#### 3.1 Update setupIntegrationCallbacks function

```typescript
function setupIntegrationCallbacks() {
  const getProduct = async (productId: string) => {
    return integrationComposable.getProductForRecipe(productId)
  }

  // ADD: New callback for getting preparations
  const getPreparation = async (preparationId: string) => {
    return preparationsComposable.getPreparationById(preparationId)
  }

  const getPreparationCost = async (preparationId: string) => {
    return costCalculationComposable.getPreparationCost(preparationId)
  }

  return { getProduct, getPreparation, getPreparationCost }
}
```

#### 3.2 Update callback setup calls

```typescript
// Around line 197
const callbacks = setupIntegrationCallbacks()
costCalculationComposable.setIntegrationCallbacks(
  callbacks.getProduct,
  callbacks.getPreparation, // <-- ADD
  callbacks.getPreparationCost
)
recipesComposable.setIntegrationCallbacks(
  callbacks.getProduct,
  callbacks.getPreparation, // <-- ADD (if needed)
  callbacks.getPreparationCost
)
```

### Step 4: Update useRecipes.ts (if needed)

**File:** `src/stores/recipes/composables/useRecipes.ts`

Update `setIntegrationCallbacks` to accept the new parameter if recipes also need to resolve preparations.

---

## Testing

1. Open a preparation that uses another preparation as ingredient (e.g., "Banana frozen 150g")
2. Click "Calculate Cost" or "Recalculate"
3. Should successfully calculate cost without "Missing items" error
4. Verify the cost breakdown shows the nested preparation with correct name and cost

---

## Related Files

- `src/stores/recipes/types.ts` - Callback types
- `src/stores/recipes/composables/useCostCalculation.ts` - Main cost calculation logic
- `src/stores/recipes/recipesStore.ts` - Store initialization and callbacks setup
- `src/stores/recipes/composables/useRecipes.ts` - Recipe operations
- `src/stores/recipes/composables/usePreparations.ts` - Preparation operations

---

## Database Check (Verified)

Preparations exist in production database:

- `51069fe7-1c6d-4bbc-b8e0-59d9e1f52352` = "Avocado half cleaned"
- `99451585-c9b3-4726-bc0d-5bfd5b9672fe` = "Humus red"
- "Banana frozen 150g" (P-39) has ingredient "Banana" (`f751ce54-...`)

**The issue is NOT in the database - it's in the frontend callback resolution.**
