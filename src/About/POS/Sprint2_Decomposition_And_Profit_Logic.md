# Sprint 2: Decomposition & Profit Calculation Logic

**Date**: 2025-11-07
**Status**: 📐 ARCHITECTURE DESIGN
**Priority**: HIGH

---

## 📋 Overview

Этот документ описывает логику декомпозиции позиций меню до продуктов и расчета прибыли с учетом различных сценариев скидок.

---

## 🔄 Part 1: Decomposition Engine (Рекурсивная декомпозиция)

### Принцип работы

**Цель**: Развернуть любую позицию меню до конечных продуктов (Product), независимо от уровня вложенности.

```
MenuItem → Variant → Composition
                         ↓
            ┌────────────┼────────────┐
            │            │            │
         Recipe     Preparation    Product
            ↓            ↓            ↓
    Components[]    Recipe[]      [FINAL]
            ↓            ↓
    [Recurse]    [Recurse]
            ↓            ↓
         Product      Product
         [FINAL]      [FINAL]
```

### Алгоритм декомпозиции

```typescript
/**
 * Рекурсивная декомпозиция позиции меню до продуктов
 */
interface DecomposedItem {
  productId: string // ID конечного продукта
  productName: string
  quantity: number // Итоговое количество
  unit: string // gram, ml, piece
  costPerUnit: number // Себестоимость за единицу
  totalCost: number // quantity * costPerUnit

  // Trace path для debug
  path: string[] // ['MenuItem', 'Recipe', 'Preparation', 'Product']
}

async function decomposeMenuItem(
  menuItemId: string,
  variantId: string,
  soldQuantity: number // Количество проданных порций
): Promise<DecomposedItem[]> {
  const menuItem = menuStore.getMenuItem(menuItemId)
  const variant = menuItem.variants.find(v => v.id === variantId)

  const results: DecomposedItem[] = []

  for (const comp of variant.composition) {
    // Рекурсивно разворачиваем каждый компонент
    const items = await decomposeComposition(comp, soldQuantity, [menuItem.name, variant.name])
    results.push(...items)
  }

  // Группируем дубликаты (один продукт может входить в несколько рецептов)
  return mergeDecomposedItems(results)
}

async function decomposeComposition(
  comp: MenuComposition,
  quantity: number,
  path: string[]
): Promise<DecomposedItem[]> {
  if (comp.type === 'product') {
    // БАЗОВЫЙ СЛУЧАЙ: конечный продукт
    const product = productsStore.getProduct(comp.id)

    return [
      {
        productId: comp.id,
        productName: product.name,
        quantity: comp.quantity * quantity,
        unit: comp.unit,
        costPerUnit: product.baseCostPerUnit,
        totalCost: comp.quantity * quantity * product.baseCostPerUnit,
        path: [...path, product.name]
      }
    ]
  }

  if (comp.type === 'recipe') {
    // РЕКУРСИЯ: разворачиваем рецепт
    const recipe = recipesStore.getRecipeById(comp.id)
    const results: DecomposedItem[] = []

    for (const recipeComp of recipe.components) {
      const items = await decomposeComposition(recipeComp, comp.quantity * quantity, [
        ...path,
        recipe.name
      ])
      results.push(...items)
    }

    return results
  }

  if (comp.type === 'preparation') {
    // РЕКУРСИЯ: разворачиваем полуфабрикат
    const prep = recipesStore.getPreparationById(comp.id)
    const results: DecomposedItem[] = []

    for (const prepRecipe of prep.recipe) {
      const items = await decomposeComposition(prepRecipe, comp.quantity * quantity, [
        ...path,
        prep.name
      ])
      results.push(...items)
    }

    return results
  }

  throw new Error(`Unknown composition type: ${comp.type}`)
}

/**
 * Группирует дубликаты продуктов
 * Например: Лук из рецепта A + Лук из рецепта B = общее количество лука
 */
function mergeDecomposedItems(items: DecomposedItem[]): DecomposedItem[] {
  const grouped = new Map<string, DecomposedItem>()

  for (const item of items) {
    const key = `${item.productId}_${item.unit}`

    if (grouped.has(key)) {
      const existing = grouped.get(key)!
      existing.quantity += item.quantity
      existing.totalCost += item.totalCost
      existing.path.push(...item.path) // Объединяем пути
    } else {
      grouped.set(key, { ...item })
    }
  }

  return Array.from(grouped.values())
}
```

### Примеры декомпозиции

#### Пример 1: Простой продукт (вода)

```typescript
MenuItem: "Coke 330ml"
Variant: "Standard"
Composition: [
  { type: 'product', id: 'coke_can', quantity: 1, unit: 'piece' }
]
Sold Quantity: 2

Decomposition Result:
[
  {
    productId: 'coke_can',
    productName: 'Coca-Cola Can 330ml',
    quantity: 2,
    unit: 'piece',
    costPerUnit: 5000,
    totalCost: 10000,
    path: ['Coke 330ml', 'Standard', 'Coca-Cola Can 330ml']
  }
]
```

#### Пример 2: Рецепт (Nasi Goreng)

```typescript
MenuItem: "Nasi Goreng"
Variant: "Standard"
Composition: [
  { type: 'recipe', id: 'recipe_nasi_goreng', quantity: 1, unit: 'portion' }
]
Sold Quantity: 1

Recipe "Nasi Goreng":
  Components: [
    { type: 'product', id: 'rice', quantity: 250, unit: 'gram' },
    { type: 'product', id: 'garlic', quantity: 10, unit: 'gram' },
    { type: 'product', id: 'onion', quantity: 20, unit: 'gram' },
    { type: 'product', id: 'soy_sauce', quantity: 15, unit: 'ml' },
    { type: 'product', id: 'oil', quantity: 20, unit: 'ml' },
    { type: 'product', id: 'egg', quantity: 1, unit: 'piece' }
  ]

Decomposition Result:
[
  { productId: 'rice', quantity: 250, unit: 'gram', costPerUnit: 10, totalCost: 2500, ... },
  { productId: 'garlic', quantity: 10, unit: 'gram', costPerUnit: 20, totalCost: 200, ... },
  { productId: 'onion', quantity: 20, unit: 'gram', costPerUnit: 15, totalCost: 300, ... },
  { productId: 'soy_sauce', quantity: 15, unit: 'ml', costPerUnit: 10, totalCost: 150, ... },
  { productId: 'oil', quantity: 20, unit: 'ml', costPerUnit: 5, totalCost: 100, ... },
  { productId: 'egg', quantity: 1, unit: 'piece', costPerUnit: 2000, totalCost: 2000, ... }
]

Total Cost: 5,250 IDR
```

#### Пример 3: Комплексный (Nasi Goreng + Chicken)

```typescript
MenuItem: "Nasi Goreng"
Variant: "with Chicken"
Composition: [
  { type: 'recipe', id: 'recipe_nasi_goreng', quantity: 1, unit: 'portion' },
  { type: 'product', id: 'chicken_breast', quantity: 150, unit: 'gram' }
]
Sold Quantity: 1

Decomposition Result:
[
  // Из рецепта (6 items)
  { productId: 'rice', quantity: 250, ... },
  { productId: 'garlic', quantity: 10, ... },
  { productId: 'onion', quantity: 20, ... },
  { productId: 'soy_sauce', quantity: 15, ... },
  { productId: 'oil', quantity: 20, ... },
  { productId: 'egg', quantity: 1, ... },

  // Direct product
  { productId: 'chicken_breast', quantity: 150, unit: 'gram', costPerUnit: 40, totalCost: 6000, ... }
]

Total Cost: 5,250 + 6,000 = 11,250 IDR
```

#### Пример 4: Вложенный (с Preparation)

```typescript
MenuItem: "Burger"
Variant: "Standard"
Composition: [
  { type: 'preparation', id: 'prep_patty', quantity: 1, unit: 'piece' },
  { type: 'product', id: 'bun', quantity: 1, unit: 'piece' },
  { type: 'product', id: 'lettuce', quantity: 20, unit: 'gram' }
]

Preparation "Beef Patty":
  Recipe: [
    { type: 'product', id: 'ground_beef', quantity: 150, unit: 'gram' },
    { type: 'product', id: 'salt', quantity: 2, unit: 'gram' },
    { type: 'product', id: 'pepper', quantity: 1, unit: 'gram' }
  ]

Decomposition Result:
[
  // Из preparation
  { productId: 'ground_beef', quantity: 150, ... },
  { productId: 'salt', quantity: 2, ... },
  { productId: 'pepper', quantity: 1, ... },

  // Direct products
  { productId: 'bun', quantity: 1, ... },
  { productId: 'lettuce', quantity: 20, ... }
]
```

#### Пример 5: Дубликаты продуктов

```typescript
MenuItem: "Special Nasi Goreng"
Variant: "Standard"
Composition: [
  { type: 'recipe', id: 'rice_base', quantity: 1 },      // Содержит: oil 10ml
  { type: 'recipe', id: 'fried_topping', quantity: 1 }   // Содержит: oil 15ml
]

Decomposition Result (BEFORE merge):
[
  { productId: 'oil', quantity: 10, unit: 'ml', ... },
  { productId: 'oil', quantity: 15, unit: 'ml', ... }
]

Decomposition Result (AFTER merge):
[
  { productId: 'oil', quantity: 25, unit: 'ml', totalCost: 125, path: ['...', 'Rice Base', '...', 'Fried Topping', '...'] }
]
```

---

## 💰 Part 2: Profit Calculation Engine

### Типы скидок

**1. Item-level discount (Скидка на позицию)**

```typescript
BillItem {
  menuItemId: 'nasi_goreng',
  quantity: 1,
  unitPrice: 50000,
  discounts: [
    {
      type: 'percentage',
      value: 10,           // 10%
      reason: 'Happy Hour'
    }
  ]
}

// Расчет:
originalPrice = 50000
discountAmount = 50000 * 0.10 = 5000
finalPrice = 50000 - 5000 = 45000
cost = 11250 (из decomposition)
profit = 45000 - 11250 = 33750
```

**2. Bill-level discount (Скидка на весь счет)**

```typescript
Bill {
  items: [
    { id: 'item1', unitPrice: 50000, quantity: 1 },
    { id: 'item2', unitPrice: 30000, quantity: 1 }
  ],
  subtotal: 80000,
  discountAmount: 8000,  // 10% на весь счет
  total: 72000
}

// Проблема: Как распределить 8000 скидки между позициями?
```

### Алгоритм распределения скидок

#### Метод: Proportional Allocation (Пропорциональное распределение)

```typescript
/**
 * Распределяет скидку на счет пропорционально стоимости позиций
 */
function allocateBillDiscount(
  items: BillItem[],
  billDiscountAmount: number
): ItemWithAllocatedDiscount[] {
  // 1. Вычисляем subtotal (сумма до скидки на счет)
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.unitPrice * item.quantity
    const itemDiscount = calculateItemDiscounts(item.discounts, itemTotal)
    return sum + (itemTotal - itemDiscount)
  }, 0)

  // 2. Вычисляем пропорцию для каждой позиции
  return items.map(item => {
    const itemTotal = item.unitPrice * item.quantity
    const itemDiscount = calculateItemDiscounts(item.discounts, itemTotal)
    const itemAfterOwnDiscount = itemTotal - itemDiscount

    // Пропорция = (стоимость позиции) / (общая сумма)
    const proportion = itemAfterOwnDiscount / subtotal

    // Распределенная скидка = общая скидка * пропорция
    const allocatedDiscount = billDiscountAmount * proportion

    return {
      ...item,
      itemOwnDiscount: itemDiscount,
      allocatedBillDiscount: allocatedDiscount,
      totalDiscount: itemDiscount + allocatedDiscount,
      finalPrice: itemTotal - itemDiscount - allocatedDiscount
    }
  })
}

function calculateItemDiscounts(discounts: PosItemDiscount[], itemTotal: number): number {
  return discounts.reduce((sum, discount) => {
    if (discount.type === 'percentage') {
      return sum + (itemTotal * discount.value) / 100
    } else {
      return sum + discount.value
    }
  }, 0)
}
```

#### Пример распределения

```typescript
Bill {
  items: [
    {
      id: 'item1',
      name: 'Nasi Goreng',
      unitPrice: 50000,
      quantity: 1,
      discounts: []  // Нет собственной скидки
    },
    {
      id: 'item2',
      name: 'Teh Manis',
      unitPrice: 10000,
      quantity: 1,
      discounts: []
    },
    {
      id: 'item3',
      name: 'Mie Goreng',
      unitPrice: 40000,
      quantity: 1,
      discounts: [
        { type: 'percentage', value: 10 }  // Собственная скидка 10%
      ]
    }
  ],
  discountAmount: 10000  // Скидка на весь счет
}

// Расчет:

// Item 1 (Nasi Goreng):
itemTotal = 50000
itemDiscount = 0
itemAfterOwnDiscount = 50000
proportion = 50000 / (50000 + 10000 + 36000) = 50000 / 96000 = 0.52
allocatedBillDiscount = 10000 * 0.52 = 5200
finalPrice = 50000 - 0 - 5200 = 44800

// Item 2 (Teh Manis):
itemTotal = 10000
itemDiscount = 0
itemAfterOwnDiscount = 10000
proportion = 10000 / 96000 = 0.104
allocatedBillDiscount = 10000 * 0.104 = 1040
finalPrice = 10000 - 0 - 1040 = 8960

// Item 3 (Mie Goreng):
itemTotal = 40000
itemDiscount = 4000 (10% own discount)
itemAfterOwnDiscount = 36000
proportion = 36000 / 96000 = 0.375
allocatedBillDiscount = 10000 * 0.375 = 3750
finalPrice = 40000 - 4000 - 3750 = 32250

// Проверка:
44800 + 8960 + 32250 = 86010 ≈ 86000 (subtotal 100000 - discount 10000)
// Небольшое расхождение из-за округления - это нормально
```

### Комплексные предложения (Bundle deals)

#### Сценарий: "Кофе бесплатно к завтраку"

**Вариант 1: Нулевая цена для "бесплатной" позиции**

```typescript
MenuItem: "Breakfast Set"
Variant: "Standard"
Composition: [
  {
    type: 'recipe',
    id: 'pancakes',
    price: 45000  // Реальная цена завтрака
  },
  {
    type: 'product',
    id: 'coffee',
    price: 0      // "Бесплатно"
  }
]

// Profit calculation:
pancakesCost = 15000
coffeeCost = 3000
totalCost = 18000

totalRevenue = 45000
profit = 45000 - 18000 = 27000
```

**Вариант 2: Скидка 100% на кофе**

```typescript
Bill {
  items: [
    {
      menuItemId: 'pancakes',
      unitPrice: 45000,
      quantity: 1,
      discounts: []
    },
    {
      menuItemId: 'coffee',
      unitPrice: 15000,
      quantity: 1,
      discounts: [
        {
          type: 'percentage',
          value: 100,
          reason: 'Free with breakfast'
        }
      ]
    }
  ]
}

// Item 1 (Pancakes):
revenue = 45000
cost = 15000
profit = 30000

// Item 2 (Coffee):
revenue = 15000 - 15000 = 0
cost = 3000
profit = -3000  // "Убыток" на кофе

// Total:
totalRevenue = 45000
totalCost = 18000
totalProfit = 27000
```

**Рекомендация**: Вариант 2 лучше для аналитики, так как:

- Видно реальную стоимость каждой позиции
- Можно отслеживать популярность комплексов
- Прозрачная структура скидок

### Формула расчета прибыли

```typescript
/**
 * Универсальная формула расчета прибыли
 */
interface ProfitCalculation {
  // Revenue (Выручка)
  originalPrice: number // Цена до всех скидок
  itemOwnDiscount: number // Скидка на саму позицию
  allocatedBillDiscount: number // Доля скидки на счет
  finalRevenue: number // Итоговая выручка

  // Cost (Себестоимость)
  ingredientsCost: number // Из decomposition

  // Profit (Прибыль)
  profit: number // finalRevenue - ingredientsCost
  profitMargin: number // profit / finalRevenue * 100%
}

function calculateProfit(
  billItem: BillItem,
  decomposedItems: DecomposedItem[],
  allocatedBillDiscount: number
): ProfitCalculation {
  // 1. Revenue calculation
  const originalPrice = billItem.unitPrice * billItem.quantity
  const itemOwnDiscount = calculateItemDiscounts(billItem.discounts, originalPrice)
  const finalRevenue = originalPrice - itemOwnDiscount - allocatedBillDiscount

  // 2. Cost calculation
  const ingredientsCost = decomposedItems.reduce((sum, item) => sum + item.totalCost, 0)

  // 3. Profit calculation
  const profit = finalRevenue - ingredientsCost
  const profitMargin = finalRevenue > 0 ? (profit / finalRevenue) * 100 : 0

  return {
    originalPrice,
    itemOwnDiscount,
    allocatedBillDiscount,
    finalRevenue,
    ingredientsCost,
    profit,
    profitMargin
  }
}
```

---

## 🏗️ Part 3: Module Architecture

### Composable: useDecomposition

```typescript
// src/stores/sales/recipeWriteOff/composables/useDecomposition.ts

export function useDecomposition() {
  const menuStore = useMenuStore()
  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()

  /**
   * Main decomposition method
   */
  async function decomposeMenuItem(
    menuItemId: string,
    variantId: string,
    soldQuantity: number
  ): Promise<DecomposedItem[]> {
    // ... implementation from above
  }

  /**
   * Recursive composition resolver
   */
  async function decomposeComposition(
    comp: MenuComposition,
    quantity: number,
    path: string[]
  ): Promise<DecomposedItem[]> {
    // ... implementation from above
  }

  /**
   * Merge duplicate products
   */
  function mergeDecomposedItems(items: DecomposedItem[]): DecomposedItem[] {
    // ... implementation from above
  }

  return {
    decomposeMenuItem,
    decomposeComposition,
    mergeDecomposedItems
  }
}
```

### Composable: useProfitCalculation

```typescript
// src/stores/sales/composables/useProfitCalculation.ts

export function useProfitCalculation() {
  /**
   * Calculate profit for single item
   */
  function calculateItemProfit(
    billItem: BillItem,
    decomposedItems: DecomposedItem[],
    allocatedBillDiscount: number
  ): ProfitCalculation {
    // ... implementation from above
  }

  /**
   * Allocate bill discount proportionally
   */
  function allocateBillDiscount(
    items: BillItem[],
    billDiscountAmount: number
  ): ItemWithAllocatedDiscount[] {
    // ... implementation from above
  }

  /**
   * Calculate item-level discounts
   */
  function calculateItemDiscounts(discounts: PosItemDiscount[], itemTotal: number): number {
    // ... implementation from above
  }

  /**
   * Calculate profit for entire bill
   */
  function calculateBillProfit(
    bill: PosBill,
    itemsWithDecomposition: Map<string, DecomposedItem[]>
  ): BillProfitCalculation {
    // 1. Allocate bill discount
    const itemsWithDiscount = allocateBillDiscount(bill.items, bill.discountAmount)

    // 2. Calculate profit for each item
    const itemProfits = itemsWithDiscount.map(item => {
      const decomposed = itemsWithDecomposition.get(item.id) || []
      return calculateItemProfit(item, decomposed, item.allocatedBillDiscount)
    })

    // 3. Aggregate
    return {
      items: itemProfits,
      totalRevenue: itemProfits.reduce((s, p) => s + p.finalRevenue, 0),
      totalCost: itemProfits.reduce((s, p) => s + p.ingredientsCost, 0),
      totalProfit: itemProfits.reduce((s, p) => s + p.profit, 0),
      averageMargin: calculateAverageMargin(itemProfits)
    }
  }

  return {
    calculateItemProfit,
    calculateBillProfit,
    allocateBillDiscount,
    calculateItemDiscounts
  }
}
```

---

## 📊 Part 4: Data Structure Updates

### SalesTransaction (Updated)

```typescript
interface SalesTransaction extends BaseEntity {
  // ... existing fields

  // ✨ NEW: Profit data
  profitCalculation: ProfitCalculation

  // ✨ NEW: Decomposition summary
  decompositionSummary: {
    totalProducts: number
    totalCost: number
    decomposedItems: DecomposedItem[]
  }
}
```

### RecipeWriteOff (Updated)

```typescript
interface RecipeWriteOff extends BaseEntity {
  // ... existing fields

  // ✨ NEW: Decomposed items (flattened to products)
  decomposedItems: DecomposedItem[]

  // Original composition for reference
  originalComposition: MenuComposition[]
}
```

---

## 🧪 Part 5: Test Scenarios

### Test 1: Simple product

```typescript
test('Decompose and calculate profit for simple product', async () => {
  const result = await decomposeMenuItem('coke_330ml', 'standard', 2)

  expect(result).toEqual([
    {
      productId: 'coke_can',
      quantity: 2,
      unit: 'piece',
      costPerUnit: 5000,
      totalCost: 10000
    }
  ])

  const profit = calculateItemProfit(
    { unitPrice: 15000, quantity: 2, discounts: [] },
    result,
    0 // no bill discount
  )

  expect(profit.finalRevenue).toBe(30000)
  expect(profit.ingredientsCost).toBe(10000)
  expect(profit.profit).toBe(20000)
  expect(profit.profitMargin).toBe(66.67)
})
```

### Test 2: Recipe decomposition

```typescript
test('Decompose recipe to products', async () => {
  const result = await decomposeMenuItem('nasi_goreng', 'standard', 1)

  expect(result.length).toBe(6) // 6 ingredients
  expect(result.find(i => i.productId === 'rice')?.quantity).toBe(250)

  const totalCost = result.reduce((s, i) => s + i.totalCost, 0)
  expect(totalCost).toBe(5250)
})
```

### Test 3: Bill discount allocation

```typescript
test('Allocate bill discount proportionally', () => {
  const items = [
    { id: '1', unitPrice: 50000, quantity: 1, discounts: [] },
    { id: '2', unitPrice: 30000, quantity: 1, discounts: [] }
  ]

  const allocated = allocateBillDiscount(items, 8000)

  // Item 1: 50000 / 80000 = 0.625 → 8000 * 0.625 = 5000
  expect(allocated[0].allocatedBillDiscount).toBe(5000)

  // Item 2: 30000 / 80000 = 0.375 → 8000 * 0.375 = 3000
  expect(allocated[1].allocatedBillDiscount).toBe(3000)
})
```

### Test 4: Bundle with free item

```typescript
test('Bundle deal with 100% discount', () => {
  const item = {
    unitPrice: 15000,
    quantity: 1,
    discounts: [{ type: 'percentage', value: 100, reason: 'Free with breakfast' }]
  }

  const decomposed = [
    { productId: 'coffee', totalCost: 3000, ... }
  ]

  const profit = calculateItemProfit(item, decomposed, 0)

  expect(profit.finalRevenue).toBe(0)
  expect(profit.ingredientsCost).toBe(3000)
  expect(profit.profit).toBe(-3000) // Loss on this item
})
```

### Test 5: Complex discount combination

```typescript
test('Item discount + Bill discount', () => {
  const item = {
    unitPrice: 50000,
    quantity: 1,
    discounts: [{ type: 'percentage', value: 10 }] // Own 10% discount
  }

  const allocatedBillDiscount = 4500 // From bill discount

  const profit = calculateItemProfit(
    item,
    [{ totalCost: 11250, ... }],
    allocatedBillDiscount
  )

  // originalPrice = 50000
  // itemOwnDiscount = 5000 (10%)
  // allocatedBillDiscount = 4500
  // finalRevenue = 50000 - 5000 - 4500 = 40500
  // profit = 40500 - 11250 = 29250

  expect(profit.finalRevenue).toBe(40500)
  expect(profit.profit).toBe(29250)
})
```

---

## 🎯 Implementation Order

### Phase 2a: Decomposition Engine (2-3 hours)

1. Create `useDecomposition` composable
2. Implement recursive decomposition
3. Test with all 5 scenarios
4. Validate with real menu data

### Phase 2b: Profit Calculation Engine (2-3 hours)

1. Create `useProfitCalculation` composable
2. Implement discount allocation
3. Implement profit formulas
4. Test all discount scenarios

### Phase 2c: Integration (1-2 hours)

1. Update `RecipeWriteOffStore` to use decomposition
2. Update `SalesStore` to calculate profit
3. Store profit data in `SalesTransaction`
4. Verify end-to-end flow

---

## 📝 Summary

**Ключевые решения:**

1. ✅ **Decomposition**: Рекурсивная развертка до продуктов
2. ✅ **FIFO**: Используем существующую логику в storageStore
3. ✅ **Отрицательные остатки**: Допустимы при продаже
4. ✅ **Discount allocation**: Пропорциональное распределение
5. ✅ **Bundle deals**: Скидка 100% для "бесплатных" позиций
6. ✅ **Profit calculation**: Единая формула для всех случаев

**Преимущества архитектуры:**

- 🔄 **Универсальность**: Работает для любой структуры меню
- 📊 **Прозрачность**: Понятная логика расчета прибыли
- 🧪 **Тестируемость**: Каждая функция тестируется отдельно
- 🔧 **Гибкость**: Легко добавить новые типы скидок
- 📈 **Аналитика**: Детальные данные для отчетов

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
