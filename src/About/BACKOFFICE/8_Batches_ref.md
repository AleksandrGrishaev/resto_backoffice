# Transit Batch Refactoring - План действий

## 🎯 Цель рефакторинга

**Сделать систему transit batches:**

- Понятной и легко отлаживаемой
- С четким разделением ответственности
- С централизованной логикой
- Без размазанного кода по интеграциям

---

## 📋 План в 2 этапа

### **Этап 1: Storage Core (Mock + Store + View)**

✅ Позволит увидеть работу без завязки на supplier
✅ Можно тестировать изолированно

### **Этап 2: Supplier Integration (Orders + Receipts)**

✅ Интеграция с заказами поставщикам
✅ Создание и конвертация batches

---

## 📂 Анализ текущих файлов

### 🔴 ФАЙЛЫ НА УДАЛЕНИЕ

#### 1. `src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts`

**Причина удаления:**

- Был создан для старой концепции PlannedDelivery
- Дублирует логику с storageIntegration
- Создает лишний слой абстракции

**Что делает сейчас:**

```typescript
createTransitBatchesFromOrder() // → переносим в TransitBatchService
convertTransitBatchesOnReceipt() // → переносим в TransitBatchService
removeTransitBatchesOnOrderCancel() // → переносим в TransitBatchService
```

**Куда переносим функционал:**
→ `src/stores/storage/transitBatchService.ts` (новый файл)

---

### 🟡 ФАЙЛЫ НА РЕФАКТОРИНГ

#### 2. `src/stores/supplier_2/integrations/storageIntegration.ts`

**Текущие проблемы:**

- Смешаны разные ответственности
- Нет четких секций
- Импорты storageStore и создание batches в одном месте

**Текущая структура:**

```typescript
class SupplierStorageIntegration {
  createReceiptOperation() // ✅ Оставляем - создание операции
  updateProductPrices() // ✅ Оставляем - обновление цен
  // НО: не должен создавать transit batches!
}
```

**Новая структура:**

```typescript
class SupplierStorageIntegration {
  // ===========================
  // STORAGE OPERATIONS
  // ===========================
  createReceiptOperation(receipt, order)

  // ===========================
  // PRODUCT PRICES
  // ===========================
  updateProductPrices(receipt)

  // УДАЛИТЬ: создание batches - это responsibility TransitBatchService
}
```

**Что убираем:**

- Любые вызовы создания transit batches
- Ссылки на plannedDeliveryIntegration

---

#### 3. `src/stores/storage/storageStore.ts`

**Текущие проблемы:**

- Смешаны active и transit batches в одном массиве
- Методы создания/конвертации batches прямо в store
- Нет разделения ответственности

**Что меняем:**

**БЫЛО:**

```typescript
const state = ref({
  batches: [], // все вместе
  operations: [],
  balances: []
})

// Методы прямо в store
createTransitBatches()
convertTransitBatchesToActive()
removeTransitBatchesOnOrderCancel()
```

**СТАНЕТ:**

```typescript
const state = ref({
  activeBatches: [],      // ✅ Только active
  transitBatches: [],     // ✅ Только transit
  operations: [],
  balances: []
})

// Методы делегируют в сервис
async function createTransitBatches(data) {
  const batches = await transitBatchService.createFromOrder(...)
  state.value.transitBatches.push(...batches)
  return batches
}
```

---

#### 4. `src/stores/storage/storageService.ts`

**Что меняем:**

- Разделение загрузки batches по типам
- Методы работы с runtime данными для transit batches

**БЫЛО:**

```typescript
this.batches = []  // все вместе

loadDataFromCoordinator() {
  this.batches = [...baseBatches, ...runtimeBatches]
}
```

**СТАНЕТ:**

```typescript
this.activeBatches = []
this.transitBatches = []

loadDataFromCoordinator() {
  this.activeBatches = baseBatches.filter(b => b.status === 'active')
  this.transitBatches = [...transitTestBatches, ...runtimeTransitBatches]
}
```

---

#### 5. `src/stores/shared/storageDefinitions.ts`

**Что меняем:**

- Функция `generateTransitTestBatches()` остается
- Но возвращаемые данные изменятся (новый формат ID)

**БЫЛО:**

```typescript
id: 'transit-batch-test-1',
batchNumber: 'TRN-250831-001',
```

**СТАНЕТ:**

```typescript
id: 'transit-TEST-PO-001-prod-tomato-0',
batchNumber: 'TRN-20250831-TESTPO-00',
```

---

### ✅ НОВЫЕ ФАЙЛЫ

#### 6. `src/stores/storage/transitBatchService.ts` (НОВЫЙ)

**Ответственность:**

- Вся бизнес-логика работы с transit batches
- Создание, конвертация, удаление
- Валидация и защита от дубликатов

**API:**

```typescript
class TransitBatchService {
  // Create
  createFromOrder(orderId, items): Promise<StorageBatch[]>

  // Convert
  convertToActive(orderId, receivedItems): Promise<StorageBatch[]>

  // Remove
  removeByOrder(orderId): void

  // Find
  findByOrder(orderId): StorageBatch[]
  findByItem(itemId, department): StorageBatch[]
  getAll(): StorageBatch[]

  // Validation
  hasExistingBatches(orderId): boolean
  validateConversion(orderId): ValidationResult

  // Status
  isOverdue(batch): boolean
  isDeliveryToday(batch): boolean
  getStatistics(): Stats
}
```

---

### 🔄 ФАЙЛЫ UI - ОБНОВЛЕНИЕ

#### 7. `src/views/storage/StorageView.vue`

**Минимальные изменения:**

- Использует `storageStore.transitBatches` вместо computed
- Все остальное работает так же

#### 8. `src/views/storage/components/StorageStockTable.vue`

**Изменения:**

```typescript
// БЫЛО
const transitBatches = computed(() =>
  storageStore.state.batches.filter(b => b.status === 'in_transit')
)

// СТАНЕТ
const transitBatches = computed(
  () => storageStore.transitBatches // прямой доступ
)
```

#### 9. `src/views/storage/components/ItemDetailsDialog.vue`

**Изменения:**

- Аналогично StorageStockTable
- Прямой доступ к `storageStore.transitBatches`

---

## 🎯 ЭТАП 1: Storage Core

### Шаг 1.1: Создать TransitBatchService

**Файл:** `src/stores/storage/transitBatchService.ts`

**Что делает:**

- Создание transit batches с правильными ID
- Валидация и защита от дубликатов
- Конвертация в active batches
- Поиск и фильтрация

**Не зависит от:**

- supplierStore
- Интеграций supplier_2

**Можно тестировать изолированно:** ✅

---

### Шаг 1.2: Обновить storageStore

**Файл:** `src/stores/storage/storageStore.ts`

**Изменения:**

1. Разделить state на `activeBatches` и `transitBatches`
2. Методы делегируют в `transitBatchService`
3. Computed properties для обратной совместимости

**Пример:**

```typescript
// Разделенный state
const state = ref({
  activeBatches: [],
  transitBatches: [],
  operations: [],
  balances: []
})

// Делегирование в сервис
async function createTransitBatches(orderData) {
  const batches = await transitBatchService.createFromOrder(...)
  state.value.transitBatches.push(...batches)
  return batches.map(b => b.id)
}

// Computed для UI
const allBatches = computed(() => [
  ...state.value.activeBatches,
  ...state.value.transitBatches
])
```

---

### Шаг 1.3: Обновить storageService

**Файл:** `src/stores/storage/storageService.ts`

**Изменения:**

1. Разделить внутренние массивы
2. Обновить методы загрузки данных
3. Runtime данные только для transit batches

```typescript
class StorageService {
  private activeBatches: StorageBatch[] = []
  private transitBatches: StorageBatch[] = []

  async initialize() {
    const data = mockDataCoordinator.getStorageStoreData()
    this.activeBatches = data.batches.filter(b => b.status === 'active')
    this.transitBatches = data.batches.filter(b => b.status === 'in_transit')
  }

  getActiveBatches() {
    return this.activeBatches
  }
  getTransitBatches() {
    return this.transitBatches
  }
}
```

---

### Шаг 1.4: Обновить Mock данные

**Файл:** `src/stores/shared/storageDefinitions.ts`

**Изменения:**

1. Новый формат ID для test batches
2. Новый формат batch numbers
3. Более понятные test данные

```typescript
function generateTransitTestBatches(): StorageBatch[] {
  return [
    {
      id: 'transit-TEST-PO-001-prod-tomato-0',
      batchNumber: 'TRN-20250831-TESTPO-00'
      // ... остальные поля
    }
  ]
}
```

---

### Шаг 1.5: Обновить UI компоненты

**Файлы:**

- `StorageView.vue`
- `StorageStockTable.vue`
- `ItemDetailsDialog.vue`

**Изменения:**

```typescript
// Убираем computed с фильтрацией
// БЫЛО
const transitBatches = computed(() =>
  props.storageStore.state.batches.filter(b => b.status === 'in_transit')
)

// СТАНЕТ
const transitBatches = computed(() => props.storageStore.transitBatches)
```

---

## 🔗 ЭТАП 2: Supplier Integration

### Шаг 2.1: Удалить plannedDeliveryIntegration

**Файл:** `src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts`

**Действие:** УДАЛИТЬ полностью

**Причина:** Весь функционал перенесен в TransitBatchService

---

### Шаг 2.2: Рефакторинг storageIntegration

**Файл:** `src/stores/supplier_2/integrations/storageIntegration.ts`

**Убираем:**

- Импорты plannedDeliveryIntegration
- Любые методы создания batches

**Оставляем:**

- createReceiptOperation()
- updateProductPrices()

**Добавляем:**

- Импорт transitBatchService для прямых вызовов

---

### Шаг 2.3: Обновить usePurchaseOrders

**Файл:** `src/stores/supplier_2/composables/usePurchaseOrders.ts`

**БЫЛО:**

```typescript
await plannedDeliveryIntegration.createTransitBatchesFromOrder(order)
```

**СТАНЕТ:**

```typescript
const storageStore = useStorageStore()
await storageStore.createTransitBatches(orderData)
```

---

### Шаг 2.4: Обновить useReceipts

**Файл:** `src/stores/supplier_2/composables/useReceipts.ts`

**БЫЛО:**

```typescript
await plannedDeliveryIntegration.convertTransitBatchesOnReceipt(...)
await storageIntegration.createReceiptOperation(...)
```

**СТАНЕТ:**

```typescript
const storageStore = useStorageStore()
const activeBatches = await storageStore.convertTransitBatchesToActive(...)
await storageIntegration.createReceiptOperation(...)
```

---

### Шаг 2.5: Обновить UI для заказов

**Файлы:**

- `BaseReceiptDialog.vue`
- `SupplierView.vue`

**Изменения:** минимальные, в основном импорты

---

## 📊 Чеклист изменений

### Этап 1: Storage Core

- [ ] Создать `transitBatchService.ts`
- [ ] Обновить `storageStore.ts` (разделить state)
- [ ] Обновить `storageService.ts` (разделить batches)
- [ ] Обновить `storageDefinitions.ts` (новые ID)
- [ ] Обновить `StorageStockTable.vue`
- [ ] Обновить `ItemDetailsDialog.vue`
- [ ] Обновить `StorageView.vue`
- [ ] Тестирование: отображение mock transit batches ✅

### Этап 2: Supplier Integration

- [ ] Удалить `plannedDeliveryIntegration.ts`
- [ ] Рефакторинг `storageIntegration.ts`
- [ ] Обновить `usePurchaseOrders.ts`
- [ ] Обновить `useReceipts.ts`
- [ ] Обновить `BaseReceiptDialog.vue`
- [ ] Обновить `SupplierView.vue`
- [ ] Тестирование: создание заказа → transit batch ✅
- [ ] Тестирование: приемка → active batch ✅

---

## ✅ РЕШЕНИЯ ПРИНЯТЫ

### 1. Формат ID для transit batches

**ВЫБРАН: Вариант A**

```
transit-{orderId}-{itemId}-{index}
Пример: transit-order-123-prod-tomato-0
```

✅ Четкая связь с заказом
✅ Легко дебажить
✅ Предотвращает дубликаты

---

### 2. Расположение TransitBatchService

**ВЫБРАН: Вариант A**

```
src/stores/storage/transitBatchService.ts
```

✅ Рядом с storageStore
✅ Логически связано со складом

---

### 3. Типы для Transit Batches

**ВЫБРАН: Вариант A**
Оставить общий тип `StorageBatch`
✅ Проще, один тип
✅ Меньше изменений
✅ Status field различает active/transit

---

## 🎯 ФИНАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

### Этап 1: Storage Core (Mock + Store + View)

**Последовательность:**

1. ✅ Создать `transitBatchService.ts` с полной бизнес-логикой
2. ✅ Обновить `storageStore.ts` - разделить state на activeBatches/transitBatches
3. ✅ Обновить `storageService.ts` - загрузка разделенных данных
4. ✅ Обновить `storageDefinitions.ts` - новый формат ID для mock
5. ✅ Обновить UI компоненты (StorageStockTable, ItemDetailsDialog)
6. ✅ Тестирование: проверить отображение transit batches

### Этап 2: Supplier Integration (Orders + Receipts)

**Последовательность:**

1. ✅ Удалить `plannedDeliveryIntegration.ts`
2. ✅ Рефакторинг `storageIntegration.ts`
3. ✅ Обновить `usePurchaseOrders.ts`
4. ✅ Обновить `useReceipts.ts`
5. ✅ Обновить UI компоненты заказов
6. ✅ Тестирование: полный цикл создание → приемка

---

## 🚀 НАЧИНАЕМ РЕАЛИЗАЦИЮ

**Готовы приступить к Этапу 1, Шаг 1.1:**
Создание `src/stores/storage/transitBatchService.ts`
