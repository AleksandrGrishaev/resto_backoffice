// src/stores/supplier_2/composables/useOrderAssistant.ts
// ✅ УПРОЩЕННАЯ ВЕРСИЯ с прямым использованием ProductStore для цен
// ✅ ИСПРАВЛЕНО: Pinia stores инициализируются внутри функции

import { computed, reactive, ref, watch, readonly } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useSupplierStore } from '../supplierStore'
import { useStorageStore } from '@/stores/storage'
import { supplierService } from '../supplierService'
import { DebugUtils } from '@/utils/debugger'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils/time'

import type {
  OrderSuggestion,
  RequestItem,
  CreateRequestData,
  Department,
  Priority
} from '../types'

// ✅ Импорт функций форматирования из utils (используются в BaseOrderAssistant)
import {
  formatQuantityWithUnit,
  getBestInputUnit,
  convertUserInputToBaseUnits,
  convertBaseUnitsToUserDisplay
} from '@/utils/quantityFormatter'

const MODULE_NAME = 'OrderAssistant'

// =============================================
// STATE (глобальное состояние)
// =============================================

interface OrderAssistantState {
  selectedDepartment: Department
  selectedItems: RequestItem[]
  isGenerating: boolean
  isCreatingRequest: boolean
  lastRefresh: string | null
  errors: string[]
}

const state = reactive<OrderAssistantState>({
  selectedDepartment: 'kitchen',
  selectedItems: [],
  isGenerating: false,
  isCreatingRequest: false,
  lastRefresh: null,
  errors: []
})

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useOrderAssistant() {
  // ✅ Инициализация stores внутри функции для избежания Pinia ошибки
  const productsStore = useProductsStore()
  const supplierStore = useSupplierStore()
  const storageStore = useStorageStore()

  // =============================================
  // УПРОЩЕННЫЕ ФУНКЦИИ ПОЛУЧЕНИЯ ЦЕН
  // =============================================

  /**
   * ✅ ГЛАВНАЯ функция: Получить цену продукта из ProductStore
   * Простая логика с четким приоритетом
   */
  function getProductPrice(itemId: string): number {
    const product = productsStore.products.find(p => p.id === itemId)

    if (!product) {
      DebugUtils.error(MODULE_NAME, `Product not found in ProductStore: ${itemId}`, {
        availableProducts: productsStore.products.map(p => p.id),
        totalProducts: productsStore.products.length
      })
      throw new Error(`Product not found: ${itemId}`)
    }

    // ✅ Приоритет 1: lastKnownCost (актуальная цена из последней операции)
    if (product.lastKnownCost && product.lastKnownCost > 0) {
      DebugUtils.debug(MODULE_NAME, `Using lastKnownCost for ${itemId}`, {
        productName: product.name,
        price: product.lastKnownCost,
        baseUnit: product.baseUnit
      })
      return product.lastKnownCost
    }

    // ✅ Приоритет 2: baseCostPerUnit (fallback на базовую цену)
    if (product.baseCostPerUnit && product.baseCostPerUnit > 0) {
      DebugUtils.debug(MODULE_NAME, `Using baseCostPerUnit for ${itemId}`, {
        productName: product.name,
        price: product.baseCostPerUnit,
        baseUnit: product.baseUnit
      })
      return product.baseCostPerUnit
    }

    // Если нет цен - это ошибка в данных
    DebugUtils.error(MODULE_NAME, `No price found for product ${itemId}`, {
      product: {
        id: product.id,
        name: product.name,
        lastKnownCost: product.lastKnownCost,
        baseCostPerUnit: product.baseCostPerUnit,
        baseUnit: product.baseUnit
      }
    })

    throw new Error(`No price for product: ${product.name} (${itemId})`)
  }

  /**
   * ✅ УПРОЩЕННАЯ функция: Получить базовую единицу измерения
   */
  function getProductBaseUnit(itemId: string): string {
    const product = productsStore.products.find(p => p.id === itemId)

    if (!product) {
      return 'gram'
    }

    // Приоритет 1: baseUnit (новая структура)
    if (product.baseUnit) {
      return product.baseUnit
    }

    // Приоритет 2: unit (старая структура)
    if (product.unit) {
      return product.unit
    }

    // Fallback: gram
    return 'gram'
  }

  // =============================================
  // COMPUTED PROPERTIES (для BaseOrderAssistant)
  // =============================================

  const suggestions = computed(() => {
    const storeSuggestions = supplierStore.state?.orderSuggestions
    return Array.isArray(storeSuggestions) ? storeSuggestions : []
  })

  const filteredSuggestions = computed(() => {
    // Простая фильтрация по департаменту
    return suggestions.value.filter(suggestion => {
      // Пока что возвращаем все предложения
      return true
    })
  })

  const urgentSuggestions = computed(() =>
    filteredSuggestions.value.filter(s => s.urgency === 'high')
  )

  const mediumSuggestions = computed(() =>
    filteredSuggestions.value.filter(s => s.urgency === 'medium')
  )

  const lowSuggestions = computed(() => filteredSuggestions.value.filter(s => s.urgency === 'low'))

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

  const autoRefresh = ref(false)

  // =============================================
  // WATCHERS
  // =============================================

  // Автообновление цен при изменении ProductStore
  watch(
    () => productsStore.products,
    () => {
      if (autoRefresh.value && state.selectedItems.length > 0) {
        updatePrices()
      }
    },
    { deep: true }
  )

  // =============================================
  // CORE FUNCTIONS
  // =============================================

  /**
   * ✅ УПРОЩЕННАЯ функция: Добавить товар в выбранные
   */
  function addSelectedItem(suggestion: OrderSuggestion, customQuantity?: number): void {
    try {
      const existingItemIndex = state.selectedItems.findIndex(
        item => item.itemId === suggestion.itemId
      )

      const quantityToAdd = customQuantity || suggestion.suggestedQuantity

      if (existingItemIndex !== -1) {
        // Обновляем существующий товар
        const existingItem = state.selectedItems[existingItemIndex]
        existingItem.requestedQuantity += quantityToAdd
      } else {
        // Создаем новый товар с упрощенной логикой цен
        const baseUnit = getProductBaseUnit(suggestion.itemId)
        // Use user-entered price from suggestion if provided, otherwise get from product
        const estimatedPrice = suggestion.estimatedPrice ?? getProductPrice(suggestion.itemId)

        const newItem: RequestItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          itemId: suggestion.itemId,
          itemName: suggestion.itemName,
          category:
            productsStore.products.find(p => p.id === suggestion.itemId)?.category || 'other',
          requestedQuantity: quantityToAdd,
          unit: baseUnit,
          estimatedPrice: estimatedPrice,
          priority: suggestion.urgency === 'high' ? 'urgent' : 'normal',
          // ✅ FIX: Preserve recommended package from suggestion
          packageId: suggestion.recommendedPackageId,
          packageName: suggestion.recommendedPackageName,
          packageQuantity: suggestion.recommendedPackageQuantity
        }

        state.selectedItems.push(newItem)
      }

      DebugUtils.debug(MODULE_NAME, 'Item added to selection', {
        itemId: suggestion.itemId,
        itemName: suggestion.itemName,
        quantity: quantityToAdd,
        estimatedPrice: getProductPrice(suggestion.itemId),
        total: state.selectedItems.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to add selected item', { error })
      addError(`Failed to add item: ${error}`)
    }
  }

  /**
   * ✅ ПОЛНАЯ ИСПРАВЛЕННАЯ функция: Создать заявку с обновлением предложений
   */
  async function createRequest(
    requestedBy: string,
    options?: {
      priority?: Priority
      notes?: string
      department?: Department
      autoSubmit?: boolean // If true, automatically submit after creation
    }
  ): Promise<string> {
    try {
      state.isCreatingRequest = true

      const targetDepartment = options?.department || state.selectedDepartment
      const hasUrgentItems = state.selectedItems.some(item => item.priority === 'urgent')
      const overallPriority = options?.priority || (hasUrgentItems ? 'urgent' : 'normal')

      const createData: CreateRequestData = {
        department: targetDepartment,
        requestedBy,
        items: state.selectedItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          category: item.category,
          requestedQuantity: item.requestedQuantity,
          unit: item.unit,
          // ✅ Приоритет: user-entered → lastKnownCost → baseCostPerUnit
          estimatedPrice: item.estimatedPrice ?? getProductPrice(item.itemId),
          priority: item.priority,
          notes: item.notes,
          // ✅ FIX: Preserve package info from selectedItem
          packageId: item.packageId,
          packageName: item.packageName,
          packageQuantity: item.packageQuantity
        })),
        priority: overallPriority,
        notes: [
          `Created from Order Assistant for ${targetDepartment} department`,
          `Total estimated value: ${formatIDR(requestSummary.value.estimatedTotal)}`,
          options?.notes || ''
        ]
          .filter(Boolean)
          .join(' | ')
      }

      const newRequest = await supplierStore.createRequest(createData)

      // Auto-submit if requested
      if (options?.autoSubmit) {
        try {
          await supplierStore.updateRequest(newRequest.id, { status: 'submitted' })
          DebugUtils.info(MODULE_NAME, 'Request auto-submitted', {
            requestId: newRequest.id,
            requestNumber: newRequest.requestNumber
          })
        } catch (submitError) {
          DebugUtils.warn(MODULE_NAME, 'Failed to auto-submit request', {
            submitError,
            requestId: newRequest.id
          })
        }
      }

      // Очищаем выбранные товары
      clearSelectedItems()

      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Обновляем предложения после создания заявки
      try {
        DebugUtils.info(MODULE_NAME, 'Refreshing suggestions after request creation', {
          requestId: newRequest.id,
          requestNumber: newRequest.requestNumber,
          department: targetDepartment,
          itemsCreated: createData.items.length
        })

        // Используем supplierStore.refreshSuggestions вместо generateSuggestions
        await supplierStore.refreshSuggestions(targetDepartment)

        DebugUtils.info(MODULE_NAME, 'Suggestions refreshed successfully after request creation', {
          newSuggestionsCount: supplierStore.state.orderSuggestions.length
        })
      } catch (refreshError) {
        // Не бросаем ошибку если обновление предложений не удалось
        DebugUtils.warn(MODULE_NAME, 'Failed to refresh suggestions after request creation', {
          refreshError,
          requestId: newRequest.id,
          requestNumber: newRequest.requestNumber
        })
      }

      return newRequest.id
    } catch (error) {
      const errorMessage = `Failed to create request: ${error?.message || error}`
      DebugUtils.error(MODULE_NAME, 'Request creation failed', { error: errorMessage })
      addError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      state.isCreatingRequest = false
    }
  }

  // =============================================
  // ✅ НОВАЯ ФУНКЦИЯ: getCurrentStock - для отладки
  // =============================================

  // ДОБАВИТЬ эту функцию для получения актуальных остатков
  function getCurrentStock(itemId: string, department?: Department): number {
    try {
      // ✅ ИСПРАВЛЕНИЕ: Теперь у нас ОДИН баланс на продукт (без department)
      const balance = storageStore.state.balances.find(b => b.itemId === itemId)

      // Если нужна фильтрация по department - делаем через Product.usedInDepartments
      if (department && balance) {
        const product = productsStore.products.find(p => p.id === itemId)
        if (product && !product.usedInDepartments.includes(department)) {
          // Продукт не используется в этом департаменте
          return 0
        }
      }

      return balance?.totalQuantity || 0
    } catch (error) {
      DebugUtils.debug(MODULE_NAME, 'Could not get current stock', { itemId, department, error })
      return 0
    }
  }

  /**
   * ✅ Генерация предложений заказов
   */
  async function generateSuggestions(department?: Department): Promise<OrderSuggestion[]> {
    const startTime = Date.now()

    try {
      state.isGenerating = true
      clearErrors()

      const targetDepartment = department || state.selectedDepartment

      DebugUtils.info(MODULE_NAME, 'Generating suggestions - new flow', {
        department: targetDepartment,
        flow: 'useOrderAssistant → supplierStore → supplierService → storageIntegration'
      })

      // ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Обновляем Storage балансы перед генерацией
      try {
        await storageStore.fetchBalances(targetDepartment)
        DebugUtils.debug(MODULE_NAME, 'Storage balances refreshed', {
          department: targetDepartment,
          balancesCount: storageStore.state.balances.length
        })
      } catch (error) {
        DebugUtils.warn(MODULE_NAME, 'Storage fetch failed, continuing with cached data...', {
          error
        })
      }

      // ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Обновляем Products если нужно
      if (productsStore.products.length === 0) {
        try {
          await productsStore.loadProducts()
          DebugUtils.debug(MODULE_NAME, 'Products loaded', {
            productsCount: productsStore.products.length
          })
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, 'Products load failed', { error })
        }
      }

      // ✅ ОСНОВНОЙ ВЫЗОВ: Используем supplierStore для получения динамических данных
      await supplierStore.refreshSuggestions(targetDepartment)

      // Получаем результат из store
      const newSuggestions = supplierStore.state.orderSuggestions || []

      state.lastRefresh = TimeUtils.getCurrentLocalISO()
      const generationTime = Date.now() - startTime

      DebugUtils.info(MODULE_NAME, 'Suggestions generated successfully - new flow', {
        department: targetDepartment,
        total: newSuggestions.length,
        urgent: newSuggestions.filter(s => s.urgency === 'high').length,
        medium: newSuggestions.filter(s => s.urgency === 'medium').length,
        low: newSuggestions.filter(s => s.urgency === 'low').length,
        generationTime: `${generationTime}ms`,
        sampleData: newSuggestions.slice(0, 2).map(s => ({
          itemName: s.itemName,
          currentStock: s.currentStock,
          minStock: s.minStock,
          urgency: s.urgency
        }))
      })

      return newSuggestions
    } catch (error) {
      const errorMessage = `Failed to generate suggestions: ${error}`
      DebugUtils.error(MODULE_NAME, 'Suggestion generation failed - new flow', { error })
      addError(errorMessage)
      throw error
    } finally {
      state.isGenerating = false
    }
  }

  /**
   * ✅ УПРОЩЕННАЯ функция: Обновить все данные (для BaseOrderAssistant)
   */
  async function refreshData(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Refreshing all data')

      // Обновляем данные products
      if (productsStore.products.length === 0) {
        await productsStore.loadProducts()
      }

      // Генерируем новые предложения
      await generateSuggestions(state.selectedDepartment)

      // Обновляем цены для выбранных товаров
      if (state.selectedItems.length > 0) {
        await updatePrices()
      }

      DebugUtils.info(MODULE_NAME, 'All data refreshed successfully')
    } catch (error) {
      const errorMessage = `Failed to refresh data: ${error}`
      DebugUtils.error(MODULE_NAME, 'Data refresh failed', { error })
      addError(errorMessage)
      throw error
    }
  }

  /**
   * ✅ УПРОЩЕННАЯ функция: Обновить цены всех товаров
   */
  async function updatePrices(itemIds?: string[]): Promise<void> {
    try {
      const itemsToUpdate = itemIds || state.selectedItems.map(item => item.itemId)

      // Просто обновляем цены из ProductStore
      state.selectedItems.forEach(item => {
        if (itemsToUpdate.includes(item.itemId)) {
          item.estimatedPrice = getProductPrice(item.itemId)
        }
      })

      DebugUtils.debug(MODULE_NAME, 'Prices updated from ProductStore', {
        updatedItems: itemsToUpdate.length,
        totalItems: state.selectedItems.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update prices', { error })
      addError(`Failed to update prices: ${error}`)
    }
  }

  /**
   * ✅ УПРОЩЕННАЯ функция: Получить оценочную цену (для computed)
   */
  function getEstimatedPrice(itemId: string): number {
    return getProductPrice(itemId)
  }

  /**
   * ✅ Вычисляет общую стоимость заявки (используется в RequestDetailsDialog, RequestEditDialog)
   */
  function calculateEstimatedTotal(items: RequestItem[]): number {
    return items.reduce((sum, item) => {
      const price = item.estimatedPrice || getProductPrice(item.itemId)
      return sum + item.requestedQuantity * price
    }, 0)
  }

  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =============================================

  function removeSelectedItem(itemId: string): void {
    const index = state.selectedItems.findIndex(item => item.itemId === itemId)
    if (index !== -1) {
      state.selectedItems.splice(index, 1)
      DebugUtils.debug(MODULE_NAME, 'Item removed from selection', { itemId })
    }
  }

  function updateItemQuantity(itemId: string, quantity: number): void {
    const item = state.selectedItems.find(item => item.itemId === itemId)
    if (item) {
      item.requestedQuantity = Math.max(0, quantity)
      DebugUtils.debug(MODULE_NAME, 'Item quantity updated', { itemId, quantity })
    }
  }

  function clearSelectedItems(): void {
    const previousCount = state.selectedItems.length
    state.selectedItems = []

    DebugUtils.debug(MODULE_NAME, 'Selected items cleared', {
      previousCount,
      currentCount: state.selectedItems.length
    })
  }

  function setDepartment(department: Department): void {
    state.selectedDepartment = department
    DebugUtils.debug(MODULE_NAME, 'Department changed', { department })
  }

  function addError(error: string): void {
    state.errors.push(error)
    setTimeout(() => {
      const index = state.errors.indexOf(error)
      if (index !== -1) {
        state.errors.splice(index, 1)
      }
    }, 5000)
  }

  function clearErrors(): void {
    state.errors = []
  }

  // =============================================
  // UI COMPATIBILITY FUNCTIONS
  // =============================================

  /**
   * ✅ UI Compatibility: Проверить добавлен ли товар
   */
  function isSuggestionAdded(itemId: string): boolean {
    return state.selectedItems.some(item => item.itemId === itemId)
  }

  /**
   * ✅ UI Compatibility: Добавить предложение в заявку
   */
  function addSuggestionToRequest(suggestion: OrderSuggestion, customQuantity?: number): void {
    addSelectedItem(suggestion, customQuantity)
  }

  /**
   * ✅ UI Compatibility: Удалить товар из заявки
   */
  function removeItemFromRequest(itemId: string): void {
    removeSelectedItem(itemId)
  }

  /**
   * ✅ UI Compatibility: Обновить количество выбранного товара
   */
  function updateSelectedQuantity(itemId: string, quantityInBaseUnits: number): void {
    updateItemQuantity(itemId, quantityInBaseUnits)
  }

  /**
   * ✅ UI Compatibility: Получить количество для отображения
   */
  function getSelectedQuantityForDisplay(itemId: string): number {
    const item = state.selectedItems.find(item => item.itemId === itemId)
    return item ? item.requestedQuantity : 0
  }

  /**
   * ✅ UI Compatibility: Создать заявку из выбранных товаров
   */
  async function createRequestFromItems(
    requestedBy: string,
    priority: Priority,
    notes?: string
  ): Promise<string> {
    return createRequest(requestedBy, { priority, notes })
  }

  /**
   * ✅ UI Compatibility: Изменить департамент
   */
  async function changeDepartment(department: Department): Promise<void> {
    setDepartment(department)
  }

  /**
   * ✅ UI Utility: Получить цвет для уровня срочности
   */
  function getUrgencyColor(urgency: string): string {
    const colorMap: Record<string, string> = {
      low: 'success',
      medium: 'warning',
      high: 'error'
    }
    return colorMap[urgency] || 'primary'
  }

  /**
   * ✅ UI Utility: Получить иконку для уровня срочности
   */
  function getUrgencyIcon(urgency: string): string {
    const iconMap: Record<string, string> = {
      low: 'mdi-check-circle',
      medium: 'mdi-alert',
      high: 'mdi-alert-circle'
    }
    return iconMap[urgency] || 'mdi-information'
  }

  /**
   * ✅ UI Utility: Форматирование валюты (для совместимости)
   */
  function formatCurrency(amount: number): string {
    return formatIDR(amount)
  }

  /**
   * ✅ Manual Item Addition: Добавить товар вручную
   */
  function addManualItem(
    itemId: string,
    itemName: string,
    quantity: number,
    unit: string,
    notes?: string,
    estimatedPrice?: number // User-entered price (per base unit)
  ): void {
    // Создаем объект suggestion для совместимости
    const mockSuggestion: OrderSuggestion = {
      itemId,
      itemName,
      suggestedQuantity: quantity,
      urgency: 'medium',
      reason: 'manual_add',
      // Use user-entered price if provided, otherwise get from product
      estimatedPrice: estimatedPrice ?? getProductPrice(itemId),
      currentStock: 0,
      minStock: 0
    }

    addSelectedItem(mockSuggestion)
  }

  /**
   * ✅ Получить информацию о товаре (используется в UI)
   */
  function getItemInfo(itemId: string) {
    const product = productsStore.products.find(p => p.id === itemId)
    if (!product) return null

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: getProductBaseUnit(itemId),
      price: getProductPrice(itemId),
      minStock: product.minStock || 0,
      currentStock: 0 // TODO: интеграция со Storage
    }
  }

  /**
   * ✅ Получить доступные категории (для фильтров)
   */
  function getAvailableCategories(): string[] {
    return [...new Set(productsStore.products.map(p => p.category))]
  }

  // =============================================
  // RETURN API
  // =============================================

  return {
    // ===== STATE =====
    state: readonly(state),
    selectedDepartment: computed(() => state.selectedDepartment),
    selectedItems: computed(() => state.selectedItems),
    isGenerating: computed(() => state.isGenerating),
    isLoading: computed(() => state.isGenerating),

    // ===== COMPUTED =====
    suggestions,
    filteredSuggestions,
    urgentSuggestions,
    mediumSuggestions,
    lowSuggestions,
    requestSummary,
    autoRefresh,

    // ===== CORE FUNCTIONS =====
    generateSuggestions,
    refreshData,
    addSelectedItem,
    removeSelectedItem,
    updateItemQuantity,
    clearSelectedItems,
    createRequest,
    getCurrentStock,

    // ===== DEPARTMENT MANAGEMENT =====
    setDepartment,
    changeDepartment,

    // ===== PRICE MANAGEMENT (упрощенные) =====
    getEstimatedPrice,
    updatePrices,
    getProductPrice,
    getProductBaseUnit,

    // ===== CALCULATION FUNCTIONS =====
    calculateEstimatedTotal,

    // ===== UI COMPATIBILITY =====
    isSuggestionAdded,
    addSuggestionToRequest,
    removeItemFromRequest,
    updateSelectedQuantity,
    getSelectedQuantityForDisplay,
    createRequestFromItems,

    // ===== UI UTILITIES =====
    getUrgencyColor,
    getUrgencyIcon,
    formatCurrency,
    addManualItem,
    getItemInfo,
    getAvailableCategories,

    // ===== ERROR MANAGEMENT =====
    addError,
    clearErrors,

    // ===== UTILS IMPORTS (для BaseOrderAssistant) =====
    formatQuantityWithUnit,
    getBestInputUnit,
    convertUserInputToBaseUnits,
    convertBaseUnitsToUserDisplay
  }
}
