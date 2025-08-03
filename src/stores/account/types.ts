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
  expenseCategory?: ExpenseCategory
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
  expenseCategory?: ExpenseCategory
  performedBy: TransactionPerformer
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

// ============ STORE TYPES ============

export interface LoadingState {
  accounts: boolean
  transactions: boolean
  operation: boolean
  transfer: boolean
  correction: boolean
}

export interface AccountStoreState {
  accounts: Account[]
  transactions: Transaction[]
  filters: TransactionFilters
  selectedAccountId: string | null
  loading: LoadingState
  error: Error | null
  lastFetch: {
    accounts: string | null
    transactions: Record<string, string> // accountId -> timestamp
  }
}
