// src/stores/account/index.ts

// ============ TYPES ============
export * from './types'

// ============ SERVICES ============
export {
  accountService,
  transactionService,
  paymentService,
  resetMockData,
  getMockDataStats,
  addTestData
} from './service'

// ============ STORE ============
export { useAccountStore } from './store'

// ============ MOCK DATA ============
export * from './mock'
export * from './paymentMock'

// ============ TYPE ALIASES FOR BACKWARD COMPATIBILITY ============
// Эти экспорты обеспечивают обратную совместимость с существующими импортами
export type {
  Account,
  AccountType,
  AccountWithOperations,
  Transaction,
  OperationType,
  CreateOperationDto,
  CreateTransferDto,
  CreateCorrectionDto,
  TransactionFilters,
  ExpenseCategory,
  TransactionPerformer,
  TransferDetails,
  DailyExpenseCategory,
  InvestmentCategory,
  // Новые типы для платежей
  PendingPayment,
  PaymentStatus,
  PaymentPriority,
  CreatePaymentDto,
  ProcessPaymentDto,
  PaymentFilters,
  PaymentStatistics,
  AmountChange,
  UpdatePaymentAmountDto
} from './types'

export {
  EXPENSE_CATEGORIES,
  OPERATION_TYPES,
  PAYMENT_PRIORITIES,
  PAYMENT_STATUSES,
  PAYMENT_CATEGORIES,
  AMOUNT_CHANGE_REASONS
} from './types'
