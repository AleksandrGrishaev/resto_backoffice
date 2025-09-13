// src/stores/pos/orders/composables/useOrders.ts
import { ref, computed } from 'vue'
import type { OrderType } from '@/types/order'

interface MockOrder {
  id: string
  orderNumber: string
  type: OrderType
  tableId?: string
  customerInfo?: {
    name: string
    phone?: string
  }
}

/**
 * Composable для работы с заказами и их отображением
 */
export function useOrders() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedOrderId = ref<string | null>(null)

  // =============================================
  // ОТОБРАЖЕНИЕ ЗАКАЗОВ
  // =============================================

  /**
   * Получить иконку типа заказа
   */
  function getOrderTypeIcon(type: OrderType): string {
    const icons = {
      'dine-in': 'mdi-table-chair',
      delivery: 'mdi-bike-fast',
      takeaway: 'mdi-shopping'
    }
    return icons[type] || 'mdi-receipt'
  }

  /**
   * Получить отображаемый тип заказа для UI
   */
  function getOrderDisplayType(type: OrderType): 'delivery' | 'takeaway' | 'table' {
    if (type === 'delivery') return 'delivery'
    if (type === 'takeaway') return 'takeaway'
    return 'table'
  }

  /**
   * Получить цвет статуса заказа
   */
  function getOrderStatusColor(status: string): string {
    const colors = {
      draft: 'grey',
      active: 'primary',
      completed: 'success',
      cancelled: 'error',
      paid: 'success'
    }
    return colors[status] || 'grey'
  }

  /**
   * Проверить активен ли заказ
   */
  function isOrderActive(orderId: string): boolean {
    return selectedOrderId.value === orderId
  }

  // =============================================
  // УПРАВЛЕНИЕ ВЫБОРОМ ЗАКАЗОВ
  // =============================================

  /**
   * Выбрать заказ для просмотра (переключатель секции заказа)
   */
  function selectOrder(orderId: string): void {
    selectedOrderId.value = orderId
  }

  /**
   * Очистить выбор заказа
   */
  function clearOrderSelection(): void {
    selectedOrderId.value = null
  }

  /**
   * Переключить выбор заказа (если уже выбран - снять выбор)
   */
  function toggleOrderSelection(orderId: string): void {
    if (selectedOrderId.value === orderId) {
      clearOrderSelection()
    } else {
      selectOrder(orderId)
    }
  }

  // =============================================
  // СОЗДАНИЕ ЗАКАЗОВ
  // =============================================

  /**
   * Создать новый заказ delivery
   */
  async function createDeliveryOrder(
    customerInfo: { name: string; phone?: string; address?: string },
    callbacks: {
      onSuccess?: (orderId: string) => void
      onError?: (error: string) => void
    } = {}
  ): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // TODO: Интеграция с реальным store
      const newOrderId = `delivery_${Date.now()}`

      // Имитация создания заказа
      await new Promise(resolve => setTimeout(resolve, 500))

      // Автоматически выбрать созданный заказ
      selectOrder(newOrderId)

      callbacks.onSuccess?.(newOrderId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка создания заказа на доставку'
      error.value = errorMsg
      callbacks.onError?.(errorMsg)
    } finally {
      loading.value = false
    }
  }

  /**
   * Создать новый заказ takeaway
   */
  async function createTakeawayOrder(
    customerInfo: { name: string; phone?: string },
    callbacks: {
      onSuccess?: (orderId: string) => void
      onError?: (error: string) => void
    } = {}
  ): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // TODO: Интеграция с реальным store
      const newOrderId = `takeaway_${Date.now()}`

      // Имитация создания заказа
      await new Promise(resolve => setTimeout(resolve, 500))

      // Автоматически выбрать созданный заказ
      selectOrder(newOrderId)

      callbacks.onSuccess?.(newOrderId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка создания заказа на вынос'
      error.value = errorMsg
      callbacks.onError?.(errorMsg)
    } finally {
      loading.value = false
    }
  }

  /**
   * Создать новый заказ на столе (dine-in)
   */
  async function createDineInOrder(
    tableId: string,
    callbacks: {
      onSuccess?: (orderId: string) => void
      onError?: (error: string) => void
      checkTableAvailable?: (tableId: string) => boolean
    } = {}
  ): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Проверить доступность стола
      if (callbacks.checkTableAvailable && !callbacks.checkTableAvailable(tableId)) {
        throw new Error('Стол недоступен для создания заказа')
      }

      // TODO: Интеграция с реальным store
      const newOrderId = `table_${tableId}_${Date.now()}`

      // Имитация создания заказа
      await new Promise(resolve => setTimeout(resolve, 500))

      // Автоматически выбрать созданный заказ
      selectOrder(newOrderId)

      callbacks.onSuccess?.(newOrderId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка создания заказа на столе'
      error.value = errorMsg
      callbacks.onError?.(errorMsg)
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // ДЕЙСТВИЯ С ЗАКАЗАМИ
  // =============================================

  /**
   * Обработать выбор заказа (delivery/takeaway) из списка
   */
  async function handleOrderSelect(
    orderId: string,
    callbacks: {
      onSelect?: (orderId: string) => void
      onError?: (error: string) => void
      checkUnsavedChanges?: () => boolean
      showUnsavedDialog?: () => Promise<boolean>
    } = {}
  ): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Проверить несохранённые изменения
      if (callbacks.checkUnsavedChanges?.()) {
        const shouldContinue = await callbacks.showUnsavedDialog?.()
        if (!shouldContinue) return
      }

      // Выбрать заказ
      selectOrder(orderId)
      callbacks.onSelect?.(orderId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка выбора заказа'
      error.value = errorMsg
      callbacks.onError?.(errorMsg)
    } finally {
      loading.value = false
    }
  }

  /**
   * Очистить ошибки
   */
  function clearError(): void {
    error.value = null
  }

  return {
    // State
    loading,
    error,
    selectedOrderId,

    // Display helpers
    getOrderTypeIcon,
    getOrderDisplayType,
    getOrderStatusColor,
    isOrderActive,

    // Selection management
    selectOrder,
    clearOrderSelection,
    toggleOrderSelection,

    // Order creation
    createDeliveryOrder,
    createTakeawayOrder,
    createDineInOrder,

    // Actions
    handleOrderSelect,
    clearError
  }
}
