// src/types/payment.ts
import { BaseEntity } from './common'
import { AccountType } from './account'

export interface PaymentMethod extends BaseEntity {
  name: string
  isActive: boolean
  requiresDetails: boolean
  type: AccountType // Изменяем на AccountType
  accountId?: string // Ссылка на аккаунт
}

export interface Payment extends BaseEntity {
  billId: string
  accountId: string // Добавляем связь с аккаунтом
  amount: number
  method: string
  status: PaymentStatus
  details?: {
    cardType?: string
    lastDigits?: string
    transactionId?: string
  }
}

export type PaymentStatus = 'completed' | 'cancelled' | 'pending' | 'failed'
