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
