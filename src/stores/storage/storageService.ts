// src/stores/storage/storageService.ts - ФИНАЛЬНАЯ ВЕРСИЯ БЕЗ CONSUMPTION
import { DebugUtils, TimeUtils } from '@/utils'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
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

  // ✅ Helper для получения данных полуфабриката
  private getPreparationInfo(preparationId: string) {
    try {
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)

      if (!preparation) {
        DebugUtils.warn(MODULE_NAME, 'Preparation not found', { preparationId })
        return {
          name: preparationId,
          unit: 'gram',
          outputQuantity: 1000,
          outputUnit: 'gram',
          costPerPortion: 0
        }
      }

      return {
        name: preparation.name,
        unit: preparation.outputUnit,
        outputQuantity: preparation.outputQuantity,
        outputUnit: preparation.outputUnit,
        costPerPortion: preparation.costPerPortion || 0
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting preparation info', { error, preparationId })
      return {
        name: preparationId,
        unit: 'gram',
        outputQuantity: 1000,
        outputUnit: 'gram',
        costPerPortion: 0
      }
    }
  }

  // ✅ Helper для получения информации о любом item
  private getItemInfo(itemId: string, itemType: StorageItemType) {
    if (itemType === 'product') {
      return this.getProductInfo(itemId)
    } else {
      return this.getPreparationInfo(itemId)
    }
  }

  // ✅ Инициализация
  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage service')

      // Загружаем данные из существующих stores
      const productsStore = useProductsStore()
      const recipesStore = useRecipesStore()

      // Если данные не загружены, загружаем их
      if (productsStore.products.length === 0) {
        await productsStore.loadProducts(true) // используем mock данные
      }

      if (recipesStore.preparations.length === 0) {
        await recipesStore.fetchPreparations()
      }

      // Пересчитываем балансы с правильными данными
      await this.recalculateAllBalances()

      DebugUtils.info(MODULE_NAME, 'Storage service initialized')
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
      DebugUtils.info(MODULE_NAME, 'Fetching storage balances', { department })

      // Если балансы пустые, пересчитываем
      if (this.balances.length === 0) {
        await this.recalculateAllBalances()
      }

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

  // ===========================
  // FIFO CALCULATIONS
  // ===========================

  // Calculate FIFO allocation for operations
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

  // Calculate correction cost based on FIFO
  calculateCorrectionCost(
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
      DebugUtils.error(MODULE_NAME, 'Failed to calculate correction cost', { error })
      throw error
    }
  }

  // ===========================
  // RECEIPT OPERATIONS
  // ===========================

  async createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating receipt operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        // ✅ Получаем правильную информацию о товаре
        const itemInfo = this.getItemInfo(item.itemId, item.itemType)

        // Create new batch
        const batch: StorageBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          batchNumber: generateBatchNumber(itemInfo.name, TimeUtils.getCurrentLocalISO()),
          itemId: item.itemId,
          itemType: item.itemType,
          department: data.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: itemInfo.unit,
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
          itemName: itemInfo.name,
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

  // ===========================
  // CORRECTION OPERATIONS
  // ===========================

  async createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating correction operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        // ✅ Получаем правильную информацию о товаре
        const itemInfo = this.getItemInfo(item.itemId, item.itemType)

        // Calculate FIFO allocation for correction
        const { allocations, remainingQuantity } = this.calculateFifoAllocation(
          item.itemId,
          item.itemType,
          data.department,
          item.quantity
        )

        if (remainingQuantity > 0) {
          throw new Error(
            `Insufficient stock for ${itemInfo.name}. Missing: ${remainingQuantity} ${itemInfo.unit}`
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
          itemType: item.itemType,
          itemName: itemInfo.name,
          quantity: item.quantity,
          unit: itemInfo.unit,
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

      DebugUtils.info(MODULE_NAME, 'Correction operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create correction', { error })
      throw error
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

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

  async updateInventory(inventoryId: string, items: InventoryItem[]): Promise<InventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating inventory', { inventoryId, itemCount: items.length })

      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      // Обновляем товары в инвентаризации
      inventory.items = items.map(item => ({
        ...item,
        // Пересчитываем разность и стоимостную разность
        difference: item.actualQuantity - item.systemQuantity,
        valueDifference: (item.actualQuantity - item.systemQuantity) * item.averageCost
      }))

      // Пересчитываем общие показатели
      inventory.totalDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      ).length

      inventory.totalValueDifference = inventory.items.reduce(
        (sum, item) => sum + item.valueDifference,
        0
      )

      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      // Обновляем в массиве
      this.inventories[inventoryIndex] = inventory

      DebugUtils.info(MODULE_NAME, 'Inventory updated successfully', {
        inventoryId,
        totalDiscrepancies: inventory.totalDiscrepancies,
        totalValueDifference: inventory.totalValueDifference
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update inventory', { error, inventoryId })
      throw error
    }
  }

  async finalizeInventory(inventoryId: string): Promise<StorageOperation[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Finalizing inventory', { inventoryId })

      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      // Изменяем статус на подтвержденный
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      const correctionOperations: StorageOperation[] = []

      // Создаем корректирующие операции для расхождений
      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      )

      if (itemsWithDiscrepancies.length > 0) {
        // Группируем по типу операции (положительные и отрицательные корректировки)
        const positiveAdjustments = itemsWithDiscrepancies.filter(item => item.difference > 0)
        const negativeAdjustments = itemsWithDiscrepancies.filter(item => item.difference < 0)

        // Создаем операцию прихода для излишков
        if (positiveAdjustments.length > 0) {
          const receiptOperation = await this.createInventoryAdjustment(
            inventory,
            positiveAdjustments,
            'receipt'
          )
          correctionOperations.push(receiptOperation)
        }

        // Создаем операцию коррекции для недостач
        if (negativeAdjustments.length > 0) {
          const correctionOperation = await this.createInventoryAdjustment(
            inventory,
            negativeAdjustments,
            'correction'
          )
          correctionOperations.push(correctionOperation)
        }
      }

      // Обновляем инвентаризацию
      this.inventories[inventoryIndex] = inventory

      DebugUtils.info(MODULE_NAME, 'Inventory finalized successfully', {
        inventoryId,
        correctionOperations: correctionOperations.length,
        discrepancies: itemsWithDiscrepancies.length
      })

      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize inventory', { error, inventoryId })
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
          // Для излишков создаем новый батч
          const batch: StorageBatch = {
            id: `batch-adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            batchNumber: generateBatchNumber(item.itemName, TimeUtils.getCurrentLocalISO()),
            itemId: item.itemId,
            itemType: item.itemType,
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
          // Для недостач списываем с существующих батчей
          const { allocations } = this.calculateFifoAllocation(
            item.itemId,
            item.itemType,
            inventory.department,
            adjustmentQuantity
          )

          // Обновляем батчи
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
          itemType: item.itemType,
          itemName: item.itemName,
          quantity: adjustmentQuantity,
          unit: item.unit,
          totalCost: itemCost,
          averageCostPerUnit: item.averageCost,
          notes: `Inventory ${operationType === 'receipt' ? 'surplus' : 'shortage'}: ${item.difference} ${item.unit}`
        })

        totalValue += itemCost
      }

      // Создаем операцию
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
        notes: `Inventory adjustment from ${inventory.documentNumber}`,
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

  // Get expiring items
  getExpiringItems(days: number = 3): StorageBalance[] {
    try {
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

  // ===========================
  // QUICK ACCESS HELPERS
  // ===========================

  getQuickProducts(department: StorageDepartment): any[] {
    try {
      const productsStore = useProductsStore()

      // Фильтруем продукты по департаменту (упрощенная логика)
      const allProducts = productsStore.rawProducts // товары для приготовления

      // Берем первые 10 продуктов как "популярные"
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

  getQuickPreparations(department: StorageDepartment): any[] {
    try {
      const recipesStore = useRecipesStore()

      // Берем первые 10 полуфабрикатов как "популярные"
      return recipesStore.activePreparations.slice(0, 10).map(prep => ({
        id: prep.id,
        name: prep.name,
        unit: prep.outputUnit,
        type: prep.type
      }))
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get quick preparations', { error })
      return []
    }
  }

  // ===========================
  // PRIVATE BALANCE CALCULATION
  // ===========================

  // ✅ Пересчет всех балансов
  private async recalculateAllBalances(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating all balances')

      // Очищаем старые балансы
      this.balances = []

      // Пересчитываем для каждого департамента
      await this.recalculateBalances('kitchen')
      await this.recalculateBalances('bar')

      DebugUtils.info(MODULE_NAME, 'All balances recalculated', {
        count: this.balances.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate all balances', { error })
      throw error
    }
  }

  // ✅ Recalculate balances с правильными названиями
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

        // ✅ Получаем правильную информацию о товаре
        const itemInfo = this.getItemInfo(itemId, itemType)

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

        // ✅ Проверка на низкий остаток с правильным minStock
        const minStock = itemType === 'product' ? (itemInfo as any).minStock || 1 : 0.5
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
          itemType,
          itemName: itemInfo.name, // ✅ правильное название
          department,
          totalQuantity,
          unit: itemInfo.unit, // ✅ правильная единица измерения
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].receiptDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].receiptDate,
          hasExpired,
          hasNearExpiry,
          belowMinStock, // ✅ правильная проверка
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        // Remove old balance for this item if exists
        this.balances = this.balances.filter(
          b => !(b.itemId === itemId && b.itemType === itemType && b.department === department)
        )

        // Add new balance
        this.balances.push(balance)
      }

      DebugUtils.info(MODULE_NAME, 'Balances recalculated', { department })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate balances', { error })
      throw error
    }
  }
}

export const storageService = new StorageService()
