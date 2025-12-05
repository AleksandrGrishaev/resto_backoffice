# NextTodo - PHASE 1: MVP Nested Preparations

**Start Date**: 2025-12-05
**Duration**: 2 weeks
**Estimate**: 50 Story Points

---

## Phase 1 Goal

Enable preparations to use other preparations as ingredients (nested preparations).

**WITHOUT**:

- ❌ Portion type (weight vs portion) - deferred to Phase 2
- ❌ Fancy UI (tree view, badges) - deferred to Phase 3
- ❌ Changes to decomposition - already works correctly!

**ONLY**:

- ✅ Basic nested preparations functionality
- ✅ Cycle detection (prevent A→B→A)
- ✅ Simple cost calculation via lastKnownCost
- ✅ Production with FIFO write-off

---

## Business Case Example

```
Step 1: Produce "Marinated Fish" (1000g)
  Recipe:
  - Fresh Fish: 1000g × 500 rub/kg = 500 rub
  - Marinade: 200ml × 100 rub/l = 20 rub

  Creates batch_1:
  - preparationId: "marinated_fish"
  - quantity: 1000g
  - costPerUnit: (500 + 20) / 1000 = 0.52 rub/g

Step 2: Produce "Fish Portion" (300g → 10 portions of 30g)
  Recipe:
  - Marinated Fish: 300g ← uses batch_1 via FIFO

  Write-off:
  - batch_1: -300g × 0.52 rub/g = 156 rub

  Creates batch_2:
  - preparationId: "fish_portion"
  - quantity: 300g (NO portion type yet!)
  - costPerUnit: 156 / 300 = 0.52 rub/g

Step 3: Sell dish (uses 60g from portions)
  Write-off via FIFO:
  - batch_2: -60g × 0.52 rub/g = 31.2 rub
```

---

## Key Architectural Decisions

### 1. Cost Calculation - NO Recursion

```typescript
// ✅ DOING: Flat calculation (1 level)
if (ingredient.type === 'preparation') {
  const prep = getPreparationById(ingredient.id)
  cost = prep.lastKnownCost * ingredient.quantity
}

// ❌ NOT DOING: Deep recursion through entire chain
// (deferred to Phase 4)
```

### 2. Decomposition - NO CHANGES!

```typescript
// ✅ Current behavior is CORRECT:
// Preparations NOT decomposed during sale
// Written off via FIFO from final batch

// Files we DON'T change:
// - useDecomposition.ts ✅
// - useKitchenDecomposition.ts ✅
// - useActualCostCalculation.ts (minimal changes)
```

### 3. Cycle Detection - Mandatory

```typescript
// DFS algorithm:
// A → B → C → OK
// A → B → A → ERROR!
```

---

## Stage 1: Database Schema (5 SP) ⏳ NOT STARTED

### 1.1. Database Migration

**File**: `src/supabase/migrations/012_add_nested_preparations.sql` ⭐ NEW

```sql
-- Migration: 012_add_nested_preparations
-- Description: Allow preparations to use other preparations as ingredients
-- Date: 2025-12-05

-- CONTEXT:
-- Business needs multi-stage preparation production:
-- Fresh Fish → Marinated Fish → Fish Portion → Sale

-- Currently preparation_ingredients only supports type: 'product'
-- This migration allows type: 'preparation'

-- Update preparation_ingredients table
-- Note: The 'type' field is stored in JSONB 'recipe' column
-- No schema change needed - JSONB is flexible
-- But document expected structure:

COMMENT ON COLUMN preparations.recipe IS
'JSONB array of ingredients. Structure:
[
  { "type": "product", "id": "uuid", "quantity": 100, "unit": "gram" },
  { "type": "preparation", "id": "uuid", "quantity": 50, "unit": "gram" }
]
Allowed types: product, preparation';

-- POST-MIGRATION VALIDATION
DO $$
BEGIN
  RAISE NOTICE 'Migration 012: Nested preparations support added';
  RAISE NOTICE 'JSONB recipe column now supports type: preparation';
END $$;
```

**Apply on DEV**:

```typescript
mcp__supabase__apply_migration({
  name: '012_add_nested_preparations',
  query: '...' // SQL above
})
```

**Apply on PROD**: Manually via Supabase SQL Editor (after testing on DEV)

---

## Stage 2: Type Definitions (3 SP) ⏳ NOT STARTED

### 2.1. Update Types

**File**: `src/stores/recipes/types.ts` ✏️ MODIFY

```typescript
// ============================================
// PreparationIngredient - CRITICAL CHANGE
// ============================================

export interface PreparationIngredient {
  type: 'product' | 'preparation' // ⭐ CHANGED from 'product' only
  id: string // Product ID or Preparation ID
  quantity: number
  unit: MeasurementUnit
  useYieldPercentage?: boolean
  notes?: string
  sortOrder?: number
}

// ============================================
// Preparation - NO CHANGES (yet)
// ============================================

export interface Preparation {
  // ... all existing fields stay as-is
  // portionType and portionSize added in Phase 2
}
```

**Verify compilation**:

```bash
pnpm build
```

---

## Stage 3: Cycle Detection Service (8 SP) ⏳ NOT STARTED

### 3.1. Create Cycle Detection Composable

**File**: `src/stores/recipes/composables/usePreparationGraph.ts` ⭐ NEW

(See full implementation in detailed plan - includes DFS algorithm for cycle detection)

**Test Cases**:

1. Simple cycle: A → B → A
2. Complex cycle: A → B → C → A
3. Valid chain: A → B → C → D
4. Valid branching: A → B, A → C
5. Self-reference: A → A

---

## Stage 4: Store Layer Updates (6 SP) ⏳ NOT STARTED

### 4.1. Recipes Store - Add Validation

**File**: `src/stores/recipes/recipesStore.ts` ✏️ MODIFY

- Add cycle validation in `createPreparation()`
- Add cycle validation in `updatePreparation()`
- Add `getPreparationById()` helper if missing

### 4.2. Supabase Mappers

**File**: `src/stores/recipes/supabaseMappers.ts` ✏️ MODIFY

- Update `preparationIngredientToSupabaseInsert()` - handle 'preparation' type
- Update `preparationIngredientFromSupabase()` - handle 'preparation' type

---

## Stage 5: Cost Calculation (5 SP) ⏳ NOT STARTED

### 5.1. Update Cost Calculation Composable

**File**: `src/stores/recipes/composables/useCostCalculation.ts` ✏️ MODIFY

Add handling for `ingredient.type === 'preparation'`:

- Use `prep.lastKnownCost` (NO recursion!)
- Show warning if not yet produced
- Fallback to `costPerPortion` if available

---

## Stage 6: Production Logic (5 SP) ⏳ NOT STARTED

### 6.1. Update Preparation Service

**File**: `src/stores/preparation/preparationService.ts` ✏️ MODIFY

- Handle preparation ingredients in production
- FIFO write-off from preparation batches
- Calculate actual cost
- Create new batch
- Update `lastKnownCost`

---

## Stage 7: UI Components (10 SP) ⏳ NOT STARTED

### 7.1. Recipe Components Editor Widget

**File**: `src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue` ✏️ MODIFY

Main changes:

1. Add "Preparation" to component type selector
2. Add preparation selector (autocomplete)
3. Real-time cycle validation
4. Show cycle warning alert
5. Display type badges (product/preparation)

### 7.2. Unified Recipe Dialog

**File**: `src/views/recipes/components/UnifiedRecipeDialog.vue` ✏️ MODIFY

- Remove hardcoded `componentType: 'product'`
- Use actual type from editor
- Add cycle validation before save
- Show error dialog if cycle detected

---

## Testing (Phase 1) ⏳ NOT STARTED

### Test Cases

#### 1. Cycle Detection

- [ ] Simple cycle: A → B → A
- [ ] Complex cycle: A → B → C → A
- [ ] Deep cycle: A → B → C → D → A
- [ ] Self-reference: A → A
- [ ] Valid chain: A → B → C → D
- [ ] Valid branching: A → (B, C)

#### 2. Cost Calculation

- [ ] Preparation with only products (existing)
- [ ] Preparation with only preparations
- [ ] Mixed ingredients (products + preparations)
- [ ] Unproduced preparation shows warning
- [ ] lastKnownCost used correctly

#### 3. Production

- [ ] Product ingredients work (existing)
- [ ] Preparation ingredients work
- [ ] FIFO allocation correct
- [ ] Insufficient stock throws error
- [ ] lastKnownCost updated
- [ ] Batch created with correct cost

#### 4. UI

- [ ] Can select preparation in editor
- [ ] Cycle warning shows correctly
- [ ] Cannot save with cycle
- [ ] Can save valid nested preparation
- [ ] Type badges display correctly

#### 5. Integration

- [ ] Full flow: create → produce → sell
- [ ] Multi-level nesting works (A → B → C)
- [ ] Mixed ingredients work

---

## Affected Files Summary

**Total: 10 files** (2 new, 8 modified)

### NEW Files (2)

1. `src/supabase/migrations/012_add_nested_preparations.sql`
2. `src/stores/recipes/composables/usePreparationGraph.ts`

### MODIFIED Files (8)

3. `src/stores/recipes/types.ts`
4. `src/stores/recipes/recipesStore.ts`
5. `src/stores/recipes/supabaseMappers.ts`
6. `src/stores/recipes/composables/useCostCalculation.ts`
7. `src/stores/preparation/preparationService.ts`
8. `src/views/recipes/components/UnifiedRecipeDialog.vue`
9. `src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue`
10. `src/stores/sales/composables/useActualCostCalculation.ts` (minimal changes)

### NOT MODIFIED (important!)

- ❌ `useDecomposition.ts` - works as-is
- ❌ `useKitchenDecomposition.ts` - works as-is
- ❌ All UI display components - deferred to Phase 3

---

## Story Points Breakdown

| Stage     | Task                    | SP     | Status             |
| --------- | ----------------------- | ------ | ------------------ |
| 1         | Database Migration      | 5      | ⏳ Not Started     |
| 2         | Type Definitions        | 3      | ⏳ Not Started     |
| 3         | Cycle Detection Service | 8      | ⏳ Not Started     |
| 4         | Store Layer Updates     | 6      | ⏳ Not Started     |
| 5         | Cost Calculation        | 5      | ⏳ Not Started     |
| 6         | Production Logic        | 5      | ⏳ Not Started     |
| 7         | UI Components           | 10     | ⏳ Not Started     |
| 8         | Testing                 | 8      | ⏳ Not Started     |
| **Total** | **Phase 1 (MVP)**       | **50** | **⏳ Not Started** |

**Note**: Increased from 30 to 50 SP after detailed analysis

---

## Success Criteria (Phase 1)

### Must Have ✅

- [ ] Can create preparation using another preparation as ingredient
- [ ] Circular dependency detection prevents A→B→A
- [ ] Cost calculation includes nested prep costs via lastKnownCost
- [ ] Production writes off preparation ingredients via FIFO
- [ ] All existing functionality works (no breaking changes)
- [ ] Database migration applied successfully on DEV

### Should Have ✅

- [ ] Clear error messages for cycle detection
- [ ] Warning when nested preparation not yet produced
- [ ] Type badges show in component editor
- [ ] Unit tests pass for cycle detection

### Nice to Have (can defer)

- [ ] Performance tests for deep nesting
- [ ] Production migration script ready

---

## Next Steps After Phase 1

1. **Demo to stakeholders** - show working nested preparations
2. **Gather feedback** - is Phase 2 (portion type) needed immediately?
3. **Apply to PROD** - migration to production database
4. **Plan Phase 2** - if needed, start portion type support

---

## Notes & Gotchas

### Important Points:

1. **lastKnownCost is critical** - without it, can't calculate nested prep cost
2. **Cycle detection mandatory** - otherwise system may hang
3. **DON'T touch decomposition** - already works correctly for FIFO!
4. **Portions deferred** - doing in Phase 2, everything weight-based for now

### Potential Issues:

1. **Unproduced preparations** - if nested prep not produced, cost = 0 or fallback
2. **FIFO shortage** - may not have enough stock for production
3. **Deep nesting performance** - not a problem yet (no recursion in UI)

---

## Daily Progress Tracking

### Day 1: ⏳

- [ ] Database migration created and tested on DEV
- [ ] Type definitions updated
- [ ] Build passes

### Day 2: ⏳

- [ ] Cycle detection service implemented
- [ ] Unit tests for cycle detection pass

### Day 3-4: ⏳

- [ ] Store layer updates complete
- [ ] Cost calculation handles nested preps
- [ ] Tests pass

### Day 5-6: ⏳

- [ ] Production logic updated
- [ ] FIFO allocation works with preparations
- [ ] Integration tests pass

### Day 7-8: ⏳

- [ ] UI components updated
- [ ] Component editor supports preparations
- [ ] Cycle warnings work

### Day 9-10: ⏳

- [ ] Full testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Ready for demo

---

**Last Updated**: 2025-12-05
**Next Review**: After Phase 1 completion (~2 weeks)
