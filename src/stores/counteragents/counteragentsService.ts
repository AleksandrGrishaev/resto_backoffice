// src/stores/counteragents/counteragentsService.ts - Supabase-only service

import type {
  Counteragent,
  CreateCounteragentData,
  CounteragentsResponse,
  CounteragentResponse,
  CounteragentFilters,
  CounteragentsStatistics,
  BalanceHistoryEntry
} from './types'
import { DebugUtils, TimeUtils } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import {
  counteragentFromSupabase,
  counteragentsFromSupabase,
  counteragentToSupabaseInsert,
  counteragentToSupabaseUpdate,
  createBalanceHistoryEntry,
  generateBalanceHistoryId
} from './supabaseMappers'

const MODULE_NAME = 'CounteragentsService'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

// Helper: Timeout wrapper for Supabase requests
const SUPABASE_TIMEOUT = 5000 // 5 seconds

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = SUPABASE_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs)
    )
  ])
}

/**
 * CounteragentsService - Supabase-only implementation
 * Pattern: Supabase-first with localStorage cache fallback
 */
export class CounteragentsService {
  private static instance: CounteragentsService

  static getInstance(): CounteragentsService {
    if (!CounteragentsService.instance) {
      CounteragentsService.instance = new CounteragentsService()
    }
    return CounteragentsService.instance
  }

  // =============================================
  // CACHE MANAGEMENT
  // =============================================

  private getCachedData(): CounteragentsResponse | null {
    try {
      const cached = localStorage.getItem('counteragents_cache')
      if (!cached) return null

      const { data, timestamp, total } = JSON.parse(cached)
      const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem('counteragents_cache')
        return null
      }

      return {
        data: data.map((row: any) => counteragentFromSupabase(row)),
        total,
        page: 1,
        limit: 10
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to parse cache data', { error })
      localStorage.removeItem('counteragents_cache')
      return null
    }
  }

  private setCachedData(data: Counteragent[], total: number): void {
    try {
      localStorage.setItem(
        'counteragents_cache',
        JSON.stringify({
          data,
          timestamp: Date.now(),
          total
        })
      )
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to cache data', { error })
    }
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  async fetchCounterAgents(filters?: CounteragentFilters): Promise<CounteragentsResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Fetching counteragents from Supabase', { filters })

      // Try Supabase first (if online)
      if (isSupabaseAvailable()) {
        try {
          let query = (supabase as any).from('counteragents').select('*', { count: 'exact' })

          // Apply filters
          if (filters) {
            if (filters.search) {
              query = query.or(
                `name.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`
              )
            }
            if (filters.type && filters.type !== 'all') {
              query = query.eq('type', filters.type)
            }
            if (typeof filters.isActive === 'boolean') {
              query = query.eq('is_active', filters.isActive)
            }
            if (typeof filters.isPreferred === 'boolean') {
              query = query.eq('is_preferred', filters.isPreferred)
            }
            if (filters.productCategories && filters.productCategories.length > 0) {
              query = query.contains('product_categories', filters.productCategories)
            }
            if (filters.paymentTerms && filters.paymentTerms !== 'all') {
              query = query.eq('payment_terms', filters.paymentTerms)
            }

            // Sorting
            if (filters.sortBy) {
              const column = this.mapSortColumn(filters.sortBy)
              query = query.order(column, { ascending: filters.sortOrder !== 'desc' })
            } else {
              query = query.order('name', { ascending: true })
            }

            // Pagination
            const page = filters?.page || 1
            const limit = filters?.limit || 10
            const offset = (page - 1) * limit
            query = query.range(offset, offset + limit - 1)
          } else {
            // Default sort and pagination
            query = query.order('name', { ascending: true }).range(0, 9)
          }

          const result = await withTimeout(query)
          const { data, error, count } = result as any

          if (error) {
            throw error
          }

          const counteragents = data ? counteragentsFromSupabase(data) : []

          // Cache the results
          this.setCachedData(counteragents, count || 0)

          DebugUtils.info(MODULE_NAME, 'Counteragents fetched from Supabase', {
            total: count,
            returned: counteragents.length,
            filters
          })

          return {
            data: counteragents,
            total: count || 0,
            page: filters?.page || 1,
            limit: filters?.limit || 10
          }
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, 'Supabase fetch failed, using cache', { error })
          return this.getFromCache(filters)
        }
      } else {
        // Supabase not available, try cache
        DebugUtils.info(MODULE_NAME, 'Supabase not available, using cache')
        return this.getFromCache(filters)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch counteragents', { error, filters })
      return this.getFromCache(filters)
    }
  }

  private getFromCache(filters?: CounteragentFilters): CounteragentsResponse {
    const cached = this.getCachedData()

    if (!cached) {
      DebugUtils.warn(MODULE_NAME, 'No cached data available')
      return { data: [], total: 0, page: 1, limit: 10 }
    }

    let filteredData = [...cached.data]

    // Apply client-side filters if not already filtered on server
    if (filters) {
      filteredData = this.applyFilters(filteredData, filters)

      // Apply sorting if not already sorted on server
      if (filters.sortBy) {
        filteredData = this.applySorting(filteredData, filters)
      }

      // Apply pagination
      const page = filters.page || 1
      const limit = filters.limit || 10
      const start = (page - 1) * limit
      filteredData = filteredData.slice(start, start + limit)
    }

    return {
      data: filteredData,
      total: cached.total,
      page: filters?.page || 1,
      limit: filters?.limit || 10
    }
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      name: 'name',
      displayName: 'display_name',
      type: 'type',
      contactPerson: 'contact_person',
      paymentTerms: 'payment_terms',
      isActive: 'is_active',
      isPreferred: 'is_preferred',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
    return columnMap[sortBy] || sortBy
  }

  async getCounteragentById(id: string): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragent by ID from Supabase', { id })

      // Try Supabase first
      if (isSupabaseAvailable()) {
        try {
          const result = await withTimeout(
            (supabase as any).from('counteragents').select('*').eq('id', id).single()
          )
          const { data, error } = result as any

          if (error) {
            throw error
          }

          if (!data) {
            DebugUtils.warn(MODULE_NAME, 'Counteragent not found in Supabase', { id })
            throw new Error(`Counteragent with id ${id} not found`)
          }

          const counteragent = counteragentFromSupabase(data)

          DebugUtils.debug(MODULE_NAME, 'Counteragent found in Supabase', {
            id,
            name: counteragent.name,
            type: counteragent.type
          })

          return { data: counteragent }
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, 'Supabase fetch failed, trying cache', { error, id })
          return this.getByIdFromCache(id)
        }
      } else {
        return this.getByIdFromCache(id)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get counteragent by ID', { error, id })
      throw error
    }
  }

  private getByIdFromCache(id: string): CounteragentResponse {
    const cached = this.getCachedData()

    if (!cached) {
      throw new Error('No cached data available')
    }

    const counteragent = cached.data.find(ca => ca.id === id)
    if (!counteragent) {
      throw new Error(`Counteragent with id ${id} not found in cache`)
    }

    return { data: counteragent }
  }

  async createCounteragent(data: CreateCounteragentData): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Creating counteragent in Supabase', {
        name: data.name,
        type: data.type
      })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const insertData = counteragentToSupabaseInsert(data)

      const result = await withTimeout(
        (supabase as any).from('counteragents').insert(insertData).select().single()
      )
      const { data: createdData, error } = result as any

      if (error) {
        throw error
      }

      if (!createdData) {
        throw new Error('Failed to create counteragent')
      }

      const counteragent = counteragentFromSupabase(createdData)

      // Clear cache to force refresh
      localStorage.removeItem('counteragents_cache')

      DebugUtils.info(MODULE_NAME, 'Counteragent created successfully', {
        id: counteragent.id,
        name: counteragent.name,
        type: counteragent.type
      })

      return { data: counteragent }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create counteragent', { error, data })
      throw new Error('Failed to create counteragent')
    }
  }

  async updateCounteragent(id: string, data: Partial<Counteragent>): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Updating counteragent in Supabase', {
        id,
        updates: Object.keys(data)
      })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const updateData = counteragentToSupabaseUpdate(data)

      const result = await withTimeout(
        (supabase as any).from('counteragents').update(updateData).eq('id', id).select().single()
      )
      const { data: updatedData, error } = result as any

      if (error) {
        throw error
      }

      if (!updatedData) {
        throw new Error(`Counteragent with id ${id} not found`)
      }

      const counteragent = counteragentFromSupabase(updatedData)

      // Clear cache to force refresh
      localStorage.removeItem('counteragents_cache')

      DebugUtils.info(MODULE_NAME, 'Counteragent updated successfully', {
        id,
        name: counteragent.name,
        updatedFields: Object.keys(data)
      })

      return { data: counteragent }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update counteragent', { error, id, data })
      throw new Error('Failed to update counteragent')
    }
  }

  async deleteCounteragent(id: string): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Deleting counteragent from Supabase', { id })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const result = await withTimeout(
        (supabase as any).from('counteragents').delete().eq('id', id)
      )
      const { error } = result as any

      if (error) {
        throw error
      }

      // Clear cache to force refresh
      localStorage.removeItem('counteragents_cache')

      DebugUtils.info(MODULE_NAME, 'Counteragent deleted successfully', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete counteragent', { error, id })
      throw new Error('Failed to delete counteragent')
    }
  }

  // =============================================
  // SEARCH AND FILTERING
  // =============================================

  async searchCounterAgents(query: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Searching counteragents', { query })

      const response = await this.fetchCounterAgents({
        search: query,
        limit: 50
      })

      DebugUtils.debug(MODULE_NAME, 'Search completed', {
        query,
        resultsCount: response.data.length
      })

      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Search failed', { error, query })
      return []
    }
  }

  async getCounteragentsByType(type: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragents by type', { type })

      const response = await this.fetchCounterAgents({
        type: type as any,
        limit: 100
      })

      DebugUtils.debug(MODULE_NAME, 'Counteragents by type retrieved', {
        type,
        count: response.data.length
      })

      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get counteragents by type', { error, type })
      return []
    }
  }

  async getCounteragentsByCategory(category: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragents by category', { category })

      if (category === 'all') {
        const response = await this.fetchCounterAgents({
          isActive: true,
          limit: 100
        })
        return response.data
      }

      const response = await this.fetchCounterAgents({
        productCategories: [category as any],
        isActive: true,
        limit: 100
      })

      DebugUtils.debug(MODULE_NAME, 'Counteragents by category retrieved', {
        category,
        count: response.data.length
      })

      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get counteragents by category', { error, category })
      return []
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async toggleCounteragentStatus(id: string): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Toggling counteragent status', { id })

      // Get current counteragent to determine new status
      const current = await this.getCounteragentById(id)
      const newStatus = !current.data.isActive

      const result = await this.updateCounteragent(id, { isActive: newStatus })

      DebugUtils.info(MODULE_NAME, 'Counteragent status toggled', {
        id,
        name: current.data.name,
        newStatus
      })

      return result
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to toggle status', { error, id })
      throw error
    }
  }

  async setPreferredStatus(id: string, isPreferred: boolean): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Setting preferred status', { id, isPreferred })

      const result = await this.updateCounteragent(id, { isPreferred })

      DebugUtils.info(MODULE_NAME, 'Preferred status updated', {
        id,
        isPreferred
      })

      return result
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to set preferred status', { error, id, isPreferred })
      throw error
    }
  }

  // =============================================
  // STATISTICS
  // =============================================

  async getCounteragentsStatistics(): Promise<CounteragentsStatistics> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Generating counteragents statistics')

      const response = await this.fetchCounterAgents({ limit: 1000 })
      const counteragents = response.data

      const stats: CounteragentsStatistics = {
        totalCounterAgents: counteragents.length,
        activeCounterAgents: counteragents.filter(ca => ca.isActive).length,
        preferredCounterAgents: counteragents.filter(ca => ca.isPreferred).length,
        typeBreakdown: {} as any,
        productCategoryBreakdown: {} as any,
        paymentTermsBreakdown: {} as any
      }

      // Calculate breakdowns
      counteragents.forEach(ca => {
        // Type breakdown
        stats.typeBreakdown[ca.type] = (stats.typeBreakdown[ca.type] || 0) + 1

        // Product categories breakdown
        ca.productCategories.forEach(cat => {
          stats.productCategoryBreakdown[cat] = (stats.productCategoryBreakdown[cat] || 0) + 1
        })

        // Payment terms breakdown
        stats.paymentTermsBreakdown[ca.paymentTerms] =
          (stats.paymentTermsBreakdown[ca.paymentTerms] || 0) + 1
      })

      DebugUtils.debug(MODULE_NAME, 'Statistics generated', stats)

      return stats
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate statistics', { error })
      throw new Error('Failed to generate statistics')
    }
  }

  // =============================================
  // BALANCE HISTORY
  // =============================================

  async getBalanceHistory(id: string): Promise<BalanceHistoryEntry[]> {
    try {
      const counteragent = await this.getCounteragentById(id)
      const history = counteragent.data.balanceHistory || []

      return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get balance history', { error, id })
      return []
    }
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Bulk updating status', { ids, isActive, count: ids.length })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const updatePromises = ids.map(id => this.updateCounteragent(id, { isActive }))
      await Promise.all(updatePromises)

      // Clear cache to force refresh
      localStorage.removeItem('counteragents_cache')

      DebugUtils.info(MODULE_NAME, 'Bulk status update completed', {
        count: ids.length,
        isActive
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Bulk status update failed', { error, ids, isActive })
      throw error
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Bulk deleting counteragents', { ids, count: ids.length })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const result = await withTimeout(
        (supabase as any).from('counteragents').delete().in('id', ids)
      )
      const { error } = result as any

      if (error) {
        throw error
      }

      // Clear cache to force refresh
      localStorage.removeItem('counteragents_cache')

      DebugUtils.info(MODULE_NAME, 'Bulk delete completed', {
        count: ids.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Bulk delete failed', { error, ids })
      throw error
    }
  }

  // =============================================
  // INTEGRATION METHODS
  // =============================================

  async getSupplierForProduct(supplierId: string): Promise<Counteragent | null> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting supplier for product', { supplierId })

      const result = await this.getCounteragentById(supplierId)
      return result.data
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Supplier not found for product', { supplierId })
      return null
    }
  }

  async getSuppliersForProductCategory(category: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting suppliers for product category', { category })

      const response = await this.fetchCounterAgents({
        type: 'supplier',
        productCategories: [category as any],
        isActive: true,
        limit: 100
      })

      DebugUtils.debug(MODULE_NAME, 'Suppliers found for category', {
        category,
        count: response.data.length,
        suppliers: response.data.map(s => ({ id: s.id, name: s.name }))
      })

      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get suppliers for category', { error, category })
      return []
    }
  }

  async updateSupplierOrderStats(
    supplierId: string,
    orderData: {
      orderValue: number
      deliveryTime?: number
    }
  ): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Updating supplier order stats', { supplierId, orderData })

      const current = await this.getCounteragentById(supplierId)
      const updates = {
        totalOrders: (current.data.totalOrders || 0) + 1,
        totalOrderValue: (current.data.totalOrderValue || 0) + orderData.orderValue,
        lastOrderDate: TimeUtils.getCurrentLocalISO()
      }

      if (orderData.deliveryTime && current.data.averageDeliveryTime) {
        const newAverageDeliveryTime =
          (current.data.averageDeliveryTime * (current.data.totalOrders || 0) +
            orderData.deliveryTime) /
          ((current.data.totalOrders || 0) + 1)

        Object.assign(updates, { averageDeliveryTime: newAverageDeliveryTime })
      }

      await this.updateCounteragent(supplierId, updates)

      DebugUtils.info(MODULE_NAME, 'Supplier order stats updated', {
        supplierId,
        newTotalOrders: updates.totalOrders,
        newTotalValue: updates.totalOrderValue
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update supplier order stats', {
        error,
        supplierId,
        orderData
      })
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private applyFilters(
    counteragents: Counteragent[],
    filters: CounteragentFilters
  ): Counteragent[] {
    let filtered = [...counteragents]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        ca =>
          ca.name.toLowerCase().includes(searchLower) ||
          ca.displayName?.toLowerCase().includes(searchLower) ||
          ca.contactPerson?.toLowerCase().includes(searchLower) ||
          ca.email?.toLowerCase().includes(searchLower) ||
          ca.description?.toLowerCase().includes(searchLower)
      )
    }

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(ca => ca.type === filters.type)
    }

    // Active status filter
    if (typeof filters.isActive === 'boolean') {
      filtered = filtered.filter(ca => ca.isActive === filters.isActive)
    }

    // Preferred status filter
    if (typeof filters.isPreferred === 'boolean') {
      filtered = filtered.filter(ca => ca.isPreferred === filters.isPreferred)
    }

    // Product categories filter
    if (filters.productCategories && filters.productCategories.length > 0) {
      filtered = filtered.filter(ca =>
        filters.productCategories!.some(category => ca.productCategories.includes(category))
      )
    }

    // Payment terms filter
    if (filters.paymentTerms && filters.paymentTerms !== 'all') {
      filtered = filtered.filter(ca => ca.paymentTerms === filters.paymentTerms)
    }

    return filtered
  }

  private applySorting(
    counteragents: Counteragent[],
    filters: CounteragentFilters
  ): Counteragent[] {
    const { sortBy, sortOrder = 'asc' } = filters

    if (!sortBy) return counteragents

    return counteragents.sort((a, b) => {
      const aVal = (a as any)[sortBy!]
      const bVal = (b as any)[sortBy!]

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1
      }
      return aVal > bVal ? 1 : -1
    })
  }
}
