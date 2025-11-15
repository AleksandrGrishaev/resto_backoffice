// src/stores/kitchen/composables/useKitchenOrders.ts
import { computed } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import type { PosOrder, OrderStatus, OrderType, ServiceResponse } from '@/stores/pos/types'

/**
 * Kitchen Orders Composable
 * Фильтрует и управляет заказами для Kitchen интерфейса
 * Использует POS orders store напрямую (NO duplication)
 */
export function useKitchenOrders() {
  const posOrdersStore = usePosOrdersStore()

  /**
   * Kitchen видит только заказы со статусами: waiting, cooking, ready
   */
  const kitchenOrders = computed((): PosOrder[] => {
    return posOrdersStore.orders.filter(order =>
      ['waiting', 'cooking', 'ready'].includes(order.status)
    )
  })

  /**
   * Фильтрация по типу заказа
   */
  const filterByType = (type?: OrderType): PosOrder[] => {
    if (!type) return kitchenOrders.value
    return kitchenOrders.value.filter(order => order.type === type)
  }

  /**
   * Группировка по статусам (для колонок)
   */
  const ordersByStatus = computed(() => ({
    waiting: kitchenOrders.value.filter(o => o.status === 'waiting'),
    cooking: kitchenOrders.value.filter(o => o.status === 'cooking'),
    ready: kitchenOrders.value.filter(o => o.status === 'ready')
  }))

  /**
   * Статистика заказов
   */
  const ordersStats = computed(() => ({
    total: kitchenOrders.value.length,
    waiting: ordersByStatus.value.waiting.length,
    cooking: ordersByStatus.value.cooking.length,
    ready: ordersByStatus.value.ready.length
  }))

  /**
   * Обновление статуса заказа - делегируем в POS
   */
  async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus
  ): Promise<ServiceResponse<PosOrder>> {
    const order = posOrdersStore.orders.find(o => o.id === orderId)

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      }
    }

    // Обновляем статус локально (reactive)
    order.status = newStatus
    order.updatedAt = new Date().toISOString()

    // Сохраняем через POS store
    // ⚠️ Sprint 1: localStorage (Team A переключит на Supabase)
    return await posOrdersStore.updateOrder(order)
  }

  /**
   * Получить информацию о столе для dine-in заказа
   */
  function getTableNumber(order: PosOrder): string | null {
    if (order.type !== 'dine_in' || !order.tableId) return null

    // Извлекаем номер стола из tableId (формат: table_1 -> "1")
    const match = order.tableId.match(/table_(\d+)/)
    if (match) {
      return match[1]
    }

    // Fallback: возвращаем tableId как есть
    return order.tableId
  }

  /**
   * Получить тип заказа для отображения
   */
  function getOrderTypeLabel(type: OrderType): string {
    const labels: Record<OrderType, string> = {
      dine_in: 'Dine-in',
      takeaway: 'Takeaway',
      delivery: 'Delivery'
    }
    return labels[type]
  }

  /**
   * Получить цвет для типа заказа
   */
  function getOrderTypeColor(type: OrderType): string {
    const colors: Record<OrderType, string> = {
      dine_in: 'primary',
      takeaway: 'orange',
      delivery: 'purple'
    }
    return colors[type]
  }

  return {
    // Data
    kitchenOrders,
    ordersByStatus,
    ordersStats,

    // Methods
    filterByType,
    updateOrderStatus,
    getTableNumber,
    getOrderTypeLabel,
    getOrderTypeColor
  }
}
