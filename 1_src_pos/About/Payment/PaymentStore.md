# Payment System Implementation Checklist

## Phase 0: Подготовка инфраструктуры

### Базовые интерфейсы

- [ ] Определены все необходимые типы и интерфейсы
- [ ] Созданы базовые классы для работы со статусами
- [ ] Настроены переходы между статусами
- [ ] Определены правила валидации

### Структура данных

- [ ] Определена структура Payment
- [ ] Определена структура Transaction
- [ ] Определена структура Bill
- [ ] Определены связи между сущностями
- [ ] Настроено хранение истории изменений

## Phase 1: Базовая обработка платежей

### PaymentStore

- [ ] Реализован базовый функционал создания платежа
- [ ] Реализована валидация платежей
- [ ] Реализовано обновление статусов
- [ ] Реализована обработка ошибок
- [ ] Добавлено логирование операций

### Интеграция

- [ ] Интеграция с TableStore
- [ ] Интеграция с OrderStore
- [ ] Интеграция с BillStore
- [ ] Настроена синхронизация статусов
- [ ] Реализованы коллбэки для обновления UI

## Phase 2: UI Components

### Базовые компоненты

- [ ] PaymentDialog

  - [ ] Отображение выбранных позиций
  - [ ] Расчет итоговой суммы
  - [ ] Выбор способа оплаты
  - [ ] Обработка ошибок
  - [ ] Подтверждение оплаты

- [ ] StatusIndicators
  - [ ] Индикатор статуса стола
  - [ ] Индикатор статуса заказа
  - [ ] Индикатор статуса оплаты
  - [ ] Анимации при изменении статуса

### Визуальное оформление

- [ ] Цветовая схема для статусов
- [ ] Иконки для разных типов оплаты
- [ ] Анимации для процессов
- [ ] Адаптивный дизайн
- [ ] Доступность (a11y)

## Phase 3: Сложные сценарии

### Предоплата

- [ ] Создание предоплаченного заказа
- [ ] Привязка к столу
- [ ] Валидация при размещении
- [ ] Обработка изменений заказа

### Takeaway

- [ ] Создание takeaway заказа
- [ ] Конвертация в обычный заказ
- [ ] Перенос оплат
- [ ] Обновление статусов

### Постоплата

- [ ] Проверка готовности заказа
- [ ] Формирование финального счета
- [ ] Процесс закрытия заказа
- [ ] Закрытие стола

## Phase 4: Транзакции и отчетность

### Транзакции

- [ ] Создание транзакций
- [ ] Связывание с заказами
- [ ] История транзакций
- [ ] Поиск и фильтрация

### Отчетность

- [ ] Базовые отчеты
- [ ] Экспорт данных
- [ ] Фильтры и группировка
- [ ] Визуализация данных

## Testing

### Unit Tests

- [ ] PaymentStore tests
- [ ] StatusManager tests
- [ ] ValidationService tests
- [ ] Utils tests

### Integration Tests

- [ ] Payment flow tests
- [ ] Status update tests
- [ ] Store integration tests
- [ ] Error handling tests

### UI Tests

- [ ] Component tests
- [ ] User flow tests
- [ ] Responsive design tests
- [ ] Accessibility tests

## Валидация

### Правила бизнес-логики

- [ ] Валидация оплаты

  - [ ] Проверка существования позиций
  - [ ] Проверка статусов позиций
  - [ ] Проверка сумм
  - [ ] Проверка возможности оплаты

- [ ] Валидация статусов столов

  - [ ] Проверка перед изменением статуса
  - [ ] Проверка неоплаченных позиций
  - [ ] Проверка активных заказов
  - [ ] Проверка возможности закрытия

- [ ] Валидация заказов
  - [ ] Проверка состава заказа
  - [ ] Проверка статусов позиций
  - [ ] Проверка возможности изменения
  - [ ] Проверка возможности закрытия

### Security

- [ ] Валидация входных данных
- [ ] Проверка прав доступа
- [ ] Защита от двойной оплаты
- [ ] Логирование действий
- [ ] Аудит изменений

## Performance

### Оптимизация

- [ ] Кэширование данных
- [ ] Оптимизация запросов
- [ ] Батчинг операций
- [ ] Индексация данных

### Мониторинг

- [ ] Отслеживание времени отклика
- [ ] Мониторинг ошибок
- [ ] Алерты при проблемах
- [ ] Сбор метрик

## Documentation

### Техническая документация

- [ ] API documentation
- [ ] Component documentation
- [ ] Flow diagrams
- [ ] State diagrams

### Пользовательская документация

- [ ] User guides
- [ ] Error messages
- [ ] Troubleshooting guides
- [ ] FAQ

# Детальный план реализации платёжной системы

## Phase 0: Подготовка инфраструктуры

Длительность: 3 дня

### 0.1 Определение базовых интерфейсов

```typescript
// Основные статусы
interface StatusMapping {
  paymentStatus: PaymentStatus // Статус оплаты
  preparationStatus: PreparationStatus // Статус готовки
  tableStatus: TableStatus // Статус стола
}

// Базовые интерфейсы для взаимодействия
interface PaymentProcessor {
  processPayment(data: PaymentData): Promise<Payment>
  validatePayment(data: PaymentData): ValidationResult
}

interface StatusManager {
  updateItemStatus(itemId: string, status: PaymentStatus): Promise<void>
  updateBillStatus(billId: string): Promise<void>
  updateTableStatus(tableId: string): Promise<void>
}

interface ValidationService {
  canProcessPayment(items: string[]): ValidationResult
  canCloseTable(tableId: string): ValidationResult
  canTransferOrder(orderId: string, targetTableId: string): ValidationResult
}
```

### 0.2 Настройка состояний и переходов

```typescript
// Диаграмма переходов состояний
const STATE_TRANSITIONS = {
  table: {
    free: ['occupied_unpaid', 'reserved'],
    occupied_unpaid: ['occupied_paid', 'free'],
    occupied_paid: ['free'],
    reserved: ['occupied_unpaid', 'free']
  },
  order: {
    unpaid: ['partially_paid', 'paid'],
    partially_paid: ['paid'],
    paid: ['closed']
  }
} as const
```

## Phase 1: Базовая обработка платежей

Длительность: 1 неделя

### 1.1 PaymentStore implementation

```typescript
class PaymentStore {
  // Основное состояние
  private state = {
    activePayments: new Map<string, Payment>(),
    processingPayments: new Set<string>(),
    paymentHistory: [] as Payment[]
  }

  // Методы обработки платежей
  async processPayment(data: PaymentData): Promise<Payment> {
    await this.validatePaymentData(data)
    return this.createPaymentTransaction(data)
  }

  // Методы обновления статусов
  async updatePaymentStatuses(payment: Payment): Promise<void> {
    await Promise.all([
      this.updateItemStatuses(payment.items),
      this.updateBillStatus(payment.billId),
      this.updateTableStatus(payment.tableId)
    ])
  }

  // Методы валидации
  private async validatePaymentData(data: PaymentData): Promise<void> {
    // 1. Проверка существования items
    // 2. Проверка статусов items
    // 3. Валидация сумм
    // 4. Проверка возможности оплаты
  }
}
```

### 1.2 Интеграция с существующими сторами

```typescript
// Интеграция с TableStore
interface TableStore {
  // Новые методы
  getTableWithPaymentStatus(tableId: string): TableWithPayment
  updateTablePaymentStatus(tableId: string): Promise<void>
  validateTableStatus(tableId: string): ValidationResult
}

// Интеграция с OrderStore
interface OrderStore {
  // Новые методы
  getOrderPaymentDetails(orderId: string): OrderPaymentDetails
  updateOrderPaymentStatus(orderId: string): Promise<void>
  validateOrderForPayment(orderId: string): ValidationResult
}
```

## Phase 2: UI Components и статусы

Длительность: 1.5 недели

### 2.1 Базовые компоненты оплаты

```typescript
// PaymentProcessor.vue
interface PaymentProcessorProps {
  selectedItems: string[]
  billId: string
  tableId: string
  onSuccess: (payment: Payment) => void
  onError: (error: PaymentError) => void
}

// PaymentSummary.vue
interface PaymentSummaryProps {
  items: BillItem[]
  total: number
  appliedDiscounts: Discount[]
  taxes: Tax[]
  finalAmount: number
}

// PaymentStatusIndicator.vue
interface StatusIndicatorProps {
  status: PaymentStatus
  amount?: number
  showDetails?: boolean
}
```

### 2.2 Компоненты управления статусами

```typescript
// TableStatusManager.vue
interface TableStatusManagerProps {
  table: Table
  onStatusChange: (newStatus: TableStatus) => void
}

// OrderStatusPanel.vue
interface OrderStatusPanelProps {
  order: Order
  showPaymentHistory?: boolean
  allowStatusChange?: boolean
}
```

## Phase 3: Сложные сценарии и валидация

Длительность: 1 неделя

### 3.1 Сценарии использования

1. Предоплата с последующим размещением за столом

```typescript
interface PrePaymentFlow {
  // 1. Оплата заказа
  processPrePayment(order: Order): Promise<Payment>
  // 2. Размещение за столом
  assignTableToPrePaidOrder(orderId: string, tableId: string): Promise<void>
}
```

2. Takeaway с последующим размещением

```typescript
interface TakeawayFlow {
  // 1. Создание takeaway заказа
  createTakeawayOrder(items: OrderItem[]): Promise<Order>
  // 2. Оплата
  processTakeawayPayment(orderId: string): Promise<Payment>
  // 3. Конвертация в обычный заказ
  convertToTableOrder(orderId: string, tableId: string): Promise<Order>
}
```

3. Оплата после обслуживания

```typescript
interface PostServiceFlow {
  // 1. Проверка статуса готовности
  validateOrderCompletion(orderId: string): ValidationResult
  // 2. Получение итогового счета
  getFinalBill(orderId: string): Bill
  // 3. Процесс оплаты
  processPostServicePayment(billId: string): Promise<Payment>
}
```

### 3.2 Валидация и проверки

```typescript
class ValidationService {
  // Валидация оплаты
  async validatePayment(data: PaymentData): Promise<ValidationResult> {
    // 1. Проверка статусов позиций
    const itemsValid = await this.validateItemsStatus(data.items)
    if (!itemsValid) return { valid: false, error: 'INVALID_ITEMS' }

    // 2. Проверка сумм и расчетов
    const amountValid = this.validateAmounts(data)
    if (!amountValid) return { valid: false, error: 'INVALID_AMOUNT' }

    // 3. Проверка возможности оплаты
    return this.validatePaymentPossibility(data)
  }

  // Валидация закрытия стола
  async validateTableClosure(tableId: string): Promise<ValidationResult> {
    // 1. Проверка наличия неоплаченных позиций
    const hasUnpaidItems = await this.checkUnpaidItems(tableId)
    if (hasUnpaidItems) return { valid: false, error: 'UNPAID_ITEMS' }

    // 2. Проверка статуса готовности блюд
    const hasUnfinishedItems = await this.checkUnfinishedItems(tableId)
    if (hasUnfinishedItems) return { valid: false, error: 'UNFINISHED_ITEMS' }

    // 3. Проверка активных заказов
    return this.validateActiveOrders(tableId)
  }
}
```

## Phase 4: История транзакций и отчетность

Длительность: 1 неделя

### 4.1 Управление транзакциями

```typescript
interface TransactionManager {
  // Создание транзакции
  createTransaction(data: TransactionData): Promise<Transaction>

  // Связывание с сущностями
  linkTransactionToOrder(transactionId: string, orderId: string): Promise<void>
  linkTransactionToTable(transactionId: string, tableId: string): Promise<void>

  // Получение истории
  getOrderTransactions(orderId: string): Transaction[]
  getTableTransactions(tableId: string): Transaction[]
  getShiftTransactions(shiftId: string): Transaction[]
}
```

### 4.2 Компоненты истории и отчетов

```typescript
// TransactionHistory.vue
interface TransactionHistoryProps {
  entityId: string
  entityType: 'order' | 'table' | 'shift'
  showDetails?: boolean
}

// TransactionSummary.vue
interface TransactionSummaryProps {
  transactions: Transaction[]
  groupBy?: 'date' | 'type' | 'status'
}
```

## Testing Strategy

### Unit Tests

1. Payment Processing:

```typescript
describe('PaymentStore', () => {
  it('should process valid payment', async () => {
    const payment = await paymentStore.processPayment(validPaymentData)
    expect(payment.status).toBe('completed')
  })

  it('should update related entities status', async () => {
    await paymentStore.processPayment(validPaymentData)
    const table = await tableStore.getTable(tableId)
    expect(table.paymentStatus.paidAmount).toBe(expectedAmount)
  })
})
```

2. Status Management:

```typescript
describe('StatusManager', () => {
  it('should correctly update table status', async () => {
    await statusManager.updateTableStatus(tableId, 'occupied_paid')
    const table = await tableStore.getTable(tableId)
    expect(table.status).toBe('occupied_paid')
  })

  it('should prevent invalid status transitions', async () => {
    await expect(statusManager.updateTableStatus(tableId, 'free')).rejects.toThrow(
      'Invalid status transition'
    )
  })
})
```

### Integration Tests

1. Complex Flows:

```typescript
describe('Payment Flows', () => {
  it('should handle pre-payment flow', async () => {
    // 1. Create order
    // 2. Process payment
    // 3. Assign table
    // 4. Verify statuses
  })

  it('should handle post-service payment', async () => {
    // 1. Create and complete order
    // 2. Process payment
    // 3. Close table
    // 4. Verify final states
  })
})
```

### UI Tests

1. Component Tests:

```typescript
describe('PaymentDialog', () => {
  it('should display correct payment details', () => {
    const wrapper = mount(PaymentDialog, {
      props: { items, billId }
    })
    expect(wrapper.find('.total-amount').text()).toBe(expectedTotal)
  })

  it('should handle payment method selection', async () => {
    const wrapper = mount(PaymentDialog)
    await wrapper.find('.payment-method-cash').trigger('click')
    expect(wrapper.emitted('method-selected')[0]).toBe('cash')
  })
})
```

## Deployment Strategy

### Phase 1 (Week 1):

- Basic payment processing
- Simple status updates
- Core validation rules

### Phase 2 (Week 2-3):

- UI components
- Status management
- Basic flows implementation

### Phase 3 (Week 3-4):

- Complex scenarios
- Full validation
- Transaction history

### Phase 4 (Week 4-5):

- Reporting
- Analytics
- Final integration

## Monitoring and Validation

### Status Monitoring

```typescript
interface StatusMonitor {
  // Мониторинг статусов
  watchTableStatus(tableId: string): Observable<TableStatus>
  watchOrderStatus(orderId: string): Observable<OrderStatus>
  watchPaymentStatus(paymentId: string): Observable<PaymentStatus>

  // Алерты и нотификации
  onStatusChange(entityId: string, newStatus: string): void
  onValidationError(error: ValidationError): void
}
```

### Validation Rules

1. Общие правила:

   - Нельзя закрыть стол с неоплаченными позициями
   - Нельзя изменить оплаченные позиции
   - Нельзя оплатить несуществующие позиции

2. Статусы столов:

   - Свободен -> Занят (требует валидный заказ)
   - Занят -> Свободен (требует полную оплату)
   - Занят -> Оплачен (требует полную оплату всех позиций)

3. Статусы заказов:
   - Неоплачен -> Частично оплачен (после частичной оплаты)
   - Частично оплачен -> Оплачен (после полной оплаты)
   - Оплачен -> Закрыт (после завершения обслуживания)

# Payment System Implementation Plan

## Stage 0: Types Update and Enhancement

### 0.1 Update Table Types

```typescript
// Обновляем TableStatus
export type TableStatus =
  | 'free' // Стол свободен
  | 'occupied_unpaid' // Занят, есть неоплаченные позиции
  | 'occupied_paid' // Занят, все позиции оплачены
  | 'reserved' // Зарезервирован

interface Table extends BaseEntity {
  // Существующие поля...
  status: TableStatus
  currentOrderId?: string
  lastPaymentTime?: string // Время последней оплаты
  lastOrderTime?: string // Время последнего заказа
  paymentStatus?: {
    totalAmount: number // Общая сумма заказов
    paidAmount: number // Оплаченная сумма
    lastPaymentId?: string // ID последней транзакции
  }
}
```

### 0.2 Update Bill Types

```typescript
// Обновляем BillItem
interface BillItem extends BaseItem {
  // Существующие поля...
  status: BillItemStatus // Статус готовки
  paymentStatus: PaymentStatus // Статус оплаты
  paymentId?: string // ID транзакции оплаты
  paymentAmount?: number // Сумма оплаты
  paymentTime?: string // Время оплаты
}

// Обновляем Bill
interface Bill extends BaseEntity {
  // Существующие поля...
  payments: BillPayment[] // История платежей
  paymentStatus: PaymentStatus // Общий статус оплаты
  totalAmount: number // Общая сумма
  paidAmount: number // Оплаченная сумма
  remainingAmount: number // Оставшаяся сумма
}

// Добавляем BillPayment
interface BillPayment {
  id: string
  transactionId: string // Ссылка на транзакцию
  amount: number
  method: string
  timestamp: string
  status: PaymentStatus
  items?: string[] // ID оплаченных позиций
}
```

### 0.3 Update Payment Types

```typescript
// Обновляем PaymentStatus
export type PaymentStatus =
  | 'unpaid' // Не оплачено
  | 'partially_paid' // Частично оплачено
  | 'paid' // Полностью оплачено
  | 'processing' // В процессе
  | 'failed' // Ошибка
  | 'cancelled' // Отменено
  | 'refunded' // Возвращено

// Обновляем Payment
interface Payment extends BaseEntity {
  billId: string
  orderId: string
  accountId: string
  customerId?: string
  amount: number
  items: string[] // ID оплаченных позиций
  method: PaymentMethod
  status: PaymentStatus
  metadata: {
    shiftId?: string
    employeeId: string
    deviceId: string
    tableId?: string
  }
  details?: {
    cardType?: string
    lastDigits?: string
    transactionId?: string
    notes?: string
  }
}
```

### 0.4 Update Transaction Types

```typescript
// Обновляем Transaction
interface Transaction extends BaseEntity {
  // Существующие поля...
  relatedEntities: {
    orderId?: string
    billId?: string
    itemIds?: string[]
    tableId?: string
    customerId?: string
    shiftId?: string
  }
  payment?: {
    method: string
    details: any
  }
  metadata: {
    shiftId?: string
    employeeId: string
    deviceId: string
    tableId?: string
  }
}
```

### 0.5 Add Validation Types

```typescript
interface PaymentValidation {
  validateBillStatus(billId: string): ValidationResult
  validateItemsStatus(items: string[]): ValidationResult
  validateTableStatus(tableId: string): ValidationResult
  validateAmount(amount: number): ValidationResult
  validatePaymentMethod(method: string): ValidationResult
}

interface TableValidation {
  canChangeStatus(tableId: string): ValidationResult
  canClose(tableId: string): ValidationResult
  hasUnpaidItems(tableId: string): boolean
  hasActiveOrders(tableId: string): boolean
}
```

### 0.6 Add Shift Types

```typescript
interface Shift extends BaseEntity {
  id: string
  startTime: string
  endTime?: string
  status: 'active' | 'closed'
  cashierId: string
  transactions: string[] // ID транзакций
  summary: {
    totalOrders: number
    totalAmount: number
    byPaymentMethod: {
      [method: string]: number
    }
  }
}
```

# Payment System Implementation Plan

## Stage 1: Financial Stores Structure

### 1.1 Create Financial Stores Directory

```
src/stores/financial/
├── index.ts              # Re-exports
├── payment.store.ts      # Payment processing
├── transaction.store.ts  # Financial transactions
├── account.store.ts      # Account management
└── customer.store.ts     # Customer management
```

### 1.2 Transaction Store

Core store for all financial operations:

```typescript
interface TransactionStore {
  // State
  transactions: Transaction[]
  activeTransaction: Transaction | null
  transactionHistory: TransactionHistory[]

  // Getters
  getTransactionsByType: (type: OperationType) => Transaction[]
  getTransactionsByAccount: (accountId: string) => Transaction[]
  getTransactionsByDateRange: (start: Date, end: Date) => Transaction[]
  getTransactionsByShift: (shiftId: string) => Transaction[]

  // Actions
  createTransaction: (data: CreateTransactionDto) => Promise<Transaction>
  updateTransactionStatus: (id: string, status: TransactionStatus) => Promise<void>
  cancelTransaction: (id: string, reason: string) => Promise<void>

  // Computed
  dailyTotal: number
  shiftTotal: number
}
```

### 1.3 Payment Store

Handles payment processing and methods:

```typescript
interface PaymentStore {
  // State
  payments: Payment[]
  activePayment: Payment | null
  paymentMethods: PaymentMethod[]

  // Actions
  processPayment: (data: PaymentData) => Promise<void>
  validatePayment: (data: PaymentData) => ValidationResult
  refundPayment: (paymentId: string) => Promise<void>

  // Integrations
  linkPaymentToBill: (paymentId: string, billId: string) => Promise<void>
  linkPaymentToItems: (paymentId: string, itemIds: string[]) => Promise<void>
}
```

### 1.4 Account Store

Manages payment accounts and balances:

```typescript
interface AccountStore {
  // State
  accounts: Account[]
  activeAccount: Account | null

  // Actions
  createAccount: (data: CreateAccountDto) => Promise<Account>
  updateBalance: (accountId: string, amount: number) => Promise<void>
  transferBetweenAccounts: (data: TransferData) => Promise<void>

  // Getters
  getAccountBalance: (accountId: string) => number
  getAccountTransactions: (accountId: string) => Transaction[]
}
```

## Stage 2: Payment Processing Implementation

### 2.1 Update Bill Model

```typescript
interface Bill {
  // Existing fields...
  payments: {
    id: string
    amount: number
    paymentId: string
    timestamp: string
  }[]
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid'
  totalPaid: number
}

interface BillItem {
  // Existing fields...
  status: BillItemStatus // Using existing enum
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid'
  paymentId?: string
}
```

### 2.2 Payment Processing Flow

1. User selects items/bills for payment
2. System validates selection
3. Payment method selection
4. Amount calculation with taxes
5. Payment processing
6. Update bill/items status
7. Create transaction record

### 2.3 Integration Points

```typescript
// BillStore integration
interface BillStore {
  // New methods
  processItemPayment(items: string[], payment: Payment): Promise<void>
  validateItemsForPayment(items: string[]): ValidationResult
  getUnpaidItems(): BillItem[]
}

// TableStore integration
interface TableStore {
  // New methods
  updateTablePaymentStatus(tableId: string): void
  getTablesWithUnpaidBills(): Table[]
}
```

## Stage 3: Transaction Management

### 3.1 Transaction Types

```typescript
interface Transaction {
  id: string
  type: 'payment' | 'refund' | 'transfer' | 'expense' | 'income'
  amount: number
  status: TransactionStatus
  paymentMethod: string
  accountId: string
  relatedEntities: {
    billId?: string
    itemIds?: string[]
    tableId?: string
  }
  metadata: {
    shiftId?: string
    employeeId: string
    deviceId: string
  }
  timestamps: {
    created: string
    processed?: string
    cancelled?: string
  }
}
```

### 3.2 Transaction Storage

- Real-time sync with Firebase
- Local caching for offline support
- Batch processing for multiple operations

### 3.3 Transaction Validation

```typescript
interface TransactionValidation {
  validateAmount(amount: number): boolean
  validatePaymentMethod(method: string): boolean
  validateAccountBalance(accountId: string, amount: number): boolean
  validateTransactionStatus(status: TransactionStatus): boolean
}
```

## Stage 4: User Interface Components

### 4.1 Payment Dialog

```typescript
// Components structure
/components/payment/
  ├── PaymentDialog.vue
  ├── PaymentMethodSelector.vue
  ├── PaymentSummary.vue
  ├── PaymentConfirmation.vue
  └── PaymentResult.vue
```

### 4.2 Transaction Management

```typescript
// Components structure
/components/transaction/
  ├── TransactionList.vue
  ├── TransactionDetails.vue
  ├── TransactionFilter.vue
  └── TransactionExport.vue
```

### 4.3 Status Indicators

```typescript
// Components structure
/components/status/
  ├── PaymentStatus.vue
  ├── TableStatus.vue
  └── BillStatus.vue
```

## Stage 5: Reporting and Analytics

### 5.1 Basic Reports

- Daily transactions summary
- Payment methods distribution
- Table turnover rate
- Average payment time

### 5.2 Advanced Analytics

- Peak hours analysis
- Payment patterns
- Table utilization
- Revenue by category

## Implementation Sequence

1. **Foundation (Week 1)**

   - Set up store structure
   - Implement basic models
   - Create base components

2. **Payment Processing (Week 2)**

   - Implement payment flow
   - Add validation logic
   - Create payment UI

3. **Transaction Management (Week 3)**

   - Implement transaction tracking
   - Add offline support
   - Create transaction UI

4. **Status Management (Week 4)**

   - Implement status updates
   - Add status indicators
   - Create status management UI

5. **Reports & Analytics (Week 5)**
   - Implement basic reports
   - Add analytics features
   - Create reporting UI

## Notes

### Status Flow

```typescript
const BILL_ITEM_STATUS = {
  pending: 'Awaiting order',
  ordered: 'Order placed',
  cooking: 'In preparation',
  completed: 'Ready to serve',
  cancelled: 'Cancelled'
} as const

const PAYMENT_STATUS = {
  unpaid: 'Not paid',
  partially_paid: 'Partially paid',
  paid: 'Fully paid'
} as const
```

### Validation Rules

1. Cannot process payment for uncompleted items
2. Cannot close table with unpaid items
3. Cannot modify paid items
4. Must validate payment method availability
5. Must check account balance for transfers

### Security Considerations

1. Transaction atomicity
2. Payment verification
3. Account balance consistency
4. Audit trail maintenance
5. Access control for financial operations
