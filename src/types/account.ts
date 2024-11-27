// src/types/account.ts
import { BaseEntity } from './common'

export interface Account extends BaseEntity {
  name: string
  type: AccountType
  isActive: boolean
  balance: number
  description?: string
}

export type AccountType = 'cash' | 'bank' | 'card' | 'gojeck' | 'grab'
