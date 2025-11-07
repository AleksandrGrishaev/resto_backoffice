# Sprint 2: FINAL PLAN ✅

**Date**: 2025-11-07
**Status**: ✅ **READY TO IMPLEMENT**
**Estimated Time**: 13-17 hours

---

## 🎯 Цель Sprint 2

Интегрировать данные о продажах из POS в Backoffice с автоматическим списанием остатков и расчетом прибыли.

---

## ✅ Ключевые решения (согласованные)

### 1. Декомпозиция ✅

**Решение**: Рекурсивная декомпозиция до конечных продуктов

```
MenuItem → Variant → Composition
                         ↓
            ┌────────────┼────────────┐
            │            │            │
         Recipe     Preparation    Product
            ↓            ↓            ↓
    [Recurse]      [Recurse]      [FINAL]
```

**Итог**: Независимо от структуры меню (пакетное предложение, скидка и т.д.), мы всегда получаем список конечных продуктов для списания.

---

### 2. FIFO и отрицательные остатки ✅

**Решение**: Используем существующую логику `storageStore`

- ✅ FIFO уже реализовано
- ✅ Если продали при нехватке → отрицательный остаток (допустимо)
- ⚠️ Warning о нехватке ингредиентов → отдельная функция (не в Sprint 2)

**Пример**:

```typescript
// Остаток риса: 10kg
// Продажа: Nasi Goreng × 50 порций (нужно 12.5kg)
// Результат: Остаток = -2.5kg (отрицательный)
// Write-off все равно записывается в audit trail
```

---

### 3. Распределение скидок ✅

**Решение**: Пропорциональное распределение скидок на счет

**Формула**:

```typescript
ItemProportion = ItemPriceAfterOwnDiscount / BillSubtotal
AllocatedDiscount = BillDiscount × ItemProportion
```

**Логика**:

1. Сначала применяются скидки на позицию
2. Затем скидка на счет распределяется пропорционально

**Пример**:

```
Bill:
  Item 1: 50,000 (без своей скидки)
  Item 2: 40,000 → 36,000 (своя скидка 10%)

  Subtotal: 50,000 + 36,000 = 86,000
  Bill Discount: 8,600 (10% на весь счет)

Allocation:
  Item 1: 8,600 × (50,000 / 86,000) = 5,000
  Item 2: 8,600 × (36,000 / 86,000) = 3,600
```

---

### 4. Комплексные предложения (Bundle deals) ✅

**Решение**: Скидка 100% для "бесплатных" позиций

**Пример**: "Кофе бесплатно к завтраку"

```typescript
Bill {
  items: [
    { menuItemId: 'pancakes', unitPrice: 45000, discounts: [] },
    { menuItemId: 'coffee', unitPrice: 15000, discounts: [
        { type: 'percentage', value: 100, reason: 'Free with breakfast' }
      ]
    }
  ]
}

Profit:
  Pancakes: 45,000 - 15,000 = +30,000
  Coffee:   0 - 3,000 = -3,000 (loss на кофе)
  Total:    45,000 - 18,000 = +27,000 ✅
```

**Почему этот подход**:

- Видна реальная стоимость каждой позиции
- Можно отслеживать популярность комплексов
- Прозрачная структура скидок
- Понятная аналитика по каждой позиции

---

### 5. Расчет прибыли ✅

**Решение**: Единая формула для всех случаев

```typescript
Profit Calculation:
  originalPrice           // Цена до всех скидок
  - itemOwnDiscount       // Скидка на позицию
  - allocatedBillDiscount // Доля скидки на счет
  = finalRevenue          // Итоговая выручка

  finalRevenue
  - ingredientsCost       // Из decomposition
  = profit                // Прибыль

  profitMargin = (profit / finalRevenue) × 100%
```

**Примеры**:

**A. Простой продукт (вода)**:

```
Sale: Coke 330ml = 15,000
Cost: 5,000
Profit: 10,000 (66.7% margin)
```

**B. Блюдо с рецептом**:

```
Sale: Nasi Goreng = 50,000
Ingredients: 11,250
Profit: 38,750 (77.5% margin)
```

**C. Со скидкой на позицию**:

```
Sale: Nasi Goreng = 50,000
Discount: -5,000 (10%)
Revenue: 45,000
Cost: 11,250
Profit: 33,750 (75% margin)
```

**D. Со скидкой на счет**:

```
Sale: Nasi Goreng = 50,000
Allocated Bill Discount: -4,500
Revenue: 45,500
Cost: 11,250
Profit: 34,250 (75.3% margin)
```

---

## 📦 Архитектура Sprint 2

### Phase 1: Data Models & Services (3-4 hours)

**Файлы**:

```
src/stores/sales/
├── types.ts              # SalesTransaction, ProfitCalculation
├── services.ts           # CRUD operations
├── index.ts
└── recipeWriteOff/
    ├── types.ts          # RecipeWriteOff, DecomposedItem
    ├── services.ts       # CRUD operations
    └── index.ts
```

**Deliverable**: Types и services готовы к использованию

---

### Phase 2: Core Logic (5-6 hours) ⭐ **САМОЕ ВАЖНОЕ**

#### Phase 2a: Decomposition Engine (2-3 hours)

**Файл**: `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts`

**Функции**:

```typescript
// Main method
decomposeMenuItem(menuItemId, variantId, soldQuantity)
  → DecomposedItem[]

// Recursive resolver
decomposeComposition(comp, quantity, path)
  → DecomposedItem[]

// Merge duplicates
mergeDecomposedItems(items)
  → DecomposedItem[]
```

**Логика**:

1. Получить MenuItem + Variant
2. Для каждого элемента Composition:
   - Если Recipe → рекурсивно развернуть компоненты
   - Если Preparation → рекурсивно развернуть рецепт
   - Если Product → добавить в результат (базовый случай)
3. Сгруппировать дубликаты (суммировать количества)
4. Вернуть список конечных продуктов

**Test**: 5 scenarios (см. ниже)

---

#### Phase 2b: Profit Calculation Engine (2-3 hours)

**Файл**: `src/stores/sales/composables/useProfitCalculation.ts`

**Функции**:

```typescript
// Allocate bill discount
allocateBillDiscount(items, billDiscountAmount)
  → ItemWithAllocatedDiscount[]

// Calculate item-level discounts
calculateItemDiscounts(discounts, itemTotal)
  → number

// Calculate profit for item
calculateItemProfit(billItem, decomposedItems, allocatedDiscount)
  → ProfitCalculation

// Calculate profit for entire bill
calculateBillProfit(bill, itemsWithDecomposition)
  → BillProfitCalculation
```

**Логика**:

1. Распределить скидку на счет пропорционально
2. Рассчитать собственные скидки позиций
3. Вычислить финальную выручку
4. Вычесть себестоимость (из decomposition)
5. Получить прибыль и маржу

**Test**: 7 scenarios (см. ниже)

---

#### Phase 2c: Integration (1 hour)

**Обновить**:

- `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`

  - Использовать `useDecomposition`
  - Метод: `processItemWriteOff(billItem)`

- `src/stores/pos/payments/paymentsStore.ts`
  - Добавить вызов после payment:
    ```typescript
    await salesStore.recordSalesTransaction(payment, billItems)
    ```

---

### Phase 3: Sales Store & Analytics (2-3 hours)

**Файлы**:

```
src/stores/sales/
├── salesStore.ts         # Main store
└── composables/
    └── useSalesAnalytics.ts  # Analytics functions
```

**Функции salesStore**:

```typescript
// Record sale
recordSalesTransaction(payment, billItems)

// Query sales
fetchSalesTransactions(filters)

// Computed
todayRevenue
todayItemsSold
popularItems
```

**Функции useSalesAnalytics**:

```typescript
calculateRevenue(transactions, dateRange)
getTopSellingItems(transactions, limit)
getRevenueByPaymentMethod(transactions)
getRevenueByDepartment(transactions)
```

---

### Phase 4: Backoffice UI (3-4 hours)

**Файлы**:

```
src/views/backoffice/sales/
├── SalesAnalyticsView.vue
└── SalesTransactionsView.vue

src/views/backoffice/inventory/
└── WriteOffHistoryView.vue
```

**Views**:

**1. SalesAnalyticsView**:

- Revenue summary cards (total, avg, count)
- Top selling items (table)
- Payment method breakdown (chart)
- Department breakdown (kitchen vs bar)
- Date range filter

**2. SalesTransactionsView**:

- All transactions (v-data-table)
- Filters: date, menu item, payment method
- Click row → show details dialog
- Export CSV (optional)

**3. WriteOffHistoryView**:

- All write-offs (manual + auto)
- Filter by type: manual, auto_sales_writeoff
- Show ingredients, costs, batches
- Link to original sale

---

## 🧪 Test Scenarios (Critical)

### Decomposition Tests:

**Test 1**: Simple product

```
Input: "Coke 330ml" × 2
Expected: 1 product (coke_can × 2)
```

**Test 2**: Recipe

```
Input: "Nasi Goreng" × 1
Expected: 6 products (rice, garlic, onion, soy, oil, egg)
```

**Test 3**: Mixed composition

```
Input: "Nasi Goreng with Chicken" × 1
Expected: 7 products (6 from recipe + 1 direct)
```

**Test 4**: Preparation

```
Input: "Burger" × 1 (has prep_patty)
Expected: All products from preparation recipe
```

**Test 5**: Duplicate products

```
Input: Menu item with 2 recipes using same product (e.g., oil)
Expected: Merged quantity (oil × total)
```

---

### Profit Calculation Tests:

**Test 6**: No discount

```
Item: 50,000, Cost: 11,250
Expected: Profit 38,750 (77.5%)
```

**Test 7**: Item discount

```
Item: 50,000 (10% discount), Cost: 11,250
Expected: Revenue 45,000, Profit 33,750 (75%)
```

**Test 8**: Bill discount (proportional)

```
Bill: 2 items (50k + 30k), Bill discount: 8,000
Expected: Allocated 5,000 + 3,000
```

**Test 9**: Bundle deal (100% discount)

```
Item: Coffee 15,000 (100% discount), Cost: 3,000
Expected: Revenue 0, Profit -3,000
```

**Test 10**: Complex combo

```
Item: 50,000 (10% own) + allocated 4,500 bill discount
Expected: Revenue 40,500, Profit calculated correctly
```

---

## 📋 Implementation Checklist

### Day 1: Foundation

- [ ] Create `src/stores/sales/types.ts`
- [ ] Create `src/stores/sales/recipeWriteOff/types.ts`
- [ ] Create `src/stores/sales/services.ts`
- [ ] Create `src/stores/sales/recipeWriteOff/services.ts`
- [ ] Test CRUD operations work

### Day 2: Core Logic ⭐

- [ ] Create `useDecomposition` composable
- [ ] Test decomposition (5 scenarios)
- [ ] Create `useProfitCalculation` composable
- [ ] Test profit calculation (5 scenarios)
- [ ] Integrate into stores

### Day 3: Sales & Analytics

- [ ] Create `salesStore`
- [ ] Create `useSalesAnalytics` composable
- [ ] Update `paymentsStore` to trigger sales recording
- [ ] Test end-to-end: POS sale → Backoffice data
- [ ] Update `appInitializer.ts`

### Day 4: UI

- [ ] Create `SalesAnalyticsView.vue`
- [ ] Create `SalesTransactionsView.vue`
- [ ] Create `WriteOffHistoryView.vue`
- [ ] Update router
- [ ] Update navigation menu
- [ ] Test all views work
- [ ] Test all filters work

---

## 📊 Success Criteria

### Functional:

- [ ] All 10 test scenarios pass
- [ ] Storage balances update on sale
- [ ] Profit calculated correctly for all cases
- [ ] UI shows accurate data
- [ ] No data loss

### Performance:

- [ ] Decomposition: < 50ms per item
- [ ] Write-off: < 100ms per item
- [ ] Profit calc: < 50ms per item
- [ ] Analytics: < 200ms
- [ ] Total sale: < 500ms

### Data Integrity:

- [ ] 100% of sales recorded
- [ ] All write-offs have audit trail
- [ ] Profit calculations accurate
- [ ] Discount allocations sum correctly

---

## 📚 Documentation Created

1. **Sprint2_FINAL_PLAN.md** (этот файл)

   - Окончательный план, все решения

2. **Sprint2_Implementation_Summary.md**

   - Краткое резюме, ключевые решения

3. **Sprint2_Decomposition_And_Profit_Logic.md**

   - Детальные алгоритмы с примерами

4. **Sprint2_Backoffice_Sales_Integration_Plan.md**

   - Полный технический план

5. **Sprint2_Architecture_Diagram.md**

   - Визуальные диаграммы и flow

6. **Sprint2_Quick_Start.md**

   - Day-by-day гид

7. **Sprint2_Visual_Summary.md**
   - Визуальная схема для quick reference

---

## 🎉 After Sprint 2

You will have:

✅ **POS → Backoffice Integration**

- Все продажи видны в backoffice
- Real-time данные (через localStorage)

✅ **Automatic Inventory Write-off**

- Рекурсивная декомпозиция (любая структура меню)
- FIFO списание
- Отрицательные остатки при необходимости
- Full audit trail

✅ **Profit Analysis**

- Точный расчет прибыли
- Учет всех видов скидок
- Поддержка bundle deals
- Profit margin для каждой позиции

✅ **Sales Analytics**

- Revenue summary
- Top selling items
- Payment method breakdown
- Department analysis

✅ **Foundation for Future**

- Predictions (сколько порций можно приготовить)
- Waste tracking
- Price optimization
- Multi-location support

---

## ❓ FAQ (Answered)

**Q: Как обрабатывать пакетные предложения?**
A: Декомпозиция работает для любой структуры. Независимо от того, как отображается в меню, всегда получаем конечные продукты.

**Q: Как учитывать скидки?**
A: Двухуровневая система: сначала скидки на позицию, затем пропорциональное распределение скидки на счет.

**Q: Что делать с "бесплатными" позициями?**
A: Скидка 100% на позицию. Profit может быть отрицательным для отдельной позиции, но общий profit комплекса положительный.

**Q: Что если продукта нет на складе?**
A: Создаем отрицательный остаток. Write-off все равно записывается. Warning система - отдельная функция (будущее).

**Q: Как тестировать?**
A: 10 критических сценариев (5 для decomposition, 5 для profit). Все должны пройти.

---

## 🚀 Ready to Start!

**Status**: ✅ **ALL ARCHITECTURE FINALIZED**

Все архитектурные решения приняты, все edge cases обработаны, план детальный и понятный.

**Next Step**: Phase 1, Day 1, Morning - Create types! 🎯

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
**Approved**: ✅
