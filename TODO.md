# TODO - Project Strategy: Nested Preparations System

**Date**: 2025-12-05
**Goal**: Enable multi-stage preparation production (preparation from preparation)

**Business Case**: Fresh Fish → Marinated Fish (batch_1) → Fish Portion (batch_2) → Sale

---

## Phase-Based Approach (4 Phases)

We simplified the original 50+ file plan by splitting into manageable phases.

---

## PHASE 1: MVP - Nested Preparations Only ⏳ CURRENT

**Duration**: 2 weeks
**Estimate**: 50 Story Points

**Goal**: Allow preparations to use other preparations as ingredients (NO portion type yet)

**Key Simplifications**:

- ❌ NO portion type (weight vs portion) - deferred to Phase 2
- ❌ NO fancy UI (tree view, badges) - deferred to Phase 3
- ❌ NO changes to decomposition - already works correctly!
- ✅ ONLY basic nested functionality

**What We're Building**:

1. Database: Allow `type: 'preparation'` in ingredients
2. Cycle detection: Prevent A→B→A infinite loops
3. Cost calculation: Use `lastKnownCost` (flat, no recursion)
4. Production: FIFO write-off for preparation ingredients
5. UI: Preparation selector in recipe editor

**Affected Files** (~10):

- `src/supabase/migrations/012_add_nested_preparations.sql` (NEW)
- `src/stores/recipes/types.ts`
- `src/stores/recipes/composables/usePreparationGraph.ts` (NEW)
- `src/stores/recipes/composables/useCostCalculation.ts`
- `src/stores/preparation/preparationService.ts`
- `src/stores/recipes/recipesStore.ts`
- `src/stores/recipes/recipesService.ts`
- `src/stores/recipes/supabaseMappers.ts`
- `src/views/recipes/components/UnifiedRecipeDialog.vue`
- `src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue`

**Details**: See NextTodo.md

---

## PHASE 2: Portion Type Support 🔜

**Duration**: 1 week
**Estimate**: 15 Story Points

**Goal**: Add weight vs portion concept

**What We'll Add**:

1. Database: `portion_type` ENUM, `portion_size` NUMERIC
2. UI: Radio buttons for type selection + portion size field
3. Display: Show "10 portions (30g each)" instead of "300g"
4. Production: Create portion-type batches
5. FIFO: Convert portions → weight for allocation

**Example**:

```
Preparation: "Fish Portion"
- Output Type: Portion
- Output Quantity: 10
- Portion Size: 30g
→ Creates batch: 10 portions @ 15.6 rub/portion
```

---

## PHASE 3: UI Polish & Enhanced Display 🎨

**Duration**: 1 week
**Estimate**: 20 Story Points

**Goal**: Improve nested preparations display

**What We'll Add**:

1. Tree View: Recursive ingredient display
2. Badges & Indicators: "Nested" badge, complexity level, portion icons
3. Enhanced Components: Better lists, dialogs, production forms
4. Cost Breakdown: Multi-level cost display

---

## PHASE 4: Advanced Integration (Optional) 🔗

**Duration**: 2 weeks
**Estimate**: 30 Story Points

**Goal**: Full system integration

**What We'll Add**:

1. Menu System: Nested preparations in menu items
2. Analytics & Reports: Inventory valuation, P&L, usage tracking
3. Advanced Features: Bulk operations, dependency graphs, migration tools
4. POS Integration: Kitchen display enhancements (if needed)

---

## Success Criteria

### Phase 1 (MVP) - MUST HAVE

- ✅ Can create preparation from another preparation
- ✅ Circular dependency detection works
- ✅ Cost calculation includes nested prep costs
- ✅ Production writes off preparation ingredients via FIFO
- ✅ No breaking changes to existing systems (POS, Sales)

### Phase 2 - SHOULD HAVE

- ✅ Can create portion-type preparations
- ✅ Batches support portion quantities
- ✅ FIFO works with portions

### Phase 3 - NICE TO HAVE

- ✅ Beautiful UI for nested display
- ✅ Tree view works smoothly
- ✅ Cost breakdown clear

### Phase 4 - FUTURE

- ✅ Full system integration
- ✅ Advanced analytics
- ✅ Complete feature parity

---

## Key Architectural Decisions

### 1. Separated Nested from Portion Type

**Decision**: Two separate features, not bundled together

**Rationale**:

- Easier to test incrementally
- Lower risk of breaking changes
- Can deploy nested preparations without portion type
- Portion type can be added later without major refactor

### 2. No Changes to Decomposition

**Decision**: Keep existing decomposition logic (stop at preparation level)

**Rationale**:

- Current behavior is CORRECT for FIFO model
- Preparations already written off during production
- Prevents double write-off
- POS and Sales systems work as-is

### 3. Flat Cost Calculation (No Deep Recursion)

**Decision**: Use `lastKnownCost` from nested preparations, don't decompose recursively

**Rationale**:

- Simpler logic, fewer bugs
- Faster calculation
- Matches FIFO model (actual costs, not theoretical)
- User can drill down manually if needed

### 4. Validation at Save Time (Not Runtime)

**Decision**: Check circular dependencies when saving, not during every operation

**Rationale**:

- Better performance
- Clear error messages at creation time
- Prevents invalid state from being saved

---

## Progress Tracking

### Completed Phases

- None yet

### Current Phase

- **Phase 1 (MVP)** - In Progress (see NextTodo.md for details)

### Pending Phases

- Phase 2 - Not Started
- Phase 3 - Not Started
- Phase 4 - Not Started

---

## Related Documentation

- **NextTodo.md**: Detailed plan for Phase 1 (current sprint)
- **CLAUDE.md**: Project-wide guidelines and conventions
- **src/About/docs/sale/write-off/SALE_FLOW.md**: Decomposition logic
- **errors.md**: Known issues and bugs

---

## Review & Iteration

After each phase:

1. Demo to stakeholders
2. Collect feedback
3. Update plan if needed
4. Decide whether to proceed to next phase

**Next Review**: After Phase 1 completion (~2 weeks)

---

**Last Updated**: 2025-12-05
