// src/stores/storage/services/storageDataService.ts
import { DebugUtils, TimeUtils, generateId } from '@/utils'
import { fifoCalculationService } from './fifoCalculationService'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { mockStorageBatches, mockStorageOperations, generateBatchNumber } from '../mock/mockData'
import type {
  StorageBatch,
  StorageOperation,
  StorageBalance,
  StorageDepartment,
  StorageItemType,
  InventoryDocument,
  InventoryItem,
  CreateInventoryData,
  CreateConsumptionData,
  CreateReceiptData,
  BatchAllocation
} from '../types'

const MODULE_NAME = 'StorageDataService'

/**
 * Основной сервис для работы с данными склада
 * Отвечает за: CRUD операции, работу с mock данными, базовые операции
 */
export class StorageDataService {
  private batches: StorageBatch[] = [...mockStorageBatches]
  private operations: StorageOperation[] = [...mockStorageOperations]
  private inventories: InventoryDocument[] = []

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage data service')

      // Обеспечиваем загрузку зависимых stores
      const productsStore = useProductsStore()
      const recipesStore = useRecipesStore()

      if (productsStore.products.length === 0) {
        await productsStore.loadProducts(true)
      }

      if (recipesStore.preparations.length === 0) {
        await recipesStore.fetchPreparations()
      }

      DebugUtils.info(MODULE_NAME, 'Storage data service initialized')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize storage data service', { error })
      throw error
    }
  }

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  async getBalances(department?: StorageDepartment): Promise<StorageBalance[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Calculating storage balances', { department })

      const activeBatches = this.batches.filter(
        b =>
          b.status === 'active' &&
          b.currentQuantity > 0 &&
          (!department || department === 'all' || b.department === department)
      )

      // Группируем батчи по товарам
      const itemGroups = new Map<string, StorageBatch[]>()

      for (const batch of activeBatches) {
        const key = `${batch.itemId}-${batch.itemType}-${batch.department}`
        if (!itemGroups.has(key)) {
          itemGroups.set(key, [])
        }
        itemGroups.get(key)!.push(batch)
      }

      const balances: StorageBalance[] = []

      // Создаем балансы для каждой группы
      for (const [key, batches] of itemGroups) {
        const [itemId, itemType, dept] = key.split('-')
        const itemInfo = this.getItemInfo(itemId, itemType as StorageItemType)

        const totalQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0)
        const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0)
        const averageCost = fifoCalculationService.calculateAverageCost(batches)
        const costTrend = fifoCalculationService.calculateCostTrend(batches)
        const expiryInfo = fifoCalculationService.calculateExpiryInfo(batches)

        const sortedBatches = batches.sort(
          (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
        )

        const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit
        const minStock = this.getMinStockLevel(itemId, itemType as StorageItemType)

        const balance: StorageBalance = {
          itemId,
          itemType: itemType as StorageItemType,
          itemName: itemInfo.name,
          department: dept as StorageDepartment,
          totalQuantity,
          unit: itemInfo.unit,
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].receiptDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].receiptDate,
          expiryInfo,
          hasExpired: expiryInfo.hasExpired,
          hasNearExpiry: expiryInfo.hasNearExpiry,
          belowMinStock: totalQuantity < minStock,
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        balances.push(balance)
      }

      DebugUtils.info(MODULE_NAME, 'Storage balances calculated', { count: balances.length })
      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get balances', { error })
      throw error
    }
  }

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

  // ==========================================
  // CREATE OPERATIONS
  // ==========================================

  async createConsumption(data: CreateConsumptionData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating consumption operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const itemInfo = this.getItemInfo(item.itemId, item.itemType)

        // Получаем батчи для этого товара
        const itemBatches = this.batches.filter(
          b =>
            b.itemId === item.itemId &&
            b.itemType === item.itemType &&
            b.department === data.department &&
            b.status === 'active' &&
            b.currentQuantity > 0
        )

        // Проверяем достаточность остатков
        const validation = fifoCalculationService.validateSufficientStock(
          itemBatches,
          item.quantity
        )
        if (!validation.sufficient) {
          throw new Error(
            `Insufficient stock for ${itemInfo.name}. Available: ${validation.availableQuantity} ${itemInfo.unit}, Required: ${item.quantity} ${itemInfo.unit}`
          )
        }

        // Рассчитываем FIFO распределение
        const { allocations } = fifoCalculationService.calculateFifoAllocation(
          itemBatches,
          item.quantity
        )
        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: generateId(),
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

        // Обновляем батчи
        this.batches = fifoCalculationService.updateBatchesAfterConsumption(
          this.batches,
          allocations
        )
      }

      // Создаем операцию
      const operation: StorageOperation = {
        id: generateId(),
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

  async createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating receipt operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const itemInfo = this.getItemInfo(item.itemId, item.itemType)

        // Создаем новый батч
        const batch: StorageBatch = {
          id: generateId(),
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
          id: generateId(),
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

      // Создаем операцию
      const operation: StorageOperation = {
        id: generateId(),
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

  // ==========================================
  // INVENTORY OPERATIONS
  // ==========================================

  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting inventory', { data })

      // Получаем текущие балансы для инвентаризации
      const currentBalances = await this.getBalances(data.department)
      const filteredBalances = currentBalances.filter(b => b.itemType === data.itemType)

      const inventoryItems: InventoryItem[] = filteredBalances.map(balance => ({
        id: generateId(),
        itemId: balance.itemId,
        itemType: balance.itemType,
        itemName: balance.itemName,
        systemQuantity: balance.totalQuantity,
        actualQuantity: balance.totalQuantity, // Начальное значение
        difference: 0,
        unit: balance.unit,
        averageCost: balance.averageCost,
        valueDifference: 0,
        notes: '',
        countedBy: ''
      }))

      const inventory: InventoryDocument = {
        id: generateId(),
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
      DebugUtils.info(MODULE_NAME, 'Updating inventory', { inventoryId })

      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      // Обновляем элементы с расчетом разниц
      inventory.items = items.map(item => ({
        ...item,
        difference: item.actualQuantity - item.systemQuantity,
        valueDifference: (item.actualQuantity - item.systemQuantity) * item.averageCost
      }))

      // Пересчитываем итоги
      inventory.totalDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      ).length

      inventory.totalValueDifference = inventory.items.reduce(
        (sum, item) => sum + item.valueDifference,
        0
      )

      inventory.updatedAt = TimeUtils.getCurrentLocalISO()
      this.inventories[inventoryIndex] = inventory

      DebugUtils.info(MODULE_NAME, 'Inventory updated', {
        inventoryId,
        discrepancies: inventory.totalDiscrepancies,
        valueDifference: inventory.totalValueDifference
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update inventory', { error })
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
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      const correctionOperations: StorageOperation[] = []
      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      )

      // Создаем корректировочные операции если есть расхождения
      if (itemsWithDiscrepancies.length > 0) {
        const positiveAdjustments = itemsWithDiscrepancies.filter(item => item.difference > 0)
        const negativeAdjustments = itemsWithDiscrepancies.filter(item => item.difference < 0)

        if (positiveAdjustments.length > 0) {
          const receiptOperation = await this.createInventoryAdjustment(
            inventory,
            positiveAdjustments,
            'receipt'
          )
          correctionOperations.push(receiptOperation)
        }

        if (negativeAdjustments.length > 0) {
          const consumptionOperation = await this.createInventoryAdjustment(
            inventory,
            negativeAdjustments,
            'consumption'
          )
          correctionOperations.push(consumptionOperation)
        }
      }

      this.inventories[inventoryIndex] = inventory

      DebugUtils.info(MODULE_NAME, 'Inventory finalized', {
        inventoryId,
        corrections: correctionOperations.length
      })

      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize inventory', { error })
      throw error
    }
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private getItemInfo(itemId: string, itemType: StorageItemType) {
    try {
      if (itemType === 'product') {
        const productsStore = useProductsStore()
        const product = productsStore.products.find(p => p.id === itemId)

        return {
          name: product?.name || itemId,
          unit: product?.unit || 'kg',
          costPerUnit: product?.costPerUnit || 0,
          minStock: product?.minStock || 1
        }
      } else {
        const recipesStore = useRecipesStore()
        const preparation = recipesStore.preparations.find(p => p.id === itemId)

        return {
          name: preparation?.name || itemId,
          unit: preparation?.outputUnit || 'gram',
          costPerUnit: preparation?.costPerPortion || 0,
          minStock: 0.5 // Default for preparations
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get item info', { error, itemId })
      return {
        name: itemId,
        unit: 'kg',
        costPerUnit: 0,
        minStock: 1
      }
    }
  }

  private getMinStockLevel(itemId: string, itemType: StorageItemType): number {
    try {
      const itemInfo = this.getItemInfo(itemId, itemType)
      return itemInfo.minStock
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get min stock level', { error })
      return itemType === 'product' ? 1 : 0.5
    }
  }

  private async createInventoryAdjustment(
    inventory: InventoryDocument,
    items: InventoryItem[],
    operationType: 'receipt' | 'consumption'
  ): Promise<StorageOperation> {
    try {
      const operationItems = []
      let totalValue = 0

      for (const item of items) {
        const adjustmentQuantity = Math.abs(item.difference)
        const itemCost = adjustmentQuantity * item.averageCost

        if (operationType === 'receipt') {
          // Создаем новый батч для излишков
          const batch: StorageBatch = {
            id: generateId(),
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
          // Списываем по FIFO для недостач
          const itemBatches = this.batches.filter(
            b =>
              b.itemId === item.itemId &&
              b.itemType === item.itemType &&
              b.department === inventory.department &&
              b.status === 'active' &&
              b.currentQuantity > 0
          )

          const { allocations } = fifoCalculationService.calculateFifoAllocation(
            itemBatches,
            adjustmentQuantity
          )

          this.batches = fifoCalculationService.updateBatchesAfterConsumption(
            this.batches,
            allocations
          )
        }

        operationItems.push({
          id: generateId(),
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

      const operation: StorageOperation = {
        id: generateId(),
        operationType,
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
}

export const storageDataService = new StorageDataService()
