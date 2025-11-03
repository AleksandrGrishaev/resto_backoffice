// src/stores/pos/orders/composables.ts
import { computed } from 'vue'
import type {
  PosOrder,
  PosBill,
  PosBillItem,
  OrderStatus,
  OrderType,
  OrderPaymentStatus,
  ItemPaymentStatus
} from '../types'
import { ORDER_TYPE_STATUS_CONFIG } from '../types'

// ===== EXPORTS =====
export { useOrderSelection } from './composables/useOrderSelection'
export {
  recalculateOrderTotals,
  calculateOrderStatus,
  determineStatusByOrderType
} from './composables/useOrderCalculations'

export function useOrdersComposables() {
  /**
   * Проверить можно ли добавить товар в заказ
   */
  function canAddItemToOrder(order: PosOrder): boolean {
    // ИЗМЕНЕНО: заменили 'confirmed' → 'waiting'
    return ['draft', 'waiting'].includes(order.status)
  }

  /**
   * Проверить можно ли отправить заказ на кухню
   */
  function canSendToKitchen(order: PosOrder): boolean {
    // ИЗМЕНЕНО: убрали проверку 'active', используем все статусы кроме отмененных
    const hasItems = order.bills.some(bill =>
      bill.items.some(item => !['cancelled'].includes(item.status))
    )
    return order.status === 'draft' && hasItems
  }

  /**
   * Проверить можно ли закрыть заказ
   */
  function canCloseOrder(order: PosOrder): boolean {
    const hasItems = order.bills.some(bill =>
      bill.items.some(item => !['cancelled'].includes(item.status))
    )

    // Если нет позиций - можно закрыть без проверки оплаты
    if (!hasItems) return true

    // Проверяем что заказ в финальном статусе для его типа
    const finalStatus = getFinalStatusForOrderType(order.type)
    const isInFinalStatus = order.status === finalStatus

    // Проверяем что все счета оплачены
    const allBillsPaid = order.bills.every(
      bill => bill.paymentStatus === 'paid' || bill.status === 'cancelled'
    )

    return isInFinalStatus && allBillsPaid
  }

  /**
   * Получить отображаемое имя заказа
   */
  function getOrderDisplayName(order: PosOrder): string {
    if (order.type === 'dine_in' && order.tableId) {
      return `${order.orderNumber} (Стол)`
    }

    const typeNames = {
      dine_in: 'В зале',
      takeaway: 'На вынос',
      delivery: 'Доставка'
    }

    return `${order.orderNumber} (${typeNames[order.type]})`
  }

  /**
   * Получить цвет статуса готовности заказа
   */
  function getOrderStatusColor(status: OrderStatus): string {
    const colors = {
      draft: 'grey',
      waiting: 'info',
      cooking: 'warning',
      ready: 'success',
      served: 'primary',
      collected: 'primary', // ДОБАВЛЕНО
      delivered: 'success', // ДОБАВЛЕНО
      cancelled: 'error'
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить иконку статуса готовности заказа
   */
  function getOrderStatusIcon(status: OrderStatus): string {
    const icons = {
      draft: 'mdi-file-outline',
      waiting: 'mdi-clock-outline',
      cooking: 'mdi-chef-hat',
      ready: 'mdi-bell-ring',
      served: 'mdi-silverware-fork-knife',
      collected: 'mdi-shopping-outline', // ДОБАВЛЕНО
      delivered: 'mdi-truck-delivery', // ДОБАВЛЕНО
      cancelled: 'mdi-cancel'
    }
    return icons[status] || 'mdi-help-circle'
  }

  /**
   * Получить описание статуса готовности заказа
   */
  function getOrderStatusText(status: OrderStatus, orderType?: OrderType): string {
    // Базовые тексты
    const baseTexts = {
      draft: 'Draft',
      waiting: 'Waiting',
      cooking: 'Cooking',
      ready: 'Ready',
      served: 'Served',
      collected: 'Collected', // ДОБАВЛЕНО
      delivered: 'Delivered', // ДОБАВЛЕНО
      cancelled: 'Cancelled'
    }

    // Если есть тип заказа, используем специфичные тексты
    if (orderType) {
      const config = ORDER_TYPE_STATUS_CONFIG[orderType]
      if (status === config.finalStatus) {
        const finalTexts = {
          dine_in: 'Served',
          takeaway: 'Collected',
          delivery: 'Delivered'
        }
        return finalTexts[orderType] || baseTexts[status]
      }
    }

    return baseTexts[status] || 'Unknown'
  }

  /**
   * Получить цвет статуса оплаты заказа
   */
  function getOrderPaymentStatusColor(status: OrderPaymentStatus): string {
    const colors = {
      unpaid: 'warning',
      partial: 'info',
      paid: 'success',
      refunded: 'error'
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить текст статуса оплаты заказа
   */
  function getOrderPaymentStatusText(status: OrderPaymentStatus): string {
    const texts = {
      unpaid: 'Unpaid',
      partial: 'Partial',
      paid: 'Paid',
      refunded: 'Refunded'
    }
    return texts[status] || 'Unknown'
  }

  /**
   * Получить цвет статуса готовности позиции
   */
  function getItemStatusColor(
    status: 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled'
  ): string {
    const colors = {
      draft: 'orange',
      waiting: 'info', // синий
      cooking: 'purple', // фиолетовый
      ready: 'success', // зеленый
      served: 'primary', // основной цвет
      cancelled: 'error' // красный
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить текст статуса готовности позиции
   */
  function getItemStatusText(
    status: 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled'
  ): string {
    const texts = {
      draft: 'Draft',
      waiting: 'Waiting',
      cooking: 'Cooking',
      ready: 'Ready',
      served: 'Served',
      cancelled: 'Cancelled'
    }
    return texts[status] || 'Unknown'
  }

  /**
   * Получить цвет статуса оплаты позиции
   */
  function getItemPaymentStatusColor(status: ItemPaymentStatus): string {
    const colors = {
      unpaid: 'warning', // желтый/оранжевый
      paid: 'success', // зеленый
      refunded: 'error' // красный
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить текст статуса оплаты позиции
   */
  function getItemPaymentStatusText(status: ItemPaymentStatus): string {
    const texts = {
      unpaid: 'Unpaid',
      paid: 'Paid',
      refunded: 'Refunded'
    }
    return texts[status] || 'Unknown'
  }

  /**
   * Получить комбинированный статус заказа (готовность + оплата)
   */
  function getCombinedOrderStatus(order: PosOrder): string {
    const readinessText = getOrderStatusText(order.status)
    const paymentText = getOrderPaymentStatusText(order.paymentStatus)

    if (order.status === 'served' && order.paymentStatus === 'paid') {
      return 'Served & Paid' // Идеальное состояние
    }

    if (order.status === 'ready' && order.paymentStatus === 'unpaid') {
      return 'Ready - Awaiting Payment'
    }

    if (order.status === 'cooking' && order.paymentStatus === 'paid') {
      return 'Cooking - Prepaid'
    }

    return `${readinessText} - ${paymentText}`
  }

  /**
   * Получить иконку типа заказа
   */
  function getOrderTypeIcon(type: OrderType): string {
    const icons = {
      dine_in: 'mdi-table-chair',
      takeaway: 'mdi-shopping',
      delivery: 'mdi-bike-fast'
    }
    return icons[type] || 'mdi-help-circle'
  }

  /**
   * Форматировать сумму заказа
   */
  function formatOrderTotal(order: PosOrder): string {
    return `₽${order.finalAmount.toFixed(2)}`
  }

  /**
   * Получить общее количество позиций в заказе
   */
  function getOrderItemsCount(order: PosOrder): number {
    return order.bills.reduce(
      (total, bill) =>
        total + bill.items.filter(item => !['cancelled'].includes(item.status)).length,
      0
    )
  }

  /**
   * Получить общее количество товаров в заказе
   */
  function getOrderQuantityCount(order: PosOrder): number {
    return order.bills.reduce(
      (total, bill) =>
        total +
        bill.items
          .filter(item => !['cancelled'].includes(item.status))
          .reduce((sum, item) => sum + item.quantity, 0),
      0
    )
  }

  /**
   * Проверить есть ли в заказе неоплаченные счета
   */
  function hasUnpaidBills(order: PosOrder): boolean {
    return order.bills.some(bill => bill.status !== 'cancelled' && bill.paymentStatus !== 'paid')
  }

  /**
   * Получить прогресс оплаты заказа (0-100%)
   */
  function getPaymentProgress(order: PosOrder): number {
    const totalAmount = order.finalAmount
    if (totalAmount === 0) return 100

    const paidAmount = order.bills.reduce(
      (sum, bill) => sum + (bill.paymentStatus === 'paid' ? bill.total : bill.paidAmount),
      0
    )

    return Math.round((paidAmount / totalAmount) * 100)
  }

  /**
   * НОВАЯ: Получить валидные переходы статусов для заказа
   */
  function getValidStatusTransitions(
    currentStatus: OrderStatus,
    orderType: OrderType
  ): OrderStatus[] {
    const config = ORDER_TYPE_STATUS_CONFIG[orderType]
    return config?.transitions[currentStatus] || []
  }

  /**
   * НОВАЯ: Проверить возможность перехода статуса
   */
  function canTransitionTo(
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    orderType: OrderType
  ): boolean {
    const validTransitions = getValidStatusTransitions(fromStatus, orderType)
    return validTransitions.includes(toStatus)
  }

  /**
   * НОВАЯ: Получить финальный статус для типа заказа
   */
  function getFinalStatusForOrderType(orderType: OrderType): OrderStatus {
    return ORDER_TYPE_STATUS_CONFIG[orderType]?.finalStatus || 'served'
  }

  /**
   * НОВАЯ: Проверить является ли статус финальным для данного типа заказа
   */
  function isFinalStatus(status: OrderStatus, orderType: OrderType): boolean {
    return status === getFinalStatusForOrderType(orderType)
  }

  /**
   * НОВАЯ: Получить следующий логичный статус
   */
  function getNextLogicalStatus(
    currentStatus: OrderStatus,
    orderType: OrderType
  ): OrderStatus | null {
    const transitions = getValidStatusTransitions(currentStatus, orderType)
    // Возвращаем первый доступный переход (обычно это следующий по порядку)
    return transitions.find(s => s !== 'cancelled') || null
  }

  return {
    // Основные проверки возможностей
    canAddItemToOrder,
    canSendToKitchen,
    canCloseOrder,

    // Отображение заказа
    getOrderDisplayName,
    getOrderTypeIcon,
    formatOrderTotal,
    getOrderItemsCount,
    getOrderQuantityCount,
    hasUnpaidBills,
    getPaymentProgress,

    // Статусы готовности заказа (ОБНОВЛЕНО)
    getOrderStatusColor,
    getOrderStatusIcon,
    getOrderStatusText,

    // Статусы оплаты заказа
    getOrderPaymentStatusColor,
    getOrderPaymentStatusText,

    // Статусы готовности позиции
    getItemStatusColor,
    getItemStatusText,

    // Статусы оплаты позиции
    getItemPaymentStatusColor,
    getItemPaymentStatusText,

    // Комбинированные статусы
    getCombinedOrderStatus,

    // НОВЫЕ: Функции переходов статусов
    getValidStatusTransitions,
    canTransitionTo,
    getFinalStatusForOrderType,
    isFinalStatus,
    getNextLogicalStatus
  }
}
