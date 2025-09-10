// src/stores/pos/payments/composables.ts
import { computed } from 'vue'
import type { PosPayment, PaymentMethod, PaymentStatus, PosBill } from '../types'

export function usePaymentsComposables() {
  /**
   * Проверить можно ли обработать платеж
   */
  function canProcessPayment(bills: PosBill[]): boolean {
    return bills.length > 0 && bills.every(bill => bill.status === 'active')
  }

  /**
   * Проверить можно ли сделать возврат
   */
  function canRefundPayment(payment: PosPayment): boolean {
    return payment.status === 'completed' && !payment.refundedAt
  }

  /**
   * Рассчитать сдачу
   */
  function calculateChange(amount: number, received: number): number {
    return Math.max(0, received - amount)
  }

  /**
   * Форматировать сумму платежа
   */
  function formatPaymentAmount(amount: number): string {
    return `₽${amount.toFixed(2)}`
  }

  /**
   * Получить иконку способа оплаты
   */
  function getPaymentMethodIcon(method: PaymentMethod): string {
    const icons = {
      cash: 'mdi-cash',
      card: 'mdi-credit-card',
      qr: 'mdi-qrcode',
      mixed: 'mdi-cash-multiple'
    }
    return icons[method] || 'mdi-help-circle'
  }

  /**
   * Получить название способа оплаты
   */
  function getPaymentMethodName(method: PaymentMethod): string {
    const names = {
      cash: 'Наличные',
      card: 'Карта',
      qr: 'QR-код',
      mixed: 'Смешанная'
    }
    return names[method] || 'Неизвестно'
  }

  /**
   * Получить цвет статуса платежа
   */
  function getPaymentStatusColor(status: PaymentStatus): string {
    const colors = {
      pending: 'warning',
      completed: 'success',
      failed: 'error',
      refunded: 'info'
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить иконку статуса платежа
   */
  function getPaymentStatusIcon(status: PaymentStatus): string {
    const icons = {
      pending: 'mdi-clock-outline',
      completed: 'mdi-check-circle',
      failed: 'mdi-close-circle',
      refunded: 'mdi-undo'
    }
    return icons[status] || 'mdi-help-circle'
  }

  /**
   * Получить описание статуса платежа
   */
  function getPaymentStatusText(status: PaymentStatus): string {
    const texts = {
      pending: 'Обработка',
      completed: 'Завершен',
      failed: 'Ошибка',
      refunded: 'Возврат'
    }
    return texts[status] || 'Неизвестно'
  }

  /**
   * Проверить нужна ли сдача
   */
  function needsChange(amount: number, received?: number): boolean {
    if (!received) return false
    return received > amount
  }

  /**
   * Валидировать сумму платежа
   */
  function validatePaymentAmount(
    amount: number,
    total: number
  ): {
    valid: boolean
    error?: string
  } {
    if (amount <= 0) {
      return { valid: false, error: 'Сумма должна быть больше нуля' }
    }

    if (amount > total * 1.5) {
      return { valid: false, error: 'Сумма слишком большая' }
    }

    return { valid: true }
  }

  /**
   * Валидировать сумму полученных денег
   */
  function validateReceivedAmount(
    received: number,
    amount: number
  ): {
    valid: boolean
    error?: string
  } {
    if (received < amount) {
      return { valid: false, error: 'Получено меньше суммы к оплате' }
    }

    if (received > amount * 10) {
      return { valid: false, error: 'Слишком большая сумма' }
    }

    return { valid: true }
  }

  /**
   * Рассчитать разбивку составного платежа
   */
  function calculateSplitPayment(
    total: number,
    splits: { method: PaymentMethod; amount: number }[]
  ): {
    totalPaid: number
    remaining: number
    isComplete: boolean
    overpaid: boolean
  } {
    const totalPaid = splits.reduce((sum, split) => sum + split.amount, 0)
    const remaining = Math.max(0, total - totalPaid)

    return {
      totalPaid,
      remaining,
      isComplete: totalPaid >= total,
      overpaid: totalPaid > total
    }
  }

  /**
   * Форматировать время платежа
   */
  function formatPaymentTime(date: string): string {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * Форматировать дату платежа
   */
  function formatPaymentDate(date: string): string {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return {
    canProcessPayment,
    canRefundPayment,
    calculateChange,
    formatPaymentAmount,
    getPaymentMethodIcon,
    getPaymentMethodName,
    getPaymentStatusColor,
    getPaymentStatusIcon,
    getPaymentStatusText,
    needsChange,
    validatePaymentAmount,
    validateReceivedAmount,
    calculateSplitPayment,
    formatPaymentTime,
    formatPaymentDate
  }
}
