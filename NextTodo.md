# Next Sprint - Fix Export Cost Calculation

## Priority Task: Use Pre-calculated Values in Export

**Problem**: Export 4C1;8@C5B @0AG5B AB>8<>AB8 2<5AB> 8A?>;L7>20=8O 7=0G5=89 87 .

**Plan file**: `.claude/plans/fix-export-cost-calculation.md`

### Quick Summary

"5:CI89 :>4 ?5@5AG8BK205B AB>8<>ABL 87 8=3@5485=B>2:

```
qty * product.baseCostPerUnit (loop all ingredients)
```

C6=> 8A?>;L7>20BL C65 @0AAG8B0==K5 7=0G5=8O:

```
preparation.last_known_cost * qty
recipe.cost * qty
```

### Database Fields to Use

| Entity         | Field                | Description                               |
| -------------- | -------------------- | ----------------------------------------- |
| `products`     | `base_cost_per_unit` | !B>8<>ABL 70 107>2CN 548=8FC              |
| `preparations` | `last_known_cost`    | !B>8<>ABL 70 548=8FC 2KE>40 (output_unit) |
| `recipes`      | `cost`               | !B>8<>ABL 70 ?>@F8N                       |

### Files to Fix

1. `src/core/export/utils/combinationCostCalculator.ts`

   - `calculateComponentCost()` - 4>;65= 1@0BL 87 
   - `calculateModifierOptionCost()` - 4>;65= 1@0BL 87 
   - `buildUniqueRecipeExport()` - 4>;65= 1@0BL 87 

2. `src/views/menu/components/dialogs/MenuItemViewDialog.vue`
   - `buildCombinationsExportData()` - C?@>AB8BL, 8A?>;L7>20BL store getters

### Store Methods (C65 5ABL, =04> 8A?>;L7>20BL)

```typescript
recipesStore.getPreparationCostCalculation(id) // -> costPerOutputUnit
recipesStore.getRecipeCostCalculation(id) // -> costPerPortion
```

### Test

>A;5 8A?@02;5=8O:

- Export "Fresh Juice Mix 3"
- @>25@8BL GB> Cost 2 M:A?>@B5 = `last_known_cost` \* quantity
