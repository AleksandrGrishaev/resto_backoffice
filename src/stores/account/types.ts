// src/stores/account/types.ts
import { BaseEntity } from '@/types/common'

// ============ ACCOUNT TYPES ============

// Основные типы аккаунтов
export type AccountType = 'cash' | 'bank' | 'card' | 'gojeck' | 'grab'

export interface Account extends BaseEntity {
  name: string
  type: AccountType
  isActive: boolean
  balance: number
  description?: string
  lastTransactionDate?: string
}

export interface AccountWithOperations extends Account {
  lastTransactionDate?: string
  transactionsCount?: number
  totalIncome?: number
  totalExpense?: number
}

// ============ TRANSACTION TYPES ============

export type OperationType = 'income' | 'expense' | 'transfer' | 'correction'

export type DailyExpenseCategory =
  | 'product'
  | 'takeaway'
  | 'ayu_cake'
  | 'utilities'
  | 'salary'
  | 'renovation'
  | 'transport'
  | 'cleaning'
  | 'security'
  | 'village'
  | 'rent'
  | 'other'

export type InvestmentCategory = 'shares' | 'other'

export interface ExpenseCategory {
  type: 'daily' | 'investment'
  category: DailyExpenseCategory | InvestmentCategory
}

export interface TransactionPerformer {
  type: 'user' | 'api'
  id: string
  name: string
}

export interface TransferDetails {
  fromAccountId: string
  toAccountId: string
  fromBalanceAfter: number
  toBalanceAfter: number
}

export interface Transaction extends BaseEntity {
  accountId: string
  type: OperationType
  amount: number
  balanceAfter: number
  description: string

  // ✅ ИСПРАВЛЕНИЕ: Опциональное, но обязательное для expense в runtime
  expenseCategory?: ExpenseCategory // Опционально в типе, но проверяется в валидации

  // ✅ НОВЫЕ ПОЛЯ для связей
  counteragentId?: string // ID контрагента (для supplier payments)
  counteragentName?: string // Кешированное имя контрагента
  relatedOrderIds?: string[] // Минимальный список связанных заказов
  relatedPaymentId?: string // ID связанного PendingPayment

  performedBy: TransactionPerformer
  status: 'completed' | 'failed'
  transferDetails?: TransferDetails
  isCorrection?: boolean
}

export interface CreateOperationDto {
  accountId: string
  type: OperationType
  amount: number
  description: string
  expenseCategory?: ExpenseCategory // Опционально в типе, обязательно для expense в runtime
  performedBy: TransactionPerformer

  // Новые опциональные поля
  counteragentId?: string
  counteragentName?: string
  relatedOrderIds?: string[]
  relatedPaymentId?: string
}

export interface CreateTransferDto {
  fromAccountId: string
  toAccountId: string
  amount: number
  description: string
  performedBy: TransactionPerformer
}

export interface CreateCorrectionDto {
  accountId: string
  amount: number
  description: string
  performedBy: TransactionPerformer
}

export interface TransactionFilters {
  dateFrom?: string | null
  dateTo?: string | null
  type?: OperationType | null
  category?: ExpenseCategory['type'] | null
}

// ============ PAYMENT TYPES ============

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type PaymentPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface PendingPayment extends BaseEntity {
  counteragentId: string
  counteragentName: string
  amount: number
  description: string
  dueDate?: string
  priority: PaymentPriority
  status: PaymentStatus
  category: 'supplier' | 'service' | 'utilities' | 'salary' | 'other' | 'rent' | 'maintenance'
  invoiceNumber?: string
  notes?: string
  assignedToAccount?: string // ID счета для списания
  createdBy: TransactionPerformer

  // ✅ НОВЫЕ ПОЛЯ для интеграции с supplier store
  usedAmount?: number // сколько уже использовано из платежа
  linkedOrders?: Array<{
    // множественные привязки к заказам
    orderId: string
    orderNumber?: string
    linkedAmount: number // сколько привязано к этому заказу
    linkedAt: string
    isActive: boolean // можно отвязать
  }>
  sourceOrderId?: string // Источник для автосинхронизации суммы
  lastAmountUpdate?: string // Когда последний раз менялась сумма
  amountHistory?: AmountChange[] // История изменений суммы
  autoSyncEnabled?: boolean // Разрешена ли автосинхронизация суммы

  // Payment completion fields
  paidAmount?: number
  paidDate?: string
}

export interface LinkPaymentToOrderDto {
  paymentId: string
  orderId: string
  linkAmount: number
  orderNumber?: string
}
export interface CreatePaymentDto {
  counteragentId: string
  counteragentName: string
  amount: number
  description: string
  dueDate?: string
  priority: PaymentPriority
  category: PendingPayment['category']
  invoiceNumber?: string
  notes?: string
  createdBy: TransactionPerformer
  // ✅ НОВЫЕ ПОЛЯ для создания платежа из заказа
  usedAmount?: number
  linkedOrders?: Array<{
    orderId: string
    orderNumber?: string
    linkedAmount: number
    linkedAt: string
    isActive: boolean
  }>
  sourceOrderId?: string
  autoSyncEnabled?: boolean
}

export interface ProcessPaymentDto {
  paymentId: string
  accountId: string
  actualAmount?: number // если отличается от запланированной
  notes?: string
  performedBy: TransactionPerformer
}

export interface PaymentFilters {
  status?: PaymentStatus | null
  priority?: PaymentPriority | null
}

export interface PaymentStatistics {
  totalPending: number
  totalAmount: number
  urgentCount: number
  overdueCount: number
}

// ============ CONSTANTS ============

export const EXPENSE_CATEGORIES = {
  daily: {
    product: 'Products',
    takeaway: 'Takeaway',
    ayu_cake: 'Ayu cake',
    utilities: 'Utilities',
    salary: 'Salary',
    renovation: 'Renovation',
    transport: 'Products Transport',
    cleaning: 'Cleaning',
    security: 'Security',
    village: 'Village',
    rent: 'Rent',
    other: 'Other'
  },
  investment: {
    shares: 'Shares',
    other: 'Other Investments'
  }
} as const

export const OPERATION_TYPES = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  correction: 'Correction'
} as const

export const PAYMENT_PRIORITIES = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный'
} as const

export const PAYMENT_STATUSES = {
  pending: 'Ожидает оплаты',
  processing: 'В обработке',
  completed: 'Оплачен',
  failed: 'Ошибка',
  cancelled: 'Отменен'
} as const

export const PAYMENT_CATEGORIES = {
  supplier: 'Supplier Payment',
  service: 'Service Payment',
  utilities: 'Utilities',
  salary: 'Salary',
  rent: 'Rent',
  maintenance: 'Maintenance',
  other: 'Other'
} as const

// ============ STORE TYPES ============

export interface LoadingState {
  accounts: boolean
  transactions: boolean
  operation: boolean
  transfer: boolean
  correction: boolean
  payments: boolean
}

export interface AccountStoreState {
  accounts: Account[]
  transactions: Transaction[]
  pendingPayments: PendingPayment[]
  filters: TransactionFilters
  paymentFilters: PaymentFilters
  selectedAccountId: string | null
  loading: LoadingState
  error: Error | null
  lastFetch: {
    accounts: string | null
    transactions: Record<string, string> // accountId -> timestamp
    payments: string | null
  }
}

// ✅ НОВЫЙ: История изменений суммы платежа
export interface AmountChange {
  oldAmount: number
  newAmount: number
  reason: AmountChangeReason
  changedAt: string
  changedBy: TransactionPerformer
  notes?: string
}

export type AmountChangeReason =
  | 'original_order' // Первоначальная сумма заказа
  | 'receipt_discrepancy' // Корректировка после приемки
  | 'manual_adjustment' // Ручная корректировка
  | 'supplier_credit' // Зачет от поставщика
  | 'payment_split' // Разделение платежа
  | 'order_cancellation' // Отмена заказа
  | 'other' // Другая причина

// ✅ ДОБАВИТЬ константы
export const AMOUNT_CHANGE_REASONS: Record<AmountChangeReason, string> = {
  original_order: 'Original Order Amount',
  receipt_discrepancy: 'Receipt Discrepancy Adjustment',
  manual_adjustment: 'Manual Adjustment',
  supplier_credit: 'Supplier Credit',
  payment_split: 'Payment Split',
  order_cancellation: 'Order Cancellation',
  other: 'Other'
}

// ✅ НОВЫЙ: DTO для обновления суммы платежа
export interface UpdatePaymentAmountDto {
  paymentId: string
  newAmount: number
  reason: AmountChange['reason']
  notes?: string
  userId?: string
}
