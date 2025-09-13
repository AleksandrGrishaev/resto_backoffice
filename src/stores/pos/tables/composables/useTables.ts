// src/stores/pos/tables/composables/useTables.ts
import { ref } from 'vue'
import type { PosTable, TableStatus } from '../../types'

/**
 * Composable для работы со столами
 */
export function useTables() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // =============================================
  // ПРОВЕРКИ СОСТОЯНИЯ СТОЛОВ
  // =============================================

  /**
   * Проверить можно ли занять стол
   */
  function canOccupyTable(table: PosTable): boolean {
    return table.status === 'free' || table.status === 'reserved'
  }

  /**
   * Проверить можно ли освободить стол
   */
  function canFreeTable(table: PosTable): boolean {
    return table.status === 'occupied' || table.status === 'cleaning'
  }

  /**
   * Проверить можно ли зарезервировать стол
   */
  function canReserveTable(table: PosTable): boolean {
    return table.status === 'free'
  }

  /**
   * Проверить занят ли стол
   */
  function isTableOccupied(status: TableStatus): boolean {
    return status === 'occupied'
  }

  /**
   * Проверить свободен ли стол
   */
  function isTableFree(status: TableStatus): boolean {
    return status === 'free'
  }

  /**
   * Проверить истекла ли бронь стола
   */
  function isReservationExpired(table: PosTable): boolean {
    if (table.status !== 'reserved' || !table.reservedUntil) {
      return false
    }
    return new Date(table.reservedUntil) < new Date()
  }

  // =============================================
  // ОТОБРАЖЕНИЕ СТОЛОВ
  // =============================================

  /**
   * Получить отображаемое имя стола
   */
  function getTableDisplayName(table: PosTable): string {
    return `${table.number} (${table.capacity} мест)`
  }

  /**
   * Получить цвет статуса стола
   */
  function getTableStatusColor(status: TableStatus): string {
    const colors = {
      free: 'success',
      occupied: 'warning',
      reserved: 'info',
      cleaning: 'secondary'
    }
    return colors[status] || 'grey'
  }

  /**
   * Получить иконку статуса стола
   */
  function getTableStatusIcon(status: TableStatus): string {
    const icons = {
      free: 'mdi-table',
      occupied: 'mdi-table-chair',
      reserved: 'mdi-table-clock',
      cleaning: 'mdi-table-refresh'
    }
    return icons[status] || 'mdi-table'
  }

  /**
   * Получить описание статуса стола
   */
  function getTableStatusText(status: TableStatus): string {
    const texts = {
      free: 'Свободен',
      occupied: 'Занят',
      reserved: 'Забронирован',
      cleaning: 'Уборка'
    }
    return texts[status] || 'Неизвестно'
  }

  // =============================================
  // ДЕЙСТВИЯ СО СТОЛАМИ
  // =============================================

  /**
   * Обработать выбор стола с проверкой несохранённых изменений
   */
  async function handleTableSelect(
    table: PosTable,
    callbacks: {
      onSelect?: (tableId: string) => void | Promise<void>
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

      // Выполнить выбор стола
      await callbacks.onSelect?.(table.id)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка выбора стола'
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

    // Checks
    canOccupyTable,
    canFreeTable,
    canReserveTable,
    isTableOccupied,
    isTableFree,
    isReservationExpired,

    // Display
    getTableDisplayName,
    getTableStatusColor,
    getTableStatusIcon,
    getTableStatusText,

    // Actions
    handleTableSelect,
    clearError
  }
}
