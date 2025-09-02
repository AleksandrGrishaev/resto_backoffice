// src/stores/storage/storageStore.ts - ИСПРАВЛЕНО: Добавлен departmentBalances
// Удалена собственная генерация моков, используется единый координатор

import { ref, computed, readonly } from 'vue' // ✅ ДОБАВЛЕН readonly
import { storageService } from './storageService'
import { useProductsStore } from '@/stores/productsStore'
import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'
import { DebugUtils } from '@/utils'
import { convertToBaseUnits } from '@/composables/useMeasurementUnits'

import type {
  StorageState,
  StorageBatch,
  StorageOperation,
  StorageBalance,
  StorageBalanceWithTransit, // ✅ ДОБАВЛЕН новый тип
  StorageDepartment,
  InventoryDocument,
  CreateReceiptData,
  CreateWriteOffData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryItem
} from './types'

const MODULE_NAME = 'StorageStore'

// ===========================
// STATE - ИНТЕГРАЦИЯ С КООРДИНАТОРОМ
// ===========================

const state = ref<StorageState>({
  batches: [],
  operations: [],
  balances: [],
  inventories: [],

  loading: {
    balances: false,
    operations: false,
    inventory: false,
    correction: false,
    writeOff: false
  },
  error: null,

  filters: {
    department: 'all',
    operationType: undefined,
    showExpired: false,
    showBelowMinStock: false,
    showNearExpiry: false,
    search: '',
    dateFrom: undefined,
    dateTo: undefined
  },

  settings: {
    expiryWarningDays: 7,
    lowStockMultiplier: 1.5,
    autoCalculateBalance: true,
    enableQuickWriteOff: true
  }
})

// ===========================
// COMPUTED PROPERTIES
// ===========================

const filteredBalances = computed(() => {
  let balances = [...state.value.balances]

  // Фильтр по департаменту
  if (state.value.filters.department !== 'all') {
    balances = balances.filter(b => b.department === state.value.filters.department)
  }

  // Фильтр по поиску
  if (state.value.filters.search) {
    const search = state.value.filters.search.toLowerCase()
    balances = balances.filter(b => b.itemName.toLowerCase().includes(search))
  }

  // Специальные фильтры
  if (state.value.filters.showExpired) {
    balances = balances.filter(b => b.hasExpired)
  }

  if (state.value.filters.showBelowMinStock) {
    balances = balances.filter(b => b.belowMinStock)
  }

  if (state.value.filters.showNearExpiry) {
    balances = balances.filter(b => b.hasNearExpiry)
  }

  return balances
})

const filteredOperations = computed(() => {
  let operations = [...state.value.operations]

  // Фильтр по департаменту
  if (state.value.filters.department !== 'all') {
    operations = operations.filter(op => op.department === state.value.filters.department)
  }

  // Фильтр по типу операции
  if (state.value.filters.operationType) {
    operations = operations.filter(op => op.operationType === state.value.filters.operationType)
  }

  // Фильтр по поиску
  if (state.value.filters.search) {
    const search = state.value.filters.search.toLowerCase()
    operations = operations.filter(
      op =>
        op.documentNumber.toLowerCase().includes(search) ||
        op.responsiblePerson.toLowerCase().includes(search) ||
        op.items.some(item => item.itemName.toLowerCase().includes(search))
    )
  }

  // Фильтр по датам
  if (state.value.filters.dateFrom) {
    const fromDate = new Date(state.value.filters.dateFrom)
    operations = operations.filter(op => new Date(op.operationDate) >= fromDate)
  }

  if (state.value.filters.dateTo) {
    const toDate = new Date(state.value.filters.dateTo)
    operations = operations.filter(op => new Date(op.operationDate) <= toDate)
  }

  return operations
})

const totalStockValue = computed(() => {
  return state.value.balances.reduce((sum, balance) => sum + balance.totalValue, 0)
})

const lowStockItemsCount = computed(() => {
  return state.value.balances.filter(balance => balance.belowMinStock).length
})

const expiredItemsCount = computed(() => {
  return state.value.balances.filter(balance => balance.hasExpired).length
})

const nearExpiryItemsCount = computed(() => {
  return state.value.balances.filter(balance => balance.hasNearExpiry).length
})

// ✅ ДОБАВЛЕНО: Метод departmentBalances
const departmentBalances = (department: StorageDepartment) => {
  return state.value.balances.filter(
    b => b && b.itemType === 'product' && b.department === department
  )
}

// ===========================
// COMPUTED PROPERTIES - ТРАНЗИТНЫЕ BATCH-И
// ===========================

/**
 * Создает транзитные batch-и при отправке заказа поставщику
 */
async function createTransitBatches(orderData: CreateTransitBatchData[]): Promise<string[]> {
  try {
    state.value.loading.correction = true // Используем существующий loading
    const batchIds: string[] = []

    DebugUtils.info(MODULE_NAME, 'Creating transit batches', {
      orderCount: orderData.length,
      firstOrderId: orderData[0]?.purchaseOrderId
    })

    // Защита от дубликатов - проверяем, не созданы ли уже batch-и для этого заказа
    if (orderData.length > 0) {
      const existingBatches = state.value.batches.filter(
        batch =>
          batch.purchaseOrderId === orderData[0].purchaseOrderId && batch.status === 'in_transit'
      )

      if (existingBatches.length > 0) {
        DebugUtils.warn(MODULE_NAME, 'Transit batches already exist for order', {
          purchaseOrderId: orderData[0].purchaseOrderId,
          existingCount: existingBatches.length
        })
        return existingBatches.map(b => b.id)
      }
    }

    for (const item of orderData) {
      // Валидация входных данных
      if (!item.itemId || !item.quantity || item.quantity <= 0) {
        DebugUtils.warn(MODULE_NAME, 'Skipping invalid transit batch item', { item })
        continue
      }

      // Получаем информацию о продукте
      const productDef = mockDataCoordinator.getProductDefinition(item.itemId)
      if (!productDef) {
        DebugUtils.warn(MODULE_NAME, 'Product definition not found, skipping', {
          itemId: item.itemId
        })
        continue
      }

      // Определяем тип единицы для конвертации
      let unitType: 'weight' | 'volume' | 'piece' = 'piece'
      if (productDef.baseUnit === 'gram') {
        unitType = 'weight'
      } else if (productDef.baseUnit === 'ml') {
        unitType = 'volume'
      }

      // Конвертируем в базовые единицы
      const conversionResult = convertToBaseUnits(item.quantity, item.unit, unitType)

      if (!conversionResult.success) {
        DebugUtils.warn(MODULE_NAME, 'Failed to convert units, using original quantity', {
          itemId: item.itemId,
          quantity: item.quantity,
          unit: item.unit,
          error: conversionResult.error
        })
        // Используем оригинальное количество, если конвертация не удалась
      }

      const quantityInBaseUnits = conversionResult.success ? conversionResult.value! : item.quantity
      const baseUnit = conversionResult.success ? conversionResult.baseUnit! : item.unit

      // Конвертируем цену в базовые единицы
      let costPerUnitInBase = item.estimatedCostPerUnit
      if (conversionResult.success && item.unit !== baseUnit) {
        // Если единица изменилась, нужно пересчитать цену за единицу
        const conversionFactor = item.quantity / quantityInBaseUnits
        costPerUnitInBase = item.estimatedCostPerUnit * conversionFactor
      }

      // Генерация уникального ID и номера
      const batchId = `transit-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const batchNumber = generateTransitBatchNumber()

      const batch: StorageBatch = {
        id: batchId,
        batchNumber,
        itemId: item.itemId,
        itemType: 'product',
        department: item.department,
        initialQuantity: quantityInBaseUnits,
        currentQuantity: quantityInBaseUnits,
        unit: baseUnit, // Базовая единица
        costPerUnit: costPerUnitInBase, // Цена в базовых единицах
        totalValue: quantityInBaseUnits * costPerUnitInBase,
        receiptDate: item.plannedDeliveryDate,
        sourceType: 'purchase',
        status: 'in_transit',
        isActive: false, // Важно: не активен до получения

        // Новые поля для связи с заказами
        purchaseOrderId: item.purchaseOrderId,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        plannedDeliveryDate: item.plannedDeliveryDate,
        notes: item.notes || `Transit batch from order`,

        // BaseEntity поля
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Добавляем в начало массива (новые batch-и сверху)
      state.value.batches.unshift(batch)
      batchIds.push(batchId)

      DebugUtils.info(MODULE_NAME, 'Transit batch created', {
        batchId,
        itemId: item.itemId,
        originalQuantity: item.quantity,
        originalUnit: item.unit,
        baseQuantity: quantityInBaseUnits,
        baseUnit: baseUnit,
        supplier: item.supplierName
      })
    }

    // Пересчитываем балансы
    await recalculateAllBalances()

    DebugUtils.info(MODULE_NAME, 'Transit batches created successfully', {
      totalCreated: batchIds.length,
      batchIds
    })

    return batchIds
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create transit batches'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error, orderData })
    throw error
  } finally {
    state.value.loading.correction = false
  }
}

/**
 * Конвертирует транзитные batch-и в активные при получении товара
 */
async function convertTransitBatchesToActive(
  purchaseOrderId: string,
  receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
): Promise<void> {
  try {
    state.value.loading.correction = true

    DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', {
      purchaseOrderId,
      itemsCount: receiptItems.length
    })

    // Находим все транзитные batch-и для данного заказа
    const transitBatches = state.value.batches.filter(
      batch => batch.purchaseOrderId === purchaseOrderId && batch.status === 'in_transit'
    )

    if (transitBatches.length === 0) {
      DebugUtils.warn(MODULE_NAME, 'No transit batches found for order', { purchaseOrderId })
      return
    }

    for (const receiptItem of receiptItems) {
      // Находим соответствующий транзитный batch
      const transitBatch = transitBatches.find(batch => batch.itemId === receiptItem.itemId)

      if (!transitBatch) {
        DebugUtils.warn(MODULE_NAME, 'No transit batch found for received item', {
          itemId: receiptItem.itemId,
          purchaseOrderId
        })
        continue
      }

      // Предполагаем что receiptItem.receivedQuantity уже в базовых единицах
      // (это ответственность вызывающего кода - supplier store)
      const receivedQuantityInBase = receiptItem.receivedQuantity
      const originalQuantity = transitBatch.initialQuantity
      const actualPrice = receiptItem.actualPrice || transitBatch.costPerUnit

      // Обновляем batch для перехода в active статус
      transitBatch.status = 'active'
      transitBatch.isActive = true
      transitBatch.currentQuantity = receivedQuantityInBase
      transitBatch.initialQuantity = receivedQuantityInBase
      transitBatch.actualDeliveryDate = new Date().toISOString()
      transitBatch.updatedAt = new Date().toISOString()

      // Обновляем цену и стоимость, если отличается
      if (actualPrice !== transitBatch.costPerUnit) {
        const oldPrice = transitBatch.costPerUnit
        transitBatch.costPerUnit = actualPrice
        transitBatch.totalValue = receivedQuantityInBase * actualPrice
        transitBatch.notes += ` | Price updated: ${oldPrice.toFixed(2)} → ${actualPrice.toFixed(2)}`
      } else {
        transitBatch.totalValue = receivedQuantityInBase * actualPrice
      }

      // Логируем расхождения
      if (receivedQuantityInBase !== originalQuantity) {
        if (receivedQuantityInBase < originalQuantity) {
          transitBatch.notes += ` | Partial delivery: ${receivedQuantityInBase}/${originalQuantity}`
        } else {
          transitBatch.notes += ` | Excess delivery: ${receivedQuantityInBase}/${originalQuantity}`
        }
      }

      DebugUtils.info(MODULE_NAME, 'Transit batch converted to active', {
        batchId: transitBatch.id,
        itemId: receiptItem.itemId,
        originalQuantity,
        receivedQuantity: receivedQuantityInBase,
        actualPrice
      })
    }

    // Пересчитываем балансы
    await recalculateAllBalances()

    DebugUtils.info(MODULE_NAME, 'Transit batches converted successfully', {
      purchaseOrderId,
      convertedCount: receiptItems.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to convert transit batches', {
      error,
      purchaseOrderId
    })
    throw error
  } finally {
    state.value.loading.correction = false
  }
}

/**
 * Пересчитывает все балансы (добавить только если метода еще нет)
 */
async function recalculateAllBalances(): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Recalculating all balances...')

    // Загружаем свежие данные из координатора
    const freshData = mockDataCoordinator.getStorageStoreData()

    // Обновляем только balances, но сохраняем текущие batches
    // (так как они могли быть модифицированы добавлением транзитных)
    state.value.balances = freshData.balances
    state.value.operations = freshData.operations

    DebugUtils.info(MODULE_NAME, 'Balances recalculated successfully', {
      balancesCount: state.value.balances.length,
      batchesCount: state.value.batches.length,
      operationsCount: state.value.operations.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to recalculate balances', { error })
    throw error
  }
}

/**
 * Удаляет транзитные batch-и при отмене заказа
 */
async function removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Removing transit batches on order cancel', { orderId })

    // Находим транзитные batch-и для заказа
    const transitBatchesToRemove = state.value.batches.filter(
      batch => batch.purchaseOrderId === orderId && batch.status === 'in_transit'
    )

    if (transitBatchesToRemove.length === 0) {
      DebugUtils.info(MODULE_NAME, 'No transit batches to remove', { orderId })
      return
    }

    // Удаляем batch-и
    state.value.batches = state.value.batches.filter(
      batch => !(batch.purchaseOrderId === orderId && batch.status === 'in_transit')
    )

    // Пересчитываем балансы
    await recalculateAllBalances()

    DebugUtils.info(MODULE_NAME, 'Transit batches removed successfully', {
      orderId,
      removedCount: transitBatchesToRemove.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to remove transit batches', { error, orderId })
    throw error
  }
}

/**
 * Генерирует номер для транзитного batch-а
 */
function generateTransitBatchNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
  const timeStr =
    date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0')
  const sequence = state.value.batches.filter(b => b.status === 'in_transit').length + 1

  return `TRN-${dateStr}-${timeStr}-${sequence.toString().padStart(3, '0')}`
}

/**
 * Получает транзитные batch-и для конкретного заказа
 */
function getTransitBatchesByOrder(purchaseOrderId: string): StorageBatch[] {
  return transitBatches.value.filter(batch => batch.purchaseOrderId === purchaseOrderId)
}

const transitBatches = computed(() => {
  return state.value.batches.filter(batch => batch.status === 'in_transit')
})

const balancesWithTransit = computed((): StorageBalanceWithTransit[] => {
  const transit = transitBatches.value

  return state.value.balances.map(balance => {
    // Найти транзитные batch-и для этого товара и департамента
    const itemTransitBatches = transit.filter(
      batch => batch.itemId === balance.itemId && batch.department === balance.department
    )

    const transitQuantity = itemTransitBatches.reduce(
      (sum, batch) => sum + batch.currentQuantity,
      0
    )
    const transitValue = itemTransitBatches.reduce((sum, batch) => sum + batch.totalValue, 0)

    // Найти ближайшую ожидаемую доставку
    const deliveryDates = itemTransitBatches
      .map(b => b.plannedDeliveryDate)
      .filter(date => date)
      .sort()

    const extendedBalance: StorageBalanceWithTransit = {
      ...balance,
      transitQuantity,
      transitValue,
      totalWithTransit: balance.totalQuantity + transitQuantity,
      nearestDelivery: deliveryDates[0] || undefined,
      transitBatches: itemTransitBatches
    }

    return extendedBalance
  })
})

const transitMetrics = computed(() => {
  const transit = transitBatches.value
  const now = new Date()

  // Подсчет просроченных доставок
  const overdueTransit = transit.filter(batch => {
    if (!batch.plannedDeliveryDate) return false
    return new Date(batch.plannedDeliveryDate) < now
  })

  // Подсчет доставок сегодня
  const dueTodayTransit = transit.filter(batch => {
    if (!batch.plannedDeliveryDate) return false
    const deliveryDate = new Date(batch.plannedDeliveryDate)
    return deliveryDate.toDateString() === now.toDateString()
  })

  return {
    totalTransitBatches: transit.length,
    totalTransitOrders: new Set(transit.map(b => b.purchaseOrderId)).size,
    totalTransitValue: transit.reduce((sum, b) => sum + b.totalValue, 0),
    overdueCount: overdueTransit.length,
    overdueValue: overdueTransit.reduce((sum, b) => sum + b.totalValue, 0),
    dueTodayCount: dueTodayTransit.length,
    dueTodayValue: dueTodayTransit.reduce((sum, b) => sum + b.totalValue, 0)
  }
})

// ===========================
// HELPER FUNCTIONS ДЛЯ ТРАНЗИТА
// ===========================

function getTransitBatchesForItem(itemId: string, department: StorageDepartment) {
  return transitBatches.value.filter(
    batch => batch.itemId === itemId && batch.department === department
  )
}

function isTransitDeliveryOverdue(plannedDate?: string): boolean {
  if (!plannedDate) return false
  return new Date(plannedDate) < new Date()
}

function isTransitDeliveryToday(plannedDate?: string): boolean {
  if (!plannedDate) return false
  const deliveryDate = new Date(plannedDate)
  const today = new Date()
  return deliveryDate.toDateString() === today.toDateString()
}

// ===========================
// INITIALIZATION - ИСПОЛЬЗУЕТ MockDataCoordinator
// ===========================

async function initialize() {
  try {
    DebugUtils.info(MODULE_NAME, 'Initializing storage store with MockDataCoordinator')

    state.value.loading.balances = true
    state.value.error = null

    const productsStore = useProductsStore()
    if (productsStore.products.length === 0) {
      await productsStore.loadProducts(true)
    }

    // ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Инициализируем service с координатором
    await storageService.initialize()

    // ✅ Загружаем ВСЕ данные включая батчи
    await Promise.all([fetchBalances(), fetchOperations(), fetchInventories()])

    DebugUtils.info(MODULE_NAME, 'Storage store initialized successfully', {
      balances: state.value.balances.length,
      batches: state.value.batches.length,
      operations: state.value.operations.length,
      inventories: state.value.inventories.length,
      unitSystem: 'BASE_UNITS (gram/ml/piece)'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize storage store'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.balances = false
  }
}

// ===========================
// DATA FETCHING - ОБНОВЛЕНО ДЛЯ КООРДИНАТОРА
// ===========================

async function fetchBalances(department?: StorageDepartment) {
  try {
    state.value.loading.balances = true
    state.value.error = null

    // ❌ БЫЛО (загружались только активные батчи):
    // const [balances, batches] = await Promise.all([
    //   storageService.getBalances(department),
    //   storageService.getBatches(department)  // ← Только активные!
    // ])

    // ✅ ИСПРАВЛЕНО (загружаются ВСЕ батчи):
    const [balances, batches] = await Promise.all([
      storageService.getBalances(department),
      storageService.getAllBatches(department) // ← ВСЕ батчи (активные + транзитные)
    ])

    state.value.balances = balances
    state.value.batches = batches

    DebugUtils.debug(MODULE_NAME, 'Balances and batches fetched', {
      balances: balances.length,
      batches: batches.length,
      activeBatches: batches.filter(b => b.status === 'active').length,
      transitBatches: batches.filter(b => b.status === 'in_transit').length,
      department: department || 'all'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch balances'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.balances = false
  }
}

async function fetchOperations(department?: StorageDepartment) {
  try {
    state.value.loading.operations = true
    state.value.error = null

    const operations = await storageService.getOperations(department)
    state.value.operations = operations

    DebugUtils.debug(MODULE_NAME, 'Operations fetched', {
      operations: operations.length,
      department: department || 'all'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch operations'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.operations = false
  }
}

async function fetchInventories(department?: StorageDepartment) {
  try {
    state.value.loading.inventory = true
    state.value.error = null

    const inventories = await storageService.getInventories(department)
    state.value.inventories = inventories

    DebugUtils.debug(MODULE_NAME, 'Inventories fetched', {
      inventories: inventories.length,
      department: department || 'all'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventories'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.inventory = false
  }
}

// ===========================
// CRUD OPERATIONS - БАЗОВЫЕ ЕДИНИЦЫ
// ===========================

async function createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
  try {
    state.value.loading.correction = true
    state.value.error = null

    DebugUtils.info(MODULE_NAME, 'Creating correction in BASE UNITS', {
      department: data.department,
      items: data.items.length,
      reason: data.correctionDetails.reason
    })

    const operation = await storageService.createCorrection(data)
    state.value.operations.unshift(operation)

    // ✅ Синхронизируем балансы И батчи после операции
    await fetchBalances(data.department)

    DebugUtils.info(MODULE_NAME, 'Correction created successfully', {
      operationId: operation.id,
      unitSystem: 'BASE_UNITS'
    })

    return operation
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create correction'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.correction = false
  }
}

async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
  try {
    state.value.loading.correction = true
    state.value.error = null

    DebugUtils.info(MODULE_NAME, 'Creating receipt in BASE UNITS', {
      department: data.department,
      items: data.items.length,
      sourceType: data.sourceType
    })

    const operation = await storageService.createReceipt(data)
    state.value.operations.unshift(operation)

    // ✅ Синхронизируем данные после создания
    await fetchBalances(data.department)

    DebugUtils.info(MODULE_NAME, 'Receipt created successfully', {
      operationId: operation.id,
      unitSystem: 'BASE_UNITS'
    })

    return operation
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create receipt'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.correction = false
  }
}

// ===========================
// WRITE-OFF SUPPORT
// ===========================

async function createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
  try {
    state.value.loading.writeOff = true
    state.value.error = null

    DebugUtils.info(MODULE_NAME, 'Creating write-off in BASE UNITS', {
      department: data.department,
      reason: data.reason,
      items: data.items.length
    })

    const operation = await storageService.createWriteOff(data)
    state.value.operations.unshift(operation)

    // ✅ Синхронизируем все данные включая батчи
    await fetchBalances(data.department)

    DebugUtils.info(MODULE_NAME, 'Write-off created successfully', {
      operationId: operation.id,
      reason: data.reason,
      unitSystem: 'BASE_UNITS'
    })

    return operation
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create write-off'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.writeOff = false
  }
}

function getWriteOffStatistics(department?: any, dateFrom?: any, dateTo?: any) {
  return storageService.getWriteOffStatistics(department, dateFrom, dateTo)
}

// ===========================
// INVENTORY OPERATIONS
// ===========================

async function startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
  try {
    state.value.loading.inventory = true
    state.value.error = null

    const inventory = await storageService.startInventory(data)
    state.value.inventories.unshift(inventory)

    return inventory
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start inventory'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.inventory = false
  }
}

async function updateInventory(
  inventoryId: string,
  items: InventoryItem[]
): Promise<InventoryDocument> {
  try {
    state.value.loading.inventory = true
    state.value.error = null

    const inventory = await storageService.updateInventory(inventoryId, items)

    // Обновляем в локальном состоянии
    const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
    if (index !== -1) {
      state.value.inventories[index] = inventory
    }

    return inventory
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update inventory'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.inventory = false
  }
}

async function finalizeInventory(inventoryId: string): Promise<InventoryDocument> {
  try {
    state.value.loading.inventory = true
    state.value.error = null

    const inventory = await storageService.finalizeInventory(inventoryId)

    // Обновляем в локальном состоянии
    const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
    if (index !== -1) {
      state.value.inventories[index] = inventory
    }

    // Обновляем балансы после финализации
    await fetchBalances(inventory.department)

    return inventory
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to finalize inventory'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.inventory = false
  }
}

// ===========================
// HELPER METHODS
// ===========================

function getItemName(itemId: string): string {
  const productsStore = useProductsStore()
  const product = productsStore.products.find(p => p.id === itemId)
  return product?.name || 'Unknown Product'
}

function getItemUnit(itemId: string): string {
  const productDef = mockDataCoordinator.getProductDefinition(itemId)
  return productDef?.baseUnit || 'piece'
}

function getItemCostPerUnit(itemId: string): number {
  const productDef = mockDataCoordinator.getProductDefinition(itemId)
  return productDef?.baseCostPerUnit || 0
}

function getItemBatches(itemId: string, department: StorageDepartment): StorageBatch[] {
  return state.value.batches.filter(
    b => b.itemId === itemId && b.department === department && b.status === 'active'
  )
}

function getBatchById(batchId: string): StorageBatch | undefined {
  return state.value.batches.find(b => b.id === batchId)
}

// ===========================
// FILTER ACTIONS
// ===========================

function setDepartmentFilter(department: StorageDepartment | 'all') {
  state.value.filters.department = department
}

function setOperationTypeFilter(operationType?: typeof state.value.filters.operationType) {
  state.value.filters.operationType = operationType
}

function setSearchFilter(search: string) {
  state.value.filters.search = search
}

function toggleExpiredFilter() {
  state.value.filters.showExpired = !state.value.filters.showExpired
}

function toggleLowStockFilter() {
  state.value.filters.showBelowMinStock = !state.value.filters.showBelowMinStock
}

function toggleNearExpiryFilter() {
  state.value.filters.showNearExpiry = !state.value.filters.showNearExpiry
}

function clearFilters() {
  state.value.filters = {
    department: 'all',
    operationType: undefined,
    showExpired: false,
    showBelowMinStock: false,
    showNearExpiry: false,
    search: '',
    dateFrom: undefined,
    dateTo: undefined
  }
}

// ===========================
// UTILITIES
// ===========================

function clearError() {
  state.value.error = null
}

function getBalance(itemId: string, department: StorageDepartment) {
  return state.value.balances.find(
    b => b.itemId === itemId && b.itemType === 'product' && b.department === department
  )
}

function getOperation(operationId: string) {
  return state.value.operations.find(op => op.id === operationId)
}

function getInventory(inventoryId: string) {
  return state.value.inventories.find(inv => inv.id === inventoryId)
}

// ===========================
// COMPOSABLE EXPORT
// ===========================

export function useStorageStore() {
  const productsStore = useProductsStore()

  return {
    // State
    state: state,

    // Existing computed
    filteredBalances,
    filteredOperations,
    totalStockValue,
    lowStockItemsCount,
    expiredItemsCount,
    nearExpiryItemsCount,
    departmentBalances,

    // ✅ ТРАНЗИТНЫЕ computed
    transitBatches: readonly(transitBatches),
    balancesWithTransit: readonly(balancesWithTransit),
    transitMetrics: readonly(transitMetrics),

    // Core actions
    initialize,
    fetchBalances,
    fetchOperations,
    fetchInventories,

    // CRUD operations
    createCorrection,
    createReceipt,
    createWriteOff,

    // Inventory operations
    startInventory,
    updateInventory,
    finalizeInventory,

    // Write-off statistics
    getWriteOffStatistics,

    // Helper methods
    getItemName,
    getItemUnit,
    getItemCostPerUnit,
    getItemBatches,
    getBatchById,

    // ✅ СУЩЕСТВУЮЩИЕ helper-ы для транзита
    getTransitBatchesForItem,
    isTransitDeliveryOverdue,
    isTransitDeliveryToday,

    // ✅ НОВЫЕ методы для транзита
    createTransitBatches,
    convertTransitBatchesToActive,
    removeTransitBatchesOnOrderCancel,
    generateTransitBatchNumber,
    getTransitBatchesByOrder,

    // Filter actions
    setDepartmentFilter,
    setOperationTypeFilter,
    setSearchFilter,
    toggleExpiredFilter,
    toggleLowStockFilter,
    toggleNearExpiryFilter,
    clearFilters,

    // Utilities
    clearError,
    getBalance,
    getOperation,
    getInventory,

    // External stores
    productsStore
  }
}

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  ;(window as any).__STORAGE_STORE__ = { state, useStorageStore }
  ;(window as any).__TEST_STORAGE_STORE_INTEGRATION__ = async () => {
    console.log('=== STORAGE STORE INTEGRATION TEST ===')

    try {
      const store = useStorageStore()
      await store.initialize()

      console.log('✅ Store initialized successfully')
      console.log(`📦 Balances: ${store.state.value.balances.length}`)
      console.log(`🏷️ Batches: ${store.state.value.batches.length}`)
      console.log(`📋 Operations: ${store.state.value.operations.length}`)
      console.log(`📊 Inventories: ${store.state.value.inventories.length}`)

      // Тестируем несколько балансов
      store.state.value.balances.slice(0, 3).forEach(balance => {
        const productDef = mockDataCoordinator.getProductDefinition(balance.itemId)
        console.log(`\n📦 ${balance.itemName} (${balance.department}):`)
        console.log(`   Stock: ${balance.totalQuantity} ${balance.unit}`)
        console.log(`   Expected unit: ${productDef?.baseUnit}`)
        console.log(`   Cost: ${balance.latestCost} IDR/${balance.unit}`)
        console.log(`   ✅ Unit correct: ${balance.unit === productDef?.baseUnit}`)
        console.log(`   ✅ Cost source: baseCostPerUnit`)
      })

      // Проверяем что filteredBalances работает
      console.log('\n=== FILTERED DATA TEST ===')
      console.log(`Filtered balances: ${store.filteredBalances.value.length}`)
      console.log(`Filtered operations: ${store.filteredOperations.value.length}`)
      console.log(`Total stock value: ${store.totalStockValue.value} IDR`)
      console.log(`Low stock items: ${store.lowStockItemsCount.value}`)
      console.log(`Expired items: ${store.expiredItemsCount.value}`)
      console.log(`Near expiry items: ${store.nearExpiryItemsCount.value}`)

      // ✅ ТЕСТИРУЕМ: departmentBalances функцию
      console.log('\n=== DEPARTMENT BALANCES TEST ===')
      const kitchenBalances = store.departmentBalances('kitchen')
      const barBalances = store.departmentBalances('bar')
      console.log(`Kitchen balances: ${kitchenBalances.length}`)
      console.log(`Bar balances: ${barBalances.length}`)

      return {
        balances: store.state.value.balances,
        batches: store.state.value.batches,
        operations: store.state.value.operations,
        statistics: {
          totalValue: store.totalStockValue.value,
          lowStock: store.lowStockItemsCount.value,
          expired: store.expiredItemsCount.value,
          nearExpiry: store.nearExpiryItemsCount.value
        }
      }
    } catch (error) {
      console.error('❌ Storage store integration test failed:', error)
      throw error
    }
  }

  setTimeout(() => {
    console.log('\n🎯 UPDATED Storage Store loaded!')
    console.log('🔧 Now integrated with MockDataCoordinator')
    console.log('📏 All data in BASE UNITS (gram/ml/piece)')
    console.log('🔄 No more duplicate mock data generation')
    console.log('✅ Added departmentBalances function')
    console.log('\nAvailable commands:')
    console.log('• window.__TEST_STORAGE_STORE_INTEGRATION__()')
  }, 100)
}
