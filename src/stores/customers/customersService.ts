// src/stores/customers/customersService.ts - Supabase CRUD operations

import { supabase } from '@/supabase/client'
import type { Customer } from './types'
import { mapCustomerFromDb, mapCustomerToDb } from './supabaseMappers'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'CustomersService'

export class CustomersService {
  async loadAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .is('merged_into', null)
      .order('last_visit_at', { ascending: false, nullsFirst: false })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load customers', { error })
      throw error
    }

    return (data || []).map(mapCustomerFromDb)
  }

  async fetchById(id: string): Promise<Customer> {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch customer', { error })
      throw error
    }

    return mapCustomerFromDb(data)
  }

  async search(query: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('status', 'active')
      .is('merged_into', null)
      .or(`name.ilike.%${query}%,telegram_username.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('last_visit_at', { ascending: false, nullsFirst: false })
      .limit(20)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to search customers', { error })
      throw error
    }

    return (data || []).map(mapCustomerFromDb)
  }

  async fetchByToken(token: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch customer by token', { error })
      throw error
    }

    return data ? mapCustomerFromDb(data) : null
  }

  async create(data: Partial<Customer>): Promise<Customer> {
    const { data: row, error } = await supabase
      .from('customers')
      .insert(mapCustomerToDb(data))
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create customer', { error })
      throw error
    }

    return mapCustomerFromDb(row)
  }

  /** Update customer visit stats (total_spent, total_visits, average_check, last_visit_at) */
  async updateStats(
    customerId: string,
    orderId: string | null,
    orderAmount: number
  ): Promise<{
    success: boolean
    totalSpent?: number
    totalVisits?: number
    averageCheck?: number
    tier?: string
    previousTier?: string
    tierChanged?: boolean
    spentWindow?: number
  }> {
    const { data, error } = await supabase.rpc('update_customer_stats', {
      p_customer_id: customerId,
      p_order_id: orderId,
      p_order_amount: orderAmount
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update customer stats', { error })
      throw error
    }

    const result = data as any
    if (!result.success) {
      DebugUtils.error(MODULE_NAME, 'update_customer_stats RPC failed', { error: result.error })
      return { success: false }
    }

    return {
      success: true,
      totalSpent: result.total_spent,
      totalVisits: result.total_visits,
      averageCheck: result.average_check,
      tier: result.tier,
      previousTier: result.previous_tier,
      tierChanged: result.tier_changed,
      spentWindow: result.spent_window
    }
  }

  /** Recalculate tiers for all digital customers (upgrades + downgrades) */
  async recalculateTiers(): Promise<{
    success: boolean
    upgraded?: number
    downgraded?: number
    unchanged?: number
  }> {
    const { data, error } = await supabase.rpc('recalculate_tiers')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate tiers', { error })
      return { success: false }
    }

    const result = data as any
    if (!result.success) {
      DebugUtils.error(MODULE_NAME, 'recalculate_tiers RPC failed', { error: result.error })
      return { success: false }
    }

    return {
      success: true,
      upgraded: result.upgraded,
      downgraded: result.downgraded,
      unchanged: result.unchanged
    }
  }

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(mapCustomerToDb(updates))
      .eq('id', id)
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update customer', { error })
      throw error
    }

    return mapCustomerFromDb(data)
  }

  /** Merge source customer into target. Transfers all data, marks source as merged. */
  async mergeCustomers(
    sourceId: string,
    targetId: string,
    fieldOverrides?: Record<string, any>
  ): Promise<{
    success: boolean
    error?: string
    transferred?: {
      orders: number
      transactions: number
      points: number
      stamp_cards: number
      identities: number
      invites: number
    }
    mergedBalance?: number
  }> {
    const { data, error } = await supabase.rpc('merge_customers', {
      p_source_id: sourceId,
      p_target_id: targetId,
      p_field_overrides: fieldOverrides ?? {}
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to merge customers', { error })
      return { success: false, error: error.message }
    }

    const result = data as any
    if (!result.success) {
      return { success: false, error: result.error }
    }

    return {
      success: true,
      transferred: result.transferred,
      mergedBalance: result.merged_balance
    }
  }
}

// Singleton
export const customersService = new CustomersService()
