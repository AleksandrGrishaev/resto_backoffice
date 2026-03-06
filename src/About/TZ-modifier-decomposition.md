# TZ: Modifier Decomposition Pipeline

## Problem Statement

When a POS order includes menu item modifiers (replacement or addon), the DecompositionEngine should adjust ingredient write-offs accordingly. Currently, modifiers are selected in POS, stored on bill items, and passed to the decomposition pipeline — but the actual write-off does not reflect modifier changes. Both replacement and addon modifiers are ignored during ingredient write-off.

**Example**: Big Breakfast with modifier "Hash-brown potato replaces Grated zucchini"

- **Expected**: Write-off includes Hash-brown potato, excludes Grated zucchini
- **Actual**: Write-off includes Grated zucchini (original recipe), no Hash-brown potato

---

## Architecture Overview

### Pipeline Flow

```
POS CustomizationDialog
  -> SelectedModifier[] (with groupType, targetComponents, composition)
    -> PosBillItem.selectedModifiers (stored in DB as JSONB)
      -> paymentsStore.queueBackgroundSalesRecording()
        -> salesStore.recordSalesTransaction(payment, billItems, ...)
          -> DecompositionEngine.traverse(menuInput with selectedModifiers)
            -> buildReplacementMap() + processAddonModifiers()
              -> WriteOffAdapter -> StorageStore.createWriteOff()
```

### Key Files

| File                                                     | Role                                                   |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `src/views/pos/menu/dialogs/CustomizationDialog.vue`     | POS modifier selection UI                              |
| `src/stores/pos/types.ts`                                | `PosBillItem.selectedModifiers` type                   |
| `src/stores/pos/orders/supabaseMappers.ts`               | Maps `selected_modifiers` to/from DB                   |
| `src/core/decomposition/DecompositionEngine.ts`          | Main decomposition logic                               |
| `src/core/decomposition/utils/replacementUtils.ts`       | Replacement modifier mapping                           |
| `src/core/decomposition/types.ts`                        | `MenuItemInput`, `SelectedModifier`                    |
| `src/stores/sales/salesStore.ts`                         | Sales transaction + decomposition trigger              |
| `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts` | Write-off creation                                     |
| `src/stores/menu/types.ts`                               | `SelectedModifier`, `TargetComponent`, `ModifierGroup` |

---

## Root Causes

### Problem 1: Stale `targetComponents` IDs

**Severity**: CRITICAL

`TargetComponent.componentId` references `RecipeComponent.id` — a random UUID generated each time a recipe is saved. When a recipe is modified (even without changing components), all component IDs are regenerated. The saved `targetComponents` in `ModifierGroup` then point to non-existent IDs.

**Flow of the bug**:

1. Recipe "Big Breakfast" is created with component "Grated zucchini" (id: `abc-123`)
2. ModifierGroup is created with `targetComponents: [{ componentId: 'abc-123', recipeId: '...', ... }]`
3. Recipe is edited (e.g., quantity change) -> component IDs regenerated -> "Grated zucchini" now has id: `def-456`
4. ModifierGroup still references `componentId: 'abc-123'` (stale)
5. `getReplacementForComponent(recipeId, 'def-456', replacements)` returns `undefined` -> no replacement applied

**Where the mapping breaks** (`replacementUtils.ts:83-85`):

```typescript
function getReplacementForComponent(recipeId, componentId, replacements) {
  const key = `${recipeId}_${componentId}` // key uses current recipe's component ID
  return replacements.get(key) // map was built with STALE component ID
}
```

**Evidence**: In DB, modifier option has `targetComponents[0].componentId = "14a17583..."` but current recipe component IDs are completely different.

### Problem 2: Missing `composition` on Modifier Options

**Severity**: HIGH

When replacement modifiers have no `composition` array on the option, the engine skips the original component but adds nothing in its place. This means:

- Original ingredient (e.g., Grated zucchini) IS excluded
- Replacement ingredient (e.g., Hash-brown potato) is NOT added

This happens when `composition` was not properly set in the MenuItemDialog modifier editor.

**Where it manifests** (`DecompositionEngine.ts:258`):

```typescript
if (isCompositionTarget && modifier.composition?.length) {
  // Add replacement composition - ONLY if composition exists
  for (const replComp of modifier.composition) { ... }
} else {
  // Just exclude - composition target without composition data
}
```

### Problem 3: Unit/Quantity Mapping in Modifier Compositions

**Severity**: MEDIUM

When a modifier option has `composition: [{ type: 'recipe', id: '...', quantity: 2, unit: 'portion' }]`:

- `quantity: 2` with `unit: 'portion'` and recipe `portionSize: 2` (pieces) = 4 pieces
- But the intent is 2 pieces, not 2 portions

The `unit` field in modifier composition JSONB is often missing or defaults to `'portion'` which can cause incorrect quantity calculation during decomposition.

**Where it matters** (`DecompositionEngine.ts:237`):

```typescript
const recipeScale = comp.quantity / portionSize
// If comp.quantity=2, portionSize=2 -> scale=1 (correct for 2 pieces)
// If comp.quantity=2 with unit='portion' -> means 2*portionSize = 4 pieces (wrong)
```

---

## Solution Design

### Fix 1: Stable Component Identification

**Option A: Use `componentId` (product/preparation/recipe ID) instead of `RecipeComponent.id`**

Replace `TargetComponent.componentId` with the actual entity ID (`product.id`, `preparation.id`, or nested `recipe.id`) which is stable across recipe edits.

```typescript
// BEFORE (fragile)
interface TargetComponent {
  componentId: string // RecipeComponent.id - changes on every recipe save
  recipeId?: string
}

// AFTER (stable)
interface TargetComponent {
  entityId: string // product.id / preparation.id / recipe.id - stable
  recipeId?: string // which recipe contains this component
  entityType: 'product' | 'preparation' | 'recipe'
  entityName: string // for display
}
```

Replacement lookup changes from:

```typescript
// BEFORE
const key = `${recipeId}_${recipeComponent.id}`

// AFTER
const key = `${recipeId}_${recipeComponent.componentId}` // componentId = entity ID
```

**Impact**: Requires migration of existing `targetComponents` in all `menu_items.modifier_groups` JSONB. The `RecipeComponent.componentId` already stores the entity ID, so the lookup key changes to use `componentId` (the entity reference) instead of `id` (the row UUID).

**Option B: Deterministic `RecipeComponent.id`**

Generate `RecipeComponent.id` deterministically from `recipeId + componentId + componentType` so it's stable across saves. This avoids changing the `TargetComponent` structure.

```typescript
// In recipe save logic:
component.id = generateDeterministicId(recipeId, component.componentId, component.componentType)
```

**Recommendation**: Option A is simpler and more robust. The lookup should use the stable entity ID, not the row UUID.

### Fix 2: Auto-resolve Composition from Recipe

When a replacement modifier option doesn't have explicit `composition`, auto-derive it from the option's linked recipe/preparation/product.

```typescript
// In DecompositionEngine.traverseRecipe, when replacement found:
if (isCompositionTarget) {
  let composition = modifier.composition

  // Auto-resolve if no explicit composition
  if (!composition?.length && modifier.optionId) {
    // Look up the option in the modifier group to find its linked entity
    composition = resolveCompositionFromOption(modifier)
  }

  if (composition?.length) {
    for (const replComp of composition) { ... }
  }
}
```

Alternative: Enforce composition at save time in MenuItemDialog — when creating a replacement modifier option, require the user to specify what composition replaces the target.

### Fix 3: Unit Normalization for Modifier Compositions

Auto-resolve the unit from the linked recipe/preparation at decomposition time, same as was done for the MenuItemDialog UI (using `resolveCompositionUnit()`).

For modifier compositions stored in DB:

- If `unit` is missing -> resolve from recipe's `portion_unit`
- If `unit` is `'portion'` and recipe is portion-type -> use recipe's `portion_unit` (e.g., `'piece'`)
- Quantity should represent count in the resolved unit

---

## Implementation Plan

### Phase 1: Fix Stable Component References (Critical)

1. **Update `getReplacementForComponent()`** to match by entity ID instead of RecipeComponent row ID:

   ```
   replacementUtils.ts: key = `${recipeId}_${recipeComp.componentId}`
   // recipeComp.componentId is already the stable entity ID (product/prep/recipe ID)
   ```

2. **Update `buildReplacementMap()`** to use entity ID from `targetComponents`:

   ```
   targetComponents[i].componentId should store entity ID, not RecipeComponent.id
   ```

3. **Migrate existing data**: Update `menu_items.modifier_groups` JSONB to fix stale `componentId` values in `targetComponents`. Match by `componentName` against current recipe components.

4. **Fix MenuItemDialog**: When saving modifier target components, store `recipeComponent.componentId` (entity ID) not `recipeComponent.id` (row UUID).

### Phase 2: Validate Composition Data (High)

1. **MenuItemDialog validation**: When saving a replacement modifier, validate that each option has a `composition` array with at least one entry.

2. **Warn on missing composition**: In DecompositionEngine, log a warning when a replacement modifier has targets but no composition — this means the replacement removes an ingredient without adding anything.

3. **Auto-populate composition**: When user selects a recipe/preparation as a replacement option, auto-fill the composition array.

### Phase 3: Unit Normalization (Medium)

1. **Save-time normalization**: When saving modifier options in MenuItemDialog, resolve and store the correct `unit` from the linked entity.

2. **Read-time fallback**: In DecompositionEngine, if composition unit is missing or `'portion'`, resolve from the entity's output unit.

---

## Testing Plan

### Unit Tests

1. **Replacement modifier with valid targetComponents** -> original component excluded, replacement composition added
2. **Replacement modifier with stale targetComponents** -> should still match by entity ID
3. **Addon modifier with composition** -> extra ingredients added to decomposition
4. **Multi-target replacement** -> first target gets composition, others excluded
5. **Default option selected** -> no replacement applied (isDefault=true skipped)

### Integration Tests (DB)

1. Create menu item with modifier groups
2. Process POS order with modifiers selected
3. Verify write-off includes correct ingredients (replacements applied)
4. Verify sales_transaction.decomposition_summary reflects modifiers

### Manual Test Case: Big Breakfast

1. Big Breakfast recipe: Grated zucchini + Egg + Sausage + Toast
2. Modifier: "Side dish" (replacement) -> Hash-brown potato replaces Grated zucchini
3. Order 1x Big Breakfast with Hash-brown potato selected
4. **Expected write-off**: Hash-brown potato, Egg, Sausage, Toast
5. **Expected excluded**: Grated zucchini

---

## DB Evidence

Order `0f87f831` — 2x Big Breakfast with "Hash-brown potato" modifier selected:

- `sales_transactions.decomposition_summary` shows Grated zucchini (should be Hash-brown potato)
- `recipe_writeoffs.decomposed_items` shows base recipe without modifier adjustments
- `storage_operations` shows write-off of Grated zucchini (incorrect)

The `selected_modifiers` JSONB on `pos_bill_items` correctly contains the modifier data including `groupType: 'replacement'` and `targetComponents`, but the stale `componentId` prevents the replacement from being applied during decomposition.

---

## Priority

1. **Phase 1** (Critical) — Fix stable references. Without this, NO replacement modifiers work.
2. **Phase 2** (High) — Validate composition data. Prevents silent failures.
3. **Phase 3** (Medium) — Unit normalization. Prevents quantity calculation errors.

## Estimated Scope

- Phase 1: `replacementUtils.ts`, `MenuItemDialog.vue` (modifier save), DB migration for existing data
- Phase 2: `ModifiersEditorWidget.vue` (validation), `DecompositionEngine.ts` (warning logs)
- Phase 3: `DecompositionEngine.ts` (unit resolution), `ModifiersEditorWidget.vue` (save-time normalization)
