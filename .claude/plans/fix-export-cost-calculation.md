# Fix Export Cost Calculation - Use Pre-calculated Values

## Problem

Export combinations рассчитывает стоимости заново вместо использования уже рассчитанных значений из базы данных.

### Текущая проблема (скриншот):

- Base Cost (Composition): Rp 1,734
- Choose Fruit -> Banana, Portion 1.3, Cost Rp 26
- Total Cost: Rp 1,760

Расчеты дублируются и могут отличаться от значений в базе данных.

## Goal

Использовать уже рассчитанные и сохраненные значения из базы данных:

- `preparations.last_known_cost` - стоимость за единицу выхода полуфабриката
- `recipes.cost` - стоимость рецепта за порцию
- `products.base_cost_per_unit` - базовая стоимость продукта

**НЕ ПЕРЕСЧИТЫВАТЬ** стоимость из ингредиентов при каждом экспорте.

## Investigation Steps

### Step 1: Find Current Cost Calculation Code

Files to investigate:

```
src/core/export/utils/combinationCostCalculator.ts
src/views/menu/components/dialogs/MenuItemViewDialog.vue (buildCombinationsExportData)
```

Questions to answer:

1. Где именно происходит расчет стоимости для экспорта?
2. Какие поля используются сейчас?
3. Почему не используются pre-calculated values?

### Step 2: Check Database Fields

```sql
-- Check preparations table
SELECT id, name, last_known_cost, cost_per_portion
FROM preparations
WHERE name LIKE '%Banana%' OR name LIKE '%Juice%'
LIMIT 10;

-- Check recipes table
SELECT id, name, cost
FROM recipes
WHERE name LIKE '%Banana%' OR name LIKE '%Juice%'
LIMIT 10;

-- Check products table
SELECT id, name, base_cost_per_unit, last_known_cost
FROM products
WHERE name LIKE '%Banana%'
LIMIT 10;
```

### Step 3: Trace Cost Calculation Flow

1. **MenuItemViewDialog.vue** - `buildCombinationsExportData()`

   - Calls `calculateCombinationExport()`
   - Builds `defaultModifiers` with cost calculation

2. **combinationCostCalculator.ts** - `calculateCombinationExport()`

   - Calls `calculateCombinationCost()`
   - Calculates from ingredients (WRONG - should use DB values)

3. **combinationCostCalculator.ts** - `buildUniqueRecipeExport()`
   - Builds ingredient costs
   - Should just fetch `last_known_cost` from DB

## Solution Approach

### Option A: Use Store Getters (Recommended)

The stores already have cost calculation methods that use DB values:

- `recipesStore.getPreparationCostCalculation(id)` - returns `costPerOutputUnit`
- `recipesStore.getRecipeCostCalculation(id)` - returns `costPerPortion`

**Fix**: Use these methods instead of recalculating from ingredients.

### Option B: Direct DB Query

Fetch `last_known_cost` directly when building export data.

## Files to Modify

| File                                                       | Change                                 |
| ---------------------------------------------------------- | -------------------------------------- |
| `src/core/export/utils/combinationCostCalculator.ts`       | Use pre-calculated costs from store/DB |
| `src/views/menu/components/dialogs/MenuItemViewDialog.vue` | Simplify cost retrieval                |

## Current vs Expected Flow

### Current (WRONG):

```
Export -> Loop ingredients -> Sum (qty * product.baseCostPerUnit) -> Display
```

### Expected (CORRECT):

```
Export -> Get preparation.last_known_cost from DB -> Multiply by quantity -> Display
```

## Test Case

Menu Item: "Fresh Juice Mix 3" (or similar juice with fruit modifiers)

1. Check `preparations` table for fruit portions (e.g., "Banana Portion")
2. Note the `last_known_cost` value
3. Export should show exactly that value \* portion quantity

## Implementation Checklist

- [ ] Investigate current calculation code
- [ ] Map which DB fields should be used where
- [ ] Update `calculateComponentCost()` to use DB values
- [ ] Update `calculateModifierOptionCost()` to use DB values
- [ ] Update `buildUniqueRecipeExport()` to use DB values
- [ ] Test with Fresh Juice Mix 3
- [ ] Verify export matches DB values exactly
