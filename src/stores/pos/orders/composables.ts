// src/stores/pos/orders/composables.ts
import { computed } from 'vue'
import type { PosOrder, PosBill, PosBillItem, OrderStatus, OrderType } from '../types'

export function useOrdersComposables() {
  /**
   * Проверить можно ли добавить товар в заказ
   */
  function canAddItemToOrder(order: PosOrder): boolean {
    return ['draft', 'confirmed'].includes(order.status)
  }

  /**
   * Проверить можно ли отправить заказ на кухню
   */
  function canSendToKitchen(order: PosOrder): boolean {
    const hasItems = order.bills.some(bill => bill.items.some(item => item.status === 'active'))
    return order.status === 'draft' && hasItems
  }

  /**
   * Проверить можно ли закрыть заказ
   */
  function canCloseOrder(order: PosOrder): boolean {
    const allBillsPaid = order.bills.every(
      bill => bill.paymentStatus === 'paid' || bill.status === 'cancelled'
    )
    return ['confirmed', 'preparing', 'ready', 'served'].includes(order.status) && allBillsPaid
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
   * Получить цвет статуса заказа
   */
  function getOrderStatusColor(status: OrderStatus): string {
    const colors = {
      draft: 'grey',
      confirmed: 'info',
      preparing: 'warning',
      ready: 'success',
      served: 'primary',
      paid: 'green',
      cancelled: 'error'
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить иконку статуса заказа
   */
  function getOrderStatusIcon(status: OrderStatus): string {
    const icons = {
      draft: 'mdi-file-outline',
      confirmed: 'mdi-check-circle-outline',
      preparing: 'mdi-chef-hat',
      ready: 'mdi-bell-ring',
      served: 'mdi-silverware-fork-knife',
      paid: 'mdi-cash-check',
      cancelled: 'mdi-cancel'
    }
    return icons[status] || 'mdi-help-circle'
  }

  /**
   * Получить описание статуса заказа
   */
  function getOrderStatusText(status: OrderStatus): string {
    const texts = {
      draft: 'Черновик',
      confirmed: 'Подтвержден',
      preparing: 'Готовится',
      ready: 'Готов',
      served: 'Подан',
      paid: 'Оплачен',
      cancelled: 'Отменен'
    }
    return texts[status] || 'Неизвестно'
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
      (total, bill) => total + bill.items.filter(item => item.status === 'active').length,
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
          .filter(item => item.status === 'active')
          .reduce((sum, item) => sum + item.quantity, 0),
      0
    )
  }

  /**
   * Проверить есть ли в заказе неоплаченные счета
   */
  function hasUnpaidBills(order: PosOrder): boolean {
    return order.bills.some(bill => bill.status === 'active' && bill.paymentStatus !== 'paid')
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

  return {
    canAddItemToOrder,
    canSendToKitchen,
    canCloseOrder,
    getOrderDisplayName,
    getOrderStatusColor,
    getOrderStatusIcon,
    getOrderStatusText,
    getOrderTypeIcon,
    formatOrderTotal,
    getOrderItemsCount,
    getOrderQuantityCount,
    hasUnpaidBills,
    getPaymentProgress
  }
}
