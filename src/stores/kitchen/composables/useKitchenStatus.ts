// src/stores/kitchen/composables/useKitchenStatus.ts
import type { OrderStatus } from '@/stores/pos/types'

/**
 * Kitchen Status Helpers
 * Управление статусами заказов для Kitchen
 */
export function useKitchenStatus() {
  /**
   * Получить следующий статус для заказа
   */
  function getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
    const transitions: Record<OrderStatus, OrderStatus | null> = {
      draft: null, // Kitchen не работает с draft
      waiting: 'cooking',
      cooking: 'ready',
      ready: null, // Kitchen не меняет дальше (POS меняет на served/collected/delivered)
      served: null,
      collected: null,
      delivered: null,
      cancelled: null
    }
    return transitions[currentStatus] || null
  }

  /**
   * Получить текст кнопки для статуса
   */
  function getStatusButtonText(currentStatus: OrderStatus): string {
    const texts: Record<OrderStatus, string> = {
      draft: '',
      waiting: 'Start Cooking',
      cooking: 'Mark Ready',
      ready: 'Ready', // disabled button
      served: '',
      collected: '',
      delivered: '',
      cancelled: ''
    }
    return texts[currentStatus] || ''
  }

  /**
   * Получить цвет статуса
   */
  function getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      draft: 'grey',
      waiting: 'orange',
      cooking: 'blue',
      ready: 'green',
      served: 'grey',
      collected: 'grey',
      delivered: 'grey',
      cancelled: 'red'
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить иконку статуса
   */
  function getStatusIcon(status: OrderStatus): string {
    const icons: Record<OrderStatus, string> = {
      draft: 'mdi-file-document-outline',
      waiting: 'mdi-clock-outline',
      cooking: 'mdi-fire',
      ready: 'mdi-check-circle',
      served: 'mdi-check-all',
      collected: 'mdi-package-variant',
      delivered: 'mdi-truck-delivery',
      cancelled: 'mdi-close-circle'
    }
    return icons[status] || 'mdi-help-circle'
  }

  /**
   * Проверить можно ли обновить статус
   */
  function canUpdateStatus(currentStatus: OrderStatus): boolean {
    return getNextStatus(currentStatus) !== null
  }

  /**
   * Получить label статуса
   */
  function getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      draft: 'Draft',
      waiting: 'Waiting',
      cooking: 'Cooking',
      ready: 'Ready',
      served: 'Served',
      collected: 'Collected',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    }
    return labels[status] || status
  }

  return {
    getNextStatus,
    getStatusButtonText,
    getStatusColor,
    getStatusIcon,
    canUpdateStatus,
    getStatusLabel
  }
}
