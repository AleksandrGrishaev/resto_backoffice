// src/stores/loyalty/loyaltyStore.ts - Loyalty program state management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  LoyaltySettings,
  StampCardInfo,
  StampCardListItem,
  AddStampsResult,
  CashbackResult,
  RedeemResult,
  ConvertResult,
  LoyaltyTransaction,
  RewardRedemption
} from './types'
import { loyaltyService } from './loyaltyService'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'LoyaltyStore'

export const useLoyaltyStore = defineStore('loyalty', () => {
  // State
  const settings = ref<LoyaltySettings | null>(null)
  const isLoading = ref(false)
  const initialized = ref(false)

  // Getters
  const stampThreshold = computed(() => settings.value?.stampThreshold ?? 80000)
  const stampsPerCycle = computed(() => settings.value?.stampsPerCycle ?? 15)

  function cashbackRateForTier(tier: string): number {
    if (!settings.value) return 5
    const tierConfig = settings.value.tiers.find(t => t.name === tier)
    return tierConfig?.cashbackPct ?? 5
  }

  // Actions
  async function initialize() {
    if (initialized.value) return
    isLoading.value = true

    try {
      settings.value = await loyaltyService.getSettings()
      initialized.value = true

      DebugUtils.store(MODULE_NAME, 'Initialized', {
        stampsPerCycle: settings.value.stampsPerCycle,
        tiers: settings.value.tiers.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Initialization failed', { error })
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function updateSettings(updates: Partial<LoyaltySettings>): Promise<void> {
    settings.value = await loyaltyService.updateSettings(updates)
    DebugUtils.store(MODULE_NAME, 'Settings updated')
  }

  // Stamp card operations
  async function addStamps(
    cardNumber: string,
    orderId: string | null,
    orderAmount: number
  ): Promise<AddStampsResult> {
    return loyaltyService.addStamps(cardNumber, orderId, orderAmount)
  }

  async function getCardInfo(cardNumber: string): Promise<StampCardInfo> {
    return loyaltyService.getCardInfo(cardNumber)
  }

  async function getCardById(cardId: string): Promise<StampCardInfo | null> {
    return loyaltyService.getCardById(cardId)
  }

  async function getActiveCardByCustomerId(customerId: string): Promise<StampCardInfo | null> {
    return loyaltyService.getActiveCardByCustomerId(customerId)
  }

  async function issueNewCard(): Promise<string> {
    return loyaltyService.issueNewCard()
  }

  async function linkCardToCustomer(cardNumber: string, customerId: string): Promise<void> {
    return loyaltyService.linkCardToCustomer(cardNumber, customerId)
  }

  async function listCards(): Promise<StampCardListItem[]> {
    return loyaltyService.listCards()
  }

  async function updateCard(
    cardId: string,
    updates: { status?: string; stamps?: number; cycle?: number; customer_id?: string | null }
  ): Promise<void> {
    return loyaltyService.updateCard(cardId, updates)
  }

  async function deleteCard(cardId: string): Promise<void> {
    return loyaltyService.deleteCard(cardId)
  }

  // Points operations
  async function applyCashback(
    customerId: string,
    orderId: string | null,
    orderAmount: number
  ): Promise<CashbackResult> {
    return loyaltyService.applyCashback(customerId, orderId, orderAmount)
  }

  async function redeemPoints(
    customerId: string,
    orderId: string | null,
    amount: number
  ): Promise<RedeemResult> {
    return loyaltyService.redeemPoints(customerId, orderId, amount)
  }

  async function convertCard(cardNumber: string, customerId: string): Promise<ConvertResult> {
    return loyaltyService.convertCard(cardNumber, customerId)
  }

  // Reward redemptions
  async function createRedemption(redemption: RewardRedemption): Promise<string> {
    return loyaltyService.createRedemption(redemption)
  }

  // Transactions
  async function getTransactions(
    customerId: string,
    limit?: number
  ): Promise<LoyaltyTransaction[]> {
    return loyaltyService.getTransactions(customerId, limit)
  }

  return {
    // State
    settings,
    isLoading,
    initialized,

    // Getters
    stampThreshold,
    stampsPerCycle,
    cashbackRateForTier,

    // Actions
    initialize,
    updateSettings,
    addStamps,
    getCardInfo,
    getCardById,
    getActiveCardByCustomerId,
    issueNewCard,
    linkCardToCustomer,
    listCards,
    updateCard,
    deleteCard,
    applyCashback,
    redeemPoints,
    convertCard,
    createRedemption,
    getTransactions
  }
})
