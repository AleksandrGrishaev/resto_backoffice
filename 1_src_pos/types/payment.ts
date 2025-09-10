// src/types/payment.ts

import { BaseEntity } from './common'
import { AccountType } from './account'

export type PaymentStatus = 'unpaid' | 'new' | 'paid'
export type PaymentTransactionStatus = 'completed' | 'cancelled' | 'pending' | 'failed'

//#region Payment Interfaces

export interface BillPayment {
  transactionId: string
  amount: number
  timestamp: string
  items: string[] // ID оплаченных позиций
  paymentMethod: string
  status: PaymentTransactionStatus
}

export interface PaymentMethod extends BaseEntity {
  name: string
  isActive: boolean
  requiresDetails: boolean
  type: AccountType
  accountId?: string
}

// Платёж
export interface Payment extends BaseEntity {
  billId: string
  accountId: string
  amount: number
  method: string
  status: PaymentTransactionStatus
  items: string[] // ID оплаченных позиций
  metadata: {
    shiftId?: string
    employeeId: string
    deviceId: string
    tableId?: string
  }
}

// Данные для создания платежа
export interface PaymentData {
  billId: string
  items: string[]
  accountId: string
  amount: number
  method: string
}
//#endregion

//#region Status Interfaces
export interface TablePaymentStatus {
  totalAmount: number
  paidAmount: number
  lastPaymentId?: string
  lastPaymentTime?: string
}

export interface BillPaymentStatus {
  paymentStatus: PaymentStatus
  paymentTransactionId?: string
  paymentTimestamp?: string
}

//#endregion

//#region Validation Types
export interface ValidationResult {
  isValid: boolean
  code: string
  message: string
  data?: Record<string, any>
}

export interface PaymentValidationResult extends ValidationResult {
  payment?: Payment
}
//#endregion
