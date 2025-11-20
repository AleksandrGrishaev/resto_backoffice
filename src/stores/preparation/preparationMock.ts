// src/stores/preparation/preparationMock.ts
import { TimeUtils } from '@/utils'
import type { PreparationBatch, PreparationOperation, PreparationBalance } from './types'

// ✅ Перенесенные данные полуфабрикатов из Storage
export const mockPreparationBatches: PreparationBatch[] = [
  // Томатный соус - свежеприготовленный
  {
    id: 'prep-batch-013',
    batchNumber: 'B-PREP-TOMATO-001-20250204',
    preparationId: 'prep-tomato-sauce',
    department: 'kitchen',
    initialQuantity: 800,
    currentQuantity: 500, // часть использована
    unit: 'gram',
    costPerUnit: 125, // стоимость за грамм (100,000 за 800г = 125/г)
    totalValue: 62500, // 500 * 125
    productionDate: '2025-02-04T14:00:00Z',
    expiryDate: '2025-02-06T23:59:59Z', // 2 дня для полуфабрикатов
    sourceType: 'production',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Чесночный соус
  {
    id: 'prep-batch-014',
    batchNumber: 'B-PREP-GARLIC-001-20250204',
    preparationId: 'prep-garlic-sauce',
    department: 'kitchen',
    initialQuantity: 250,
    currentQuantity: 150,
    unit: 'gram',
    costPerUnit: 200, // дорогой из-за оливкового масла
    totalValue: 30000, // 150 * 200
    productionDate: '2025-02-04T14:00:00Z',
    expiryDate: '2025-02-06T23:59:59Z',
    sourceType: 'production',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Картофельное пюре - большая порция
  {
    id: 'prep-batch-015',
    batchNumber: 'B-PREP-PUREE-001-20250203',
    preparationId: 'prep-mashed-potato',
    department: 'kitchen',
    initialQuantity: 1200,
    currentQuantity: 800, // часть использована в качестве гарнира
    unit: 'gram',
    costPerUnit: 42, // относительно дешевый (50,000 за 1200г = 42/г)
    totalValue: 33600, // 800 * 42
    productionDate: '2025-02-03T16:00:00Z',
    expiryDate: '2025-02-05T23:59:59Z', // 2 дня для пюре
    sourceType: 'production',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Картофель фри - заготовка
  {
    id: 'prep-batch-016',
    batchNumber: 'B-PREP-FRIES-001-20250204',
    preparationId: 'prep-french-fries',
    department: 'kitchen',
    initialQuantity: 850,
    currentQuantity: 600, // активно используется
    unit: 'gram',
    costPerUnit: 71, // включает масло для жарки (60,000 за 850г = 71/г)
    totalValue: 42600, // 600 * 71
    productionDate: '2025-02-04T12:00:00Z',
    expiryDate: '2025-02-05T23:59:59Z', // день хранения
    sourceType: 'production',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// ✅ Перенесенные операции с полуфабрикатами из Storage
export const mockPreparationOperations: PreparationOperation[] = [
  {
    id: 'prep-op-002',
    operationType: 'consumption',
    documentNumber: 'PREP-CON-002',
    operationDate: '2025-02-04T16:00:00Z',
    department: 'kitchen',
    responsiblePerson: 'Chef Maria',
    items: [
      {
        id: 'prep-item-003',
        preparationId: 'prep-tomato-sauce',
        preparationName: 'Томатный соус',
        quantity: 300,
        unit: 'gram',
        totalCost: 37500, // производная операция из продуктов
        batchAllocations: [
          {
            batchId: 'prep-batch-013',
            batchNumber: 'B-PREP-TOMATO-001-20250204',
            quantity: 300,
            costPerUnit: 125,
            batchDate: '2025-02-04T14:00:00Z'
          }
        ]
      }
    ],
    totalValue: 37500,
    consumptionDetails: {
      reason: 'menu_item',
      relatedId: 'menu-pasta-tomato',
      relatedName: 'Паста с томатным соусом',
      portionCount: 6
    },
    status: 'confirmed',
    notes: 'Использование для пасты в вечернем меню',
    createdAt: '2025-02-04T16:00:00Z',
    updatedAt: '2025-02-04T16:00:00Z'
  },

  {
    id: 'prep-op-001',
    operationType: 'receipt',
    documentNumber: 'PREP-REC-001',
    operationDate: '2025-02-04T14:00:00Z',
    department: 'kitchen',
    responsiblePerson: 'Chef Maria',
    items: [
      {
        id: 'prep-item-001',
        preparationId: 'prep-tomato-sauce',
        preparationName: 'Томатный соус',
        quantity: 800,
        unit: 'gram',
        totalCost: 100000,
        averageCostPerUnit: 125
      }
    ],
    totalValue: 100000,
    status: 'confirmed',
    notes: 'Приготовление томатного соуса из свежих помидоров',
    createdAt: '2025-02-04T14:00:00Z',
    updatedAt: '2025-02-04T14:00:00Z'
  }
]

// ✅ Функция для создания балансов полуфабрикатов (перенесена из Storage)
export function createPreparationBalances(): PreparationBalance[] {
  const balances: PreparationBalance[] = []

  // Группируем батчи по полуфабрикатам
  const batchGroups = new Map<string, PreparationBatch[]>()

  mockPreparationBatches.forEach(batch => {
    if (batch.status === 'active' && batch.currentQuantity > 0) {
      const key = `${batch.preparationId}-${batch.department}`
      if (!batchGroups.has(key)) {
        batchGroups.set(key, [])
      }
      batchGroups.get(key)!.push(batch)
    }
  })

  // Создаем балансы для каждой группы
  batchGroups.forEach((batches, key) => {
    const [preparationId, department] = key.split('-')
    const firstBatch = batches[0]

    // Расчеты
    const totalQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0)
    const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0)
    const averageCost = totalValue / totalQuantity

    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
    )

    const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit

    // Определение тренда цен
    let costTrend: 'up' | 'down' | 'stable' = 'stable'
    if (sortedBatches.length > 1) {
      const oldestCost = sortedBatches[0].costPerUnit
      if (latestCost > oldestCost * 1.05) costTrend = 'up'
      else if (latestCost < oldestCost * 0.95) costTrend = 'down'
    }

    // Определение алертов для полуфабрикатов
    const hasNearExpiry = batches.some(b => {
      if (!b.expiryDate) return false
      const expiry = new Date(b.expiryDate)
      const now = new Date()
      const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays <= 1 && diffDays > 0 // 1 день для полуфабрикатов
    })

    const hasExpired = batches.some(b => {
      if (!b.expiryDate) return false
      return new Date(b.expiryDate) < new Date()
    })

    // Определение низкого остатка для полуфабрикатов
    const belowMinStock = totalQuantity < 200 // менее 200г/мл

    const balance: PreparationBalance = {
      preparationId,
      preparationName: firstBatch.preparationId, // Будет заменено в сервисе
      department: department as any,
      totalQuantity,
      unit: firstBatch.unit,
      totalValue,
      averageCost,
      latestCost,
      costTrend,
      batches: sortedBatches,
      oldestBatchDate: sortedBatches[0].productionDate,
      newestBatchDate: sortedBatches[sortedBatches.length - 1].productionDate,
      hasExpired,
      hasNearExpiry,
      belowMinStock,
      lastCalculated: TimeUtils.getCurrentLocalISO()
    }

    balances.push(balance)
  })

  return balances
}

// ✅ Экспортируем начальные балансы
export const mockPreparationBalances: PreparationBalance[] = createPreparationBalances()

// Helper functions (адаптированы для полуфабрикатов)
export function generatePreparationBatchNumber(preparationName: string, date: string): string {
  const shortName =
    preparationName
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 4) || 'PREP'
  const counter = String(Date.now()).slice(-3)
  const dateStr = date.substring(0, 10).replace(/-/g, '')
  return `B-PREP-${shortName}-${counter}-${dateStr}`
}

export function calculatePreparationFifoAllocation(batches: PreparationBatch[], quantity: number) {
  const allocations = []
  let remainingQuantity = quantity

  // Sort batches by production date (FIFO - oldest first)
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
  )

  for (const batch of sortedBatches) {
    if (remainingQuantity <= 0) break

    const allocatedQuantity = Math.min(batch.currentQuantity, remainingQuantity)

    if (allocatedQuantity > 0) {
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: allocatedQuantity,
        costPerUnit: batch.costPerUnit,
        batchDate: batch.productionDate
      })

      remainingQuantity -= allocatedQuantity
    }
  }

  return { allocations, remainingQuantity }
}

// ✅ Функция для получения статистики полуфабрикатов
export function getPreparationStatistics() {
  const balances = mockPreparationBalances

  return {
    totalItems: balances.length,
    totalValue: balances.reduce((sum, b) => sum + b.totalValue, 0),
    kitchenItems: balances.filter(b => b.department === 'kitchen').length,
    barItems: balances.filter(b => b.department === 'bar').length,
    lowStockItems: balances.filter(b => b.belowMinStock).length,
    expiringItems: balances.filter(b => b.hasNearExpiry).length,
    expiredItems: balances.filter(b => b.hasExpired).length,
    departmentValues: {
      kitchen: balances
        .filter(b => b.department === 'kitchen')
        .reduce((sum, b) => sum + b.totalValue, 0),
      bar: balances.filter(b => b.department === 'bar').reduce((sum, b) => sum + b.totalValue, 0)
    }
  }
}
