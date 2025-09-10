# Техническое задание на доработку POS системы

## Этап 3

1. Мне надо реализовать сохранение заказов

   1. При нажатии на save bill и сделать кнопку активной при наличии несохраненных изменений.

   ```
     const hasUnsavedChanges = ref(false)

   ```

   1. Реализовать уведомления о не сохраненных изменениях при переходе на другую страницу или стол

   ```markdown
   1. Проверка валидности всего заказа
   2. Все `pending` позиции переходят в `ordered`
   3. Обновление истории для каждой позиции
   4. Уведомление кухни/бара
   ```

2. Обновить Types Счета и меню, согласно нашего файла Сущности Pos

   ```markdown
   Добавить время открытия и закрытия счета. И время активности (записываем стол)

   type BillItemStatus =
   | 'pending' // Новая позиция
   | 'ordered' // Сохранена и отправлена на кухню
   | 'cooking' // Готовится на кухне
   | 'completed' // Приготовлена и подана
   | 'cancelled' // Отменена

   const statusTransitions = {
   pending: ['ordered', 'cancelled'],
   ordered: ['cooking', 'cancelled'],
   cooking: ['completed', 'cancelled'],
   cancelled: [], // Конечное состояние
   completed: [] // Конечное состояние
   }
   ```

3. Меню реализовать после добавлении позиции возврат на главное меню.
4. Позиции в счете:

   1. Сделать интерфейс добавления позиции через + в BillManager, то есть если в счете есть уже позиция, мы просто дабавляем ее.

      ```
      1. Все новые позиции получают статус `pending`
      2. При добавлении сохраняется первая запись в истории
      3. Позиции можно добавлять только в активные счета
      ```

   2. Редактирование количества и заметки
   3. Инструментарий отмены позиции

      1. Удаление - до сохранения
      2. Отмена после сохранения - Мы не удаляем, мы отменяем позицию, если она уже была сохранена, то мы должны обязательно выбрать причину отмены блюда.

      ├── CancelItemDialog.vue // Отмена позиции с причиной

      1. Если у нас несколько счетов в позиции, Total должен считаться не по заказу (как сейчас), а по активному счету

      ```
      1. Отменить можно только позиции в статусах `pending` и `ordered`
      2. При отмене обязательно указывается причина и примечание
      3. История изменений автоматически обновляется
      ```

   4. Инструмент отмены Счета

      1. Мы можем отменить весь счет, и выбрать причину, при этом все позиции в счете тоже будут отменены с этой причиной отмены.

      ```
      type CancellationReason =
        | 'customer_request'
        | 'out_of_stock'
        | 'wrong_order'
        | 'quality_issue'
        | 'long_wait'
        | 'price_dispute'
        | 'other'
      ```

Ошибки подправить:

1. Редактирование типа счета не работает, диалоговое окно вызывается, но при смене типа заказа, ничего не происходит.
2. Drag and drop в bill manager не работает. В любом случае, я бы хотел реорганизовать эту работу.

→ moveBillToTable

Создаваемые диалоги:

```
src/components/pos/dialogs/
  ├── CancelItemDialog.vue       // Отмена позиции с причиной
  ├── EditItemDialog.vue         // Редактирование количества/заметки
  └── ConfirmActionDialog.vue    // Базовый диалог подтверждения
```

TODO

1. History item edit in shift managment page
2. Firebase and Offline

```
// TODO: Stage 5 - Интеграция с Firebase
interface FirebaseIntegration {
  saveOrder(order: Order): Promise<void>
  loadOrder(orderId: string): Promise<Order>
  syncChanges(): Promise<void>
}

// TODO: Stage 6 - Offline режим
interface OfflineSupport {
  saveToIndexedDB(order: Order): Promise<void>
  syncWithServer(): Promise<void>
  handleOfflineChanges(): Promise<void>
}
```

# Основные сущности POS системы

## 1. Заказ (Order)

### Атрибуты

- id: string (уникальный идентификатор)
- orderNumber: string (отображаемый номер заказа, D001/T001)
- type: OrderType (тип заказа)
  - 'dine-in'
  - 'takeaway'
  - 'delivery'
- status: OrderStatus
  - 'draft' (новый/редактируется)
  - 'confirmed' (подтвержден/отправлен)
  - 'completed' (выполнен)
  - 'cancelled' (отменен)
- tableId: string (для dine-in заказов)
- bills: string[] (список ID счетов)
- createdAt: string (дата создания)
- updatedAt: string (дата обновления)

### Правила

1. Тип заказа определяет:
   - Возможность создания нескольких счетов
   - Требуемые дополнительные данные
   - Процесс обработки
2. Статус заказа влияет на:
   - Возможность редактирования
   - Доступные операции
   - Отображение в интерфейсе

## 2. Счёт (Bill)

### Атрибуты

- id: string (уникальный идентификатор)
- orderId: string (ID заказа)
- name: string (название счета, например "Bill 1")
- status: BillStatus
  - 'active' (активный)
  - 'closed' (закрыт)
  - 'cancelled' (отменён)
- items: BillItem[] (позиции в счете)
- subtotal: number (сумма без налогов)
- taxes: {
  - serviceTax: number (сервисный сбор)
  - governmentTax: number (гос. налог)
    }
- total: number (итоговая сумма)
- notes: {
  - kitchen?: string (заметки для кухни)
  - bar?: string (заметки для бара)
    }

### Правила

1. Счёт может быть:
   - Разделён (только для dine-in)
   - Объединён с другим счётом
   - Отменён целиком
2. Расчёт сумм:
   - Автоматический пересчёт при изменении позиций
   - Учёт скидок и налогов

## 3. Позиция в счёте (BillItem)

### Атрибуты

- id: string (уникальный идентификатор)
- billId: string (ID счёта)
- dishId: string (ID блюда)
- variantId: string (ID варианта блюда)
- quantity: number (количество)
- price: number (цена за единицу)
- status: BillItemStatus
  - 'pending' (новая позиция)
  - 'ordered' (отправлена на кухню)
  - 'cooking' (готовится)
  - 'completed' (готова)
  - 'cancelled' (отменена)
- notes?: string (примечания)
- cookingStartedAt?: string (время начала готовки)
- completedAt?: string (время завершения)
- cancellation?: {
  - reason: string (причина отмены)
  - cancelledAt: string (время отмены)
    }
- discounts?: {
  - type: 'percentage' | 'amount'
  - value: number
  - reason?: string
    }[]

### Правила статусов и переходов

1. Порядок переходов:

   ```
   pending -> ordered -> cooking -> completed
            \\-> cancelled    \\-> cancelled

   ```

2. Правила изменения:
   - pending -> ordered: при сохранении заказа
   - ordered -> cooking: когда кухня начинает готовить
   - cooking -> completed: когда блюдо готово
   - cancelled: возможен из pending, ordered, cooking
3. Ограничения редактирования:
   - pending: можно изменять всё
   - ordered/cooking: только отмена
   - completed/cancelled: изменения запрещены

## Взаимосвязи сущностей

1. Заказ -> Счета:
   - Один заказ может иметь несколько счетов (для dine-in)
   - Заказ delivery/takeaway всегда имеет один счёт
2. Счёт -> Позиции:
   - Один счёт содержит множество позиций
   - Позиции могут быть перемещены между счетами
   - При отмене счёта отменяются все позиции
3. Общие правила:
   - Нельзя создать пустой заказ
   - Нельзя сохранить пустой счёт
   - Каждое изменение статуса логируется
   - Отмена требует указания причины

## 1. Реализация сохранения заказов

### 1.1. Отслеживание изменений

```typescript
interface OrderChangeTracker {
  hasUnsavedChanges: boolean
  lastSavedState: {
    bills: OrderBill[]
    timestamp: string
  }
}
```

#### Требования к реализации:

- Добавить в OrderStore состояние для отслеживания изменений
- Отслеживать все модификации bills через watch
- Активировать кнопку Save только при наличии изменений
- Сохранять состояние после успешного сохранения

### 1.2. Процесс сохранения заказа

```typescript
interface OrderSaveProcess {
  validateOrder(): boolean
  updateItemStatuses(): void
  updateHistory(): void
  notifyKitchen(): void
}
```

#### Этапы сохранения:

1. Валидация заказа:

   - Проверка наличия позиций
   - Проверка корректности цен
   - Валидация статусов позиций

2. Обновление статусов:

   - Перевод всех pending позиций в ordered
   - Обновление timestamps
   - Создание записей в истории

3. Уведомление кухни/бара:
   - Группировка позиций по типу (кухня/бар)
   - Формирование уведомлений
   - Отправка в соответствующие очереди

### 1.3. Предупреждение о несохраненных изменениях

```typescript
interface NavigationGuard {
  checkUnsavedChanges(): Promise<boolean>
  showWarningDialog(): Promise<boolean>
}
```

## 2. Обновление типов данных

### 2.1. Расширение Bill interface

```typescript
interface Bill extends BaseEntity {
  // Существующие поля...
  openedAt: string
  closedAt?: string
  tableActivityLog: {
    tableId: string
    startTime: string
    endTime?: string
  }[]
}
```

### 2.2. Обновление BillItemStatus

```typescript
type BillItemStatus = 'pending' | 'ordered' | 'cooking' | 'completed' | 'cancelled'

interface StatusTransition {
  [key: string]: BillItemStatus[]
  pending: ['ordered', 'cancelled']
  ordered: ['cooking', 'cancelled']
  cooking: ['completed', 'cancelled']
  cancelled: []
  completed: []
}
```

## 3. Доработка меню

### 3.1. Навигация после добавления позиции

- Добавить в MenuStore флаг autoReturnToCategories
- Реализовать автоматический возврат после добавления
- Добавить настройку поведения в пользовательских предпочтениях

## 4. Доработка работы с позициями

### 4.1. Быстрое добавление существующих позиций

```typescript
interface QuickAddItem {
  addExistingItem(billId: string, itemId: string): void
  updateQuantity(billId: string, itemId: string, quantity: number): void
}
```

### 4.2. Редактирование позиций

```typescript
interface ItemEditor {
  editQuantity(billId: string, itemId: string, quantity: number): void
  editNotes(billId: string, itemId: string, notes: string): void
  validateChanges(changes: ItemChanges): boolean
}
```

### 4.3. Отмена позиций

```typescript
interface CancellationReason {
  code:
    | 'customer_request'
    | 'out_of_stock'
    | 'wrong_order'
    | 'quality_issue'
    | 'long_wait'
    | 'price_dispute'
    | 'other'
  description: string
  requiresNote: boolean
}

interface ItemCancellation {
  canCancel(status: BillItemStatus): boolean
  cancel(billId: string, itemId: string, reason: CancellationReason, note?: string): void
  updateHistory(itemId: string, reason: CancellationReason): void
}
```

### 4.4. Отмена счета

```typescript
interface BillCancellation {
  cancelBill(billId: string, reason: CancellationReason, note?: string): void
  cancelAllItems(billId: string, reason: CancellationReason): void
  updateBillStatus(billId: string, status: 'cancelled'): void
}
```

## 5. Исправление ошибок

### 5.1. Редактирование типа заказа

- Исправить обработчик в OrderTypeEditor.vue
- Добавить валидацию типа заказа
- Обновить логику изменения типа в TablesStore

### 5.2. Drag and Drop в BillManager

- Переработать механизм D&D
- Добавить визуальную индикацию при перетаскивании
- Реализовать корректное обновление состояния после перемещения

## 6. Новые компоненты

### 6.1. Диалоговые окна

```
src/components/pos/dialogs/
├── CancelItemDialog.vue
├── EditItemDialog.vue
└── ConfirmActionDialog.vue
```

#### Требования к диалогам:

- Единый стиль и поведение
- Поддержка валидации
- История изменений
- Обработка ошибок

# План реализации POS системы – Этап 3

## 1. Реализация сохранения заказов

- [ ] **1.1. Трекинг изменений**

  - [ X] Добавить hasUnsavedChanges в OrderStore
  - [ X] Реализовать отслеживание изменений через watch
  - [X ] Добавить lastSavedState в store
  - [X ] Связать кнопку Save с состоянием hasUnsavedChanges

- [ ] **1.2. Процесс сохранения**

  - [ X] Реализовать валидацию заказа
  - [ ] Добавить функционал обновления статусов
  - [ X] Внедрить систему истории изменений
  - [ ] Реализовать уведомления кухни/бара

- [ ] **1.3. Предупреждения об изменениях**
  - [ ] Добавить NavigationGuard
  - [ ] Создать диалог предупреждения
  - [ ] Реализовать логику проверки при навигации

## 2. Обновление типов

- [ ] **2.1. Расширение интерфейсов**

  - [ ] Обновить интерфейс Bill
  - [ ] Добавить логи активности стола
  - [ ] Обновить типы в существующих компонентах

- [ ] **2.2. Статусы позиций**
  - [ ] Реализовать новую систему статусов
  - [ ] Добавить валидацию переходов
  - [ ] Обновить существующую логику работы со статусами

## 3. Доработка меню

- [ ] **3.1. Навигация**
  - [ ] Добавить флаг autoReturnToCategories
  - [ ] Реализовать автовозврат
  - [ ] Добавить настройки поведения

## 4. Работа с позициями

- [ ] **4.1. Быстрое добавление**

  - [ ] Реализовать интерфейс добавления через '+'
  - [ ] Добавить валидацию при добавлении
  - [ ] Реализовать обновление истории

- [ ] **4.2. Редактирование**

  - [ ] Создать EditItemDialog
  - [ ] Реализовать изменение количества
  - [ ] Добавить редактирование заметок
  - [ ] Внедрить валидацию изменений

- [ ] **4.3. Отмена позиций**

  - [ ] Создать CancelItemDialog
  - [ ] Реализовать логику отмены
  - [ ] Добавить выбор причины
  - [ ] Реализовать обновление истории

- [ ] **4.4. Отмена счета**
  - [ ] Реализовать функционал отмены счета
  - [ ] Добавить массовую отмену позиций
  - [ ] Внедрить выбор причины отмены

## 5. Исправление ошибок

- [ ] **5.1. Тип заказа**

  - [ ] Исправить OrderTypeEditor
  - [ ] Обновить логику в TablesStore
  - [ ] Добавить валидацию

- [ ] **5.2. Drag and Drop**
  - [ ] Переработать механизм D&D
  - [ ] Добавить визуальные индикаторы
  - [ ] Исправить обновление состояния

## 6. Новые компоненты

- [ ] **6.1. Базовые диалоги**
  - [ ] Создать ConfirmActionDialog
  - [ ] Реализовать CancelItemDialog
  - [ ] Реализовать EditItemDialog

## Приоритеты реализации:

1. Исправление существующих ошибок (п.5)
2. Сохранение заказов (п.1)
3. Обновление типов (п.2)
4. Работа с позициями (п.4)
5. Доработка меню (п.3)
6. Новые компоненты (п.6)

## Критерии приемки:

- Все компоненты имеют тесты
- Документация обновлена
- UI/UX соответствует общему стилю приложения
- Производительность не ухудшилась
- Код соответствует принятым стандартам

## Технические ограничения:

- Сохранять обратную совместимость с существующими типами
- Минимизировать изменения в существующей архитектуре
- Обеспечить поддержку оффлайн-режима
