# Sprint 2: Implementation Summary & Key Decisions

**Date**: 2025-11-07
**Status**: ✅ ARCHITECTURE FINALIZED
**Ready to Start**: YES

---

## 🎯 What We're Building

**Goal**: Полная интеграция продаж из POS в Backoffice с автоматическим списанием и расчетом прибыли.

---

## 🔑 Key Architectural Decisions

### 1. Decomposition Strategy ✅

**Решение**: Рекурсивная декомпозиция до конечных продуктов

```
MenuItem → Variant → Composition
                         ↓
            ┌────────────┼────────────┐
            │            │            │
         Recipe     Preparation    Product
            ↓            ↓            ↓
    [Recurse]      [Recurse]      [FINAL]
            ↓            ↓
         Product      Product
```

**Почему**:

- Универсальность: работает для любой вложенности
- Точность: всегда получаем конечные продукты для списания
- Гибкость: легко добавить новые типы компонентов

**Файл**: `src/stores/recipeWriteOff/composables/useDecomposition.ts`

---

### 2. FIFO & Out of Stock ✅

**Решение**: Используем существующую логику storageStore

- ✅ FIFO уже реализовано в `storageStore.writeOffBatches()`
- ✅ Отрицательные остатки допустимы (если продали при нехватке)
- ⚠️ Warning о нехватке ингредиентов - отдельная функция (не в Sprint 2)

**Пример**:

```typescript
// Storage balance: Rice = 10kg
// Sale: Nasi Goreng x 50 portions (needs 12.5kg)

// Result:
// Rice balance: 10kg → -2.5kg (отрицательный остаток)
// Warning: "Low stock for Rice" (будущая функция)
// Write-off: все равно записывается в audit trail
```

---

### 3. Discount Allocation ✅

**Решение**: Пропорциональное распределение скидок на счет

**Формула**:

```
ItemProportion = ItemPriceAfterOwnDiscount / BillSubtotal
AllocatedDiscount = BillDiscount × ItemProportion
```

**Пример**:

```
Bill:
  Item 1: 50,000 (no discount)
  Item 2: 10,000 (no discount)
  Item 3: 40,000 → 36,000 (own 10% discount)

  Subtotal: 50,000 + 10,000 + 36,000 = 96,000
  Bill Discount: 10,000

Allocation:
  Item 1: 10,000 × (50,000 / 96,000) = 5,208
  Item 2: 10,000 × (10,000 / 96,000) = 1,042
  Item 3: 10,000 × (36,000 / 96,000) = 3,750
```

**Файл**: `src/stores/sales/composables/useProfitCalculation.ts`

---

### 4. Bundle Deals (Комплексные предложения) ✅

**Решение**: Скидка 100% для "бесплатных" позиций

**Пример**: "Кофе бесплатно к завтраку"

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
        { type: 'percentage', value: 100, reason: 'Free with breakfast' }
      ]
    }
  ]
}

Profit calculation:
  Pancakes: revenue 45,000 - cost 15,000 = profit 30,000
  Coffee:   revenue 0 - cost 3,000 = profit -3,000

  Total:    revenue 45,000 - cost 18,000 = profit 27,000
```

**Почему этот подход**:

- ✅ Видна реальная стоимость каждой позиции
- ✅ Можно отслеживать популярность комплексов
- ✅ Прозрачная структура скидок для аналитики

---

### 5. Profit Calculation ✅

**Решение**: Единая формула для всех случаев

```typescript
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
  profitMargin: number // (profit / finalRevenue) × 100%
}
```

**Примеры**:

1. **Простой продукт (вода)**:

```
Sale: Coke 330ml × 1 = 15,000
Cost: 5,000
Profit: 10,000 (66.7% margin)
```

2. **Блюдо с рецептом**:

```
Sale: Nasi Goreng × 1 = 50,000
Ingredients Cost: 11,250
Profit: 38,750 (77.5% margin)
```

3. **Со скидкой на позицию**:

```
Sale: Nasi Goreng × 1 = 50,000
Discount: -5,000 (10%)
Final Revenue: 45,000
Cost: 11,250
Profit: 33,750 (75% margin)
```

4. **Со скидкой на счет**:

```
Sale: Nasi Goreng × 1 = 50,000
Allocated Bill Discount: -4,500
Final Revenue: 45,500
Cost: 11,250
Profit: 34,250 (75.3% margin)
```

---

## 📦 Updated Sprint 2 Structure

### Phase 1: Data Models & Services (3-4 hours)

- `SalesTransaction` type
- `RecipeWriteOff` type
- `DecomposedItem` type
- `ProfitCalculation` type
- Services for CRUD

### Phase 2: Core Logic (5-6 hours) ⭐ **UPDATED**

**Phase 2a: Decomposition Engine (2-3 hours)**

- `useDecomposition` composable
- Recursive resolution: Recipe → Preparation → Product
- Merge duplicate products
- Test all 5 scenarios

**Phase 2b: Profit Calculation (2-3 hours)**

- `useProfitCalculation` composable
- Discount allocation logic
- Profit formulas
- Test discount combinations

**Phase 2c: Integration (1 hour)**

- Update `RecipeWriteOffStore`
- Update write-off flow to use decomposition
- Integrate profit calculation

### Phase 3: Sales Store & Analytics (2-3 hours)

- `SalesStore` with profit data
- `useSalesAnalytics` composable
- Integration with POS payments

### Phase 4: Backoffice UI (3-4 hours)

- Sales Analytics View (with profit metrics)
- Sales Transactions View
- Write-off History View

**Total: 13-17 hours**

---

## 🧪 Critical Test Scenarios (Updated)

### Scenario 1: Simple Product ✅

```
Menu: "Coke 330ml"
Composition: [Product: coke_can × 1]
Expected:
  ✅ Decomposition: 1 product
  ✅ Cost: 5,000
  ✅ Revenue: 15,000
  ✅ Profit: 10,000
```

### Scenario 2: Recipe-based ✅

```
Menu: "Nasi Goreng"
Composition: [Recipe: nasi_goreng × 1]
Expected:
  ✅ Decomposition: 6 products (rice, garlic, onion, soy, oil, egg)
  ✅ Cost: 5,250
  ✅ Revenue: 50,000
  ✅ Profit: 44,750
```

### Scenario 3: Mixed Composition ✅

```
Menu: "Nasi Goreng with Chicken"
Composition: [Recipe: nasi_goreng × 1, Product: chicken × 150g]
Expected:
  ✅ Decomposition: 7 products (6 from recipe + 1 direct)
  ✅ Cost: 11,250
  ✅ Revenue: 50,000
  ✅ Profit: 38,750
```

### Scenario 4: Item Discount ✅

```
Menu: "Nasi Goreng"
Discount: 10% on item
Expected:
  ✅ Revenue: 45,000 (50,000 - 5,000)
  ✅ Cost: 11,250
  ✅ Profit: 33,750
  ✅ Margin: 75%
```

### Scenario 5: Bill Discount ✅

```
Bill:
  Item 1: Nasi Goreng 50,000
  Item 2: Teh Manis   10,000
  Bill Discount: 6,000 (10%)

Expected:
  ✅ Item 1 allocated discount: 5,000 (50k/60k × 6k)
  ✅ Item 2 allocated discount: 1,000 (10k/60k × 6k)
  ✅ Total profit calculated correctly
```

### Scenario 6: Bundle Deal ✅

```
Bill:
  Item 1: Pancakes 45,000
  Item 2: Coffee 15,000 (100% discount - free)

Expected:
  ✅ Item 1: profit 30,000
  ✅ Item 2: profit -3,000 (loss on coffee)
  ✅ Total profit: 27,000
```

### Scenario 7: Complex Discount Combo ✅

```
Bill:
  Item 1: Nasi Goreng 50,000 (10% own discount)
  Item 2: Mie Goreng  40,000 (no discount)
  Bill Discount: 9,000 (10%)

Expected:
  ✅ Item 1: 50k → 45k (own) → 39.5k (allocated 5.5k)
  ✅ Item 2: 40k → 35k (allocated 5k)
  ✅ Profit calculated correctly for both
```

---

## 📋 Files to Create/Update

### New Files (Create):

```
✨ src/stores/sales/
   ├── types.ts
   ├── services.ts
   ├── salesStore.ts
   ├── composables/
   │   ├── useSalesAnalytics.ts
   │   └── useProfitCalculation.ts      # NEW: Profit engine
   ├── recipeWriteOff/
   │   ├── types.ts
   │   ├── services.ts
   │   ├── recipeWriteOffStore.ts
   │   └── composables/
   │       ├── useWriteOffEngine.ts
   │       └── useDecomposition.ts      # NEW: Decomposition engine
   └── index.ts

✨ src/views/backoffice/sales/
   ├── SalesAnalyticsView.vue
   └── SalesTransactionsView.vue

✨ src/views/backoffice/inventory/
   └── WriteOffHistoryView.vue
```

### Files to Update:

```
📝 src/stores/pos/payments/paymentsStore.ts
   → Add sales recording after payment

📝 src/core/appInitializer.ts
   → Add salesStore and recipeWriteOffStore

📝 src/router/index.ts
   → Add new routes

📝 src/views/backoffice/BackofficeLayout.vue
   → Update navigation menu
```

---

## 🚀 Ready to Start!

### Prerequisites:

- ✅ Sprint 1 completed (payments, shifts)
- ✅ Menu structure exists (composition with recipes/products)
- ✅ Recipes store working (with cost calculation)
- ✅ Storage store working (with FIFO)

### Day 1: Foundation (Phase 1)

**Morning**: Create types
**Afternoon**: Create services

### Day 2: Core Logic (Phase 2)

**Morning**: Decomposition engine
**Afternoon**: Profit calculation + integration

### Day 3: Sales & Analytics (Phase 3)

**Full day**: Sales store, analytics, integration with POS

### Day 4: UI (Phase 4)

**Full day**: All three views + navigation

---

## 📊 Success Metrics

### Functional:

- [ ] All 7 test scenarios pass
- [ ] Storage balances update on sale
- [ ] Profit calculated correctly for all cases
- [ ] UI shows accurate data

### Performance:

- [ ] Decomposition: < 50ms per item
- [ ] Write-off: < 100ms per item
- [ ] Analytics: < 200ms
- [ ] Total sale processing: < 500ms

### Data Integrity:

- [ ] No lost sales transactions
- [ ] All write-offs have audit trail
- [ ] Profit calculations match manual calculations
- [ ] Discount allocations sum correctly

---

## 📚 Key Documents

1. **Sprint2_Implementation_Summary.md** (this file)

   - Quick reference, key decisions

2. **Sprint2_Decomposition_And_Profit_Logic.md**

   - Detailed algorithms and examples

3. **Sprint2_Backoffice_Sales_Integration_Plan.md**

   - Full technical plan

4. **Sprint2_Architecture_Diagram.md**

   - Visual diagrams and flows

5. **Sprint2_Quick_Start.md**
   - Day-by-day implementation guide

---

## 🎉 After Sprint 2

You will have:

- ✅ Complete POS → Backoffice integration
- ✅ Automatic inventory write-offs (with FIFO)
- ✅ Accurate profit calculation (all discount scenarios)
- ✅ Sales analytics and reporting
- ✅ Full audit trail for all operations
- ✅ Foundation for future enhancements (predictions, waste tracking, etc.)

---

## ❓ FAQ

**Q: Что если в рецепте нет одного из продуктов?**
A: Создаем отрицательный остаток (уже поддерживается). Warning о нехватке - отдельная функция.

**Q: Как обрабатывать дубликаты продуктов (лук в нескольких рецептах)?**
A: Функция `mergeDecomposedItems()` группирует по `productId` и суммирует количества.

**Q: Как обрабатывать скидку на весь счет?**
A: Пропорциональное распределение по позициям через `allocateBillDiscount()`.

**Q: Как учитывать "бесплатные" позиции в комплексах?**
A: Скидка 100% на позицию. Profit может быть отрицательным для отдельной позиции.

**Q: Производительность при большом количестве продаж?**
A: Декомпозиция кешируется, write-off батчится. При необходимости - переход на IndexedDB.

---

**Status**: ✅ **READY TO IMPLEMENT**

Все архитектурные решения приняты, все edge cases обработаны, можно начинать!

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
