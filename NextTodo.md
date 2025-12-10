# NextTodo: Multi-Target Replacement Modifiers

## Task: N targets -> M replacements

50;87>20BL 2>7<>6=>ABL 2K18@0BL **=5A:>;L:>** target components 2 replacement <>48D8:0B>@5.

**Use Case:**

```
!B59: A 30@=8@>< (recipe: ?N@5 150g + O9F> 1HB)
ModifierGroup: "0<5=0 30@=8@0"
  targetComponents: [?N@5, O9F>]  <- >10 8A:;NG0NBAO
  options:
    - 0@B>D5;L D@8: composition [D@8 180g]  <- 4>102;O5BAO 1 @07
```

---

## Execution Order

### 1. DB Migration ( +!)

```sql
-- Migration: convert_target_component_to_array
UPDATE menu_items
SET modifier_groups = (
  SELECT jsonb_agg(
    CASE
      WHEN mg->>'targetComponent' IS NOT NULL
      THEN (mg - 'targetComponent') || jsonb_build_object(
        'targetComponents',
        jsonb_build_array(mg->'targetComponent')
      )
      ELSE mg
    END
  )
  FROM jsonb_array_elements(modifier_groups) AS mg
)
WHERE modifier_groups IS NOT NULL
  AND modifier_groups::text LIKE '%"targetComponent"%';
```

### 2. Types (`src/stores/menu/types.ts`)

- Line ~128: `ModifierGroup.targetComponent` -> `targetComponents?: TargetComponent[]`
- Line ~181: `SelectedModifier.targetComponent` -> `targetComponents?: TargetComponent[]`

### 3. replacementUtils (`src/core/decomposition/utils/replacementUtils.ts`)

- Add `ReplacementEntry { modifier, isCompositionTarget }`
- Update `buildReplacementMap()` - first target gets composition, rest exclude only
- Update `getReplacementForComponent()` return type

### 4. DecompositionEngine (`src/core/decomposition/DecompositionEngine.ts`)

- Update `traverseRecipe()` to handle `ReplacementEntry`
- `isCompositionTarget: true` -> add composition
- `isCompositionTarget: false` -> just skip (exclude)

### 5. CustomizationDialog (`src/views/pos/menu/dialogs/CustomizationDialog.vue`)

- Line ~501: Copy `targetComponents` to `SelectedModifier`

### 6. ModifiersEditorWidget (`src/views/recipes/components/widgets/ModifiersEditorWidget.vue`)

- Change v-select to `multiple chips closable-chips`
- Update `getSelectedTargetValues()` and `updateTargetComponents()`

---

## Full Plan

See: `/Users/peaker/.claude/plans/lucky-swimming-sprout.md`

## Estimated: ~110 lines
