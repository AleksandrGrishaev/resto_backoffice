// src/stores/customers/types.ts - Customer types

export type CustomerTier = 'member' | 'regular' | 'vip'
export type CustomerStatus = 'active' | 'blocked'
export type LoyaltyProgram = 'stamps' | 'cashback'

export interface Customer {
  id: string
  name: string
  email: string | null
  telegramId: string | null
  telegramUsername: string | null
  phone: string | null
  token: string
  tier: CustomerTier
  tierUpdatedAt: string | null
  loyaltyBalance: number
  totalSpent: number
  spent90d: number
  totalVisits: number
  averageCheck: number
  firstVisitAt: string | null
  lastVisitAt: string | null
  notes: string | null
  personalDiscount: number // 0-100, auto-applied at checkout
  loyaltyProgram: LoyaltyProgram // 'stamps' (new customers) or 'cashback' (after first card cycle)
  disableLoyaltyAccrual: boolean // skip stamps/cashback accrual
  discountNote: string | null // e.g. "Founder", "VIP friend"
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}
