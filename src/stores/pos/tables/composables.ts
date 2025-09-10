// src/stores/pos/tables/composables.ts
import { computed } from 'vue'
import type { PosTable, TableStatus } from '../types'

export function useTablesComposables() {
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

  /**
   * Проверить истекла ли бронь стола
   */
  function isReservationExpired(table: PosTable): boolean {
    if (table.status !== 'reserved' || !table.reservedUntil) {
      return false
    }

    return new Date(table.reservedUntil) < new Date()
  }

  return {
    canOccupyTable,
    canFreeTable,
    canReserveTable,
    getTableDisplayName,
    getTableStatusColor,
    getTableStatusIcon,
    getTableStatusText,
    isReservationExpired
  }
}
