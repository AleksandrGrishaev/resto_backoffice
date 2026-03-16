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
      .or(`name.ilike.%${query}%,telegram_username.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('last_visit_at', { ascending: false, nullsFirst: false })
      .limit(20)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to search customers', { error })
      throw error
    }

    return (data || []).map(mapCustomerFromDb)
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
      averageCheck: result.average_check
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
}

// Singleton
export const customersService = new CustomersService()
