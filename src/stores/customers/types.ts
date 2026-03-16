// src/stores/customers/types.ts - Customer types

export type CustomerTier = 'member' | 'regular' | 'vip'
export type CustomerStatus = 'active' | 'blocked'

export interface Customer {
  id: string
  name: string
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
  disableLoyaltyAccrual: boolean // skip stamps/cashback accrual
  discountNote: string | null // e.g. "Founder", "VIP friend"
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}
