// src/stores/counteragents/counteragentsService.ts - Supabase Migration

import type {
  Counteragent,
  CreateCounteragentData,
  CounteragentsResponse,
  CounteragentResponse,
  CounteragentFilters,
  CounteragentsStatistics,
  CounteragentType,
  PaymentTerms,
  BalanceHistoryEntry
} from './types'
import type { ProductCategory } from '@/stores/productsStore/types'
import { supabase } from '@/supabase/client'
import { generateId, TimeUtils, DebugUtils, extractErrorDetails } from '@/utils'
import { executeSupabaseSingle, executeSupabaseMutation } from '@/utils/supabase'
import { withRetry } from '@/core/request/SupabaseRetryHandler'
import { mapCounteragentFromDB, mapCounteragentToDB } from './supabaseMappers'

const MODULE_NAME = 'CounteragentsService'

export class CounteragentsService {
  private static instance: CounteragentsService

  constructor() {
    DebugUtils.info(MODULE_NAME, 'CounteragentsService initialized (Supabase mode)')
  }

  static getInstance(): CounteragentsService {
    if (!CounteragentsService.instance) {
      CounteragentsService.instance = new CounteragentsService()
    }
    return CounteragentsService.instance
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  async fetchCounterAgents(filters?: CounteragentFilters): Promise<CounteragentsResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Fetching counteragents from Supabase', { filters })

      // ✅ FIX: Wrap Supabase query with retry logic
      const result = await withRetry(async () => {
        // Build query
        let query = supabase.from('counteragents').select('*', { count: 'exact' })

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
            query = query.overlaps('product_categories', filters.productCategories)
          }

          if (filters.paymentTerms && filters.paymentTerms !== 'all') {
            query = query.eq('payment_terms', filters.paymentTerms)
          }
        }

        // Apply sorting
        const sortBy = filters?.sortBy || 'name'
        const sortOrder = filters?.sortOrder || 'asc'
        const dbSortBy = sortBy.replace(/([A-Z])/g, '_$1').toLowerCase() // camelCase to snake_case
        query = query.order(dbSortBy, { ascending: sortOrder === 'asc' })

        // Apply pagination
        const page = filters?.page || 1
        const limit = filters?.limit || 100
        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return { data: data || [], count: count || 0 }
      }, `${MODULE_NAME}.fetchCounterAgents`)

      const counteragents = result.data.map(mapCounteragentFromDB)

      DebugUtils.info(MODULE_NAME, 'Counteragents fetched from Supabase', {
        total: result.count,
        returned: counteragents.length
      })

      const page = filters?.page || 1
      const limit = filters?.limit || 100

      return {
        data: counteragents,
        total: result.count,
        page,
        limit
      }
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Failed to fetch counteragents from Supabase',
        extractErrorDetails(error)
      )
      throw new Error('Failed to fetch counteragents')
    }
  }

  async getCounteragentById(id: string): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragent by ID from Supabase', { id })

      // ✅ FIX: Use executeSupabaseSingle with retry logic
      const data = await executeSupabaseSingle(
        supabase.from('counteragents').select('*').eq('id', id),
        `${MODULE_NAME}.getCounteragentById`
      )

      if (!data) {
        DebugUtils.warn(MODULE_NAME, 'Counteragent not found', { id })
        throw new Error(`Counteragent with id ${id} not found`)
      }

      const counteragent = mapCounteragentFromDB(data)

      DebugUtils.debug(MODULE_NAME, 'Counteragent found', {
        id,
        name: counteragent.name,
        type: counteragent.type
      })

      return { data: counteragent }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get counteragent by ID', extractErrorDetails(error))
      throw error
    }
  }

  async createCounteragent(data: CreateCounteragentData): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Creating counteragent in Supabase', {
        name: data.name,
        type: data.type
      })

      const now = TimeUtils.getCurrentLocalISO()
      const newCounteragent: Counteragent = {
        id: generateId(),
        name: data.name,
        displayName: data.displayName,
        type: data.type,
        description: data.description,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        productCategories: data.productCategories || [],
        paymentTerms: data.paymentTerms || 'on_delivery',
        isActive: data.isActive ?? true,
        isPreferred: data.isPreferred ?? false,
        tags: data.tags || [],
        notes: data.notes,
        creditLimit: data.creditLimit,
        currentBalance: 0,
        balanceHistory: [],
        leadTimeDays: data.leadTimeDays || 3,
        deliverySchedule: data.deliverySchedule,
        minOrderAmount: data.minOrderAmount,
        totalOrders: 0,
        totalOrderValue: 0,
        createdAt: now,
        updatedAt: now
      }

      // Insert to Supabase
      const dbCounteragent = mapCounteragentToDB(newCounteragent)
      const { data: insertedData, error } = await supabase
        .from('counteragents')
        .insert(dbCounteragent)
        .select()
        .single()

      if (error) throw error

      const result = mapCounteragentFromDB(insertedData)

      DebugUtils.info(MODULE_NAME, 'Counteragent created successfully in Supabase', {
        id: result.id,
        name: result.name,
        type: result.type
      })

      return { data: result }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create counteragent in Supabase', { error, data })
      throw new Error('Failed to create counteragent')
    }
  }

  async getBalanceHistory(id: string): Promise<BalanceHistoryEntry[]> {
    try {
      const { data } = await this.getCounteragentById(id)

      return (data.balanceHistory || []).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get balance history', { error, id })
      return []
    }
  }

  async updateCounteragent(id: string, data: Partial<Counteragent>): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Updating counteragent in Supabase', {
        id,
        updates: Object.keys(data)
      })

      // First get the current counteragent to preserve fields not being updated
      const { data: currentData } = await this.getCounteragentById(id)

      const updatedCounteragent = {
        ...currentData,
        ...data,
        // ВАЖНО: Убедиться что balanceHistory не затирается при обновлении других полей
        balanceHistory: data.balanceHistory ?? currentData.balanceHistory ?? [],
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Update in Supabase
      const dbCounteragent = mapCounteragentToDB(updatedCounteragent)
      const { data: updatedData, error } = await supabase
        .from('counteragents')
        .update(dbCounteragent)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          DebugUtils.warn(MODULE_NAME, 'Counteragent not found for update', { id })
          throw new Error(`Counteragent with id ${id} not found`)
        }
        throw error
      }

      const result = mapCounteragentFromDB(updatedData)

      DebugUtils.info(MODULE_NAME, 'Counteragent updated successfully in Supabase', {
        id,
        name: result.name,
        updatedFields: Object.keys(data),
        balanceHistoryLength: result.balanceHistory?.length || 0
      })

      return { data: result }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update counteragent in Supabase', {
        error,
        id,
        data
      })
      throw error
    }
  }

  async deleteCounteragent(id: string): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Deleting counteragent from Supabase', { id })

      // Get counteragent first for logging
      const { data: counteragent } = await this.getCounteragentById(id)

      // ✅ FIX: Use executeSupabaseMutation with retry logic
      await executeSupabaseMutation(async () => {
        const { error } = await supabase.from('counteragents').delete().eq('id', id)
        if (error) throw error
      }, `${MODULE_NAME}.deleteCounteragent`)

      DebugUtils.info(MODULE_NAME, 'Counteragent deleted successfully from Supabase', {
        id,
        name: counteragent.name
      })
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Failed to delete counteragent from Supabase',
        extractErrorDetails(error)
      )
      throw error
    }
  }

  // =============================================
  // FILTERING AND SEARCH
  // =============================================

  async searchCounterAgents(query: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Searching counteragents in Supabase', { query })

      const response = await this.fetchCounterAgents({ search: query, limit: 100 })

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

  async getCounteragentsByCategory(category: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragents by category from Supabase', { category })

      const filters: CounteragentFilters = {
        isActive: true,
        limit: 1000
      }

      if (category !== 'all') {
        filters.productCategories = [category as any]
      }

      const response = await this.fetchCounterAgents(filters)

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

  async getCounteragentsByType(type: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragents by type from Supabase', { type })

      const filters: CounteragentFilters = {
        isActive: true,
        type: type === 'all' ? 'all' : (type as any),
        limit: 1000
      }

      const response = await this.fetchCounterAgents(filters)

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

  // =============================================
  // STATISTICS AND ANALYTICS
  // =============================================

  async getCounteragentsStatistics(): Promise<CounteragentsStatistics> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Generating counteragents statistics from Supabase')

      // Fetch all counteragents
      const response = await this.fetchCounterAgents({ limit: 10000 })
      const counteragents = response.data

      // Compute statistics
      const stats: CounteragentsStatistics = {
        totalCounterAgents: counteragents.length,
        activeCounterAgents: counteragents.filter(ca => ca.isActive).length,
        preferredCounterAgents: counteragents.filter(ca => ca.isPreferred).length,
        typeBreakdown: {} as Record<CounteragentType, number>,
        productCategoryBreakdown: {} as Record<ProductCategory, number>,
        paymentTermsBreakdown: {} as Record<PaymentTerms, number>
      }

      // Type breakdown
      counteragents.forEach(ca => {
        stats.typeBreakdown[ca.type] = (stats.typeBreakdown[ca.type] || 0) + 1
      })

      // Product category breakdown
      counteragents.forEach(ca => {
        ca.productCategories.forEach(category => {
          stats.productCategoryBreakdown[category] =
            (stats.productCategoryBreakdown[category] || 0) + 1
        })
      })

      // Payment terms breakdown
      counteragents.forEach(ca => {
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
  // UTILITY METHODS
  // =============================================

  async toggleCounteragentStatus(id: string): Promise<CounteragentResponse> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Toggling counteragent status', { id })

      const { data: counteragent } = await this.getCounteragentById(id)

      const newStatus = !counteragent.isActive
      const result = await this.updateCounteragent(id, { isActive: newStatus })

      DebugUtils.info(MODULE_NAME, 'Counteragent status toggled', {
        id,
        name: counteragent.name,
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
  // BULK OPERATIONS
  // =============================================

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Bulk updating status in Supabase', {
        ids,
        isActive,
        count: ids.length
      })

      const updatePromises = ids.map(id => this.updateCounteragent(id, { isActive }))
      await Promise.all(updatePromises)

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
      DebugUtils.debug(MODULE_NAME, 'Bulk deleting counteragents from Supabase', {
        ids,
        count: ids.length
      })

      const deletePromises = ids.map(id => this.deleteCounteragent(id))
      await Promise.all(deletePromises)

      DebugUtils.info(MODULE_NAME, 'Bulk delete completed', {
        count: ids.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Bulk delete failed', { error, ids })
      throw error
    }
  }

  // =============================================
  // ✅ INTEGRATION METHODS (Product Store)
  // =============================================

  /**
   * Получить поставщика для продукта (интеграция с Product Store)
   */
  async getSupplierForProduct(supplierId: string): Promise<Counteragent | null> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting supplier for product from Supabase', { supplierId })

      const { data: supplier } = await this.getCounteragentById(supplierId)

      DebugUtils.debug(MODULE_NAME, 'Supplier found for product', {
        supplierId,
        supplierName: supplier.name,
        categories: supplier.productCategories
      })

      return supplier
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Supplier not found for product', { supplierId, error })
      return null
    }
  }

  /**
   * Получить всех поставщиков для категории продуктов
   */
  async getSuppliersForProductCategory(category: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting suppliers for product category from Supabase', {
        category
      })

      const suppliers = await this.getCounteragentsByCategory(category)

      DebugUtils.debug(MODULE_NAME, 'Suppliers found for category', {
        category,
        count: suppliers.length,
        suppliers: suppliers.map(s => ({ id: s.id, name: s.name }))
      })

      return suppliers
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get suppliers for category', { error, category })
      return []
    }
  }

  /**
   * Обновить статистику заказов поставщика (для интеграции с Supplier Store)
   */
  async updateSupplierOrderStats(
    supplierId: string,
    orderData: {
      orderValue: number
      deliveryTime?: number
    }
  ): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Updating supplier order stats in Supabase', {
        supplierId,
        orderData
      })

      const { data: counteragent } = await this.getCounteragentById(supplierId)

      const updates: Partial<Counteragent> = {
        totalOrders: (counteragent.totalOrders || 0) + 1,
        totalOrderValue: (counteragent.totalOrderValue || 0) + orderData.orderValue,
        lastOrderDate: TimeUtils.getCurrentLocalISO()
      }

      if (orderData.deliveryTime && counteragent.averageDeliveryTime) {
        updates.averageDeliveryTime =
          (counteragent.averageDeliveryTime * (counteragent.totalOrders || 0) +
            orderData.deliveryTime) /
          ((counteragent.totalOrders || 0) + 1)
      }

      await this.updateCounteragent(supplierId, updates)

      DebugUtils.info(MODULE_NAME, 'Supplier order stats updated in Supabase', {
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
  // PRIVATE HELPER METHODS - REMOVED
  // All filtering, sorting, and pagination now handled by Supabase in fetchCounterAgents()
  // =============================================
}
