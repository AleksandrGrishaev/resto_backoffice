# NextTodo - PHASE 2: Portion Type Support

**Start Date**: 2025-12-05
**Duration**: 1 week
**Estimate**: 15 Story Points

---

## Phase 2 Goal

Add "portion" as an alternative to weight-based quantities for preparations.

**Business Need**:

- Kitchen staff thinks in portions, not grams
- "10 fish portions" is clearer than "300g of fish preparation"
- Cost calculation stays accurate via weight conversion

**Example**:

```
Before (Phase 1): "Fish Portion: 300g"
After (Phase 2):  "Fish Portion: 10 portions × 30g = 300g"
```

---

## What We're Adding

1. **Database**: `portion_type` field ('weight' | 'portion'), `portion_size` field
2. **Types**: Update `Preparation` interface
3. **UI**: Radio buttons for type selection + portion size input
4. **Display**: Show "10 portions (30g each)" format
5. **Production**: Create batches with portion quantities
6. **FIFO**: Convert portions ↔ weight for allocation

**NOT Adding** (deferred to Phase 3):

- Tree view for nested ingredients
- Visual badges and icons
- Cost breakdown drill-down

---

## Stage 1: Database Schema (3 SP)

### 1.1. Database Migration

**File**: `src/supabase/migrations/041_add_portion_type.sql` ⭐ NEW

```sql
-- Migration: 041_add_portion_type
-- Description: Add portion type support to preparations
-- Date: 2025-12-05

-- Add portion_type column to preparations table
ALTER TABLE preparations
ADD COLUMN IF NOT EXISTS portion_type TEXT DEFAULT 'weight'
CHECK (portion_type IN ('weight', 'portion'));

-- Add portion_size column (grams per portion, only used when portion_type = 'portion')
ALTER TABLE preparations
ADD COLUMN IF NOT EXISTS portion_size NUMERIC DEFAULT NULL;

-- Add portion_type to preparation_batches for tracking
ALTER TABLE preparation_batches
ADD COLUMN IF NOT EXISTS portion_type TEXT DEFAULT 'weight'
CHECK (portion_type IN ('weight', 'portion'));

ALTER TABLE preparation_batches
ADD COLUMN IF NOT EXISTS portion_size NUMERIC DEFAULT NULL;

-- Add portion_quantity to batches (number of portions, when applicable)
ALTER TABLE preparation_batches
ADD COLUMN IF NOT EXISTS portion_quantity NUMERIC DEFAULT NULL;

-- Comments for documentation
COMMENT ON COLUMN preparations.portion_type IS
'How quantities are measured: weight (grams) or portion (fixed-size pieces)';

COMMENT ON COLUMN preparations.portion_size IS
'Size of one portion in grams. Only used when portion_type = portion';

COMMENT ON COLUMN preparation_batches.portion_quantity IS
'Number of portions in this batch. Only used when portion_type = portion';

-- Validation
DO $$
BEGIN
  RAISE NOTICE 'Migration 041: Portion type support added';
END $$;
```

**Apply on DEV**:

```typescript
mcp__supabase__apply_migration({
  name: '041_add_portion_type',
  query: '...' // SQL above
})
```

---

## Stage 2: Type Definitions (2 SP)

### 2.1. Update Types

**File**: `src/stores/recipes/types.ts` ✏️ MODIFY

```typescript
// ⭐ NEW: Portion type enum
export type PortionType = 'weight' | 'portion'

// Update Preparation interface
export interface Preparation extends BaseEntity {
  // ... existing fields ...

  // ⭐ PHASE 2: Portion type support
  portionType: PortionType // 'weight' (default) or 'portion'
  portionSize?: number // Size of one portion in grams (only for portionType='portion')
}

// Update CreatePreparationData
export interface CreatePreparationData {
  // ... existing fields ...

  // ⭐ PHASE 2: Portion type support
  portionType?: PortionType // Default: 'weight'
  portionSize?: number // Required if portionType='portion'
}
```

### 2.2. Add Batch Type Updates

**File**: `src/stores/preparation/types.ts` ✏️ MODIFY (if exists) or update in relevant file

```typescript
// Update PreparationBatch interface
export interface PreparationBatch {
  // ... existing fields ...

  // ⭐ PHASE 2: Portion type support
  portionType: PortionType
  portionSize?: number
  portionQuantity?: number // Number of portions (when portionType='portion')
}
```

---

## Stage 3: Mappers & Service (3 SP)

### 3.1. Update Supabase Mappers

**File**: `src/stores/recipes/supabaseMappers.ts` ✏️ MODIFY

Add `portion_type` and `portion_size` to:

- `preparationToSupabase()` - when saving
- `preparationFromSupabase()` - when loading

### 3.2. Update Recipes Service

**File**: `src/stores/recipes/recipesService.ts` ✏️ MODIFY

- Validate `portionSize` is provided when `portionType='portion'`
- Default `portionType` to 'weight' when not specified

---

## Stage 4: Production Logic (3 SP)

### 4.1. Update Preparation Service

**File**: `src/stores/preparation/preparationService.ts` ✏️ MODIFY

When creating production receipt:

```typescript
// Calculate portion quantity from total weight
if (preparation.portionType === 'portion' && preparation.portionSize) {
  const portionQuantity = Math.floor(totalWeight / preparation.portionSize)

  batch.portionType = 'portion'
  batch.portionSize = preparation.portionSize
  batch.portionQuantity = portionQuantity
  batch.quantity = totalWeight // Still track weight for FIFO
}
```

### 4.2. Update FIFO Allocation

When allocating from batches:

- Always work in weight internally
- Convert portions to weight: `portions × portionSize = weight`
- Display in portions when `portionType='portion'`

---

## Stage 5: UI Components (4 SP)

### 5.1. Update Unified Recipe Dialog

**File**: `src/views/recipes/components/UnifiedRecipeDialog.vue` ✏️ MODIFY

Add portion type selection:

```vue
<!-- Portion Type Selection (only for preparations) -->
<v-radio-group
  v-if="type === 'preparation'"
  v-model="formData.portionType"
  inline
  label="Quantity Type"
>
  <v-radio label="Weight (grams)" value="weight" />
  <v-radio label="Portions" value="portion" />
</v-radio-group>

<!-- Portion Size Input (only when portionType='portion') -->
<v-text-field
  v-if="formData.portionType === 'portion'"
  v-model.number="formData.portionSize"
  type="number"
  label="Portion Size (grams)"
  hint="Weight of one portion in grams"
  :rules="[v => v > 0 || 'Must be greater than 0']"
/>
```

### 5.2. Update Display Components

Show quantities appropriately:

```typescript
// Helper function
function formatQuantity(batch: PreparationBatch): string {
  if (batch.portionType === 'portion' && batch.portionQuantity) {
    return `${batch.portionQuantity} portions (${batch.quantity}g total)`
  }
  return `${batch.quantity}g`
}
```

---

## Testing (Phase 1 + Phase 2)

### Test Cases - Phase 1 (Nested Preparations)

- [ ] Can create preparation using another preparation as ingredient
- [ ] Circular dependency detection prevents A→B→A
- [ ] Cost calculation includes nested prep costs via `lastKnownCost`
- [ ] Production writes off preparation ingredients via FIFO
- [ ] UI shows type badges (product/preparation)

### Test Cases - Phase 2 (Portion Types)

- [ ] Can create preparation with `portionType='weight'` (default)
- [ ] Can create preparation with `portionType='portion'`
- [ ] `portionSize` is required when `portionType='portion'`
- [ ] Production creates batches with correct portion quantities
- [ ] Display shows "X portions (Yg each)" format
- [ ] FIFO allocation works correctly with portions

### Integration Tests

- [ ] Nested preparation + portion type works together
- [ ] Multi-level nesting with mixed portion types
- [ ] Cost calculation correct for portion-based preparations

---

## Affected Files Summary

**Total: 5 files** (1 new, 4 modified)

### NEW Files (1)

1. `src/supabase/migrations/041_add_portion_type.sql` ✅ CREATED & APPLIED

### MODIFIED Files (4)

2. `src/stores/recipes/types.ts` ✅ UPDATED (added PortionType, updated Preparation interface)
3. `src/stores/recipes/supabaseMappers.ts` ✅ UPDATED (added portion_type/portion_size handling)
4. `src/views/recipes/components/UnifiedRecipeDialog.vue` ✅ UPDATED (portionType in form data)
5. `src/views/recipes/components/widgets/RecipeBasicInfoWidget.vue` ✅ UPDATED (portion type UI)

### PENDING Files (Stage 4: Production Logic)

6. `src/stores/preparation/preparationService.ts` - Batch creation with portion quantities

---

## Story Points Breakdown

| Stage     | Task               | SP     | Status                          |
| --------- | ------------------ | ------ | ------------------------------- |
| 1         | Database Migration | 3      | ✅ COMPLETE                     |
| 2         | Type Definitions   | 2      | ✅ COMPLETE                     |
| 3         | Mappers & Service  | 3      | ✅ COMPLETE                     |
| 4         | Production Logic   | 3      | ⏳ Pending (for batch creation) |
| 5         | UI Components      | 4      | ✅ COMPLETE                     |
| **Total** | **Phase 2**        | **15** | **🔄 IN PROGRESS**              |

---

## Success Criteria

### Must Have

- [x] Can create preparation with portion type (weight or portion)
- [x] Portion size configurable for portion-type preparations
- [ ] Production creates batches with correct quantities (Stage 4 pending)
- [x] Display shows user-friendly format ("10 portions (30g each)")
- [ ] FIFO works correctly (converts to weight internally) (Stage 4 pending)
- [x] Database migration applied successfully

### Should Have

- [x] Clear validation messages
- [x] Default to 'weight' for backward compatibility
- [x] Existing preparations still work (no breaking changes)

---

## Next Steps After Phase 2

1. **Test Phase 1 + Phase 2 together** - full integration testing
2. **Apply migrations to PROD** - both 012 and 041
3. **Demo to stakeholders** - show complete nested + portion functionality
4. **Plan Phase 3** - UI polish (tree view, badges)

---

**Last Updated**: 2025-12-05
**Status**: Stages 1-3, 5 COMPLETE. Stage 4 (Production Logic) pending.
