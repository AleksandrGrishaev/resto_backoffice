# Write-Off Process: Complete Flow Documentation

> **Дата создания**: 2026-01-29
> **Версия**: 1.0
> **Статус**: Production

## 📋 Оглавление

1. [Краткое описание](#краткое-описание)
2. [Когда происходит списание](#когда-происходит-списание)
3. [Полный процесс: шаг за шагом](#полный-процесс-шаг-за-шагом)
4. [Архитектура и код](#архитектура-и-код)
5. [FIFO алгоритм распределения](#fifo-алгоритм-распределения)
6. [Примеры из реальной системы](#примеры-из-реальной-системы)
7. [Известные проблемы и баги](#известные-проблемы-и-баги)
8. [Troubleshooting](#troubleshooting)

---

## Краткое описание

**Write-off (списание)** — это процесс автоматического уменьшения складских остатков при продаже позиций меню.

### Ключевые принципы:

- ✅ Списание происходит в **момент оплаты** (не при создании заказа)
- ✅ Асинхронная обработка (~10-15 секунд задержка после оплаты)
- ✅ FIFO (First In First Out) для распределения по батчам
- ✅ Автоматическая декомпозиция позиций меню на ингредиенты и полуфабрикаты
- ✅ Поддержка частичного списания с нескольких батчей

---

## Когда происходит списание

### ⭐ Триггер: Оплата заказа

```
НЕТ списания:
  - При создании заказа
  - При отправке на кухню
  - При готовке
  - При подаче

✅ ЕСТЬ списание:
  - После успешной оплаты (payments.status = 'completed')
```

### Timeline пример:

```
10:05:29 - Создан заказ ORD-9258 (2× Croissant Salmon)
         └─> orders.status = 'pending'
         └─> order_items.payment_status = 'unpaid'
         └─> ❌ НЕТ списания

10:10:00 - Отправлено на кухню
         └─> order_items.status = 'sent_to_kitchen'
         └─> ❌ НЕТ списания

10:15:00 - Готово
         └─> order_items.status = 'ready'
         └─> ❌ НЕТ списания

10:16:05 - ⭐ ОПЛАЧЕНО (172,500 IDR, метод: grab)
         └─> payments.status = 'completed'
         └─> payments.processed_at = '2026-01-29 10:16:05'
         └─> order_items.payment_status = 'paid'
         └─> ✅ ТРИГГЕР СПИСАНИЯ

10:16:10 - ✅ Создано списание #1 (recipe_write_offs)
10:16:14 - ✅ Создано списание #2 (recipe_write_offs)
         └─> preparation_batches.current_quantity обновлены
         └─> Задержка ~5-10 секунд (асинхронная обработка)
```

---

## Полный процесс: шаг за шагом

### Шаг 1: Создание и подготовка заказа

```typescript
// POS: Создание заказа
ordersStore.createOrder({
  type: 'dine_in',
  tableId: 'table_01'
})

// Добавление позиций
ordersStore.addItemToOrder({
  menuItemId: '98b8929c-3ca5-4560-be8e-5060c87624a1', // Croissant Salmon
  quantity: 1
})

// Состояние:
// - orders.status = 'pending'
// - orders.payment_status = 'unpaid'
// - order_items.status = 'draft'
// - order_items.payment_status = 'unpaid'
// - order_items.write_off_operation_id = null
```

### Шаг 2: Отправка на кухню

```typescript
// POS: Отправка заказа
ordersStore.sendToKitchen(orderId)

// Состояние:
// - order_items.status = 'sent_to_kitchen'
// - order_items.sent_to_kitchen_at = TIMESTAMP
// ❌ НЕТ списания (еще не оплачено)
```

### Шаг 3: Готовка и подача

```typescript
// Kitchen Display: Обновление статусов
ordersStore.updateItemStatus(itemId, 'cooking')
ordersStore.updateItemStatus(itemId, 'ready')
ordersStore.updateItemStatus(itemId, 'served')

// Состояние:
// - order_items.status = 'ready' → 'served'
// - order_items.ready_at = TIMESTAMP
// - order_items.served_at = TIMESTAMP
// ❌ НЕТ списания (еще не оплачено)
```

### Шаг 4: ⭐ ОПЛАТА (ТРИГГЕР СПИСАНИЯ)

```typescript
// POS: Обработка платежа
paymentsStore.processPayment({
  orderId: orderId,
  amount: 75000,
  paymentMethod: 'bca',
  billIds: [billId],
  itemIds: [itemId1, itemId2]
})

// Результат:
// 1. Создается запись в payments:
{
  id: 'payment_uuid',
  order_id: orderId,
  amount: 75000,
  payment_method: 'bca',
  status: 'completed',
  processed_at: '2026-01-29 10:16:05.148+00',
  bill_ids: [billId],
  item_ids: [itemId1, itemId2]
}

// 2. Обновляются order_items:
// - order_items.payment_status = 'paid'
// - order_items.paid_by_payment_ids = [payment_uuid]

// 3. ✅ АВТОМАТИЧЕСКИ запускается фоновый процесс списания
```

### Шаг 5: Фоновое списание (автоматически)

```typescript
// ⚡ Событие: Payment completed
// ⚡ Обработчик: paymentsStore watchers

// Где: src/stores/pos/payments/paymentsStore.ts
watch(
  () => payments.value,
  async (newPayments, oldPayments) => {
    // Находим новые completed платежи
    const newCompletedPayments = newPayments.filter(
      p => p.status === 'completed' && !oldPayments.find(o => o.id === p.id)
    )

    // Для каждого оплаченного платежа
    for (const payment of newCompletedPayments) {
      // Получаем список оплаченных позиций
      const paidItems = getItemsByPayment(payment)

      // ✅ Запускаем процесс списания
      await recipeWriteOffService.processOrderPayment({
        payment,
        orderItems: paidItems
      })
    }
  }
)
```

### Шаг 6: Декомпозиция позиций меню

```typescript
// Где: src/stores/sales/recipeWriteOff/services.ts
async processOrderPayment({ payment, orderItems }) {
  for (const orderItem of orderItems) {
    // 1. Получаем рецепт позиции меню
    const menuItem = menuStore.getById(orderItem.menuItemId)
    const recipe = recipesStore.getRecipeForMenuItem(menuItem.id)

    if (!recipe) {
      console.warn('No recipe found for menu item')
      continue
    }

    // 2. ⭐ ДЕКОМПОЗИЦИЯ: разбираем позицию меню на компоненты
    const decomposed = await DecompositionEngine.decompose({
      recipeId: recipe.id,
      portionSize: orderItem.quantity,
      department: orderItem.department
    })

    // Результат декомпозиции:
    // decomposed = {
    //   products: [
    //     { itemId: 'croissant_id', quantity: 1, unit: 'piece' },
    //     { itemId: 'avocado_id', quantity: 106.67, unit: 'gram' },
    //     { itemId: 'ricotta_id', quantity: 60, unit: 'gram' },
    //     ...
    //   ],
    //   preparations: [
    //     { itemId: 'salmon_prep_id', quantity: 30, unit: 'gram' }
    //   ]
    // }

    // 3. Обрабатываем каждый компонент
    await this.processDecomposedItems(decomposed, orderItem)
  }
}
```

### Шаг 7: Распределение по батчам (FIFO)

```typescript
// Где: src/stores/sales/recipeWriteOff/adapters/WriteOffAdapter.ts
async allocateBatches(itemId, quantityNeeded, itemType) {
  // 1. Получаем все доступные батчи для этого продукта/полуфабриката
  const availableBatches = this.getBatchesForItem(itemId, itemType)

  // 2. Сортируем по FIFO (First In First Out)
  const sortedBatches = availableBatches.sort((a, b) => {
    return new Date(a.production_date) - new Date(b.production_date)
  })

  // 3. ⭐ Распределяем количество по батчам
  const allocations = []
  let remaining = quantityNeeded

  for (const batch of sortedBatches) {
    if (remaining <= 0) break

    const available = batch.current_quantity
    const toTake = Math.min(remaining, available)

    if (toTake > 0) {
      allocations.push({
        batchId: batch.id,
        quantity: toTake,
        costPerUnit: batch.cost_per_unit,
        totalCost: toTake * batch.cost_per_unit
      })

      remaining -= toTake
    }
  }

  // Результат:
  // allocations = [
  //   { batchId: 'old_batch', quantity: 15, costPerUnit: 305.56, totalCost: 4583.4 },
  //   { batchId: 'new_batch', quantity: 15, costPerUnit: 0, totalCost: 0 }
  // ]

  return allocations
}
```

### Шаг 8: Создание записи списания

```typescript
// Где: src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts
async createWriteOff({ orderItem, decomposed, allocations }) {
  // 1. Формируем write_off_items (детали списания)
  const writeOffItems = allocations.map(allocation => ({
    type: allocation.itemType, // 'product' | 'preparation'
    itemId: allocation.itemId,
    itemName: allocation.itemName,
    batchIds: allocation.batches.map(b => b.batchId),
    totalQuantity: allocation.totalQuantity,
    costPerUnit: allocation.averageCost,
    totalCost: allocation.totalCost,
    unit: allocation.unit
  }))

  // 2. Создаем запись в recipe_write_offs
  const writeOff = {
    id: generateId('rwo'),
    sales_transaction_id: generateId('st'),
    menu_item_id: orderItem.menuItemId,
    recipe_id: recipe.id,
    sold_quantity: orderItem.quantity,
    write_off_items: writeOffItems, // JSONB массив
    decomposed_items: decomposed, // JSONB (для отчетов)
    original_composition: recipe.components, // JSONB (для аудита)
    department: orderItem.department,
    operation_type: 'sale',
    performed_at: new Date().toISOString(),
    performed_by: currentUser.id
  }

  await supabase.from('recipe_write_offs').insert(writeOff)

  // ❌ БАГ: НЕ обновляется order_items.write_off_operation_id!
  // TODO: Нужно добавить:
  // await supabase.from('order_items')
  //   .update({ write_off_operation_id: writeOff.id })
  //   .eq('id', orderItem.id)
}
```

### Шаг 9: Обновление батчей на складе

```typescript
// Где: src/stores/storage/storageService.ts (для products)
//      src/stores/preparation/preparationService.ts (для preparations)

async updateBatchQuantities(allocations) {
  for (const allocation of allocations) {
    for (const batch of allocation.batches) {
      // Обновляем current_quantity в базе
      await supabase
        .from('preparation_batches') // или 'storage_batches'
        .update({
          current_quantity: batch.currentQuantity - batch.quantityTaken
        })
        .eq('id', batch.batchId)

      // Обновляем локальный store
      const batchIndex = this.batches.findIndex(b => b.id === batch.batchId)
      if (batchIndex !== -1) {
        this.batches[batchIndex].currentQuantity -= batch.quantityTaken
      }
    }
  }
}
```

### Итоговый результат:

После завершения всего процесса:

```sql
-- Таблица recipe_write_offs: новая запись
{
  "id": "rwo-1769656080823-43whvh21g",
  "sales_transaction_id": "st-1769656077266-em1cc3jv7",
  "menu_item_id": "98b8929c-3ca5-4560-be8e-5060c87624a1",
  "sold_quantity": 1,
  "write_off_items": [
    {
      "type": "preparation",
      "itemId": "6ed21b4e-4384-4839-8cc6-3dbc119f7feb",
      "itemName": "Salmon portion 30g",
      "batchIds": ["59ebc928-...", "05430d2d-..."],
      "totalQuantity": 30,
      "costPerUnit": 152.78, // Средневзвешенная
      "totalCost": 4583.4
    }
  ],
  "performed_at": "2026-01-29 03:08:00.823+00"
}

-- Таблица preparation_batches: обновлены количества
OLD batch: current_quantity = 180g → 165g (-15g)
NEW batch: current_quantity = 120g → 105g (-15g)

-- Таблица order_items: ❌ НЕ обновлена
write_off_operation_id = null (БАГ!)
```

---

## Архитектура и код

### Основные компоненты:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. POS System (Orders & Payments)                          │
│    src/stores/pos/                                          │
│    - orders/ordersStore.ts                                  │
│    - payments/paymentsStore.ts ← Триггер списания          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Recipe Write-Off Service                                 │
│    src/stores/sales/recipeWriteOff/                         │
│    - recipeWriteOffStore.ts                                 │
│    - services.ts ← processOrderPayment()                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Decomposition Engine                                     │
│    src/stores/sales/recipeWriteOff/                         │
│    - DecompositionEngine.ts ← decompose()                   │
│    Разбирает меню → ингредиенты + полуфабрикаты            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Write-Off Adapter (FIFO Allocation)                      │
│    src/stores/sales/recipeWriteOff/adapters/                │
│    - WriteOffAdapter.ts ← allocateBatches()                 │
│    Распределяет количество по батчам (FIFO)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Storage & Preparation Services                           │
│    src/stores/storage/storageService.ts                     │
│    src/stores/preparation/preparationService.ts             │
│    Обновляют current_quantity в батчах                      │
└─────────────────────────────────────────────────────────────┘
```

### Ключевые файлы и функции:

| Файл                                         | Функция                   | Назначение                           |
| -------------------------------------------- | ------------------------- | ------------------------------------ |
| `pos/payments/paymentsStore.ts`              | `watch()`                 | Следит за новыми completed платежами |
| `recipeWriteOff/services.ts`                 | `processOrderPayment()`   | Главная функция обработки списания   |
| `recipeWriteOff/DecompositionEngine.ts`      | `decompose()`             | Разбирает позицию меню на компоненты |
| `recipeWriteOff/adapters/WriteOffAdapter.ts` | `allocateBatches()`       | FIFO распределение по батчам         |
| `recipeWriteOff/recipeWriteOffStore.ts`      | `createWriteOff()`        | Создает запись в recipe_write_offs   |
| `preparation/preparationService.ts`          | `updateBatchQuantities()` | Обновляет остатки полуфабрикатов     |
| `storage/storageService.ts`                  | `updateBatchQuantities()` | Обновляет остатки продуктов          |

---

## FIFO алгоритм распределения

### Принцип работы:

**FIFO (First In First Out)** — сначала списываются самые старые батчи.

### Алгоритм:

```typescript
function allocateBatchesFIFO(itemId: string, quantityNeeded: number) {
  // 1. Получаем все батчи для этого продукта/полуфабриката
  const batches = getAllBatches(itemId).filter(b => b.current_quantity > 0) // Только с остатками

  // 2. Сортируем по дате производства (старые → новые)
  batches.sort((a, b) => {
    return new Date(a.production_date) - new Date(b.production_date)
  })

  // 3. Распределяем количество
  const allocations = []
  let remaining = quantityNeeded

  for (const batch of batches) {
    if (remaining <= 0) break

    const available = batch.current_quantity
    const toTake = Math.min(remaining, available)

    allocations.push({
      batchId: batch.id,
      quantity: toTake,
      cost: toTake * batch.cost_per_unit
    })

    remaining -= toTake
  }

  // 4. Проверяем достаточность
  if (remaining > 0) {
    throw new Error(
      `Insufficient stock: need ${quantityNeeded}, available ${quantityNeeded - remaining}`
    )
  }

  return allocations
}
```

### Пример частичного списания:

```javascript
// Ситуация:
// Нужно списать: 30g salmon
//
// Доступные батчи:
// - OLD batch: 15g available, cost_per_unit = 305.56, date = 2026-01-26
// - NEW batch: 105g available, cost_per_unit = 0, date = 2026-01-29

// Шаг 1: Сортировка по дате
batches = [
  { id: 'old', quantity: 15, cost: 305.56, date: '2026-01-26' }, // Старый
  { id: 'new', quantity: 105, cost: 0, date: '2026-01-29' }      // Новый
]

// Шаг 2: Распределение
remaining = 30

// Итерация 1 (OLD batch):
available = 15
toTake = min(30, 15) = 15
allocations.push({ batchId: 'old', quantity: 15, cost: 4583.4 })
remaining = 30 - 15 = 15

// Итерация 2 (NEW batch):
available = 105
toTake = min(15, 105) = 15
allocations.push({ batchId: 'new', quantity: 15, cost: 0 })
remaining = 15 - 15 = 0

// Результат:
allocations = [
  { batchId: 'old', quantity: 15, cost: 4583.4 },
  { batchId: 'new', quantity: 15, cost: 0 }
]

// Средневзвешенная стоимость:
totalCost = 4583.4 + 0 = 4583.4
totalQuantity = 15 + 15 = 30
averageCost = 4583.4 / 30 = 152.78 IDR/gram
```

---

## Примеры из реальной системы

### Пример 1: Простое списание (один батч)

```
Заказ: Croissant Salmon (1 порция)
Время: 2026-01-29 02:16:10

Требуется:
- Salmon portion 30g: 30g

Доступные батчи:
- Batch "59ebc928...": 360g, cost = 305.56 IDR/g, date = 2026-01-26

FIFO распределение:
1. Берем 30g из batch "59ebc928..."

Результат:
- Списано: 30g
- Стоимость: 30g × 305.56 = 9,166.80 IDR
- Batch остаток: 360g - 30g = 330g

Запись в recipe_write_offs:
{
  "write_off_items": [{
    "itemName": "Salmon portion 30g",
    "batchIds": ["59ebc928..."],
    "totalQuantity": 30,
    "costPerUnit": 305.56,
    "totalCost": 9166.8
  }]
}
```

### Пример 2: Частичное списание (два батча)

```
Заказ: Croissant Salmon (1 порция)
Время: 2026-01-29 03:08:00

Требуется:
- Salmon portion 30g: 30g

Доступные батчи (отсортированы по FIFO):
1. Batch "59ebc928..." (OLD): 15g остаток, cost = 305.56, date = 2026-01-26
2. Batch "05430d2d..." (NEW): 120g остаток, cost = 0, date = 2026-01-29

FIFO распределение:
1. Берем 15g из OLD batch (весь остаток)
2. Берем 15g из NEW batch (частично)

Результат:
- Списано: 15g + 15g = 30g
- Стоимость:
  - OLD: 15g × 305.56 = 4,583.40 IDR
  - NEW: 15g × 0 = 0 IDR
  - TOTAL: 4,583.40 IDR
- Средняя стоимость: 4,583.40 / 30 = 152.78 IDR/g
- OLD batch остаток: 15g - 15g = 0g (истощен)
- NEW batch остаток: 120g - 15g = 105g

Запись в recipe_write_offs:
{
  "write_off_items": [{
    "itemName": "Salmon portion 30g",
    "batchIds": ["59ebc928...", "05430d2d..."], // ⭐ ДВА батча
    "totalQuantity": 30,
    "costPerUnit": 152.78, // Средневзвешенная
    "totalCost": 4583.4
  }]
}
```

### Пример 3: Zero-cost списание (БАГ)

```
Заказ: Croissant Salmon (1 порция)
Время: 2026-01-29 04:28:56

Требуется:
- Salmon portion 30g: 30g

Доступные батчи:
1. Batch "05430d2d..." (NEW): 105g, cost = 0 ❌, date = 2026-01-29
2. Batch "f5cca2ce..." (PROD): 180g, cost = 305.56, date = 2026-01-29 03:55

⚠️ Проблема: NEW batch создан раньше (02:27), поэтому FIFO берет его первым!

FIFO распределение:
1. Берем 30g из NEW batch (cost = 0)

Результат:
- Списано: 30g
- Стоимость: 30g × 0 = 0 IDR ❌ НЕПРАВИЛЬНО!
- NEW batch остаток: 105g - 30g = 75g

Запись в recipe_write_offs:
{
  "write_off_items": [{
    "itemName": "Salmon portion 30g",
    "batchIds": ["05430d2d..."],
    "totalQuantity": 30,
    "costPerUnit": 0, // ❌ ZERO COST!
    "totalCost": 0
  }]
}

🔧 Исправление:
UPDATE preparation_batches
SET cost_per_unit = 305.56
WHERE id = '05430d2d-8e2c-4023-905a-2c696507c393';
```

---

## Известные проблемы и баги

### 🐛 Проблема #1: write_off_operation_id = null

**Описание**: Поле `order_items.write_off_operation_id` всегда остается NULL, даже после успешного списания.

**Влияние**:

- ❌ Нет audit trail (невозможно проследить какое списание к какому заказу)
- ❌ Сложно отлаживать проблемы с инвентарем
- ❌ Невозможно отменить списание при возврате

**Где баг**: `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts:~350`

**Fix**:

```typescript
// AFTER creating write-off record:
async createWriteOff(data) {
  const writeOff = await supabase.from('recipe_write_offs').insert(...)

  // ✅ ADD THIS:
  await supabase
    .from('order_items')
    .update({ write_off_operation_id: writeOff.id })
    .eq('id', data.orderItemId)
}
```

**Приоритет**: Средний (не влияет на списание, но важно для отчетности)

---

### 🐛 Проблема #2: Zero-cost batches от инвентаризации

**Описание**: При создании инвентаризационной коррекции батч создается с `cost_per_unit = 0`, если `getPreparationInfo()` не возвращает `lastKnownCost`.

**Где баг**: `src/stores/preparation/preparationService.ts:921`

**Что было**:

```typescript
// ❌ БАГ:
const preparationInfo = this.getPreparationInfo(item.preparationId)
const costPerUnit = preparationInfo.lastKnownCost || preparationInfo.estimatedCost || 0
//                                  ↑ undefined!        ↑ не существует!    ↑ fallback = 0
```

**Как исправлено** (2026-01-29):

```typescript
// ✅ FIX: getPreparationInfo() теперь возвращает lastKnownCost
return {
  name: preparation.name,
  unit: preparation.outputUnit,
  outputQuantity: preparation.outputQuantity,
  outputUnit: preparation.outputUnit,
  costPerPortion: preparation.costPerPortion || 0,
  lastKnownCost: preparation.lastKnownCost || 0, // ✅ ДОБАВЛЕНО
  shelfLife: preparation.shelfLife || 2,
  portionType: preparation.portionType || 'weight',
  portionSize: preparation.portionSize
}
```

**Статус**: ✅ ИСПРАВЛЕНО (новые батчи будут правильные)

**Исправление существующих zero-cost батчей**:

```sql
-- Найти все zero-cost батчи
SELECT b.id, b.batch_number, p.name, p.last_known_cost
FROM preparation_batches b
JOIN preparations p ON b.preparation_id = p.id
WHERE b.cost_per_unit = 0 AND p.last_known_cost > 0;

-- Исправить (пример для salmon):
UPDATE preparation_batches
SET cost_per_unit = 305.56
WHERE id = '05430d2d-8e2c-4023-905a-2c696507c393';
```

**Приоритет**: ✅ ИСПРАВЛЕНО

---

### 🐛 Проблема #3: Асинхронная задержка списания

**Описание**: Между моментом оплаты и созданием записи списания проходит ~10-15 секунд.

**Причина**: Асинхронная обработка в watch() handlers.

**Влияние**:

- ⚠️ Временное расхождение UI (показывает остаток до списания)
- ⚠️ Возможны race conditions при быстрых операциях

**Где**: `src/stores/pos/payments/paymentsStore.ts`

**Можно улучшить**:

```typescript
// Текущий подход (асинхронный):
watch(payments, async (newPayments) => {
  await recipeWriteOffService.processOrderPayment(...)
})

// Улучшенный подход (оптимистичный UI):
watch(payments, async (newPayments) => {
  // 1. Сразу обновляем UI (оптимистично)
  this.optimisticallyReduceStock(payment)

  // 2. Запускаем фоновое списание
  try {
    await recipeWriteOffService.processOrderPayment(...)
  } catch (error) {
    // 3. В случае ошибки - откатываем UI
    this.rollbackStock(payment)
    showError('Списание не удалось')
  }
})
```

**Приоритет**: Низкий (текущее поведение приемлемо)

---

## Troubleshooting

### ❓ Проблема: "Продал 5 порций, но остаток не изменился"

**Проверка #1: Оплачены ли заказы?**

```sql
-- Проверить статус оплаты заказов
SELECT
  o.order_number,
  o.payment_status,
  oi.menu_item_name,
  oi.quantity,
  oi.payment_status as item_payment_status
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.menu_item_name ILIKE '%ваша позиция%'
  AND o.created_at >= 'дата начала'
ORDER BY o.created_at;
```

**Ожидаемый результат**:

- `payment_status = 'paid'` — будет списание ✅
- `payment_status = 'unpaid'` — НЕТ списания (ожидаемо) ⚠️
- `payment_status = 'partially_paid'` — частичное списание ⚠️

---

**Проверка #2: Созданы ли записи списания?**

```sql
-- Проверить recipe_write_offs
SELECT
  id,
  performed_at,
  sold_quantity,
  write_off_items
FROM recipe_write_offs
WHERE performed_at >= 'дата начала'
  AND write_off_items::text ILIKE '%название продукта%'
ORDER BY performed_at;
```

**Ожидаемый результат**:

- Количество записей = количеству оплаченных заказов ✅
- Если записей меньше — ошибка в процессе списания ❌

---

**Проверка #3: Обновлены ли батчи?**

```sql
-- Проверить изменения в батчах
SELECT
  b.batch_number,
  b.initial_quantity,
  b.current_quantity,
  (b.initial_quantity - b.current_quantity) as consumed,
  b.production_date,
  p.name
FROM preparation_batches b
JOIN preparations p ON b.preparation_id = p.id
WHERE p.name ILIKE '%название%'
ORDER BY b.production_date DESC
LIMIT 10;
```

**Ожидаемый результат**:

- `consumed > 0` для старых батчей (FIFO) ✅
- `current_quantity` уменьшилось ✅

---

### ❓ Проблема: "Списание с неправильной стоимостью (cost = 0)"

**Причина**: Zero-cost batch от инвентаризации.

**Решение**:

```sql
-- 1. Найти проблемный батч
SELECT b.id, b.batch_number, b.cost_per_unit, p.last_known_cost
FROM preparation_batches b
JOIN preparations p ON b.preparation_id = p.id
WHERE b.cost_per_unit = 0 AND p.last_known_cost > 0;

-- 2. Исправить стоимость
UPDATE preparation_batches
SET cost_per_unit = (
  SELECT last_known_cost
  FROM preparations
  WHERE id = preparation_batches.preparation_id
)
WHERE cost_per_unit = 0
  AND preparation_id IN (
    SELECT id FROM preparations WHERE last_known_cost > 0
  );

-- 3. Пересчитать уже созданные списания (опционально)
-- Это сложнее, т.к. нужно пересчитать write_off_items JSONB
```

---

### ❓ Проблема: "Частичное списание работает неправильно"

**Проверка**: Посмотрите на batchIds в списании

```sql
SELECT
  id,
  performed_at,
  write_off_items->0->'batchIds' as batch_ids,
  write_off_items->0->'totalQuantity' as quantity,
  write_off_items->0->'costPerUnit' as cost
FROM recipe_write_offs
WHERE id = 'проблемное_списание';
```

**Ожидаемые признаки частичного списания**:

- `batch_ids` содержит МАССИВ из 2+ батчей ✅
- `costPerUnit` — средневзвешенная стоимость ✅

**Проверка FIFO**:

```sql
-- Должны списываться самые СТАРЫЕ батчи первыми
SELECT
  id,
  batch_number,
  production_date,
  current_quantity
FROM preparation_batches
WHERE preparation_id = 'id_preparation'
ORDER BY production_date ASC;
```

---

### ❓ Проблема: "Инвентаризация создала батч с нулевой стоимостью"

**Решение**: Обновите `preparationService.ts` (уже исправлено в версии от 2026-01-29).

**Проверка fix**:

```typescript
// Убедитесь, что getPreparationInfo() возвращает lastKnownCost
private getPreparationInfo(preparationId: string) {
  // ...
  return {
    name: preparation.name,
    // ... other fields
    lastKnownCost: preparation.lastKnownCost || 0, // ✅ должно быть
  }
}
```

---

## Контрольный чеклист

Используйте при отладке проблем со списанием:

- [ ] Заказ создан в системе (orders таблица)
- [ ] Позиции добавлены (order_items таблица)
- [ ] Позиции отправлены на кухню (status = 'sent_to_kitchen')
- [ ] Позиции готовы (status = 'ready')
- [ ] Заказ ОПЛАЧЕН (payments.status = 'completed') ⭐
- [ ] Создана запись в recipe_write_offs
- [ ] write_off_items содержит правильные данные
- [ ] Батчи обновлены (current_quantity уменьшилось)
- [ ] Стоимость списания > 0 (если должна быть)
- [ ] FIFO: списан самый старый батч первым
- [ ] order_items.write_off_operation_id заполнен (опционально)

---

## 🔧 TODO: Улучшения системы

### 1️⃣ ✅ ИСПРАВЛЕНО: write_off_operation_id теперь заполняется

**Проблема**: После создания write-off запись `order_items.write_off_operation_id` оставалась NULL.

**Файл**: `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts`

**Исправлено**: 2026-01-29 (версия 1.1)

**Что сделано**:

- Добавлен код обновления `order_items.write_off_operation_id` после создания write-off
- Обновляются последние N записей (N = quantity) по `menu_item_id` где `write_off_operation_id IS NULL`
- Исправлено в обеих функциях: `processItemWriteOff()` и `processItemWriteOffFromResult()`
- Добавлена обработка ошибок (non-critical, не блокирует само списание)

**Как работает**:

```typescript
// После сохранения write-off:
const { data: updatedItems, error } = await supabase
  .from('order_items')
  .update({
    write_off_operation_id: saveResult.data.storageOperationId
  })
  .eq('menu_item_id', billItem.menuItemId)
  .is('write_off_operation_id', null)
  .order('created_at', { ascending: false })
  .limit(billItem.quantity)
  .select()
```

**Результат**: Теперь можно отследить какое именно списание обработало какой заказ через `storage_operations` таблицу.

**Приоритет**: ✅ ВЫПОЛНЕНО

---

### 2️⃣ ВАЖНО: Изменить триггер списания с "payment" на "ready"

**Текущее поведение**: Списание происходит в момент оплаты (payments.status = 'completed')

**Предлагаемое изменение**: Списание должно происходить когда блюдо готово (order_items.status = 'ready')

**Обоснование**:

- ✅ Более точное отражение фактического расхода ингредиентов
- ✅ Списание происходит сразу после приготовления, а не после оплаты
- ✅ Решает проблему неоплаченных заказов (продукты уже использованы)
- ⚠️ Требует обработку отмененных готовых блюд (возврат в остатки)

**Файлы для изменения**:

1. **Убрать триггер из payments**:

   - Файл: `src/stores/pos/payments/paymentsStore.ts`
   - Найти: `watch()` который следит за `payments.status = 'completed'`
   - Удалить: вызов `recipeWriteOffService.processOrderPayment()`

2. **Добавить триггер в orders**:

   - Файл: `src/stores/pos/orders/ordersStore.ts`
   - Добавить: `watch()` на `order_items.status = 'ready'`
   - Код:

   ```typescript
   watch(
     () => state.value.orderItems,
     async (newItems, oldItems) => {
       // Находим items которые только что стали 'ready'
       const newlyReadyItems = newItems.filter(item => {
         const oldItem = oldItems.find(o => o.id === item.id)
         return item.status === 'ready' && oldItem?.status !== 'ready'
       })

       for (const item of newlyReadyItems) {
         console.log(`🔄 Item ready, triggering write-off:`, item.menuItemName)

         // Создаем временный sales transaction ID
         const salesTransactionId = `st-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

         // Запускаем списание
         await recipeWriteOffStore.processItemWriteOff(item, salesTransactionId)
       }
     },
     { deep: true }
   )
   ```

3. **Обработка отмен**:
   - Файл: `src/stores/pos/orders/ordersStore.ts`
   - Добавить: логику возврата в остатки при отмене готового блюда
   - Создать: функцию `reverseWriteOff(orderItemId)` в `recipeWriteOffStore.ts`

**Приоритет**: Высокий (улучшает точность учета)

**Сложность**: Средняя (требует тестирование отмен)

**Сроки**: Sprint 2-3

---

### 3️⃣ ПОЛЕЗНО: Оптимистичный UI для списания

**Проблема**: Задержка ~10-15 секунд между оплатой и обновлением остатков в UI

**Решение**:

```typescript
// Сразу обновляем UI (оптимистично)
this.optimisticallyReduceStock(payment)

// Запускаем фоновое списание
try {
  await recipeWriteOffService.processOrderPayment(...)
} catch (error) {
  // В случае ошибки - откатываем UI
  this.rollbackStock(payment)
  showError('Списание не удалось')
}
```

**Приоритет**: Низкий (nice-to-have)

---

### 4️⃣ МОНИТОРИНГ: Dashboard для неоплаченных заказов

**Что нужно**:

- Отчет по заказам со статусом `ready` но `payment_status = 'unpaid'`
- Показывать сколько времени прошло с момента готовности
- Алерт если заказ висит более 1 часа

**Файл**: `src/views/backoffice/reports/UnpaidOrdersReport.vue` (создать)

**Приоритет**: Средний

---

### 5️⃣ ИСПРАВЛЕНИЕ: Инвентаризация создала 120g вместо 255g

**Проблема**: При физической инвентаризации (9 порций = 270g) создался batch на 120g вместо ожидаемых 255g (270g - 15g остаток).

**Вопросы для investigation**:

1. Как пользователь вводил данные инвентаризации? (порции или граммы?)
2. Учитывала ли система существующий остаток OLD batch (15g)?
3. Был ли OLD batch видим в UI при инвентаризации?

**Файл для проверки**: `src/stores/preparation/preparationService.ts` - функция `createCorrection()`

**Приоритет**: Высокий (влияет на точность инвентаря)

---

## История изменений

| Дата       | Версия | Изменения                                                      |
| ---------- | ------ | -------------------------------------------------------------- |
| 2026-01-29 | 1.0    | Первая версия документации. Исправлен баг с zero-cost batches. |
| 2026-01-29 | 1.1    | Добавлена секция TODO с планом улучшений.                      |

---

## См. также

- [DECOMPOSITION_ARCHITECTURE.md](./DECOMPOSITION_ARCHITECTURE.md) - Архитектура декомпозиции
- [FIFO_ALLOCATION.md](./FIFO_ALLOCATION.md) - Детали FIFO алгоритма (TODO)
- [INVENTORY_CORRECTION.md](./INVENTORY_CORRECTION.md) - Процесс инвентаризации (TODO)
