// src/stores/loyalty/index.ts - Re-exports

export { useLoyaltyStore } from './loyaltyStore'
export { loyaltyService } from './loyaltyService'
export type {
  LoyaltySettings,
  StampReward,
  TierConfig,
  StampCardInfo,
  StampCardListItem,
  LoyaltyTransaction,
  AddStampsResult,
  CashbackResult,
  RedeemResult,
  ConvertResult,
  RewardRedemption
} from './types'
