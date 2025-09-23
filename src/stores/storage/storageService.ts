// src/stores/storage/storageService.ts - ОБНОВЛЕНО ДЛЯ ИСПОЛЬЗОВАНИЯ MockDataCoordinator
// Удалены собственные моки, теперь использует единый координатор с базовыми единицами

import { DebugUtils, TimeUtils } from '@/utils'
import { useProductsStore } from '@/stores/productsStore'
import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'

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

import { doesWriteOffAffectKPI } from './types'

const MODULE_NAME = 'StorageService'

export class StorageService {
  private batches: StorageBatch[] = []
  private operations: StorageOperation[] = []
  private balances: StorageBalance[] = []
  private inventories: InventoryDocument[] = []
  private initialized: boolean = false

  isInitialized(): boolean {
    return this.initialized
  }
  // ===========================
  // HELPER METHODS (используют базовые единицы)
  // ===========================

  private getProductInfo(productId: string) {
    try {
      // ✅ ИЗМЕНЕНО: Используем MockDataCoordinator для получения данных продукта
      const productDef = mockDataCoordinator.getProductDefinition(productId)
      const productsStore = useProductsStore()
      const product = productsStore.products.find(p => p.id === productId)

      if (!product || !productDef) {
        DebugUtils.warn(MODULE_NAME, 'Product not found', { productId })
        return {
          name: productId,
          unit: 'gram', // ✅ По умолчанию базовая единица
          baseUnit: 'gram' as const,
          costPerUnit: 0,
          baseCostPerUnit: 0,
          minStock: 0,
          shelfLife: 7
        }
      }

      return {
        name: product.name,
        unit: product.unit, // Старая единица для совместимости
        baseUnit: productDef.baseUnit, // ✅ Базовая единица для расчетов
        costPerUnit: product.costPerUnit, // Старая цена
        baseCostPerUnit: productDef.baseCostPerUnit, // ✅ Цена за базовую единицу
        minStock: product.minStock || 0,
        shelfLife: productDef.shelfLifeDays || 7
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product info', { error, productId })
      return {
        name: productId,
        unit: 'gram',
        baseUnit: 'gram' as const,
        costPerUnit: 0,
        baseCostPerUnit: 0,
        minStock: 0,
        shelfLife: 7
      }
    }
  }

  // ===========================
  // INITIALIZATION - ИСПОЛЬЗУЕТ MockDataCoordinator
  // ===========================

  async initialize(): Promise<void> {
    if (this.initialized) {
      DebugUtils.info(MODULE_NAME, 'Storage service already initialized, skipping')
      return
    }

    try {
      DebugUtils.info(MODULE_NAME, 'First-time storage service initialization')

      const productsStore = useProductsStore()
      if (productsStore.products.length === 0) {
        await productsStore.loadProducts(true)
      }

      // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Загружаем данные с сохранением runtime
      this.loadDataFromCoordinator()

      // Пересчитываем балансы на основе всех данных (базовых + runtime)
      await this.recalculateAllBalances()

      this.initialized = true

      DebugUtils.info(MODULE_NAME, 'Storage service initialized successfully', {
        batches: this.batches.length,
        activeBatches: this.batches.filter(b => b.status === 'active').length,
        transitBatches: this.batches.filter(b => b.status === 'in_transit').length,
        operations: this.operations.length,
        balances: this.balances.length,
        unitSystem: 'BASE_UNITS (gram/ml/piece)'
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize storage service', { error })
      throw error
    }
  }

  // ✅ НОВЫЙ МЕТОД: Загрузка данных из координатора
  private loadDataFromCoordinator(): void {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading data from coordinator with runtime preservation')

      const storageData = mockDataCoordinator.getStorageStoreData()

      // СОХРАНЯЕМ существующие runtime данные (transit batches)
      const existingRuntimeBatches = this.batches.filter(
        batch => batch.status === 'in_transit' && batch.id.includes('transit-batch-')
      )

      // СОХРАНЯЕМ другие runtime данные (если есть)
      const existingRuntimeOperations = this.operations.filter(
        op => op.id.includes('runtime-') || op.notes?.includes('runtime')
      )

      DebugUtils.debug(MODULE_NAME, 'Runtime data to preserve', {
        runtimeBatches: existingRuntimeBatches.length,
        runtimeOperations: existingRuntimeOperations.length,
        runtimeBatchIds: existingRuntimeBatches.map(b => b.id)
      })

      // Загружаем базовые данные из координатора (deep clone)
      const baseBatches = JSON.parse(JSON.stringify(storageData.batches))
      const baseOperations = JSON.parse(JSON.stringify(storageData.operations))

      // MERGE: базовые данные + сохраненные runtime данные
      this.batches = [...baseBatches, ...existingRuntimeBatches]
      this.operations = [...baseOperations, ...existingRuntimeOperations]

      // balances будут пересчитаны в recalculateAllBalances()
      this.inventories = []

      DebugUtils.info(MODULE_NAME, 'Data loaded and merged successfully', {
        baseBatches: baseBatches.length,
        baseOperations: baseOperations.length,
        runtimeBatches: existingRuntimeBatches.length,
        runtimeOperations: existingRuntimeOperations.length,
        totalBatches: this.batches.length,
        totalOperations: this.operations.length,
        note: 'Runtime data preserved, balances will be recalculated'
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load data from coordinator', { error })

      // Fallback: если совсем ничего нет, создаем пустые массивы
      if (this.batches.length === 0) {
        this.batches = []
        this.operations = []
        this.inventories = []
      }
    }
  }

  async reinitialize(preserveRuntimeData: boolean = true): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Force reinitializing storage service', { preserveRuntimeData })

    if (preserveRuntimeData) {
      // Обычная реинициализация с сохранением runtime данных
      this.loadDataFromCoordinator()
      await this.recalculateAllBalances()
    } else {
      // Полная реинициализация (потеря runtime данных)
      this.initialized = false
      this.batches = []
      this.operations = []
      this.balances = []
      this.inventories = []
      await this.initialize()
    }
  }

  // ===========================
  // BASIC OPERATIONS
  // ===========================

  async getBalances(department?: StorageDepartment): Promise<StorageBalance[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      if (this.balances.length === 0) {
        await this.recalculateAllBalances()
      }

      let balances = [...this.balances]

      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }

      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch balances', { error })
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
      DebugUtils.error(MODULE_NAME, 'Failed to get balance', { error, itemId })
      throw error
    }
  }

  async getBatches(department?: StorageDepartment): Promise<StorageBatch[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let batches = [...this.batches]

      if (department && department !== 'all') {
        batches = batches.filter(b => b.department === department)
      }

      // Возвращаем только активные батчи
      return batches
        .filter(b => b.status === 'active')
        .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get batches', { error, department })
      throw error
    }
  }

  async getAllBatches(department?: StorageDepartment): Promise<StorageBatch[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let batches = [...this.batches]

      if (department && department !== 'all') {
        batches = batches.filter(b => b.department === department)
      }

      return batches.sort(
        (a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get all batches', { error })
      throw error
    }
  }

  async getOperations(department?: StorageDepartment): Promise<StorageOperation[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

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

  // ===========================
  // BALANCE CALCULATION - ОБНОВЛЕНО ДЛЯ БАЗОВЫХ ЕДИНИЦ
  // ===========================

  async recalculateAllBalances(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recalculating all balances in BASE UNITS...')

      const productsStore = useProductsStore()
      const newBalances: StorageBalance[] = []

      // Группируем батчи по продуктам и департаментам
      const groupedBatches = this.groupBatchesByProductAndDepartment()

      for (const [key, batches] of groupedBatches.entries()) {
        const [itemId, department] = key.split('|')
        const product = productsStore.products.find(p => p.id === itemId)
        const productDef = mockDataCoordinator.getProductDefinition(itemId)

        if (!product || !productDef) {
          DebugUtils.warn(MODULE_NAME, 'Product not found for balance calculation', { itemId })
          continue
        }

        const balance = this.calculateBalanceFromBatches(
          itemId,
          department as StorageDepartment,
          batches,
          product,
          productDef
        )

        if (balance) {
          newBalances.push(balance)
        }
      }

      this.balances = newBalances

      DebugUtils.info(MODULE_NAME, 'Balance recalculation completed', {
        balances: this.balances.length,
        unitSystem: 'BASE_UNITS (gram/ml/piece)'
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate balances', { error })
      throw error
    }
  }

  private groupBatchesByProductAndDepartment(): Map<string, StorageBatch[]> {
    const grouped = new Map<string, StorageBatch[]>()

    // ❌ БЫЛО (неправильно - исключало транзитные):
    // this.batches
    //   .filter(batch => batch.status === 'active' && batch.currentQuantity > 0)

    // ✅ ИСПРАВЛЕНО (правильно - только активные, исключаем consumed/expired):
    this.batches
      .filter(
        batch => batch.status === 'active' && batch.currentQuantity > 0 && batch.isActive === true
      )
      .forEach(batch => {
        const key = `${batch.itemId}|${batch.department}`

        if (!grouped.has(key)) {
          grouped.set(key, [])
        }

        grouped.get(key)!.push(batch)
      })

    return grouped
  }

  // И дополнительно исправить метод calculateBalanceFromBatches():

  private calculateBalanceFromBatches(
    itemId: string,
    department: StorageDepartment,
    batches: StorageBatch[],
    product: any,
    productDef: any
  ): StorageBalance | null {
    try {
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Берем ТОЛЬКО активные батчи с количеством > 0
      const activeBatches = batches.filter(
        batch => batch.status === 'active' && batch.isActive === true && batch.currentQuantity > 0
      )

      if (activeBatches.length === 0) {
        return this.createZeroBalance(itemId, department, product, productDef)
      }

      // ✅ Расчеты ТОЛЬКО по активным батчам
      const totalQuantity = activeBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0)
      const totalValue = activeBatches.reduce((sum, batch) => sum + batch.totalValue, 0)
      const averageCost =
        totalQuantity > 0 ? Math.round(totalValue / totalQuantity) : productDef.baseCostPerUnit

      const hasExpired = activeBatches.some(batch => {
        if (!batch.expiryDate) return false
        return new Date(batch.expiryDate) < new Date()
      })

      const hasNearExpiry = this.checkNearExpiry(activeBatches)
      const belowMinStock = totalQuantity < (productDef.minStock || 0)

      // Find oldest and newest batch dates FROM ACTIVE BATCHES ONLY
      const sortedDates = activeBatches
        .map(b => new Date(b.receiptDate))
        .sort((a, b) => a.getTime() - b.getTime())

      return {
        itemId,
        itemType: 'product',
        itemName: product.name,
        department,
        totalQuantity, // ← ТОЛЬКО активные батчи (0 для помидоров)
        unit: productDef.baseUnit,
        totalValue,
        averageCost,
        latestCost:
          activeBatches[activeBatches.length - 1]?.costPerUnit || productDef.baseCostPerUnit,
        costTrend: 'stable',
        batches: activeBatches, // ← ТОЛЬКО активные батчи в массиве!
        oldestBatchDate: sortedDates[0]?.toISOString() || TimeUtils.getCurrentLocalISO(),
        newestBatchDate:
          sortedDates[sortedDates.length - 1]?.toISOString() || TimeUtils.getCurrentLocalISO(),
        hasExpired,
        hasNearExpiry,
        belowMinStock: totalQuantity === 0 ? true : belowMinStock, // Zero stock = below min
        averageDailyUsage: productDef.dailyConsumption || 0,
        daysOfStockRemaining:
          totalQuantity > 0 && productDef.dailyConsumption
            ? Math.floor(totalQuantity / productDef.dailyConsumption)
            : 0,
        lastCalculated: TimeUtils.getCurrentLocalISO(),
        id: `balance-${itemId}-${department}`,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate balance', { error, itemId, department })
      return null
    }
  }

  private createZeroBalance(
    itemId: string,
    department: StorageDepartment,
    product: any,
    productDef: any
  ): StorageBalance {
    return {
      itemId,
      itemType: 'product',
      itemName: product.name,
      department,
      totalQuantity: 0, // ✅ В базовых единицах
      unit: productDef.baseUnit, // ✅ Базовая единица
      totalValue: 0,
      averageCost: productDef.baseCostPerUnit,
      latestCost: productDef.baseCostPerUnit,
      costTrend: 'stable',
      batches: [],
      oldestBatchDate: TimeUtils.getCurrentLocalISO(),
      newestBatchDate: TimeUtils.getCurrentLocalISO(),
      hasExpired: false,
      hasNearExpiry: false,
      belowMinStock: true, // Нулевой остаток всегда ниже минимума
      averageDailyUsage: productDef.dailyConsumption,
      daysOfStockRemaining: 0,
      lastCalculated: TimeUtils.getCurrentLocalISO(),
      id: `balance-${itemId}-${department}`,
      createdAt: TimeUtils.getCurrentLocalISO(),
      updatedAt: TimeUtils.getCurrentLocalISO()
    }
  }

  private checkNearExpiry(batches: StorageBatch[]): boolean {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    return batches.some(batch => {
      if (!batch.expiryDate) return false
      const expiryDate = new Date(batch.expiryDate)
      return expiryDate <= threeDaysFromNow && expiryDate > now
    })
  }

  // ===========================
  // CRUD OPERATIONS - ОБНОВЛЕНЫ ДЛЯ БАЗОВЫХ ЕДИНИЦ
  // ===========================

  async createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating receipt operation in BASE UNITS', {
        department: data.department,
        items: data.items.length
      })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = this.getProductInfo(item.itemId)

        // ✅ ИСПОЛЬЗУЕМ БАЗОВЫЕ ЕДИНИЦЫ
        const quantityInBaseUnits = item.quantity // Предполагаем что уже в базовых единицах
        const costPerBaseUnit = item.costPerUnit // Цена за базовую единицу
        const totalCost = quantityInBaseUnits * costPerBaseUnit

        // Создаем новый батч
        const newBatch: StorageBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          batchNumber: this.generateBatchNumber(item.itemId),
          itemId: item.itemId,
          itemType: 'product',
          department: data.department,
          initialQuantity: quantityInBaseUnits, // ✅ В базовых единицах
          currentQuantity: quantityInBaseUnits, // ✅ В базовых единицах
          unit: productInfo.baseUnit, // ✅ Базовая единица
          costPerUnit: costPerBaseUnit, // ✅ Цена за базовую единицу
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

        this.batches.push(newBatch)

        operationItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.itemId,
          itemType: 'product',
          itemName: productInfo.name,
          quantity: quantityInBaseUnits, // ✅ В базовых единицах
          unit: productInfo.baseUnit, // ✅ Базовая единица
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
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      this.operations.unshift(operation)
      await this.recalculateBalancesForDepartment(data.department)

      DebugUtils.info(MODULE_NAME, 'Receipt operation created successfully', {
        operationId: operation.id,
        totalValue,
        unitSystem: 'BASE_UNITS'
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create receipt', { error })
      throw error
    }
  }

  async createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating write-off operation in BASE UNITS', {
        department: data.department,
        reason: data.reason,
        items: data.items.length
      })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = this.getProductInfo(item.itemId)

        // ✅ РАСЧЕТ В БАЗОВЫХ ЕДИНИЦАХ
        const quantityInBaseUnits = item.quantity // Предполагаем уже в базовых единицах

        // Находим батчи для списания (FIFO)
        const availableBatches = this.batches
          .filter(
            b =>
              b.itemId === item.itemId &&
              b.department === data.department &&
              b.status === 'active' &&
              b.currentQuantity > 0
          )
          .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

        const allocations = this.calculateFifoAllocation(availableBatches, quantityInBaseUnits)

        // Обновляем количества в батчах
        allocations.forEach(allocation => {
          const batch = this.batches.find(b => b.id === allocation.batchId)
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
          itemType: 'product',
          itemName: productInfo.name,
          quantity: quantityInBaseUnits, // ✅ В базовых единицах
          unit: productInfo.baseUnit, // ✅ Базовая единица
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
        department: data.department,
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
      await this.recalculateBalancesForDepartment(data.department)

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

  async createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating correction operation in BASE UNITS', {
        department: data.department,
        reason: data.correctionDetails.reason,
        items: data.items.length
      })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = this.getProductInfo(item.itemId)

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
            department: data.department,
            initialQuantity: quantityInBaseUnits,
            currentQuantity: quantityInBaseUnits,
            unit: productInfo.baseUnit, // ✅ Базовая единица
            costPerUnit: productInfo.baseCostPerUnit, // ✅ Цена за базовую единицу
            totalValue: quantityInBaseUnits * productInfo.baseCostPerUnit,
            receiptDate: TimeUtils.getCurrentLocalISO(),
            sourceType: 'correction',
            status: 'active',
            isActive: true,
            notes: item.notes,
            createdAt: TimeUtils.getCurrentLocalISO(),
            updatedAt: TimeUtils.getCurrentLocalISO()
          }

          this.batches.push(newBatch)
          totalCost = newBatch.totalValue
        } else {
          // Списание - используем FIFO
          const availableBatches = this.batches
            .filter(
              b =>
                b.itemId === item.itemId &&
                b.department === data.department &&
                b.status === 'active' &&
                b.currentQuantity > 0
            )
            .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

          allocations = this.calculateFifoAllocation(
            availableBatches,
            Math.abs(quantityInBaseUnits)
          )

          // Обновляем батчи
          allocations.forEach(allocation => {
            const batch = this.batches.find(b => b.id === allocation.batchId)
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
          itemType: 'product',
          itemName: productInfo.name,
          quantity: quantityInBaseUnits, // ✅ В базовых единицах (может быть отрицательным)
          unit: productInfo.baseUnit, // ✅ Базовая единица
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

      this.operations.unshift(operation)
      await this.recalculateBalancesForDepartment(data.department)

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
  // BALANCE RECALCULATION
  // ===========================

  private async recalculateBalancesForDepartment(department: StorageDepartment): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Recalculating balances for department', { department })

      // Удаляем старые балансы для этого департамента
      this.balances = this.balances.filter(b => b.department !== department)

      // Пересчитываем балансы для всех продуктов в этом департаменте
      const departmentBatches = this.batches.filter(b => b.department === department)
      const productIds = [...new Set(departmentBatches.map(b => b.itemId))]

      for (const productId of productIds) {
        const productBatches = departmentBatches.filter(b => b.itemId === productId)
        const productsStore = useProductsStore()
        const product = productsStore.products.find(p => p.id === productId)
        const productDef = mockDataCoordinator.getProductDefinition(productId)

        if (product && productDef) {
          const balance = this.calculateBalanceFromBatches(
            productId,
            department,
            productBatches,
            product,
            productDef
          )

          if (balance) {
            this.balances.push(balance)
          }
        }
      }

      DebugUtils.debug(MODULE_NAME, 'Department balances recalculated', {
        department,
        balances: this.balances.filter(b => b.department === department).length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate department balances', { error })
      throw error
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      const balances = await this.getBalances(data.department)

      const inventoryItems: InventoryItem[] = balances.map(balance => ({
        id: `inv-item-${balance.itemId}`,
        itemId: balance.itemId,
        itemType: 'product',
        itemName: balance.itemName,
        systemQuantity: balance.totalQuantity, // ✅ В базовых единицах
        actualQuantity: balance.totalQuantity, // Пользователь будет корректировать
        difference: 0,
        unit: balance.unit, // ✅ Базовая единица
        averageCost: balance.averageCost,
        valueDifference: 0,
        confirmed: false
      }))

      const inventory: InventoryDocument = {
        id: `inv-${Date.now()}`,
        documentNumber: `IV-${String(Date.now()).slice(-6)}`,
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

      DebugUtils.info(MODULE_NAME, 'Inventory started', {
        inventoryId: inventory.id,
        department: data.department,
        items: inventoryItems.length
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

  // ===========================
  // WRITE-OFF STATISTICS
  // ===========================

  getWriteOffStatistics(
    department?: StorageDepartment,
    dateFrom?: string,
    dateTo?: string
  ): WriteOffStatistics {
    try {
      const writeOffOperations = this.operations.filter(op => {
        if (op.operationType !== 'write_off') return false
        if (department && department !== 'all' && op.department !== department) return false

        if (dateFrom || dateTo) {
          const opDate = new Date(op.operationDate)
          if (dateFrom && opDate < new Date(dateFrom)) return false
          if (dateTo && opDate > new Date(dateTo)) return false
        }

        return true
      })

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

      writeOffOperations.forEach(op => {
        const value = op.totalValue || 0
        const affectsKPI = op.writeOffDetails?.affectsKPI || false
        const reason = op.writeOffDetails?.reason || 'other'

        // Общая статистика
        stats.total.count++
        stats.total.value += value

        // По влиянию на KPI
        if (affectsKPI) {
          stats.kpiAffecting.count++
          stats.kpiAffecting.value += value

          if (['expired', 'spoiled'].includes(reason)) {
            stats.kpiAffecting.reasons[reason as 'expired' | 'spoiled'].count++
            stats.kpiAffecting.reasons[reason as 'expired' | 'spoiled'].value += value
          } else {
            stats.kpiAffecting.reasons.other.count++
            stats.kpiAffecting.reasons.other.value += value
          }
        } else {
          stats.nonKpiAffecting.count++
          stats.nonKpiAffecting.value += value

          if (['education', 'test'].includes(reason)) {
            stats.nonKpiAffecting.reasons[reason as 'education' | 'test'].count++
            stats.nonKpiAffecting.reasons[reason as 'education' | 'test'].value += value
          }
        }

        // По департаментам
        const dept = op.department
        if (stats.byDepartment[dept]) {
          stats.byDepartment[dept].total += value
          if (affectsKPI) {
            stats.byDepartment[dept].kpiAffecting += value
          } else {
            stats.byDepartment[dept].nonKpiAffecting += value
          }
        }
      })

      return stats
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off statistics', { error })
      // Возвращаем пустую статистику при ошибке
      return {
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
    }
  }

  /**
   * Добавление runtime batch (для transit)
   */
  addRuntimeBatch(batch: StorageBatch): void {
    if (!batch.id.includes('transit-batch-')) {
      DebugUtils.warn(MODULE_NAME, 'Adding non-transit batch as runtime', {
        batchId: batch.id,
        status: batch.status
      })
    }

    this.batches.push(batch)
    DebugUtils.info(MODULE_NAME, 'Runtime batch added', {
      batchId: batch.id,
      itemId: batch.itemId,
      totalBatches: this.batches.length
    })
  }

  /**
   * Удаление runtime batch
   */
  removeRuntimeBatch(batchId: string): boolean {
    const index = this.batches.findIndex(b => b.id === batchId)
    if (index !== -1) {
      const removedBatch = this.batches.splice(index, 1)[0]
      DebugUtils.info(MODULE_NAME, 'Runtime batch removed', {
        batchId,
        itemId: removedBatch.itemId,
        remainingBatches: this.batches.length
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
    const runtimeBatches = this.batches.filter(
      b => b.status === 'in_transit' && b.id.includes('transit-batch-')
    )

    return {
      totalBatches: this.batches.length,
      runtimeBatches: runtimeBatches.length,
      activeBatches: this.batches.filter(b => b.status === 'active').length,
      runtimeBatchIds: runtimeBatches.map(b => b.id),
      runtimeValue: runtimeBatches.reduce((sum, b) => sum + b.currentQuantity * b.costPerUnit, 0)
    }
  }

  /**
   * Отладочная информация
   */
  getDebugInfo() {
    return {
      initialized: this.initialized,
      dataStats: {
        batches: this.batches.length,
        operations: this.operations.length,
        balances: this.balances.length,
        inventories: this.inventories.length
      },
      runtimeStats: this.getRuntimeDataStats(),
      batchesByStatus: {
        active: this.batches.filter(b => b.status === 'active').length,
        transit: this.batches.filter(b => b.status === 'in_transit').length,
        expired: this.batches.filter(b => b.status === 'expired').length
      }
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async getInventories(department?: StorageDepartment): Promise<InventoryDocument[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

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
