# ТЗ: Интеграция "товара в пути" через расширение Batch (обновлено)

## 📋 Описание проблемы и анализ существующих файлов

### Текущая архитектура Storage системы:

**Основные файлы системы Storage:**

- `src/stores/storage/types.ts` - Типы данных для складского учета
- `src/stores/storage/storageStore.ts` - Основной store для управления складом
- `src/views/storage/components/StorageStockTable.vue` - Таблица остатков товаров
- `src/views/storage/components/ItemDetailsDialog.vue` - Диалог детальной информации о товаре
- `src/stores/storage/storageMock.ts` - Mock данные для тестирования

**Supplier система:**

- `src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts` - Интеграция планируемых поставок (СЛОМАНА)
- `src/stores/supplier_2/composables/usePurchaseOrders.ts` - Управление заказами
- `src/stores/supplier_2/composables/useReceipts.ts` - Управление приемкой товаров
- `src/stores/supplier_2/types/supplierIntegrationTypes.ts` - Типы интеграций

### Текущая ситуация:

```
Заказ создан → Отправлен → [ПУСТОТА] → Товар получен
                ↓                       ↓
           Поставщик              Создается Batch
           получил заказ          в StorageStore
```

### Проблемы:

1. **Товар "исчезает" после отправки заказа** - система не знает, что он в пути
2. **Неточные рекомендации к заказу** - не учитывается уже заказанное
3. **Нет контроля над поставками** - не видно что ожидается и когда
4. **Ошибка в PlannedDeliveryIntegration** - пытается использовать несуществующие методы StorageStore (`createPlannedDelivery`, `getPlannedDeliveryByOrderId`)
5. **Отсутствует связь между заказами и batch-ами** - нет механизма отслеживания

### Пример проблемы:

```
Сценарий: Заказали 10кг помидоров, на складе 2кг, минимум 5кг

❌ СЕЙЧАС:
- Отправили заказ на 10кг
- Рекомендации показывают: "Заказать еще 8кг помидоров!"
- На складе по-прежнему 2кг, система не знает про 10кг в пути

✅ ДОЛЖНО БЫТЬ:
- Отправили заказ на 10кг → создался "транзитный batch" на 10кг
- Эффективный запас = 2кг (склад) + 10кг (в пути) = 12кг
- Рекомендации: "Помидоров достаточно до [дата поставки]"
```

## 🎯 Решение через расширение Batch

### Концепция:

Вместо создания отдельной сущности `PlannedDelivery`, мы расширяем существующую `StorageBatch` новым статусом `in_transit` и дополнительными полями для связи с заказами поставщикам.

### Преимущества:

- ✅ Используем существующую инфраструктуру Batch
- ✅ Минимальные изменения в коде
- ✅ Естественная логика: batch "в пути" → batch "на складе"
- ✅ Автоматически работает с существующими фильтрами и вычислениями

## 📊 Детальный план изменений

## 1. Расширение типов StorageStore

### Файл: `src/stores/storage/types.ts`

#### 1.1 Обновить BatchStatus

```typescript
// БЫЛО:
export type BatchStatus = 'active' | 'expired' | 'consumed'

// СТАНЕТ:
export type BatchStatus =
  | 'active' // Товар на складе, доступен для использования
  | 'expired' // Просрочен
  | 'consumed' // Полностью использован
  | 'in_transit' // ← НОВЫЙ: Товар заказан, но еще не получен
```

#### 1.2 Расширить StorageBatch

```typescript
export interface StorageBatch extends BaseEntity {
  // ... существующие поля без изменений

  // ✅ НОВЫЕ ПОЛЯ для интеграции с заказами поставщикам
  purchaseOrderId?: string // Связь с PurchaseOrder
  supplierId?: string // ID поставщика
  supplierName?: string // Название поставщика (кеш)
  plannedDeliveryDate?: string // Ожидаемая дата поставки
  actualDeliveryDate?: string // Фактическая дата получения
}
```

#### 1.3 Новые DTO

```typescript
// DTO для создания транзитного batch из заказа
export interface CreateTransitBatchData {
  itemId: string
  itemName: string
  quantity: number
  unit: string
  estimatedCostPerUnit: number
  department: StorageDepartment
  purchaseOrderId: string
  supplierId: string
  supplierName: string
  plannedDeliveryDate: string
  notes?: string
}

// Расширение балансов для учета транзита
export interface StorageBalance {
  // ... существующие поля
  transitQuantity: number // Количество в пути
  transitValue: number // Стоимость товара в пути
  totalWithTransit: number // Общее количество (склад + транзит)
  nearestDelivery?: string // Ближайшая ожидаемая поставка
}
```

## 2. Расширение StorageStore методами

### Файл: `src/stores/storage/storageStore.ts`

#### 2.1 Новые computed свойства

```typescript
// Только активные (не транзитные) batch-и
const activeBatches = computed(() => {
  return state.value.batches.filter(batch => batch.status === 'active' && batch.isActive === true)
})

// Только транзитные batch-и
const transitBatches = computed(() => {
  return state.value.batches.filter(batch => batch.status === 'in_transit')
})

// Балансы с учетом транзита
const balancesWithTransit = computed(() => {
  // Добавляем к каждому балансу информацию о транзитных товарах
  return state.value.balances.map(balance => {
    const transitItems = transitBatches.value.filter(
      batch => batch.itemId === balance.itemId && batch.department === balance.department
    )

    return {
      ...balance,
      transitQuantity: transitItems.reduce((sum, batch) => sum + batch.currentQuantity, 0),
      transitValue: transitItems.reduce((sum, batch) => sum + batch.totalValue, 0),
      totalWithTransit:
        balance.totalQuantity + transitItems.reduce((sum, batch) => sum + batch.currentQuantity, 0),
      nearestDelivery: transitItems
        .map(b => b.plannedDeliveryDate)
        .filter(date => date)
        .sort()[0]
    }
  })
})
```

#### 2.2 Новые методы

```typescript
/**
 * Создает транзитные batch-и при отправке заказа поставщику
 */
async function createTransitBatches(orderData: CreateTransitBatchData[]): Promise<string[]> {
  // Создание batch-ей со статусом 'in_transit'
  // Подробная реализация в разделе 12
}

/**
 * Переводит транзитные batch-и в активные при получении товара
 */
async function convertTransitBatchesToActive(
  purchaseOrderId: string,
  receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
): Promise<void> {
  // Обновление статуса с 'in_transit' на 'active'
  // Корректировка количества и цены
  // Подробная реализация в разделе 12
}

/**
 * Получение транзитных batch-ей по заказу
 */
function getTransitBatchesByOrder(purchaseOrderId: string): StorageBatch[] {
  return state.value.batches.filter(
    batch => batch.purchaseOrderId === purchaseOrderId && batch.status === 'in_transit'
  )
}
```

## 3. Упрощение PlannedDeliveryIntegration

### Файл: `src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts`

```typescript
/**
 * Создает транзитные batch-и при отправке заказа
 */
async createTransitBatchesFromOrder(order: PurchaseOrder): Promise<string[]> {
  const storageStore = await this.getStorageStore()
  const department = this.getDepartmentFromOrder(order)

  const transitBatchData: CreateTransitBatchData[] = order.items.map(item => ({
    itemId: item.itemId,
    itemName: item.itemName,
    quantity: item.orderedQuantity,
    unit: item.unit,
    estimatedCostPerUnit: item.pricePerUnit,
    department,
    purchaseOrderId: order.id,
    supplierId: order.supplierId,
    supplierName: order.supplierName,
    plannedDeliveryDate: order.expectedDeliveryDate || this.calculateDefaultDeliveryDate(order),
    notes: `Transit from order ${order.orderNumber}`
  }))

  return await storageStore.createTransitBatches(transitBatchData)
}

/**
 * Конвертирует транзитные batch-и в активные при получении
 */
async convertTransitBatchesOnReceipt(
  purchaseOrderId: string,
  receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
): Promise<void> {
  const storageStore = await this.getStorageStore()
  await storageStore.convertTransitBatchesToActive(purchaseOrderId, receiptItems)
}
```

## 4. Интеграция с PurchaseOrders

### Файл: `src/stores/supplier_2/composables/usePurchaseOrders.ts`

```typescript
/**
 * Отправка заказа поставщику с созданием транзитных batch-ей
 */
async function sendOrder(id: string): Promise<PurchaseOrder> {
  const sentOrder = await updateOrder(id, {
    status: 'sent',
    sentDate: new Date().toISOString()
  })

  // Создаем транзитные batch-и
  try {
    const batchIds = await plannedDeliveryIntegration.createTransitBatchesFromOrder(sentOrder)
    console.log(`PurchaseOrders: Transit batches created: ${batchIds.length}`)
  } catch (error) {
    console.warn('PurchaseOrders: Failed to create transit batches:', error)
  }

  return sentOrder
}
```

## 5. Интеграция с Receipts

### Файл: `src/stores/supplier_2/composables/useReceipts.ts`

```typescript
/**
 * Завершение приемки с конвертацией транзитных batch-ей
 */
async function completeReceipt(receiptId: string): Promise<Receipt> {
  const receipt = receipts.value.find(r => r.id === receiptId)
  const order = supplierStore.state.orders.find(o => o.id === receipt.purchaseOrderId)

  const completedReceipt = await updateReceipt(receiptId, {
    status: 'completed',
    completedDate: new Date().toISOString()
  })

  // Конвертируем транзитные batch-и в активные
  try {
    const receiptItems = completedReceipt.items.map(item => ({
      itemId: item.itemId,
      receivedQuantity: item.receivedQuantity,
      actualPrice: item.actualPrice
    }))

    await plannedDeliveryIntegration.convertTransitBatchesOnReceipt(order.id, receiptItems)
    console.log('Receipts: Transit batches converted to active')
  } catch (error) {
    console.warn('Receipts: Failed to convert transit batches:', error)
  }

  await supplierStore.updateOrder(order.id, { status: 'delivered' })
  return completedReceipt
}
```

## 6. Обновление рекомендаций

### Файл: `src/stores/supplier_2/integrations/storageIntegration.ts`

```typescript
/**
 * Генерация рекомендаций с учетом транзитных товаров
 */
async getSuggestionsFromStock(department?: StorageDepartment): Promise<OrderSuggestion[]> {
  const storageStore = await this.getStorageStore()
  const balancesWithTransit = storageStore.balancesWithTransit

  const suggestions: OrderSuggestion[] = []

  for (const balance of balancesWithTransit) {
    const product = productsStore.products.find(p => p.id === balance.itemId)
    if (!product?.isActive) continue

    const minStock = product.minStock || 0
    const effectiveStock = balance.totalWithTransit

    if (effectiveStock <= minStock) {
      suggestions.push({
        itemId: balance.itemId,
        itemName: balance.itemName,
        currentStock: balance.totalQuantity,
        transitStock: balance.transitQuantity,
        effectiveStock,
        minStock,
        suggestedQuantity: Math.max(minStock * 2 - effectiveStock, minStock),
        urgency: effectiveStock <= 0 ? 'high' :
                effectiveStock <= minStock * 0.5 ? 'medium' : 'low',
        reason: effectiveStock <= 0 ? 'out_of_stock' : 'below_minimum',
        estimatedPrice: balance.latestCost,
        nearestDelivery: balance.nearestDelivery
      })
    }
  }

  return suggestions
}
```

### Обновление OrderSuggestion типа:

```typescript
export interface OrderSuggestion {
  itemId: string
  itemName: string
  currentStock: number
  transitStock?: number // НОВОЕ: Количество в пути
  effectiveStock?: number // НОВОЕ: Общий доступный (склад + транзит)
  minStock: number
  suggestedQuantity: number
  urgency: 'low' | 'medium' | 'high'
  reason: 'below_minimum' | 'out_of_stock'
  estimatedPrice: number
  nearestDelivery?: string // НОВОЕ: Ожидаемая дата поставки
}
```

## 7. UI компоненты - Расширение существующих

### 7.1 Обновление OrderSuggestionsTable

```vue
<!-- Добавляем колонки для отображения транзитного товара -->
<v-data-table :headers="updatedHeaders">
  <template #item.currentStock="{ item }">
    {{ item.currentStock }}
    <v-chip v-if="item.transitStock > 0" x-small color="orange" class="ml-1">
      +{{ item.transitStock }} в пути
    </v-chip>
  </template>

  <template #item.effectiveStock="{ item }">
    <span :class="getStockColor(item.effectiveStock, item.minStock)">
      {{ item.effectiveStock }}
    </span>
  </template>

  <template #item.nearestDelivery="{ item }">
    <span v-if="item.nearestDelivery" class="text-caption">
      {{ formatDate(item.nearestDelivery) }}
    </span>
    <span v-else class="text-grey">—</span>
  </template>
</v-data-table>
```

### 7.2 Расширение Raw Product Plan таблицы

```vue
<!-- В существующей таблице Raw Product Plan добавить колонки: -->
<!-- Planned Delivery | Status | Supplier -->

<template #item.plannedDelivery="{ item }">
  <div v-if="item.transitQuantity > 0">
    {{ formatDate(item.nearestDelivery) }}
  </div>
  <span v-else class="text-grey">—</span>
</template>

<template #item.transitStatus="{ item }">
  <v-chip v-if="item.transitQuantity > 0" small color="orange">
    {{ item.transitQuantity }} {{ item.unit }} в пути
  </v-chip>
</template>
```

### 7.3 Расширение DetailProductViewDialog

```vue
<!-- В существующий диалог добавить секцию с транзитными batch-ами -->
<v-expansion-panels v-if="transitBatches.length > 0" class="mb-4">
  <v-expansion-panel>
    <v-expansion-panel-header>
      <div class="d-flex align-center">
        <v-icon color="orange" class="mr-2">mdi-truck-delivery</v-icon>
        <span class="subtitle-1">В пути ({{ transitBatches.length }} поставок)</span>
        <v-spacer />
        <span class="text-h6 orange--text">
          {{ totalTransitQuantity }} {{ product.unit }}
        </span>
      </div>
    </v-expansion-panel-header>

    <v-expansion-panel-content>
      <v-data-table
        :headers="transitBatchHeaders"
        :items="transitBatches"
        hide-default-footer
        disable-pagination
      >
        <template #item.plannedDeliveryDate="{ item }">
          <span :class="isOverdue(item.plannedDeliveryDate) ? 'error--text' : ''">
            {{ formatDate(item.plannedDeliveryDate) }}
          </span>
        </template>

        <template #item.status="{ item }">
          <v-chip
            small
            :color="isOverdue(item.plannedDeliveryDate) ? 'error' : 'orange'"
          >
            {{ isOverdue(item.plannedDeliveryDate) ? 'Просрочена' : 'В пути' }}
          </v-chip>
        </template>
      </v-data-table>
    </v-expansion-panel-content>
  </v-expansion-panel>
</v-expansion-panels>
```

## 8. Mock данные для тестирования

### Файл: `src/stores/storage/storageMock.ts`

```typescript
// Примеры транзитных batch-ей для тестирования
export const mockTransitBatches: StorageBatch[] = [
  {
    id: 'transit-batch-1',
    batchNumber: 'TRN-250831-001',
    itemId: 'prod-tomato',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 10,
    currentQuantity: 10,
    unit: 'kg',
    costPerUnit: 25000,
    totalValue: 250000,
    receiptDate: '2025-09-05T10:00:00Z',
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,

    // Новые поля для транзита
    purchaseOrderId: 'po-001',
    supplierId: 'supplier-fresh-veg',
    supplierName: 'Fresh Vegetables Ltd',
    plannedDeliveryDate: '2025-09-05T10:00:00Z',
    notes: 'Transit from order ORD-20250831-001',

    createdAt: '2025-08-31T08:00:00Z',
    updatedAt: '2025-08-31T08:00:00Z'
  },
  {
    id: 'transit-batch-2',
    batchNumber: 'TRN-250831-002',
    itemId: 'prod-onion',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 5,
    currentQuantity: 5,
    unit: 'kg',
    costPerUnit: 15000,
    totalValue: 75000,
    receiptDate: '2025-09-03T14:00:00Z',
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,

    purchaseOrderId: 'po-002',
    supplierId: 'supplier-fresh-veg',
    supplierName: 'Fresh Vegetables Ltd',
    plannedDeliveryDate: '2025-09-03T14:00:00Z', // Просроченная поставка
    notes: 'Transit from order ORD-20250829-003',

    createdAt: '2025-08-29T10:00:00Z',
    updatedAt: '2025-08-29T10:00:00Z'
  }
]
```

## 9. Workflow и точки интеграции

### 9.1 Создание транзитных batch-ей

```
Пользователь нажимает "Отправить заказ"
    ↓
updateOrder(status: 'sent')
    ↓
createTransitBatchesFromOrder(order)
    ↓
StorageBatch со статусом 'in_transit' создаются
    ↓
Обновляются балансы с учетом транзита
    ↓
Рекомендации пересчитываются
```

### 9.2 Получение товара

```
Пользователь завершает приемку
    ↓
completeReceipt()
    ↓
convertTransitBatchesToActive()
    ↓
Статус batch-ей меняется на 'active'
    ↓
Балансы пересчитываются
```

### 9.3 Отмена заказа

```
Пользователь отменяет заказ
    ↓
updateOrder(status: 'cancelled')
    ↓
Транзитные batch-и удаляются полностью
    ↓
Балансы пересчитываются
```

### 9.4 Обработка расхождений

```
При расхождении в приемке:
- Заказано 10кг, получено 8кг
- Конвертируется только 8кг в active batch
- Остальные 2кг удаляются из транзита
- Создается новый заказ на недостающие 2кг (если нужно)
```

## 10. Критерии готовности

### Функциональные требования:

- [ ] При отправке заказа создаются транзитные batch-и
- [ ] Балансы показывают "на складе" + "в пути" = "всего доступно"
- [ ] Рекомендации учитывают эффективный запас
- [ ] При получении товара транзитные batch-и конвертируются в активные
- [ ] При отмене заказа транзитные batch-и удаляются
- [ ] Обработка расхождений в поставках работает

### UI требования:

- [ ] В рекомендациях видно количество "в пути"
- [ ] Raw Product Plan показывает ожидаемые поставки
- [ ] DetailProductViewDialog показывает транзитные batch-и
- [ ] Просроченные поставки выделяются визуально

### Технические требования:

- [ ] Нет ошибок в консоли
- [ ] Производительность не ухудшилась
- [ ] Все методы имеют error handling
- [ ] TypeScript типы покрывают новую функциональность
- [ ] Mock данные обновлены

## 12. Детальная реализация ключевых методов

### 12.1 createTransitBatches в StorageStore

```typescript
async function createTransitBatches(orderData: CreateTransitBatchData[]): Promise<string[]> {
  try {
    state.value.loading.plannedDeliveries = true // Добавить в StorageState
    const batchIds: string[] = []

    // Защита от дубликатов - проверяем, не созданы ли уже batch-и для этого заказа
    const existingBatches = state.value.batches.filter(
      batch =>
        batch.purchaseOrderId === orderData[0]?.purchaseOrderId && batch.status === 'in_transit'
    )

    if (existingBatches.length > 0) {
      DebugUtils.warn(MODULE_NAME, 'Transit batches already exist for order', {
        purchaseOrderId: orderData[0]?.purchaseOrderId,
        existingCount: existingBatches.length
      })
      return existingBatches.map(b => b.id)
    }

    for (const item of orderData) {
      // Генерация уникального ID и номера
      const batchId = `transit-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const batchNumber = generateTransitBatchNumber()

      const batch: StorageBatch = {
        id: batchId,
        batchNumber,
        itemId: item.itemId,
        itemType: 'product',
        department: item.department,
        initialQuantity: item.quantity,
        currentQuantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.estimatedCostPerUnit,
        totalValue: item.quantity * item.estimatedCostPerUnit,
        receiptDate: item.plannedDeliveryDate,
        sourceType: 'purchase',
        status: 'in_transit',
        isActive: false, // Важно: не активен до получения

        // Новые поля для связи с заказами
        purchaseOrderId: item.purchaseOrderId,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        plannedDeliveryDate: item.plannedDeliveryDate,
        notes: item.notes || `Transit batch from order`,

        // BaseEntity поля
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Добавляем в начало массива (новые batch-и сверху)
      state.value.batches.unshift(batch)
      batchIds.push(batchId)

      DebugUtils.info(MODULE_NAME, 'Transit batch created', {
        batchId,
        itemId: item.itemId,
        quantity: item.quantity,
        supplier: item.supplierName
      })
    }

    // Пересчитываем балансы
    await recalculateAllBalances()

    return batchIds
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create transit batches'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error, orderData })
    throw error
  } finally {
    state.value.loading.plannedDeliveries = false
  }
}

// Helper функция для генерации номеров транзитных batch-ей
function generateTransitBatchNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
  const timeStr =
    date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0')
  const sequence = state.value.batches.filter(b => b.status === 'in_transit').length + 1

  return `TRN-${dateStr}-${timeStr}-${sequence.toString().padStart(3, '0')}`
}
```

### 12.2 convertTransitBatchesToActive в StorageStore

```typescript
async function convertTransitBatchesToActive(
  purchaseOrderId: string,
  receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
): Promise<void> {
  try {
    // Находим все транзитные batch-и для данного заказа
    const transitBatches = state.value.batches.filter(
      batch => batch.purchaseOrderId === purchaseOrderId && batch.status === 'in_transit'
    )

    if (transitBatches.length === 0) {
      DebugUtils.warn(MODULE_NAME, 'No transit batches found for order', { purchaseOrderId })
      return
    }

    for (const receiptItem of receiptItems) {
      // Находим соответствующий транзитный batch
      const transitBatch = transitBatches.find(batch => batch.itemId === receiptItem.itemId)

      if (!transitBatch) {
        DebugUtils.warn(MODULE_NAME, 'No transit batch found for received item', {
          itemId: receiptItem.itemId,
          purchaseOrderId
        })
        continue
      }

      const originalQuantity = transitBatch.initialQuantity
      const receivedQuantity = receiptItem.receivedQuantity
      const actualPrice = receiptItem.actualPrice || transitBatch.costPerUnit

      // Обновляем batch для перехода в active статус
      transitBatch.status = 'active'
      transitBatch.isActive = true
      transitBatch.currentQuantity = receivedQuantity
      transitBatch.initialQuantity = receivedQuantity
      transitBatch.actualDeliveryDate = new Date().toISOString()
      transitBatch.updatedAt = new Date().toISOString()

      // Обновляем цену и стоимость, если отличается
      if (actualPrice !== transitBatch.costPerUnit) {
        const oldPrice = transitBatch.costPerUnit
        transitBatch.costPerUnit = actualPrice
        transitBatch.totalValue = receivedQuantity * actualPrice
        transitBatch.notes += ` | Price updated: ${oldPrice} → ${actualPrice}`
      } else {
        transitBatch.totalValue = receivedQuantity * actualPrice
      }

      // Логируем расхождения
      if (receivedQuantity !== originalQuantity) {
        if (receivedQuantity < originalQuantity) {
          transitBatch.notes += ` | Partial delivery: ${receivedQuantity}/${originalQuantity}`
        } else {
          transitBatch.notes += ` | Excess delivery: ${receivedQuantity}/${originalQuantity}`
        }
      }

      DebugUtils.info(MODULE_NAME, 'Transit batch converted to active', {
        batchId: transitBatch.id,
        itemId: receiptItem.itemId,
        originalQuantity,
        receivedQuantity,
        actualPrice
      })
    }

    // Пересчитываем балансы
    await recalculateAllBalances()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to convert transit batches', { error, purchaseOrderId })
    throw error
  }
}
```

### 12.3 Мониторинг просроченных поставок

```typescript
// Computed для аналитики транзита
const transitMetrics = computed(() => {
  const transitBatches = state.value.batches.filter(b => b.status === 'in_transit')
  const now = new Date()

  return {
    totalTransitOrders: new Set(transitBatches.map(b => b.purchaseOrderId)).size,
    totalTransitItems: transitBatches.length,
    totalTransitValue: transitBatches.reduce((sum, b) => sum + b.totalValue, 0),

    overdueCount: transitBatches.filter(
      b => b.plannedDeliveryDate && new Date(b.plannedDeliveryDate) < now
    ).length,

    dueTodayCount: transitBatches.filter(b => {
      if (!b.plannedDeliveryDate) return false
      const deliveryDate = new Date(b.plannedDeliveryDate)
      const today = new Date()
      return deliveryDate.toDateString() === today.toDateString()
    }).length
  }
})

// Computed для уведомлений о просрочках
const deliveryAlerts = computed(() => {
  const alerts = []
  const now = new Date()
  const transitBatches = state.value.batches.filter(b => b.status === 'in_transit')

  for (const batch of transitBatches) {
    if (!batch.plannedDeliveryDate) continue

    const deliveryDate = new Date(batch.plannedDeliveryDate)
    const diffHours = (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60)

    if (diffHours > 24) {
      // Просрочена больше суток
      alerts.push({
        type: 'overdue',
        severity: diffHours > 72 ? 'critical' : 'warning',
        message: `Поставка ${batch.supplierName} просрочена на ${Math.floor(diffHours / 24)} дней`,
        batchId: batch.id,
        orderId: batch.purchaseOrderId,
        itemName: batch.itemName || 'Неизвестный товар',
        daysOverdue: Math.floor(diffHours / 24)
      })
    } else if (diffHours > -24 && diffHours <= 0) {
      // Доставка сегодня
      alerts.push({
        type: 'due_today',
        severity: 'info',
        message: `Ожидается поставка от ${batch.supplierName}`,
        batchId: batch.id,
        orderId: batch.purchaseOrderId,
        itemName: batch.itemName || 'Неизвестный товар'
      })
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 3, warning: 2, info: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
})
```

### Этап 1: Типы и Mock данные (1 день)

- [ ] Обновить типы в `storage/types.ts`
- [ ] Создать mock транзитные batch-и
- [ ] Настроить MockDataCoordinator

### Этап 2: Store логика (2 дня)

- [ ] Добавить методы в `storageStore.ts`
- [ ] Обновить `PlannedDeliveryIntegration`
- [ ] Тестирование store методов на dev окружении

### Этап 2.5: UI тестирование в Storage (1 день)

- [ ] Расширить Raw Product Plan таблицу
- [ ] Обновить DetailProductViewDialog
- [ ] Визуальное тестирование отображения mock транзитных batch-ей
- [ ] Проверка UX и корректировка интерфейса

### Этап 3: Интеграция с заказами (2 дня)

- [ ] Обновить `sendOrder()` и `completeReceipt()`
- [ ] Обновить логику рекомендаций
- [ ] Тестирование полного workflow

### Этап 4: Финальная доработка UI (1 день)

- [ ] Доработка интерфейса на основе тестирования
- [ ] Добавление индикаторов просроченных поставок
- [ ] Финальное тестирование UX

### Этап 5: Документация и деплой (1 день)

- [ ] Code review
- [ ] Документация изменений
- [ ] Deployment

---

## 🎯 Ключевые изменения по сравнению с первоначальным ТЗ

1. **Не добавляем новый BatchSourceType** - используем существующий 'purchase'
2. **Не создаем отдельную таблицу TransitOrdersTable** - расширяем Raw Product Plan
3. **Расширяем DetailProductViewDialog** вместо создания нового компонента
4. **Не делаем обратную совместимость** - переписываем логику полностью
5. **Сначала типы и mock данные** - потом логика
6. **При расхождениях** - отменяем и пересоздаем заказ
7. **При отмене заказа** - удаляем транзитные batch-и полностью
