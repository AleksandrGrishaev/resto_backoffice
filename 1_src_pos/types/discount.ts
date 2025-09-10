// src/types/discount.ts
import { BaseEntity } from './common'

export type DiscountType = 'item' | 'customer'
export type DiscountValueType = 'percent'

export interface Discount extends BaseEntity {
  id: string
  name: string
  description?: string
  type: DiscountType
  value: number // процент скидки
  isActive: boolean
  minAmount?: number // минимальная сумма для применения
}

export interface AppliedDiscount {
  id: string
  discountId: string
  value: number // процент скидки
  appliedAt: string
  appliedBy: string
  discountedAmount: number // сумма скидки в деньгах
}
