// src/services/tax.service.ts - Supabase-backed tax service
import type { Tax } from '@/types/tax'
import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'TaxService'

function mapTaxFromDb(row: any): Tax {
  return {
    id: row.id,
    name: row.name,
    percentage: Number(row.percentage),
    isActive: row.is_active,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * TaxService - Supabase-backed CRUD for taxes table
 */
export class TaxService {
  async getAll(): Promise<Tax[]> {
    const { data, error } = await supabase.from('taxes').select('*').order('sort_order')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load taxes', { error })
      throw error
    }

    return (data || []).map(mapTaxFromDb)
  }

  async getById(id: string): Promise<Tax | null> {
    const { data, error } = await supabase.from('taxes').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return null
      DebugUtils.error(MODULE_NAME, 'Failed to get tax', { error })
      throw error
    }

    return data ? mapTaxFromDb(data) : null
  }

  async create(data: Omit<Tax, 'id'>): Promise<Tax> {
    const { data: row, error } = await supabase
      .from('taxes')
      .insert({
        name: data.name,
        percentage: data.percentage,
        is_active: data.isActive,
        sort_order: data.sortOrder ?? 0
      })
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create tax', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Tax created', { id: row.id })
    return mapTaxFromDb(row)
  }

  async update(id: string, data: Partial<Tax>): Promise<void> {
    const updates: Record<string, any> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.percentage !== undefined) updates.percentage = data.percentage
    if (data.isActive !== undefined) updates.is_active = data.isActive
    if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder

    const { error } = await supabase.from('taxes').update(updates).eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update tax', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Tax updated', { id })
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('taxes').delete().eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete tax', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Tax deleted', { id })
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive })
    DebugUtils.info(MODULE_NAME, 'Tax toggled', { id, isActive })
  }
}

export const taxService = new TaxService()
