// src/stores/loyalty/supabaseMappers.ts - DB row <-> domain mappers

import type {
  LoyaltySettings,
  StampReward,
  TierConfig,
  LoyaltyTransaction,
  StampCardInfo
} from './types'

export function mapSettingsFromDb(row: any): LoyaltySettings {
  return {
    id: row.id,
    stampsPerCycle: row.stamps_per_cycle,
    stampThreshold: Number(row.stamp_threshold),
    stampLifetimeDays: row.stamp_lifetime_days,
    stampRewards: (row.stamp_rewards || []).map(mapStampRewardFromDb),
    pointsLifetimeDays: row.points_lifetime_days,
    conversionBonusPct: Number(row.conversion_bonus_pct),
    tierWindowDays: row.tier_window_days,
    maxTierDegradation: row.max_tier_degradation,
    tiers: (row.tiers || []).map(mapTierConfigFromDb),
    isActive: row.is_active,
    updatedAt: row.updated_at
  }
}

export function mapSettingsToDb(settings: Partial<LoyaltySettings>): Record<string, any> {
  const result: Record<string, any> = {}
  if (settings.stampsPerCycle !== undefined) result.stamps_per_cycle = settings.stampsPerCycle
  if (settings.stampThreshold !== undefined) result.stamp_threshold = settings.stampThreshold
  if (settings.stampLifetimeDays !== undefined)
    result.stamp_lifetime_days = settings.stampLifetimeDays
  if (settings.stampRewards !== undefined)
    result.stamp_rewards = settings.stampRewards.map(mapStampRewardToDb)
  if (settings.pointsLifetimeDays !== undefined)
    result.points_lifetime_days = settings.pointsLifetimeDays
  if (settings.conversionBonusPct !== undefined)
    result.conversion_bonus_pct = settings.conversionBonusPct
  if (settings.tierWindowDays !== undefined) result.tier_window_days = settings.tierWindowDays
  if (settings.maxTierDegradation !== undefined)
    result.max_tier_degradation = settings.maxTierDegradation
  if (settings.tiers !== undefined) result.tiers = settings.tiers.map(mapTierConfigToDb)
  if (settings.isActive !== undefined) result.is_active = settings.isActive
  return result
}

function mapStampRewardFromDb(r: any): StampReward {
  return {
    stamps: r.stamps,
    category: r.category,
    categoryIds: r.category_ids || [],
    maxDiscount: r.max_discount,
    redeemed: r.redeemed ?? false
  }
}

function mapStampRewardToDb(r: StampReward): any {
  return {
    stamps: r.stamps,
    category: r.category,
    category_ids: r.categoryIds || [],
    max_discount: r.maxDiscount
  }
}

function mapTierConfigFromDb(t: any): TierConfig {
  return {
    name: t.name,
    cashbackPct: t.cashback_pct,
    spendingThreshold: t.spending_threshold
  }
}

function mapTierConfigToDb(t: TierConfig): any {
  return {
    name: t.name,
    cashback_pct: t.cashbackPct,
    spending_threshold: t.spendingThreshold
  }
}

export function mapTransactionFromDb(row: any): LoyaltyTransaction {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    orderId: row.order_id || null,
    description: row.description || null,
    createdAt: row.created_at
  }
}

export function mapStampCardInfoFromRpc(data: any): StampCardInfo {
  return {
    cardId: data.card_id,
    cardNumber: data.card_number,
    status: data.status,
    stamps: data.stamps,
    stampsPerCycle: data.stamps_per_cycle,
    cycle: data.cycle,
    activeReward: data.active_reward ? mapStampRewardFromDb(data.active_reward) : null,
    allRewards: (data.all_rewards || []).map(mapStampRewardFromDb),
    lastVisit: data.last_visit || null,
    customerId: data.customer_id || null
  }
}
