// src/stores/pos/tables/services.ts
import type { PosTable, ServiceResponse, TableStatus } from '../types'
import { TimeUtils } from '@/utils'

export class TablesService {
  private readonly STORAGE_KEY = 'pos_tables'

  /**
   * Получить все столы
   */
  async getAllTables(): Promise<ServiceResponse<PosTable[]>> {
    try {
      // TODO: Заменить на API вызов
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const tables = stored ? JSON.parse(stored) : this.generateDefaultTables()

      // Симуляция задержки API
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        success: true,
        data: tables
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load tables'
      }
    }
  }

  /**
   * Создать новый стол
   */
  async createTable(
    tableData: Omit<PosTable, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceResponse<PosTable>> {
    try {
      const newTable: PosTable = {
        ...tableData,
        id: `table_${Date.now()}`,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // TODO: Заменить на API вызов
      const tables = await this.getAllTables()
      if (!tables.success || !tables.data) {
        throw new Error('Failed to load existing tables')
      }

      tables.data.push(newTable)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tables.data))

      return {
        success: true,
        data: newTable
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create table'
      }
    }
  }

  /**
   * Обновить статус стола
   */
  async updateTableStatus(
    tableId: string,
    status: TableStatus,
    orderId?: string
  ): Promise<ServiceResponse<PosTable>> {
    try {
      const tables = await this.getAllTables()
      if (!tables.success || !tables.data) {
        throw new Error('Failed to load tables')
      }

      const tableIndex = tables.data.findIndex(t => t.id === tableId)
      if (tableIndex === -1) {
        throw new Error('Table not found')
      }

      const updatedTable: PosTable = {
        ...tables.data[tableIndex],
        status,
        currentOrderId: orderId,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Очистить резервацию если стол освобождается
      if (status === 'free') {
        updatedTable.reservedUntil = undefined
        updatedTable.currentOrderId = undefined
      }

      tables.data[tableIndex] = updatedTable
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tables.data))

      return {
        success: true,
        data: updatedTable
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update table status'
      }
    }
  }

  /**
   * Обновить данные стола
   */
  async updateTable(
    tableId: string,
    updates: Partial<PosTable>
  ): Promise<ServiceResponse<PosTable>> {
    try {
      const tables = await this.getAllTables()
      if (!tables.success || !tables.data) {
        throw new Error('Failed to load tables')
      }

      const tableIndex = tables.data.findIndex(t => t.id === tableId)
      if (tableIndex === -1) {
        throw new Error('Table not found')
      }

      const updatedTable: PosTable = {
        ...tables.data[tableIndex],
        ...updates,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      tables.data[tableIndex] = updatedTable
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tables.data))

      return {
        success: true,
        data: updatedTable
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update table'
      }
    }
  }

  /**
   * Удалить стол
   */
  async deleteTable(tableId: string): Promise<ServiceResponse<void>> {
    try {
      const tables = await this.getAllTables()
      if (!tables.success || !tables.data) {
        throw new Error('Failed to load tables')
      }

      const tableIndex = tables.data.findIndex(t => t.id === tableId)
      if (tableIndex === -1) {
        throw new Error('Table not found')
      }

      // Проверить что стол свободен
      const table = tables.data[tableIndex]
      if (table.status === 'occupied') {
        throw new Error('Cannot delete occupied table')
      }

      tables.data.splice(tableIndex, 1)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tables.data))

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete table'
      }
    }
  }

  /**
   * Генерация дефолтных столов для начальной инициализации
   */
  private generateDefaultTables(): PosTable[] {
    const now = TimeUtils.getCurrentLocalISO()

    const defaultTables: PosTable[] = [
      // Main section tables
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `table_main_${i + 1}`,
        number: `T${i + 1}`,
        capacity: 4,
        section: 'main' as TableSection,
        floor: 1,
        status: 'free' as TableStatus,
        createdAt: now,
        updatedAt: now
      })),

      // Island tables
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `table_island_${i + 1}`,
        number: `I${i + 1}`,
        capacity: 6,
        section: 'island' as TableSection,
        floor: 1,
        status: 'free' as TableStatus,
        createdAt: now,
        updatedAt: now
      })),

      // Bar seats
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `table_bar_${i + 1}`,
        number: `B${i + 1}`,
        capacity: 2,
        section: 'bar' as TableSection,
        floor: 1,
        status: 'free' as TableStatus,
        createdAt: now,
        updatedAt: now
      }))
    ]

    // Сохранить в localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultTables))

    return defaultTables
  }
}

// src/stores/pos/tables/composables.ts
import { computed } from 'vue'
import type { PosTable, TableStatus } from '../types'
import { usePosTablesStore } from './index'

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

  return {
    canOccupyTable,
    canFreeTable,
    canReserveTable,
    getTableDisplayName,
    getTableStatusColor,
    getTableStatusIcon
  }
}
