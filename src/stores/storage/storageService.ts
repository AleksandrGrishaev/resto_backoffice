// src/stores/storage/storageService.ts - ОБНОВЛЕНО ДЛЯ ИСПОЛЬЗОВАНИЯ MockDataCoordinator
// Удалены собственные моки, теперь использует единый координатор с базовыми единицами

import { DebugUtils, TimeUtils } from '@/utils'
import { useProductsStore } from '@/stores/productsStore'

import type { Department } from '@/stores/productsStore/types' // ✅ ДОБАВЛЕНО
import type {
  StorageBatch,
  StorageOperation,
  StorageBalance,
  CreateReceiptData,
  CreateWriteOffData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryDocument,
  InventoryItem,
  BatchAllocation,
  WriteOffStatistics,
  Warehouse
} from './types'

import { doesWriteOffAffectKPI, DEFAULT_WAREHOUSE } from './types'

const MODULE_NAME = 'StorageService'

export class StorageService {
  private warehouses: Warehouse[] = [] // ✅ ДОБАВЛЕНО
  private activeBatches: StorageBatch[] = []
  private transitBatches: StorageBatch[] = []
  private operations: StorageOperation[] = []
  private balances: StorageBalance[] = []
  private inventories: InventoryDocument[] = []
  private initialized: boolean = false

  constructor() {
    // ✅ ДОБАВИТЬ инициализацию warehouse
    this.warehouses = [DEFAULT_WAREHOUSE]
  }

  isInitialized(): boolean {
    return this.initialized
  }
  // ===========================
  // HELPER METHODS (используют базовые единицы)
  // ===========================

  private async getProductInfo(productId: string) {
    try {
      // ✅ ИСПРАВЛЕНО: Правильный динамический импорт
      const { mockDataCoordinator } = await import('@/stores/shared/mockDataCoordinator')
      const productDef = mockDataCoordinator.getProductDefinition(productId)
      const productsStore = useProductsStore()
      const product = productsStore.products.find(p => p.id === productId)

      if (!product || !productDef) {
        DebugUtils.warn(MODULE_NAME, 'Product not found', { productId })
        return {
          name: productId,
          unit: 'gram',
          baseUnit: 'gram' as const,
          baseCostPerUnit: 0,
          minStock: 0,
          shelfLife: 7
        }
      }

      return {
        name: product.name,
        baseUnit: productDef.baseUnit,
        baseCostPerUnit: productDef.baseCostPerUnit,
        minStock: product.minStock || 0,
        shelfLife: productDef.shelfLifeDays || 7
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product info', { error, productId })
      return {
        name: productId,
        baseUnit: 'gram' as const,
        baseCostPerUnit: 0,
        minStock: 0,
        shelfLife: 7
      }
    }
  }

  // ===========================
  // INITIALIZATION - ИСПОЛЬЗУЕТ MockDataCoordinator
  // ===========================
  // ✅ ПОЛНАЯ ЗАМЕНА метода initialize
  async initialize(): Promise<void> {
    if (this.initialized) {
      DebugUtils.debug(MODULE_NAME, 'StorageService already initialized')
      return
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing StorageService with BASE UNITS...')

      // ✅ Import and load mock data
      const { mockDataCoordinator } = await import('@/stores/shared/mockDataCoordinator')
      const storageData = mockDataCoordinator.getStorageStoreData()

      // ✅ ИСПРАВЛЕНО: Разделяем батчи на active и transit
      this.activeBatches = storageData.batches.filter(b => b.status === 'active')
      this.transitBatches = storageData.batches.filter(b => b.status === 'in_transit')

      this.operations = storageData.operations
      this.balances = storageData.balances

      // ✅ Initialize warehouses (already done in constructor)
      DebugUtils.info(MODULE_NAME, 'Warehouses initialized', {
        count: this.warehouses.length,
        defaultWarehouse: this.getDefaultWarehouse().name
      })

      await this.recalculateAllBalances()

      this.initialized = true

      DebugUtils.info(MODULE_NAME, 'Storage service initialized', {
        activeBatches: this.activeBatches.length,
        transitBatches: this.transitBatches.length,
        // ✅ Детали transit батчей
        transitBatchDetails: this.transitBatches.map(b => ({
          id: b.id,
          itemId: b.itemId,
          status: b.status,
          quantity: b.currentQuantity,
          purchaseOrderId: b.purchaseOrderId
        })),
        operations: this.operations.length,
        inventories: this.inventories.length,
        balances: this.balances.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize StorageService', { error })
      throw error
    }
  }

  // ✅ НОВЫЙ МЕТОД: Загрузка данных из координатора
  private async loadDataFromCoordinator(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading data from coordinator with runtime preservation')

      const { mockDataCoordinator } = await import('@/stores/shared/mockDataCoordinator')
      const storageData = mockDataCoordinator.getStorageStoreData()

      // BEFORE: Save runtime batches (all mixed)
      // const existingRuntimeBatches = this.batches.filter(...)

      // AFTER: Save only runtime transit batches
      const existingRuntimeTransitBatches = this.transitBatches.filter(
        batch => batch.id.startsWith('transit-') && !batch.id.startsWith('transit-TEST')
      )

      DebugUtils.debug(MODULE_NAME, 'Runtime data to preserve', {
        runtimeTransitBatches: existingRuntimeTransitBatches.length,
        runtimeBatchIds: existingRuntimeTransitBatches.map(b => b.id)
      })

      // Load base data from coordinator (deep clone)
      const baseBatches = JSON.parse(JSON.stringify(storageData.batches))
      const baseOperations = JSON.parse(JSON.stringify(storageData.operations))

      // BEFORE: MERGE all batches together
      // this.batches = [...baseBatches, ...existingRuntimeBatches]

      // AFTER: Separate active and transit batches
      this.activeBatches = baseBatches.filter((b: StorageBatch) => b.status === 'active')

      this.transitBatches = [
        ...baseBatches.filter((b: StorageBatch) => b.status === 'in_transit'),
        ...existingRuntimeTransitBatches
      ]

      this.operations = baseOperations
      this.balances = JSON.parse(JSON.stringify(storageData.balances))

      DebugUtils.info(MODULE_NAME, 'Data loaded from coordinator', {
        activeBatches: this.activeBatches.length,
        transitBatches: this.transitBatches.length,
        operations: this.operations.length,
        balances: this.balances.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load data from coordinator', { error })
      throw error
    }
  }

  async reinitialize(preserveRuntimeData: boolean = true): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Force reinitializing storage service', { preserveRuntimeData })

    if (preserveRuntimeData) {
      // ✅ ИСПРАВЛЕНО: Ждем загрузку данных
      await this.loadDataFromCoordinator()
      await this.recalculateAllBalances()
    } else {
      // Полная реинициализация (потеря runtime данных)
      this.initialized = false
      this.activeBatches = [] // ✅ ИСПРАВЛЕНО
      this.transitBatches = []
      this.operations = []
      this.balances = []
      this.inventories = []
      await this.initialize()
    }
  }

  // ===========================
  // BASIC OPERATIONS
  // ===========================

  async getBalances(): Promise<StorageBalance[]> {
    // ❌ УДАЛЁН параметр department
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    if (this.balances.length === 0) {
      await this.recalculateAllBalances()
    }

    return [...this.balances] // Возвращаем ВСЕ balances без фильтрации
  }

  // ✅ ПОЛНАЯ ЗАМЕНА метода getTransitBatches
  async getTransitBatches(department?: Department | 'all'): Promise<StorageBatch[]> {
    try {
      if (!this.initialized) {
        throw new Error('StorageService not initialized. Call initialize() first.')
      }

      // ✅ ИЗМЕНЕНО: Возвращаем ВСЕ transit батчи (без фильтра по department)
      // Фильтрация будет в UI через Product.usedInDepartments
      const batches = [...this.transitBatches]

      // Sort by planned delivery date
      return batches.sort((a, b) => {
        const dateA = new Date(a.plannedDeliveryDate || a.createdAt)
        const dateB = new Date(b.plannedDeliveryDate || b.createdAt)
        return dateA.getTime() - dateB.getTime()
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get transit batches', { error, department })
      throw error
    }
  }

  // ✅ ПОЛНАЯ ЗАМЕНА метода getActiveBatches
  async getActiveBatches(department?: Department | 'all'): Promise<StorageBatch[]> {
    try {
      if (!this.initialized) {
        throw new Error('StorageService not initialized. Call initialize() first.')
      }

      // ✅ ИЗМЕНЕНО: Возвращаем ВСЕ active батчи (без фильтра по department)
      // Фильтрация будет в UI через Product.usedInDepartments
      const batches = [...this.activeBatches]

      return batches.sort(
        (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get active batches', { error, department })
      throw error
    }
  }

  // ✅ ПОЛНАЯ ЗАМЕНА метода getAllBatches
  async getAllBatches(department?: Department | 'all'): Promise<StorageBatch[]> {
    try {
      if (!this.initialized) {
        throw new Error('StorageService not initialized. Call initialize() first.')
      }

      // ✅ ИЗМЕНЕНО: Возвращаем ВСЕ батчи (без фильтра по department)
      // Combine active and transit batches
      const batches = [...this.activeBatches, ...this.transitBatches]

      return batches.sort(
        (a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get all batches', { error })
      throw error
    }
  }

  async getOperations(department?: Department | 'all'): Promise<StorageOperation[]> {
    // ✅ Параметр остаётся, но тип изменён на Department
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    if (!department || department === 'all') {
      return [...this.operations]
    }

    return this.operations.filter(op => op.department === department)
  }

  // ===========================
  // BALANCE CALCULATION - ОБНОВЛЕНО ДЛЯ БАЗОВЫХ ЕДИНИЦ
  // ===========================

  // ✅ ПОЛНАЯ ЗАМЕНА метода recalculateAllBalances
  private async recalculateAllBalances(): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Recalculating all balances...')

      const balanceMap = new Map<string, StorageBalance>()
      const productsStore = useProductsStore()

      // ✅ НОВОЕ: Сначала создаём балансы для ВСЕХ продуктов (даже без батчей)
      for (const product of productsStore.products) {
        const productInfo = await this.getProductInfo(product.id)
        if (!productInfo) continue

        const key = product.id // Один баланс на продукт

        balanceMap.set(key, {
          itemId: product.id,
          itemType: 'product',
          itemName: productInfo.name,
          totalQuantity: 0, // ✅ Начинаем с 0
          unit: productInfo.baseUnit,
          totalValue: 0,
          averageCost: productInfo.baseCostPerUnit,
          latestCost: productInfo.baseCostPerUnit,
          costTrend: 'stable',
          batches: [],
          oldestBatchDate: TimeUtils.getCurrentLocalISO(),
          newestBatchDate: TimeUtils.getCurrentLocalISO(),
          hasExpired: false,
          hasNearExpiry: false,
          belowMinStock: false,
          lastCalculated: TimeUtils.getCurrentLocalISO()
        })
      }

      // ✅ ЗАТЕМ добавляем данные из активных батчей
      for (const batch of this.activeBatches) {
        if (!batch.isActive || batch.status !== 'active') continue

        const key = batch.itemId

        if (!balanceMap.has(key)) {
          // Продукт не найден в products store - пропускаем
          continue
        }

        const balance = balanceMap.get(key)!
        balance.batches.push(batch)
        balance.totalQuantity += batch.currentQuantity
        balance.totalValue += batch.totalValue

        // Update dates
        if (new Date(batch.receiptDate) < new Date(balance.oldestBatchDate)) {
          balance.oldestBatchDate = batch.receiptDate
        }
        if (new Date(batch.receiptDate) > new Date(balance.newestBatchDate)) {
          balance.newestBatchDate = batch.receiptDate
        }
      }

      // Calculate averages and trends
      for (const balance of balanceMap.values()) {
        if (balance.totalQuantity > 0) {
          balance.averageCost = balance.totalValue / balance.totalQuantity
        }

        if (balance.batches.length > 0) {
          balance.batches.sort(
            (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
          )
          balance.latestCost = balance.batches[balance.batches.length - 1].costPerUnit

          if (balance.batches.length > 1) {
            const oldestCost = balance.batches[0].costPerUnit
            const diff = balance.latestCost - oldestCost
            const threshold = oldestCost * 0.05

            if (diff > threshold) {
              balance.costTrend = 'up'
            } else if (diff < -threshold) {
              balance.costTrend = 'down'
            } else {
              balance.costTrend = 'stable'
            }
          }
        }

        // Check expiry
        const now = new Date()
        const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        for (const batch of balance.batches) {
          if (batch.expiryDate) {
            const expiryDate = new Date(batch.expiryDate)
            if (expiryDate < now) {
              balance.hasExpired = true
            } else if (expiryDate < warningDate) {
              balance.hasNearExpiry = true
            }
          }
        }

        // ✅ Check low stock (including zero and negative)
        const productInfo = await this.getProductInfo(balance.itemId)
        if (productInfo.minStock && balance.totalQuantity <= productInfo.minStock) {
          balance.belowMinStock = true
        }
      }

      this.balances = Array.from(balanceMap.values())

      DebugUtils.debug(MODULE_NAME, 'Balances recalculated', {
        totalBalances: this.balances.length,
        withStock: this.balances.filter(b => b.totalQuantity > 0).length,
        zeroStock: this.balances.filter(b => b.totalQuantity === 0).length,
        negativeStock: this.balances.filter(b => b.totalQuantity < 0).length,
        totalQuantity: this.balances.reduce((sum, b) => sum + b.totalQuantity, 0),
        totalValue: this.balances.reduce((sum, b) => sum + b.totalValue, 0)
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate balances', { error })
      throw error
    }
  }

  // ===========================
  // CRUD OPERATIONS - ОБНОВЛЕНЫ ДЛЯ БАЗОВЫХ ЕДИНИЦ
  // ===========================

  // ✅ ПОЛНАЯ ЗАМЕНА метода createReceipt
  async createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating receipt', {
        department: data.department,
        itemCount: data.items.length,
        sourceType: data.sourceType
      })

      const operationItems: StorageOperationItem[] = []
      let totalValue = 0
      const defaultWarehouse = this.getDefaultWarehouse() // ✅ ДОБАВЛЕНО

      for (const item of data.items) {
        const productInfo = await this.getProductInfo(item.itemId)
        if (!productInfo) {
          throw new Error(`Product not found: ${item.itemId}`)
        }

        const quantityInBaseUnits = item.quantity
        const costPerBaseUnit = item.costPerUnit
        const totalCost = quantityInBaseUnits * costPerBaseUnit

        const newBatch: StorageBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          batchNumber: this.generateBatchNumber(item.itemId),
          itemId: item.itemId,
          itemType: 'product',
          warehouseId: defaultWarehouse.id, // ✅ ИЗМЕНЕНО: используем warehouseId вместо department
          initialQuantity: quantityInBaseUnits,
          currentQuantity: quantityInBaseUnits,
          unit: productInfo.baseUnit,
          costPerUnit: costPerBaseUnit,
          totalValue: totalCost,
          receiptDate: TimeUtils.getCurrentLocalISO(),
          expiryDate: item.expiryDate,
          sourceType: data.sourceType,
          status: 'active',
          isActive: true,
          notes: item.notes,
          createdAt: TimeUtils.getCurrentLocalISO(),
          updatedAt: TimeUtils.getCurrentLocalISO()
        }

        this.activeBatches.push(newBatch)

        DebugUtils.debug(MODULE_NAME, 'Batch added to activeBatches', {
          batchId: newBatch.id,
          itemId: newBatch.itemId,
          itemName: productInfo.name,
          quantity: newBatch.currentQuantity,
          warehouseId: newBatch.warehouseId, // ✅ ДОБАВЛЕНО в лог
          totalActiveBatches: this.activeBatches.length
        })

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: 'product' as const,
          itemName: productInfo.name,
          quantity: quantityInBaseUnits,
          unit: productInfo.baseUnit,
          totalCost,
          averageCostPerUnit: costPerBaseUnit,
          expiryDate: item.expiryDate,
          notes: item.notes
        })

        totalValue += totalCost
      }

      const operation: StorageOperation = {
        id: `op-${Date.now()}`,
        operationType: 'receipt',
        documentNumber: `RC-${String(Date.now()).slice(-6)}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department, // ✅ Сохраняем для отчётности
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.unshift(operation)
      await this.recalculateAllBalances() // ✅ ИЗМЕНЕНО: пересчитываем все балансы

      DebugUtils.info(MODULE_NAME, 'Receipt created successfully', {
        operationId: operation.id,
        itemCount: operation.items.length,
        totalValue,
        warehouse: defaultWarehouse.name
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create receipt', { error })
      throw error
    }
  }

  // ✅ ПОЛНАЯ ЗАМЕНА метода createWriteOff
  async createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating write-off operation in BASE UNITS', {
        department: data.department,
        reason: data.reason,
        items: data.items.length
      })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = await this.getProductInfo(item.itemId)

        // ✅ РАСЧЕТ В БАЗОВЫХ ЕДИНИЦАХ
        const quantityInBaseUnits = item.quantity

        // ✅ ИЗМЕНЕНО: Находим батчи для списания (FIFO) БЕЗ фильтра по department
        const availableBatches = this.activeBatches
          .filter(b => b.itemId === item.itemId && b.currentQuantity > 0)
          .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

        const allocations = this.calculateFifoAllocation(availableBatches, quantityInBaseUnits)

        // Обновляем количества в батчах
        allocations.forEach(allocation => {
          const batch = this.activeBatches.find(b => b.id === allocation.batchId)
          if (batch) {
            batch.currentQuantity -= allocation.quantity
            batch.updatedAt = TimeUtils.getCurrentLocalISO()

            if (batch.currentQuantity <= 0) {
              batch.currentQuantity = 0
              batch.status = 'consumed'
              batch.isActive = false
            }
          }
        })

        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: 'product' as const,
          itemName: productInfo.name,
          quantity: quantityInBaseUnits,
          unit: productInfo.baseUnit,
          batchAllocations: allocations,
          totalCost,
          notes: item.notes
        })

        totalValue += totalCost
      }

      const operation: StorageOperation = {
        id: `op-${Date.now()}`,
        operationType: 'write_off',
        documentNumber: `WO-${String(Date.now()).slice(-6)}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department, // ✅ Сохраняем для отчётности
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        writeOffDetails: {
          reason: data.reason,
          affectsKPI: doesWriteOffAffectKPI(data.reason),
          notes: data.notes
        },
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.unshift(operation)
      await this.recalculateAllBalances() // ✅ ИЗМЕНЕНО: пересчитываем все балансы

      DebugUtils.info(MODULE_NAME, 'Write-off operation created successfully', {
        operationId: operation.id,
        reason: data.reason,
        affectsKPI: operation.writeOffDetails?.affectsKPI,
        totalValue,
        unitSystem: 'BASE_UNITS'
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create write-off', { error })
      throw error
    }
  }

  // ✅ ПОЛНАЯ ЗАМЕНА метода createCorrection
  async createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating correction operation in BASE UNITS', {
        department: data.department,
        reason: data.correctionDetails.reason,
        items: data.items.length
      })

      const operationItems = []
      let totalValue = 0
      const defaultWarehouse = this.getDefaultWarehouse() // ✅ ДОБАВЛЕНО

      for (const item of data.items) {
        const productInfo = await this.getProductInfo(item.itemId)

        // ✅ РАБОТАЕМ В БАЗОВЫХ ЕДИНИЦАХ
        const quantityInBaseUnits = item.quantity

        // Для коррекций также используем FIFO если это списание
        let allocations: BatchAllocation[] = []
        let totalCost = 0

        if (quantityInBaseUnits > 0) {
          // Поступление - создаем новый батч
          const newBatch: StorageBatch = {
            id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            batchNumber: this.generateBatchNumber(item.itemId),
            itemId: item.itemId,
            itemType: 'product',
            warehouseId: defaultWarehouse.id, // ✅ ИЗМЕНЕНО: используем warehouseId
            initialQuantity: quantityInBaseUnits,
            currentQuantity: quantityInBaseUnits,
            unit: productInfo.baseUnit,
            costPerUnit: productInfo.baseCostPerUnit,
            totalValue: quantityInBaseUnits * productInfo.baseCostPerUnit,
            receiptDate: TimeUtils.getCurrentLocalISO(),
            sourceType: 'correction',
            status: 'active',
            isActive: true,
            notes: item.notes,
            createdAt: TimeUtils.getCurrentLocalISO(),
            updatedAt: TimeUtils.getCurrentLocalISO()
          }

          this.activeBatches.push(newBatch)
          totalCost = newBatch.totalValue
        } else {
          // Списание - используем FIFO
          // ✅ ИЗМЕНЕНО: фильтруем только по itemId (БЕЗ department)
          const availableBatches = this.activeBatches
            .filter(b => b.itemId === item.itemId && b.currentQuantity > 0)
            .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

          allocations = this.calculateFifoAllocation(
            availableBatches,
            Math.abs(quantityInBaseUnits)
          )

          // Обновляем батчи
          allocations.forEach(allocation => {
            const batch = this.activeBatches.find(b => b.id === allocation.batchId)
            if (batch) {
              batch.currentQuantity -= allocation.quantity
              batch.updatedAt = TimeUtils.getCurrentLocalISO()

              if (batch.currentQuantity <= 0) {
                batch.currentQuantity = 0
                batch.status = 'consumed'
                batch.isActive = false
              }
            }
          })

          totalCost = allocations.reduce(
            (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
            0
          )
        }

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: 'product' as const,
          itemName: productInfo.name,
          quantity: quantityInBaseUnits,
          unit: productInfo.baseUnit,
          batchAllocations: allocations,
          totalCost,
          notes: item.notes
        })

        totalValue += totalCost
      }

      const operation: StorageOperation = {
        id: `op-${Date.now()}`,
        operationType: 'correction',
        documentNumber: `CR-${String(Date.now()).slice(-6)}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department, // ✅ Сохраняем для отчётности
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        correctionDetails: data.correctionDetails,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.unshift(operation)
      await this.recalculateAllBalances() // ✅ ИЗМЕНЕНО: пересчитываем все балансы

      DebugUtils.info(MODULE_NAME, 'Correction operation created successfully', {
        operationId: operation.id,
        reason: data.correctionDetails.reason,
        totalValue,
        unitSystem: 'BASE_UNITS'
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create correction', { error })
      throw error
    }
  }

  // ===========================
  // BATCH ALLOCATION - FIFO LOGIC
  // ===========================

  private calculateFifoAllocation(
    availableBatches: StorageBatch[],
    requiredQuantity: number
  ): BatchAllocation[] {
    const allocations: BatchAllocation[] = []
    let remainingQuantity = requiredQuantity

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break

      const allocationQuantity = Math.min(batch.currentQuantity, remainingQuantity)

      if (allocationQuantity > 0) {
        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: allocationQuantity,
          costPerUnit: batch.costPerUnit, // ✅ Цена за базовую единицу
          batchDate: batch.receiptDate
        })

        remainingQuantity -= allocationQuantity
      }
    }

    if (remainingQuantity > 0) {
      DebugUtils.warn(MODULE_NAME, 'Insufficient stock for operation', {
        requiredQuantity,
        allocatedQuantity: requiredQuantity - remainingQuantity,
        remainingQuantity
      })
    }

    return allocations
  }

  private generateBatchNumber(itemId: string): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const productCode = itemId.split('-').pop()?.toUpperCase() || 'UNK'
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')

    return `${dateStr}-${productCode}-${random}`
  }

  // ===========================
  // WAREHOUSE METHODS
  // ===========================

  getDefaultWarehouse(): Warehouse {
    return this.warehouses.find(w => w.isActive) || this.warehouses[0]
  }

  getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.find(w => w.id === id)
  }

  getAllWarehouses(): Warehouse[] {
    return this.warehouses.filter(w => w.isActive)
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  // ✅ ПОЛНАЯ ЗАМЕНА метода startInventory
  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Starting inventory', {
        department: data.department,
        responsiblePerson: data.responsiblePerson
      })

      // ✅ ИЗМЕНЕНО: получаем ВСЕ balances (без фильтрации по department)
      const allBalances = await this.getBalances()

      // Создаём items для ВСЕХ продуктов
      const inventoryItems: InventoryItem[] = allBalances.map(balance => ({
        id: `inv-item-${balance.itemId}`,
        itemId: balance.itemId,
        itemType: 'product',
        itemName: balance.itemName,
        systemQuantity: balance.totalQuantity,
        actualQuantity: balance.totalQuantity,
        difference: 0,
        unit: balance.unit,
        averageCost: balance.averageCost,
        valueDifference: 0,
        confirmed: false
      }))

      const inventory: InventoryDocument = {
        id: `inv-${Date.now()}`,
        documentNumber: `IV-${String(Date.now()).slice(-6)}`,
        inventoryDate: TimeUtils.getCurrentLocalISO(),
        department: data.department, // ✅ Сохраняем для отчётности (кто делал)
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

      DebugUtils.info(MODULE_NAME, 'Inventory started', {
        inventoryId: inventory.id,
        totalItems: inventoryItems.length,
        department: data.department
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start inventory', { error })
      throw error
    }
  }

  async updateInventory(inventoryId: string, items: InventoryItem[]): Promise<InventoryDocument> {
    try {
      const inventory = this.inventories.find(inv => inv.id === inventoryId)
      if (!inventory) {
        throw new Error(`Inventory ${inventoryId} not found`)
      }

      // Обновляем данные инвентаризации
      inventory.items = items
      inventory.totalDiscrepancies = items.filter(item => item.difference !== 0).length
      inventory.totalValueDifference = items.reduce((sum, item) => sum + item.valueDifference, 0)
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

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
      const inventory = this.inventories.find(inv => inv.id === inventoryId)
      if (!inventory) {
        throw new Error(`Inventory ${inventoryId} not found`)
      }

      const correctionOperations: StorageOperation[] = []
      const discrepancies = inventory.items.filter(item => item.difference !== 0)

      if (discrepancies.length > 0) {
        // Создаем корректировку для расхождений
        const correctionData: CreateCorrectionData = {
          department: inventory.department,
          responsiblePerson: inventory.responsiblePerson,
          items: discrepancies.map(item => ({
            itemId: item.itemId,
            itemType: 'product',
            quantity: item.difference, // ✅ В базовых единицах
            notes: `Inventory adjustment: ${item.difference > 0 ? 'surplus' : 'shortage'}`
          })),
          correctionDetails: {
            reason: 'other',
            relatedId: inventoryId,
            relatedName: `Inventory ${inventory.documentNumber}`
          },
          notes: `Automatic correction from inventory ${inventory.documentNumber}`
        }

        const correctionOperation = await this.createCorrection(correctionData)
        correctionOperations.push(correctionOperation)
      }

      // Финализируем инвентаризацию
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

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

  async deleteBatch(batchId: string): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Deleting batch', { batchId })

      // ✅ Try to remove from activeBatches
      let index = this.activeBatches.findIndex(b => b.id === batchId)
      if (index !== -1) {
        const deletedBatch = this.activeBatches.splice(index, 1)[0]
        DebugUtils.info(MODULE_NAME, 'Active batch removed', {
          batchId,
          itemId: deletedBatch.itemId,
          remainingActiveBatches: this.activeBatches.length
        })
        return
      }

      // ✅ Try to remove from transitBatches
      index = this.transitBatches.findIndex(b => b.id === batchId)
      if (index !== -1) {
        const deletedBatch = this.transitBatches.splice(index, 1)[0]
        DebugUtils.info(MODULE_NAME, 'Transit batch removed', {
          batchId,
          itemId: deletedBatch.itemId,
          remainingTransitBatches: this.transitBatches.length
        })
        return
      }

      DebugUtils.warn(MODULE_NAME, 'Batch not found', { batchId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete batch', { batchId, error })
      throw error
    }
  }

  // ===========================
  // WRITE-OFF STATISTICS
  // ===========================

  // ✅ ПОЛНАЯ ЗАМЕНА метода getWriteOffStatistics
  async getWriteOffStatistics(
    department?: Department | 'all', // ✅ Тип изменён
    dateFrom?: string,
    dateTo?: string
  ): Promise<WriteOffStatistics> {
    const writeOffOps = this.operations.filter(op => {
      if (op.operationType !== 'write_off') return false
      if (department && department !== 'all' && op.department !== department) return false

      if (dateFrom || dateTo) {
        const opDate = new Date(op.operationDate)
        if (dateFrom && opDate < new Date(dateFrom)) return false
        if (dateTo && opDate > new Date(dateTo)) return false
      }

      return true
    })

    // ... остальная часть метода остаётся без изменений
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

    for (const op of writeOffOps) {
      const value = op.totalValue || 0
      const reason = op.writeOffDetails?.reason
      const affectsKPI = reason ? doesWriteOffAffectKPI(reason) : false

      stats.total.count++
      stats.total.value += value

      if (affectsKPI) {
        stats.kpiAffecting.count++
        stats.kpiAffecting.value += value

        if (reason === 'expired') {
          stats.kpiAffecting.reasons.expired.count++
          stats.kpiAffecting.reasons.expired.value += value
        } else if (reason === 'spoiled') {
          stats.kpiAffecting.reasons.spoiled.count++
          stats.kpiAffecting.reasons.spoiled.value += value
        } else {
          stats.kpiAffecting.reasons.other.count++
          stats.kpiAffecting.reasons.other.value += value
        }
      } else {
        stats.nonKpiAffecting.count++
        stats.nonKpiAffecting.value += value

        if (reason === 'education') {
          stats.nonKpiAffecting.reasons.education.count++
          stats.nonKpiAffecting.reasons.education.value += value
        } else if (reason === 'test') {
          stats.nonKpiAffecting.reasons.test.count++
          stats.nonKpiAffecting.reasons.test.value += value
        }
      }

      if (op.department === 'kitchen') {
        stats.byDepartment.kitchen.total += value
        if (affectsKPI) {
          stats.byDepartment.kitchen.kpiAffecting += value
        } else {
          stats.byDepartment.kitchen.nonKpiAffecting += value
        }
      } else if (op.department === 'bar') {
        stats.byDepartment.bar.total += value
        if (affectsKPI) {
          stats.byDepartment.bar.kpiAffecting += value
        } else {
          stats.byDepartment.bar.nonKpiAffecting += value
        }
      }
    }

    return stats
  }

  /**
   * Добавление runtime batch (для transit)
   */
  addRuntimeBatch(batch: StorageBatch): void {
    if (batch.status === 'in_transit') {
      this.transitBatches.push(batch)
      DebugUtils.info(MODULE_NAME, 'Runtime transit batch added', {
        batchId: batch.id,
        itemId: batch.itemId,
        totalTransitBatches: this.transitBatches.length
      })
    } else if (batch.status === 'active') {
      this.activeBatches.push(batch)
      DebugUtils.info(MODULE_NAME, 'Runtime active batch added', {
        batchId: batch.id,
        itemId: batch.itemId,
        totalActiveBatches: this.activeBatches.length
      })
    } else {
      DebugUtils.warn(MODULE_NAME, 'Attempted to add batch with unsupported status', {
        batchId: batch.id,
        status: batch.status
      })
    }
  }

  /**
   * Удаление runtime batch
   */
  removeRuntimeBatch(batchId: string): boolean {
    // Try to remove from transit batches
    let index = this.transitBatches.findIndex(b => b.id === batchId)
    if (index !== -1) {
      const removed = this.transitBatches.splice(index, 1)[0]
      DebugUtils.info(MODULE_NAME, 'Runtime transit batch removed', {
        batchId,
        itemId: removed.itemId,
        remainingTransitBatches: this.transitBatches.length
      })
      return true
    }

    // Try to remove from active batches
    index = this.activeBatches.findIndex(b => b.id === batchId)
    if (index !== -1) {
      const removed = this.activeBatches.splice(index, 1)[0]
      DebugUtils.info(MODULE_NAME, 'Runtime active batch removed', {
        batchId,
        itemId: removed.itemId,
        remainingActiveBatches: this.activeBatches.length
      })
      return true
    }

    DebugUtils.warn(MODULE_NAME, 'Runtime batch not found for removal', { batchId })
    return false
  }

  /**
   * Получение статистики runtime данных
   */
  getRuntimeDataStats() {
    const runtimeTransitBatches = this.transitBatches.filter(
      b => b.id.startsWith('transit-') && !b.id.startsWith('transit-TEST')
    )

    return {
      totalBatches: this.activeBatches.length + this.transitBatches.length,
      activeBatches: this.activeBatches.length,
      transitBatches: this.transitBatches.length,
      runtimeTransitBatches: runtimeTransitBatches.length,
      runtimeBatchIds: runtimeTransitBatches.map(b => b.id),
      runtimeValue: runtimeTransitBatches.reduce((sum, b) => sum + b.totalValue, 0)
    }
  }

  /**
   * Отладочная информация
   */
  getDebugInfo() {
    return {
      initialized: this.initialized,
      dataStats: {
        activeBatches: this.activeBatches.length,
        transitBatches: this.transitBatches.length,
        operations: this.operations.length,
        balances: this.balances.length,
        inventories: this.inventories.length
      },
      runtimeStats: this.getRuntimeDataStats(),
      batchesByStatus: {
        active: this.activeBatches.filter(b => b.status === 'active').length,
        transit: this.transitBatches.filter(b => b.status === 'in_transit').length
      }
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async getInventories(department?: Department | 'all'): Promise<InventoryDocument[]> {
    // ✅ Тип изменён на Department
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    if (!department || department === 'all') {
      return [...this.inventories]
    }

    return this.inventories.filter(inv => inv.department === department)
  }

  async getInventory(inventoryId: string): Promise<InventoryDocument | null> {
    try {
      return this.inventories.find(inv => inv.id === inventoryId) || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get inventory', { error, inventoryId })
      throw error
    }
  }
}

// =============================================
// SINGLETON INSTANCE
// =============================================

export const storageService = new StorageService()
