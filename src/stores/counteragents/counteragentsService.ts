// src/stores/counteragents/counteragentsService.ts

import type {
  Counteragent,
  CreateCounteragentData,
  CounteragentsResponse,
  CounteragentResponse,
  CounteragentFilters,
  CounteragentsStatistics
} from './types'
import {
  mockCounterAgents,
  findCounteragentById,
  generateMockStatistics,
  getMockActiveCounterAgents,
  getMockCounteragentsByType,
  getMockCounteragentsByCategory
} from './mock/counteragentsMock'

// Симуляция задержки API
const API_DELAY = 300

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Генерация уникального ID
function generateId(): string {
  return `ca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export class CounteragentsService {
  private static instance: CounteragentsService
  private counteragents: Counteragent[] = [...mockCounterAgents]

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
      let filtered = [...this.counteragents]

      // Apply filters
      if (filters) {
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
      }

      // Apply sorting
      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const aVal = (a as any)[filters.sortBy!]
          const bVal = (b as any)[filters.sortBy!]

          if (filters.sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1
          }
          return aVal > bVal ? 1 : -1
        })
      }

      // Apply pagination
      const page = filters?.page || 1
      const limit = filters?.limit || 10
      const start = (page - 1) * limit
      const end = start + limit
      const paginatedData = filtered.slice(start, end)

      return {
        data: paginatedData,
        total: filtered.length,
        page,
        limit
      }
    } catch (error) {
      throw new Error('Failed to fetch counteragents')
    }
  }

  async getCounteragentById(id: string): Promise<CounteragentResponse> {
    await delay(API_DELAY)

    const counteragent = this.counteragents.find(ca => ca.id === id)
    if (!counteragent) {
      throw new Error(`Counteragent with id ${id} not found`)
    }

    return { data: counteragent }
  }

  async createCounteragent(data: CreateCounteragentData): Promise<CounteragentResponse> {
    await delay(API_DELAY)

    try {
      const now = new Date().toISOString()

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
        tags: data.tags,
        notes: data.notes,
        creditLimit: data.creditLimit,
        currentBalance: 0,
        totalOrders: 0,
        totalOrderValue: 0,
        createdAt: now,
        updatedAt: now
      }

      this.counteragents.push(newCounteragent)
      return { data: newCounteragent }
    } catch (error) {
      throw new Error('Failed to create counteragent')
    }
  }

  async updateCounteragent(id: string, data: Partial<Counteragent>): Promise<CounteragentResponse> {
    await delay(API_DELAY)

    const index = this.counteragents.findIndex(ca => ca.id === id)
    if (index === -1) {
      throw new Error(`Counteragent with id ${id} not found`)
    }

    const updatedCounteragent = {
      ...this.counteragents[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    this.counteragents[index] = updatedCounteragent
    return { data: updatedCounteragent }
  }

  async deleteCounteragent(id: string): Promise<void> {
    await delay(API_DELAY)

    const index = this.counteragents.findIndex(ca => ca.id === id)
    if (index === -1) {
      throw new Error(`Counteragent with id ${id} not found`)
    }

    this.counteragents.splice(index, 1)
  }

  // =============================================
  // FILTERING AND SEARCH
  // =============================================

  async searchCounterAgents(query: string): Promise<Counteragent[]> {
    await delay(API_DELAY / 2)

    const searchLower = query.toLowerCase()
    return this.counteragents.filter(
      ca =>
        ca.name.toLowerCase().includes(searchLower) ||
        ca.displayName?.toLowerCase().includes(searchLower) ||
        ca.contactPerson?.toLowerCase().includes(searchLower) ||
        ca.email?.toLowerCase().includes(searchLower) ||
        ca.description?.toLowerCase().includes(searchLower) ||
        ca.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    )
  }

  async getCounteragentsByCategory(category: string): Promise<Counteragent[]> {
    await delay(API_DELAY / 2)

    if (category === 'all') {
      return getMockActiveCounterAgents()
    }

    return this.counteragents.filter(
      ca => ca.isActive && ca.productCategories.includes(category as any)
    )
  }

  async getCounteragentsByType(type: string): Promise<Counteragent[]> {
    await delay(API_DELAY / 2)

    if (type === 'all') {
      return getMockActiveCounterAgents()
    }

    return this.counteragents.filter(ca => ca.isActive && ca.type === type)
  }

  // =============================================
  // STATISTICS AND ANALYTICS
  // =============================================

  async getCounteragentsStatistics(): Promise<CounteragentsStatistics> {
    await delay(API_DELAY)

    const active = this.counteragents.filter(ca => ca.isActive)
    const preferred = this.counteragents.filter(ca => ca.isPreferred && ca.isActive)

    const typeBreakdown = this.counteragents.reduce(
      (acc, ca) => {
        acc[ca.type] = (acc[ca.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const categoryBreakdown = this.counteragents.reduce(
      (acc, ca) => {
        ca.productCategories.forEach(category => {
          acc[category] = (acc[category] || 0) + 1
        })
        return acc
      },
      {} as Record<string, number>
    )

    const paymentBreakdown = this.counteragents.reduce(
      (acc, ca) => {
        acc[ca.paymentTerms] = (acc[ca.paymentTerms] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalCounterAgents: this.counteragents.length,
      activeCounterAgents: active.length,
      preferredCounterAgents: preferred.length,
      typeBreakdown: typeBreakdown as any,
      productCategoryBreakdown: categoryBreakdown as any,
      paymentTermsBreakdown: paymentBreakdown as any
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async toggleCounteragentStatus(id: string): Promise<CounteragentResponse> {
    const counteragent = this.counteragents.find(ca => ca.id === id)
    if (!counteragent) {
      throw new Error(`Counteragent with id ${id} not found`)
    }

    return this.updateCounteragent(id, { isActive: !counteragent.isActive })
  }

  async setPreferredStatus(id: string, isPreferred: boolean): Promise<CounteragentResponse> {
    return this.updateCounteragent(id, { isPreferred })
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    await delay(API_DELAY)

    const updatePromises = ids.map(id => this.updateCounteragent(id, { isActive }))

    await Promise.all(updatePromises)
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await delay(API_DELAY)

    const deletePromises = ids.map(id => this.deleteCounteragent(id))
    await Promise.all(deletePromises)
  }

  // =============================================
  // INTEGRATION METHODS (TODO: Future)
  // =============================================

  // TODO: Методы для интеграции с Order Module
  async getCounteragentOrders(counteragentId: string): Promise<any[]> {
    // Заглушка для будущей интеграции
    return []
  }

  async getCounteragentBalance(counteragentId: string): Promise<number> {
    const counteragent = this.counteragents.find(ca => ca.id === counteragentId)
    return counteragent?.currentBalance || 0
  }

  async updateCounteragentStats(counteragentId: string, orderData: any): Promise<void> {
    // TODO: Обновление статистики при создании заказов
    const counteragent = this.counteragents.find(ca => ca.id === counteragentId)
    if (counteragent) {
      counteragent.totalOrders = (counteragent.totalOrders || 0) + 1
      counteragent.totalOrderValue = (counteragent.totalOrderValue || 0) + orderData.value
      counteragent.lastOrderDate = new Date().toISOString()
    }
  }

  // TODO: Методы для интеграции с Product Module
  async getProductsByCounteragent(counteragentId: string): Promise<any[]> {
    // Заглушка для будущей интеграции с ProductStore
    return []
  }

  async getCounteragentsByProduct(productId: string): Promise<Counteragent[]> {
    // Заглушка для будущей интеграции с ProductStore
    return []
  }
}
