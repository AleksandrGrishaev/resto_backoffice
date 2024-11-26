// src/types/bill.ts
import { BaseEntity } from './common'
import { CustomerInfo } from './customer'
import { BaseItem } from './menu'

export interface Bill extends BaseEntity {
  billNumber: string
  status: BillStatus
  items: BillItem[]
  subtotal: number
  taxes: {
    serviceTax: number
    governmentTax: number
  }
  total: number
  deliveryType: DeliveryType
  customerInfo?: CustomerInfo
}

export interface BillItem extends BaseItem {
  id: string
  status: BillItemStatus
  orderId?: string
  discounts?: {
    type: 'percentage' | 'amount'
    value: number
    reason?: string
  }[]
}

export type BillStatus = 'active' | 'closed' | 'cancelled'
export type BillItemStatus = 'pending' | 'ordered' | 'cancelled' | 'completed'
export type DeliveryType = 'dine-in' | 'takeaway' | 'delivery'
