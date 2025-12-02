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
  | 'food_cost' // Negative batch write-offs (expense)
  | 'inventory_variance' // Reconciliation corrections (income/expense)
  | 'inventory_adjustment' // Monthly physical count, spoilage (income/expense)
  | 'training_education' // Education write-offs (OPEX)
  | 'recipe_development' // Recipe testing write-offs (OPEX)
  | 'marketing' // Marketing expenses (OPEX)
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
}

export interface Transaction extends BaseEntity {
  accountId: string
  type: OperationType
  amount: number
  description: string

  balanceAfter: number
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

  // ✅ Sprint 3: POS Cashier Confirmation Integration
  requiresCashierConfirmation?: boolean // Требуется подтверждение кассира (для платежей на счет "касса")
  confirmationStatus?: 'pending' | 'confirmed' | 'rejected' // Статус подтверждения
  confirmedBy?: TransactionPerformer // Кто подтвердил операцию
  confirmedAt?: string // Когда подтверждено
  rejectionReason?: string // Причина отклонения
  assignedShiftId?: string // ID смены, которой назначена операция
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

// ============ NOTE ============
// Constants have been moved to './constants.ts'
// Runtime account configuration is in './accountConfig.ts'
// This file now contains only types and interfaces
//
// Re-export constants for backwards compatibility
export {
  POS_CASH_ACCOUNT_ID,
  EXPENSE_CATEGORIES,
  OPERATION_TYPES,
  PAYMENT_PRIORITIES,
  PAYMENT_STATUSES,
  PAYMENT_CATEGORIES,
  AMOUNT_CHANGE_REASONS
} from './constants'

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
  accountTransactions: Record<string, Transaction[]>
  allTransactionsCache?: Transaction[]
  cacheTimestamp?: string
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

// ✅ НОВЫЙ: DTO для обновления суммы платежа
export interface UpdatePaymentAmountDto {
  paymentId: string
  newAmount: number
  reason: AmountChange['reason']
  notes?: string
  userId?: string
}

export interface CreateHistoricalTransactionDto extends CreateOperationDto {
  createdAt: string
  isHistoricalCorrection?: boolean
}

export interface BalanceValidationResult {
  isValid: boolean
  accountId: string
  expectedBalance: number
  actualBalance: number
  discrepancy: number
  affectedTransactionIds: string[]
  message?: string
}

export interface BalanceRecalculationContext {
  accountId: string
  fromDate: string
  affectedTransactionIds: string[]
  recalculatedCount: number
  updatedAccountBalance: number
  processingTime?: number
}
