// src/types/payment.ts
import { BaseEntity } from './common'
import { AccountType } from './account'

/**
 * Payment Method - maps payment types to accounting accounts
 * Corresponds to payment_methods table in database
 */
export interface PaymentMethod extends BaseEntity {
  name: string // Display name (e.g., "Cash", "Credit Card")
  code: string // Unique code for programmatic use ('cash', 'card', 'qr', 'gopay')
  type: AccountType // Account type: 'cash' | 'bank' | 'card' | 'gojeck' | 'grab'
  accountId: string | null // Target account for this payment method (can be null if not mapped)
  isActive: boolean // Whether this payment method is available in POS UI
  requiresDetails: boolean // Whether additional details are required (e.g., card number)
  displayOrder: number // Sort order in UI (lower numbers appear first)
  icon?: string // Material Design icon name (e.g., 'mdi-cash')
  description?: string // Optional description for internal use
}

/**
 * DTO for creating a new payment method
 */
export interface CreatePaymentMethodDto {
  name: string
  code: string // Must be unique, lowercase alphanumeric
  type: AccountType
  accountId: string
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  description?: string
}

/**
 * DTO for updating an existing payment method
 */
export interface UpdatePaymentMethodDto {
  name?: string
  accountId?: string
  isActive?: boolean
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  description?: string
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
