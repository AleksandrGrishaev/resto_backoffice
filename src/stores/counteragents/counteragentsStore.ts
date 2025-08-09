// src/stores/counteragents/counteragentsStore.ts

import { defineStore } from 'pinia'
import type {
  Counteragent,
  CreateCounteragentData,
  CounteragentsState,
  CounteragentsStatistics,
  CounteragentType,
  ProductCategory,
  PaymentTerms
} from './types'
import { CounteragentsService } from './counteragentsService'

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
    // Filtered counteragents based on current filters
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

    // Active counteragents only
    activeCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.isActive)
    },

    // Preferred counteragents only
    preferredCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.isPreferred && ca.isActive)
    },

    // Counteragents by type
    supplierCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.type === 'supplier' && ca.isActive)
    },

    serviceCounterAgents(): Counteragent[] {
      return this.counteragents.filter(ca => ca.type === 'service' && ca.isActive)
    },

    // Statistics
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
    // CRUD OPERATIONS
    // =============================================

    async fetchCounterAgents() {
      this.loading.counteragents = true
      this.error = null

      try {
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
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Failed to fetch counteragents:', error)
      } finally {
        this.loading.counteragents = false
      }
    },

    async createCounteragent(data: CreateCounteragentData): Promise<Counteragent | null> {
      this.loading.counteragents = true
      this.error = null

      try {
        const response = await CounteragentsService.getInstance().createCounteragent(data)
        this.counteragents.push(response.data)
        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create counteragent'
        console.error('Failed to create counteragent:', error)
        return null
      } finally {
        this.loading.counteragents = false
      }
    },

    async updateCounteragent(id: string, data: Partial<Counteragent>): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        const response = await CounteragentsService.getInstance().updateCounteragent(id, data)
        const index = this.counteragents.findIndex(ca => ca.id === id)
        if (index !== -1) {
          this.counteragents[index] = response.data
        }

        // Update current counteragent if it's the one being updated
        if (this.currentCounteragent?.id === id) {
          this.currentCounteragent = response.data
        }

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update counteragent'
        console.error('Failed to update counteragent:', error)
        return false
      } finally {
        this.loading.counteragents = false
      }
    },

    async deleteCounteragent(id: string): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        await CounteragentsService.getInstance().deleteCounteragent(id)
        this.counteragents = this.counteragents.filter(ca => ca.id !== id)

        // Clear selection if deleted counteragent was selected
        this.selectedIds = this.selectedIds.filter(selectedId => selectedId !== id)

        // Clear current counteragent if it was deleted
        if (this.currentCounteragent?.id === id) {
          this.currentCounteragent = undefined
        }

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete counteragent'
        console.error('Failed to delete counteragent:', error)
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
        const response = await CounteragentsService.getInstance().toggleCounteragentStatus(id)
        const index = this.counteragents.findIndex(ca => ca.id === id)
        if (index !== -1) {
          this.counteragents[index] = response.data
        }
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to toggle status'
        return false
      }
    },

    async setPreferredStatus(id: string, isPreferred: boolean): Promise<boolean> {
      try {
        const response = await CounteragentsService.getInstance().setPreferredStatus(
          id,
          isPreferred
        )
        const index = this.counteragents.findIndex(ca => ca.id === id)
        if (index !== -1) {
          this.counteragents[index] = response.data
        }
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update preferred status'
        return false
      }
    },

    // =============================================
    // BULK OPERATIONS
    // =============================================

    async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        await CounteragentsService.getInstance().bulkUpdateStatus(ids, isActive)

        // Update local state
        ids.forEach(id => {
          const index = this.counteragents.findIndex(ca => ca.id === id)
          if (index !== -1) {
            this.counteragents[index].isActive = isActive
            this.counteragents[index].updatedAt = new Date().toISOString()
          }
        })

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to bulk update status'
        return false
      } finally {
        this.loading.counteragents = false
      }
    },

    async bulkDelete(ids: string[]): Promise<boolean> {
      this.loading.counteragents = true
      this.error = null

      try {
        await CounteragentsService.getInstance().bulkDelete(ids)

        // Update local state
        this.counteragents = this.counteragents.filter(ca => !ids.includes(ca.id))
        this.selectedIds = this.selectedIds.filter(id => !ids.includes(id))

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to bulk delete'
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
        return await CounteragentsService.getInstance().searchCounterAgents(query)
      } catch (error) {
        console.error('Search failed:', error)
        return []
      }
    },

    async getCounteragentsByCategory(category: ProductCategory | 'all'): Promise<Counteragent[]> {
      try {
        return await CounteragentsService.getInstance().getCounteragentsByCategory(category)
      } catch (error) {
        console.error('Filter by category failed:', error)
        return []
      }
    },

    async getCounteragentsByType(type: CounteragentType | 'all'): Promise<Counteragent[]> {
      try {
        return await CounteragentsService.getInstance().getCounteragentsByType(type)
      } catch (error) {
        console.error('Filter by type failed:', error)
        return []
      }
    }
  }
})
