# Recipe Nesting - Implementation Documentation

**Date:** 2025-12-19
**Version:** Phase 1 Complete
**Status:** ✅ Core functionality implemented, UI completion pending

---

## 📋 Overview

Recipe Nesting allows recipes to use other recipes as components, enabling better composition and reusability of culinary creations.

**Example:**

```
Recipe: "Big Breakfast Complete"
  ├─ Recipe: "Hash Brown Potato" (1 portion)
  ├─ Recipe: "Scrambled Eggs" (1 portion)
  └─ Product: "Bacon" (50g)

MenuItem: "Big Breakfast"
  └─ Recipe: "Big Breakfast Complete"
      Modifiers: [ Replace "Hash Brown Potato" → "Hash Brown Zucchini" ]
```

---

## ✅ Implemented Features

### Phase 1: Types & Validation

**File:** `src/stores/recipes/types.ts`

- ✅ Updated `RecipeComponent.componentType` to include `'recipe'`
- ✅ Added `RecipeForRecipe` interface for nested recipe references
- ✅ Added `GetRecipeCallback` and `GetRecipeCostCallback` for integration

**File:** `src/stores/recipes/composables/useRecipeGraph.ts`

- ✅ Full DFS cycle detection algorithm (prevents A → B → A)
- ✅ Self-reference detection (prevents A → A)
- ✅ Depth validation (max 5 levels)
- ✅ Warning at 80% depth threshold (4/5 levels)
- ✅ Human-readable error messages with cycle paths

```typescript
import { useRecipeGraph } from '@/stores/recipes/composables/useRecipeGraph'

const { detectCycle, validateDepth, getRecipeDepth } = useRecipeGraph()

// Before saving
const cycleResult = detectCycle(recipeId, newComponents, allRecipes)
if (cycleResult.hasCycle) {
  console.error(cycleResult.errorMessage)
}

const depthResult = validateDepth(recipeId, allRecipes, 5)
if (!depthResult.isValid) {
  console.error(depthResult.errorMessage)
}
```

### Phase 2: Cost Calculation & Decomposition

**File:** `src/stores/recipes/composables/useCostCalculation.ts`

- ✅ Nested recipe cost calculation (planned mode)
- ✅ Recursive actual cost via FIFO batches (actual mode)
- ✅ Fallback chain: cached cost → recipe.cost → 0
- ✅ Integration callbacks for `getRecipe()` and `getRecipeCost()`

```typescript
// Nested recipe cost is calculated recursively
const recipeCostResult = await calculateRecipeCost(parentRecipe, 'planned')
// Automatically handles nested recipes by calling getRecipeCost() for each nested component
```

**File:** `src/core/decomposition/types.ts` & `DecompositionEngine.ts`

- ✅ Updated `RecipeComponent.componentType` to support `'recipe'`
- ✅ Recursive traversal already working via `traverseRecipe()` → `traverseComposition()` loop
- ✅ Proper decomposition to products/preparations for write-offs and cost calculations

### Phase 3: "Used In" Feature

**File:** `src/stores/recipes/composables/useRecipeUsage.ts`

- ✅ `findRecipeUsage()` - finds all Menu Items and parent Recipes using a recipe
- ✅ `findPreparationUsage()` - finds all Recipes and parent Preparations
- ✅ `canDeleteRecipe()` and `canDeletePreparation()` - deletion validation
- ✅ Returns detailed usage info with quantities and units

**File:** `src/views/recipes/components/widgets/UsedInWidget.vue`

- ✅ Universal widget for both recipes and preparations
- ✅ Shows Menu Items, Parent Recipes, Parent Preparations
- ✅ Click navigation to related items
- ✅ Inactive item indication
- ✅ Empty state when not used anywhere

**Integration:**

- ✅ Added to `UnifiedRecipeDialog.vue` (shows when editing existing items)

### Phase 4: UI Components (Partial)

**File:** `src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue`

- ✅ Added "Recipe" chip to component type selector (only for recipes, not preparations)
- ✅ Created helper functions: `getComponentTypeIcon()`, `getComponentTypeColor()`, `getItemLabel()`
- ✅ Updated all icon/color displays to use helper functions
- ⚠️ **Pending:** Recipe selector autocomplete with cycle detection filter

### Phase 5: Database Migration

**File:** `src/supabase/migrations/071_add_recipe_nesting_support.sql`

- ✅ Added CHECK constraint: `component_type IN ('product', 'preparation', 'recipe')`
- ✅ Created index: `idx_recipe_components_nested_recipes` (for "Used In" queries)
- ✅ Created function: `get_recipes_using_recipe(uuid)` (helper for finding usage)
- ✅ Full validation (pre-migration, post-migration checks)
- ✅ **Applied successfully to DEV database**

```sql
-- Example: Find all recipes using a specific recipe
SELECT * FROM get_recipes_using_recipe('target-recipe-uuid');

-- Returns: recipe_id, recipe_name, recipe_code, component_quantity, component_unit
```

---

## 🎯 Architecture

### Type System

```
RecipeComponent {
  componentType: 'product' | 'preparation' | 'recipe'  // ⭐ NEW: 'recipe' added
  componentId: string  // UUID of the component
  quantity: number
  unit: MeasurementUnit
  useYieldPercentage?: boolean
}
```

### Decomposition Flow

```
Menu Item
  ↓
Recipe (Main)
  ↓ components
  ├─ Product → Direct write-off
  ├─ Preparation → Decompose to products (or keep as is)
  └─ Recipe (Nested) → ⭐ Recursive traversal → Eventually products/preparations
```

### Cost Calculation Flow

```
calculateRecipeCost(parentRecipe)
  ↓
  for each component:
    if componentType === 'product':
      → Direct cost calculation
    if componentType === 'preparation':
      → Get preparation cost (cached or calculate)
    if componentType === 'recipe':  // ⭐ NEW
      → getRecipeCost(nestedRecipeId)
      → Recursive call if needed
      → Fallback: recipe.cost or 0
```

### Cycle Detection Algorithm

```
DFS Traversal:
1. Mark node as visited
2. Add to recursion stack (current path)
3. For each dependency:
   - If not visited: Recurse
   - If in recursion stack: ⚠️ CYCLE DETECTED
4. Remove from recursion stack (backtrack)

Complexity: O(V + E)
Where V = recipes, E = relationships
```

---

## 📖 Usage Examples

### Example 1: Create Nested Recipe

```typescript
const hashBrownRecipe = {
  name: 'Hash Brown Potato',
  components: [
    { componentType: 'product', componentId: 'potato-id', quantity: 200, unit: 'gram' },
    { componentType: 'product', componentId: 'onion-id', quantity: 50, unit: 'gram' },
    { componentType: 'product', componentId: 'oil-id', quantity: 20, unit: 'ml' }
  ]
}

const bigBreakfastRecipe = {
  name: 'Big Breakfast Complete',
  components: [
    {
      componentType: 'recipe', // ⭐ Nested recipe
      componentId: hashBrownRecipe.id,
      quantity: 1,
      unit: 'portion'
    },
    {
      componentType: 'recipe',
      componentId: scrambledEggsRecipe.id,
      quantity: 1,
      unit: 'portion'
    },
    {
      componentType: 'product',
      componentId: 'bacon-id',
      quantity: 50,
      unit: 'gram'
    }
  ]
}
```

### Example 2: Check for Cycles Before Save

```typescript
import { useRecipeGraph } from '@/stores/recipes/composables/useRecipeGraph'

const { detectCycle, formatCyclePath } = useRecipeGraph()

function validateBeforeSave(recipeId: string, newComponents: RecipeComponent[]) {
  const allRecipes = recipesStore.recipes

  // Check for cycles
  const cycleResult = detectCycle(recipeId, newComponents, allRecipes)

  if (cycleResult.hasCycle) {
    const readablePath = formatCyclePath(cycleResult.cyclePath!, allRecipes)
    throw new Error(`Cannot save: Circular dependency - ${readablePath}`)
  }

  return true
}
```

### Example 3: Get "Used In" Information

```typescript
import { useRecipeUsage } from '@/stores/recipes/composables/useRecipeUsage'

const { findRecipeUsage } = useRecipeUsage()

const usage = findRecipeUsage('hash-brown-recipe-id', recipesStore.recipes, menuStore.menuItems)

console.log('Menu Items using this recipe:', usage.menuItems)
// [{ menuItemId: '...', menuItemName: 'Big Breakfast', quantity: 1 }]

console.log('Recipes using this recipe:', usage.parentRecipes)
// [{ recipeId: '...', recipeName: 'Big Breakfast Complete', quantity: 1 }]

console.log('Total usages:', usage.totalUsages)
// 2
```

### Example 4: Decompose Nested Recipe for Write-Off

```typescript
import { DecompositionEngine } from '@/core/decomposition'

const engine = new DecompositionEngine(storeProvider)

// Decompose menu item with nested recipes
const result = await engine.traverse(
  {
    menuItemId: 'big-breakfast-item',
    variantId: 'default-variant',
    quantity: 2 // 2 servings
  },
  {
    preparationStrategy: 'decompose', // Break down to products
    applyYield: true,
    convertPortions: true,
    includePath: true
  }
)

// Result.nodes contains all products (recursively decomposed)
console.log(result.nodes)
// [
//   { type: 'product', productId: 'potato-id', quantity: 400, unit: 'gram', path: [...] },
//   { type: 'product', productId: 'eggs-id', quantity: 6, unit: 'piece', path: [...] },
//   { type: 'product', productId: 'bacon-id', quantity: 100, unit: 'gram', path: [...] }
// ]
```

---

## ⚠️ Limitations & Constraints

### Current Limitations

1. **Max Depth:** 5 levels (configurable via `MAX_RECIPE_DEPTH`)
2. **UI Incomplete:** Recipe selector autocomplete not yet implemented
3. **No Visual Tree:** Dependency tree visualization not implemented (simple list only)
4. **Database:** Only applied to **DEV database** (production migration pending)

### Important Notes

- ⚠️ Cycle detection is **mandatory** - UI must validate before allowing save
- ⚠️ Nested recipe costs require callbacks to be set via `setIntegrationCallbacks()`
- ⚠️ `component_id` in `recipe_components` table is stored as `TEXT` (UUID cast needed)

---

## 🔧 Remaining Work (Phase 4 UI Completion)

### High Priority

1. **Recipe Selector Autocomplete** (`RecipeComponentsEditorWidget.vue`)

   - Add Recipe option to component selection
   - Filter out recipes that would create cycles (use `detectCycle()`)
   - Show depth warning when adding nested recipes
   - Display current depth indicator (e.g., "Depth: 3/5")

2. **Integration Callback Setup** (`recipesStore.ts`)

   - Update `setIntegrationCallbacks()` calls to include recipe callbacks
   - Ensure `getRecipe()` and `getRecipeCost()` are provided

3. **Error Handling**
   - Show user-friendly error when cycle detected
   - Show warning when approaching depth limit
   - Prevent save if validation fails

### Medium Priority

4. **Recipe Detail Display**

   - Show nested recipe name, code, cost in component list
   - Add "View Details" button for navigation to nested recipe
   - Display portion size information

5. **Testing**
   - Create test recipes with 3-5 levels depth
   - Verify cost calculation accuracy
   - Test decomposition with nested recipes
   - Verify "Used In" widget works correctly

### Low Priority

6. **Production Deployment**

   - Apply migration to production database
   - Verify RLS policies allow nested recipe operations
   - Monitor performance with deep nesting

7. **Documentation**
   - Add examples to CLAUDE.md
   - Update architecture diagrams (if any)
   - Create video tutorial or screenshots

---

## 📊 Performance Considerations

### Database Indexes

- ✅ `idx_recipe_components_nested_recipes` - speeds up "Used In" queries
- ⚠️ Deep nesting (4-5 levels) may impact cost calculation performance
- ⚠️ Consider caching recipe costs to avoid repeated calculations

### Recommendations

1. **Cache Recipe Costs:** Store calculated costs in `recipes.cost` field
2. **Limit Depth:** Enforce 5-level limit to prevent performance issues
3. **Lazy Loading:** Load nested recipe details on-demand in UI
4. **Batch Queries:** Use `get_recipes_using_recipe()` for efficient lookups

---

## 🎉 Summary

### What Works ✅

- Core type system supports recipe nesting
- Cycle detection prevents invalid configurations
- Cost calculation handles nested recipes (both planned & actual modes)
- Decomposition engine recursively processes nested recipes
- "Used In" feature tracks all relationships
- Database migration applied successfully
- UI shows icons and labels for recipe components

### What's Pending ⚠️

- Recipe selector autocomplete in editor
- Recipe-specific validation UI
- Full testing with real data
- Production database migration
- Complete documentation with examples

### Estimated Remaining Work

- **UI Completion:** 4-6 hours
- **Testing:** 2-3 hours
- **Production Migration:** 1 hour
- **Documentation:** 1 hour

**Total:** ~8-11 hours to full completion

---

## 📞 Support & Questions

For questions about this implementation, refer to:

- This document (`docs/recipe-nesting.md`)
- Code comments in key files (marked with `⭐ PHASE 1`)
- Database migration: `src/supabase/migrations/071_add_recipe_nesting_support.sql`

---

**End of Documentation**
