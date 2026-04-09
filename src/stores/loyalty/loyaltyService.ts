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
      newCycle: result.new_cycle,
      loyaltyUpgraded: result.loyalty_upgraded ?? false
    }
  }

  async getCardById(cardId: string): Promise<StampCardInfo | null> {
    const { data, error } = await supabase
      .from('stamp_cards')
      .select('card_number')
      .eq('id', cardId)
      .maybeSingle()

    if (error || !data) return null
    return this.getCardInfo((data as any).card_number)
  }

  async getActiveCardByCustomerId(customerId: string): Promise<StampCardInfo | null> {
    const { data, error } = await supabase
      .from('stamp_cards')
      .select('card_number')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

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

  async getNextCardNumber(): Promise<string> {
    // Fetch all card numbers and find max numeric value
    // (can't rely on text sort — "SC-ALEX-001" sorts after "004")
    const { data, error } = await supabase.from('stamp_cards').select('card_number')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get card numbers', { error })
      throw error
    }

    let maxNumber = 0
    if (data) {
      for (const row of data) {
        const parsed = parseInt(row.card_number, 10)
        if (!isNaN(parsed) && parsed > maxNumber) {
          maxNumber = parsed
        }
      }
    }
    return String(maxNumber + 1).padStart(3, '0')
  }

  async issueNewCard(options?: {
    cardNumber?: string
    stamps?: number
    customerName?: string
    customerPhone?: string
  }): Promise<string> {
    const newNumber = options?.cardNumber || (await this.getNextCardNumber())

    // Create the card, optionally with a linked customer
    let customerId: string | undefined
    if (options?.customerName?.trim()) {
      // Create customer inline
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: options.customerName.trim(),
          phone: options.customerPhone?.trim() || null,
          loyalty_program: 'stamps'
        })
        .select('id')
        .single()

      if (customerError) {
        DebugUtils.error(MODULE_NAME, 'Failed to create customer for card', {
          error: customerError
        })
        throw customerError
      }
      customerId = customerData.id
    }

    const { error: insertError } = await supabase.from('stamp_cards').insert({
      card_number: newNumber,
      customer_id: customerId || null
    })

    if (insertError) {
      DebugUtils.error(MODULE_NAME, 'Failed to create stamp card', { error: insertError })
      throw insertError
    }

    // If initial stamps specified, add them
    if (options?.stamps && options.stamps > 0) {
      // Get the new card id
      const { data: cardData } = await supabase
        .from('stamp_cards')
        .select('id, cycle')
        .eq('card_number', newNumber)
        .single()

      if (cardData) {
        await this.setCardStamps(cardData.id, options.stamps, cardData.cycle)
      }
    }

    DebugUtils.info(MODULE_NAME, 'New stamp card issued', {
      cardNumber: newNumber,
      stamps: options?.stamps || 0,
      customerId
    })
    return newNumber
  }

  async searchCards(query: string): Promise<StampCardListItem[]> {
    const trimmed = query.trim()
    if (!trimmed) return []

    const { data, error } = await supabase
      .from('stamp_cards')
      .select('id, card_number, status, cycle, customer_id, created_at, customers(name)')
      .ilike('card_number', `%${trimmed}%`)
      .eq('status', 'active')
      .order('card_number', { ascending: true })
      .limit(10)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to search cards', { error })
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      cardNumber: row.card_number,
      status: row.status || 'active',
      stamps: 0, // Not available in simple query
      cycle: row.cycle || 1,
      customerId: row.customer_id,
      customerName: row.customers?.name || null,
      createdAt: row.created_at,
      lastStampAt: null
    }))
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

    // Switch customer to stamps program when a stamp card is linked
    const { error: custError } = await supabase
      .from('customers')
      .update({ loyalty_program: 'stamps' })
      .eq('id', customerId)

    if (custError) {
      DebugUtils.error(MODULE_NAME, 'Failed to switch customer to stamps program', { custError })
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
      totalVisits: result.total_visits,
      skipped: result.skipped ?? false
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
      rewardPoints: result.reward_points,
      rewardDetails: result.reward_details || [],
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

  /** Get all transactions across all customers (for audit/history) */
  async getAllTransactions(
    limit = 500
  ): Promise<(LoyaltyTransaction & { customerName?: string; performedBy?: string })[]> {
    // Fetch loyalty_transactions and stamp_entries in parallel
    const [txResult, stampResult] = await Promise.all([
      supabase
        .from('loyalty_transactions')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('stamp_entries')
        .select('*, stamp_cards(card_number, customer_id, customers(name))')
        .order('created_at', { ascending: false })
        .limit(limit)
    ])

    if (txResult.error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load all transactions', { error: txResult.error })
      throw txResult.error
    }

    const loyaltyRows = (txResult.data || []).map(row => ({
      ...mapTransactionFromDb(row),
      customerName: (row as any).customers?.name || '',
      performedBy: row.performed_by || null
    }))

    // Map stamp_entries into the same shape as loyalty transactions
    const stampRows = (stampResult.data || []).map((row: any) => ({
      id: row.id,
      customerId: row.stamp_cards?.customer_id || '',
      type: 'stamp' as any,
      amount: row.stamps,
      balanceAfter: 0,
      orderId: row.order_id || null,
      description: `+${row.stamps} stamp(s) on card ${row.stamp_cards?.card_number || '?'} (order ${row.order_amount ? 'Rp ' + Number(row.order_amount).toLocaleString('id-ID') : 'manual'})`,
      createdAt: row.created_at,
      customerName:
        row.stamp_cards?.customers?.name || `Card ${row.stamp_cards?.card_number || '?'}`,
      performedBy: null
    }))

    // Merge and sort by date descending
    return [...loyaltyRows, ...stampRows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  /** Atomic balance adjustment via RPC (transaction + balance update in one call) */
  async adjustBalance(customerId: string, amount: number, description: string): Promise<number> {
    const { data, error } = await supabase.rpc('adjust_loyalty_balance', {
      p_customer_id: customerId,
      p_amount: amount,
      p_description: description
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to adjust balance', { error })
      throw error
    }

    const result = data as any
    if (!result.success) throw new Error(result.error)

    DebugUtils.info(MODULE_NAME, 'Balance adjusted', {
      customerId,
      amount,
      newBalance: result.new_balance
    })
    return result.new_balance
  }

  /** Reverse loyalty cashback on payment refund */
  async reverseLoyaltyOnRefund(
    customerId: string,
    orderId: string,
    refundAmount: number
  ): Promise<{ success: boolean; reversed: number; newBalance?: number }> {
    const { data, error } = await supabase.rpc('reverse_loyalty_on_refund', {
      p_customer_id: customerId,
      p_order_id: orderId,
      p_refund_amount: refundAmount
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to reverse loyalty on refund', { error })
      throw error
    }

    const result = data as any
    if (!result.success) throw new Error(result.error)

    DebugUtils.info(MODULE_NAME, 'Loyalty reversed on refund', {
      customerId,
      reversed: result.reversed,
      newBalance: result.new_balance
    })
    return { success: true, reversed: result.reversed, newBalance: result.new_balance }
  }
}

// Singleton
export const loyaltyService = new LoyaltyService()
