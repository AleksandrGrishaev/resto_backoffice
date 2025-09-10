// src/stores/pos/tables/tablesStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PosTable, TableFilters, ServiceResponse, TableStatus, TableSection } from '../types'
import { TablesService } from './services'
import { useTablesComposables } from './composables'

export const usePosTablesStore = defineStore('posTables', () => {
  // ===== STATE =====
  const tables = ref<PosTable[]>([])
  const loading = ref({
    list: false,
    create: false,
    update: false,
    delete: false
  })
  const error = ref<string | null>(null)
  const filters = ref<TableFilters>({})

  // ===== SERVICES =====
  const tablesService = new TablesService()

  // ===== COMPUTED =====
  const filteredTables = computed(() => {
    let result = [...tables.value]

    if (filters.value.section) {
      result = result.filter(table => table.section === filters.value.section)
    }

    if (filters.value.status) {
      result = result.filter(table => table.status === filters.value.status)
    }

    if (filters.value.floor) {
      result = result.filter(table => table.floor === filters.value.floor)
    }

    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(
        table =>
          table.number.toLowerCase().includes(search) || table.notes?.toLowerCase().includes(search)
      )
    }

    return result.sort((a, b) => a.number.localeCompare(b.number))
  })

  const tablesBySection = computed(() => {
    const grouped: Record<TableSection, PosTable[]> = {
      main: [],
      island: [],
      terrace: [],
      bar: []
    }

    filteredTables.value.forEach(table => {
      grouped[table.section].push(table)
    })

    return grouped
  })

  const occupiedTables = computed(() => tables.value.filter(table => table.status === 'occupied'))

  const freeTables = computed(() => tables.value.filter(table => table.status === 'free'))

  const tablesStats = computed(() => ({
    total: tables.value.length,
    free: freeTables.value.length,
    occupied: occupiedTables.value.length,
    reserved: tables.value.filter(t => t.status === 'reserved').length,
    cleaning: tables.value.filter(t => t.status === 'cleaning').length,
    occupancyRate:
      tables.value.length > 0
        ? Math.round((occupiedTables.value.length / tables.value.length) * 100)
        : 0
  }))

  // ===== ACTIONS =====

  /**
   * Загрузить все столы
   */
  async function loadTables(): Promise<ServiceResponse<PosTable[]>> {
    loading.value.list = true
    error.value = null

    try {
      const response = await tablesService.getAllTables()

      if (response.success && response.data) {
        tables.value = response.data
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load tables'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.list = false
    }
  }

  /**
   * Получить стол по ID
   */
  function getTableById(id: string): PosTable | undefined {
    return tables.value.find(table => table.id === id)
  }

  /**
   * Получить стол по номеру
   */
  function getTableByNumber(number: string): PosTable | undefined {
    return tables.value.find(table => table.number === number)
  }

  /**
   * Создать новый стол
   */
  async function createTable(
    tableData: Omit<PosTable, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceResponse<PosTable>> {
    loading.value.create = true
    error.value = null

    try {
      const response = await tablesService.createTable(tableData)

      if (response.success && response.data) {
        tables.value.push(response.data)
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create table'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.create = false
    }
  }

  /**
   * Обновить статус стола
   */
  async function updateTableStatus(
    tableId: string,
    status: TableStatus,
    orderId?: string
  ): Promise<ServiceResponse<PosTable>> {
    loading.value.update = true
    error.value = null

    try {
      const response = await tablesService.updateTableStatus(tableId, status, orderId)

      if (response.success && response.data) {
        const index = tables.value.findIndex(t => t.id === tableId)
        if (index !== -1) {
          tables.value[index] = response.data
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update table status'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.update = false
    }
  }

  /**
   * Обновить данные стола
   */
  async function updateTable(
    tableId: string,
    updates: Partial<PosTable>
  ): Promise<ServiceResponse<PosTable>> {
    loading.value.update = true
    error.value = null

    try {
      const response = await tablesService.updateTable(tableId, updates)

      if (response.success && response.data) {
        const index = tables.value.findIndex(t => t.id === tableId)
        if (index !== -1) {
          tables.value[index] = response.data
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update table'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.update = false
    }
  }

  /**
   * Удалить стол
   */
  async function deleteTable(tableId: string): Promise<ServiceResponse<void>> {
    loading.value.delete = true
    error.value = null

    try {
      const response = await tablesService.deleteTable(tableId)

      if (response.success) {
        const index = tables.value.findIndex(t => t.id === tableId)
        if (index !== -1) {
          tables.value.splice(index, 1)
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete table'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.delete = false
    }
  }

  /**
   * Освободить стол
   */
  async function freeTable(tableId: string): Promise<ServiceResponse<PosTable>> {
    return updateTableStatus(tableId, 'free')
  }

  /**
   * Занять стол заказом
   */
  async function occupyTable(tableId: string, orderId: string): Promise<ServiceResponse<PosTable>> {
    return updateTableStatus(tableId, 'occupied', orderId)
  }

  /**
   * Зарезервировать стол
   */
  async function reserveTable(
    tableId: string,
    reservedUntil: string,
    notes?: string
  ): Promise<ServiceResponse<PosTable>> {
    const table = getTableById(tableId)
    if (!table) {
      return { success: false, error: 'Table not found' }
    }

    return updateTable(tableId, {
      status: 'reserved',
      reservedUntil,
      notes
    })
  }

  /**
   * Установить фильтры
   */
  function setFilters(newFilters: Partial<TableFilters>): void {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * Очистить фильтры
   */
  function clearFilters(): void {
    filters.value = {}
  }

  /**
   * Очистить ошибки
   */
  function clearError(): void {
    error.value = null
  }

  // ===== COMPOSABLES =====
  const {
    canOccupyTable,
    canFreeTable,
    canReserveTable,
    getTableDisplayName,
    getTableStatusColor,
    getTableStatusIcon
  } = useTablesComposables()

  return {
    // State
    tables,
    loading,
    error,
    filters,

    // Computed
    filteredTables,
    tablesBySection,
    occupiedTables,
    freeTables,
    tablesStats,

    // Actions
    loadTables,
    getTableById,
    getTableByNumber,
    createTable,
    updateTableStatus,
    updateTable,
    deleteTable,
    freeTable,
    occupyTable,
    reserveTable,
    setFilters,
    clearFilters,
    clearError,

    // Composables
    canOccupyTable,
    canFreeTable,
    canReserveTable,
    getTableDisplayName,
    getTableStatusColor,
    getTableStatusIcon
  }
})
