// src/stores/storage/composables/useInventory.ts - COMPLETE INVENTORY COMPOSABLE
import { ref, computed } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { useStorageStore } from '../storageStore'
import { useProductsStore } from '@/stores/productsStore'
import type {
  StorageDepartment,
  InventoryDocument,
  InventoryItem,
  InventoryStatus,
  CreateInventoryData,
  StorageOperation
} from '../types'

const MODULE_NAME = 'useInventory'

export function useInventory() {
  // Dependencies
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

  // Local state
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentInventory = ref<InventoryDocument | null>(null)

  // ===========================
  // INVENTORY CREATION
  // ===========================

  /**
   * Start new inventory process for department
   */
  async function startInventory(
    department: StorageDepartment,
    responsiblePerson: string,
    notes?: string
  ): Promise<InventoryDocument> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Starting new inventory', {
        department,
        responsiblePerson
      })

      const inventoryData: CreateInventoryData = {
        department,
        responsiblePerson
      }

      const inventory = await storageStore.startInventory(inventoryData)
      currentInventory.value = inventory

      DebugUtils.info(MODULE_NAME, 'Inventory started successfully', {
        inventoryId: inventory.id,
        itemCount: inventory.items.length
      })

      return inventory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start inventory'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Load existing inventory by ID
   */
  async function loadInventory(inventoryId: string): Promise<InventoryDocument | null> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Loading inventory', { inventoryId })

      const inventory = storageStore.getInventory(inventoryId)
      if (inventory) {
        currentInventory.value = inventory
        DebugUtils.info(MODULE_NAME, 'Inventory loaded', {
          inventoryId: inventory.id,
          status: inventory.status
        })
      }

      return inventory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===========================
  // INVENTORY ITEM MANAGEMENT
  // ===========================

  /**
   * Update single inventory item actual quantity
   */
  async function updateInventoryItem(
    inventoryId: string,
    itemId: string,
    actualQuantity: number,
    notes?: string,
    countedBy?: string
  ): Promise<InventoryDocument> {
    try {
      loading.value = true
      error.value = null

      const inventory = storageStore.getInventory(inventoryId)
      if (!inventory) {
        throw new Error(`Inventory ${inventoryId} not found`)
      }

      if (inventory.status === 'confirmed') {
        throw new Error('Cannot update confirmed inventory')
      }

      // Update the specific item
      const updatedItems = inventory.items.map(item => {
        if (item.itemId === itemId) {
          const difference = actualQuantity - item.systemQuantity
          const valueDifference = difference * item.averageCost

          return {
            ...item,
            actualQuantity,
            difference,
            valueDifference,
            notes: notes || item.notes,
            countedBy: countedBy || item.countedBy,
            confirmed: true
          }
        }
        return item
      })

      const updatedInventory = await storageStore.updateInventory(inventoryId, updatedItems)
      currentInventory.value = updatedInventory

      DebugUtils.info(MODULE_NAME, 'Inventory item updated', {
        inventoryId,
        itemId,
        actualQuantity,
        difference:
          actualQuantity - (inventory.items.find(i => i.itemId === itemId)?.systemQuantity || 0)
      })

      return updatedInventory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update inventory item'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update multiple inventory items at once
   */
  async function updateInventoryItems(
    inventoryId: string,
    itemUpdates: Array<{
      itemId: string
      actualQuantity: number
      notes?: string
      countedBy?: string
    }>
  ): Promise<InventoryDocument> {
    try {
      loading.value = true
      error.value = null

      const inventory = storageStore.getInventory(inventoryId)
      if (!inventory) {
        throw new Error(`Inventory ${inventoryId} not found`)
      }

      if (inventory.status === 'confirmed') {
        throw new Error('Cannot update confirmed inventory')
      }

      // Create update map for efficient lookup
      const updateMap = new Map(itemUpdates.map(update => [update.itemId, update]))

      const updatedItems = inventory.items.map(item => {
        const update = updateMap.get(item.itemId)
        if (update) {
          const difference = update.actualQuantity - item.systemQuantity
          const valueDifference = difference * item.averageCost

          return {
            ...item,
            actualQuantity: update.actualQuantity,
            difference,
            valueDifference,
            notes: update.notes || item.notes,
            countedBy: update.countedBy || item.countedBy,
            confirmed: true
          }
        }
        return item
      })

      const updatedInventory = await storageStore.updateInventory(inventoryId, updatedItems)
      currentInventory.value = updatedInventory

      DebugUtils.info(MODULE_NAME, 'Multiple inventory items updated', {
        inventoryId,
        itemCount: itemUpdates.length,
        totalDiscrepancies: updatedInventory.totalDiscrepancies
      })

      return updatedInventory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update inventory items'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===========================
  // INVENTORY FINALIZATION
  // ===========================

  /**
   * Finalize inventory and create adjustment operations
   */
  async function finalizeInventory(inventoryId: string): Promise<StorageOperation[]> {
    try {
      loading.value = true
      error.value = null

      const inventory = storageStore.getInventory(inventoryId)
      if (!inventory) {
        throw new Error(`Inventory ${inventoryId} not found`)
      }

      if (inventory.status === 'confirmed') {
        throw new Error('Inventory already confirmed')
      }

      // Check if all items are counted
      const unCountedItems = inventory.items.filter(item => !item.confirmed)
      if (unCountedItems.length > 0) {
        DebugUtils.warn(MODULE_NAME, 'Some items not counted, using system quantities', {
          unCountedCount: unCountedItems.length
        })

        // Auto-confirm uncounted items with system quantity
        const autoUpdatedItems = inventory.items.map(item => {
          if (!item.confirmed) {
            return {
              ...item,
              actualQuantity: item.systemQuantity,
              difference: 0,
              valueDifference: 0,
              notes: 'Auto-confirmed with system quantity',
              confirmed: true
            }
          }
          return item
        })

        await storageStore.updateInventory(inventoryId, autoUpdatedItems)
      }

      const operations = await storageStore.finalizeInventory(inventoryId)

      // Update current inventory reference
      const finalizedInventory = storageStore.getInventory(inventoryId)
      if (finalizedInventory) {
        currentInventory.value = finalizedInventory
      }

      DebugUtils.info(MODULE_NAME, 'Inventory finalized successfully', {
        inventoryId,
        operationsCreated: operations.length,
        totalDiscrepancies: finalizedInventory?.totalDiscrepancies || 0,
        totalValueDifference: finalizedInventory?.totalValueDifference || 0
      })

      return operations
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finalize inventory'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancel inventory (set status to cancelled)
   */
  async function cancelInventory(inventoryId: string, reason?: string): Promise<void> {
    try {
      loading.value = true
      error.value = null

      const inventory = storageStore.getInventory(inventoryId)
      if (!inventory) {
        throw new Error(`Inventory ${inventoryId} not found`)
      }

      if (inventory.status === 'confirmed') {
        throw new Error('Cannot cancel confirmed inventory')
      }

      // Mark as cancelled (this would need to be implemented in storageStore)
      // For now, we'll clear the current inventory
      if (currentInventory.value?.id === inventoryId) {
        currentInventory.value = null
      }

      DebugUtils.info(MODULE_NAME, 'Inventory cancelled', {
        inventoryId,
        reason
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel inventory'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===========================
  // INVENTORY HELPERS
  // ===========================

  /**
   * Get products available for inventory in department
   */
  function getAvailableProductsForInventory(department: StorageDepartment) {
    try {
      const balances = storageStore.departmentBalances(department)

      return balances
        .map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          systemQuantity: balance.totalQuantity,
          unit: balance.unit,
          averageCost: balance.averageCost,
          batches: balance.batches.length,
          hasExpired: balance.hasExpired,
          hasNearExpiry: balance.hasNearExpiry
        }))
        .sort((a, b) => a.itemName.localeCompare(b.itemName))
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available products', { err })
      return []
    }
  }

  /**
   * Calculate inventory statistics
   */
  const inventoryStatistics = computed(() => {
    if (!currentInventory.value) {
      return {
        totalItems: 0,
        countedItems: 0,
        uncountedItems: 0,
        itemsWithDiscrepancies: 0,
        totalValueDifference: 0,
        completionPercentage: 0
      }
    }

    const inventory = currentInventory.value
    const countedItems = inventory.items.filter(item => item.confirmed).length
    const itemsWithDiscrepancies = inventory.items.filter(
      item => item.confirmed && Math.abs(item.difference) > 0.01
    ).length

    return {
      totalItems: inventory.items.length,
      countedItems,
      uncountedItems: inventory.items.length - countedItems,
      itemsWithDiscrepancies,
      totalValueDifference: inventory.totalValueDifference,
      completionPercentage:
        inventory.items.length > 0 ? Math.round((countedItems / inventory.items.length) * 100) : 0
    }
  })

  /**
   * Get items with significant discrepancies
   */
  const itemsWithDiscrepancies = computed(() => {
    if (!currentInventory.value) return []

    return currentInventory.value.items
      .filter(item => item.confirmed && Math.abs(item.difference) > 0.01)
      .sort((a, b) => Math.abs(b.valueDifference) - Math.abs(a.valueDifference))
  })

  /**
   * Get uncounted items
   */
  const uncountedItems = computed(() => {
    if (!currentInventory.value) return []

    return currentInventory.value.items.filter(item => !item.confirmed)
  })

  /**
   * Check if inventory can be finalized
   */
  const canFinalize = computed(() => {
    if (!currentInventory.value) return false

    return currentInventory.value.status === 'draft' && currentInventory.value.items.length > 0
  })

  // ===========================
  // INVENTORY DATA RETRIEVAL
  // ===========================

  /**
   * Get recent inventories for department
   */
  async function getRecentInventories(
    department?: StorageDepartment,
    limit: number = 10
  ): Promise<InventoryDocument[]> {
    try {
      await storageStore.fetchInventories(department)

      let inventories = [...storageStore.state.inventories]

      if (department && department !== 'all') {
        inventories = inventories.filter(inv => inv.department === department)
      }

      return inventories
        .sort((a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime())
        .slice(0, limit)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get recent inventories', { err })
      return []
    }
  }

  /**
   * Get inventory by ID with full details
   */
  async function getInventoryDetails(inventoryId: string): Promise<InventoryDocument | null> {
    try {
      // Ensure inventories are loaded
      await storageStore.fetchInventories()

      return storageStore.getInventory(inventoryId)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get inventory details', { err, inventoryId })
      return null
    }
  }

  // ===========================
  // UTILITY FUNCTIONS
  // ===========================

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null
  }

  /**
   * Clear current inventory
   */
  function clearCurrentInventory() {
    currentInventory.value = null
  }

  /**
   * Get product information by ID
   */
  function getProductInfo(productId: string) {
    try {
      const product = productsStore.products.find(p => p.id === productId)

      if (!product) {
        return {
          name: productId,
          unit: 'kg',
          costPerUnit: 0,
          category: 'unknown'
        }
      }

      return {
        name: product.name,
        unit: product.unit,
        costPerUnit: product.costPerUnit,
        category: product.category
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product info', { error, productId })
      return {
        name: productId,
        unit: 'kg',
        costPerUnit: 0,
        category: 'unknown'
      }
    }
  }

  // ===========================
  // COMPUTED PROPERTIES
  // ===========================

  const hasError = computed(() => !!error.value)
  const isLoading = computed(() => loading.value)
  const hasCurrentInventory = computed(() => !!currentInventory.value)
  const currentInventoryStatus = computed(() => currentInventory.value?.status || null)

  // ===========================
  // RETURN PUBLIC API
  // ===========================

  return {
    // State
    loading: isLoading,
    error,
    hasError,
    currentInventory,
    hasCurrentInventory,
    currentInventoryStatus,

    // Inventory Management
    startInventory,
    loadInventory,
    finalizeInventory,
    cancelInventory,

    // Item Management
    updateInventoryItem,
    updateInventoryItems,

    // Data Retrieval
    getRecentInventories,
    getInventoryDetails,
    getAvailableProductsForInventory,

    // Statistics and Analysis
    inventoryStatistics,
    itemsWithDiscrepancies,
    uncountedItems,
    canFinalize,

    // Utilities
    clearError,
    clearCurrentInventory,
    getProductInfo
  }
}
