// src/stores/counteragents/counteragentsStore.ts - REFACTORED with Integration

import { defineStore } from 'pinia'
import type {
  Counteragent,
  CreateCounteragentData,
  CounteragentsState,
  CounteragentsStatistics,
  CounteragentType,
  PaymentTerms
} from './types'
import type { ProductCategory } from '@/stores/productsStore/types'
import { CounteragentsService } from './counteragentsService'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'CounteragentsStore'

export const useCounteragentsStore = defineStore('counteragents', {
  state: (): CounteragentsState => ({
    // Core data
    counteragents: [],

    // UI state
    loading: {
      counteragents: false,
      stats: false
    },
    error: null,

    // Current selection
    currentCounteragent: undefined,
    selectedIds: [],

    // Filters
    filters: {
      search: '',
      type: 'all',
      isActive: 'all',
      isPreferred: 'all',
      productCategories: [],
      paymentTerms: 'all'
    },

    // View settings
    viewSettings: {
      sortBy: 'name',
      sortOrder: 'asc',
      itemsPerPage: 10,
      showInactive: false
    }
  }),

  getters: {
    // =============================================
    // BASIC GETTERS
    // =============================================

    filteredCounterAgents(): Counteragent[] {
      let filtered = [...this.counteragents]

      // Search filter
      if (this.filters.search) {
        const searchLower = this.filters.search.toLowerCase()
        filtered = filtered.filter(
          ca =>
            ca.name.toLowerCase().includes(searchLower) ||
            ca.displayName?.toLowerCase().includes(searchLower) ||
            ca.contactPerson?.toLowerCase().includes(searchLower) ||
            ca.email?.toLowerCase().includes(searchLower)
        )
      }

      // Type filter
      if (this.filters.type !== 'all') {
        filtered = filtered.filter(ca => ca.type === this.filters.type)
      }

      // Active status filter
      if (this.filters.isActive !== 'all') {
        filtered = filtered.filter(ca => ca.isActive === this.filters.isActive)
      }

      // Preferred status filter
      if (this.filters.isPreferred !== 'all') {
        filtered = filtered.filter(ca => ca.isPreferred === this.filters.isPreferred)
      }

      // Product categories filter
      if (this.filters.productCategories.length > 0) {
        filtered = filtered.filter(ca =>
          this.filters.productCategories.some(category => ca.productCategories.includes(category))
        )
      }

      // Payment terms filter
      if (this.filters.paymentTerms !== 'all') {
        filtered = filtered.filter(ca => ca.paymentTerms === this.filters.paymentTerms)
      }

      // Hide inactive if setting is disabled
      if (!this.viewSettings.showInactive) {
        filtered = filtered.filter(ca => ca.isActive)
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const aVal = (a as any)[this.viewSettings.sortBy]
        const bVal = (b as any)[this.viewSettings.sortBy]

        if (this.viewSettings.sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1
        }
        return aVal > bVal ? 1 : -1
      })

      return filtered
    },

    activeCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.isActive)
    },

    preferredCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.isPreferred && ca.isActive)
    },

    supplierCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.type === 'supplier' && ca.isActive)
    },

    serviceCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.type === 'service' && ca.isActive)
    },

    // =============================================
    // ✅ INTEGRATION GETTERS
    // =============================================

    /**
     * Получить поставщиков по категории продуктов
     */
    getSuppliersByCategory() {
      return (category: ProductCategory): Counteragent[] => {
        return this.counteragents.filter(
          ca => ca.type === 'supplier' && ca.isActive && ca.productCategories.includes(category)
        )
      }
    },

    /**
     * Получить основного поставщика для категории
     */
    getPrimarySupplierForCategory() {
      return (category: ProductCategory): Counteragent | undefined => {
        const suppliers = this.getSuppliersByCategory(category)
        return suppliers.find(s => s.isPreferred) || suppliers[0]
      }
    },

    /**
     * Получить поставщика по ID (для интеграции с Product Store)
     */
    getSupplierById() {
      return (supplierId: string): Counteragent | undefined => {
        return this.counteragents.find(ca => ca.id === supplierId && ca.type === 'supplier')
      }
    },

    /**
     * Статистика для интеграции
     */
    statistics(): CounteragentsStatistics {
      const active = this.counteragents.filter(ca => ca.isActive)
      const preferred = this.counteragents.filter(ca => ca.isPreferred && ca.isActive)

      const typeBreakdown = this.counteragents.reduce(
        (acc, ca) => {
          acc[ca.type] = (acc[ca.type] || 0) + 1
          return acc
        },
        {} as Record<CounteragentType, number>
      )

      const categoryBreakdown = this.counteragents.reduce(
        (acc, ca) => {
          ca.productCategories.forEach(category => {
            acc[category] = (acc[category] || 0) + 1
          })
          return acc
        },
        {} as Record<ProductCategory, number>
      )

      const paymentBreakdown = this.counteragents.reduce(
        (acc, ca) => {
          acc[ca.paymentTerms] = (acc[ca.paymentTerms] || 0) + 1
          return acc
        },
        {} as Record<PaymentTerms, number>
      )

      return {
        totalCounterAgents: this.counteragents.length,
        activeCounterAgents: active.length,
        preferredCounterAgents: preferred.length,
        typeBreakdown,
        productCategoryBreakdown: categoryBreakdown,
        paymentTermsBreakdown: paymentBreakdown
      }
    },

    // Get counteragent by ID
    getCounteragentById: state => {
      return (id: string): Counteragent | undefined => state.counteragents.find(ca => ca.id === id)
    },

    // Check if any counteragents are selected
    hasSelectedCounterAgents(): boolean {
      return this.selectedIds.length > 0
    },

    // Get selected counteragents
    selectedCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => this.selectedIds.includes(ca.id))
    }
  },

  actions: {
    // =============================================
    // ✅ INITIALIZATION (для AppInitializer)
    // =============================================

    /**
     * Инициализация store (вызывается из AppInitializer)
     */
    async initialize(useMockData: boolean = true): Promise<void> {
      try {
        this.loading.counteragents = true
        this.error = null

        DebugUtils.info(MODULE_NAME, '🚀 Initializing Counteragents Store', { useMockData })

        await this.fetchCounterAgents()

        DebugUtils.info(MODULE_NAME, '✅ Counteragents Store initialized successfully', {
          totalCounterAgents: this.counteragents.length,
          activeCounterAgents: this.activeCounterAgents.length,
          preferredCounterAgents: this.preferredCounterAgents.length,
          supplierCounterAgents: this.supplierCounterAgents.length
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to initialize counteragents'
        this.error = message
        DebugUtils.error(MODULE_NAME, '❌ Failed to initialize Counteragents Store', { error })
        throw error
      } finally {
        this.loading.counteragents = false
      }
    },

    // =============================================
    // CRUD OPERATIONS
    // =============================================

    async fetchCounterAgents() {
      this.loading.counteragents = true
      this.error = null

      try {
        DebugUtils.debug(MODULE_NAME, 'Fetching counteragents with filters', {
          filters: this.filters
        })

        const response = await CounteragentsService.getInstance().fetchCounterAgents({
          search: this.filters.search || undefined,
          type: this.filters.type === 'all' ? undefined : this.filters.type,
          isActive: this.filters.isActive === 'all' ? undefined : this.filters.isActive,
          isPreferred: this.filters.isPreferred === 'all' ? undefined : this.filters.isPreferred,
          productCategories:
            this.filters.productCategories.length > 0 ? this.filters.productCategories : undefined,
          paymentTerms: this.filters.paymentTerms === 'all' ? undefined : this.filters.paymentTerms,
          sortBy: this.viewSettings.sortBy,
          sortOrder: this.viewSettings.sortOrder,
          limit: 100 // Get all for now, implement pagination later
        })

        this.counteragents = response.data

        DebugUtils.info(MODULE_NAME, 'Counteragents fetched successfully', {
          total: response.total,
          loaded: response.data.length,
          active: this.activeCounterAgents.length
        })
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error occurred'
        DebugUtils.error(MODULE_NAME, 'Failed to fetch counteragents', { error })
      } finally {
        this.loading.counteragents = false
      }
    },

    async createCounteragent(data: CreateCounteragentData): Promise<Counteragent | null> {
      this.loading.counteragents = true
      this.error = null

      try {
        DebugUtils.debug(MODULE_NAME, 'Creating counteragent', {
          name: data.name,
          type: data.type,
          categories: data.productCategories
        })

        const response = await CounteragentsService.getInstance().createCounteragent(data)
        this.counteragents.push(response.data)

        DebugUtils.info(MODULE_NAME, 'Counteragent created successfully', {
          id: response.data.id,
          name: response.data.name,
          type: response.data.type
        })

        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create counteragent'
        DebugUtils.error(MODULE_NAME, 'Failed to create counteragent', { error, data })
        return null
      } finally {
        this.loading.counteragents = false
      }
    },

    async updateCounteragent(id: string, data: Partial<Counteragent>): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        DebugUtils.debug(MODULE_NAME, 'Updating counteragent', { id, updates: Object.keys(data) })

        const response = await CounteragentsService.getInstance().updateCounteragent(id, data)
        const index = this.counteragents.findIndex(ca => ca.id === id)
        if (index !== -1) {
          this.counteragents[index] = response.data
        }

        // Update current counteragent if it's the one being updated
        if (this.currentCounteragent?.id === id) {
          this.currentCounteragent = response.data
        }

        DebugUtils.info(MODULE_NAME, 'Counteragent updated successfully', {
          id,
          name: response.data.name,
          updatedFields: Object.keys(data)
        })

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update counteragent'
        DebugUtils.error(MODULE_NAME, 'Failed to update counteragent', { error, id, data })
        return false
      } finally {
        this.loading.counteragents = false
      }
    },

    async deleteCounteragent(id: string): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        DebugUtils.debug(MODULE_NAME, 'Deleting counteragent', { id })

        await CounteragentsService.getInstance().deleteCounteragent(id)
        this.counteragents = this.counteragents.filter(ca => ca.id !== id)

        // Clear selection if deleted counteragent was selected
        this.selectedIds = this.selectedIds.filter(selectedId => selectedId !== id)

        // Clear current counteragent if it was deleted
        if (this.currentCounteragent?.id === id) {
          this.currentCounteragent = undefined
        }

        DebugUtils.info(MODULE_NAME, 'Counteragent deleted successfully', { id })

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete counteragent'
        DebugUtils.error(MODULE_NAME, 'Failed to delete counteragent', { error, id })
        return false
      } finally {
        this.loading.counteragents = false
      }
    },

    // =============================================
    // UTILITY ACTIONS
    // =============================================

    async toggleCounteragentStatus(id: string): Promise<boolean> {
      try {
        DebugUtils.debug(MODULE_NAME, 'Toggling counteragent status', { id })

        const response = await CounteragentsService.getInstance().toggleCounteragentStatus(id)
        const index = this.counteragents.findIndex(ca => ca.id === id)
        if (index !== -1) {
          this.counteragents[index] = response.data
        }

        DebugUtils.info(MODULE_NAME, 'Counteragent status toggled', {
          id,
          newStatus: response.data.isActive
        })

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to toggle status'
        DebugUtils.error(MODULE_NAME, 'Failed to toggle status', { error, id })
        return false
      }
    },

    async setPreferredStatus(id: string, isPreferred: boolean): Promise<boolean> {
      try {
        DebugUtils.debug(MODULE_NAME, 'Setting preferred status', { id, isPreferred })

        const response = await CounteragentsService.getInstance().setPreferredStatus(
          id,
          isPreferred
        )
        const index = this.counteragents.findIndex(ca => ca.id === id)
        if (index !== -1) {
          this.counteragents[index] = response.data
        }

        DebugUtils.info(MODULE_NAME, 'Preferred status updated', { id, isPreferred })

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update preferred status'
        DebugUtils.error(MODULE_NAME, 'Failed to update preferred status', {
          error,
          id,
          isPreferred
        })
        return false
      }
    },

    // =============================================
    // ✅ INTEGRATION METHODS
    // =============================================

    /**
     * Получить информацию о поставщике для Product Store
     */
    async getSupplierInfo(supplierId: string): Promise<Counteragent | null> {
      try {
        DebugUtils.debug(MODULE_NAME, 'Getting supplier info', { supplierId })

        const supplier = await CounteragentsService.getInstance().getSupplierForProduct(supplierId)

        if (supplier) {
          DebugUtils.debug(MODULE_NAME, 'Supplier info retrieved', {
            supplierId,
            name: supplier.name,
            leadTime: supplier.leadTimeDays,
            categories: supplier.productCategories
          })
        }

        return supplier
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to get supplier info', { error, supplierId })
        return null
      }
    },

    /**
     * Обновить статистику заказов поставщика
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

        await CounteragentsService.getInstance().updateSupplierOrderStats(supplierId, orderData)

        // Обновляем локальные данные
        await this.fetchCounterAgents()

        DebugUtils.info(MODULE_NAME, 'Supplier order stats updated', { supplierId })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update supplier order stats', {
          error,
          supplierId,
          orderData
        })
      }
    },

    /**
     * Получить рекомендации поставщиков для категории
     */
    getSupplierRecommendations(category: ProductCategory): Counteragent[] {
      DebugUtils.debug(MODULE_NAME, 'Getting supplier recommendations', { category })

      const suppliers = this.getSuppliersByCategory(category)

      // Сортируем по предпочтению и статистике
      const recommendations = suppliers.sort((a, b) => {
        // Сначала предпочтительные
        if (a.isPreferred && !b.isPreferred) return -1
        if (!a.isPreferred && b.isPreferred) return 1

        // Затем по среднему времени доставки
        const aDelivery = a.averageDeliveryTime || a.leadTimeDays
        const bDelivery = b.averageDeliveryTime || b.leadTimeDays
        return aDelivery - bDelivery
      })

      DebugUtils.debug(MODULE_NAME, 'Supplier recommendations generated', {
        category,
        count: recommendations.length,
        preferred: recommendations.filter(s => s.isPreferred).length
      })

      return recommendations
    },

    // =============================================
    // BULK OPERATIONS
    // =============================================

    async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        DebugUtils.debug(MODULE_NAME, 'Bulk updating status', { ids, isActive, count: ids.length })

        await CounteragentsService.getInstance().bulkUpdateStatus(ids, isActive)

        // Update local state
        ids.forEach(id => {
          const index = this.counteragents.findIndex(ca => ca.id === id)
          if (index !== -1) {
            this.counteragents[index].isActive = isActive
            this.counteragents[index].updatedAt = new Date().toISOString()
          }
        })

        DebugUtils.info(MODULE_NAME, 'Bulk status update completed', {
          count: ids.length,
          isActive
        })

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to bulk update status'
        DebugUtils.error(MODULE_NAME, 'Bulk status update failed', { error, ids, isActive })
        return false
      } finally {
        this.loading.counteragents = false
      }
    },

    async bulkDelete(ids: string[]): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        DebugUtils.debug(MODULE_NAME, 'Bulk deleting counteragents', { ids, count: ids.length })

        await CounteragentsService.getInstance().bulkDelete(ids)

        // Update local state
        this.counteragents = this.counteragents.filter(ca => !ids.includes(ca.id))
        this.selectedIds = this.selectedIds.filter(id => !ids.includes(id))

        DebugUtils.info(MODULE_NAME, 'Bulk delete completed', { count: ids.length })

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to bulk delete'
        DebugUtils.error(MODULE_NAME, 'Bulk delete failed', { error, ids })
        return false
      } finally {
        this.loading.counteragents = false
      }
    },

    // =============================================
    // SELECTION MANAGEMENT
    // =============================================

    selectCounteragent(id: string) {
      if (!this.selectedIds.includes(id)) {
        this.selectedIds.push(id)
      }
    },

    deselectCounteragent(id: string) {
      this.selectedIds = this.selectedIds.filter(selectedId => selectedId !== id)
    },

    toggleCounteragentSelection(id: string) {
      if (this.selectedIds.includes(id)) {
        this.deselectCounteragent(id)
      } else {
        this.selectCounteragent(id)
      }
    },

    selectAllFiltered() {
      this.selectedIds = this.filteredCounterAgents.map(ca => ca.id)
    },

    clearSelection() {
      this.selectedIds = []
    },

    setCurrentCounteragent(counteragent: Counteragent | undefined) {
      this.currentCounteragent = counteragent
    },

    // =============================================
    // FILTER MANAGEMENT
    // =============================================

    setSearchFilter(search: string) {
      this.filters.search = search
    },

    setTypeFilter(type: CounteragentType | 'all') {
      this.filters.type = type
    },

    setActiveFilter(isActive: boolean | 'all') {
      this.filters.isActive = isActive
    },

    setPreferredFilter(isPreferred: boolean | 'all') {
      this.filters.isPreferred = isPreferred
    },

    setCategoryFilter(categories: ProductCategory[]) {
      this.filters.productCategories = categories
    },

    setPaymentTermsFilter(paymentTerms: PaymentTerms | 'all') {
      this.filters.paymentTerms = paymentTerms
    },

    clearFilters() {
      this.filters = {
        search: '',
        type: 'all',
        isActive: 'all',
        isPreferred: 'all',
        productCategories: [],
        paymentTerms: 'all'
      }
    },

    // =============================================
    // VIEW SETTINGS
    // =============================================

    setSortBy(sortBy: string) {
      if (this.viewSettings.sortBy === sortBy) {
        // Toggle sort order if same field
        this.viewSettings.sortOrder = this.viewSettings.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.viewSettings.sortBy = sortBy
        this.viewSettings.sortOrder = 'asc'
      }
    },

    setItemsPerPage(itemsPerPage: number) {
      this.viewSettings.itemsPerPage = itemsPerPage
    },

    toggleShowInactive() {
      this.viewSettings.showInactive = !this.viewSettings.showInactive
    },

    // =============================================
    // ERROR MANAGEMENT
    // =============================================

    clearError() {
      this.error = null
    },

    // =============================================
    // SEARCH METHODS
    // =============================================

    async searchCounterAgents(query: string): Promise<Counteragent[]> {
      try {
        DebugUtils.debug(MODULE_NAME, 'Searching counteragents', { query })
        return await CounteragentsService.getInstance().searchCounterAgents(query)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Search failed', { error, query })
        return []
      }
    },

    async getCounteragentsByCategory(category: ProductCategory | 'all'): Promise<Counteragent[]> {
      try {
        DebugUtils.debug(MODULE_NAME, 'Getting counteragents by category', { category })
        return await CounteragentsService.getInstance().getCounteragentsByCategory(category)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Filter by category failed', { error, category })
        return []
      }
    },

    async getCounteragentsByType(type: CounteragentType | 'all'): Promise<Counteragent[]> {
      try {
        DebugUtils.debug(MODULE_NAME, 'Getting counteragents by type', { type })
        return await CounteragentsService.getInstance().getCounteragentsByType(type)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Filter by type failed', { error, type })
        return []
      }
    }
  }
})
