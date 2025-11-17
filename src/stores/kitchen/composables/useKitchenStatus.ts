// src/stores/kitchen/composables/useKitchenStatus.ts
import type { OrderStatus, Department } from '@/stores/pos/types'

/**
 * Kitchen Status Helpers
 * Управление статусами заказов для Kitchen
 */
export function useKitchenStatus() {
  /**
   * Получить следующий статус для заказа
   * @param currentStatus - текущий статус
   * @param department - департамент (kitchen или bar), для бара пропускаем cooking
   */
  function getNextStatus(currentStatus: OrderStatus, department?: Department): OrderStatus | null {
    // Bar items: skip cooking, go directly from waiting to ready
    if (department === 'bar') {
      const barTransitions: Record<OrderStatus, OrderStatus | null> = {
        draft: null,
        waiting: 'ready', // Bar: waiting → ready (skip cooking)
        cooking: 'ready', // Fallback if somehow in cooking state
        ready: null,
        served: null,
        collected: null,
        delivered: null,
        cancelled: null
      }
      return barTransitions[currentStatus] || null
    }

    // Kitchen items: standard 3-step flow
    const kitchenTransitions: Record<OrderStatus, OrderStatus | null> = {
      draft: null, // Kitchen не работает с draft
      waiting: 'cooking',
      cooking: 'ready',
      ready: null, // Kitchen не меняет дальше (POS меняет на served/collected/delivered)
      served: null,
      collected: null,
      delivered: null,
      cancelled: null
    }
    return kitchenTransitions[currentStatus] || null
  }

  /**
   * Получить текст кнопки для статуса
   * @param currentStatus - текущий статус
   * @param department - департамент (kitchen или bar), для бара другие тексты
   */
  function getStatusButtonText(currentStatus: OrderStatus, department?: Department): string {
    // Bar items: simplified flow
    if (department === 'bar') {
      const barTexts: Record<OrderStatus, string> = {
        draft: '',
        waiting: 'Mark Ready', // Bar: waiting → ready (no cooking)
        cooking: 'Mark Ready', // Fallback
        ready: 'Ready',
        served: '',
        collected: '',
        delivered: '',
        cancelled: ''
      }
      return barTexts[currentStatus] || ''
    }

    // Kitchen items: standard flow
    const kitchenTexts: Record<OrderStatus, string> = {
      draft: '',
      waiting: 'Start Cooking',
      cooking: 'Mark Ready',
      ready: 'Ready', // disabled button
      served: '',
      collected: '',
      delivered: '',
      cancelled: ''
    }
    return kitchenTexts[currentStatus] || ''
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
