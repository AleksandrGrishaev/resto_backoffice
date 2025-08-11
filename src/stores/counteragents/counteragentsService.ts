// src/stores/counteragents/counteragentsService.ts - REFACTORED with Utils Integration

import type {
  Counteragent,
  CreateCounteragentData,
  CounteragentsResponse,
  CounteragentResponse,
  CounteragentFilters,
  CounteragentsStatistics
} from './types'
import {
  generateCounteragentsMockData,
  findCounteragentById,
  generateCounteragentsStatistics,
  getActiveCounterAgents,
  getCounteragentsByCategory
} from './mock/counteragentsMock'
import { DebugUtils, generateId, TimeUtils } from '@/utils'

const MODULE_NAME = 'CounteragentsService'

// Симуляция задержки API
const API_DELAY = 300

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class CounteragentsService {
  private static instance: CounteragentsService
  private counteragents: Counteragent[]

  constructor() {
    // ✅ Используем интегрированные mock данные
    this.counteragents = [...generateCounteragentsMockData()]

    DebugUtils.info(MODULE_NAME, 'CounteragentsService initialized', {
      totalCounterAgents: this.counteragents.length,
      activeCounterAgents: this.counteragents.filter(ca => ca.isActive).length,
      preferredCounterAgents: this.counteragents.filter(ca => ca.isPreferred).length
    })
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
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Fetching counteragents', { filters })

      let filtered = [...this.counteragents]

      // Apply filters
      if (filters) {
        filtered = this.applyFilters(filtered, filters)
      }

      // Apply sorting
      if (filters?.sortBy) {
        filtered = this.applySorting(filtered, filters)
      }

      // Apply pagination
      const { paginatedData, total } = this.applyPagination(filtered, filters)

      DebugUtils.debug(MODULE_NAME, 'Counteragents fetched successfully', {
        total,
        filtered: filtered.length,
        returned: paginatedData.length
      })

      return {
        data: paginatedData,
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 10
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch counteragents', { error, filters })
      throw new Error('Failed to fetch counteragents')
    }
  }

  async getCounteragentById(id: string): Promise<CounteragentResponse> {
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragent by ID', { id })

      const counteragent = this.counteragents.find(ca => ca.id === id)
      if (!counteragent) {
        DebugUtils.warn(MODULE_NAME, 'Counteragent not found', { id })
        throw new Error(`Counteragent with id ${id} not found`)
      }

      DebugUtils.debug(MODULE_NAME, 'Counteragent found', {
        id,
        name: counteragent.name,
        type: counteragent.type
      })

      return { data: counteragent }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get counteragent by ID', { error, id })
      throw error
    }
  }

  async createCounteragent(data: CreateCounteragentData): Promise<CounteragentResponse> {
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Creating counteragent', {
        name: data.name,
        type: data.type,
        categories: data.productCategories
      })

      const now = TimeUtils.getCurrentLocalISO()

      const newCounteragent: Counteragent = {
        id: generateId(),
        name: data.name,
        displayName: data.displayName,
        type: data.type,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        website: data.website,
        productCategories: data.productCategories,
        description: data.description,
        paymentTerms: data.paymentTerms,
        isActive: data.isActive ?? true,
        isPreferred: data.isPreferred ?? false,
        tags: data.tags || [],
        notes: data.notes,
        creditLimit: data.creditLimit,
        currentBalance: 0,
        leadTimeDays: data.leadTimeDays || 3,
        deliverySchedule: data.deliverySchedule,
        minOrderAmount: data.minOrderAmount,
        totalOrders: 0,
        totalOrderValue: 0,
        createdAt: now,
        updatedAt: now
      }

      this.counteragents.push(newCounteragent)

      DebugUtils.info(MODULE_NAME, 'Counteragent created successfully', {
        id: newCounteragent.id,
        name: newCounteragent.name,
        type: newCounteragent.type
      })

      return { data: newCounteragent }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create counteragent', { error, data })
      throw new Error('Failed to create counteragent')
    }
  }

  async updateCounteragent(id: string, data: Partial<Counteragent>): Promise<CounteragentResponse> {
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Updating counteragent', { id, updates: Object.keys(data) })

      const index = this.counteragents.findIndex(ca => ca.id === id)
      if (index === -1) {
        DebugUtils.warn(MODULE_NAME, 'Counteragent not found for update', { id })
        throw new Error(`Counteragent with id ${id} not found`)
      }

      const updatedCounteragent = {
        ...this.counteragents[index],
        ...data,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.counteragents[index] = updatedCounteragent

      DebugUtils.info(MODULE_NAME, 'Counteragent updated successfully', {
        id,
        name: updatedCounteragent.name,
        updatedFields: Object.keys(data)
      })

      return { data: updatedCounteragent }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update counteragent', { error, id, data })
      throw error
    }
  }

  async deleteCounteragent(id: string): Promise<void> {
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Deleting counteragent', { id })

      const index = this.counteragents.findIndex(ca => ca.id === id)
      if (index === -1) {
        DebugUtils.warn(MODULE_NAME, 'Counteragent not found for deletion', { id })
        throw new Error(`Counteragent with id ${id} not found`)
      }

      const deletedCounterAgent = this.counteragents[index]
      this.counteragents.splice(index, 1)

      DebugUtils.info(MODULE_NAME, 'Counteragent deleted successfully', {
        id,
        name: deletedCounterAgent.name
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete counteragent', { error, id })
      throw error
    }
  }

  // =============================================
  // FILTERING AND SEARCH
  // =============================================

  async searchCounterAgents(query: string): Promise<Counteragent[]> {
    await delay(API_DELAY / 2)

    try {
      DebugUtils.debug(MODULE_NAME, 'Searching counteragents', { query })

      const searchLower = query.toLowerCase()
      const results = this.counteragents.filter(
        ca =>
          ca.name.toLowerCase().includes(searchLower) ||
          ca.displayName?.toLowerCase().includes(searchLower) ||
          ca.contactPerson?.toLowerCase().includes(searchLower) ||
          ca.email?.toLowerCase().includes(searchLower) ||
          ca.description?.toLowerCase().includes(searchLower) ||
          ca.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )

      DebugUtils.debug(MODULE_NAME, 'Search completed', {
        query,
        resultsCount: results.length
      })

      return results
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Search failed', { error, query })
      return []
    }
  }

  async getCounteragentsByCategory(category: string): Promise<Counteragent[]> {
    await delay(API_DELAY / 2)

    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragents by category', { category })

      if (category === 'all') {
        return getActiveCounterAgents()
      }

      const results = getCounteragentsByCategory(category as any)

      DebugUtils.debug(MODULE_NAME, 'Counteragents by category retrieved', {
        category,
        count: results.length
      })

      return results
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get counteragents by category', { error, category })
      return []
    }
  }

  async getCounteragentsByType(type: string): Promise<Counteragent[]> {
    await delay(API_DELAY / 2)

    try {
      DebugUtils.debug(MODULE_NAME, 'Getting counteragents by type', { type })

      if (type === 'all') {
        return getActiveCounterAgents()
      }

      const results = this.counteragents.filter(ca => ca.isActive && ca.type === type)

      DebugUtils.debug(MODULE_NAME, 'Counteragents by type retrieved', {
        type,
        count: results.length
      })

      return results
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get counteragents by type', { error, type })
      return []
    }
  }

  // =============================================
  // STATISTICS AND ANALYTICS
  // =============================================

  async getCounteragentsStatistics(): Promise<CounteragentsStatistics> {
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Generating counteragents statistics')

      const stats = generateCounteragentsStatistics()

      DebugUtils.debug(MODULE_NAME, 'Statistics generated', stats)

      return stats as CounteragentsStatistics
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

      const counteragent = this.counteragents.find(ca => ca.id === id)
      if (!counteragent) {
        throw new Error(`Counteragent with id ${id} not found`)
      }

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
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Bulk updating status', { ids, isActive, count: ids.length })

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
    await delay(API_DELAY)

    try {
      DebugUtils.debug(MODULE_NAME, 'Bulk deleting counteragents', { ids, count: ids.length })

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
      DebugUtils.debug(MODULE_NAME, 'Getting supplier for product', { supplierId })

      const supplier = findCounteragentById(supplierId)

      if (supplier) {
        DebugUtils.debug(MODULE_NAME, 'Supplier found for product', {
          supplierId,
          supplierName: supplier.name,
          categories: supplier.productCategories
        })
      } else {
        DebugUtils.warn(MODULE_NAME, 'Supplier not found for product', { supplierId })
      }

      return supplier || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get supplier for product', { error, supplierId })
      return null
    }
  }

  /**
   * Получить всех поставщиков для категории продуктов
   */
  async getSuppliersForProductCategory(category: string): Promise<Counteragent[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting suppliers for product category', { category })

      const suppliers = getCounteragentsByCategory(category as any)

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
      DebugUtils.debug(MODULE_NAME, 'Updating supplier order stats', { supplierId, orderData })

      const counteragent = this.counteragents.find(ca => ca.id === supplierId)
      if (counteragent) {
        const updates = {
          totalOrders: (counteragent.totalOrders || 0) + 1,
          totalOrderValue: (counteragent.totalOrderValue || 0) + orderData.orderValue,
          lastOrderDate: TimeUtils.getCurrentLocalISO()
        }

        if (orderData.deliveryTime && counteragent.averageDeliveryTime) {
          updates.averageDeliveryTime =
            (counteragent.averageDeliveryTime * (counteragent.totalOrders || 0) +
              orderData.deliveryTime) /
            (counteragent.totalOrders || 0 + 1)
        }

        await this.updateCounteragent(supplierId, updates)

        DebugUtils.info(MODULE_NAME, 'Supplier order stats updated', {
          supplierId,
          newTotalOrders: updates.totalOrders,
          newTotalValue: updates.totalOrderValue
        })
      }
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

    return counteragents.sort((a, b) => {
      const aVal = (a as any)[sortBy!]
      const bVal = (b as any)[sortBy!]

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1
      }
      return aVal > bVal ? 1 : -1
    })
  }

  private applyPagination(
    counteragents: Counteragent[],
    filters?: CounteragentFilters
  ): {
    paginatedData: Counteragent[]
    total: number
  } {
    const page = filters?.page || 1
    const limit = filters?.limit || 10
    const start = (page - 1) * limit
    const end = start + limit

    return {
      paginatedData: counteragents.slice(start, end),
      total: counteragents.length
    }
  }
}
