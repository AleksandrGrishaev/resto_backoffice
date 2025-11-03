# Sprint 1: Orders Store Audit Results

**Дата**: 2025-11-03
**Файл анализа**: `src/stores/pos/orders/ordersStore.ts` (885 строк)

## Методы: Классификация

### 🟢 ESSENTIAL - Оставить (активно используются)

| Метод                      | Использований | Файлы                                    | Примечание                         |
| -------------------------- | ------------- | ---------------------------------------- | ---------------------------------- |
| `selectOrder()`            | 3             | PosMainView, TablesSidebar, BillsManager | Критичный для навигации            |
| `createOrder()`            | 2             | TablesSidebar                            | Создание новых заказов             |
| `addBillToOrder()`         | 2             | PosMainView, OrderSection                | Добавление счетов                  |
| `recalculateOrderTotals()` | 3             | OrderSection                             | Расчет сумм (частое использование) |
| `isItemSelected()`         | 2             | OrderActions, BillsManager               | Selection UI                       |

**Итого: 5 методов (CORE)**

### 🟡 REFACTOR - Переделать/вынести

#### Selection Logic (5 методов → composable)

| Метод                   | Использований | Действие                        |
| ----------------------- | ------------- | ------------------------------- |
| `toggleItemSelection()` | 1             | Вынести в `useOrderSelection()` |
| `toggleBillSelection()` | 1             | Вынести в `useOrderSelection()` |
| `isItemSelected()`      | 2             | Вынести в `useOrderSelection()` |
| `isBillSelected()`      | 1             | Вынести в `useOrderSelection()` |
| `clearSelection()`      | 1             | Вынести в `useOrderSelection()` |

**State для переноса**:

```typescript
// Из ordersStore удалить:
const selectedItems = ref<Set<string>>(new Set())
const selectedBills = ref<Set<string>>(new Set())
```

#### Calculations (1 метод → composable)

| Метод                          | Использований | Действие                               |
| ------------------------------ | ------------- | -------------------------------------- |
| `recalculateOrderTotals()`     | 3             | Переместить в `useOrderCalculations()` |
| `calculateOrderStatus()`       | internal      | Переместить в `useOrderCalculations()` |
| `determineStatusByOrderType()` | internal      | Переместить в `useOrderCalculations()` |

#### Single-use methods (упростить)

| Метод                  | Использований | Действие                                        |
| ---------------------- | ------------- | ----------------------------------------------- |
| `selectBill()`         | 1             | Оставить, но упростить                          |
| `addItemToBill()`      | 1             | Оставить, критичный для POS                     |
| `updateItemQuantity()` | 1             | Оставить, но упростить                          |
| `removeItemFromBill()` | 1             | Оставить, но упростить                          |
| `sendOrderToKitchen()` | 1             | Упростить, убрать DepartmentNotificationService |
| `saveAndNotifyOrder()` | 1             | Объединить с sendOrderToKitchen()               |

**Итого: 16 методов (для рефакторинга)**

### 🔴 REMOVE - Удалить (не используются)

| Метод                          | Использований | Причина удаления                                            |
| ------------------------------ | ------------- | ----------------------------------------------------------- |
| `loadOrders()`                 | 0             | ⚠️ НЕ ИСПОЛЬЗУЕТСЯ! Orders не загружаются при инициализации |
| `selectAllItemsInActiveBill()` | 0             | Не нужна функция, можно удалить                             |
| `updateItemsPaymentStatus()`   | 0             | Не используется, удалить                                    |
| `updateOrderPaymentStatus()`   | 0             | Не используется, удалить                                    |

**Итого: 4 методов (для удаления)**

### ✅ VERIFIED - Используется (после проверки)

| Метод          | Использований | Файлы                | Примечание                            |
| -------------- | ------------- | -------------------- | ------------------------------------- |
| `closeOrder()` | 1             | paymentsStore.ts:407 | ✅ КРИТИЧНЫЙ! Вызывается после оплаты |

**Note**: `closeOrder()` НЕ удалять! Используется в платежной логике.

---

## Computed Properties

### 🟢 Оставить

- `currentOrder` - активно используется
- `activeBill` - активно используется
- `activeOrders` - фильтр
- `todayOrders` - фильтр
- `filteredOrders` - используется для отображения
- `ordersStats` - статистика

### 🟡 Вынести в composable

- `isFullBillSelected` - selection logic → `useOrderSelection()`
- `selectedItemIds` - selection logic → `useOrderSelection()`
- `selectedItemsCount` - selection logic → `useOrderSelection()`
- `selectedBillsCount` - selection logic → `useOrderSelection()`
- `hasSelection` - selection logic → `useOrderSelection()`

---

## ⚠️ Подозрительные находки

### 1. loadOrders() не используется

**Проблема**: Метод существует, но нигде не вызывается!

**Проверка нужна**:

```bash
grep -r "loadOrders" src/stores/pos/orders/
grep -r "ordersStore.loadOrders" src/views/pos/
```

**Возможные причины**:

- Вызывается через composable
- Вызывается при инициализации store
- Забыли подключить
- Данные загружаются как-то иначе

**Действие**: Проверить инициализацию ordersStore

### 2. closeOrder() не используется

**Проблема**: Метод реализован (строки 607-636), но нигде не вызывается!

**Где должен использоваться**:

- После успешной оплаты в PaymentDialog
- При закрытии заказа через UI

**Действие**:

- Найти где происходит оплата
- Добавить вызов closeOrder()
- Или удалить если не нужен

### 3. DepartmentNotificationService

**Используется в**: `saveAndNotifyOrder()` метод

**Проверка**:

```typescript
// ordersStore.ts line 45
const response = await ordersService.saveAndNotifyOrder(orderId, tableNumber)
```

**Вопрос**: Реально ли работает отправка в кухню?

**Действие**: Упростить или заглушить

---

## DepartmentNotificationService Analysis

**Файл**: `src/stores/pos/service/DepartmentNotificationService.ts`

**Размер**: ~300 строк сложной логики

**Функционал**:

- Распределение позиций по отделам (kitchen/bar)
- Отправка уведомлений
- Расчет приоритетов

**Проблема**: Слишком сложный для mock реализации

**Варианты**:

1. **Упростить до минимума** (рекомендуется):

   ```typescript
   export const notificationService = {
     async notifyKitchen(order: PosOrder, items: PosBillItem[]): Promise<boolean> {
       console.log('🍳 Kitchen notification:', { order, items })
       // TODO: Real WebSocket/API integration
       return true
     }
   }
   ```

2. **Оставить как есть** - если планируется реализация в ближайшее время

3. **Удалить** - если функция не критична

**Рекомендация**: Упростить до заглушки

---

## TODO Comments Analysis

**Всего найдено**: 21 TODO

### Категории:

#### 1. Интеграции с другими stores (8 TODO)

```typescript
// TODO: Получать из authStore
// TODO: Интеграция с ordersStore
// TODO: Интеграция с accountStore
```

**Действие**: Создать issues для будущих спринтов, убрать из кода

#### 2. "Реализовать" без контекста (6 TODO)

```typescript
// TODO: реализовать подсчет конфликтов
// TODO: Calculate real data when stores are working
```

**Действие**: Либо реализовать сейчас, либо удалить

#### 3. Mock заглушки (4 TODO)

```typescript
// TODO: Интеграция с реальным store
```

**Действие**: Удалить, оставить текущую реализацию

#### 4. Будущие фичи (3 TODO)

```typescript
// TODO: В будущем здесь будет более сложная инициализация
// TODO: Сохранить отчет в историю смен
```

**Действие**: Оставить если актуально, иначе удалить

---

## Рефакторинг Plan

### Phase 1: Extract Composables (3-4 часа)

#### 1. Create useOrderSelection()

**Файл**: `src/stores/pos/orders/composables/useOrderSelection.ts`

**Переносим**:

- State: `selectedItems`, `selectedBills`
- Computed: `isFullBillSelected`, `selectedItemIds`, `selectedItemsCount`, `selectedBillsCount`, `hasSelection`
- Methods: `toggleItemSelection()`, `toggleBillSelection()`, `isItemSelected()`, `isBillSelected()`, `clearSelection()`, `selectAllItemsInActiveBill()`

**Результат**: -150 строк из ordersStore

#### 2. Move calculations to useOrderCalculations()

**Файл**: `src/stores/pos/orders/composables/useOrderCalculations.ts`

**Переносим**:

- `recalculateOrderTotals()` (внутренняя логика)
- `calculateOrderStatus()`
- `determineStatusByOrderType()`
- `calculateOrderPaymentStatus()` (inline function)

**Результат**: -200 строк из ordersStore

### Phase 2: Simplify DepartmentNotificationService (1-2 часа)

**Создать**: `src/stores/pos/orders/services/notificationService.ts`

**Реализация**:

```typescript
export const notificationService = {
  async notifyKitchen(order: PosOrder, items: PosBillItem[]): Promise<boolean> {
    console.log('🍳 Kitchen notification:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      itemsCount: items.length
    })
    // TODO: Implement real WebSocket/API call
    return true
  }
}
```

**Удалить**: `DepartmentNotificationService.ts` (300 строк)

**Результат**: -300 строк

### Phase 3: Remove unused methods (30 мин)

**Удалить методы** (после проверки):

- `selectAllItemsInActiveBill()` - точно не используется
- `updateItemsPaymentStatus()` - не используется
- `updateOrderPaymentStatus()` - не используется

**Проверить и оставить/удалить**:

- `loadOrders()` - нужна инициализация
- `closeOrder()` - нужна после оплаты

**Результат**: -100 строк

### Phase 4: Cleanup TODOs (30 мин)

**21 TODO → ~5 TODO** (только актуальные)

---

## Expected Results

### Before

```
ordersStore.ts: 885 строк
├── State: ~50 строк
├── Services: ~20 строк
├── Computed: ~120 строк
├── Methods: ~600 строк
└── Watchers/Return: ~95 строк
```

### After (Target)

```
ordersStore.ts: ~400 строк
├── State: ~30 строк (без selection)
├── Services: ~15 строк
├── Computed: ~80 строк (без selection computed)
├── Methods: ~220 строк (только essential + persistence)
└── Watchers/Return: ~55 строк

NEW FILES:
useOrderSelection.ts: ~150 строк
useOrderCalculations.ts: ~200 строк (перенесенные calculations)
notificationService.ts: ~30 строк (упрощенный)
```

**Total reduction**: 885 → 400 = **-485 строк (-55%)**

---

## Next Steps

1. ✅ Audit completed
2. ⏭️ Verify loadOrders() and closeOrder() usage
3. ⏭️ Create useOrderSelection() composable
4. ⏭️ Move calculations to useOrderCalculations()
5. ⏭️ Simplify DepartmentNotificationService
6. ⏭️ Remove unused methods
7. ⏭️ Clean TODOs
8. ⏭️ Test POS interface
9. ⏭️ Ready for Sprint 2 (Repository Migration)

---

**Status**: Ready for implementation
**Estimated time**: 1-2 дня
