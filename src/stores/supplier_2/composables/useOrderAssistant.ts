// src/stores/supplier_2/composables/useOrderAssistant.ts - COMPLETE ENHANCED WITH FULL INTEGRATION

import { ref, computed, watch, nextTick } from 'vue'
import { useSupplierStore } from '../supplierStore'
import { supplierService } from '../supplierService'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils, TimeUtils } from '@/utils'
import { mockOrderSuggestions } from '../mock/supplierMock'

import type {
  OrderSuggestion,
  CreateRequestData,
  RequestItem,
  Department,
  Priority,
  Urgency
} from '../types'

const MODULE_NAME = 'OrderAssistant'

// =============================================
// ENHANCED STATE INTERFACES
// =============================================

interface OrderAssistantState {
  selectedDepartment: Department
  selectedItems: RequestItem[]
  isGenerating: boolean
  isLoadingPrices: boolean
  isCreatingRequest: boolean
  lastRefresh: string | null
  errors: string[]
  performanceMetrics: {
    lastGenerationTime: number
    lastPriceUpdateTime: number
    avgGenerationTime: number
    avgPriceUpdateTime: number
  }
}

interface SuggestionFilters {
  urgency: Urgency | 'all'
  category: string | 'all'
  minStock: boolean
  outOfStock: boolean
  priceRange: { min: number; max: number } | null
  searchTerm: string
}

interface DepartmentAnalytics {
  totalProducts: number
  outOfStock: number
  lowStock: number
  nearExpiry: number
  expired: number
  totalValue: number
  lastUpdated: string | null
  criticalItems: number
  avgDaysToExpiry: number
  inventoryTurnover: number
}

interface RequestSummary {
  totalItems: number
  estimatedTotal: number
  urgentItems: number
  averageUnitCost: number
  departmentBreakdown: Record<string, number>
  supplierBreakdown: Record<string, number>
  categoryBreakdown: Record<string, number>
}

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useOrderAssistant() {
  const supplierStore = useSupplierStore()
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

  // =============================================
  // STATE - Enhanced with comprehensive tracking
  // =============================================

  const state = ref<OrderAssistantState>({
    selectedDepartment: 'kitchen',
    selectedItems: [],
    isGenerating: false,
    isLoadingPrices: false,
    isCreatingRequest: false,
    lastRefresh: null,
    errors: [],
    performanceMetrics: {
      lastGenerationTime: 0,
      lastPriceUpdateTime: 0,
      avgGenerationTime: 0,
      avgPriceUpdateTime: 0
    }
  })

  const filters = ref<SuggestionFilters>({
    urgency: 'all',
    category: 'all',
    minStock: true,
    outOfStock: true,
    priceRange: null,
    searchTerm: ''
  })

  const autoRefresh = ref(true)
  const refreshInterval = ref(30000) // 30 seconds

  // =============================================
  // COMPUTED PROPERTIES - Enhanced with analytics
  // =============================================

  /**
   * ✅ ENHANCED: Get suggestions with fallback and filtering
   */
  const allSuggestions = computed(() => {
    const storeSuggestions = supplierStore.state.orderSuggestions

    if (Array.isArray(storeSuggestions) && storeSuggestions.length > 0) {
      return storeSuggestions
    }

    // Fallback to mock data with warning
    if (storeSuggestions.length === 0) {
      DebugUtils.warn(MODULE_NAME, 'Using mock suggestions as fallback')
      state.value.errors.push('Using mock data - integration may have issues')
    }

    return mockOrderSuggestions
  })

  /**
   * ✅ ENHANCED: Advanced suggestion filtering
   */
  const filteredSuggestions = computed(() => {
    let suggestions = allSuggestions.value

    // Department filtering
    suggestions = suggestions.filter(suggestion => {
      if (state.value.selectedDepartment === 'kitchen') {
        return !isBarItem(suggestion.itemId)
      } else {
        return isBarItem(suggestion.itemId)
      }
    })

    // Apply additional filters
    if (filters.value.urgency !== 'all') {
      suggestions = suggestions.filter(s => s.urgency === filters.value.urgency)
    }

    if (filters.value.category !== 'all') {
      suggestions = suggestions.filter(s => {
        const product = productsStore.products.find(p => p.id === s.itemId)
        return product?.category === filters.value.category
      })
    }

    if (!filters.value.outOfStock) {
      suggestions = suggestions.filter(s => s.currentStock > 0)
    }

    if (!filters.value.minStock) {
      suggestions = suggestions.filter(s => s.reason !== 'below_minimum')
    }

    if (filters.value.priceRange) {
      const { min, max } = filters.value.priceRange
      suggestions = suggestions.filter(s => s.estimatedPrice >= min && s.estimatedPrice <= max)
    }

    if (filters.value.searchTerm) {
      const searchLower = filters.value.searchTerm.toLowerCase()
      suggestions = suggestions.filter(
        s =>
          s.itemName.toLowerCase().includes(searchLower) ||
          s.itemId.toLowerCase().includes(searchLower)
      )
    }

    return suggestions
  })

  /**
   * ✅ ENHANCED: Suggestions by urgency with detailed breakdown
   */
  const urgentSuggestions = computed(() =>
    filteredSuggestions.value.filter(s => s.urgency === 'high')
  )

  const mediumSuggestions = computed(() =>
    filteredSuggestions.value.filter(s => s.urgency === 'medium')
  )

  const lowSuggestions = computed(() => filteredSuggestions.value.filter(s => s.urgency === 'low'))

  const criticalSuggestions = computed(() =>
    urgentSuggestions.value.filter(s => s.currentStock === 0)
  )

  /**
   * ✅ ENHANCED: Comprehensive request summary with analytics
   */
  const requestSummary = computed((): RequestSummary => {
    const items = state.value.selectedItems

    if (items.length === 0) {
      return {
        totalItems: 0,
        estimatedTotal: 0,
        urgentItems: 0,
        averageUnitCost: 0,
        departmentBreakdown: {},
        supplierBreakdown: {},
        categoryBreakdown: {}
      }
    }

    let estimatedTotal = 0
    let urgentItems = 0
    const departmentBreakdown: Record<string, number> = {}
    const supplierBreakdown: Record<string, number> = {}
    const categoryBreakdown: Record<string, number> = {}

    for (const item of items) {
      const itemTotal = item.requestedQuantity * item.estimatedPrice
      estimatedTotal += itemTotal

      if (item.priority === 'urgent') {
        urgentItems++
      }

      // Department breakdown (always current department for now)
      const dept = state.value.selectedDepartment
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + itemTotal

      // Category breakdown
      const category = item.category || 'other'
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + itemTotal

      // Supplier breakdown (simplified - would need supplier mapping)
      const supplier = getPreferredSupplier(item.itemId)
      supplierBreakdown[supplier] = (supplierBreakdown[supplier] || 0) + itemTotal
    }

    const averageUnitCost = estimatedTotal / items.length

    return {
      totalItems: items.length,
      estimatedTotal: Math.round(estimatedTotal),
      urgentItems,
      averageUnitCost: Math.round(averageUnitCost),
      departmentBreakdown,
      supplierBreakdown,
      categoryBreakdown
    }
  })

  /**
   * ✅ ENHANCED: Comprehensive department analytics
   */
  const departmentAnalytics = computed((): DepartmentAnalytics => {
    try {
      const balances = storageStore.departmentBalances(state.value.selectedDepartment)

      if (balances.length === 0) {
        return {
          totalProducts: 0,
          outOfStock: 0,
          lowStock: 0,
          nearExpiry: 0,
          expired: 0,
          totalValue: 0,
          lastUpdated: null,
          criticalItems: 0,
          avgDaysToExpiry: 0,
          inventoryTurnover: 0
        }
      }

      const outOfStock = balances.filter(b => b.totalQuantity <= 0).length
      const lowStock = balances.filter(b => b.belowMinStock && b.totalQuantity > 0).length
      const nearExpiry = balances.filter(b => b.hasNearExpiry).length
      const expired = balances.filter(b => b.hasExpired).length
      const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0)
      const criticalItems = outOfStock + expired

      // Calculate average days to expiry for items with expiry dates
      let totalDaysToExpiry = 0
      let itemsWithExpiry = 0

      for (const balance of balances) {
        if (balance.oldestBatchDate) {
          const product = productsStore.products.find(p => p.id === balance.itemId)
          if (product?.shelfLife) {
            const batchDate = new Date(balance.oldestBatchDate)
            const expiryDate = new Date(batchDate)
            expiryDate.setDate(expiryDate.getDate() + product.shelfLife)

            const now = new Date()
            const daysToExpiry = Math.ceil(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )

            if (daysToExpiry >= 0) {
              totalDaysToExpiry += daysToExpiry
              itemsWithExpiry++
            }
          }
        }
      }

      const avgDaysToExpiry = itemsWithExpiry > 0 ? totalDaysToExpiry / itemsWithExpiry : 0

      // Simplified inventory turnover calculation
      const inventoryTurnover = calculateInventoryTurnover(balances)

      return {
        totalProducts: balances.length,
        outOfStock,
        lowStock,
        nearExpiry,
        expired,
        totalValue: Math.round(totalValue),
        lastUpdated: storageStore.state.lastCalculated || null,
        criticalItems,
        avgDaysToExpiry: Math.round(avgDaysToExpiry),
        inventoryTurnover: Math.round(inventoryTurnover * 100) / 100
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate department analytics', { error })

      return {
        totalProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        nearExpiry: 0,
        expired: 0,
        totalValue: 0,
        lastUpdated: null,
        criticalItems: 0,
        avgDaysToExpiry: 0,
        inventoryTurnover: 0
      }
    }
  })

  /**
   * ✅ ENHANCED: Loading states with detailed tracking
   */
  const isLoading = computed(
    () =>
      state.value.isGenerating ||
      state.value.isLoadingPrices ||
      state.value.isCreatingRequest ||
      supplierStore.state.loading.suggestions ||
      storageStore.state.loading.balances
  )

  const hasErrors = computed(() => state.value.errors.length > 0)

  const integrationHealth = computed(() => {
    const storageConnected = storageStore.state.balances.length > 0
    const productsConnected = productsStore.products.length > 0
    const suggestionsFromIntegration = !supplierStore.integrationState.useMockData
    const hasRecentErrors = state.value.errors.length > 0

    if (!storageConnected || !productsConnected) return 'critical'
    if (hasRecentErrors || !suggestionsFromIntegration) return 'poor'
    return 'excellent'
  })

  // =============================================
  // ACTIONS - Enhanced with comprehensive functionality
  // =============================================

  /**
   * ✅ ENHANCED: Generate suggestions with performance tracking
   */
  async function generateSuggestions(department?: Department): Promise<OrderSuggestion[]> {
    const startTime = Date.now()

    try {
      state.value.isGenerating = true
      clearErrors()

      const targetDepartment = department || state.value.selectedDepartment

      DebugUtils.info(MODULE_NAME, '🔍 Generating suggestions with full integration', {
        department: targetDepartment,
        autoRefresh: autoRefresh.value
      })

      // Ensure storage data is fresh
      if (shouldRefreshStorageData()) {
        await storageStore.fetchBalances(targetDepartment)
      }

      // Generate suggestions through supplier service
      const newSuggestions = await supplierService.getOrderSuggestions(targetDepartment)

      // Update supplier store
      supplierStore.state.orderSuggestions = newSuggestions
      state.value.lastRefresh = TimeUtils.getCurrentLocalISO()

      // Update performance metrics
      const generationTime = Date.now() - startTime
      updatePerformanceMetric('lastGenerationTime', generationTime)
      updatePerformanceMetric('avgGenerationTime', generationTime)

      DebugUtils.info(MODULE_NAME, '✅ Suggestions generated successfully', {
        department: targetDepartment,
        total: newSuggestions.length,
        urgent: newSuggestions.filter(s => s.urgency === 'high').length,
        medium: newSuggestions.filter(s => s.urgency === 'medium').length,
        low: newSuggestions.filter(s => s.urgency === 'low').length,
        generationTime: `${generationTime}ms`,
        dataSource: supplierStore.integrationState.useMockData ? 'mock' : 'integrated'
      })

      return newSuggestions
    } catch (error) {
      const errorMessage = `Failed to generate suggestions: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Suggestion generation failed', { error })
      addError(errorMessage)
      throw error
    } finally {
      state.value.isGenerating = false
    }
  }

  /**
   * ✅ ENHANCED: Get estimated price with multiple fallbacks
   */
  function getEstimatedPrice(itemId: string): number {
    try {
      // 1. Try from current suggestions (most recent)
      const suggestion = allSuggestions.value.find(s => s.itemId === itemId)
      if (suggestion?.estimatedPrice && suggestion.estimatedPrice > 0) {
        return suggestion.estimatedPrice
      }

      // 2. Try from Storage Store (latest cost from receipts)
      const balance = storageStore.getBalance(itemId)
      if (balance?.latestCost && balance.latestCost > 0) {
        return balance.latestCost
      }

      // 3. Try average cost from Storage Store
      if (balance?.averageCost && balance.averageCost > 0) {
        return balance.averageCost
      }

      // 4. Try from Products Store (base cost)
      const product = productsStore.products.find(p => p.id === itemId)
      if (product?.baseCostPerUnit && product.baseCostPerUnit > 0) {
        return product.baseCostPerUnit
      }

      // 5. Try legacy cost from Products Store
      if (product?.costPerUnit && product.costPerUnit > 0) {
        return product.costPerUnit
      }

      DebugUtils.warn(MODULE_NAME, '⚠️  No price found for item, using 0', { itemId })
      return 0
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, '⚠️  Failed to get estimated price', { itemId, error })
      return 0
    }
  }

  /**
   * ✅ ENHANCED: Update prices with batch processing and performance tracking
   */
  async function updatePrices(itemIds?: string[]): Promise<void> {
    const startTime = Date.now()

    try {
      state.value.isLoadingPrices = true

      const targetItemIds = itemIds || state.value.selectedItems.map(item => item.itemId)

      if (targetItemIds.length === 0) {
        DebugUtils.debug(MODULE_NAME, 'No items to update prices for')
        return
      }

      DebugUtils.info(MODULE_NAME, '💰 Updating prices from storage data', {
        itemCount: targetItemIds.length
      })

      const latestPrices = await supplierService.getLatestPrices(targetItemIds)
      let updatedCount = 0

      // Update prices in suggestions
      if (supplierStore.state.orderSuggestions.length > 0) {
        supplierStore.state.orderSuggestions = supplierStore.state.orderSuggestions.map(
          suggestion => {
            const newPrice = latestPrices[suggestion.itemId]
            if (newPrice && Math.abs(newPrice - suggestion.estimatedPrice) > 0.01) {
              updatedCount++
              return {
                ...suggestion,
                estimatedPrice: newPrice,
                lastPriceDate: TimeUtils.getCurrentLocalISO()
              }
            }
            return suggestion
          }
        )
      }

      // Update prices in selected items
      for (const item of state.value.selectedItems) {
        const newPrice = latestPrices[item.itemId]
        if (newPrice && Math.abs(newPrice - item.estimatedPrice) > 0.01) {
          item.estimatedPrice = newPrice
          item.notes =
            `${item.notes || ''} [Price updated: ${TimeUtils.getCurrentLocalISO()}]`.trim()
        }
      }

      // Update performance metrics
      const updateTime = Date.now() - startTime
      updatePerformanceMetric('lastPriceUpdateTime', updateTime)
      updatePerformanceMetric('avgPriceUpdateTime', updateTime)

      DebugUtils.info(MODULE_NAME, '✅ Prices updated successfully', {
        totalItems: targetItemIds.length,
        updatedPrices: updatedCount,
        updateTime: `${updateTime}ms`
      })
    } catch (error) {
      const errorMessage = `Failed to update prices: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Price update failed', { error })
      addError(errorMessage)
    } finally {
      state.value.isLoadingPrices = false
    }
  }

  /**
   * ✅ ENHANCED: Add item with smart defaults and validation
   */
  function addItem(suggestion: OrderSuggestion, quantity?: number): void {
    try {
      // Check if item already exists
      const existingItemIndex = state.value.selectedItems.findIndex(
        item => item.itemId === suggestion.itemId
      )

      const quantityToAdd = quantity || suggestion.suggestedQuantity

      if (existingItemIndex !== -1) {
        // Update existing item
        const existingItem = state.value.selectedItems[existingItemIndex]
        existingItem.requestedQuantity += quantityToAdd

        // Update notes
        const timestamp = new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        })
        existingItem.notes =
          `${existingItem.notes || ''} [+${quantityToAdd} added at ${timestamp}]`.trim()

        DebugUtils.debug(MODULE_NAME, '➕ Updated existing item quantity', {
          itemId: suggestion.itemId,
          newQuantity: existingItem.requestedQuantity,
          added: quantityToAdd
        })
      } else {
        // Add new item
        const product = productsStore.products.find(p => p.id === suggestion.itemId)

        const newItem: RequestItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          itemId: suggestion.itemId,
          itemName: suggestion.itemName,
          category: product?.category || 'other',
          requestedQuantity: quantityToAdd,
          unit: product?.unit || 'kg',
          estimatedPrice: suggestion.estimatedPrice,
          priority: suggestion.urgency === 'high' ? 'urgent' : 'normal',
          notes: `Auto-generated: ${suggestion.reason} (current: ${suggestion.currentStock}, min: ${suggestion.minStock})`
        }

        state.value.selectedItems.push(newItem)

        DebugUtils.debug(MODULE_NAME, '➕ New item added to request', {
          itemId: suggestion.itemId,
          quantity: quantityToAdd,
          totalItems: state.value.selectedItems.length
        })
      }

      // Auto-update prices for the item
      updatePrices([suggestion.itemId])
    } catch (error) {
      const errorMessage = `Failed to add item: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Failed to add item', { suggestion, error })
      addError(errorMessage)
    }
  }

  /**
   * ✅ ENHANCED: Add urgent items with smart grouping
   */
  function addUrgentItems(maxItems?: number): void {
    try {
      const urgentItems = urgentSuggestions.value.slice(0, maxItems || 10)
      let addedCount = 0

      for (const suggestion of urgentItems) {
        addItem(suggestion)
        addedCount++
      }

      DebugUtils.info(MODULE_NAME, '🚨 Urgent items added automatically', {
        available: urgentSuggestions.value.length,
        added: addedCount,
        totalItems: state.value.selectedItems.length
      })
    } catch (error) {
      const errorMessage = `Failed to add urgent items: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Failed to add urgent items', { error })
      addError(errorMessage)
    }
  }

  /**
   * ✅ ENHANCED: Add items by category
   */
  function addItemsByCategory(category: string, urgencyFilter?: Urgency): void {
    try {
      const categoryItems = filteredSuggestions.value.filter(s => {
        const product = productsStore.products.find(p => p.id === s.itemId)
        return (
          product?.category === category && (urgencyFilter ? s.urgency === urgencyFilter : true)
        )
      })

      let addedCount = 0
      for (const suggestion of categoryItems) {
        addItem(suggestion)
        addedCount++
      }

      DebugUtils.info(MODULE_NAME, '📦 Items added by category', {
        category,
        urgencyFilter,
        available: categoryItems.length,
        added: addedCount
      })
    } catch (error) {
      const errorMessage = `Failed to add items by category: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Failed to add items by category', { category, error })
      addError(errorMessage)
    }
  }

  /**
   * ✅ ENHANCED: Remove item with cleanup
   */
  function removeItem(itemId: string): void {
    try {
      const index = state.value.selectedItems.findIndex(item => item.itemId === itemId)

      if (index !== -1) {
        const removedItem = state.value.selectedItems[index]
        state.value.selectedItems.splice(index, 1)

        DebugUtils.debug(MODULE_NAME, '➖ Item removed from request', {
          itemId,
          itemName: removedItem.itemName,
          remainingItems: state.value.selectedItems.length
        })
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to remove item', { itemId, error })
    }
  }

  /**
   * ✅ ENHANCED: Update item quantity with validation
   */
  function updateItemQuantity(itemId: string, quantity: number): void {
    try {
      const item = state.value.selectedItems.find(item => item.itemId === itemId)

      if (item) {
        const oldQuantity = item.requestedQuantity
        item.requestedQuantity = Math.max(0, quantity)

        // Remove item if quantity becomes 0
        if (item.requestedQuantity === 0) {
          removeItem(itemId)
          return
        }

        // Update notes with change tracking
        const timestamp = new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        })
        item.notes =
          `${item.notes || ''} [Qty: ${oldQuantity} → ${item.requestedQuantity} at ${timestamp}]`.trim()

        DebugUtils.debug(MODULE_NAME, '📝 Item quantity updated', {
          itemId,
          oldQuantity,
          newQuantity: item.requestedQuantity
        })

        // Auto-update estimated price
        item.estimatedPrice = getEstimatedPrice(itemId)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to update item quantity', {
        itemId,
        quantity,
        error
      })
    }
  }

  /**
   * ✅ ENHANCED: Update item priority with validation
   */
  function updateItemPriority(itemId: string, priority: Priority): void {
    try {
      const item = state.value.selectedItems.find(item => item.itemId === itemId)

      if (item) {
        const oldPriority = item.priority
        item.priority = priority

        DebugUtils.debug(MODULE_NAME, '⚡ Item priority updated', {
          itemId,
          oldPriority,
          newPriority: priority
        })
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to update item priority', {
        itemId,
        priority,
        error
      })
    }
  }

  /**
   * ✅ ENHANCED: Create request with comprehensive validation and enhancement
   */
  async function createRequest(
    requestedBy: string,
    options?: {
      priority?: Priority
      notes?: string
      department?: Department
      validatePrices?: boolean
    }
  ): Promise<string> {
    const startTime = Date.now()

    try {
      state.value.isCreatingRequest = true

      if (state.value.selectedItems.length === 0) {
        throw new Error('No items selected for request')
      }

      const targetDepartment = options?.department || state.value.selectedDepartment
      const validatePrices = options?.validatePrices ?? true

      DebugUtils.info(MODULE_NAME, '📝 Creating request with enhanced validation', {
        itemCount: state.value.selectedItems.length,
        department: targetDepartment,
        requestedBy,
        validatePrices
      })

      // Validate and update prices if requested
      if (validatePrices) {
        await updatePrices()
      }

      // Determine overall priority
      const hasUrgentItems = state.value.selectedItems.some(item => item.priority === 'urgent')
      const overallPriority = options?.priority || (hasUrgentItems ? 'urgent' : 'normal')

      // Create request data
      const createData: CreateRequestData = {
        department: targetDepartment,
        requestedBy,
        items: state.value.selectedItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          category: item.category,
          requestedQuantity: item.requestedQuantity,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          priority: item.priority,
          notes: item.notes
        })),
        priority: overallPriority,
        notes: [
          `Created from Order Assistant for ${targetDepartment} department`,
          `Total estimated value: ${formatCurrency(requestSummary.value.estimatedTotal)}`,
          options?.notes || ''
        ]
          .filter(Boolean)
          .join(' | ')
      }

      // Create request through supplier store (with integration)
      const newRequest = await supplierStore.createRequest(createData)

      // Clear selected items after successful creation
      clearSelectedItems()

      const creationTime = Date.now() - startTime

      DebugUtils.info(MODULE_NAME, '✅ Request created successfully', {
        requestId: newRequest.id,
        requestNumber: newRequest.requestNumber,
        itemsCount: newRequest.items.length,
        totalValue: requestSummary.value.estimatedTotal,
        creationTime: `${creationTime}ms`,
        department: targetDepartment,
        priority: overallPriority
      })

      return newRequest.id
    } catch (error) {
      const errorMessage = `Failed to create request: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Request creation failed', { error })
      addError(errorMessage)
      throw error
    } finally {
      state.value.isCreatingRequest = false
    }
  }

  /**
   * ✅ ENHANCED: Clear selected items with confirmation
   */
  function clearSelectedItems(): void {
    const itemCount = state.value.selectedItems.length
    state.value.selectedItems = []

    DebugUtils.debug(MODULE_NAME, '🧹 Selected items cleared', {
      clearedCount: itemCount
    })
  }

  /**
   * ✅ NEW: Refresh data from all sources
   */
  async function refreshData(): Promise<void> {
    try {
      clearErrors()

      DebugUtils.info(MODULE_NAME, '🔄 Refreshing all data sources...')

      // Refresh storage data
      await storageStore.fetchBalances(state.value.selectedDepartment)

      // Refresh products data if needed
      if (productsStore.products.length === 0) {
        await productsStore.loadProducts()
      }

      // Regenerate suggestions
      await generateSuggestions(state.value.selectedDepartment)

      // Update prices for selected items
      if (state.value.selectedItems.length > 0) {
        await updatePrices()
      }

      DebugUtils.info(MODULE_NAME, '✅ All data refreshed successfully')
    } catch (error) {
      const errorMessage = `Failed to refresh data: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Data refresh failed', { error })
      addError(errorMessage)
      throw error
    }
  }

  /**
   * ✅ ENHANCED: Get comprehensive item information
   */
  function getItemInfo(itemId: string) {
    try {
      const balance = storageStore.getBalance(itemId)
      const product = productsStore.products.find(p => p.id === itemId)
      const suggestion = allSuggestions.value.find(s => s.itemId === itemId)
      const selectedItem = state.value.selectedItems.find(item => item.itemId === itemId)

      const itemInfo = {
        // Basic information
        itemId,
        itemName: product?.name || balance?.itemName || itemId,
        category: product?.category || 'unknown',
        unit: product?.unit || balance?.unit || 'kg',

        // Stock information
        currentStock: balance?.totalQuantity || 0,
        minStock: product?.minStock || 0,
        maxStock: product?.maxStock,
        belowMinStock: balance?.belowMinStock || false,

        // Pricing information
        baseCost: product?.baseCostPerUnit || product?.costPerUnit || 0,
        latestCost: balance?.latestCost || 0,
        averageCost: balance?.averageCost || 0,
        estimatedPrice: getEstimatedPrice(itemId),

        // Dates and timing
        lastReceiptDate: balance?.newestBatchDate,
        oldestBatchDate: balance?.oldestBatchDate,

        // Status flags
        isActive: product?.isActive ?? true,
        canBeSold: product?.canBeSold ?? false,
        hasExpired: balance?.hasExpired || false,
        hasNearExpiry: balance?.hasNearExpiry || false,

        // Suggestion information
        isUrgent: suggestion?.urgency === 'high',
        suggestedQuantity: suggestion?.suggestedQuantity || 0,
        urgency: suggestion?.urgency,
        reason: suggestion?.reason,

        // Selection information
        isSelected: !!selectedItem,
        selectedQuantity: selectedItem?.requestedQuantity || 0,
        selectedPriority: selectedItem?.priority,

        // Additional data
        shelfLife: product?.shelfLife,
        totalValue: balance?.totalValue || 0,
        storageConditions: product?.storageConditions,

        // Calculated fields
        daysUntilExpiry: calculateDaysUntilExpiry(itemId),
        stockLevel: calculateStockLevel(balance, product),
        reorderPoint: calculateReorderPoint(balance, product),
        turnoverRate: calculateTurnoverRate(itemId)
      }

      return itemInfo
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, '⚠️  Failed to get item info', { itemId, error })
      return null
    }
  }

  /**
   * ✅ NEW: Get suggestions by various criteria
   */
  function getSuggestionsByUrgency(urgency: Urgency): OrderSuggestion[] {
    return filteredSuggestions.value.filter(s => s.urgency === urgency)
  }

  function getSuggestionsByCategory(category: string): OrderSuggestion[] {
    return filteredSuggestions.value.filter(s => {
      const product = productsStore.products.find(p => p.id === s.itemId)
      return product?.category === category
    })
  }

  function getSuggestionsByPriceRange(minPrice: number, maxPrice: number): OrderSuggestion[] {
    return filteredSuggestions.value.filter(
      s => s.estimatedPrice >= minPrice && s.estimatedPrice <= maxPrice
    )
  }

  function getSuggestionsOutOfStock(): OrderSuggestion[] {
    return filteredSuggestions.value.filter(s => s.currentStock === 0)
  }

  function getSuggestionsBelowMinStock(): OrderSuggestion[] {
    return filteredSuggestions.value.filter(s => s.reason === 'below_minimum')
  }

  /**
   * ✅ NEW: Smart suggestions based on patterns
   */
  function getSmartSuggestions(): {
    critical: OrderSuggestion[]
    recurring: OrderSuggestion[]
    seasonal: OrderSuggestion[]
    costEffective: OrderSuggestion[]
  } {
    const critical = criticalSuggestions.value

    // Items that are frequently reordered (simplified logic)
    const recurring = filteredSuggestions.value.filter(
      s => s.urgency === 'medium' && s.currentStock < s.minStock * 0.5
    )

    // Seasonal items (simplified - could be enhanced with historical data)
    const seasonal = filteredSuggestions.value.filter(s => {
      const product = productsStore.products.find(p => p.id === s.itemId)
      return product?.category === 'fruits' || product?.category === 'vegetables'
    })

    // Cost-effective items (good value for money)
    const costEffective = filteredSuggestions.value.filter(
      s => s.estimatedPrice <= 50000 && s.suggestedQuantity >= 2
    )

    return { critical, recurring, seasonal, costEffective }
  }

  // =============================================
  // DEPARTMENT MANAGEMENT
  // =============================================

  /**
   * ✅ ENHANCED: Switch department with data refresh
   */
  async function switchDepartment(department: Department): Promise<void> {
    try {
      if (state.value.selectedDepartment === department) {
        return // Already on this department
      }

      DebugUtils.info(MODULE_NAME, '🏢 Switching department', {
        from: state.value.selectedDepartment,
        to: department
      })

      state.value.selectedDepartment = department

      // Clear selected items when switching departments
      if (state.value.selectedItems.length > 0) {
        DebugUtils.info(MODULE_NAME, '🧹 Clearing items due to department switch')
        clearSelectedItems()
      }

      // Refresh data for new department
      await generateSuggestions(department)
    } catch (error) {
      const errorMessage = `Failed to switch department: ${error}`
      DebugUtils.error(MODULE_NAME, '❌ Department switch failed', { error })
      addError(errorMessage)
    }
  }

  /**
   * ✅ NEW: Compare departments
   */
  function compareDepartments(): {
    kitchen: DepartmentAnalytics
    bar: DepartmentAnalytics
    comparison: {
      totalValueDiff: number
      criticalItemsDiff: number
      efficiencyScore: { kitchen: number; bar: number }
    }
  } {
    const currentDept = state.value.selectedDepartment

    // Calculate analytics for both departments
    state.value.selectedDepartment = 'kitchen'
    const kitchenAnalytics = departmentAnalytics.value

    state.value.selectedDepartment = 'bar'
    const barAnalytics = departmentAnalytics.value

    // Restore original department
    state.value.selectedDepartment = currentDept

    const comparison = {
      totalValueDiff: kitchenAnalytics.totalValue - barAnalytics.totalValue,
      criticalItemsDiff: kitchenAnalytics.criticalItems - barAnalytics.criticalItems,
      efficiencyScore: {
        kitchen: calculateDepartmentEfficiency(kitchenAnalytics),
        bar: calculateDepartmentEfficiency(barAnalytics)
      }
    }

    return { kitchen: kitchenAnalytics, bar: barAnalytics, comparison }
  }

  // =============================================
  // FILTER MANAGEMENT
  // =============================================

  function setUrgencyFilter(urgency: Urgency | 'all'): void {
    filters.value.urgency = urgency
    DebugUtils.debug(MODULE_NAME, '🔍 Urgency filter set', { urgency })
  }

  function setCategoryFilter(category: string): void {
    filters.value.category = category
    DebugUtils.debug(MODULE_NAME, '🔍 Category filter set', { category })
  }

  function setPriceRangeFilter(min: number, max: number): void {
    filters.value.priceRange = { min, max }
    DebugUtils.debug(MODULE_NAME, '🔍 Price range filter set', { min, max })
  }

  function setSearchFilter(searchTerm: string): void {
    filters.value.searchTerm = searchTerm
    DebugUtils.debug(MODULE_NAME, '🔍 Search filter set', { searchTerm })
  }

  function clearFilters(): void {
    filters.value = {
      urgency: 'all',
      category: 'all',
      minStock: true,
      outOfStock: true,
      priceRange: null,
      searchTerm: ''
    }
    DebugUtils.debug(MODULE_NAME, '🧹 All filters cleared')
  }

  function getAvailableCategories(): string[] {
    const categories = new Set<string>()

    for (const suggestion of allSuggestions.value) {
      const product = productsStore.products.find(p => p.id === suggestion.itemId)
      if (product?.category) {
        categories.add(product.category)
      }
    }

    return Array.from(categories).sort()
  }

  // =============================================
  // AUTO-REFRESH MANAGEMENT
  // =============================================

  let refreshTimer: NodeJS.Timeout | null = null

  function startAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }

    autoRefresh.value = true
    refreshTimer = setInterval(async () => {
      if (!isLoading.value && autoRefresh.value) {
        try {
          await generateSuggestions()
          DebugUtils.debug(MODULE_NAME, '🔄 Auto-refresh completed')
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, '⚠️  Auto-refresh failed', { error })
        }
      }
    }, refreshInterval.value)

    DebugUtils.info(MODULE_NAME, '🔄 Auto-refresh started', {
      interval: `${refreshInterval.value / 1000}s`
    })
  }

  function stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    autoRefresh.value = false
    DebugUtils.info(MODULE_NAME, '⏹️  Auto-refresh stopped')
  }

  function setRefreshInterval(intervalMs: number): void {
    refreshInterval.value = Math.max(5000, intervalMs) // Minimum 5 seconds

    if (autoRefresh.value) {
      stopAutoRefresh()
      startAutoRefresh()
    }

    DebugUtils.info(MODULE_NAME, '⏱️  Refresh interval updated', {
      interval: `${refreshInterval.value / 1000}s`
    })
  }

  // =============================================
  // ERROR MANAGEMENT
  // =============================================

  function addError(message: string): void {
    state.value.errors.push(`${new Date().toLocaleTimeString()}: ${message}`)

    // Keep only last 10 errors
    if (state.value.errors.length > 10) {
      state.value.errors = state.value.errors.slice(-10)
    }
  }

  function clearErrors(): void {
    state.value.errors = []
  }

  function getRecentErrors(count = 5): string[] {
    return state.value.errors.slice(-count)
  }

  // =============================================
  // HELPER FUNCTIONS
  // =============================================

  function isBarItem(itemId: string): boolean {
    return (
      itemId.includes('beer') ||
      itemId.includes('cola') ||
      itemId.includes('water') ||
      itemId.includes('wine') ||
      itemId.includes('spirit') ||
      itemId.includes('juice')
    )
  }

  function getPreferredSupplier(itemId: string): string {
    // Simplified supplier assignment logic
    const product = productsStore.products.find(p => p.id === itemId)

    if (product?.category === 'vegetables' || product?.category === 'fruits') {
      return 'Vegetables Supplier'
    } else if (product?.category === 'meat' || product?.category === 'seafood') {
      return 'Meat Supplier'
    } else if (isBarItem(itemId)) {
      return 'Beverage Supplier'
    }

    return 'General Supplier'
  }

  function shouldRefreshStorageData(): boolean {
    const lastSync = storageStore.state.lastCalculated
    if (!lastSync) return true

    const timeSinceSync = Date.now() - new Date(lastSync).getTime()
    return timeSinceSync > 5 * 60 * 1000 // 5 minutes
  }

  function updatePerformanceMetric(
    metric: keyof OrderAssistantState['performanceMetrics'],
    value: number
  ): void {
    const current = state.value.performanceMetrics[metric]

    if (metric.startsWith('avg')) {
      // Calculate moving average
      state.value.performanceMetrics[metric] = current === 0 ? value : (current + value) / 2
    } else {
      // Direct assignment for 'last' metrics
      state.value.performanceMetrics[metric] = value
    }
  }

  function calculateInventoryTurnover(balances: any[]): number {
    // Simplified calculation - would need historical data for accuracy
    const activeItems = balances.filter(b => b.totalQuantity > 0)
    const avgStock = activeItems.reduce((sum, b) => sum + b.totalQuantity, 0) / activeItems.length

    // Assume monthly turnover for demonstration
    return avgStock > 0 ? 30 / avgStock : 0
  }

  function calculateDaysUntilExpiry(itemId: string): number | null {
    try {
      const balance = storageStore.getBalance(itemId)
      const product = productsStore.products.find(p => p.id === itemId)

      if (!balance?.oldestBatchDate || !product?.shelfLife) {
        return null
      }

      const batchDate = new Date(balance.oldestBatchDate)
      const expiryDate = new Date(batchDate)
      expiryDate.setDate(expiryDate.getDate() + product.shelfLife)

      const now = new Date()
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      return daysUntilExpiry
    } catch {
      return null
    }
  }

  function calculateStockLevel(balance: any, product: any): 'critical' | 'low' | 'normal' | 'high' {
    if (!balance || !product) return 'normal'

    const current = balance.totalQuantity || 0
    const min = product.minStock || 0
    const max = product.maxStock || min * 3

    if (current === 0) return 'critical'
    if (current < min * 0.5) return 'critical'
    if (current < min) return 'low'
    if (current > max) return 'high'
    return 'normal'
  }

  function calculateReorderPoint(balance: any, product: any): number {
    if (!balance || !product) return 0

    const minStock = product.minStock || 0
    const avgConsumption = 1 // Simplified - would need historical data
    const leadTime = product.leadTimeDays || 7

    return minStock + avgConsumption * leadTime
  }

  function calculateTurnoverRate(itemId: string): number {
    // Simplified calculation - would need sales/usage data
    const balance = storageStore.getBalance(itemId)
    if (!balance || balance.totalQuantity === 0) return 0

    // Assume average monthly consumption
    return balance.totalQuantity / 30
  }

  function calculateDepartmentEfficiency(analytics: DepartmentAnalytics): number {
    if (analytics.totalProducts === 0) return 0

    const stockScore =
      ((analytics.totalProducts - analytics.outOfStock - analytics.expired) /
        analytics.totalProducts) *
      100
    const expiryScore =
      analytics.avgDaysToExpiry > 0 ? Math.min(analytics.avgDaysToExpiry / 7, 1) * 100 : 50
    const turnoverScore = Math.min(analytics.inventoryTurnover * 10, 100)

    return (stockScore + expiryScore + turnoverScore) / 3
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatPercentage(value: number): string {
    return `${Math.round(value * 10) / 10}%`
  }

  // =============================================
  // WATCHERS - Enhanced reactivity
  // =============================================

  // Watch department changes
  watch(
    () => state.value.selectedDepartment,
    async newDept => {
      if (autoRefresh.value) {
        await generateSuggestions(newDept)
      }
    }
  )

  // Watch integration health
  watch(integrationHealth, health => {
    if (health === 'critical') {
      addError('Integration health is critical - check Storage and Products stores')
    }
  })

  // Cleanup on unmount
  function cleanup(): void {
    stopAutoRefresh()
    clearErrors()
    DebugUtils.debug(MODULE_NAME, '🧹 Order Assistant cleanup completed')
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // ===== STATE - добавить computed для реактивности =====
    selectedDepartment: computed(() => state.value.selectedDepartment),
    selectedItems: computed(() => state.value.selectedItems),
    isGenerating: computed(() => state.value.isGenerating),
    isLoading: computed(() => state.value.isGenerating || state.value.isLoadingPrices),

    // ===== COMPUTED PROPERTIES - без изменений =====
    allSuggestions,
    filteredSuggestions,
    urgentSuggestions,
    mediumSuggestions,
    lowSuggestions,
    criticalSuggestions,
    requestSummary,
    departmentAnalytics,
    integrationHealth,
    hasErrors,

    // ===== ACTIONS - добавить алиасы для совместимости =====
    generateSuggestions,
    refreshData,
    getEstimatedPrice,
    updatePrices,

    // Item management - добавить алиасы
    addItem,
    addSuggestionToRequest: addItem, // алиас
    addManualItem: (
      itemId: string,
      itemName: string,
      quantity: number,
      unit: string,
      notes?: string
    ) => {
      // Создать объект suggestion для совместимости
      const mockSuggestion = {
        itemId,
        itemName,
        suggestedQuantity: quantity,
        urgency: 'medium' as Urgency,
        reason: 'manual_add' as any
      }
      addItem(mockSuggestion)
    },
    removeItem,
    removeItemFromRequest: removeItem, // алиас
    updateItemQuantity,
    updateItemPriority,
    clearSelectedItems,

    // Request creation - добавить алиас
    createRequest,
    createRequestFromItems: createRequest, // алиас

    // Department management - добавить алиас
    switchDepartment,
    changeDepartment: switchDepartment, // алиас
    compareDepartments,

    // Information
    getItemInfo,
    getSuggestionsByUrgency,
    getSuggestionsByCategory,
    getSuggestionsByPriceRange,
    getSuggestionsOutOfStock,
    getSuggestionsBelowMinStock,
    getSmartSuggestions,

    // Filter management
    setUrgencyFilter,
    setCategoryFilter,
    setPriceRangeFilter,
    setSearchFilter,
    clearFilters,
    getAvailableCategories,

    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
    setRefreshInterval,

    // Error management
    addError,
    clearErrors,
    getRecentErrors,

    // Utilities - добавить недостающие функции
    formatCurrency,
    formatPercentage,
    isSuggestionAdded: (suggestion: OrderSuggestion) => {
      return state.value.selectedItems.some(item => item.itemId === suggestion.itemId)
    },
    getUrgencyColor: (urgency: string) => {
      const colorMap: Record<string, string> = {
        low: 'success',
        medium: 'warning',
        high: 'error'
      }
      return colorMap[urgency] || 'primary'
    },
    getUrgencyIcon: (urgency: string) => {
      const iconMap: Record<string, string> = {
        low: 'mdi-check-circle',
        medium: 'mdi-alert',
        high: 'mdi-alert-circle'
      }
      return iconMap[urgency] || 'mdi-information'
    },
    cleanup
  }
}
