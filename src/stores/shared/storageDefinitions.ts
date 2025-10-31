// src/stores/shared/storageDefinitions.ts
// FIXED: Use whole numbers for all physical quantities

import { DebugUtils, TimeUtils } from '@/utils'
import { CORE_PRODUCTS, getProductDefinition } from './productDefinitions'
import type {
  StorageBatch,
  StorageOperation,
  StorageBalance,
  StorageDepartment,
  BatchAllocation
} from '@/stores/storage/types'
import { type CoreProductDefinition } from './productDefinitions'
const MODULE_NAME = 'StorageDefinitions'

// =============================================
// CORE STORAGE WORKFLOW DEFINITIONS
// =============================================

export interface CoreStorageWorkflow {
  batches: StorageBatch[]
  operations: StorageOperation[]
  balances: StorageBalance[]
}

// =============================================
// КОНФИГУРАЦИЯ СКЛАДА
// =============================================

interface StorageConfig {
  // Процент продуктов с нулевым остатком
  zeroStockChance: number
  // Процент продуктов с низким остатком
  lowStockChance: number
  // Множитель для максимального запаса
  maxStockMultiplier: number
  // Максимальное количество дней назад для операций
  maxHistoryDays: number
}

const STORAGE_CONFIG: StorageConfig = {
  zeroStockChance: 0.1, // 10% продуктов с нулевым остатком
  lowStockChance: 0.3, // 30% продуктов с низким остатком
  maxStockMultiplier: 3, // Максимальный запас = минимальный * 3
  maxHistoryDays: 30 // Операции за последние 30 дней
}

// =============================================
// UTILITY FUNCTIONS FOR WHOLE NUMBERS
// =============================================

/**
 * ✅ Rounds quantity to appropriate whole numbers based on unit type
 */
function roundToWholeQuantity(quantity: number, unit: string): number {
  // All physical units should be whole numbers
  if (unit === 'gram' || unit === 'ml' || unit === 'piece') {
    return Math.round(quantity)
  }

  // Fallback for any other units
  return Math.round(quantity)
}

/**
 * ✅ Calculates total value with proper rounding
 */
function calculateTotalValue(quantity: number, costPerUnit: number): number {
  return Math.round(quantity * costPerUnit)
}

// =============================================
// ГЕНЕРАЦИЯ БАТЧЕЙ В БАЗОВЫХ ЕДИНИЦАХ
// =============================================

/**
 * ✅ Генерирует батчи для продукта в базовых единицах (ЦЕЛЫЕ ЧИСЛА)
 */
function generateProductBatches(
  productId: string,
  department: StorageDepartment,
  targetTotalQuantity: number
): StorageBatch[] {
  const product = getProductDefinition(productId)
  if (!product) return []

  const batches: StorageBatch[] = []
  let remainingQuantity = Math.round(targetTotalQuantity) // ✅ Start with whole number

  // Создаем 1-3 батча для достижения целевого количества
  const batchCount = Math.min(3, Math.ceil(Math.random() * 2) + 1)

  for (let i = 0; i < batchCount && remainingQuantity > 0; i++) {
    const isLastBatch = i === batchCount - 1
    let batchQuantity: number

    if (isLastBatch) {
      batchQuantity = remainingQuantity
    } else {
      const ratio = 0.3 + Math.random() * 0.4
      batchQuantity = Math.min(remainingQuantity, Math.round(remainingQuantity * ratio))
      // Ensure at least 1 unit per batch
      batchQuantity = Math.max(1, batchQuantity)
    }

    const daysAgo = Math.floor(Math.random() * 14) // Батчи за последние 2 недели
    const receiptDate = TimeUtils.getDateDaysAgo(daysAgo)

    // Срок годности зависит от типа продукта
    let expiryDate: string | undefined
    if (product.shelfLifeDays > 0) {
      const expiryDaysFromReceipt = Math.floor(product.shelfLifeDays * (0.7 + Math.random() * 0.3))
      const expiryFromNow = expiryDaysFromReceipt - daysAgo

      if (expiryFromNow > 0) {
        expiryDate = TimeUtils.getDateDaysFromNow(expiryFromNow)
      }
    }

    batches.push({
      id: `batch-${productId}-${department}-${i + 1}`,
      batchNumber: generateBatchNumber(productId, receiptDate),
      itemId: productId,
      itemType: 'product',
      initialQuantity: batchQuantity, // ✅ Целое число
      currentQuantity: batchQuantity, // ✅ Целое число
      unit: product.baseUnit, // ✅ Базовая единица (gram/ml/piece)
      costPerUnit: product.baseCostPerUnit, // ✅ Цена за базовую единицу
      totalValue: calculateTotalValue(batchQuantity, product.baseCostPerUnit),
      receiptDate,
      expiryDate,
      sourceType: 'purchase',
      status: expiryDate && new Date(expiryDate) < new Date() ? 'expired' : 'active',
      isActive: true,
      createdAt: receiptDate,
      updatedAt: receiptDate
    })

    remainingQuantity -= batchQuantity
  }

  return batches
}

/**
 * ✅ Генерирует номер батча
 */
function generateBatchNumber(productId: string, receiptDate: string): string {
  const date = new Date(receiptDate)
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const productCode = productId.split('-').pop()?.toUpperCase() || 'UNK'
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')

  return `${dateStr}-${productCode}-${random}`
}

// =============================================
// ГЕНЕРАЦИЯ БАЛАНСОВ В БАЗОВЫХ ЕДИНИЦАХ
// =============================================

/**
 * ✅ Генерирует баланс для продукта в определенном департаменте (ЦЕЛЫЕ ЧИСЛА)
 */
function generateProductBalance(
  productId: string,
  department: StorageDepartment
): StorageBalance | null {
  const product = getProductDefinition(productId)
  if (!product) return null

  // Определяем нужно ли этому продукту быть в этом департаменте
  if (!shouldProductBeInDepartment(productId, department)) {
    return null
  }

  // Вычисляем текущий остаток на основе конфигурации
  const targetStock = calculateTargetStock(product)

  // Генерируем батчи для достижения целевого остатка
  const batches = generateProductBatches(productId, department, targetStock)

  // Вычисляем общие показатели (все в целых числах)
  const totalQuantity = batches.reduce((sum, batch) => sum + batch.currentQuantity, 0)
  const totalValue = batches.reduce((sum, batch) => sum + batch.totalValue, 0)
  const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : product.baseCostPerUnit

  // Находим даты
  const sortedBatches = batches.sort(
    (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
  )

  const oldestBatchDate = sortedBatches[0]?.receiptDate || TimeUtils.getCurrentLocalISO()
  const newestBatchDate =
    sortedBatches[sortedBatches.length - 1]?.receiptDate || TimeUtils.getCurrentLocalISO()

  // Проверки состояния
  const hasExpired = batches.some(b => b.status === 'expired')
  const hasNearExpiry = batches.some(b => {
    if (!b.expiryDate) return false
    const daysToExpiry = Math.ceil(
      (new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysToExpiry <= 3 && daysToExpiry > 0
  })

  // Минимальный запас для проверки (целые числа)
  const minStock = Math.max(
    Math.round(product.dailyConsumption * (product.leadTimeDays + 3)),
    Math.round(product.dailyConsumption)
  )
  const belowMinStock = totalQuantity < minStock

  return {
    itemId: productId,
    itemType: 'product',
    itemName: product.name,
    department,
    totalQuantity, // ✅ Уже целое число
    unit: product.baseUnit, // ✅ Базовая единица
    totalValue: Math.round(totalValue),
    averageCost: Math.round(averageCost * 1000) / 1000, // Точность до 3 знаков для цены
    latestCost: product.baseCostPerUnit, // ✅ Цена за базовую единицу
    costTrend: 'stable', // Упрощенно для мока
    batches,
    oldestBatchDate,
    newestBatchDate,
    hasExpired,
    hasNearExpiry,
    belowMinStock,
    averageDailyUsage: Math.round(product.dailyConsumption), // ✅ Целое число
    daysOfStockRemaining:
      totalQuantity > 0 ? Math.floor(totalQuantity / product.dailyConsumption) : 0,
    lastCalculated: TimeUtils.getCurrentLocalISO(),
    id: `balance-${productId}-${department}`,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
}

/**
 * ✅ Определяет должен ли продукт быть в департаменте
 */
function shouldProductBeInDepartment(productId: string, department: StorageDepartment): boolean {
  const product = getProductDefinition(productId)
  if (!product) return false

  // ✅ НОВАЯ ЛОГИКА: проверяем usedInDepartments
  return product.usedInDepartments.includes(department)
}

/**
 * ✅ Вычисляет целевой остаток для продукта (ЦЕЛЫЕ ЧИСЛА)
 */
function calculateTargetStock(product: CoreProductDefinition): number {
  const minStock = Math.round(product.dailyConsumption * (product.leadTimeDays + 3)) // Минимум + страховой запас
  const maxStock = Math.round(minStock * STORAGE_CONFIG.maxStockMultiplier)

  const rand = Math.random()

  // 10% продуктов с нулевым остатком
  if (rand < STORAGE_CONFIG.zeroStockChance) {
    return 0
  }

  // 30% продуктов с низким остатком
  if (rand < STORAGE_CONFIG.lowStockChance) {
    return Math.round(Math.random() * minStock * 0.5)
  }

  // Остальные между минимумом и максимумом
  return Math.round(minStock + Math.random() * (maxStock - minStock))
}

// =============================================
// ГЕНЕРАЦИЯ ОПЕРАЦИЙ СКЛАДА
// =============================================

/**
 * ✅ Генерирует операции склада за период (ЦЕЛЫЕ ЧИСЛА)
 */
function generateStorageOperations(): StorageOperation[] {
  const operations: StorageOperation[] = []

  // Генерируем операции за последние дни
  for (let daysAgo = STORAGE_CONFIG.maxHistoryDays; daysAgo > 0; daysAgo--) {
    const operationDate = TimeUtils.getDateDaysAgo(daysAgo)

    // Генерируем 1-3 операции в день
    const operationsPerDay = Math.floor(Math.random() * 3) + 1

    for (let i = 0; i < operationsPerDay; i++) {
      const operation = generateRandomOperation(operationDate, i)
      if (operation) {
        operations.push(operation)
      }
    }
  }

  return operations.sort(
    (a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
  )
}

/**
 * ✅ Генерирует случайную операцию склада (ЦЕЛЫЕ ЧИСЛА)
 */
function generateRandomOperation(operationDate: string, index: number): StorageOperation | null {
  const operationTypes = ['receipt', 'correction', 'write_off'] as const
  const operationType = operationTypes[Math.floor(Math.random() * operationTypes.length)]

  const departments: StorageDepartment[] = ['kitchen', 'bar']
  const department = departments[Math.floor(Math.random() * departments.length)]

  // Выбираем продукты для этого департамента
  const availableProducts = CORE_PRODUCTS.filter(p => shouldProductBeInDepartment(p.id, department))

  if (availableProducts.length === 0) return null

  const selectedProducts = availableProducts
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 3) + 1) // 1-3 продукта

  const items = selectedProducts.map((product, itemIndex) => {
    const quantity = generateReasonableQuantity(product)
    const batchAllocations = generateBatchAllocations(product, quantity)

    return {
      id: `item-${operationDate}-${index}-${itemIndex}`,
      itemId: product.id,
      itemType: 'product' as const,
      itemName: product.name,
      quantity, // ✅ Уже целое число
      unit: product.baseUnit, // ✅ Базовая единица
      batchAllocations,
      totalCost: calculateTotalValue(quantity, product.baseCostPerUnit),
      averageCostPerUnit: product.baseCostPerUnit
    }
  })

  const totalValue = items.reduce((sum, item) => sum + (item.totalCost || 0), 0)

  const operation: StorageOperation = {
    id: `op-${operationDate}-${operationType}-${index}`,
    operationType,
    documentNumber: generateDocumentNumber(operationType, operationDate, index),
    operationDate,
    department,
    responsiblePerson: getRandomResponsiblePerson(),
    items,
    totalValue,
    status: 'confirmed',
    createdAt: operationDate,
    updatedAt: operationDate
  }

  // Добавляем специфичные детали для типов операций
  if (operationType === 'write_off') {
    operation.writeOffDetails = {
      reason: getRandomWriteOffReason(),
      affectsKPI: Math.random() > 0.7, // 30% операций влияют на KPI
      notes: 'Generated for testing'
    }
  }

  if (operationType === 'correction') {
    operation.correctionDetails = {
      reason: getRandomCorrectionReason(),
      notes: 'Inventory adjustment'
    }
  }

  return operation
}

/**
 * ✅ Генерирует разумное количество для продукта в базовых единицах (ЦЕЛЫЕ ЧИСЛА)
 */
function generateReasonableQuantity(product: CoreProductDefinition): number {
  const dailyConsumption = Math.round(product.dailyConsumption)

  // Для разных типов операций разные логики
  const operationSize = Math.random()

  let quantity: number

  if (operationSize < 0.3) {
    // Маленькая операция (0.5-2 дня потребления)
    quantity = Math.round(dailyConsumption * (0.5 + Math.random() * 1.5))
  } else if (operationSize < 0.7) {
    // Средняя операция (2-7 дней потребления)
    quantity = Math.round(dailyConsumption * (2 + Math.random() * 5))
  } else {
    // Большая операция (1-2 недели потребления)
    quantity = Math.round(dailyConsumption * (7 + Math.random() * 7))
  }

  // Ensure at least 1 unit
  return Math.max(1, quantity)
}

/**
 * ✅ Генерирует распределения по батчам (FIFO логика) (ЦЕЛЫЕ ЧИСЛА)
 */
function generateBatchAllocations(
  product: CoreProductDefinition,
  totalQuantity: number
): BatchAllocation[] {
  // Упрощенная версия для мока - один батч
  const batchDate = TimeUtils.getDateDaysAgo(Math.floor(Math.random() * 7))

  return [
    {
      batchId: `batch-${product.id}-${Date.now()}`,
      batchNumber: generateBatchNumber(product.id, batchDate),
      quantity: totalQuantity, // ✅ Уже целое число
      costPerUnit: product.baseCostPerUnit,
      batchDate
    }
  ]
}

// =============================================
// УТИЛИТЫ ГЕНЕРАЦИИ
// =============================================

function generateDocumentNumber(operationType: string, date: string, index: number): string {
  const prefixes = {
    receipt: 'RC',
    correction: 'CR',
    write_off: 'WO',
    inventory: 'IV'
  }

  const prefix = prefixes[operationType as keyof typeof prefixes] || 'OP'
  const dateStr = date.slice(2, 10).replace(/-/g, '') // YYMMDD
  const indexStr = String(index + 1).padStart(2, '0')

  return `${prefix}-${dateStr}-${indexStr}`
}

function getRandomResponsiblePerson(): string {
  const people = [
    'Андрей Смирнов',
    'Елена Петрова',
    'Михаил Коваленко',
    'Анна Белова',
    'Дмитрий Новиков'
  ]

  return people[Math.floor(Math.random() * people.length)]
}

function getRandomWriteOffReason(): 'expired' | 'spoiled' | 'other' | 'education' | 'test' {
  const reasons = ['expired', 'spoiled', 'other', 'education', 'test'] as const
  const weights = [0.4, 0.3, 0.1, 0.1, 0.1] // Чаще порча и истечение срока

  const rand = Math.random()
  let cumulative = 0

  for (let i = 0; i < reasons.length; i++) {
    cumulative += weights[i]
    if (rand <= cumulative) {
      return reasons[i]
    }
  }

  return 'other'
}

function getRandomCorrectionReason():
  | 'recipe_usage'
  | 'waste'
  | 'expired'
  | 'theft'
  | 'damage'
  | 'other' {
  const reasons = ['recipe_usage', 'waste', 'expired', 'theft', 'damage', 'other'] as const
  const weights = [0.5, 0.2, 0.1, 0.05, 0.1, 0.05] // Чаще использование в рецептах

  const rand = Math.random()
  let cumulative = 0

  for (let i = 0; i < reasons.length; i++) {
    cumulative += weights[i]
    if (rand <= cumulative) {
      return reasons[i]
    }
  }

  return 'other'
}

// =============================================
// ЭКСПОРТ ДАННЫХ ДЛЯ ИНТЕГРАЦИИ
// =============================================

/**
 * ✅ Получает готовые данные склада (кешируется)
 */
let cachedStorageData: CoreStorageWorkflow | null = null

export function getStorageWorkflowData(): CoreStorageWorkflow {
  if (cachedStorageData) {
    return cachedStorageData
  }

  cachedStorageData = generateStorageWorkflowData()
  return cachedStorageData
}

/**
 * ✅ Принудительно пересоздает данные склада
 */
export function regenerateStorageData(): CoreStorageWorkflow {
  cachedStorageData = null
  return getStorageWorkflowData()
}

/**
 * ✅ Генерирует полные данные склада в базовых единицах (ЦЕЛЫЕ ЧИСЛА)
 */
function generateStorageWorkflowData(): CoreStorageWorkflow {
  const balances: StorageBalance[] = []
  const allBatches: StorageBatch[] = []

  // ✅ ИСПРАВЛЕНО: Генерируем для всех департаментов где продукт используется
  CORE_PRODUCTS.forEach(product => {
    const departments: StorageDepartment[] = ['kitchen', 'bar']

    departments.forEach(dept => {
      if (product.usedInDepartments.includes(dept)) {
        const balance = generateProductBalance(product.id, dept)
        if (balance) {
          balances.push(balance)
          allBatches.push(...balance.batches)
        }
      }
    })
  })

  const transitBatches = generateTransitTestBatches()
  allBatches.push(...transitBatches)

  const operations = generateStorageOperations()

  return { balances, batches: allBatches, operations }
}

/**
 * ✅ ОБНОВЛЕНО: Генерирует тестовые транзитные batch-и с НОВЫМ форматом ID
 */
function generateTransitTestBatches(): StorageBatch[] {
  const transitBatches: StorageBatch[] = []
  const now = new Date()

  // ============================================
  // PO-USING-CREDIT (4 позиции)
  // ============================================
  const futureDelivery = new Date(now)
  futureDelivery.setDate(now.getDate() - 1)

  // Helper для генерации правильного batch number
  const generateTransitBatchNumber = (orderId: string, index: number): string => {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const orderPrefix = orderId.replace('po-', '').replace(/-/g, '').substring(0, 12).toUpperCase()
    return `TRN-${dateStr}-${orderPrefix}-${index.toString().padStart(2, '0')}`
  }

  transitBatches.push({
    // ✅ НОВЫЙ ФОРМАТ: transit-{orderId}-{itemId}-{index}
    id: 'transit-po-using-credit-prod-beef-steak-0',
    batchNumber: generateTransitBatchNumber('po-using-credit', 0),
    itemId: 'prod-beef-steak',
    itemType: 'product',
    initialQuantity: 3000,
    currentQuantity: 3000,
    unit: 'gram',
    costPerUnit: 180,
    totalValue: 540000,
    receiptDate: futureDelivery.toISOString(),
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,
    purchaseOrderId: 'po-using-credit',
    supplierId: 'sup-premium-meat-co',
    supplierName: 'Premium Meat Company',
    plannedDeliveryDate: futureDelivery.toISOString(),
    notes: 'Transit batch для заказа использующего кредит',
    createdAt: futureDelivery.toISOString(),
    updatedAt: futureDelivery.toISOString()
  })

  transitBatches.push({
    id: 'transit-po-using-credit-prod-garlic-1',
    batchNumber: generateTransitBatchNumber('po-using-credit', 1),
    itemId: 'prod-garlic',
    itemType: 'product',
    initialQuantity: 1000,
    currentQuantity: 1000,
    unit: 'gram',
    costPerUnit: 25,
    totalValue: 25000,
    receiptDate: futureDelivery.toISOString(),
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,
    purchaseOrderId: 'po-using-credit',
    supplierId: 'sup-premium-meat-co',
    supplierName: 'Premium Meat Company',
    plannedDeliveryDate: futureDelivery.toISOString(),
    notes: 'Transit batch для заказа использующего кредит',
    createdAt: futureDelivery.toISOString(),
    updatedAt: futureDelivery.toISOString()
  })

  transitBatches.push({
    id: 'transit-po-using-credit-prod-milk-2',
    batchNumber: generateTransitBatchNumber('po-using-credit', 2),
    itemId: 'prod-milk',
    itemType: 'product',
    initialQuantity: 15000,
    currentQuantity: 15000,
    unit: 'ml',
    costPerUnit: 15,
    totalValue: 225000,
    receiptDate: futureDelivery.toISOString(),
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,
    purchaseOrderId: 'po-using-credit',
    supplierId: 'sup-premium-meat-co',
    supplierName: 'Premium Meat Company',
    plannedDeliveryDate: futureDelivery.toISOString(),
    notes: 'Transit batch для заказа использующего кредит',
    createdAt: futureDelivery.toISOString(),
    updatedAt: futureDelivery.toISOString()
  })

  transitBatches.push({
    id: 'transit-po-using-credit-prod-olive-oil-3',
    batchNumber: generateTransitBatchNumber('po-using-credit', 3),
    itemId: 'prod-olive-oil',
    itemType: 'product',
    initialQuantity: 1000,
    currentQuantity: 1000,
    unit: 'ml',
    costPerUnit: 85,
    totalValue: 85000,
    receiptDate: futureDelivery.toISOString(),
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,
    purchaseOrderId: 'po-using-credit',
    supplierId: 'sup-premium-meat-co',
    supplierName: 'Premium Meat Company',
    plannedDeliveryDate: futureDelivery.toISOString(),
    notes: 'Transit batch для заказа использующего кредит',
    createdAt: futureDelivery.toISOString(),
    updatedAt: futureDelivery.toISOString()
  })

  // ============================================
  // PO-003 (1 позиция - Tomato)
  // ============================================
  transitBatches.push({
    id: 'transit-po-003-prod-tomato-0',
    batchNumber: generateTransitBatchNumber('po-003', 0),
    itemId: 'prod-tomato',
    itemType: 'product',
    initialQuantity: 5000,
    currentQuantity: 5000,
    unit: 'gram',
    costPerUnit: 12,
    totalValue: 60000,
    receiptDate: now.toISOString(),
    sourceType: 'purchase',
    status: 'in_transit',
    isActive: false,
    purchaseOrderId: 'po-003',
    supplierId: 'sup-fresh-veg-market',
    supplierName: 'Fresh Vegetable Market',
    plannedDeliveryDate: now.toISOString(),
    notes: 'Transit batch для PO-003 - ожидается доставка сегодня',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  })

  return transitBatches
}
// =============================================
// ЭКСПОРТИРУЕМЫЕ УТИЛИТЫ
// =============================================

export { generateBatchNumber }

/**
 * ✅ Валидация данных склада (проверяет целые числа)
 */
export function validateStorageDefinitions(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const storageData = getStorageWorkflowData()

    // Проверяем что все количества целые числа
    storageData.balances.forEach(balance => {
      const product = getProductDefinition(balance.itemId)
      if (!product) {
        errors.push(`Balance references unknown product: ${balance.itemId}`)
        return
      }

      if (balance.unit !== product.baseUnit) {
        errors.push(
          `Balance unit mismatch for ${balance.itemName}: ` +
            `expected ${product.baseUnit}, got ${balance.unit}`
        )
      }

      // ✅ NEW: Check for whole numbers
      if (!Number.isInteger(balance.totalQuantity)) {
        errors.push(
          `Balance quantity should be whole number for ${balance.itemName}: ${balance.totalQuantity}`
        )
      }

      if (balance.totalQuantity < 0) {
        errors.push(`Negative quantity for ${balance.itemName}: ${balance.totalQuantity}`)
      }
    })

    // Проверяем батчи на целые числа
    storageData.batches.forEach(batch => {
      const product = getProductDefinition(batch.itemId)
      if (!product) {
        errors.push(`Batch references unknown product: ${batch.itemId}`)
        return
      }

      if (batch.unit !== product.baseUnit) {
        errors.push(
          `Batch unit mismatch for ${batch.itemId}: ` +
            `expected ${product.baseUnit}, got ${batch.unit}`
        )
      }

      // ✅ NEW: Check for whole numbers in batches
      if (!Number.isInteger(batch.currentQuantity)) {
        errors.push(
          `Batch quantity should be whole number for ${batch.itemId}: ${batch.currentQuantity}`
        )
      }

      if (!Number.isInteger(batch.initialQuantity)) {
        errors.push(
          `Batch initial quantity should be whole number for ${batch.itemId}: ${batch.initialQuantity}`
        )
      }

      if (batch.costPerUnit !== product.baseCostPerUnit) {
        warnings.push(
          `Batch cost mismatch for ${batch.itemId}: ` +
            `expected ${product.baseCostPerUnit}, got ${batch.costPerUnit}`
        )
      }
    })

    // ✅ NEW: Check operations for whole numbers
    storageData.operations.forEach(operation => {
      operation.items.forEach(item => {
        if (!Number.isInteger(item.quantity)) {
          errors.push(
            `Operation item quantity should be whole number: ${item.quantity} ${item.unit}`
          )
        }
      })
    })
  } catch (error) {
    errors.push(`Failed to generate storage data: ${error}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * ✅ Демонстрация правильности базовых единиц (ЦЕЛЫЕ ЧИСЛА)
 */
export function demonstrateStorageCalculations(): void {
  console.log('\n🧮 STORAGE CALCULATIONS DEMONSTRATION (WHOLE NUMBERS)')
  console.log('====================================================')

  const storageData = getStorageWorkflowData()

  // Берем первые 3 баланса для демонстрации
  storageData.balances.slice(0, 3).forEach(balance => {
    const product = getProductDefinition(balance.itemId)
    if (!product) return

    console.log(`\n📦 ${balance.itemName} (${balance.department})`)
    console.log(`   Stock: ${balance.totalQuantity} ${balance.unit} (WHOLE NUMBER BASE UNIT)`)
    console.log(`   Cost: ${balance.latestCost} IDR/${balance.unit}`)
    console.log(`   Total Value: ${balance.totalValue} IDR`)
    console.log(`   Daily Usage: ${balance.averageDailyUsage} ${product.baseUnit}/day`)
    console.log(`   Days Remaining: ${balance.daysOfStockRemaining} days`)
    console.log(`   ✅ Is Whole Number: ${Number.isInteger(balance.totalQuantity)}`)

    // Показываем пользовательское отображение
    const userDisplay = convertToUserDisplay(balance.totalQuantity, product)
    console.log(`   👁️ User Display: ${userDisplay.quantity} ${userDisplay.unit}`)
  })

  console.log('\n✅ All calculations use WHOLE NUMBER BASE UNITS (gram/ml/piece)')
}

/**
 * ✅ Конвертирует базовые единицы в удобные для отображения
 */
function convertToUserDisplay(
  baseQuantity: number,
  product: CoreProductDefinition
): { quantity: number; unit: string } {
  if (product.baseUnit === 'gram' && baseQuantity >= 1000) {
    return {
      quantity: Number((baseQuantity / 1000).toFixed(1)),
      unit: 'kg'
    }
  }

  if (product.baseUnit === 'ml' && baseQuantity >= 1000) {
    return {
      quantity: Number((baseQuantity / 1000).toFixed(1)),
      unit: 'L'
    }
  }

  const unitNames: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs'
  }

  return {
    quantity: baseQuantity, // Keep whole number
    unit: unitNames[product.baseUnit] || product.baseUnit
  }
}
