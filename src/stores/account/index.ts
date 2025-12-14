// src/stores/account/index.ts

// ============ TYPES ============
export * from './types'

// ============ CONSTANTS ============
export * from './constants'

// ============ ACCOUNT CONFIGURATION ============
export {
  initializeAccountConfig,
  getPOSCashAccountId,
  getBankAccountId,
  getCardAccountId,
  getPOSCashAccountWithFallback,
  isAccountConfigInitialized,
  isUUID,
  normalizeAccountId,
  ACCOUNT_CONFIG
} from './accountConfig'

// ============ SERVICES ============
export {
  accountService,
  transactionService,
  paymentService,
  resetMockData,
  getMockDataStats,
  addTestData
} from './service'

export { categoryService } from './categoryService'

// ============ STORE ============
export { useAccountStore } from './store'

// ============ MOCK DATA ============
// Mock data removed - now using Supabase-only implementation

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
  // Transaction categories
  TransactionCategory,
  CategoryType,
  CreateCategoryDto,
  UpdateCategoryDto,
  // Типы для платежей
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

// Re-export constants for backward compatibility
// (they are now in './constants.ts' but we export them here too)
