// src/stores/storage/storageService.ts - ОБНОВЛЕННАЯ ВЕРСИЯ С PRODUCTION
import { DebugUtils, TimeUtils } from '@/utils'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useStorageOperations } from './composables/useStorageOperations'
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
  CreateInventoryData,
  CreateProductionData,
  CreateConsumptionData,
  CreateReceiptData,
  ConsumptionItem,
  ReceiptItem,
  ProductionOperation,
  InventoryDocument,
  InventoryItem,
  BatchAllocation
} from './types'
import type { Preparation } from '@/stores/recipes/types'

const MODULE_NAME = 'StorageService'

export class StorageService {
  private batches: StorageBatch[] = [...mockStorageBatches]
  private operations: StorageOperation[] = [...mockStorageOperations]
  private balances: StorageBalance[] = []
  private inventories: InventoryDocument[] = []

  // ✅ НОВОЕ: Добавляем composable
  private storageOps = useStorageOperations()

  // ==========================================
  // HELPERS ДЛЯ ПОЛУЧЕНИЯ ИНФОРМАЦИИ О ТОВАРАХ
  // ==========================================

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

  private getItemInfo(itemId: string, itemType: StorageItemType) {
    if (itemType === 'product') {
      return this.getProductInfo(itemId)
    } else {
      return this.getPreparationInfo(itemId)
    }
  }

  // ==========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ==========================================

  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage service')

      const productsStore = useProductsStore()
      const recipesStore = useRecipesStore()

      if (productsStore.products.length === 0) {
        await productsStore.loadProducts(true)
      }

      if (recipesStore.preparations.length === 0) {
        await recipesStore.fetchPreparations()
      }

      await this.recalculateAllBalances()

      DebugUtils.info(MODULE_NAME, 'Storage service initialized')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize storage service', { error })
      throw error
    }
  }

  // ==========================================
  // ✅ НОВЫЕ МЕТОДЫ ПРОИЗВОДСТВА
  // ==========================================

  async createProduction(data: CreateProductionData): Promise<ProductionOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating production operation', { data })

      // Получаем рецепт полуфабриката
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find(p => p.id === data.preparationId)

      if (!preparation) {
        throw new Error('Preparation not found')
      }

      // Получаем доступные батчи для этого департамента
      const availableBatches = this.batches.filter(
        b => b.department === data.department && b.status === 'active' && b.currentQuantity > 0
      )

      // Валидируем доступность ингредиентов
      const validation = this.storageOps.validateIngredientAvailability(
        preparation,
        data.batchCount,
        availableBatches
      )

      if (!validation.valid) {
        const missing = validation.missingIngredients
          .map(ing => `${ing.name}: need ${ing.missing} ${ing.unit}`)
          .join(', ')
        throw new Error(`Insufficient ingredients: ${missing}`)
      }

      // Рассчитываем требуемые ингредиенты с FIFO
      const ingredients = this.storageOps.calculateRequiredIngredients(
        preparation,
        data.batchCount,
        availableBatches
      )

      // Создаем операцию производства
      const operation = this.storageOps.createProductionOperation(
        data,
        preparation,
        ingredients,
        this.operations.length
      )

      // Обновляем батчи - списываем ингредиенты
      for (const ingredient of ingredients) {
        this.batches = this.storageOps.updateBatchesAfterConsumption(
          this.batches,
          ingredient.batchAllocations
        )
      }

      // Добавляем новый батч полуфабриката
      this.batches.push(operation.outputBatch)

      // Добавляем операцию в историю
      this.operations.push(operation)

      // Пересчитываем балансы
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Production operation created successfully', {
        operationId: operation.id,
        outputQuantity: operation.outputBatch.currentQuantity,
        totalCost: operation.totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create production', { error })
      throw error
    }
  }

  // ✅ НОВЫЙ: Получить доступные рецепты для производства
  getAvailablePreparations(department: StorageDepartment): Preparation[] {
    try {
      const recipesStore = useRecipesStore()

      // Фильтруем рецепты, для которых есть все ингредиенты
      return recipesStore.activePreparations.filter(prep => {
        if (!prep.recipe || prep.recipe.length === 0) return false

        // Проверяем доступность ингредиентов
        const availableBatches = this.batches.filter(
          b => b.department === department && b.status === 'active' && b.currentQuantity > 0
        )

        const validation = this.storageOps.validateIngredientAvailability(
          prep,
          1, // минимум 1 порция
          availableBatches
        )

        return validation.valid
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error })
      return []
    }
  }

  // ✅ НОВЫЙ: Предварительный расчет ингредиентов для UI
  calculateProductionRequirements(
    preparationId: string,
    batchCount: number,
    department: StorageDepartment
  ): {
    isValid: boolean
    ingredients: any[]
    totalCost: number
    missingIngredients: any[]
  } {
    try {
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)

      if (!preparation) {
        throw new Error('Preparation not found')
      }

      const availableBatches = this.batches.filter(
        b => b.department === department && b.status === 'active' && b.currentQuantity > 0
      )

      // Валидация
      const validation = this.storageOps.validateIngredientAvailability(
        preparation,
        batchCount,
        availableBatches
      )

      // Расчет ингредиентов
      const ingredients = this.storageOps.calculateRequiredIngredients(
        preparation,
        batchCount,
        availableBatches
      )

      const totalCost = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0)

      return {
        isValid: validation.valid,
        ingredients,
        totalCost,
        missingIngredients: validation.missingIngredients
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate production requirements', { error })
      return {
        isValid: false,
        ingredients: [],
        totalCost: 0,
        missingIngredients: []
      }
    }
  }

  // ==========================================
  // ОСНОВНЫЕ МЕТОДЫ СКЛАДА (существующие)
  // ==========================================

  async getBalances(department?: StorageDepartment): Promise<StorageBalance[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching storage balances', { department })

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

      return batches.sort(
        (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get item batches', { error, itemId })
      throw error
    }
  }

  // FIFO calculations
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

  // ==========================================
  // INVENTORY OPERATIONS (существующие)
  // ==========================================

  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting inventory', { data })

      const currentBalances = this.balances.filter(
        b => b.department === data.department && b.itemType === data.itemType
      )

      const inventoryItems = currentBalances.map(balance => ({
        id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemId: balance.itemId,
        itemType: balance.itemType,
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

      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      const correctionOperations: StorageOperation[] = []

      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      )

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
          const { allocations } = this.calculateFifoAllocation(
            item.itemId,
            item.itemType,
            inventory.department,
            adjustmentQuantity
          )

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

      const operation: StorageOperation = {
        id: `op-adj-${Date.now()}`,
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

  // ==========================================
  // ✅ НЕДОСТАЮЩИЕ CRUD ОПЕРАЦИИ
  // ==========================================

  async createConsumption(data: CreateConsumptionData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating consumption operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const itemInfo = this.getItemInfo(item.itemId, item.itemType)

        // Calculate FIFO allocation
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

  async createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating receipt operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
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

  // ==========================================
  // DATA ACCESS METHODS
  // ==========================================

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

  // ✅ НОВЫЙ: Получить операции производства
  async getProductionOperations(department?: StorageDepartment): Promise<ProductionOperation[]> {
    try {
      let operations = this.operations.filter(
        op => op.operationType === 'production'
      ) as ProductionOperation[]

      if (department && department !== 'all') {
        operations = operations.filter(op => op.department === department)
      }

      return operations.sort(
        (a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get production operations', { error })
      throw error
    }
  }

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

  getLowStockItems(): StorageBalance[] {
    try {
      return this.balances.filter(balance => balance.belowMinStock)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock items', { error })
      throw error
    }
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private async recalculateAllBalances(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating all balances')

      this.balances = []

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

  private async recalculateBalances(department: StorageDepartment): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating balances', { department })

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
        const itemType = firstBatch.itemType

        const itemInfo = this.getItemInfo(itemId, itemType)

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

        const minStock = itemType === 'product' ? (itemInfo as any).minStock || 1 : 0.5
        const belowMinStock = totalQuantity < minStock

        // ✅ НОВОЕ: Используем composable для расчета срока годности
        const expiryInfo = this.storageOps.calculateExpiryInfo(sortedBatches)

        const balance: StorageBalance = {
          itemId,
          itemType,
          itemName: itemInfo.name,
          department,
          totalQuantity,
          unit: itemInfo.unit,
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].receiptDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].receiptDate,
          expiryInfo, // ✅ НОВОЕ: добавляем информацию о сроке годности
          hasExpired: expiryInfo.hasExpired,
          hasNearExpiry: expiryInfo.hasNearExpiry,
          belowMinStock,
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        this.balances = this.balances.filter(
          b => !(b.itemId === itemId && b.itemType === itemType && b.department === department)
        )

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
