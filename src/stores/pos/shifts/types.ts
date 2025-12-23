// src/stores/pos/shifts/types.ts - SHIFTS TYPES

import type { BaseEntity, TransactionPerformer } from '@/types/common'
import type { Account, Transaction } from '@/stores/account/types'

// =============================================
// BASIC SHIFT TYPES
// =============================================

export type ShiftStatus = 'active' | 'completed' | 'cancelled' | 'suspended'
export type CashDiscrepancyType = 'shortage' | 'overage' | 'none'
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'offline'

// =============================================
// PAYMENT METHODS (from PaymentSettingsView)
// =============================================

export interface PaymentMethod {
  id: string
  name: string
  type: string // Supports any payment type: 'cash', 'bank', 'gojek', 'grab', 'bni', etc.
  isActive: boolean
  accountId?: string // Link to Account Store
  icon?: string
  sortOrder?: number
}

// =============================================
// MAIN SHIFT ENTITY
// =============================================

export interface PosShift extends BaseEntity {
  // Basic information
  shiftNumber: string // Shift number (e.g.: "SHIFT-001-2025-09-10")
  status: ShiftStatus

  // Cashier and time
  cashierId: string
  cashierName: string
  startTime: string
  endTime?: string
  duration?: number // In minutes

  // Starting cash
  startingCash: number
  startingCashVerified: boolean // Is starting amount verified

  // Ending cash (filled when closing)
  endingCash?: number
  expectedCash?: number // Expected cash amount
  cashDiscrepancy?: number // Difference (+ overage, - shortage)
  cashDiscrepancyType?: CashDiscrepancyType

  // Sales and payments
  totalSales: number
  totalTransactions: number
  paymentMethods: PaymentMethodSummary[] // Array of payment methods

  // Corrections and explanations
  corrections: ShiftCorrection[]
  notes?: string

  // Account Store integration
  accountBalances: ShiftAccountBalance[]

  // ✅ Sprint 3: Expense operations
  expenseOperations: ShiftExpenseOperation[] // Все расходные операции смены
  pendingPayments: string[] // ID платежей, ожидающих подтверждения

  // Sync information for the entire shift
  syncStatus: SyncStatus
  lastSyncAt?: string
  pendingSync: boolean

  // ✅ Sprint 4: Account sync tracking
  syncedToAccount?: boolean // Синхронизирована ли смена с acc_1
  syncedAt?: string // Когда синхронизирована
  accountTransactionIds?: string[] // IDs созданных транзакций в acc_1

  // ✅ Sprint 5: Offline-capable closing + sync queue
  syncAttempts?: number // Количество попыток синхронизации
  lastSyncAttempt?: string // Когда была последняя попытка
  syncError?: string // Последняя ошибка синхронизации
  syncQueuedAt?: string // Когда добавлена в очередь синхронизации

  // Metadata
  deviceId?: string
  location?: string
}

// =============================================
// SIMPLIFIED PAYMENT BREAKDOWN
// =============================================

export interface PaymentMethodSummary {
  methodId: string // Payment method ID
  methodName: string // Name (Cash, Card, etc.)
  methodType: PaymentMethod['type']
  count: number // Number of operations
  amount: number // Total amount
  percentage: number // Percentage of total sales
}

// =============================================
// SIMPLIFIED CORRECTIONS
// =============================================

export interface ShiftCorrection extends BaseEntity {
  shiftId: string
  type: 'cash_adjustment' | 'payment_correction' | 'refund' | 'void' | 'other'
  amount: number
  reason: string
  description: string
  performedBy: TransactionPerformer

  // Related data
  relatedOrderId?: string
  relatedPaymentId?: string

  // Impact on reporting
  affectsReporting: boolean
}

// =============================================
// SPRINT 3: EXPENSE OPERATIONS
// =============================================

/**
 * Тип расходной операции в смене
 */
export type ExpenseOperationType =
  | 'direct_expense' // Прямой расход из кассы (создан кассиром)
  | 'supplier_payment' // Платеж поставщику (из backoffice, требует подтверждения)
  | 'incoming_transfer' // Входящий перевод на кассу (для отображения)
  | 'unlinked_expense' // Расход без привязки к накладной (offline режим)
  | 'account_payment' // Платеж, уже проведенный через аккаунт (не списывается при закрытии)

/**
 * Статус привязки расхода к накладной
 */
export type ExpenseLinkingStatus =
  | 'unlinked' // Не привязан к накладной
  | 'partially_linked' // Частично привязан (сумма меньше расхода)
  | 'fully_linked' // Полностью привязан

/**
 * Статус расходной операции
 */
export type ExpenseOperationStatus =
  | 'pending' // Ожидает подтверждения (только для supplier_payment)
  | 'confirmed' // Подтверждено
  | 'rejected' // Отклонено
  | 'completed' // Завершено (для прямых расходов)

/**
 * Расходная операция в смене
 */
export interface ShiftExpenseOperation extends BaseEntity {
  shiftId: string
  type: ExpenseOperationType

  // Основная информация
  amount: number
  description: string
  category?: string // DailyExpenseCategory или другая категория

  // Контрагент (для supplier_payment и некоторых direct_expense)
  counteragentId?: string
  counteragentName?: string
  invoiceNumber?: string

  // Статус и подтверждение
  status: ExpenseOperationStatus
  performedBy: TransactionPerformer
  confirmedBy?: TransactionPerformer
  confirmedAt?: string
  rejectionReason?: string

  // Связь с другими системами
  relatedPaymentId?: string // ID PendingPayment из Account Store
  relatedTransactionId?: string // ID Transaction из Account Store
  relatedAccountId: string // Счет, с которого происходит расход

  // ✅ Sprint 6: Expense Linking (привязка к накладным)
  linkingStatus?: ExpenseLinkingStatus // Статус привязки к накладной
  linkedOrderId?: string // ID supplierstore_orders (привязанная накладная)
  linkedInvoiceId?: string // Альтернативный ID для invoice
  linkedAmount?: number // Сумма, привязанная к накладной
  unlinkedAmount?: number // Сумма, НЕ привязанная к накладной

  // Sync
  syncStatus: SyncStatus
  lastSyncAt?: string
  notes?: string
}

/**
 * DTO для создания прямого расхода из кассы
 */
export interface CreateDirectExpenseDto {
  shiftId: string
  accountId: string // Счет "касса"
  counteragentId?: string
  counteragentName?: string
  amount: number
  description: string
  category: string // DailyExpenseCategory
  invoiceNumber?: string
  notes?: string
  performedBy: TransactionPerformer
}

/**
 * DTO для подтверждения платежа поставщику
 */
export interface ConfirmSupplierPaymentDto {
  shiftId: string
  paymentId: string // ID из PendingPayment
  actualAmount?: number // Фактическая сумма (если отличается)
  notes?: string
  performedBy: TransactionPerformer
}

/**
 * DTO для отклонения платежа поставщику
 */
export interface RejectSupplierPaymentDto {
  shiftId: string
  paymentId: string
  reason: string
  performedBy: TransactionPerformer
}

// =============================================
// SPRINT 6: EXPENSE LINKING DTOs
// =============================================

/**
 * DTO для создания привязанного расхода (online, есть накладная)
 */
export interface CreateLinkedExpenseDto {
  shiftId: string
  accountId: string
  amount: number
  counteragentId: string
  counteragentName: string
  linkedOrderId: string // ID накладной supplierstore_orders
  linkedInvoiceNumber?: string
  notes?: string
  performedBy: TransactionPerformer
}

/**
 * DTO для создания непривязанного расхода (offline режим)
 */
export interface CreateUnlinkedExpenseDto {
  shiftId: string
  accountId: string
  amount: number
  counteragentId?: string
  counteragentName?: string
  description?: string
  notes?: string
  performedBy: TransactionPerformer
}

/**
 * DTO для привязки расхода к накладной (backoffice)
 */
export interface LinkExpenseToInvoiceDto {
  expenseId: string
  shiftId: string
  invoiceId: string // supplierstore_orders.id
  invoiceNumber: string
  linkAmount: number
  performedBy: TransactionPerformer
}

/**
 * DTO для отвязки расхода от накладной (Manager/Admin only)
 */
export interface UnlinkExpenseFromInvoiceDto {
  expenseId: string
  shiftId: string
  linkId: string // expense_invoice_links.id
  reason: string
  performedBy: TransactionPerformer
}

/**
 * DTO для записи платежа, уже проведенного через аккаунт
 * Используется когда оплата PO прошла через PaymentsView напрямую в аккаунт
 * Эта запись нужна для отображения в смене, но НЕ создает транзакцию при закрытии
 */
export interface CreateAccountPaymentExpenseDto {
  shiftId: string
  accountId: string
  amount: number
  counteragentId?: string
  counteragentName?: string
  linkedOrderId: string // ID supplierstore_orders
  linkedInvoiceNumber?: string
  transactionId: string // ID транзакции, уже созданной в аккаунте
  paymentId?: string // ID PendingPayment
  notes?: string
  performedBy: TransactionPerformer
}

// =============================================
// ACCOUNT BALANCES AT SHIFT START/END
// =============================================

export interface ShiftAccountBalance {
  accountId: string
  accountName: string
  accountType: Account['type']

  // Balances
  startingBalance: number
  endingBalance?: number
  expectedBalance?: number
  actualBalance?: number

  // Movements during shift
  totalIncome: number
  totalExpense: number
  transactionCount: number

  // ✅ Sprint 3: Expense operations tracking
  expenseOperations: ShiftExpenseOperation[] // История расходных операций

  // Discrepancies
  discrepancy?: number
  discrepancyExplained: boolean
  discrepancyNotes?: string

  // Sync status
  lastSyncAt?: string
  syncStatus: SyncStatus
}

// =============================================
// ACCOUNT STORE INTEGRATION
// =============================================

export interface ShiftAccountIntegration {
  // Records to create in Account Store
  pendingTransactions: ShiftTransaction[]

  // Account Store sync verification
  accountStoreSyncStatus: Record<string, SyncStatus>
  lastAccountStoreSync?: string

  // Sync conflicts
  syncConflicts: ShiftSyncConflict[]
}

export interface ShiftTransaction {
  id: string
  accountId: string
  type: Transaction['type']
  amount: number
  description: string
  performedBy: TransactionPerformer

  // POS specific fields
  shiftId: string
  orderId?: string
  paymentId?: string

  // Sync information
  syncStatus: SyncStatus
  syncAttempts: number
  lastSyncAttempt?: string
  syncError?: string
}

export interface ShiftSyncConflict {
  id: string
  type: 'balance_mismatch' | 'transaction_duplicate' | 'account_not_found'
  description: string
  shiftTransactionId?: string
  accountStoreTransactionId?: string
  suggestedResolution: string
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: TransactionPerformer
}

// =============================================
// OFFLINE MODE
// =============================================

export interface OfflineShiftData {
  shiftId: string

  // Data for synchronization
  unsyncedTransactions: ShiftTransaction[]
  unsyncedCorrections: ShiftCorrection[]
  unsyncedOrders: string[] // Order IDs for synchronization

  // Offline session metadata
  offlineStartTime: string
  offlineEndTime?: string
  offlineDuration?: number

  // Conflicts during recovery
  conflicts: OfflineConflict[]

  // Data size
  dataSize: number // In bytes
  estimatedSyncTime?: number // Sync time estimation
}

export interface OfflineConflict {
  id: string
  type: 'timestamp_conflict' | 'data_changed' | 'account_modified'
  localData: any
  serverData: any
  suggestedResolution: 'use_local' | 'use_server' | 'merge' | 'manual'
  isResolved: boolean
}

// =============================================
// SIMPLE SHIFT REPORT
// =============================================

export interface ShiftReport {
  shift: PosShift

  // Basic totals
  summary: ShiftBasicSummary

  // Corrections
  corrections: ShiftCorrection[]

  // Integration status
  integrationStatus: ShiftIntegrationStatus
}

export interface ShiftBasicSummary {
  // Shift start and end
  startTime: string
  endTime?: string
  duration?: number // In minutes

  // Basic statistics
  totalSales: number
  totalTransactions: number
  averageTransactionValue: number

  // By payment method
  cashSales: number
  cardSales: number
  digitalSales: number

  // Refunds and voids
  refunds: number
  voids: number

  // Net revenue
  netRevenue: number

  // Discrepancies
  totalDiscrepancies: number
  unexplainedDiscrepancies: number
}

export interface ShiftIntegrationStatus {
  accountStoreSync: {
    status: SyncStatus
    lastSync?: string
    pendingTransactions: number
    conflicts: number
  }

  inventorySync: {
    status: SyncStatus
    lastSync?: string
    pendingUpdates: number
  }

  overallHealth: 'healthy' | 'warning' | 'error'
}

// =============================================
// DTOs FOR CREATE AND UPDATE
// =============================================

export interface CreateShiftDto {
  cashierId: string
  cashierName: string
  startingCash: number
  notes?: string
  deviceId?: string
  location?: string
}

export interface EndShiftDto {
  shiftId: string
  endingCash: number
  actualAccountBalances: Record<string, number> // accountId -> balance
  corrections: Omit<ShiftCorrection, 'id' | 'shiftId' | 'createdAt' | 'updatedAt'>[]
  notes?: string
  performedBy: TransactionPerformer
  // Payment methods summary (calculated from actual payments)
  paymentMethods?: PaymentMethodSummary[]
}

export interface UpdateShiftDto {
  shiftId: string
  corrections?: Omit<ShiftCorrection, 'id' | 'shiftId' | 'createdAt' | 'updatedAt'>[]
  notes?: string
  deviceId?: string
}

// =============================================
// SERVICE RESPONSE TYPE
// =============================================

export interface ServiceResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

// =============================================
// SPRINT 5: SYNC QUEUE
// =============================================

/**
 * Элемент очереди синхронизации
 * Сохраняется в localStorage для retry
 */
export interface SyncQueueItem {
  shiftId: string
  addedAt: string
  attempts: number
  lastAttempt?: string
  lastError?: string
}

// =============================================
// INTEGRATION ARCHITECTURE CLARIFICATION
// =============================================

/*
INTEGRATION ARCHITECTURE:

1. **SALES WORKFLOW**:
   Sale → POS Payment → Shift Transaction → Account Store
   (prices taken from local Menu Store cache, not from network)

2. **ORDERS WORKFLOW** (TODO for future):
   Order → Kitchen (direct, bypassing shift)
   Order → Statistics (possibly through shift, decide later)

3. **OFFLINE SUPPORT**:
   - All FINANCIAL operations saved in shift
   - Kitchen orders go direct (if connection available)
   - When connection restored - sync ONLY finances

4. **INTEGRATION**:
   - Shift Store → Account Store (create Transaction)
   - Shift Store → Inventory Store (deduct items on sale)
   - Menu Store → local cache (prices loaded in advance)

5. **SYNC STATUS**:
   - Shift has overall syncStatus
   - Each ShiftTransaction has its own syncStatus
   - DON'T accumulate, sync and mark as synced
   - Conflicts resolved through UI

6. **PAYMENT METHODS**:
   - PaymentMethod array from PaymentSettingsView
   - Each method linked to Account via accountId
   - Dynamic add/remove payment methods

TODO:
- Decide order fate (statistics vs direct dispatch)
- Implement menu caching for offline
- UI for sync conflict resolution
- Integration with PaymentSettingsView for payment methods
*/
