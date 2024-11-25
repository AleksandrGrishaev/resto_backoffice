// src/types/payment.ts
import { BaseEntity } from './common'

export interface PaymentMethod extends BaseEntity {
  name: string
  isActive: boolean
  requiresDetails: boolean
  type: 'cash' | 'card' | 'other'
}

export interface Payment extends BaseEntity {
  billId: string
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

export interface Shift extends BaseEntity {
  openedAt: string
  closedAt?: string
  initialBalance: number
  currentBalance: number
  status: ShiftStatus
  cashierId: string
  summary?: ShiftSummary
}

export interface ShiftSummary {
  totalSales: number
  totalCash: number
  totalCard: number
  billCount: number
  orderCount: number
  cancelledBills: number
  totalTaxes: {
    serviceTax: number
    governmentTax: number
  }
}

export type ShiftStatus = 'active' | 'closed' | 'pending_close'
