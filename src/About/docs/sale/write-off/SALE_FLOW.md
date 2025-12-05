# Sale Flow Documentation - Полный процесс продажи и списания

## 📋 Оглавление

1. [Обзор процесса](#обзор-процесса)
2. [Этап 1: Оформление заказа (POS)](#этап-1-оформление-заказа-pos)
3. [Этап 2: Оплата заказа](#этап-2-оплата-заказа)
4. [Этап 3: Запись транзакции продажи](#этап-3-запись-транзакции-продажи)
5. [Этап 4: Списание ингредиентов](#этап-4-списание-ингредиентов)
6. [Технические детали](#технические-детали)
7. [Обработка ошибок](#обработка-ошибок)

---

## Обзор процесса

**Полный цикл продажи состоит из 4 этапов:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   POS        │────▶│   Payment    │────▶│    Sales     │────▶│  Write-Off   │
│   Order      │     │   Processing │     │  Recording   │     │   Inventory  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
  Создание           Оплата              Учет продаж         Списание со склада
  заказа             средствами          + себестоимость      FIFO + negative
```

**Временная линия:**

- **POS Order**: Мгновенно (создание заказа)
- **Payment**: 1-2 сек (обработка платежа)
- **Sales Recording**: 2-3 сек (расчет COGS + запись в БД)
- **Write-Off**: 3-5 сек (декомпозиция + FIFO allocation + negative batches)

**Общее время:** ~6-11 секунд

---

## Этап 1: Оформление заказа (POS)

### Файлы:

- `src/stores/pos/orders/ordersStore.ts`
- `src/stores/pos/tables/tablesStore.ts`
- `src/views/pos/order/OrderSection.vue`

### Что происходит:

1. **Пользователь выбирает стол/тип заказа**

   - Тип: `dine-in`, `takeaway`, `delivery`
   - Для `dine-in` выбирается стол из `tablesStore`

2. **Добавляет позиции меню**

   ```typescript
   order.items.push({
     menuItemId: '1880d1c2-...',
     variantId: 'f2c05dbe-...',
     name: 'Test',
     variantName: 'Dragon',
     quantity: 1,
     price: 100000,
     discounts: []
   })
   ```

3. **Создается заказ в ordersStore**
   ```typescript
   ordersStore.createOrder({
     tableId?: string,
     orderType: 'dine-in' | 'takeaway' | 'delivery',
     items: OrderItem[],
     status: 'pending'
   })
   ```

**Результат:**

- Order создан с `status: 'pending'`
- Order сохранен в localStorage (offline-first)
- UI обновлен

---

## Этап 2: Оплата заказа

### Файлы:

- `src/stores/pos/payments/paymentsStore.ts`
- `src/views/pos/order/dialogs/PaymentDialog.vue`

### Что происходит:

1. **Пользователь нажимает "Pay"**

   - Открывается `PaymentDialog`
   - Выбирает метод оплаты: `cash`, `card`, `qr`

2. **Обработка платежа**

   ```typescript
   // Simple payment (один метод оплаты)
   paymentsStore.processSimplePayment({
     orderId: order.id,
     amount: order.totalAmount,
     paymentMethod: 'cash',
     tendered: 150000
   })

   // Multiple payments (несколько методов)
   paymentsStore.processMultiplePayments({
     orderId: order.id,
     payments: [
       { method: 'cash', amount: 50000 },
       { method: 'card', amount: 50000 }
     ]
   })
   ```

3. **Обновление статуса**
   - Order status: `pending` → `paid`
   - Payment record создан
   - Если `dine-in`: Table status: `occupied` → `available`

**Результат:**

- Payment сохранен в БД (`payments` table)
- Order обновлен (`orders` table)
- Сдача возвращена (для cash)

---

## Этап 3: Запись транзакции продажи

### Файлы:

- `src/stores/sales/salesStore.ts`
- `src/stores/sales/composables/useActualCostCalculation.ts`
- `src/stores/sales/composables/useProfitCalculation.ts`

### Что происходит:

### 3.1. Инициализация

```typescript
salesStore.recordSalesTransaction({
  orderId: order.id,
  items: order.items,
  totalRevenue: order.totalAmount,
  paymentMethods: ['cash'],
  shiftId: currentShift.id
})
```

### 3.2. Расчет ФАКТИЧЕСКОЙ себестоимости (FIFO)

**Файл:** `src/stores/sales/composables/useActualCostCalculation.ts`

```typescript
const { calculateActualCost } = useActualCostCalculation()

for (const item of orderItems) {
  // Get menu item variant
  const variant = menuStore.getVariant(item.menuItemId, item.variantId)

  // variant.composition = [
  //   { type: 'preparation', id: 'ba109...', quantity: 20, unit: 'gram' },
  //   { type: 'product', id: '5212...', quantity: 5, unit: 'piece' }
  // ]

  let itemCost = 0

  for (const component of variant.composition) {
    if (component.type === 'product') {
      // Allocate from product batches (FIFO)
      const result = allocateFromProductBatches(component.id, component.quantity, department)
      itemCost += result.totalCost
    }

    if (component.type === 'preparation') {
      // Allocate from preparation batches (FIFO)
      const result = allocateFromPreparationBatches(component.id, component.quantity, department)
      itemCost += result.totalCost
    }
  }

  totalCost += itemCost
}
```

**Особенности FIFO allocation:**

```typescript
// preparationStore.allocateBatches()
function allocateFromPreparationBatches(preparationId, quantity, department) {
  // 1. Get active batches (INCLUDING negative batches!)
  const batches = preparationStore.batches
    .filter(
      b =>
        b.preparationId === preparationId &&
        b.department === department &&
        b.isActive &&
        b.currentQuantity !== 0 // ← Включая отрицательные!
    )
    .sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime())

  // 2. Allocate FIFO
  let remaining = quantity
  let totalCost = 0
  const allocations = []

  for (const batch of batches) {
    if (remaining <= 0) break

    const allocated = Math.min(remaining, batch.currentQuantity)
    totalCost += allocated * batch.costPerUnit

    allocations.push({
      batchId: batch.id,
      quantity: allocated,
      cost: batch.costPerUnit
    })

    remaining -= allocated
  }

  return { totalCost, allocations, deficit: remaining }
}
```

**⚠️ ВАЖНО:** На этом этапе **НЕ происходит write-off**!

- Это только **расчет стоимости** для profit calculation
- Batches **читаются**, но **не изменяются**
- Negative batches **используются** для расчета

### 3.3. Расчет прибыли

**Файл:** `src/stores/sales/composables/useProfitCalculation.ts`

```typescript
const profit = {
  revenue: item.finalPrice, // 100,000 IDR
  cost: actualCost.totalCost, // 2,000 IDR (from FIFO)
  profit: revenue - cost, // 98,000 IDR
  profitMargin: ((revenue - cost) / revenue) * 100 // 98%
}
```

### 3.4. Сохранение транзакции

```typescript
const transaction = {
  id: generateShortId('st-'),
  orderId: order.id,
  timestamp: now,
  revenue: totalRevenue,
  cost: totalCost,
  profit: totalRevenue - totalCost,
  items: items.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    cost: item.actualCost
  })),
  paymentMethods: ['cash'],
  shiftId: currentShift.id
}

// Save to Supabase
await supabase.from('sales_transactions').insert(transaction)
```

**Результат Этапа 3:**

- ✅ Transaction создана в `sales_transactions` table
- ✅ COGS рассчитана из FIFO batches
- ✅ Profit calculated
- ⏭️ Переход к Этапу 4 (Write-Off)

---

## Этап 4: Списание ингредиентов

### Файлы:

- `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`
- `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts`
- `src/stores/storage/storageService.ts`
- `src/stores/preparation/negativeBatchService.ts`

### Что происходит:

### 4.1. Инициализация Write-Off

```typescript
recipeWriteOffStore.processItemWriteOff({
  menuItemName: item.name,
  menuItemId: item.menuItemId,
  variantId: item.variantId,
  quantity: item.quantity,
  salesTransactionId: transaction.id
})
```

### 4.2. ДЕКОМПОЗИЦИЯ меню → ингредиенты

**Файл:** `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts`

**Цель:** Раскрыть menu item до финальных ингредиентов (products/preparations)

```typescript
const { decomposeMenuItem } = useDecomposition()

const result = decomposeMenuItem(
  menuItemId: '1880d1c2-...',
  variantId: 'f2c05dbe-...',
  soldQuantity: 1
)

// Пример варианта:
// variant.composition = [
//   { type: 'preparation', id: 'ba109...', quantity: 20, unit: 'gram' }
// ]
```

**Алгоритм декомпозиции:**

```typescript
function decomposeComponent(component, multiplier) {
  if (component.type === 'product') {
    // ✅ Product - конечный элемент, не раскрываем
    return [
      {
        type: 'product',
        id: component.id,
        quantity: component.quantity * multiplier,
        unit: component.unit
      }
    ]
  }

  if (component.type === 'preparation') {
    // Получаем preparation из recipesStore
    const preparation = recipesStore.activePreparations.find(p => p.id === component.id)

    if (!preparation) {
      console.error('Preparation not found:', component.id)
      return []
    }

    // Проверяем: есть ли у preparation sub-components?
    if (preparation.composition && preparation.composition.length > 0) {
      // ✅ Preparation с sub-components - РАСКРЫВАЕМ рекурсивно
      const subItems = []
      for (const subComponent of preparation.composition) {
        const decomposed = decomposeComponent(
          subComponent,
          multiplier * (component.quantity / preparation.outputQuantity)
        )
        subItems.push(...decomposed)
      }
      return subItems
    } else {
      // ✅ Preparation БЕЗ sub-components - НЕ раскрываем!
      // Списываем как preparation batch целиком
      return [
        {
          type: 'preparation',
          id: component.id,
          quantity: component.quantity * multiplier,
          unit: component.unit,
          note: 'Cost will be calculated from FIFO batches'
        }
      ]
    }
  }
}
```

**Пример декомпозиции:**

**Случай 1: Preparation БЕЗ sub-components (Dragon test)**

```typescript
// Input:
variant.composition = [{ type: 'preparation', id: 'ba109...', quantity: 20, unit: 'gram' }]

// Output:
decomposedItems = [{ type: 'preparation', id: 'ba109...', quantity: 20, unit: 'gram' }]
// ← Не раскрывается! Списывается как preparation batch
```

**Случай 2: Preparation С sub-components (например "Соус")**

```typescript
// Input:
variant.composition = [{ type: 'preparation', id: 'sauce-123', quantity: 50, unit: 'ml' }]

// Sauce preparation:
sauce.composition = [
  { type: 'product', id: 'tomato', quantity: 30, unit: 'gram' },
  { type: 'product', id: 'sugar', quantity: 5, unit: 'gram' }
]

// Output (после рекурсивной декомпозиции):
decomposedItems = [
  { type: 'product', id: 'tomato', quantity: 30, unit: 'gram' },
  { type: 'product', id: 'sugar', quantity: 5, unit: 'gram' }
]
// ← Раскрыто до products!
```

**Merge duplicates:**

```typescript
// Если одинаковый product/preparation встречается несколько раз:
mergeDuplicateItems(decomposedItems)[
  // До merge:
  ({ type: 'product', id: 'tomato', quantity: 30 }, { type: 'product', id: 'tomato', quantity: 10 })
][
  // После merge:
  { type: 'product', id: 'tomato', quantity: 40 }
]
```

**Результат декомпозиции:**

```typescript
{
  success: true,
  data: {
    items: [
      { type: 'preparation', id: 'ba109...', quantity: 20, unit: 'gram' }
    ],
    totalItems: 1,
    totalCost: 0  // ← Будет рассчитана при write-off
  }
}
```

### 4.3. Создание Write-Off операции

**Файл:** `src/stores/storage/storageService.ts`

```typescript
storageService.createWriteOff({
  department: 'kitchen',
  reason: 'sale', // Affects KPI!
  items: decomposedItems,
  notes: `Sale transaction: ${salesTransactionId}`,
  userId: currentUser.id,
  shiftId: currentShift.id
})
```

**Для каждого item:**

#### Для PRODUCT:

```typescript
allocateProductFIFO(productId, quantity, department) {
  // 1. Get active batches
  const batches = storageStore.batches
    .filter(b =>
      b.productId === productId &&
      b.department === department &&
      b.status === 'active' &&
      b.currentQuantity > 0
    )
    .sort(by productionDate)  // FIFO

  // 2. Allocate
  const allocations = []
  let remaining = quantity

  for (const batch of batches) {
    const allocated = Math.min(remaining, batch.currentQuantity)

    // Update batch
    batch.currentQuantity -= allocated
    if (batch.currentQuantity === 0) {
      batch.status = 'depleted'
    }

    allocations.push({ batchId: batch.id, quantity: allocated })
    remaining -= allocated
  }

  // 3. IF shortage → create negative batch
  if (remaining > 0) {
    const cost = await calculateNegativeBatchCost(productId, remaining)
    const negativeBatch = await negativeBatchService.createNegativeBatch({
      productId,
      department,
      quantity: -remaining,  // Negative!
      cost
    })

    allocations.push({
      batchId: negativeBatch.id,
      quantity: remaining,
      isNegative: true
    })
  }

  return allocations
}
```

#### Для PREPARATION:

```typescript
allocatePreparationFIFO(preparationId, quantity, department) {
  // 1. Get active batches (including negative!)
  const batches = preparationStore.batches
    .filter(b =>
      b.preparationId === preparationId &&
      b.department === department &&
      b.isActive &&
      b.currentQuantity !== 0  // ← Including negative!
    )
    .sort(by productionDate)  // FIFO

  // 2. Allocate
  const allocations = []
  let remaining = quantity

  for (const batch of batches) {
    const allocated = Math.min(remaining, Math.abs(batch.currentQuantity))

    // Update batch
    if (batch.currentQuantity > 0) {
      // Positive batch
      batch.currentQuantity -= allocated
      if (batch.currentQuantity === 0) {
        batch.status = 'depleted'
      }
    } else {
      // Negative batch - становится еще более отрицательным
      batch.currentQuantity -= allocated
    }

    allocations.push({ batchId: batch.id, quantity: allocated })
    remaining -= allocated
  }

  // 3. IF shortage → create/update negative batch
  if (remaining > 0) {
    // Check: есть ли уже negative batch?
    const existingNegative = await negativeBatchService.getActiveNegativeBatch(
      preparationId,
      department
    )

    if (existingNegative) {
      // ✅ UPDATE existing negative batch
      const cost = existingNegative.costPerUnit

      await negativeBatchService.updateNegativeBatch(
        existingNegative.id,
        remaining,  // Additional shortage
        cost
      )

      allocations.push({
        batchId: existingNegative.id,
        quantity: remaining,
        isNegative: true
      })
    } else {
      // ✅ CREATE new negative batch

      // Calculate cost using fallback chain
      const cost = await negativeBatchService.calculateNegativeBatchCost(
        preparationId,
        remaining
      )

      const negativeBatch = await negativeBatchService.createNegativeBatch({
        preparationId,
        department,
        quantity: -remaining,  // Negative!
        unit: preparation.outputUnit,
        cost,
        reason: 'sale',
        sourceOperationType: 'pos_order'
      })

      allocations.push({
        batchId: negativeBatch.id,
        quantity: remaining,
        isNegative: true
      })
    }
  }

  return allocations
}
```

### 4.4. Расчет стоимости для Negative Batch

**Функция:** `calculateNegativeBatchCost()`

**Файлы:**

- `src/stores/preparation/negativeBatchService.ts:53-129` (preparations)
- `src/stores/storage/negativeBatchService.ts:55-132` (products)

**Улучшенный Fallback Chain (4 уровня):**

```
1. Last active batch cost          ← getLastActiveBatch() → batch.costPerUnit
   ↓ FAIL
2. Depleted batches average (5шт)  ← SELECT FROM *_batches WHERE status='depleted' ORDER BY date DESC LIMIT 5
   ↓ FAIL
3. last_known_cost from DB         ← SELECT last_known_cost FROM products/preparations
   ↓ FAIL
4. 0 + CRITICAL ERROR               ← console.error() + errorContext { failedFallbacks, suggestedAction }
```

#### 4.4.1. Автоматическое обновление `last_known_cost`

**Trigger:** При создании batch в `createReceipt()`

**Файлы:**

- `src/stores/storage/storageService.ts:774-793` (products)
- `src/stores/preparation/preparationService.ts:814-831` (preparations)

**Flow:**

```
createReceipt()
  → INSERT batch INTO *_batches (cost_per_unit = X)
  → UPDATE products/preparations SET last_known_cost = X WHERE id = item_id
  → log: "✅ Updated last_known_cost"
```

**Результаты:**

- ✅ `last_known_cost` обновляется при каждом receipt
- ✅ Fallback level 3 всегда актуален
- ❌ Cost = 0 → CRITICAL ERROR (не маскируется произвольным значением)

### 4.5. Создание записей в БД

**Таблицы:**

```
1. write_off_operations  ← operation metadata (document_number, reason, affects_kpi)
2. batch_operations      ← links batches to operation (batch_id, operation_id, quantity)
3. *_batches             ← update current_quantity, status
```

**Файл:** `src/stores/storage/storageService.ts:844-1170`

### 4.6. Запись расхода в Account Store

**Условие:** `reason` affects KPI (sale, damage, spoilage)

**Flow:**

```
IF affects_kpi:
  accountStore.createTransaction({
    type: 'expense',
    amount: -totalCost,
    category: 'inventory_adjustment'
  })
```

**Результат Этапа 4:**

- ✅ Write-off operation создана
- ✅ Batches обновлены (FIFO)
- ✅ Negative batches созданы/обновлены при shortage
- ✅ Expense записан в Account Store (если affects_kpi)
- ✅ Inventory актуализирован

---

## Технические детали

### Разница между Step 3.2 и Step 4.2

| Аспект                          | Step 3.2 (Sales COGS)              | Step 4.2 (Write-Off)            |
| ------------------------------- | ---------------------------------- | ------------------------------- |
| **Цель**                        | Посчитать себестоимость для profit | Списать фактические ингредиенты |
| **Файл**                        | `useActualCostCalculation.ts`      | `useDecomposition.ts`           |
| **Действие**                    | Читает batches (read-only)         | Изменяет batches (write)        |
| **Использует negative batches** | ✅ Да (для расчета стоимости)      | ✅ Да (создает при shortage)    |
| **Декомпозиция**                | Нет (берет variant.composition)    | ✅ Да (рекурсивная)             |
| **Обновляет БД**                | ❌ Нет                             | ✅ Да                           |

### Negative Batches

**Что это:**

- Batch с отрицательным `currentQuantity`
- Представляет "долг" перед складом
- Создается когда списываем больше чем есть

**Когда создается:**

- При write-off с shortage
- При продаже без stock

**Reconciliation:**

- Когда создается новый receipt → negative batch reconciled
- Status: `active` → `depleted`
- `reconciled_at` заполняется

**Пример:**

```typescript
// До продажи:
batches = [] // Нет batches для Dragon test

// После 1-й продажи (20 gram):
batches = [
  {
    batchNumber: 'NEG-PREP-1764858333956',
    currentQuantity: -20,
    costPerUnit: 100000,
    totalValue: -2000000,
    isNegative: true
  }
]

// После 2-й продажи (20 gram):
batches = [
  {
    batchNumber: 'NEG-PREP-1764858333956',
    currentQuantity: -40, // ← Обновился!
    costPerUnit: 100000,
    totalValue: -4000000,
    isNegative: true
  }
]

// После receipt (производство 100 gram):
batches = [
  {
    batchNumber: 'NEG-PREP-1764858333956',
    currentQuantity: -40,
    status: 'depleted',
    reconciledAt: '2024-12-04T15:30:00Z' // ← Reconciled!
  },
  {
    batchNumber: 'PREP-1764858500000',
    currentQuantity: 60, // ← Остаток после reconciliation (100 - 40)
    costPerUnit: 95000, // ← Новая стоимость из receipt
    isNegative: false
  }
]
```

---

## Обработка ошибок

### Ошибка в Payment (Step 2)

```typescript
try {
  await paymentsStore.processSimplePayment(...)
} catch (error) {
  // Rollback: order status → 'pending'
  // Show error to user
  // Payment НЕ создан
  // Sales transaction НЕ создана
  // Write-off НЕ выполнен
}
```

### Ошибка в Sales Recording (Step 3)

```typescript
try {
  await salesStore.recordSalesTransaction(...)
} catch (error) {
  // Payment УЖЕ создан!
  // Order status = 'paid'
  // Но sales transaction НЕ создана

  // ⚠️ КРИТИЧНО: Manual reconciliation required!
  // Лог ошибки → errors.md
  // Admin должен вручную создать sales transaction
}
```

### Ошибка в Write-Off (Step 4)

```typescript
try {
  await recipeWriteOffStore.processItemWriteOff(...)
} catch (error) {
  // Payment создан ✅
  // Sales transaction создана ✅
  // Но write-off НЕ выполнен ❌

  // Последствия:
  // - Inventory НЕ обновлен
  // - Batches НЕ списаны
  // - Account expense НЕ записан

  // Решение:
  // 1. Retry автоматически (3 попытки)
  // 2. Если fail → queue for manual write-off
  // 3. Admin видит pending write-offs в UI
}
```

### Ошибка в Negative Batch Cost Calculation (Step 4.4)

```typescript
try {
  const cost = await calculateNegativeBatchCost(preparationId, quantity)
} catch (error) {
  // Все fallback шаги провалились
  // Используем estimated cost: 100 IDR

  console.error(`❌ CRITICAL: NO COST DATA FOUND`)

  // ⚠️ WARNING: Inaccurate COGS!
  // Admin должен:
  // 1. Создать receipt operation для preparation
  // 2. Обновить negative batch cost вручную
}
```

---

## Логи и Debugging

### Ключевые логи:

```typescript
// Step 1: Order creation
console.log('[OrdersStore] Order created:', orderId)

// Step 2: Payment
console.log('[PaymentsStore] Payment processed:', paymentId)

// Step 3: Sales Recording
console.log('[SalesStore] Transaction saved:', transactionId)
console.log('[ActualCostCalculation] Actual cost calculated:', { totalCost })

// Step 4: Write-Off
console.log('[RecipeWriteOffStore] Processing write-off for item:', item)
console.log('[DecompositionEngine] Decomposition complete:', { totalProducts })
console.log('[StorageService] Creating write-off operation:', { documentNumber })
console.log('[StorageService] ⚠️ Shortage detected - checking for negative batch')
console.log('[NegativeBatchService] 🔄 Attempting dynamic cost calculation')
console.log('[NegativeBatchService] ✅ Calculated theoretical cost:', cost)
console.log('[NegativeBatchService] ✅ Created negative batch:', batchNumber)
```

### Debugging checklist:

1. **Проверить decomposition:**

   ```typescript
   const result = await decomposeMenuItem(menuItemId, variantId, 1)
   console.log('Decomposed items:', result.items)
   ```

2. **Проверить batches:**

   ```typescript
   const batches = preparationStore.batches.filter(
     b => b.preparationId === preparationId && b.department === 'kitchen'
   )
   console.log('Available batches:', batches)
   ```

3. **Проверить ingredients:**

   ```typescript
   const ingredients = await supabase
     .from('preparation_ingredients')
     .select('*')
     .eq('preparation_id', preparationId)
   console.log('Ingredients:', ingredients)
   ```

4. **Проверить negative batches:**
   ```typescript
   const negativeBatches = await negativeBatchService.getNegativeBatches(preparationId)
   console.log('Negative batches:', negativeBatches)
   ```

---

## Заключение

**Полный цикл продажи - это сложный процесс из 4 этапов:**

1. ✅ **POS Order** - создание заказа
2. ✅ **Payment** - обработка платежа
3. ✅ **Sales Recording** - учет продаж + COGS calculation
4. ✅ **Write-Off** - списание ингредиентов со склада

**Ключевые особенности:**

- **Декомпозиция** происходит в Step 4 (не в Step 3)
- **COGS** считается из FIFO batches (включая negative)
- **Negative batches** создаются автоматически при shortage
- **Fallback chain** для стоимости (6 уровней)
- **Reconciliation** negative batches при receipt

**Производительность:**

- Общее время: ~6-11 секунд
- Критично: Payment должен быть быстрым (<2 сек)
- Write-Off можно делать асинхронно (в фоне)

**Надежность:**

- Rollback для Payment errors
- Retry mechanism для Write-Off errors
- Manual reconciliation для critical failures
- Подробное логирование на каждом этапе
