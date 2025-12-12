// src/stores/pos/shifts/composables.ts - SHIFTS COMPOSABLES

import type { ShiftStatus, SyncStatus, PosShift, ShiftTransaction } from './types'

/**
 * Composables для работы с UI логикой смен
 */
export function useShiftsComposables() {
  // =============================================
  // ФОРМАТИРОВАНИЕ ДАННЫХ
  // =============================================

  /**
   * Форматировать продолжительность смены
   */
  function formatShiftDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()

    const diffMs = end.getTime() - start.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    if (hours === 0) {
      return `${minutes}м`
    }

    return `${hours}ч ${minutes}м`
  }

  /**
   * Форматировать номер смены для отображения
   */
  function formatShiftNumber(shiftNumber: string): string {
    // Из "SHIFT-20250910-1400" делаем "10.09 14:00"
    const parts = shiftNumber.split('-')
    if (parts.length !== 3) return shiftNumber

    const date = parts[1]
    const time = parts[2]

    if (date.length === 8 && time.length === 4) {
      const formattedDate = `${date.slice(6, 8)}.${date.slice(4, 6)}`
      const formattedTime = `${time.slice(0, 2)}:${time.slice(2, 4)}`
      return `${formattedDate} ${formattedTime}`
    }

    return shiftNumber
  }

  /**
   * Форматировать время для отображения
   */
  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Форматировать дату для отображения
   */
  function formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  /**
   * Форматировать сумму в рупиях
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // =============================================
  // ВАЛИДАЦИЯ И ПРОВЕРКИ
  // =============================================

  /**
   * Можно ли начать новую смену
   */
  function canStartShift(currentShift: PosShift | null): {
    canStart: boolean
    reason?: string
  } {
    if (currentShift?.status === 'active') {
      return {
        canStart: false,
        reason: 'Active shift already exists'
      }
    }

    return { canStart: true }
  }

  /**
   * Можно ли завершить смену
   */
  function canEndShift(
    shift: PosShift | null,
    pendingTransactions: ShiftTransaction[]
  ): {
    canEnd: boolean
    reason?: string
    warnings?: string[]
  } {
    if (!shift) {
      return {
        canEnd: false,
        reason: 'No active shift'
      }
    }

    if (shift.status !== 'active') {
      return {
        canEnd: false,
        reason: 'Shift is already closed'
      }
    }

    const warnings: string[] = []

    // Check for unsynced transactions
    const pendingCount = pendingTransactions.length
    if (pendingCount > 0) {
      warnings.push(`${pendingCount} transaction${pendingCount === 1 ? '' : 's'} not synchronized`)
    }

    // Check minimum shift duration (30 minutes)
    const duration = new Date().getTime() - new Date(shift.startTime).getTime()
    const minDuration = 30 * 60 * 1000 // 30 minutes in milliseconds

    if (duration < minDuration) {
      warnings.push('Shift is too short (less than 30 minutes)')
    }

    return {
      canEnd: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Можно ли добавить транзакцию
   */
  function canAddTransaction(shift: PosShift | null): boolean {
    return shift?.status === 'active'
  }

  /**
   * Нужна ли синхронизация
   */
  function needsSync(shift: PosShift | null, transactions: ShiftTransaction[]): boolean {
    if (!shift) return false

    return (
      shift.syncStatus === 'pending' ||
      transactions.some(t => t.syncStatus === 'pending' || t.syncStatus === 'failed')
    )
  }

  // =============================================
  // ЦВЕТА И СТИЛИ
  // =============================================

  /**
   * Цвет статуса смены
   */
  function getShiftStatusColor(status: ShiftStatus): string {
    const colors = {
      active: 'success',
      completed: 'primary',
      cancelled: 'error',
      suspended: 'warning'
    }
    return colors[status] || 'grey'
  }

  /**
   * Иконка статуса смены
   */
  function getShiftStatusIcon(status: ShiftStatus): string {
    const icons = {
      active: 'mdi-play-circle',
      completed: 'mdi-check-circle',
      cancelled: 'mdi-close-circle',
      suspended: 'mdi-pause-circle'
    }
    return icons[status] || 'mdi-help-circle'
  }

  /**
   * Цвет статуса синхронизации
   */
  function getSyncStatusColor(status: SyncStatus): string {
    const colors = {
      synced: 'success',
      pending: 'warning',
      failed: 'error',
      offline: 'info'
    }
    return colors[status] || 'grey'
  }

  /**
   * Иконка статуса синхронизации
   */
  function getSyncStatusIcon(status: SyncStatus): string {
    const icons = {
      synced: 'mdi-cloud-check',
      pending: 'mdi-cloud-upload',
      failed: 'mdi-cloud-alert',
      offline: 'mdi-cloud-off'
    }
    return icons[status] || 'mdi-help-circle'
  }

  /**
   * Текст статуса синхронизации
   */
  function getSyncStatusText(status: SyncStatus): string {
    const texts = {
      synced: 'Synchronized',
      pending: 'Pending synchronization',
      failed: 'Synchronization failed',
      offline: 'Offline mode'
    }
    return texts[status] || 'Unknown'
  }

  /**
   * Цвет расхождения по кассе
   */
  function getCashDiscrepancyColor(discrepancy: number): string {
    if (discrepancy === 0) return 'success'
    if (Math.abs(discrepancy) <= 1000) return 'warning' // Небольшое расхождение
    return 'error' // Значительное расхождение
  }

  // =============================================
  // РАСЧЕТЫ И СТАТИСТИКА
  // =============================================

  /**
   * Рассчитать процентное соотношение способов оплаты
   */
  function calculatePaymentMethodPercentages(
    paymentMethods: Array<{ amount: number; count: number; methodName: string }>
  ): Array<{ methodName: string; amount: number; count: number; percentage: number }> {
    const totalAmount = paymentMethods.reduce((sum, method) => sum + method.amount, 0)

    return paymentMethods.map(method => ({
      ...method,
      percentage: totalAmount > 0 ? (method.amount / totalAmount) * 100 : 0
    }))
  }

  /**
   * Получить топ способы оплаты
   */
  function getTopPaymentMethods(
    paymentMethods: Array<{ amount: number; methodName: string }>,
    limit: number = 3
  ): Array<{ methodName: string; amount: number; percentage: number }> {
    const totalAmount = paymentMethods.reduce((sum, method) => sum + method.amount, 0)

    return paymentMethods
      .filter(method => method.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map(method => ({
        methodName: method.methodName,
        amount: method.amount,
        percentage: totalAmount > 0 ? (method.amount / totalAmount) * 100 : 0
      }))
  }

  /**
   * Рассчитать эффективность смены
   */
  function calculateShiftEfficiency(shift: PosShift): {
    salesPerHour: number
    transactionsPerHour: number
    averageTransactionValue: number
    efficiency: 'low' | 'medium' | 'high'
  } {
    const durationHours = shift.duration ? shift.duration / 60 : 0

    if (durationHours === 0) {
      return {
        salesPerHour: 0,
        transactionsPerHour: 0,
        averageTransactionValue: 0,
        efficiency: 'low'
      }
    }

    const salesPerHour = shift.totalSales / durationHours
    const transactionsPerHour = shift.totalTransactions / durationHours
    const averageTransactionValue =
      shift.totalTransactions > 0 ? shift.totalSales / shift.totalTransactions : 0

    // Простая логика определения эффективности
    let efficiency: 'low' | 'medium' | 'high' = 'low'
    if (salesPerHour > 10000 && transactionsPerHour > 5) {
      efficiency = 'high'
    } else if (salesPerHour > 5000 && transactionsPerHour > 3) {
      efficiency = 'medium'
    }

    return {
      salesPerHour,
      transactionsPerHour,
      averageTransactionValue,
      efficiency
    }
  }

  // =============================================
  // УТИЛИТЫ ДЛЯ UI
  // =============================================

  /**
   * Получить краткую информацию о смене для отображения
   */
  function getShiftSummary(shift: PosShift): {
    title: string
    subtitle: string
    status: ShiftStatus
    duration: string
    totalSales: string
    isActive: boolean
  } {
    return {
      title: formatShiftNumber(shift.shiftNumber),
      subtitle: `${shift.cashierName} • ${formatDate(shift.startTime)}`,
      status: shift.status,
      duration: formatShiftDuration(shift.startTime, shift.endTime),
      totalSales: formatCurrency(shift.totalSales),
      isActive: shift.status === 'active'
    }
  }

  /**
   * Получить предупреждения о смене
   */
  function getShiftWarnings(shift: PosShift, transactions: ShiftTransaction[]): string[] {
    const warnings: string[] = []

    // Check synchronization
    if (needsSync(shift, transactions)) {
      const pendingCount = transactions.filter(
        t => t.syncStatus === 'pending' || t.syncStatus === 'failed'
      ).length
      warnings.push(
        `${pendingCount} transaction${pendingCount === 1 ? '' : 's'} require synchronization`
      )
    }

    // Check cash discrepancy
    if (shift.cashDiscrepancy && Math.abs(shift.cashDiscrepancy) > 0) {
      const type = shift.cashDiscrepancy > 0 ? 'overage' : 'shortage'
      warnings.push(`Cash discrepancy: ${type} ${formatCurrency(Math.abs(shift.cashDiscrepancy))}`)
    }

    // Check duration for active shift
    if (shift.status === 'active') {
      const duration = new Date().getTime() - new Date(shift.startTime).getTime()
      const hours = duration / (1000 * 60 * 60)

      if (hours > 12) {
        warnings.push('Shift has been running for more than 12 hours')
      }
    }

    return warnings
  }

  return {
    // Форматирование
    formatShiftDuration,
    formatShiftNumber,
    formatTime,
    formatDate,
    formatCurrency,

    // Валидация
    canStartShift,
    canEndShift,
    canAddTransaction,
    needsSync,

    // Стили
    getShiftStatusColor,
    getShiftStatusIcon,
    getSyncStatusColor,
    getSyncStatusIcon,
    getSyncStatusText,
    getCashDiscrepancyColor,

    // Расчеты
    calculatePaymentMethodPercentages,
    getTopPaymentMethods,
    calculateShiftEfficiency,

    // UI утилиты
    getShiftSummary,
    getShiftWarnings
  }
}
