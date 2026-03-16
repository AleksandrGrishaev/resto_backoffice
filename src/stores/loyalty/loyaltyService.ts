// src/stores/loyalty/loyaltyService.ts - Loyalty RPC operations

import { supabase } from '@/supabase/client'
import type {
  LoyaltySettings,
  LoyaltyTransaction,
  StampCardInfo,
  StampCardListItem,
  AddStampsResult,
  CashbackResult,
  RedeemResult,
  ConvertResult,
  RewardRedemption
} from './types'
import {
  mapSettingsFromDb,
  mapSettingsToDb,
  mapTransactionFromDb,
  mapStampCardInfoFromRpc
} from './supabaseMappers'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'LoyaltyService'

export class LoyaltyService {
  // =====================================================
  // SETTINGS
  // =====================================================

  async getSettings(): Promise<LoyaltySettings> {
    const { data, error } = await supabase.from('loyalty_settings').select('*').limit(1).single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load loyalty settings', { error })
      throw error
    }

    return mapSettingsFromDb(data)
  }

  async updateSettings(updates: Partial<LoyaltySettings>): Promise<LoyaltySettings> {
    // Get current settings ID first
    const current = await this.getSettings()

    const { data, error } = await supabase
      .from('loyalty_settings')
      .update(mapSettingsToDb(updates))
      .eq('id', current.id)
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update loyalty settings', { error })
      throw error
    }

    return mapSettingsFromDb(data)
  }

  // =====================================================
  // STAMP CARDS (via RPC)
  // =====================================================

  async addStamps(
    cardNumber: string,
    orderId: string | null,
    orderAmount: number
  ): Promise<AddStampsResult> {
    const { data, error } = await supabase.rpc('add_stamps', {
      p_card_number: cardNumber,
      p_order_id: orderId,
      p_order_amount: orderAmount
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to add stamps', { error })
      throw error
    }

    const result = data as any
    if (!result.success) throw new Error(result.error)

    return {
      success: true,
      stampsAdded: result.stamps_added,
      totalStamps: result.total_stamps,
      stampsPerCycle: result.stamps_per_cycle,
      availableRewards: (result.available_rewards || []).map((r: any) => ({
        stamps: r.stamps,
        category: r.category,
        categoryIds: r.category_ids || [],
        maxDiscount: r.max_discount,
        redeemed: r.redeemed ?? false
      })),
      newCycle: result.new_cycle
    }
  }

  async getCardById(cardId: string): Promise<StampCardInfo | null> {
    const { data, error } = await supabase
      .from('stamp_cards')
      .select('card_number')
      .eq('id', cardId)
      .single()

    if (error || !data) return null
    return this.getCardInfo((data as any).card_number)
  }

  async getCardInfo(cardNumber: string): Promise<StampCardInfo> {
    const { data, error } = await supabase.rpc('get_stamp_card_info', {
      p_card_number: cardNumber
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get card info', { error })
      throw error
    }

    const result = data as any
    if (!result.success) throw new Error(result.error)

    return mapStampCardInfoFromRpc(result)
  }

  async issueNewCard(): Promise<string> {
    // Get next card number
    const { data, error } = await supabase
      .from('stamp_cards')
      .select('card_number')
      .order('card_number', { ascending: false })
      .limit(1)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get last card number', { error })
      throw error
    }

    const lastNumber = data && data.length > 0 ? parseInt(data[0].card_number, 10) : 0
    const newNumber = String(lastNumber + 1).padStart(3, '0')

    const { error: insertError } = await supabase
      .from('stamp_cards')
      .insert({ card_number: newNumber })

    if (insertError) {
      DebugUtils.error(MODULE_NAME, 'Failed to create stamp card', { error: insertError })
      throw insertError
    }

    DebugUtils.info(MODULE_NAME, 'New stamp card issued', { cardNumber: newNumber })
    return newNumber
  }

  async listCards(): Promise<StampCardListItem[]> {
    // Use raw SQL because stamps are computed from stamp_entries table
    const { data, error } = await supabase.rpc('list_stamp_cards' as any)

    if (error) {
      // Fallback: simple query without stamp counts
      DebugUtils.info(MODULE_NAME, 'RPC list_stamp_cards not available, using fallback', { error })
      return this.listCardsFallback()
    }

    return ((data as any[]) || []).map((wrapper: any) => {
      // RPC SETOF JSONB wraps each row in a key matching the function name
      const row = wrapper.list_stamp_cards || wrapper
      return {
        id: row.id,
        cardNumber: row.card_number,
        status: row.status || 'active',
        stamps: row.stamps || 0,
        cycle: row.cycle || 1,
        customerId: row.customer_id,
        customerName: row.customer_name || null,
        createdAt: row.created_at,
        lastStampAt: row.last_stamp_at
      }
    })
  }

  private async listCardsFallback(): Promise<StampCardListItem[]> {
    const { data, error } = await supabase
      .from('stamp_cards')
      .select('id, card_number, status, cycle, customer_id, created_at, customers(name)')
      .order('card_number', { ascending: true })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to list stamp cards (fallback)', { error })
      throw error
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      cardNumber: row.card_number,
      status: row.status || 'active',
      stamps: 0,
      cycle: row.cycle || 1,
      customerId: row.customer_id,
      customerName: row.customers?.name || null,
      createdAt: row.created_at,
      lastStampAt: null
    }))
  }

  async updateCard(
    cardId: string,
    updates: { status?: string; stamps?: number; cycle?: number; customer_id?: string | null }
  ): Promise<void> {
    // Update card fields
    const cardUpdates: Record<string, any> = {}
    if (updates.status !== undefined) cardUpdates.status = updates.status
    if (updates.cycle !== undefined) cardUpdates.cycle = updates.cycle
    if (updates.customer_id !== undefined) cardUpdates.customer_id = updates.customer_id

    if (Object.keys(cardUpdates).length > 0) {
      const { error } = await supabase.from('stamp_cards').update(cardUpdates).eq('id', cardId)

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update stamp card', { error })
        throw error
      }
    }

    // Stamps are stored in stamp_entries, so to set stamps we need to adjust
    if (updates.stamps !== undefined) {
      await this.setCardStamps(cardId, updates.stamps, updates.cycle)
    }

    DebugUtils.info(MODULE_NAME, 'Stamp card updated', { cardId, updates })
  }

  async deleteCard(cardId: string): Promise<void> {
    // Delete stamp entries first (FK constraint)
    const { error: entriesError } = await supabase
      .from('stamp_entries')
      .delete()
      .eq('card_id', cardId)

    if (entriesError) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete stamp entries', { error: entriesError })
      throw entriesError
    }

    const { error } = await supabase.from('stamp_cards').delete().eq('id', cardId)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete stamp card', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Stamp card deleted', { cardId })
  }

  /** Set stamps to exact value by adjusting stamp_entries */
  private async setCardStamps(cardId: string, targetStamps: number, cycle?: number): Promise<void> {
    // Get current cycle
    const { data: card } = await supabase
      .from('stamp_cards')
      .select('cycle')
      .eq('id', cardId)
      .single()

    const currentCycle = cycle ?? card?.cycle ?? 1

    // Get current stamps for this cycle
    const { data: entries } = await supabase
      .from('stamp_entries')
      .select('stamps')
      .eq('card_id', cardId)
      .eq('cycle', currentCycle)

    const currentStamps = (entries || []).reduce((sum, e) => sum + (e.stamps || 0), 0)
    const diff = targetStamps - currentStamps

    if (diff === 0) return

    // expires_at is NOT NULL — set to 1 year from now for manual adjustments
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    if (diff > 0) {
      // Add stamps
      const { error } = await supabase.from('stamp_entries').insert({
        card_id: cardId,
        stamps: diff,
        cycle: currentCycle,
        order_amount: 0,
        expires_at: expiresAt
      })
      if (error) throw error
    } else {
      // Remove stamps: delete entries and re-add with correct count
      const { error: delError } = await supabase
        .from('stamp_entries')
        .delete()
        .eq('card_id', cardId)
        .eq('cycle', currentCycle)

      if (delError) throw delError

      if (targetStamps > 0) {
        const { error } = await supabase.from('stamp_entries').insert({
          card_id: cardId,
          stamps: targetStamps,
          cycle: currentCycle,
          order_amount: 0,
          expires_at: expiresAt
        })
        if (error) throw error
      }
    }
  }

  async linkCardToCustomer(cardNumber: string, customerId: string): Promise<void> {
    const { error } = await supabase
      .from('stamp_cards')
      .update({ customer_id: customerId })
      .eq('card_number', cardNumber)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to link card to customer', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Card linked to customer', { cardNumber, customerId })
  }

  // =====================================================
  // POINTS (via RPC)
  // =====================================================

  async applyCashback(
    customerId: string,
    orderId: string | null,
    orderAmount: number
  ): Promise<CashbackResult> {
    const { data, error } = await supabase.rpc('apply_cashback', {
      p_customer_id: customerId,
      p_order_id: orderId,
      p_order_amount: orderAmount
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply cashback', { error })
      throw error
    }

    const result = data as any
    if (!result.success) throw new Error(result.error)

    return {
      success: true,
      cashback: result.cashback,
      cashbackPct: result.cashback_pct,
      tier: result.tier,
      newBalance: result.new_balance,
      totalVisits: result.total_visits
    }
  }

  async redeemPoints(
    customerId: string,
    orderId: string | null,
    amount: number
  ): Promise<RedeemResult> {
    const { data, error } = await supabase.rpc('redeem_points', {
      p_customer_id: customerId,
      p_order_id: orderId,
      p_amount: amount
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to redeem points', { error })
      throw error
    }

    const result = data as any
    if (!result.success) throw new Error(result.error)

    return {
      success: true,
      redeemed: result.redeemed,
      newBalance: result.new_balance
    }
  }

  async convertCard(cardNumber: string, customerId: string): Promise<ConvertResult> {
    const { data, error } = await supabase.rpc('convert_stamp_card', {
      p_card_number: cardNumber,
      p_customer_id: customerId
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to convert card', { error })
      throw error
    }

    const result = data as any
    if (!result.success) throw new Error(result.error)

    return {
      success: true,
      stamps: result.stamps,
      baseAmount: result.base_amount,
      cashbackPct: result.cashback_pct,
      points: result.points,
      bonus: result.bonus,
      totalPoints: result.total_points,
      newBalance: result.new_balance
    }
  }

  // =====================================================
  // REWARD REDEMPTIONS
  // =====================================================

  async createRedemption(redemption: RewardRedemption): Promise<string> {
    const { data, error } = await supabase
      .from('stamp_reward_redemptions')
      .insert({
        card_id: redemption.cardId,
        cycle: redemption.cycle,
        order_id: redemption.orderId,
        payment_id: redemption.paymentId,
        discount_event_id: redemption.discountEventId,
        reward_tier: redemption.rewardTier,
        category: redemption.category,
        category_ids: redemption.categoryIds,
        max_discount: redemption.maxDiscount,
        actual_discount: redemption.actualDiscount,
        stamps_at_redemption: redemption.stampsAtRedemption
      })
      .select('id')
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create reward redemption', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Reward redemption created', {
      cardId: redemption.cardId,
      tier: redemption.rewardTier,
      discount: redemption.actualDiscount
    })

    return (data as any).id
  }

  // =====================================================
  // TRANSACTIONS
  // =====================================================

  async getTransactions(customerId: string, limit = 50): Promise<LoyaltyTransaction[]> {
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load transactions', { error })
      throw error
    }

    return (data || []).map(mapTransactionFromDb)
  }
}

// Singleton
export const loyaltyService = new LoyaltyService()
