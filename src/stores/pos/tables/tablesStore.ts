// src/stores/pos/tables/tablesStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PosTable, TableFilters, ServiceResponse, TableStatus, TableSection } from '../types'
import { TablesService } from './services'
import { useTables } from './composables/useTables'

export const usePosTablesStore = defineStore('posTables', () => {
  // ===== STATE =====
  const tables = ref<PosTable[]>([]) // Start empty, load from Supabase
  const initialized = ref(false)
  const loading = ref({
    list: false,
    create: false,
    update: false,
    delete: false
  })
  const error = ref<string | null>(null)
  const filters = ref<TableFilters>({})

  // ===== CONSTANTS =====
  const TABLES_STORAGE_KEY = 'pos_tables'

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
    const grouped: Record<string, PosTable[]> = {
      main: [],
      island: [],
      terrace: [],
      bar: []
    }

    filteredTables.value.forEach(table => {
      if (!grouped[table.section]) {
        grouped[table.section] = []
      }
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
    occupancyRate:
      tables.value.length > 0
        ? Math.round((occupiedTables.value.length / tables.value.length) * 100)
        : 0
  }))

  // ===== ACTIONS =====
  /**
   * Initialize tables store - load from Supabase
   */
  async function initialize(): Promise<void> {
    if (initialized.value) {
      console.log('🔄 Tables store already initialized')
      return
    }

    console.log('📦 Initializing Tables Store...')
    await loadTables()
    initialized.value = true
    console.log(`✅ Tables Store initialized with ${tables.value.length} tables`)
  }

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
        const source = (response as any).metadata?.source || 'unknown'
        console.log(`✅ Loaded ${response.data.length} tables from ${source}`)
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
   * @param expectedOrderId — conditional guard: update only if current_order_id matches
   */
  async function updateTableStatus(
    tableId: string,
    status: TableStatus,
    orderId?: string,
    expectedOrderId?: string
  ): Promise<ServiceResponse<PosTable>> {
    loading.value.update = true
    error.value = null

    try {
      const response = await tablesService.updateTableStatus(
        tableId,
        status,
        orderId,
        expectedOrderId
      )

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
   * Освободить стол (conditional: only if current_order_id matches expectedOrderId)
   */
  async function freeTable(
    tableId: string,
    expectedOrderId?: string
  ): Promise<ServiceResponse<PosTable>> {
    return updateTableStatus(tableId, 'free', undefined, expectedOrderId)
  }

  /**
   * Занять стол заказом (conditional: only if current_order_id matches expectedOrderId)
   */
  async function occupyTable(
    tableId: string,
    orderId: string,
    expectedOrderId?: string
  ): Promise<ServiceResponse<PosTable>> {
    return updateTableStatus(tableId, 'occupied', orderId, expectedOrderId)
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

  /**
   * Update table in-memory + localStorage without Supabase call.
   * Used when DB was already updated (by RPC, realtime, or another device).
   */
  function updateTableLocally(tableId: string, updates: Partial<PosTable>): void {
    const index = tables.value.findIndex(t => t.id === tableId)
    if (index === -1) return

    const table = tables.value[index]
    Object.assign(table, updates)

    // Sync to localStorage so it doesn't diverge
    try {
      const cached = localStorage.getItem(TABLES_STORAGE_KEY)
      if (cached) {
        const stored: PosTable[] = JSON.parse(cached)
        const si = stored.findIndex(t => t.id === tableId)
        if (si !== -1) {
          Object.assign(stored[si], updates)
          localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(stored))
        }
      }
    } catch {
      // localStorage write failed — in-memory state is still correct
    }
  }

  /**
   * Обновить стол из Realtime (без API вызова)
   * Используется для синхронизации между вкладками/устройствами
   */
  function updateTableFromRealtime(update: {
    id: string
    number?: string
    status?: TableStatus
    currentOrderId?: string
    updatedAt?: string
  }): void {
    const index = tables.value.findIndex(t => t.id === update.id)
    if (index === -1) {
      console.log('📡 Table not found for realtime update:', update.id)
      return
    }

    const table = tables.value[index]
    const oldStatus = table.status
    const oldOrderId = table.currentOrderId

    // Build partial update
    const changes: Partial<PosTable> = {}
    if (update.status !== undefined) changes.status = update.status
    if (update.currentOrderId !== undefined) changes.currentOrderId = update.currentOrderId
    if (update.updatedAt !== undefined) changes.updatedAt = update.updatedAt

    // Apply to in-memory + localStorage in one shot
    updateTableLocally(update.id, changes)

    console.log('📡 Table updated from realtime:', {
      tableNumber: table.number,
      oldStatus,
      newStatus: table.status,
      oldOrderId,
      newOrderId: table.currentOrderId
    })
  }

  // ===== COMPOSABLES =====
  const tablesComposables = useTables()

  return {
    // State
    tables,
    initialized,
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
    initialize,
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
    updateTableLocally,
    updateTableFromRealtime,

    // Composables (destructured)
    ...tablesComposables
  }
})
