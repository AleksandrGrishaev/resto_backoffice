// src/types/account.ts
import { BaseEntity } from './common'

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
