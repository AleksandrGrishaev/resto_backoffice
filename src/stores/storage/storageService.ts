// src/stores/storage/storageService.ts - ТОЛЬКО ПРОДУКТЫ
import { DebugUtils, TimeUtils } from '@/utils'
import { useProductsStore } from '@/stores/productsStore'
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
  CreateReceiptData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryDocument,
  InventoryItem,
  BatchAllocation
} from './types'

const MODULE_NAME = 'StorageService'

export class StorageService {
  private batches: StorageBatch[] = [...mockStorageBatches]
  private operations: StorageOperation[] = [...mockStorageOperations]
  private balances: StorageBalance[] = []
  private inventories: InventoryDocument[] = []

  // ✅ Helper для получения данных продукта
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
          shelfLife: 7,
          canBeSold: false
        }
      }

      return {
        name: product.name,
        unit: product.unit,
        costPerUnit: product.costPerUnit,
        minStock: product.minStock || 0,
        shelfLife: product.shelfLife || 7,
        canBeSold: product.canBeSold
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product info', { error, productId })
      return {
        name: productId,
        unit: 'kg',
        costPerUnit: 0,
        minStock: 0,
        shelfLife: 7,
        canBeSold: false
      }
    }
  }

  // ✅ Инициализация только с продуктами
  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage service for products only')

      // Загружаем данные продуктов
      const productsStore = useProductsStore()

      if (productsStore.products.length === 0) {
        await productsStore.loadProducts(true) // используем mock данные
      }

      // Пересчитываем балансы с правильными данными продуктов
      await this.recalculateAllBalances()

      DebugUtils.info(MODULE_NAME, 'Storage service initialized for products')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize storage service', { error })
      throw error
    }
  }

  // ===========================
  // BASIC STORAGE OPERATIONS
  // ===========================

  // Get all storage balances
  async getBalances(department?: StorageDepartment): Promise<StorageBalance[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching product balances', { department })

      // Если балансы пустые, пересчитываем
      if (this.balances.length === 0) {
        await this.recalculateAllBalances()
      }

      let balances = [...this.balances]

      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }

      DebugUtils.info(MODULE_NAME, 'Product balances fetched', { count: balances.length })
      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch product balances', { error })
      throw error
    }
  }

  // Get balance for specific product
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

  // Get all batches for product (for FIFO calculation)
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

      // Sort by receipt date (FIFO - oldest first)
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

  // Calculate FIFO allocation for operations
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

  // Calculate correction cost based on FIFO
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
        // ✅ Получаем правильную информацию о продукте
        const productInfo = this.getProductInfo(item.itemId)

        // Create new batch
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
        // ✅ Получаем правильную информацию о продукте
        const productInfo = this.getProductInfo(item.itemId)

        // Calculate FIFO allocation for correction
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

        // Calculate cost
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

      // Create operation
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

      // Recalculate balances for affected items
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
  // INVENTORY OPERATIONS
  // ===========================

  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting product inventory', { data })

      // Get all current balances for the department (products only)
      const currentBalances = this.balances.filter(
        b => b.department === data.department && b.itemType === 'product'
      )

      const inventoryItems = currentBalances.map(balance => ({
        id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemId: balance.itemId,
        itemType: 'product' as const,
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

      DebugUtils.info(MODULE_NAME, 'Product inventory started', {
        inventoryId: inventory.id,
        itemCount: inventoryItems.length
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start product inventory', { error })
      throw error
    }
  }

  async updateInventory(inventoryId: string, items: InventoryItem[]): Promise<InventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating product inventory', {
        inventoryId,
        itemCount: items.length
      })

      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      // Update items in inventory
      inventory.items = items.map(item => ({
        ...item,
        // Recalculate difference and value difference
        difference: item.actualQuantity - item.systemQuantity,
        valueDifference: (item.actualQuantity - item.systemQuantity) * item.averageCost
      }))

      // Recalculate totals
      inventory.totalDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      ).length

      inventory.totalValueDifference = inventory.items.reduce(
        (sum, item) => sum + item.valueDifference,
        0
      )

      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      // Update in array
      this.inventories[inventoryIndex] = inventory

      DebugUtils.info(MODULE_NAME, 'Product inventory updated successfully', {
        inventoryId,
        totalDiscrepancies: inventory.totalDiscrepancies,
        totalValueDifference: inventory.totalValueDifference
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product inventory', { error, inventoryId })
      throw error
    }
  }

  async finalizeInventory(inventoryId: string): Promise<StorageOperation[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Finalizing product inventory', { inventoryId })

      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      // Change status to confirmed
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      const correctionOperations: StorageOperation[] = []

      // Create correction operations for discrepancies
      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      )

      if (itemsWithDiscrepancies.length > 0) {
        // Group by operation type (positive and negative adjustments)
        const positiveAdjustments = itemsWithDiscrepancies.filter(item => item.difference > 0)
        const negativeAdjustments = itemsWithDiscrepancies.filter(item => item.difference < 0)

        // Create receipt operation for surpluses
        if (positiveAdjustments.length > 0) {
          const receiptOperation = await this.createInventoryAdjustment(
            inventory,
            positiveAdjustments,
            'receipt'
          )
          correctionOperations.push(receiptOperation)
        }

        // Create correction operation for shortages
        if (negativeAdjustments.length > 0) {
          const correctionOperation = await this.createInventoryAdjustment(
            inventory,
            negativeAdjustments,
            'correction'
          )
          correctionOperations.push(correctionOperation)
        }
      }

      // Update inventory
      this.inventories[inventoryIndex] = inventory

      DebugUtils.info(MODULE_NAME, 'Product inventory finalized successfully', {
        inventoryId,
        correctionOperations: correctionOperations.length,
        discrepancies: itemsWithDiscrepancies.length
      })

      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize product inventory', { error, inventoryId })
      throw error
    }
  }

  // ✅ Helper для создания корректирующих операций
  private async createInventoryAdjustment(
    inventory: InventoryDocument,
    items: InventoryItem[],
    operationType: 'receipt' | 'correction'
  ): Promise<StorageOperation> {
    try {
      const operationItems = []
      let totalValue = 0

      for (const item of items) {
        const adjustmentQuantity = Math.abs(item.difference)
        const itemCost = adjustmentQuantity * item.averageCost

        if (operationType === 'receipt') {
          // For surpluses create new batch
          const batch: StorageBatch = {
            id: `batch-adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            batchNumber: generateBatchNumber(item.itemName, TimeUtils.getCurrentLocalISO()),
            itemId: item.itemId,
            itemType: 'product',
            department: inventory.department,
            initialQuantity: adjustmentQuantity,
            currentQuantity: adjustmentQuantity,
            unit: item.unit,
            costPerUnit: item.averageCost,
            totalValue: itemCost,
            receiptDate: TimeUtils.getCurrentLocalISO(),
            sourceType: 'inventory_adjustment',
            notes: `Inventory surplus from ${inventory.documentNumber}`,
            status: 'active',
            isActive: true,
            createdAt: TimeUtils.getCurrentLocalISO(),
            updatedAt: TimeUtils.getCurrentLocalISO()
          }

          this.batches.push(batch)
        } else {
          // For shortages write off from existing batches
          const { allocations } = this.calculateFifoAllocation(
            item.itemId,
            inventory.department,
            adjustmentQuantity
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
        }

        operationItems.push({
          id: `item-adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: 'product',
          itemName: item.itemName,
          quantity: adjustmentQuantity,
          unit: item.unit,
          totalCost: itemCost,
          averageCostPerUnit: item.averageCost,
          notes: `Inventory ${operationType === 'receipt' ? 'surplus' : 'shortage'}: ${item.difference} ${item.unit}`
        })

        totalValue += itemCost
      }

      // Create operation
      const operation: StorageOperation = {
        id: `op-adj-${Date.now()}`,
        operationType: operationType === 'receipt' ? 'receipt' : 'correction',
        documentNumber: `${operationType === 'receipt' ? 'ADJ-IN' : 'ADJ-OUT'}-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: inventory.department,
        responsiblePerson: inventory.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: `Product inventory adjustment from ${inventory.documentNumber}`,
        relatedInventoryId: inventory.id,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.push(operation)

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create inventory adjustment', { error })
      throw error
    }
  }

  // ===========================
  // DATA RETRIEVAL
  // ===========================

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

  // ===========================
  // ALERT HELPERS
  // ===========================

  // Get expiring products
  getExpiringItems(days: number = 3): StorageBalance[] {
    try {
      return this.balances.filter(balance => balance.hasNearExpiry || balance.hasExpired)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring products', { error })
      throw error
    }
  }

  // Get low stock products
  getLowStockItems(): StorageBalance[] {
    try {
      return this.balances.filter(balance => balance.belowMinStock)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock products', { error })
      throw error
    }
  }

  // ===========================
  // QUICK ACCESS HELPERS
  // ===========================

  getQuickProducts(department: StorageDepartment): any[] {
    try {
      const productsStore = useProductsStore()

      // Filter products by department (simplified logic)
      const allProducts = productsStore.rawProducts // raw products for cooking

      // Take first 10 products as "popular"
      return allProducts.slice(0, 10).map(product => ({
        id: product.id,
        name: product.name,
        unit: product.unit,
        category: product.category
      }))
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get quick products', { error })
      return []
    }
  }

  // ===========================
  // PRIVATE BALANCE CALCULATION
  // ===========================

  // ✅ Recalculate all balances
  private async recalculateAllBalances(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating all product balances')

      // Clear old balances
      this.balances = []

      // Recalculate for each department
      await this.recalculateBalances('kitchen')
      await this.recalculateBalances('bar')

      DebugUtils.info(MODULE_NAME, 'All product balances recalculated', {
        count: this.balances.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate all balances', { error })
      throw error
    }
  }

  // ✅ Recalculate balances with correct product names
  private async recalculateBalances(department: StorageDepartment): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating product balances', { department })

      // Group active batches by product
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

        // ✅ Get correct product information
        const productInfo = this.getProductInfo(itemId)

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

        // ✅ Check for low stock with correct minStock
        const minStock = productInfo.minStock || 1
        const belowMinStock = totalQuantity < minStock

        // Check for expiry warnings
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

        // Update or create balance
        const balance: StorageBalance = {
          itemId,
          itemType: 'product',
          itemName: productInfo.name, // ✅ correct name
          department,
          totalQuantity,
          unit: productInfo.unit, // ✅ correct unit
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].receiptDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].receiptDate,
          hasExpired,
          hasNearExpiry,
          belowMinStock, // ✅ correct check
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        // Remove old balance for this product if exists
        this.balances = this.balances.filter(
          b => !(b.itemId === itemId && b.itemType === 'product' && b.department === department)
        )

        // Add new balance
        this.balances.push(balance)
      }

      DebugUtils.info(MODULE_NAME, 'Product balances recalculated', { department })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate product balances', { error })
      throw error
    }
  }
}

export const storageService = new StorageService()
