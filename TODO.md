# TODO - Nested Preparations System

**Date**: 2025-12-05
**Goal**: Enable multi-stage preparation production (preparation from preparation)

**Business Case**: Fresh Fish → Marinated Fish (batch) → Fish Portion (batch) → Sale

---

## ✅ User Confirmation (2025-12-05)

**Priorities verified:**

- ✅ **Phase 1**: Nested preparations (preparation can use another preparation as ingredient)
- ✅ **Phase 2**: Portion types (weight vs portion display) - CAN BE DEFERRED
- ✅ **Units**: Weight-only (grams) is sufficient for MVP
- ✅ **Timeline**: ~2 weeks for Phase 1 acceptable

---

## Phase-Based Strategy (4 Phases)

### PHASE 1: MVP - Nested Preparations Only ✅ COMPLETE

**Duration**: 2 weeks | **Estimate**: 50 Story Points | **Completed**: 2025-12-05

**Goal**: Allow preparations to use other preparations as ingredients

**What We're Building:**

1. Database: Allow `type: 'preparation'` in recipe ingredients
2. Cycle Detection: Prevent A→B→A infinite loops (DFS algorithm)
3. Cost Calculation: Use `lastKnownCost` (flat, no deep recursion)
4. Production: FIFO write-off for preparation ingredients
5. UI: Preparation selector in recipe editor with cycle warnings

**What We're NOT Building:**

- ❌ Portion types (weight vs portion) → Phase 2
- ❌ Fancy UI (tree view, badges) → Phase 3
- ❌ Changes to decomposition → Already works correctly!

**Safety Guarantees:**

- ✅ **Decomposition will NOT break** (verified in code analysis)
- ✅ **No double write-off** (products written off during production, preps during sale)
- ✅ **Existing POS/Sales systems work as-is** (no changes needed)
- ✅ **FIFO allocation works** (prep batches allocated same as product batches)

**Affected Files:** 10 total (2 new, 8 modified)

- NEW: `012_add_nested_preparations.sql`, `usePreparationGraph.ts`
- MODIFIED: Types, stores, services, UI components (see NextTodo.md)

**Details**: See NextTodo.md for stage-by-stage breakdown

---

### PHASE 2: Portion Type Support ⏳ CURRENT

**Duration**: 1 week | **Estimate**: 15 Story Points

**Goal**: Add "portion" as alternative to weight

**What We'll Add:**

1. Database: `portion_type` ENUM (weight | portion), `portion_size` NUMERIC
2. UI: Radio buttons for type selection + portion size input
3. Display: Show "10 portions (30g each)" instead of just "300g"
4. Production: Create portion-type batches
5. FIFO: Convert portions → weight for correct allocation

**Example:**

```
Before (Phase 1): "Fish Portion: 300g"
After (Phase 2):  "Fish Portion: 10 portions × 30g = 300g"
```

---

### PHASE 3: UI Polish & Enhanced Display 🎨

**Duration**: 1 week | **Estimate**: 20 Story Points

**Goal**: Improve visual presentation of nested preparations

**What We'll Add:**

1. Tree View: Recursive ingredient display (expand/collapse)
2. Badges & Indicators: "Nested" badge, complexity level, type icons
3. Enhanced Components: Better lists, improved dialogs, richer production forms
4. Cost Breakdown: Multi-level cost display (drill-down)

---

### PHASE 4: Advanced Integration (Optional) 🔗

**Duration**: 2 weeks | **Estimate**: 30 Story Points

**Goal**: Full system integration and advanced features

**What We'll Add:**

1. Menu System: Full support for nested preparations in menu items
2. Analytics: Inventory valuation, P&L reports, usage tracking
3. Advanced Features: Bulk operations, dependency graphs, migration tools
4. POS Integration: Kitchen display enhancements (if needed)

---

## Key Architectural Decisions

### 1. Separated Nested from Portion Type ✅

**Decision**: Two separate features, not bundled together

**Rationale**:

- Easier to test incrementally
- Lower risk of breaking changes
- Can deploy nested preparations immediately
- Portion type adds complexity but is cosmetic (can wait)

### 2. No Changes to Decomposition ✅

**Decision**: Keep existing decomposition logic (stop at preparation level)

**Rationale**:

- **Current behavior is CORRECT** (verified in code analysis)
- Preparations already written off during production
- Sale writes off preparation batch via FIFO
- Prevents double write-off
- POS and Sales systems work as-is

**Proof** (from code analysis):

```typescript
// useDecomposition.ts:256-293
if (comp.type === 'preparation') {
  // ✅ STOP! Don't decompose to products
  return [{ type: 'preparation', preparationId: comp.id, quantity: totalQuantity }]
}

// useActualCostCalculation.ts:76-84
if (comp.type === 'preparation') {
  // ✅ Allocate from PreparationBatch (FIFO)
  const prepCost = await allocateFromPreparationBatches(...)
}
```

### 3. Flat Cost Calculation (No Deep Recursion) ✅

**Decision**: Use `lastKnownCost` from nested preparations, don't decompose recursively

**Rationale**:

- Simpler logic, fewer bugs
- Faster calculation (O(1) instead of O(n) tree traversal)
- Matches FIFO model (actual costs from production, not theoretical)
- Nested prep's `lastKnownCost` already includes all its ingredient costs

**Formula**:

```typescript
// ✅ Phase 1 approach
cost = ingredient.quantity × prep.lastKnownCost

// ❌ NOT doing (deferred to Phase 4)
cost = recursivelyCalculateCost(prep.recipe)
```

### 4. Cycle Detection at Save Time ✅

**Decision**: Validate circular dependencies when saving, not during runtime

**Rationale**:

- Better performance (validate once, not on every read)
- Clear error messages at creation time
- Prevents invalid state from being saved
- DFS algorithm: O(V+E) complexity, acceptable for save operation

---

## Safety Analysis: Why Decomposition Won't Break

### Current Flow (Product-Only Preparations)

```
1. PRODUCTION:
   Produce "Marinated Fish" (1000g)
   → Write-off: Fresh Fish 1000g (from storage batches)
   → Create: marinated_fish batch_1 (1000g @ 0.52 rub/g)

2. SALE:
   Sell dish with "Marinated Fish" (60g)
   → Decompose: { type: 'preparation', id: 'marinated_fish', quantity: 60g }
   → Write-off: marinated_fish batch_1 (60g via FIFO)
```

**Result**: Fresh Fish written off ONCE (during production) ✅

### New Flow (Nested Preparations)

```
1. PRODUCTION (Level 1):
   Produce "Marinated Fish" (1000g)
   → Write-off: Fresh Fish 1000g (from storage batches)
   → Create: marinated_fish batch_1 (1000g @ 0.52 rub/g)

2. PRODUCTION (Level 2):
   Produce "Fish Portion" (300g)
   → Write-off: marinated_fish batch_1 (300g via FIFO) ← NEW!
   → Create: fish_portion batch_2 (300g @ 0.52 rub/g)

3. SALE:
   Sell dish with "Fish Portion" (60g)
   → Decompose: { type: 'preparation', id: 'fish_portion', quantity: 60g }
   → Write-off: fish_portion batch_2 (60g via FIFO)
```

**Result**:

- Fresh Fish written off during Level 1 production (ONCE) ✅
- Marinated Fish written off during Level 2 production (ONCE) ✅
- Fish Portion written off during sale (ONCE) ✅
- NO double write-off! ✅

**Why It Works**:

- Decomposition stops at final preparation level (doesn't recurse)
- Each level written off exactly once
- FIFO allocation works same for products and preparations
- No code changes needed in decomposition logic!

---

## Progress Tracking

### Completed Phases

- ✅ **Phase 1 (MVP)** - Completed 2025-12-05 (see PHASE1_NESTED_PREPARATIONS_SUMMARY.md)

### Current Phase

- ⏳ **Phase 2 (Portion Types)** - In Progress (see NextTodo.md for detailed plan)

### Pending Phases

- Phase 3 - Deferred (UI polish)
- Phase 4 - Deferred (advanced features)

---

## Success Criteria

### Phase 1 (MVP) - MUST HAVE

- ✅ Can create preparation using another preparation as ingredient
- ✅ Circular dependency detection prevents A→B→A
- ✅ Cost calculation includes nested prep costs via `lastKnownCost`
- ✅ Production writes off preparation ingredients via FIFO
- ✅ No breaking changes to existing systems (POS, Sales, decomposition)
- ✅ Database migration applied successfully on DEV

### Phase 2 - SHOULD HAVE

- ✅ Can create portion-type preparations ("10 portions" instead of "300g")
- ✅ Batches support portion quantities
- ✅ FIFO works with portion-to-weight conversion

### Phase 3 - NICE TO HAVE

- ✅ Beautiful tree view for nested ingredient display
- ✅ Visual indicators (badges, icons, complexity level)
- ✅ Cost breakdown with drill-down capability

### Phase 4 - FUTURE

- ✅ Full system integration across all modules
- ✅ Advanced analytics and reporting
- ✅ Bulk operations and migration tools

---

## Related Documentation

- **NextTodo.md**: Stage-by-stage implementation plan for Phase 1
- **CLAUDE.md**: Project-wide guidelines and database migration policy
- **src/About/docs/sale/write-off/SALE_FLOW.md**: Decomposition logic documentation
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
**Status**: Phase 1 COMPLETE, Phase 2 in progress
**Next Action**: Implement portion type support (Phase 2)
