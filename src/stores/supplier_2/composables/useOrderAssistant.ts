// src/stores/supplier_2/composables/useOrderAssistant.ts
import { ref, computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import { mockOrderSuggestions } from '../mock/supplierMock'
import type { OrderSuggestion, CreateRequestData, RequestItem, Department } from '../types'

export function useOrderAssistant() {
  const supplierStore = useSupplierStore()

  // =============================================
  // STATE
  // =============================================
  const selectedDepartment = ref<Department>('kitchen')
  const selectedItems = ref<RequestItem[]>([])
  const isGenerating = ref(false)

  // =============================================
  // COMPUTED
  // =============================================
  // ИСПРАВЛЕНИЕ: Безопасный доступ к suggestions с fallback на mock данные
  const suggestions = computed(() => {
    const storeSuggestions = supplierStore.state.orderSuggestions
    if (Array.isArray(storeSuggestions) && storeSuggestions.length > 0) {
      return storeSuggestions
    }
    // Fallback на mock данные если store пустой
    return mockOrderSuggestions
  })

  const filteredSuggestions = computed(() => {
    return suggestions.value.filter(suggestion => {
      if (selectedDepartment.value === 'kitchen') {
        // Kitchen: exclude beverages
        return (
          !suggestion.itemId.includes('beer') &&
          !suggestion.itemId.includes('cola') &&
          !suggestion.itemId.includes('water')
        )
      } else {
        // Bar: only beverages
        return (
          suggestion.itemId.includes('beer') ||
          suggestion.itemId.includes('cola') ||
          suggestion.itemId.includes('water')
        )
      }
    })
  })

  const urgentSuggestions = computed(() =>
    filteredSuggestions.value.filter(s => s.urgency === 'high')
  )

  const requestSummary = computed(() => ({
    totalItems: selectedItems.value.length,
    estimatedTotal: selectedItems.value.reduce((sum, item) => {
      const suggestion = suggestions.value.find(s => s.itemId === item.itemId)
      return sum + item.requestedQuantity * (suggestion?.estimatedPrice || 0)
    }, 0)
  }))

  const isLoading = computed(() => supplierStore.state.loading.suggestions)

  // =============================================
  // ACTIONS
  // =============================================
  /**
   * Generate suggestions for selected department
   */
  async function generateSuggestions(department?: Department) {
    try {
      isGenerating.value = true
      if (department) {
        selectedDepartment.value = department
      }

      console.log(`OrderAssistant: Generating suggestions for ${selectedDepartment.value}`)

      try {
        // ИСПРАВЛЕНИЕ: Пытаемся получить из store
        await supplierStore.fetchOrderSuggestions(selectedDepartment.value)
      } catch (error) {
        console.warn('Failed to fetch from store, using mock data:', error)
        // В случае ошибки используем mock данные
        const mockFiltered = mockOrderSuggestions.filter(suggestion => {
          if (selectedDepartment.value === 'kitchen') {
            return (
              !suggestion.itemId.includes('beer') &&
              !suggestion.itemId.includes('cola') &&
              !suggestion.itemId.includes('water')
            )
          } else {
            return (
              suggestion.itemId.includes('beer') ||
              suggestion.itemId.includes('cola') ||
              suggestion.itemId.includes('water')
            )
          }
        })
        // Устанавливаем данные напрямую в store
        supplierStore.state.orderSuggestions = mockFiltered
      }

      console.log(`OrderAssistant: Generated ${filteredSuggestions.value.length} suggestions`)
    } catch (error) {
      console.error('OrderAssistant: Error generating suggestions:', error)
      throw error
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Add suggestion to request items
   */
  function addSuggestionToRequest(suggestion: OrderSuggestion, quantity?: number) {
    const finalQuantity = quantity || suggestion.suggestedQuantity
    const existingItem = selectedItems.value.find(item => item.itemId === suggestion.itemId)

    if (existingItem) {
      // Update existing item quantity
      existingItem.requestedQuantity = finalQuantity
      existingItem.notes = `Auto-suggested: ${suggestion.reason}`
    } else {
      // Add new item
      const newItem: RequestItem = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        itemId: suggestion.itemId,
        itemName: suggestion.itemName,
        requestedQuantity: finalQuantity,
        unit: getItemUnit(suggestion.itemId),
        notes: `Auto-suggested: ${suggestion.reason}`
      }
      selectedItems.value.push(newItem)
    }

    console.log(`OrderAssistant: Added ${suggestion.itemName} (${finalQuantity}) to request`)
  }

  /**
   * Add manual item to request
   */
  function addManualItem(
    itemId: string,
    itemName: string,
    quantity: number,
    unit: string,
    notes?: string
  ) {
    const existingItem = selectedItems.value.find(item => item.itemId === itemId)

    if (existingItem) {
      existingItem.requestedQuantity = quantity
      existingItem.notes = notes
    } else {
      const newItem: RequestItem = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        itemId,
        itemName,
        requestedQuantity: quantity,
        unit,
        notes
      }
      selectedItems.value.push(newItem)
    }

    console.log(`OrderAssistant: Added manual item ${itemName} (${quantity}${unit})`)
  }

  /**
   * Remove item from request
   */
  function removeItemFromRequest(itemId: string) {
    const index = selectedItems.value.findIndex(item => item.itemId === itemId)
    if (index !== -1) {
      const item = selectedItems.value[index]
      selectedItems.value.splice(index, 1)
      console.log(`OrderAssistant: Removed ${item.itemName} from request`)
    }
  }

  /**
   * Update item quantity
   */
  function updateItemQuantity(itemId: string, quantity: number) {
    const item = selectedItems.value.find(item => item.itemId === itemId)
    if (item) {
      item.requestedQuantity = quantity
      console.log(`OrderAssistant: Updated ${item.itemName} quantity to ${quantity}`)
    }
  }

  /**
   * Clear all selected items
   */
  function clearSelectedItems() {
    selectedItems.value = []
    console.log('OrderAssistant: Cleared all selected items')
  }

  /**
   * Create procurement request from selected items
   */
  async function createRequestFromItems(
    requestedBy: string,
    priority: 'normal' | 'urgent' = 'normal',
    notes?: string
  ) {
    if (selectedItems.value.length === 0) {
      throw new Error('No items selected for request')
    }

    try {
      const requestData: CreateRequestData = {
        department: selectedDepartment.value,
        requestedBy,
        items: selectedItems.value.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          requestedQuantity: item.requestedQuantity,
          unit: item.unit,
          notes: item.notes
        })),
        priority,
        notes
      }

      console.log('OrderAssistant: Creating request from items:', requestData)

      // ИСПРАВЛЕНИЕ: Вызываем метод напрямую
      const newRequest = await supplierStore.createRequest(requestData)

      // Clear selected items after successful creation
      clearSelectedItems()

      console.log(`OrderAssistant: Created request ${newRequest.requestNumber}`)
      return newRequest
    } catch (error: any) {
      console.error('OrderAssistant: Error creating request:', error)
      throw error
    }
  }

  /**
   * Check if suggestion is already added to request
   */
  function isSuggestionAdded(suggestion: OrderSuggestion): boolean {
    return selectedItems.value.some(item => item.itemId === suggestion.itemId)
  }

  /**
   * Get estimated price for item
   */
  function getEstimatedPrice(itemId: string): number {
    const suggestion = suggestions.value.find(s => s.itemId === itemId)
    return suggestion?.estimatedPrice || 0
  }

  /**
   * Change department and refresh suggestions
   */
  async function changeDepartment(department: Department) {
    if (selectedDepartment.value !== department) {
      selectedDepartment.value = department
      clearSelectedItems() // Clear items when changing department
      await generateSuggestions()
    }
  }

  // =============================================
  // HELPER FUNCTIONS
  // =============================================
  /**
   * Get item unit (in real app, this would come from ProductsStore)
   */
  function getItemUnit(itemId: string): string {
    if (itemId.includes('beer') || itemId.includes('cola')) return 'piece'
    return 'kg'
  }

  /**
   * Format currency for display
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Get urgency color for UI
   */
  function getUrgencyColor(urgency: OrderSuggestion['urgency']): string {
    switch (urgency) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'default'
    }
  }

  /**
   * Get urgency icon for UI
   */
  function getUrgencyIcon(urgency: OrderSuggestion['urgency']): string {
    switch (urgency) {
      case 'high':
        return 'mdi-alert-circle'
      case 'medium':
        return 'mdi-alert'
      case 'low':
        return 'mdi-information'
      default:
        return 'mdi-help-circle'
    }
  }

  // =============================================
  // INITIALIZATION - Автозагрузка при первом использовании
  // =============================================
  // ИСПРАВЛЕНИЕ: Инициализируем данные при первом обращении к computed
  if (suggestions.value.length === 0) {
    generateSuggestions().catch(error => {
      console.warn('Failed to auto-generate suggestions:', error)
    })
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================
  return {
    // State
    selectedDepartment,
    selectedItems,
    isGenerating,

    // Computed
    suggestions,
    filteredSuggestions,
    urgentSuggestions,
    requestSummary,
    isLoading,

    // Actions
    generateSuggestions,
    addSuggestionToRequest,
    addManualItem,
    removeItemFromRequest,
    updateItemQuantity,
    clearSelectedItems,
    createRequestFromItems,
    changeDepartment,

    // Helpers
    isSuggestionAdded,
    getEstimatedPrice,
    formatCurrency,
    getUrgencyColor,
    getUrgencyIcon
  }
}
