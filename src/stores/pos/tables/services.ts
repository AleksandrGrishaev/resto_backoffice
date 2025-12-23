// src/stores/pos/tables/services.ts
import type { PosTable, ServiceResponse, TableStatus } from '../types'
import { TimeUtils } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import { toSupabaseInsert, toSupabaseUpdate, fromSupabase } from './supabaseMappers'

export class TablesService {
  private readonly STORAGE_KEY = 'pos_tables'

  /**
   * Check if Supabase is available
   */
  private isSupabaseAvailable(): boolean {
    return ENV.useSupabase && supabase !== null
  }

  /**
   * Получить все столы
   */
  async getAllTables(): Promise<ServiceResponse<PosTable[]>> {
    try {
      // Try Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const { data, error } = await supabase!
          .from('tables')
          .select('*')
          .order('sort_order', { ascending: true })

        if (!error && data) {
          console.log(`✅ Loaded ${data.length} tables from Supabase`)
          const tables = data.map(fromSupabase)

          // Cache to localStorage for offline access
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tables))

          return {
            success: true,
            data: tables,
            metadata: {
              timestamp: TimeUtils.getCurrentLocalISO(),
              source: 'api'
            }
          }
        } else if (error) {
          console.warn('⚠️ Supabase load failed, falling back to localStorage:', error.message)
        }
      }

      // Fallback to localStorage (offline or Supabase failed)
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const tables = stored ? JSON.parse(stored) : this.generateDefaultTables()

      return {
        success: true,
        data: tables,
        metadata: {
          timestamp: TimeUtils.getCurrentLocalISO(),
          source: 'local'
        }
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

      // Dual-write: Supabase + localStorage
      // 1. Update in Supabase (if online)
      if (this.isSupabaseAvailable()) {
        const supabaseUpdate = toSupabaseUpdate(updatedTable)
        const { error } = await supabase!.from('tables').update(supabaseUpdate).eq('id', tableId)

        if (error) {
          console.error('❌ Supabase table status update failed:', error.message)
        } else {
          console.log(`✅ Table ${updatedTable.number} status updated in Supabase: ${status}`)
        }
      }

      // 2. Always update localStorage (offline resilience)
      tables.data[tableIndex] = updatedTable
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tables.data))
      console.log(`💾 Table ${updatedTable.number} status saved to localStorage (backup)`)

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
