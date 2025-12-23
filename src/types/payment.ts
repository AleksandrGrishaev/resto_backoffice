// src/types/payment.ts
import { BaseEntity } from './common'

/**
 * Payment Type - simplified to two categories
 * - cash: Physical cash payments (goes to cash account)
 * - bank: Non-cash payments (card, QR, e-wallet → bank/card accounts)
 */
export type PaymentType = 'cash' | 'bank'

/**
 * Payment Method - maps payment types to accounting accounts
 * Corresponds to payment_methods table in database
 */
export interface PaymentMethod extends BaseEntity {
  name: string // Display name (e.g., "Cash", "Credit Card", "GoPay")
  code: string // Unique code for programmatic use ('cash', 'card', 'qr', 'gopay')
  type: PaymentType // Payment mechanism: 'cash' (physical) or 'bank' (electronic)
  accountId: string | null // Target account for this payment method (required for saving)
  isActive: boolean // Whether this payment method is available in POS UI
  isPosСashRegister: boolean // Is this the main POS cash register for shift management?
  requiresDetails: boolean // Whether additional details are required (e.g., card number)
  displayOrder: number // Sort order in UI (lower numbers appear first)
  icon?: string // Material Design icon name (e.g., 'mdi-cash')
  iconColor?: string // Icon color for POS UI (Vuetify color name or hex: 'primary', '#FF5733')
  description?: string // Optional description for internal use
}

/**
 * DTO for creating a new payment method
 */
export interface CreatePaymentMethodDto {
  name: string
  code: string // Must be unique, lowercase alphanumeric
  type: PaymentType // 'cash' or 'bank'
  accountId: string // Required - target account for this payment method
  isPosСashRegister?: boolean // Set to true to designate as main POS cash register
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  iconColor?: string // Icon color (Vuetify color name or hex)
  description?: string
}

/**
 * DTO for updating an existing payment method
 */
export interface UpdatePaymentMethodDto {
  name?: string
  accountId?: string
  type?: PaymentType // 'cash' or 'bank'
  isActive?: boolean
  isPosСashRegister?: boolean // Only one can be true at a time
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  iconColor?: string // Icon color (Vuetify color name or hex)
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
