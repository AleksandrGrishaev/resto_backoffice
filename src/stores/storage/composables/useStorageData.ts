// src/stores/storage/composables/useStorageData.ts
import { ref } from 'vue'
import { DebugUtils } from '@/utils'
import { storageDataService } from '../services/storageDataService'
import type {
  StorageDepartment,
  StorageBalance,
  StorageOperation,
  InventoryDocument,
  InventoryItem,
  CreateInventoryData,
  CreateConsumptionData,
  CreateReceiptData
} from '../types'

const MODULE_NAME = 'UseStorageData'

/**
 * Composable для работы с данными склада
 * Отвечает за: fetch операции, loading states, error handling
 */
export function useStorageData() {
  // ==========================================
  // STATE
  // ==========================================
  const loading = ref({
    balances: false,
    operations: false,
    inventories: false
  })

  const error = ref<string | null>(null)

  // ==========================================
  // CORE DATA OPERATIONS
  // ==========================================

  async function fetchBalances(department?: StorageDepartment) {
    try {
      loading.value.balances = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Fetching balances', { department })

      const balances = await storageDataService.getBalances(department)

      DebugUtils.info(MODULE_NAME, 'Balances fetched successfully', {
        count: balances.length,
        department
      })

      return balances
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balances'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, department })
      throw err
    } finally {
      loading.value.balances = false
    }
  }

  async function fetchOperations(department?: StorageDepartment) {
    try {
      loading.value.operations = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Fetching operations', { department })

      const operations = await storageDataService.getOperations(department)

      DebugUtils.info(MODULE_NAME, 'Operations fetched successfully', {
        count: operations.length,
        department
      })

      return operations
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch operations'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, department })
      throw err
    } finally {
      loading.value.operations = false
    }
  }

  async function fetchInventories(department?: StorageDepartment) {
    try {
      loading.value.inventories = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Fetching inventories', { department })

      const inventories = await storageDataService.getInventories(department)

      DebugUtils.info(MODULE_NAME, 'Inventories fetched successfully', {
        count: inventories.length,
        department
      })

      return inventories
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inventories'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, department })
      throw err
    } finally {
      loading.value.inventories = false
    }
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  async function createConsumption(data: CreateConsumptionData) {
    try {
      loading.value.operations = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Creating consumption operation', {
        department: data.department,
        itemsCount: data.items.length
      })

      const operation = await storageDataService.createConsumption(data)

      DebugUtils.info(MODULE_NAME, 'Consumption created successfully', {
        operationId: operation.id,
        totalValue: operation.totalValue
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create consumption'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, data })
      throw err
    } finally {
      loading.value.operations = false
    }
  }

  async function createReceipt(data: CreateReceiptData) {
    try {
      loading.value.operations = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Creating receipt operation', {
        department: data.department,
        itemsCount: data.items.length
      })

      const operation = await storageDataService.createReceipt(data)

      DebugUtils.info(MODULE_NAME, 'Receipt created successfully', {
        operationId: operation.id,
        totalValue: operation.totalValue
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create receipt'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, data })
      throw err
    } finally {
      loading.value.operations = false
    }
  }

  // ==========================================
  // INVENTORY OPERATIONS
  // ==========================================

  async function startInventory(data: CreateInventoryData) {
    try {
      loading.value.inventories = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Starting inventory', {
        department: data.department,
        itemType: data.itemType
      })

      const inventory = await storageDataService.startInventory(data)

      DebugUtils.info(MODULE_NAME, 'Inventory started successfully', {
        inventoryId: inventory.id,
        itemsCount: inventory.totalItems
      })

      return inventory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start inventory'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, data })
      throw err
    } finally {
      loading.value.inventories = false
    }
  }

  async function updateInventory(inventoryId: string, items: InventoryItem[]) {
    try {
      loading.value.inventories = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Updating inventory', {
        inventoryId,
        itemsCount: items.length
      })

      const inventory = await storageDataService.updateInventory(inventoryId, items)

      DebugUtils.info(MODULE_NAME, 'Inventory updated successfully', {
        inventoryId,
        discrepancies: inventory.totalDiscrepancies
      })

      return inventory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update inventory'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, inventoryId })
      throw err
    } finally {
      loading.value.inventories = false
    }
  }

  async function finalizeInventory(inventoryId: string) {
    try {
      loading.value.inventories = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Finalizing inventory', { inventoryId })

      const correctionOperations = await storageDataService.finalizeInventory(inventoryId)

      DebugUtils.info(MODULE_NAME, 'Inventory finalized successfully', {
        inventoryId,
        correctionsCount: correctionOperations.length
      })

      return correctionOperations
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finalize inventory'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, inventoryId })
      throw err
    } finally {
      loading.value.inventories = false
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async function initializeData() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage data')

      await storageDataService.initialize()

      DebugUtils.info(MODULE_NAME, 'Storage data initialized successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize storage data'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  function clearError() {
    error.value = null
  }

  function isLoading(operation?: 'balances' | 'operations' | 'inventories'): boolean {
    if (operation) {
      return loading.value[operation]
    }
    return Object.values(loading.value).some(Boolean)
  }

  // ==========================================
  // RETURN PUBLIC API
  // ==========================================
  return {
    // State
    loading: loading.value,
    error,

    // Helper getters
    isLoading,

    // Core operations
    fetchBalances,
    fetchOperations,
    fetchInventories,

    // CRUD operations
    createConsumption,
    createReceipt,

    // Inventory operations
    startInventory,
    updateInventory,
    finalizeInventory,

    // Utilities
    clearError,
    initializeData
  }
}
