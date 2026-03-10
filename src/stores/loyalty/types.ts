// src/stores/loyalty/types.ts - Loyalty program types

export interface LoyaltySettings {
  id: string
  stampsPerCycle: number
  stampThreshold: number
  stampLifetimeDays: number
  stampRewards: StampReward[]
  pointsLifetimeDays: number
  conversionBonusPct: number
  tierWindowDays: number
  maxTierDegradation: number
  tiers: TierConfig[]
  isActive: boolean
  updatedAt: string
}

export interface StampReward {
  stamps: number
  category: string
  categoryIds: string[] // menu_categories UUIDs (empty = "any")
  maxDiscount: number
  redeemed: boolean // whether this tier was already used in current cycle
}

export interface TierConfig {
  name: string
  cashbackPct: number
  spendingThreshold: number
}

export interface StampCardInfo {
  cardId: string
  cardNumber: string
  status: 'active' | 'converted' | 'expired'
  stamps: number
  stampsPerCycle: number
  cycle: number
  activeReward: StampReward | null
  allRewards: StampReward[]
  lastVisit: string | null
  customerId: string | null
}

export interface StampCardListItem {
  id: string
  cardNumber: string
  status: 'active' | 'converted' | 'expired'
  stamps: number
  cycle: number
  customerId: string | null
  customerName: string | null
  createdAt: string
  lastStampAt: string | null
}

export interface LoyaltyTransaction {
  id: string
  customerId: string
  type: 'cashback' | 'redemption' | 'conversion' | 'adjustment' | 'expiration'
  amount: number
  balanceAfter: number
  orderId: string | null
  description: string | null
  createdAt: string
}

export interface AddStampsResult {
  success: boolean
  stampsAdded: number
  totalStamps: number
  stampsPerCycle: number
  availableRewards: StampReward[]
  newCycle: boolean
  error?: string
}

export interface CashbackResult {
  success: boolean
  cashback: number
  cashbackPct: number
  tier: string
  newBalance: number
  totalVisits: number
  error?: string
}

export interface RedeemResult {
  success: boolean
  redeemed: number
  newBalance: number
  error?: string
}

export interface RewardRedemption {
  cardId: string
  cycle: number
  orderId: string | null
  paymentId: string | null
  discountEventId: string | null
  rewardTier: number
  category: string
  categoryIds: string[]
  maxDiscount: number
  actualDiscount: number
  stampsAtRedemption: number
}

export interface ConvertResult {
  success: boolean
  stamps: number
  baseAmount: number
  cashbackPct: number
  points: number
  bonus: number
  totalPoints: number
  newBalance: number
  error?: string
}
