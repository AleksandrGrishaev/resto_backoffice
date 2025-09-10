Давайте обновим наш план рефакторинга с учетом проделанной работы:

# Проделанная работа:

- [x] Создали структуру нового BillStore
- [x] Реорганизовали типы по их использованию в сторах
- [x] Добавили BillStore в Debug Store View
- [x] Структурировали код с использованием #regions

# План рефакторинга:

1. Структура типов ✓

```tsx
typescript
Copy
- [x] Обновлены bill.ts - типы для работы со счетами
- [x] Обновлены order.ts - типы для работы с заказами
- [x] Обновлены table.ts - типы для работы со столами

```

1. BillStore ⏳

```tsx
typescript
Copy
- [x] Базовая структура стора
- [x] State management (activeBill, selection, history)
- [x] Computed properties для расчетов
- [x] Selection methods
- [ ] Методы работы с позициями (перенос из OrderStore)
- [ ] Методы работы с историей изменений

```

1. OrderStore Refactoring 🔄

```tsx
typescript
Copy
- [ ] Реорганизация хранения данных (Map для заказов)
- [ ] Удаление дублирующей функциональности
- [ ] Обновление методов работы с заказами
- [ ] Обновление методов перемещения

```

1. Обновление UI компонентов 📋

```tsx
typescript
Copy
- [ ] BillsManager.vue
- [ ] OrderSection.vue
- [ ] OrderActions.vue
- [ ] MoveBillsDialog.vue
- [ ] MoveItemsDialog.vue
- [ ] MoveOrderDialog.vue

```

1. Тестирование 🧪

```tsx
typescript
Copy
- [ ] Проверка всех сценариев перемещения
- [ ] Проверка расчета итогов
- [ ] Проверка выделения
- [ ] Проверка сохранения

```

Следующие шаги:

1. Реализовать методы работы с позициями в BillStore
2. Начать обновление OrderStore
3. Постепенно обновлять компоненты

Хотите, чтобы я показал реализацию какого-то конкретного шага?

graph TD
A[TableStore] -- "Управление столами" --> B[OrderStore]
B -- "Активный заказ" --> C[BillStore]

```
subgraph TableStore
    T1[Tables] -- "связь" --> T2[TableStatus]
    T2 -- "currentOrderId" --> B
end

subgraph OrderStore ["OrderStore (Single Source of Truth)"]
    O1[Orders Map] -- "содержит" --> O2[Order Data]
    O2 -- "содержит" --> O3[Bills Array]
    O4[Active Order ID] -- "указывает на" --> O2
end

subgraph BillStore
    B1[Active Bill] -- "ссылка на" --> O3
    B2[Selection State]
    B3[Unsaved Changes]
end

subgraph Components
    C1[BillsManager] -- "использует" --> B
    C2[OrderSection] -- "использует" --> B
    C3[TablesSidebar] -- "использует" --> A
end

```

# План рефакторинга архитектуры POS системы

## 1. Создание BillStore

### 1.1 Новый стор (bill.store.ts)

```tsx
export const useBillStore = defineStore('bill', () => {
  // State
  const activeBill = ref<Bill | null>(null)
  const selection = ref<SelectableState>({
    selectedItems: new Set<string>(),
    selectedBills: new Set<string>(),
    selectionMode: 'none' as SelectionMode
  })
  const hasUnsavedChanges = ref(false)

  // Геттеры для расчетов
  const billSubtotal = computed(() => {...})
  const billTaxes = computed(() => {...})
  const billTotal = computed(() => {...})

  // Методы выделения
  const toggleItemSelection = (itemId: string) => {...}
  const toggleBillSelection = (billId: string) => {...}
  const clearSelection = () => {...}
  const hasSelection = computed(() => {...})

  // Методы работы с активным счетом
  const setActiveBill = (bill: Bill) => {...}
  const updateActiveBill = (data: Partial<Bill>) => {...}
  const validateChanges = (): ValidationResult => {...}

  return {...}
})

```

### 1.2 Переносимые методы из OrderStore

- Все методы работы с selection
- Методы расчета итогов (subtotal, taxes, total)
- Валидация изменений активного счета
- История изменений активного счета

## 2. Обновление OrderStore

### 2.1 Новая структура данных

```tsx
export const useOrderStore = defineStore('order', () => {
  // State
  const orders = ref<Map<string, Order>>(new Map())
  const activeOrderId = ref<string | null>(null)
  const ordersData = ref<Map<string, TableOrderData>>(new Map())

  // Основные методы работы с заказами
  const createOrder = (type: OrderType, tableId: string): string => {...}
  const updateOrder = (orderId: string, data: Partial<Order>): void => {...}
  const deleteOrder = (orderId: string): void => {...}

  // Методы работы со счетами
  const addBill = (orderId: string): string => {...}
  const updateBill = (orderId: string, billId: string, data: Partial<Bill>) => {...}
  const moveBill = (billId: string, targetOrderId: string) => {...}
  const mergeBills = (orderId: string) => {...}

  // Методы перемещения
  const moveOrderToTable = (orderId: string, tableId: string) => {...}
  const changeOrderType = (orderId: string, type: OrderType) => {...}
  const moveBillToTable = (billId: string, tableId: string) => {...}

  return {...}
})

```

### 2.2 Удаляемые методы

- Все методы работы с selection
- Методы работы с активным счетом
- Методы расчета итогов

## 3. Обновление компонентов UI

### 3.1 BillsManager.vue

```tsx
// Было
const orderStore = useOrderStore()
const { selection, toggleItemSelection } = orderStore

// Стало
const orderStore = useOrderStore()
const billStore = useBillStore()
const { selection, toggleItemSelection } = billStore
```

### 3.2 OrderSection.vue

```tsx
// Было
const { bills, activeBill, orderTotal } = useOrderStore()

// Стало
const orderStore = useOrderStore()
const billStore = useBillStore()
const { activeBill, billTotal } = billStore
const bills = computed(() => orderStore.getOrderBills(orderStore.activeOrderId))
```

### 3.3 MoveBillsDialog.vue

```tsx
// Было
const handleMove = async ({ type, tableId }: { type: DeliveryType; tableId?: string }) => {
  await orderStore.moveBill(...)
}

// Стало
const handleMove = async ({ type, tableId }: { type: DeliveryType; tableId?: string }) => {
  await orderStore.moveBillToTable(billStore.activeBill.id, tableId)
}

```

### 3.4 MoveItemsDialog.vue

```tsx
// Было
const handleMoveItems = async ({ targetBillId }: { targetBillId: string }) => {
  for (const itemId of orderStore.selection.selectedItems) {
    await orderStore.moveItem(itemId, activeBill.value.id, targetBillId)
  }
}

// Стало
const handleMoveItems = async ({ targetBillId }: { targetBillId: string }) => {
  for (const itemId of billStore.selection.selectedItems) {
    await orderStore.moveItem(billStore.activeBill.id, targetBillId, itemId)
  }
}
```

## 4. Последовательность рефакторинга

1. Создание BillStore
   - Реализация базовой структуры
   - Перенос методов selection
   - Перенос методов расчета
   - Тестирование базового функционала
2. Обновление OrderStore
   - Создание новой структуры данных
   - Обновление методов работы с заказами
   - Реализация новых методов перемещения
   - Тестирование взаимодействия с BillStore
3. Обновление UI компонентов
   - BillsManager.vue
   - OrderSection.vue
   - OrderActions.vue
   - MoveBillsDialog.vue
   - MoveItemsDialog.vue
   - MoveOrderDialog.vue
4. Тестирование
   - Проверка всех сценариев перемещения
   - Проверка расчета итогов
   - Проверка выделения
   - Проверка сохранения

## 5. Критерии готовности

1. Все методы работы с selection перенесены в BillStore
2. OrderStore содержит только методы работы с заказами
3. UI компоненты используют корректные сторы
4. Все тесты проходят успешно
5. Нет регрессий в функциональности
6. Документация обновлена

## 6. Риски и зависимости

1. Возможные проблемы:
   - Рассинхронизация данных между сторами
   - Проблемы с производительностью при больших списках
   - Сложности с отменой операций
2. Митигация:
   - Тщательное тестирование
   - Постепенное внедрение изменений
   - Резервное копирование данных
   - Логирование операций

## 7. Дополнительные улучшения

1. Добавить систему отмены действий (undo/redo)
2. Улучшить валидацию операций
3. Добавить оптимистичные обновления
4. Реализовать кэширование расчетов
