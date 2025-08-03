// src/stores/account/index.ts

// ============ TYPES ============
export * from './types'

// ============ SERVICES ============
export {
  accountService,
  transactionService,
  resetMockData,
  getMockDataStats,
  addTestData
} from './service'

// ============ STORE ============
export { useAccountStore } from './store'

// ============ MOCK DATA ============
export * from './mock'

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
  InvestmentCategory
} from './types'

export { EXPENSE_CATEGORIES, OPERATION_TYPES } from './types'
