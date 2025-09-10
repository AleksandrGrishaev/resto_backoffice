# Техническое задание: Этап 2

## A. UI Компоненты

### 1. Основной Layout

```typescript
interface LayoutConfig {
  sidebar: {
    width: string // '280px'
    minWidth: string // '80px'
  }
  content: {
    menuSection: string // '66.66%'
    orderSection: string // '33.33%'
  }
}
```

#### Структура компонентов:

```
PosLayout/
├── TablesSidebar/
├── MenuSection/
└── OrderSection/
```

### 2. TablesSidebar

```typescript
interface TableListConfig {
  tableSize: string // '80px'
  activeColor: string // '#a395e9'
  backgroundColor: string // '#1a1a1e'
}
```

#### Элементы:

- Таблицы списком (#1, #2, T1-T7)
- Индикация активного стола
- Кнопка сворачивания внизу

### 3. MenuSection (2/3 экрана)

- Сетка товаров
- Карточки товаров с ценой
- Фильтрация по категориям

### 4. OrderSection (1/3 экрана)

```typescript
interface OrderViewConfig {
  header: {
    table: string
    actions: string[] // ['Save Bill', 'Print Bill']
  }
  bills: {
    headerHeight: string // '40px'
    itemHeight: string // '56px'
  }
}
```

#### Элементы:

1. Заголовок заказа
   - Номер стола
   - Кнопки действий
2. Счета
   - Bill 1 (активный)
   - Bill 2 (неактивный)
3. Позиции в счете
   - Название
   - Цена
   - Примечания
4. Итоги
   - Подытог
   - Налог
   - Общая сумма

### 5. CheckoutPage

```typescript
interface CheckoutPageConfig {
  layout: {
    orderList: string // '50%'
    payment: string // '50%'
  }
}
```

## B. Функциональность

### 1. Управление столами

```typescript
interface TableActions {
  selectTable(id: string): void
  createOrder(tableId: string): void
  addToExistingOrder(tableId: string, items: OrderItem[]): void
}
```

### 2. Управление заказом

```typescript
interface OrderActions {
  createBill(): void
  addItem(item: MenuItem, billId: string): void
  moveItem(itemId: string, fromBillId: string, toBillId: string): void
  editBillName(billId: string, name: string): void
  addComment(billId: string, comment: string): void
  saveOrder(): void
  checkout(): void
}
```

### 3. Управление счетами

```typescript
interface BillActions {
  createBill(): void
  renameBill(billId: string, name: string): void
  moveToBill(itemId: string, targetBillId: string): void
}
```

## C. Маршрутизация

```typescript
const routes = [
  {
    path: '/pos',
    component: POSLayout,
    children: [
      { path: '', component: MainView },
      { path: 'checkout', component: CheckoutPage }
    ]
  }
]
```

## D. План тестирования

### 1. UI тесты

- Корректное отображение всех компонентов
- Responsive верстка
- Правильные размеры секций
- Работа drag-and-drop
- Анимации переходов

### 2. Функциональные тесты

- Создание заказа
- Добавление позиций
- Перемещение между счетами
- Сохранение заказа
- Переход к оплате

### 3. Интеграционные тесты

- Взаимодействие между компонентами
- Сохранение состояния при переходах
- Обработка ошибок

## E. Этапы разработки

1. Базовая структура (1 неделя)

   - Layout
   - Маршрутизация
   - Основные компоненты

2. Функциональность заказов (1 неделя)

   - Создание заказов
   - Управление счетами
   - Перемещение позиций

3. Тестирование и отладка (1 неделя)
   - UI тесты
   - Функциональные тесты
   - Исправление ошибок

## F. Критерии приемки

### UI:

- Точное соответствие макету
- Корректная работа на всех разрешениях
- Плавные анимации
- Интуитивно понятный интерфейс

### Функциональность:

- Работа всех действий с заказами
- Корректное сохранение данных
- Безошибочное перемещение между счетами
- Точные расчеты сумм

# Типы данных POS-системы

## 1. Базовые типы (существующие)

```typescript
// Используем существующие типы
import { BaseEntity, Role, User, CustomerInfo } from '@/types'
import { MenuItem, MenuItemVariant, Category, BaseItem } from '@/types/menu'
import { Bill, BillItem, BillStatus, BillItemStatus, DeliveryType } from '@/types/bill'
import { Payment, PaymentMethod, PaymentStatus } from '@/types/payment'
```

## 2. Новые типы для POS

### 2.1 Управление столами

```typescript
interface Table extends BaseEntity {
  number: string
  capacity: number
  status: TableStatus
  currentBillId?: string
  section?: string
}

type TableStatus = 'free' | 'occupied' | 'reserved'

interface TableSection {
  id: string
  name: string
  tables: Table[]
}
```

### 2.2 Управление заказами в POS

```typescript
interface POSOrder extends BaseEntity {
  billId: string
  tableId?: string
  items: BillItem[]
  status: POSOrderStatus
  deliveryType: DeliveryType
  customerInfo?: CustomerInfo
  waiter: {
    id: string
    name: string
  }
  notes?: {
    kitchen?: string
    bar?: string
    service?: string
  }
}

type POSOrderStatus = 'draft' | 'active' | 'completed' | 'cancelled'

interface OrderNote {
  id: string
  orderId: string
  type: 'kitchen' | 'bar' | 'service'
  text: string
  createdAt: string
  createdBy: string
}
```

### 2.3 Интерфейс POS состояния

```typescript
interface POSState {
  // Текущий заказ
  activeOrder: {
    billId: string | null
    tableId: string | null
    deliveryType: DeliveryType
    customerInfo?: CustomerInfo
    items: BillItem[]
  }

  // Состояние UI
  ui: {
    selectedTable: string | null
    selectedCategory: string | null
    selectedBillItem: string | null
    sidebarExpanded: boolean
    activeDialog: string | null
  }

  // Состояние системы
  system: {
    currentShift: string | null
    isOnline: boolean
    lastSync: string | null
    pendingSync: PendingSyncItem[]
  }
}

interface PendingSyncItem {
  id: string
  type: 'order' | 'payment' | 'customer'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: string
  retryCount: number
}
```

### 2.4 События POS системы

```typescript
interface POSEvents {
  // События столов
  'table:select': (tableId: string) => void
  'table:status:update': (tableId: string, status: TableStatus) => void

  // События заказов
  'order:create': (tableId: string, type: DeliveryType) => void
  'order:update': (orderId: string, items: BillItem[]) => void
  'order:status:update': (orderId: string, status: POSOrderStatus) => void
  'order:note:add': (orderId: string, note: Partial<OrderNote>) => void

  // События позиций
  'item:add': (item: MenuItem, quantity: number) => void
  'item:update': (itemId: string, updates: Partial<BillItem>) => void
  'item:remove': (itemId: string) => void
  'item:move': (itemId: string, targetBillId: string) => void

  // События оплаты
  'payment:init': (billId: string) => void
  'payment:process': (billId: string, method: PaymentMethod, amount: number) => void
  'payment:complete': (billId: string) => void

  // События синхронизации
  'sync:start': () => void
  'sync:complete': () => void
  'sync:error': (error: string) => void
}
```

### 2.5 Конфигурация POS

```typescript
interface POSConfig {
  layout: {
    sidebar: {
      width: number
      minWidth: number
    }
    content: {
      menuSection: string
      orderSection: string
    }
  }
  sync: {
    interval: number
    maxRetries: number
    timeout: number
  }
  ui: {
    animationDuration: number
    toastDuration: number
    confirmTimeout: number
  }
  printing: {
    enabled: boolean
    printerName?: string
    paperWidth: number
    fontSize: number
  }
}
```

## 3. Утилиты для работы с типами

```typescript
// Утилиты для работы с заказами
type OrderWithDetails = POSOrder & {
  table?: Table
  customer?: CustomerInfo
  payments: Payment[]
}

// Утилиты для работы с итогами
interface OrderTotals {
  subtotal: number
  tax: {
    service: number
    government: number
  }
  total: number
  discount?: {
    amount: number
    type: 'percentage' | 'fixed'
  }
}

// Утилиты для валидации
type ValidationResult = {
  isValid: boolean
  errors: string[]
}
```

## 4. Вспомогательные функции

```typescript
// Функции для работы с типами
function isValidOrder(order: POSOrder): ValidationResult
function calculateOrderTotals(order: POSOrder): OrderTotals
function canTransferItems(items: BillItem[], targetBillId: string): boolean
function validatePayment(payment: Payment, bill: Bill): ValidationResult
```
