# Current Sprint: trackStock + Defrost Tasks

## Status: Testing trackStock decomposition (BUG FOUND)

### What was done

#### 1. Defrost Task Type (DONE, on main)

- New task type `defrost` for moving frozen stock from freezer to fridge
- Filter chip, TaskCard, ProductionCard, RitualDialog, ScheduleTaskCard — all updated
- Expired frozen batches excluded from defrost recommendations
- `usedFrozen` flag for items used directly frozen (soup bases)
- Migrations 295 (task_type constraint) + 296 (used_frozen column) applied to DEV + PROD
- Pumpkin, French fries, Potato veggie marked as `usedFrozen=true`

#### 2. trackStock Toggle (DONE, NOT pushed to main)

- `trackStock` boolean on `Preparation` (default `true`)
- When `false` ("from knife"): DecompositionEngine decomposes to raw ingredients instead of consuming prep batches
- Balance filter: `trackStock=false` preps hidden from stock views
- No production/write-off/defrost tasks generated for them
- Migration 298 applied to DEV only
- Commits on branch `feature/kitchen-production-control` (2 commits ahead)

### BUG: trackStock decomposition not working on localhost

**Symptom:** Sold Chicken Steak with MushPotato (trackStock=false). Expected raw ingredients (Kentang, Butter, Milk) to be consumed. Instead, MushPotato created a negative prep batch (-200g).

**Logs confirm:**

```
📦 [SalesStore] FALLBACK: Decomposing Chicken Steak
[DecompositionEngine]: Starting decomposition
[DecompositionEngine]: Decomposition complete
[WriteOffAdapter]: Transforming traversal result for write-off
  → 9 items (should be ~11 if MushPotato decomposed)
Created negative batch: NEG-PREP-1775907111022-lpc3f (-200 gram)
```

**Root cause investigation:**

1. **DB is correct:** `preparations.track_stock = false` for MushPotato ✅
2. **Recipe exists:** `preparation_ingredients` has 3 items (Kentang 200g, Milk 40ml, Butter 10g) ✅
3. **Code changes correct:** `DecompositionEngine.ts:398` has `preparation.trackStock !== false` check ✅
4. **storeProvider returns trackStock:** line 660 `trackStock: prep.trackStock ?? true` ✅

**Possible causes to investigate:**

- **localStorage cache:** `recipesService.ts:241` caches preparations to localStorage. If app loaded BEFORE code change (HMR), cached preps don't have `trackStock`. The mapper `(row as any).track_stock` only runs on fresh Supabase fetch. **FIX: Clear localStorage and reload.**
- **HMR partial reload:** Vite HMR may not have reloaded recipesService/supabaseMappers properly. Full page refresh needed.
- **supabaseMappers.ts uses `(row as any)`:** The `track_stock` field should be in the Supabase response since column exists. But if types.gen.ts is stale, TypeScript won't error — it just won't be in the typed row. This should still work with `(row as any)`.

**Test to confirm:**

1. Clear localStorage (`localStorage.removeItem('preparations_cache')`)
2. Full page refresh (not HMR)
3. Sell another Chicken Steak
4. Check if Kentang/Butter/Milk decreased

### Key Files for trackStock

| File                                                             | What                                                 | Line                 |
| ---------------------------------------------------------------- | ---------------------------------------------------- | -------------------- |
| `src/core/decomposition/DecompositionEngine.ts`                  | Decision point: `trackStock !== false` → decompose   | :398                 |
| `src/core/decomposition/DecompositionEngine.ts`                  | storeProvider returns `trackStock`                   | :660                 |
| `src/core/decomposition/types.ts`                                | `PreparationForDecomposition.trackStock`             | :160                 |
| `src/stores/recipes/types.ts`                                    | `Preparation.trackStock`                             | :115                 |
| `src/stores/recipes/supabaseMappers.ts`                          | DB→JS: `(row as any).track_stock ?? true`            | :142                 |
| `src/stores/recipes/supabaseMappers.ts`                          | JS→DB: `track_stock: preparation.trackStock ?? true` | :86                  |
| `src/stores/recipes/recipesService.ts`                           | Loads preps from Supabase + caches to localStorage   | :210-241             |
| `src/stores/preparation/preparationService.ts`                   | Balance filter: `trackStock !== false`               | :2093                |
| `src/stores/kitchenKpi/services/recommendationsService.ts`       | Skip zero-stock recs for trackStock=false            | :187                 |
| `src/views/kitchen/tasks/TasksScreen.vue`                        | Guard in ensureExpiredWriteOffTasks                  | :565                 |
| `src/views/recipes/components/widgets/RecipeBasicInfoWidget.vue` | Checkbox UI                                          | :285                 |
| `src/views/recipes/components/UnifiedRecipeDialog.vue`           | Form data pass-through (5 places)                    | :247,352,465,553,585 |

### Key Files for Defrost Tasks

| File                                                              | What                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/stores/preparation/types.ts`                                 | `taskType: 'production' \| 'write_off' \| 'defrost'`, `ProductionRecommendation.isDefrost/freezerStock/fridgeStock` |
| `src/stores/kitchenKpi/services/recommendationsService.ts`        | `generateDefrostRecommendations()` — skips expired + usedFrozen + trackStock=false                                  |
| `src/views/kitchen/tasks/TasksScreen.vue`                         | `ensureDefrostTasks()`, `handleDefrost()` with FIFO transferBatch + partial failure                                 |
| `src/views/kitchen/tasks/components/TaskCard.vue`                 | DEFROST chip, cyan border, FROZEN/DEFROST badges                                                                    |
| `src/views/kitchen/tasks/components/ProductionCard.vue`           | Defrost emit, "Move to Fridge" button, skip photo                                                                   |
| `src/views/kitchen/tasks/dialogs/RitualDialog.vue`                | Defrost event passthrough, DF chip, cyan colors                                                                     |
| `src/views/kitchen/preparation/components/ScheduleTaskCard.vue`   | Defrost chip + border                                                                                               |
| `src/stores/kitchenKpi/kitchenKpiStore.ts`                        | Skip defrost in autoFulfillTasks                                                                                    |
| `src/supabase/migrations/295_add_defrost_task_type.sql`           | CHECK constraint update                                                                                             |
| `src/supabase/migrations/296_add_used_frozen_to_preparations.sql` | `used_frozen` column                                                                                                |
| `src/supabase/migrations/298_add_track_stock_to_preparations.sql` | `track_stock` column                                                                                                |

### DB State

| What                              | DEV        | PROD       |
| --------------------------------- | ---------- | ---------- |
| Migration 295 (defrost task_type) | ✅ Applied | ✅ Applied |
| Migration 296 (used_frozen)       | ✅ Applied | ✅ Applied |
| Migration 298 (track_stock)       | ✅ Applied | ❌ Not yet |
| Pumpkin usedFrozen=true           | ✅         | ✅         |
| French fries usedFrozen=true      | ✅         | ✅         |
| Potato veggie usedFrozen=true     | ✅         | ✅         |
| MushPotato trackStock=false       | ✅         | ❌         |

### Git State

- **Branch:** `feature/kitchen-production-control`
- **main** has: defrost tasks + usedFrozen (pushed)
- **feature branch** has 4 unpushed commits:
  1. `feat: add defrost task type for frozen preparation management`
  2. `feat: add usedFrozen flag to skip defrost for soup bases`
  3. `feat: add trackStock toggle for "from knife" preparations`
  4. `fix: rename migration to 298, warn on empty recipe with trackStock=false`

### Next Steps

1. **Fix the bug:** Clear localStorage cache, full reload, re-test Chicken Steak sale
2. **Verify:** After sale, check Kentang/Butter/Milk stock decreased by 190.5g/9.52g/38.1ml
3. **If works:** Push to main, apply migration 298 to PROD
4. **Review item:** KPI RPC doesn't track defrost tasks separately (minor, can be done later)
5. **Future:** Add balance=0 validation before toggling trackStock off

### Test Data (Chicken Steak on DEV)

**Before sale:**

- Kentang: 7,206g
- Unsalted butter: 469g
- Fresh milk: 15,324ml

**Expected after sale (MushPotato 200g from 210g output, ratio=0.952):**

- Kentang: 7,206 - 190.5 = 7,015.5g
- Unsalted butter: 469 - 9.52 = 459.5g
- Fresh milk: 15,324 - 38.1 = 15,286ml

**Actual after sale:** No change (bug — prep was consumed as negative batch instead of decomposing)
