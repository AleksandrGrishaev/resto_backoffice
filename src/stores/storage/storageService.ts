// src/stores/storage/storageService.ts
import { DebugUtils, TimeUtils } from '@/utils'
import {
  mockStorageBatches,
  mockStorageOperations,
  mockStorageBalances,
  generateBatchNumber,
  calculateFifoAllocation
} from './storageMock'
import type {
  StorageBatch,
  StorageOperation,
  StorageBalance,
  StorageDepartment,
  StorageItemType,
  CreateConsumptionData,
  CreateReceiptData,
  CreateInventoryData,
  InventoryDocument,
  BatchAllocation
} from './types'

const MODULE_NAME = 'StorageService'

export class StorageService {
  private batches: StorageBatch[] = [...mockStorageBatches]
  private operations: StorageOperation[] = [...mockStorageOperations]
  private balances: StorageBalance[] = [...mockStorageBalances]
  private inventories: InventoryDocument[] = []

  // Get all storage balances
  async getBalances(department?: StorageDepartment): Promise<StorageBalance[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching storage balances', { department })

      let balances = [...this.balances]

      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }

      DebugUtils.info(MODULE_NAME, 'Storage balances fetched', { count: balances.length })
      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch storage balances', { error })
      throw error
    }
  }

  // Get balance for specific item
  async getBalance(
    itemId: string,
    itemType: StorageItemType,
    department: StorageDepartment
  ): Promise<StorageBalance | null> {
    try {
      const balance = this.balances.find(
        b => b.itemId === itemId && b.itemType === itemType && b.department === department
      )

      return balance || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get balance', { error, itemId })
      throw error
    }
  }

  // Get all batches for item (for FIFO calculation)
  async getItemBatches(
    itemId: string,
    itemType: StorageItemType,
    department: StorageDepartment
  ): Promise<StorageBatch[]> {
    try {
      const batches = this.batches.filter(
        b =>
          b.itemId === itemId &&
          b.itemType === itemType &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      // Sort by receipt date (FIFO - oldest first)
      return batches.sort(
        (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get item batches', { error, itemId })
      throw error
    }
  }

  // Calculate FIFO allocation for consumption
  calculateFifoAllocation(
    itemId: string,
    itemType: StorageItemType,
    department: StorageDepartment,
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    try {
      const batches = this.batches.filter(
        b =>
          b.itemId === itemId &&
          b.itemType === itemType &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      return calculateFifoAllocation(batches, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  // Calculate consumption cost based on FIFO
  calculateConsumptionCost(
    itemId: string,
    itemType: StorageItemType,
    department: StorageDepartment,
    quantity: number
  ): number {
    try {
      const { allocations } = this.calculateFifoAllocation(itemId, itemType, department, quantity)

      return allocations.reduce(
        (total, allocation) => total + allocation.quantity * allocation.costPerUnit,
        0
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate consumption cost', { error })
      throw error
    }
  }

  // Create consumption operation
  async createConsumption(data: CreateConsumptionData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating consumption operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        // Calculate FIFO allocation
        const { allocations, remainingQuantity } = this.calculateFifoAllocation(
          item.itemId,
          item.itemType,
          data.department,
          item.quantity
        )

        if (remainingQuantity > 0) {
          throw new Error(`Insufficient stock for ${item.itemId}. Missing: ${remainingQuantity}`)
        }

        // Calculate cost
        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: item.itemType,
          itemName: item.itemId, // TODO: Get actual name from Product/Recipe store
          quantity: item.quantity,
          unit: 'kg', // TODO: Get actual unit from Product/Recipe store
          batchAllocations: allocations,
          totalCost,
          notes: item.notes
        })

        totalValue += totalCost

        // Update batches
        for (const allocation of allocations) {
          const batchIndex = this.batches.findIndex(b => b.id === allocation.batchId)
          if (batchIndex !== -1) {
            this.batches[batchIndex].currentQuantity -= allocation.quantity
            this.batches[batchIndex].totalValue =
              this.batches[batchIndex].currentQuantity * this.batches[batchIndex].costPerUnit
            this.batches[batchIndex].updatedAt = TimeUtils.getCurrentLocalISO()

            if (this.batches[batchIndex].currentQuantity <= 0) {
              this.batches[batchIndex].status = 'consumed'
              this.batches[batchIndex].isActive = false
            }
          }
        }
      }

      // Create operation
      const operation: StorageOperation = {
        id: `op-${Date.now()}`,
        operationType: 'consumption',
        documentNumber: `CON-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        consumptionDetails: data.consumptionDetails,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.push(operation)

      // Recalculate balances for affected items
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Consumption operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create consumption', { error })
      throw error
    }
  }

  // Create receipt operation
  async createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating receipt operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        // Create new batch
        const batch: StorageBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          batchNumber: generateBatchNumber(item.itemId, TimeUtils.getCurrentLocalISO()),
          itemId: item.itemId,
          itemType: item.itemType,
          department: data.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: 'kg', // TODO: Get from Product/Recipe store
          costPerUnit: item.costPerUnit,
          totalValue: item.quantity * item.costPerUnit,
          receiptDate: TimeUtils.getCurrentLocalISO(),
          expiryDate: item.expiryDate,
          sourceType: data.sourceType,
          notes: item.notes,
          status: 'active',
          isActive: true,
          createdAt: TimeUtils.getCurrentLocalISO(),
          updatedAt: TimeUtils.getCurrentLocalISO()
        }

        this.batches.push(batch)

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: item.itemType,
          itemName: item.itemId, // TODO: Get actual name
          quantity: item.quantity,
          unit: batch.unit,
          totalCost: batch.totalValue,
          averageCostPerUnit: item.costPerUnit,
          expiryDate: item.expiryDate,
          notes: item.notes
        })

        totalValue += batch.totalValue
      }

      // Create operation
      const operation: StorageOperation = {
        id: `op-${Date.now()}`,
        operationType: 'receipt',
        documentNumber: `REC-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.push(operation)

      // Recalculate balances
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Receipt operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create receipt', { error })
      throw error
    }
  }

  // Start inventory process
  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting inventory', { data })

      // Get all current balances for the department and item type
      const currentBalances = this.balances.filter(
        b => b.department === data.department && b.itemType === data.itemType
      )

      const inventoryItems = currentBalances.map(balance => ({
        id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemId: balance.itemId,
        itemType: balance.itemType,
        itemName: balance.itemName,
        systemQuantity: balance.totalQuantity,
        actualQuantity: balance.totalQuantity, // Default to system quantity
        difference: 0,
        unit: balance.unit,
        averageCost: balance.averageCost,
        valueDifference: 0,
        notes: '',
        countedBy: ''
      }))

      const inventory: InventoryDocument = {
        id: `inv-${Date.now()}`,
        documentNumber: `INV-${data.department.toUpperCase()}-${data.itemType.toUpperCase()}-${String(this.inventories.length + 1).padStart(3, '0')}`,
        inventoryDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        itemType: data.itemType,
        responsiblePerson: data.responsiblePerson,
        items: inventoryItems,
        totalItems: inventoryItems.length,
        totalDiscrepancies: 0,
        totalValueDifference: 0,
        status: 'draft',
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.inventories.push(inventory)

      DebugUtils.info(MODULE_NAME, 'Inventory started', {
        inventoryId: inventory.id,
        itemCount: inventoryItems.length
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start inventory', { error })
      throw error
    }
  }

  // Get operations for department
  async getOperations(department?: StorageDepartment): Promise<StorageOperation[]> {
    try {
      let operations = [...this.operations]

      if (department && department !== 'all') {
        operations = operations.filter(op => op.department === department)
      }

      // Sort by date (newest first)
      return operations.sort(
        (a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get operations', { error })
      throw error
    }
  }

  // Get inventories
  async getInventories(department?: StorageDepartment): Promise<InventoryDocument[]> {
    try {
      let inventories = [...this.inventories]

      if (department && department !== 'all') {
        inventories = inventories.filter(inv => inv.department === department)
      }

      return inventories.sort(
        (a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get inventories', { error })
      throw error
    }
  }

  // Get expiring items
  getExpiringItems(days: number = 3): StorageBalance[] {
    try {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + days)

      return this.balances.filter(balance => balance.hasNearExpiry || balance.hasExpired)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring items', { error })
      throw error
    }
  }

  // Get low stock items
  getLowStockItems(): StorageBalance[] {
    try {
      return this.balances.filter(balance => balance.belowMinStock)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock items', { error })
      throw error
    }
  }

  // Recalculate balances for department
  private async recalculateBalances(department: StorageDepartment): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating balances', { department })

      // Group active batches by item
      const activeBatches = this.batches.filter(
        b => b.department === department && b.status === 'active' && b.currentQuantity > 0
      )

      const itemGroups = new Map<string, StorageBatch[]>()

      for (const batch of activeBatches) {
        const key = `${batch.itemId}-${batch.itemType}`
        if (!itemGroups.has(key)) {
          itemGroups.set(key, [])
        }
        itemGroups.get(key)!.push(batch)
      }

      // Update balances
      for (const [, batches] of itemGroups) {
        const firstBatch = batches[0]
        const itemId = firstBatch.itemId
        const itemType = firstBatch.itemType

        // Calculate totals
        const totalQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0)
        const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0)
        const averageCost = totalValue / totalQuantity

        // Sort batches by date
        const sortedBatches = batches.sort(
          (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
        )

        const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit

        // Determine cost trend (simplified)
        let costTrend: 'up' | 'down' | 'stable' = 'stable'
        if (sortedBatches.length > 1) {
          const oldestCost = sortedBatches[0].costPerUnit
          if (latestCost > oldestCost * 1.05) costTrend = 'up'
          else if (latestCost < oldestCost * 0.95) costTrend = 'down'
        }

        // Update or create balance
        const existingBalanceIndex = this.balances.findIndex(
          b => b.itemId === itemId && b.itemType === itemType && b.department === department
        )

        const balance: StorageBalance = {
          itemId,
          itemType,
          itemName: itemId, // TODO: Get actual name
          department,
          totalQuantity,
          unit: firstBatch.unit,
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].receiptDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].receiptDate,
          hasExpired: false, // TODO: Check expiry logic
          hasNearExpiry: false, // TODO: Check expiry logic
          belowMinStock: totalQuantity < 2, // Simplified logic
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        if (existingBalanceIndex !== -1) {
          this.balances[existingBalanceIndex] = balance
        } else {
          this.balances.push(balance)
        }
      }

      DebugUtils.info(MODULE_NAME, 'Balances recalculated', { department })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate balances', { error })
      throw error
    }
  }
}

export const storageService = new StorageService()
