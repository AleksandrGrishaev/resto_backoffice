// useKitchenRequest.ts - ISOLATED STATE VERSION
// This composable has its own isolated state - does NOT wrap useOrderAssistant
// to avoid shared state conflicts with Supplier2 Order Assistant

import { computed, reactive, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSupplierStore } from '@/stores/supplier_2/supplierStore'
import { useProductsStore } from '@/stores/productsStore'
import { useStorageStore } from '@/stores/storage'
import type {
  Department,
  OrderSuggestion,
  RequestItem,
  CreateRequestData,
  Priority
} from '@/stores/supplier_2/types'
import { DebugUtils } from '@/utils/debugger'

const MODULE_NAME = 'KitchenRequest'

// LOCAL STATE (not shared with supplier_2)
interface KitchenRequestState {
  selectedItems: RequestItem[]
  isGenerating: boolean
  isCreatingRequest: boolean
}

export function useKitchenRequest(selectedDepartment?: Ref<'all' | 'kitchen' | 'bar'>) {
  const authStore = useAuthStore()
  const supplierStore = useSupplierStore()
  const productsStore = useProductsStore()
  const storageStore = useStorageStore()

  // ISOLATED state - not shared with supplier_2
  const state = reactive<KitchenRequestState>({
    selectedItems: [],
    isGenerating: false,
    isCreatingRequest: false
  })

  // Auto-detect department from role
  const effectiveDepartment = computed((): Department => {
    const roles = authStore.userRoles
    if (roles.includes('admin') && selectedDepartment?.value) {
      if (selectedDepartment.value === 'all') return 'kitchen'
      return selectedDepartment.value as Department
    }
    if (roles.includes('bar') && !roles.includes('kitchen')) return 'bar'
    return 'kitchen'
  })

  // Pending request count for badge
  const pendingRequestCount = computed(() => {
    return supplierStore.state.requests.filter(
      r => r.status === 'draft' || r.status === 'submitted'
    ).length
  })

  const requestedByName = computed(() => authStore.currentUser?.email || 'Kitchen Staff')

  // Filter suggestions by department
  const departmentFilteredSuggestions = computed(() => {
    const dept = effectiveDepartment.value
    const suggestions = supplierStore.state.orderSuggestions || []
    return suggestions.filter(suggestion => {
      const product = productsStore.getProductById(suggestion.itemId)
      return product?.usedInDepartments?.includes(dept)
    })
  })

  // Urgency-based suggestion groups
  const urgentSuggestions = computed(() =>
    departmentFilteredSuggestions.value.filter(s => s.urgency === 'high')
  )

  const mediumSuggestions = computed(() =>
    departmentFilteredSuggestions.value.filter(s => s.urgency === 'medium')
  )

  const lowSuggestions = computed(() =>
    departmentFilteredSuggestions.value.filter(s => s.urgency === 'low')
  )

  // Request summary
  const requestSummary = computed(() => {
    const items = state.selectedItems || []
    const total = items.length
    const estimatedTotal = items.reduce(
      (sum, item) => sum + item.requestedQuantity * item.estimatedPrice,
      0
    )

    return {
      totalItems: total,
      estimatedTotal,
      urgentItems: items.filter(item => item.priority === 'urgent').length,
      normalItems: items.filter(item => item.priority === 'normal').length
    }
  })

  // Generate suggestions for current department
  async function generateSuggestions(): Promise<void> {
    state.isGenerating = true
    try {
      DebugUtils.info(MODULE_NAME, 'Generating suggestions', {
        department: effectiveDepartment.value
      })

      // === LAZY LOAD: Ensure required stores are initialized ===
      // Kitchen context doesn't include storage/supplier stores by default.
      // We lazy load them here when user opens Create Request dialog.

      // 1. Ensure products are loaded (needed for storage calculations)
      if (productsStore.products.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Lazy loading products store...')
        await productsStore.loadProducts()
      }

      // 2. Ensure storage store is initialized (for balance calculations)
      if (!storageStore.initialized) {
        DebugUtils.info(MODULE_NAME, 'Lazy initializing storage store...')
        await storageStore.initialize()
      }

      // 3. Ensure supplier store is initialized (for suggestions)
      // Note: supplierStore.initialize() also calls ensureDependentStoresReady()
      // which loads products/storage, but we do it explicitly above for clarity
      if (!supplierStore.integrationState.isInitialized) {
        DebugUtils.info(MODULE_NAME, 'Lazy initializing supplier store...')
        await supplierStore.initialize()
      }

      // === END LAZY LOAD ===

      await storageStore.fetchBalances(effectiveDepartment.value)
      await supplierStore.refreshSuggestions(effectiveDepartment.value)

      DebugUtils.info(MODULE_NAME, 'Suggestions generated', {
        total: departmentFilteredSuggestions.value.length,
        urgent: urgentSuggestions.value.length,
        medium: mediumSuggestions.value.length,
        low: lowSuggestions.value.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate suggestions', { error })
      throw error
    } finally {
      state.isGenerating = false
    }
  }

  // Add item to local selection
  function addSelectedItem(suggestion: OrderSuggestion, customQuantity?: number): void {
    const existing = state.selectedItems.find(i => i.itemId === suggestion.itemId)
    if (existing) {
      existing.requestedQuantity += customQuantity || suggestion.suggestedQuantity
      DebugUtils.debug(MODULE_NAME, 'Updated existing item quantity', {
        itemId: suggestion.itemId,
        newQuantity: existing.requestedQuantity
      })
    } else {
      const product = productsStore.getProductById(suggestion.itemId)
      const newItem: RequestItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        itemId: suggestion.itemId,
        itemName: suggestion.itemName,
        category: product?.category || 'other',
        requestedQuantity: customQuantity || suggestion.suggestedQuantity,
        unit: product?.baseUnit || 'gram',
        estimatedPrice: suggestion.estimatedPrice || product?.lastKnownCost || 0,
        priority: suggestion.urgency === 'high' ? 'urgent' : 'normal'
      }
      state.selectedItems.push(newItem)
      DebugUtils.debug(MODULE_NAME, 'Added new item', {
        itemId: suggestion.itemId,
        quantity: newItem.requestedQuantity
      })
    }
  }

  function removeSelectedItem(itemId: string): void {
    const idx = state.selectedItems.findIndex(i => i.itemId === itemId)
    if (idx !== -1) {
      state.selectedItems.splice(idx, 1)
      DebugUtils.debug(MODULE_NAME, 'Removed item', { itemId })
    }
  }

  function updateItemQuantity(itemId: string, quantity: number): void {
    const item = state.selectedItems.find(i => i.itemId === itemId)
    if (item) {
      item.requestedQuantity = Math.max(0, quantity)
      DebugUtils.debug(MODULE_NAME, 'Updated item quantity', { itemId, quantity })
    }
  }

  function clearSelectedItems(): void {
    const previousCount = state.selectedItems.length
    state.selectedItems = []
    DebugUtils.debug(MODULE_NAME, 'Cleared selected items', { previousCount })
  }

  // Check if suggestion is already added
  function isSuggestionAdded(itemId: string): boolean {
    return state.selectedItems.some(item => item.itemId === itemId)
  }

  // Get selected quantity for display
  function getSelectedQuantityForDisplay(itemId: string): number {
    const item = state.selectedItems.find(item => item.itemId === itemId)
    return item ? item.requestedQuantity : 0
  }

  // Create request using supplierStore
  // For Kitchen Monitor, we send directly with 'submitted' status
  async function createRequest(
    requestedBy: string,
    priority: Priority,
    notes?: string,
    /** If true, creates request with 'submitted' status (for direct send from Kitchen Monitor) */
    sendDirectly: boolean = false
  ): Promise<string> {
    state.isCreatingRequest = true
    try {
      DebugUtils.info(MODULE_NAME, 'Creating request', {
        department: effectiveDepartment.value,
        itemCount: state.selectedItems.length,
        requestedBy,
        sendDirectly
      })

      const createData: CreateRequestData = {
        department: effectiveDepartment.value,
        requestedBy,
        items: state.selectedItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          category: item.category,
          requestedQuantity: item.requestedQuantity,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          priority: item.priority,
          notes: item.notes
        })),
        priority,
        notes: notes || `Request from Kitchen Monitor (${effectiveDepartment.value})`,
        initialStatus: sendDirectly ? 'submitted' : 'draft'
      }

      const newRequest = await supplierStore.createRequest(createData)

      DebugUtils.info(MODULE_NAME, 'Request created successfully', {
        requestId: newRequest.id,
        requestNumber: newRequest.requestNumber,
        status: newRequest.status
      })

      clearSelectedItems()
      await supplierStore.refreshSuggestions(effectiveDepartment.value)

      return newRequest.id
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create request', { error })
      throw error
    } finally {
      state.isCreatingRequest = false
    }
  }

  // Get product price
  function getProductPrice(itemId: string): number {
    const product = productsStore.getProductById(itemId)
    if (!product) return 0
    return product.lastKnownCost || product.baseCostPerUnit || 0
  }

  // Get product base unit
  function getProductBaseUnit(itemId: string): string {
    const product = productsStore.getProductById(itemId)
    return product?.baseUnit || 'gram'
  }

  // UI utility functions
  function getUrgencyColor(urgency: string): string {
    const colorMap: Record<string, string> = {
      low: 'success',
      medium: 'warning',
      high: 'error'
    }
    return colorMap[urgency] || 'primary'
  }

  function getUrgencyIcon(urgency: string): string {
    const iconMap: Record<string, string> = {
      low: 'mdi-check-circle',
      medium: 'mdi-alert',
      high: 'mdi-alert-circle'
    }
    return iconMap[urgency] || 'mdi-information'
  }

  return {
    // State
    state,
    selectedItems: computed(() => state.selectedItems),
    isGenerating: computed(() => state.isGenerating),
    isCreatingRequest: computed(() => state.isCreatingRequest),

    // Department
    effectiveDepartment,
    pendingRequestCount,
    requestedByName,

    // Suggestions
    departmentFilteredSuggestions,
    urgentSuggestions,
    mediumSuggestions,
    lowSuggestions,
    generateSuggestions,

    // Request summary
    requestSummary,

    // Item management
    addSelectedItem,
    removeSelectedItem,
    updateItemQuantity,
    clearSelectedItems,
    isSuggestionAdded,
    getSelectedQuantityForDisplay,

    // Request creation
    createRequest,

    // Price helpers
    getProductPrice,
    getProductBaseUnit,

    // UI utilities
    getUrgencyColor,
    getUrgencyIcon,

    // Re-export stores for component access
    supplierStore,
    productsStore,
    storageStore
  }
}
