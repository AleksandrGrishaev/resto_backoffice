// src/stores/storage/storageService.ts - COMPLETE IMPLEMENTATION
import { DebugUtils, TimeUtils } from '@/utils'
import { useProductsStore } from '@/stores/productsStore'
import {
  mockStorageBatches,
  mockStorageOperations,
  mockStorageBalances,
  generateBatchNumber,
  calculateFifoAllocation
} from './storageMock'

// ✅ FIXED: Separate type and function imports
import type {
  StorageBatch,
  StorageOperation,
  StorageBalance,
  StorageDepartment,
  CreateReceiptData,
  CreateWriteOffData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryDocument,
  InventoryItem,
  BatchAllocation,
  WriteOffStatistics
} from './types'

// ✅ FIXED: Import function separately (not as type)
import { doesWriteOffAffectKPI } from './types'

const MODULE_NAME = 'StorageService'

export class StorageService {
  private batches: StorageBatch[] = [...mockStorageBatches]
  private operations: StorageOperation[] = [...mockStorageOperations]
  private balances: StorageBalance[] = []
  private inventories: InventoryDocument[] = []

  // ===========================
  // HELPER METHODS
  // ===========================

  private getProductInfo(productId: string) {
    try {
      const productsStore = useProductsStore()
      const product = productsStore.products.find(p => p.id === productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, 'Product not found', { productId })
        return {
          name: productId,
          unit: 'kg',
          costPerUnit: 0,
          minStock: 0,
          shelfLife: 7
        }
      }

      return {
        name: product.name,
        unit: product.unit,
        costPerUnit: product.costPerUnit,
        minStock: product.minStock || 0,
        shelfLife: product.shelfLife || 7
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product info', { error, productId })
      return {
        name: productId,
        unit: 'kg',
        costPerUnit: 0,
        minStock: 0,
        shelfLife: 7
      }
    }
  }

  // ===========================
  // INITIALIZATION
  // ===========================

  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage service for products')

      const productsStore = useProductsStore()

      if (productsStore.products.length === 0) {
        await productsStore.loadProducts(true)
      }

      await this.recalculateAllBalances()

      DebugUtils.info(MODULE_NAME, 'Storage service initialized for products')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize storage service', { error })
      throw error
    }
  }

  // ===========================
  // BASIC OPERATIONS
  // ===========================

  async getBalances(department?: StorageDepartment): Promise<StorageBalance[]> {
    try {
      if (this.balances.length === 0) {
        await this.recalculateAllBalances()
      }

      let balances = [...this.balances]

      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }

      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch product balances', { error })
      throw error
    }
  }

  async getBalance(itemId: string, department: StorageDepartment): Promise<StorageBalance | null> {
    try {
      const balance = this.balances.find(
        b => b.itemId === itemId && b.itemType === 'product' && b.department === department
      )
      return balance || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get product balance', { error, itemId })
      throw error
    }
  }

  async getItemBatches(itemId: string, department: StorageDepartment): Promise<StorageBatch[]> {
    try {
      const batches = this.batches.filter(
        b =>
          b.itemId === itemId &&
          b.itemType === 'product' &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      return batches.sort(
        (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get product batches', { error, itemId })
      throw error
    }
  }

  // ===========================
  // FIFO CALCULATIONS
  // ===========================

  calculateFifoAllocation(
    itemId: string,
    department: StorageDepartment,
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    try {
      const batches = this.batches.filter(
        b =>
          b.itemId === itemId &&
          b.itemType === 'product' &&
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

  calculateCorrectionCost(itemId: string, department: StorageDepartment, quantity: number): number {
    try {
      const { allocations } = this.calculateFifoAllocation(itemId, department, quantity)
      return allocations.reduce(
        (total, allocation) => total + allocation.quantity * allocation.costPerUnit,
        0
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate correction cost', { error })
      throw error
    }
  }

  // ===========================
  // RECEIPT OPERATIONS
  // ===========================

  async createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating product receipt operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = this.getProductInfo(item.itemId)

        const batch: StorageBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          batchNumber: generateBatchNumber(productInfo.name, TimeUtils.getCurrentLocalISO()),
          itemId: item.itemId,
          itemType: 'product',
          department: data.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: productInfo.unit,
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
          itemType: 'product',
          itemName: productInfo.name,
          quantity: item.quantity,
          unit: batch.unit,
          totalCost: batch.totalValue,
          averageCostPerUnit: item.costPerUnit,
          expiryDate: item.expiryDate,
          notes: item.notes
        })

        totalValue += batch.totalValue
      }

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
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Product receipt operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create product receipt', { error })
      throw error
    }
  }

  // ===========================
  // CORRECTION OPERATIONS
  // ===========================

  async createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating product correction operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = this.getProductInfo(item.itemId)

        if (item.quantity > 0) {
          // Positive correction (surplus) - create new batch
          const batch: StorageBatch = {
            id: `batch-corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            batchNumber: generateBatchNumber(productInfo.name, TimeUtils.getCurrentLocalISO()),
            itemId: item.itemId,
            itemType: 'product',
            department: data.department,
            initialQuantity: item.quantity,
            currentQuantity: item.quantity,
            unit: productInfo.unit,
            costPerUnit: productInfo.costPerUnit,
            totalValue: item.quantity * productInfo.costPerUnit,
            receiptDate: TimeUtils.getCurrentLocalISO(),
            sourceType: 'correction',
            notes: `Correction surplus: ${item.notes || ''}`,
            status: 'active',
            isActive: true,
            createdAt: TimeUtils.getCurrentLocalISO(),
            updatedAt: TimeUtils.getCurrentLocalISO()
          }

          this.batches.push(batch)
          totalValue += batch.totalValue
        } else {
          // Negative correction (shortage) - write off from existing batches
          const positiveQuantity = Math.abs(item.quantity)
          const { allocations, remainingQuantity } = this.calculateFifoAllocation(
            item.itemId,
            data.department,
            positiveQuantity
          )

          if (remainingQuantity > 0) {
            throw new Error(
              `Insufficient stock for correction of ${productInfo.name}. Missing: ${remainingQuantity} ${productInfo.unit}`
            )
          }

          const totalCost = allocations.reduce(
            (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
            0
          )

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

          totalValue += totalCost
        }

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: 'product',
          itemName: productInfo.name,
          quantity: Math.abs(item.quantity),
          unit: productInfo.unit,
          totalCost: Math.abs(item.quantity) * productInfo.costPerUnit,
          notes: item.notes
        })
      }

      const operation: StorageOperation = {
        id: `op-${Date.now()}`,
        operationType: 'correction',
        documentNumber: `COR-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        correctionDetails: data.correctionDetails,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.push(operation)
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Product correction operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create product correction', { error })
      throw error
    }
  }

  // ===========================
  // ✅ WRITE-OFF OPERATIONS (for useWriteOff composable)
  // ===========================

  async createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating product write-off operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = this.getProductInfo(item.itemId)

        const { allocations, remainingQuantity } = this.calculateFifoAllocation(
          item.itemId,
          data.department,
          item.quantity
        )

        if (remainingQuantity > 0) {
          throw new Error(
            `Insufficient stock for ${productInfo.name}. Missing: ${remainingQuantity} ${productInfo.unit}`
          )
        }

        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: 'product',
          itemName: productInfo.name,
          quantity: item.quantity,
          unit: productInfo.unit,
          batchAllocations: allocations,
          totalCost,
          notes: item.notes
        })

        totalValue += totalCost

        // Update batches (reduce stock)
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

      const operation: StorageOperation = {
        id: `op-${Date.now()}`,
        operationType: 'write_off',
        documentNumber: `WR-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        writeOffDetails: {
          reason: data.reason,
          affectsKPI: doesWriteOffAffectKPI(data.reason), // ✅ FIXED: Now function is properly imported
          notes: data.notes
        },
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.push(operation)
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Product write-off operation created', {
        operationId: operation.id,
        reason: data.reason,
        affectsKPI: doesWriteOffAffectKPI(data.reason),
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create product write-off', { error })
      throw error
    }
  }

  getWriteOffStatistics(
    department?: StorageDepartment,
    dateFrom?: string,
    dateTo?: string
  ): WriteOffStatistics {
    try {
      let writeOffOps = this.operations.filter(op => op.operationType === 'write_off')

      if (department && department !== 'all') {
        writeOffOps = writeOffOps.filter(op => op.department === department)
      }

      if (dateFrom) {
        writeOffOps = writeOffOps.filter(op => op.operationDate >= dateFrom)
      }
      if (dateTo) {
        writeOffOps = writeOffOps.filter(op => op.operationDate <= dateTo)
      }

      const stats: WriteOffStatistics = {
        total: { count: 0, value: 0 },
        kpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            expired: { count: 0, value: 0 },
            spoiled: { count: 0, value: 0 },
            other: { count: 0, value: 0 }
          }
        },
        nonKpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            education: { count: 0, value: 0 },
            test: { count: 0, value: 0 }
          }
        },
        byDepartment: {
          kitchen: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 },
          bar: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 }
        }
      }

      writeOffOps.forEach(op => {
        const value = op.totalValue || 0
        const reason = op.writeOffDetails?.reason
        const affectsKPI = op.writeOffDetails?.affectsKPI || false

        stats.total.count += 1
        stats.total.value += value

        if (affectsKPI && reason) {
          stats.kpiAffecting.count += 1
          stats.kpiAffecting.value += value

          if (reason in stats.kpiAffecting.reasons) {
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].count += 1
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].value +=
              value
          }
        } else if (!affectsKPI && reason) {
          stats.nonKpiAffecting.count += 1
          stats.nonKpiAffecting.value += value

          if (reason in stats.nonKpiAffecting.reasons) {
            stats.nonKpiAffecting.reasons[
              reason as keyof typeof stats.nonKpiAffecting.reasons
            ].count += 1
            stats.nonKpiAffecting.reasons[
              reason as keyof typeof stats.nonKpiAffecting.reasons
            ].value += value
          }
        }

        const dept = op.department
        stats.byDepartment[dept].total += value
        if (affectsKPI) {
          stats.byDepartment[dept].kpiAffecting += value
        } else {
          stats.byDepartment[dept].nonKpiAffecting += value
        }
      })

      return stats
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off statistics', { error })
      throw error
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      const currentBalances = this.balances.filter(
        b => b.department === data.department && b.itemType === 'product'
      )

      const inventoryItems = currentBalances.map(balance => ({
        id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemId: balance.itemId,
        itemType: 'product' as const,
        itemName: balance.itemName,
        systemQuantity: balance.totalQuantity,
        actualQuantity: balance.totalQuantity,
        difference: 0,
        unit: balance.unit,
        averageCost: balance.averageCost,
        valueDifference: 0,
        notes: '',
        countedBy: ''
      }))

      const inventory: InventoryDocument = {
        id: `inv-${Date.now()}`,
        documentNumber: `INV-${data.department.toUpperCase()}-PROD-${String(this.inventories.length + 1).padStart(3, '0')}`,
        inventoryDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        itemType: 'product',
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
      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start product inventory', { error })
      throw error
    }
  }

  async updateInventory(inventoryId: string, items: InventoryItem[]): Promise<InventoryDocument> {
    try {
      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      inventory.items = items.map(item => ({
        ...item,
        difference: item.actualQuantity - item.systemQuantity,
        valueDifference: (item.actualQuantity - item.systemQuantity) * item.averageCost
      }))

      inventory.totalDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      ).length

      inventory.totalValueDifference = inventory.items.reduce(
        (sum, item) => sum + item.valueDifference,
        0
      )

      inventory.updatedAt = TimeUtils.getCurrentLocalISO()
      this.inventories[inventoryIndex] = inventory

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product inventory', { error, inventoryId })
      throw error
    }
  }

  async finalizeInventory(inventoryId: string): Promise<StorageOperation[]> {
    try {
      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      const correctionOperations: StorageOperation[] = []
      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      )

      if (itemsWithDiscrepancies.length > 0) {
        const correctionData: CreateCorrectionData = {
          department: inventory.department,
          responsiblePerson: inventory.responsiblePerson,
          items: itemsWithDiscrepancies.map(item => ({
            itemId: item.itemId,
            itemType: 'product',
            quantity: item.difference,
            notes: `Inventory adjustment: ${item.notes || 'No specific reason'}`
          })),
          correctionDetails: {
            reason: 'other',
            relatedId: inventory.id,
            relatedName: `Inventory ${inventory.documentNumber}`
          },
          notes: `Inventory corrections from ${inventory.documentNumber}`
        }

        const correctionOperation = await this.createCorrection(correctionData)
        correctionOperations.push(correctionOperation)
      }

      this.inventories[inventoryIndex] = inventory
      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize product inventory', { error, inventoryId })
      throw error
    }
  }

  // ===========================
  // DATA RETRIEVAL
  // ===========================

  async getOperations(department?: StorageDepartment): Promise<StorageOperation[]> {
    try {
      let operations = [...this.operations]

      if (department && department !== 'all') {
        operations = operations.filter(op => op.department === department)
      }

      return operations.sort(
        (a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get operations', { error })
      throw error
    }
  }

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

  // ===========================
  // ALERT HELPERS
  // ===========================

  getExpiringItems(days: number = 3): StorageBalance[] {
    try {
      return this.balances.filter(balance => balance.hasNearExpiry || balance.hasExpired)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring products', { error })
      throw error
    }
  }

  getLowStockItems(): StorageBalance[] {
    try {
      return this.balances.filter(balance => balance.belowMinStock)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock products', { error })
      throw error
    }
  }

  // ===========================
  // PRIVATE BALANCE CALCULATION
  // ===========================

  private async recalculateAllBalances(): Promise<void> {
    try {
      this.balances = []
      await this.recalculateBalances('kitchen')
      await this.recalculateBalances('bar')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate all balances', { error })
      throw error
    }
  }

  private async recalculateBalances(department: StorageDepartment): Promise<void> {
    try {
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

      for (const [, batches] of itemGroups) {
        const firstBatch = batches[0]
        const itemId = firstBatch.itemId
        const productInfo = this.getProductInfo(itemId)

        const totalQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0)
        const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0)
        const averageCost = totalValue / totalQuantity

        const sortedBatches = batches.sort(
          (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
        )

        const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit

        let costTrend: 'up' | 'down' | 'stable' = 'stable'
        if (sortedBatches.length > 1) {
          const oldestCost = sortedBatches[0].costPerUnit
          if (latestCost > oldestCost * 1.05) costTrend = 'up'
          else if (latestCost < oldestCost * 0.95) costTrend = 'down'
        }

        const minStock = productInfo.minStock || 1
        const belowMinStock = totalQuantity < minStock

        const now = new Date()
        const hasExpired = sortedBatches.some(batch => {
          if (!batch.expiryDate) return false
          return new Date(batch.expiryDate) < now
        })

        const hasNearExpiry = sortedBatches.some(batch => {
          if (!batch.expiryDate) return false
          const expiry = new Date(batch.expiryDate)
          const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays <= 3 && diffDays > 0
        })

        const balance: StorageBalance = {
          itemId,
          itemType: 'product',
          itemName: productInfo.name,
          department,
          totalQuantity,
          unit: productInfo.unit,
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].receiptDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].receiptDate,
          hasExpired,
          hasNearExpiry,
          belowMinStock,
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        // Remove old balance for this product if exists
        this.balances = this.balances.filter(
          b => !(b.itemId === itemId && b.itemType === 'product' && b.department === department)
        )

        // Add new balance
        this.balances.push(balance)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate product balances', { error })
      throw error
    }
  }
}

export const storageService = new StorageService()
