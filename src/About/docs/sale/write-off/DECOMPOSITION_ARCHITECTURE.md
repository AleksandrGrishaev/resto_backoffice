# Decomposition Architecture

## Overview

Decomposition - процесс разворачивания позиции меню до конечных ингредиентов (products/preparations) для:

- Отображения на кухне (Kitchen Display)
- Списания со склада (Write-Off)
- Расчета себестоимости (Cost Calculation)

---

## Current Architecture (Technical Debt)

### Существующие сервисы

```
┌─────────────────────────────────────┐
│         useKitchenDecomposition     │  src/stores/pos/orders/composables/
│  - Kitchen Display                  │
│  - Returns: KitchenDecomposedItem[] │
│  - Includes: source, role, path     │
│  - Раскрывает preparations          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│           useDecomposition          │  src/stores/sales/recipeWriteOff/composables/
│  - Write-Off inventory              │
│  - Returns: DecomposedItem[]        │
│  - Includes: type (product/prep)    │
│  - НЕ раскрывает preparations       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      useActualCostCalculation       │  src/stores/sales/composables/
│  - FIFO cost calculation            │
│  - Returns: ActualCostBreakdown     │
│  - Works with batches               │
│  - НЕ раскрывает preparations       │
└─────────────────────────────────────┘
```

### Проблема: Code Duplication

Каждый сервис содержит **похожую логику**:

- Получение recipe/preparation
- Рекурсивный обход компонентов
- Replacement modifiers support
- Merge duplicates

При добавлении новой функциональности (например, Replacement Modifiers) приходится менять **3 места**.

---

## Replacement Modifiers Support

### Концепция

Replacement Modifier позволяет заменить компонент рецепта на альтернативу:

```
Recipe: Cappuccino
├── Espresso: 30ml
└── Regular Milk: 150ml  ← target for replacement

MenuItem: Cappuccino (modifiable)
├── Variant: [recipe: Cappuccino]
└── ModifierGroup: "Choose Milk" (type: replacement)
    ├── targetComponent → Milk in Cappuccino recipe
    └── options:
        ├── Regular Milk (isDefault) → uses original
        ├── Oat Milk (+5000) → replaces with oat milk composition
        └── Coconut Milk (+7000) → replaces with coconut milk composition
```

### Data Flow

```
1. Menu Editor
   └── ModifiersEditorWidget.vue
       └── Saves targetComponent to ModifierGroup
           {
             sourceType: 'recipe',
             recipeId: '...',
             componentId: '...',  // RecipeComponent.id
             componentName: 'Milk 3.2%'
           }

2. POS CustomizationDialog
   └── Creates SelectedModifier with:
       - groupType: 'replacement'
       - targetComponent: (copy from ModifierGroup)
       - isDefault: false (if alternative selected)

3. Decomposition Services
   └── Build replacements Map<key, SelectedModifier>
       └── key = `${recipeId}_${componentId}`
   └── Check each recipe component against map
       └── If match: use modifier.composition instead
```

### Key Files

| File                                                              | Purpose                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| `src/stores/menu/types.ts`                                        | TargetComponent, ModifierGroup, SelectedModifier types |
| `src/views/recipes/components/widgets/ModifiersEditorWidget.vue`  | UI for selecting target component                      |
| `src/views/pos/menu/dialogs/CustomizationDialog.vue`              | Passes replacement data to order                       |
| `src/stores/pos/orders/composables/useKitchenDecomposition.ts`    | Kitchen decomposition with replacements                |
| `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` | Write-off decomposition with replacements              |
| `src/stores/sales/composables/useActualCostCalculation.ts`        | Cost calculation with replacements                     |

---

## Ideal Architecture (Future Refactoring)

### Proposed Structure

```
                    ┌─────────────────────────────┐
                    │     useBaseDecomposition    │
                    │     (unified core logic)    │
                    │                             │
                    │  - Recipe traversal         │
                    │  - Replacement handling     │
                    │  - Preparation handling     │
                    │  - Yield adjustment         │
                    └─────────────┬───────────────┘
                                  │
                                  │ uses
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ KitchenAdapter  │    │ WriteOffAdapter │    │   CostAdapter   │
│                 │    │                 │    │                 │
│ - source field  │    │ - stops at prep │    │ - FIFO batches  │
│ - role field    │    │ - DecomposedItem│    │ - cost breakdown│
│ - path tracking │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
  KitchenDecomposed       DecomposedItem[]        ActualCostBreakdown
       Item[]
```

### Benefits

1. **Single Source of Truth** - replacement logic in one place
2. **DRY** - no code duplication
3. **Easier Testing** - test core logic once
4. **Extensibility** - add new adapters without changing core

### Migration Path

1. Extract common logic to `useBaseDecomposition`
2. Create adapter interfaces
3. Refactor existing services to use adapters
4. Add tests for core logic
5. Remove duplicated code

---

## API Reference

### useKitchenDecomposition

```typescript
interface KitchenDecomposedItem {
  productId: string
  productName: string
  quantity: number
  unit: string
  costPerUnit: number
  totalCost: number
  source: 'base' | 'modifier' // откуда пришел продукт
  modifierName?: string // если source === 'modifier'
  role?: string // роль компонента (main, garnish, sauce, addon)
  path: string[] // путь декомпозиции для отладки
}

function decomposeBillItem(billItem: PosBillItem): Promise<KitchenDecomposedItem[]>
```

### useDecomposition

```typescript
interface DecomposedItem {
  type: 'product' | 'preparation'
  // For products:
  productId?: string
  productName?: string
  // For preparations:
  preparationId?: string
  preparationName?: string
  // Common:
  quantity: number
  unit: string
  costPerUnit: number | null
  totalCost: number
  path: string[]
}

function decomposeMenuItem(
  menuItemId: string,
  variantId: string,
  soldQuantity: number,
  selectedModifiers?: SelectedModifier[]
): Promise<DecomposedItem[]>
```

### useActualCostCalculation

```typescript
interface ActualCostBreakdown {
  totalCost: number
  preparationCosts: PreparationCostItem[]
  productCosts: ProductCostItem[]
  method: 'FIFO'
  calculatedAt: string
}

function calculateActualCost(
  menuItemId: string,
  variantId: string,
  quantity: number,
  selectedModifiers?: SelectedModifier[]
): Promise<ActualCostBreakdown>
```

---

## Debugging

### Key Logs

```typescript
// Replacement registered
🔄 [DecompositionEngine] Replacement registered: {
  key: 'recipe-id_component-id',
  targetName: 'Milk 3.2%',
  replacementOption: 'Oat Milk'
}

// Component replaced
🔄 [DecompositionEngine] Replacing component: {
  original: 'Milk 3.2%',
  replacement: 'Oat Milk',
  compositionCount: 1
}

// Decomposition complete
✅ [DecompositionEngine] Decomposition complete: {
  totalProducts: 2,
  totalCost: 16157.89
}
```

### Common Issues

1. **`key: 'variant_undefined'`** - targetComponent not saved correctly

   - Check ModifiersEditorWidget v-select return-object handling
   - Reload page to refresh menuStore

2. **Replacement not applied** - component still in result

   - Verify componentId matches RecipeComponent.id
   - Check isDefault flag (default options don't trigger replacement)

3. **Different results in decomposition services**
   - Each service has its own logic - check all three
   - This is technical debt, will be fixed with refactoring

---

## Version History

| Date       | Change                                                              |
| ---------- | ------------------------------------------------------------------- |
| 2025-12-09 | Added Replacement Modifiers support to all 3 decomposition services |
| 2025-12-04 | Initial documentation                                               |
