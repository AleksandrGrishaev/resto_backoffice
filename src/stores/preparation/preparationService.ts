// src/stores/preparation/preparationService.ts - Адаптация StorageService для полуфабрикатов
import { DebugUtils, TimeUtils } from '@/utils'
import { useRecipesStore } from '@/stores/recipes'
import {
  mockPreparationBatches,
  mockPreparationOperations,
  mockPreparationBalances,
  generatePreparationBatchNumber,
  calculatePreparationFifoAllocation
} from './preparationMock'
import type {
  PreparationBatch,
  PreparationOperation,
  PreparationBalance,
  PreparationDepartment,
  CreatePreparationReceiptData,
  CreatePreparationConsumptionData,
  CreatePreparationCorrectionData,
  CreatePreparationInventoryData,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  BatchAllocation
} from './types'

const MODULE_NAME = 'PreparationService'

export class PreparationService {
  private batches: PreparationBatch[] = [...mockPreparationBatches]
  private operations: PreparationOperation[] = [...mockPreparationOperations]
  private balances: PreparationBalance[] = []
  private inventories: PreparationInventoryDocument[] = []

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

  // ✅ Инициализация
  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing preparation service')

      // Загружаем данные из recipes store
      const recipesStore = useRecipesStore()

      if (recipesStore.preparations.length === 0) {
        await recipesStore.fetchPreparations()
      }

      // Пересчитываем балансы с правильными данными
      await this.recalculateAllBalances()

      DebugUtils.info(MODULE_NAME, 'Preparation service initialized')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize preparation service', { error })
      throw error
    }
  }

  // ===========================
  // BASIC PREPARATION OPERATIONS
  // ===========================

  // Get all preparation balances
  async getBalances(department?: PreparationDepartment): Promise<PreparationBalance[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching preparation balances', { department })

      // Если балансы пустые, пересчитываем
      if (this.balances.length === 0) {
        await this.recalculateAllBalances()
      }

      let balances = [...this.balances]

      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }

      DebugUtils.info(MODULE_NAME, 'Preparation balances fetched', { count: balances.length })
      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch preparation balances', { error })
      throw error
    }
  }

  // Get balance for specific preparation
  async getBalance(
    preparationId: string,
    department: PreparationDepartment
  ): Promise<PreparationBalance | null> {
    try {
      const balance = this.balances.find(
        b => b.preparationId === preparationId && b.department === department
      )
      return balance || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get balance', { error, preparationId })
      throw error
    }
  }

  // Get all batches for preparation (for FIFO calculation)
  async getPreparationBatches(
    preparationId: string,
    department: PreparationDepartment
  ): Promise<PreparationBatch[]> {
    try {
      const batches = this.batches.filter(
        b =>
          b.preparationId === preparationId &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      // Sort by production date (FIFO - oldest first)
      return batches.sort(
        (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation batches', { error, preparationId })
      throw error
    }
  }

  // ===========================
  // FIFO CALCULATIONS
  // ===========================

  // Calculate FIFO allocation for operations
  calculateFifoAllocation(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    try {
      const batches = this.batches.filter(
        b =>
          b.preparationId === preparationId &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      return calculatePreparationFifoAllocation(batches, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  // Calculate consumption cost based on FIFO
  calculateConsumptionCost(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): number {
    try {
      const { allocations } = this.calculateFifoAllocation(preparationId, department, quantity)

      return allocations.reduce(
        (total, allocation) => total + allocation.quantity * allocation.costPerUnit,
        0
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate consumption cost', { error })
      throw error
    }
  }

  // ===========================
  // RECEIPT OPERATIONS
  // ===========================

  async createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation receipt operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        // Create new batch
        const batch: PreparationBatch = {
          id: `prep-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          batchNumber: generatePreparationBatchNumber(
            preparationInfo.name,
            TimeUtils.getCurrentLocalISO()
          ),
          preparationId: item.preparationId,
          department: data.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: preparationInfo.unit,
          costPerUnit: item.costPerUnit,
          totalValue: item.quantity * item.costPerUnit,
          productionDate: TimeUtils.getCurrentLocalISO(),
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
          id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
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
      const operation: PreparationOperation = {
        id: `prep-op-${Date.now()}`,
        operationType: 'receipt',
        documentNumber: `PREP-REC-${String(this.operations.length + 1).padStart(3, '0')}`,
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

      DebugUtils.info(MODULE_NAME, 'Preparation receipt operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation receipt', { error })
      throw error
    }
  }

  // ===========================
  // CONSUMPTION OPERATIONS
  // ===========================

  async createConsumption(data: CreatePreparationConsumptionData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation consumption operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        // Calculate FIFO allocation
        const { allocations, remainingQuantity } = this.calculateFifoAllocation(
          item.preparationId,
          data.department,
          item.quantity
        )

        if (remainingQuantity > 0) {
          throw new Error(
            `Insufficient stock for ${preparationInfo.name}. Missing: ${remainingQuantity} ${preparationInfo.unit}`
          )
        }

        // Calculate cost
        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
          quantity: item.quantity,
          unit: preparationInfo.unit,
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
      const operation: PreparationOperation = {
        id: `prep-op-${Date.now()}`,
        operationType: 'consumption',
        documentNumber: `PREP-CON-${String(this.operations.length + 1).padStart(3, '0')}`,
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

      // Recalculate balances
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation consumption operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation consumption', { error })
      throw error
    }
  }

  // ===========================
  // CORRECTION OPERATIONS
  // ===========================

  async createCorrection(data: CreatePreparationCorrectionData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation correction operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        // Calculate FIFO allocation for correction
        const { allocations, remainingQuantity } = this.calculateFifoAllocation(
          item.preparationId,
          data.department,
          item.quantity
        )

        if (remainingQuantity > 0) {
          throw new Error(
            `Insufficient stock for ${preparationInfo.name}. Missing: ${remainingQuantity} ${preparationInfo.unit}`
          )
        }

        // Calculate cost
        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
          quantity: item.quantity,
          unit: preparationInfo.unit,
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
      const operation: PreparationOperation = {
        id: `prep-op-${Date.now()}`,
        operationType: 'correction',
        documentNumber: `PREP-COR-${String(this.operations.length + 1).padStart(3, '0')}`,
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

      DebugUtils.info(MODULE_NAME, 'Preparation correction operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation correction', { error })
      throw error
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async startInventory(
    data: CreatePreparationInventoryData
  ): Promise<PreparationInventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting preparation inventory', { data })

      // Get all current balances for the department
      const currentBalances = this.balances.filter(b => b.department === data.department)

      const inventoryItems = currentBalances.map(balance => ({
        id: `prep-inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        preparationId: balance.preparationId,
        preparationName: balance.preparationName,
        systemQuantity: balance.totalQuantity,
        actualQuantity: balance.totalQuantity, // Default to system quantity
        difference: 0,
        unit: balance.unit,
        averageCost: balance.averageCost,
        valueDifference: 0,
        notes: '',
        countedBy: ''
      }))

      const inventory: PreparationInventoryDocument = {
        id: `prep-inv-${Date.now()}`,
        documentNumber: `INV-PREP-${data.department.toUpperCase()}-${String(this.inventories.length + 1).padStart(3, '0')}`,
        inventoryDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
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

      DebugUtils.info(MODULE_NAME, 'Preparation inventory started', {
        inventoryId: inventory.id,
        itemCount: inventoryItems.length
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start preparation inventory', { error })
      throw error
    }
  }

  async updateInventory(
    inventoryId: string,
    items: PreparationInventoryItem[]
  ): Promise<PreparationInventoryDocument> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating preparation inventory', {
        inventoryId,
        itemCount: items.length
      })

      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Preparation inventory not found')
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

      DebugUtils.info(MODULE_NAME, 'Preparation inventory updated successfully', {
        inventoryId,
        totalDiscrepancies: inventory.totalDiscrepancies,
        totalValueDifference: inventory.totalValueDifference
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update preparation inventory', {
        error,
        inventoryId
      })
      throw error
    }
  }

  async finalizeInventory(inventoryId: string): Promise<PreparationOperation[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Finalizing preparation inventory', { inventoryId })

      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Preparation inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      // Change status to confirmed
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      const correctionOperations: PreparationOperation[] = []

      // Create correction operations for discrepancies
      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      )

      if (itemsWithDiscrepancies.length > 0) {
        // Group by operation type (positive and negative adjustments)
        const positiveAdjustments = itemsWithDiscrepancies.filter(item => item.difference > 0)
        const negativeAdjustments = itemsWithDiscrepancies.filter(item => item.difference < 0)

        // Create receipt operation for surplus
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

      DebugUtils.info(MODULE_NAME, 'Preparation inventory finalized successfully', {
        inventoryId,
        correctionOperations: correctionOperations.length,
        discrepancies: itemsWithDiscrepancies.length
      })

      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize preparation inventory', {
        error,
        inventoryId
      })
      throw error
    }
  }

  // ✅ Helper для создания корректирующих операций
  private async createInventoryAdjustment(
    inventory: PreparationInventoryDocument,
    items: PreparationInventoryItem[],
    operationType: 'receipt' | 'correction'
  ): Promise<PreparationOperation> {
    try {
      const operationItems = []
      let totalValue = 0

      for (const item of items) {
        const adjustmentQuantity = Math.abs(item.difference)
        const itemCost = adjustmentQuantity * item.averageCost

        if (operationType === 'receipt') {
          // For surplus create new batch
          const batch: PreparationBatch = {
            id: `prep-batch-adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            batchNumber: generatePreparationBatchNumber(
              item.preparationName,
              TimeUtils.getCurrentLocalISO()
            ),
            preparationId: item.preparationId,
            department: inventory.department,
            initialQuantity: adjustmentQuantity,
            currentQuantity: adjustmentQuantity,
            unit: item.unit,
            costPerUnit: item.averageCost,
            totalValue: itemCost,
            productionDate: TimeUtils.getCurrentLocalISO(),
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
            item.preparationId,
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
          id: `prep-item-adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preparationId: item.preparationId,
          preparationName: item.preparationName,
          quantity: adjustmentQuantity,
          unit: item.unit,
          totalCost: itemCost,
          averageCostPerUnit: item.averageCost,
          notes: `Inventory ${operationType === 'receipt' ? 'surplus' : 'shortage'}: ${item.difference} ${item.unit}`
        })

        totalValue += itemCost
      }

      // Create operation
      const operation: PreparationOperation = {
        id: `prep-op-adj-${Date.now()}`,
        operationType: operationType === 'receipt' ? 'receipt' : 'correction',
        documentNumber: `PREP-${operationType === 'receipt' ? 'ADJ-IN' : 'ADJ-OUT'}-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: inventory.department,
        responsiblePerson: inventory.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: `Preparation inventory adjustment from ${inventory.documentNumber}`,
        relatedInventoryId: inventory.id,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.push(operation)

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation inventory adjustment', { error })
      throw error
    }
  }

  // ===========================
  // DATA RETRIEVAL
  // ===========================

  // Get operations for department
  async getOperations(department?: PreparationDepartment): Promise<PreparationOperation[]> {
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
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation operations', { error })
      throw error
    }
  }

  // Get inventories
  async getInventories(
    department?: PreparationDepartment
  ): Promise<PreparationInventoryDocument[]> {
    try {
      let inventories = [...this.inventories]

      if (department && department !== 'all') {
        inventories = inventories.filter(inv => inv.department === department)
      }

      return inventories.sort(
        (a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation inventories', { error })
      throw error
    }
  }

  // ===========================
  // ALERT HELPERS
  // ===========================

  // Get expiring preparations
  getExpiringPreparations(days: number = 1): PreparationBalance[] {
    try {
      return this.balances.filter(balance => balance.hasNearExpiry || balance.hasExpired)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring preparations', { error })
      throw error
    }
  }

  // Get low stock preparations
  getLowStockPreparations(): PreparationBalance[] {
    try {
      return this.balances.filter(balance => balance.belowMinStock)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock preparations', { error })
      throw error
    }
  }

  // ===========================
  // QUICK ACCESS HELPERS
  // ===========================

  getQuickPreparations(department: PreparationDepartment): any[] {
    try {
      const recipesStore = useRecipesStore()

      // Take first 10 preparations as "popular"
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
      DebugUtils.info(MODULE_NAME, 'Recalculating all preparation balances')

      // Clear old balances
      this.balances = []

      // Recalculate for each department
      await this.recalculateBalances('kitchen')
      await this.recalculateBalances('bar')

      DebugUtils.info(MODULE_NAME, 'All preparation balances recalculated', {
        count: this.balances.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate all preparation balances', { error })
      throw error
    }
  }

  // ✅ Recalculate balances с правильными названиями
  private async recalculateBalances(department: PreparationDepartment): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating preparation balances', { department })

      // Group active batches by preparation
      const activeBatches = this.batches.filter(
        b => b.department === department && b.status === 'active' && b.currentQuantity > 0
      )

      const preparationGroups = new Map<string, PreparationBatch[]>()

      for (const batch of activeBatches) {
        const key = batch.preparationId
        if (!preparationGroups.has(key)) {
          preparationGroups.set(key, [])
        }
        preparationGroups.get(key)!.push(batch)
      }

      // Update balances
      for (const [preparationId, batches] of preparationGroups) {
        // ✅ Get correct preparation info
        const preparationInfo = this.getPreparationInfo(preparationId)

        // Calculate totals
        const totalQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0)
        const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0)
        const averageCost = totalValue / totalQuantity

        // Sort batches by date
        const sortedBatches = batches.sort(
          (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
        )

        const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit

        // Determine cost trend (simplified)
        let costTrend: 'up' | 'down' | 'stable' = 'stable'
        if (sortedBatches.length > 1) {
          const oldestCost = sortedBatches[0].costPerUnit
          if (latestCost > oldestCost * 1.05) costTrend = 'up'
          else if (latestCost < oldestCost * 0.95) costTrend = 'down'
        }

        // ✅ Check for low stock for preparations
        const belowMinStock = totalQuantity < 200 // less than 200g/ml

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
          return diffDays <= 1 && diffDays > 0 // 1 day for preparations
        })

        // Update or create balance
        const balance: PreparationBalance = {
          preparationId,
          preparationName: preparationInfo.name, // ✅ correct name
          department,
          totalQuantity,
          unit: preparationInfo.unit, // ✅ correct unit
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].productionDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].productionDate,
          hasExpired,
          hasNearExpiry,
          belowMinStock, // ✅ correct check
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        // Remove old balance for this preparation if exists
        this.balances = this.balances.filter(
          b => !(b.preparationId === preparationId && b.department === department)
        )

        // Add new balance
        this.balances.push(balance)
      }

      DebugUtils.info(MODULE_NAME, 'Preparation balances recalculated', { department })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate preparation balances', { error })
      throw error
    }
  }
}

export const preparationService = new PreparationService()
