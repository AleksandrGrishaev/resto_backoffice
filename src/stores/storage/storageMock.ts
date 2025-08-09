// src/stores/storage/storageMock.ts - ТОЛЬКО ПРОДУКТЫ

import { TimeUtils } from '@/utils'
import type { StorageBatch, StorageOperation, StorageBalance } from './types'

// ✅ Mock данные только для продуктов (сырье для готовки)
export const mockStorageBatches: StorageBatch[] = [
  // =============================================
  // KITCHEN PRODUCTS - RAW MATERIALS
  // =============================================

  // Мясо - говядина для стейков (2 разные поставки с разными ценами)
  {
    id: 'batch-001',
    batchNumber: 'B-BEEF-001-20250201',
    itemId: 'prod-beef-steak',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 5,
    currentQuantity: 2.5, // частично использовано
    unit: 'kg',
    costPerUnit: 180000, // первая поставка по 180k
    totalValue: 450000, // 2.5 * 180000
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2025-02-08T23:59:59Z', // 7 дней с даты поступления
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },
  {
    id: 'batch-002',
    batchNumber: 'B-BEEF-002-20250203',
    itemId: 'prod-beef-steak',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 3,
    currentQuantity: 3, // новая поставка, не тронута
    unit: 'kg',
    costPerUnit: 185000, // цена выросла на 5k
    totalValue: 555000, // 3 * 185000
    receiptDate: '2025-02-03T10:00:00Z',
    expiryDate: '2025-02-10T23:59:59Z',
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Картофель - большая поставка
  {
    id: 'batch-003',
    batchNumber: 'B-POTATO-001-20250201',
    itemId: 'prod-potato',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 20,
    currentQuantity: 15, // часть использована
    unit: 'kg',
    costPerUnit: 8000,
    totalValue: 120000, // 15 * 8000
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2025-02-15T23:59:59Z', // 14 дней срок годности
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Помидоры - скоропортящийся товар
  {
    id: 'batch-004',
    batchNumber: 'B-TOMATO-001-20250202',
    itemId: 'prod-tomato',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 3,
    currentQuantity: 2, // часть использована
    unit: 'kg',
    costPerUnit: 12000,
    totalValue: 24000, // 2 * 12000
    receiptDate: '2025-02-02T08:00:00Z',
    expiryDate: '2025-02-07T23:59:59Z', // скоро истечет
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Лук - долгохранящийся
  {
    id: 'batch-005',
    batchNumber: 'B-ONION-001-20250201',
    itemId: 'prod-onion',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 5,
    currentQuantity: 3, // частично использован
    unit: 'kg',
    costPerUnit: 6000,
    totalValue: 18000, // 3 * 6000
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2025-03-01T23:59:59Z', // 30 дней
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Чеснок - малое количество, дорогой
  {
    id: 'batch-006',
    batchNumber: 'B-GARLIC-001-20250202',
    itemId: 'prod-garlic',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 2,
    currentQuantity: 0.3, // остатки критично мало!
    unit: 'kg',
    costPerUnit: 25000,
    totalValue: 7500, // 0.3 * 25000
    receiptDate: '2025-02-02T09:00:00Z',
    expiryDate: '2025-04-02T23:59:59Z', // долго хранится
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Масло оливковое
  {
    id: 'batch-007',
    batchNumber: 'B-OLIVE-001-20250201',
    itemId: 'prod-olive-oil',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 2,
    currentQuantity: 1.5,
    unit: 'liter',
    costPerUnit: 85000,
    totalValue: 127500, // 1.5 * 85000
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2027-02-01T23:59:59Z', // очень долго хранится
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Сливочное масло - холодильное хранение
  {
    id: 'batch-008',
    batchNumber: 'B-BUTTER-001-20250203',
    itemId: 'prod-butter',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 2,
    currentQuantity: 1.2,
    unit: 'kg',
    costPerUnit: 45000,
    totalValue: 54000, // 1.2 * 45000
    receiptDate: '2025-02-03T10:00:00Z',
    expiryDate: '2025-03-05T23:59:59Z', // 30 дней
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // =============================================
  // BAR PRODUCTS - BEVERAGES (сырье для напитков)
  // =============================================

  // Пиво Bintang 330мл - 2 ящика
  {
    id: 'batch-009',
    batchNumber: 'B-BEER330-001-20250201',
    itemId: 'prod-beer-bintang-330',
    itemType: 'product',
    department: 'bar',
    initialQuantity: 48, // 2 ящика по 24
    currentQuantity: 24, // половина продана
    unit: 'piece',
    costPerUnit: 12000,
    totalValue: 288000, // 24 * 12000
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2025-08-01T23:59:59Z', // 6 месяцев
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Пиво Bintang 500мл - ящик
  {
    id: 'batch-010',
    batchNumber: 'B-BEER500-001-20250202',
    itemId: 'prod-beer-bintang-500',
    itemType: 'product',
    department: 'bar',
    initialQuantity: 24,
    currentQuantity: 12, // половина продана
    unit: 'piece',
    costPerUnit: 18000,
    totalValue: 216000, // 12 * 18000
    receiptDate: '2025-02-02T10:00:00Z',
    expiryDate: '2025-08-02T23:59:59Z',
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Кола - популярный безалкогольный напиток
  {
    id: 'batch-011',
    batchNumber: 'B-COLA-001-20250202',
    itemId: 'prod-cola-330',
    itemType: 'product',
    department: 'bar',
    initialQuantity: 48, // 2 ящика
    currentQuantity: 36, // треть продана
    unit: 'piece',
    costPerUnit: 8000,
    totalValue: 288000, // 36 * 8000
    receiptDate: '2025-02-02T10:00:00Z',
    expiryDate: '2026-02-02T23:59:59Z', // год срок годности
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Вода минеральная
  {
    id: 'batch-012',
    batchNumber: 'B-WATER-001-20250201',
    itemId: 'prod-water-500',
    itemType: 'product',
    department: 'bar',
    initialQuantity: 48,
    currentQuantity: 40,
    unit: 'piece',
    costPerUnit: 3000,
    totalValue: 120000, // 40 * 3000
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2027-02-01T23:59:59Z', // 2 года
    sourceType: 'purchase',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// ✅ Mock операции только с продуктами
export const mockStorageOperations: StorageOperation[] = [
  {
    id: 'op-001',
    operationType: 'correction',
    documentNumber: 'COR-001',
    operationDate: '2025-02-04T18:30:00Z',
    department: 'kitchen',
    responsiblePerson: 'Chef Maria',
    items: [
      {
        id: 'item-001',
        itemId: 'prod-beef-steak',
        itemType: 'product',
        itemName: 'Beef Steak',
        quantity: 1.5,
        unit: 'kg',
        totalCost: 270000, // 1.5 * 180000 (FIFO - берем из первого батча)
        batchAllocations: [
          {
            batchId: 'batch-001',
            batchNumber: 'B-BEEF-001-20250201',
            quantity: 1.5,
            costPerUnit: 180000,
            batchDate: '2025-02-01T08:00:00Z'
          }
        ]
      },
      {
        id: 'item-002',
        itemId: 'prod-potato',
        itemType: 'product',
        itemName: 'Potato',
        quantity: 3,
        unit: 'kg',
        totalCost: 24000, // 3 * 8000
        batchAllocations: [
          {
            batchId: 'batch-003',
            batchNumber: 'B-POTATO-001-20250201',
            quantity: 3,
            costPerUnit: 8000,
            batchDate: '2025-02-01T08:00:00Z'
          }
        ]
      }
    ],
    totalValue: 294000,
    correctionDetails: {
      reason: 'recipe_usage',
      relatedId: 'recipe-beef-steak',
      relatedName: 'Beef Steak Recipe Production',
      portionCount: 6
    },
    status: 'confirmed',
    notes: 'Used for evening menu preparation',
    createdAt: '2025-02-04T18:30:00Z',
    updatedAt: '2025-02-04T18:30:00Z'
  },

  {
    id: 'op-002',
    operationType: 'correction',
    documentNumber: 'COR-002',
    operationDate: '2025-02-04T16:00:00Z',
    department: 'kitchen',
    responsiblePerson: 'Chef Maria',
    items: [
      {
        id: 'item-003',
        itemId: 'prod-tomato',
        itemType: 'product',
        itemName: 'Fresh Tomato',
        quantity: 1,
        unit: 'kg',
        totalCost: 12000,
        batchAllocations: [
          {
            batchId: 'batch-004',
            batchNumber: 'B-TOMATO-001-20250202',
            quantity: 1,
            costPerUnit: 12000,
            batchDate: '2025-02-02T08:00:00Z'
          }
        ]
      }
    ],
    totalValue: 12000,
    correctionDetails: {
      reason: 'waste',
      relatedName: 'Spoiled tomatoes'
    },
    status: 'confirmed',
    notes: 'Found spoiled tomatoes during prep',
    createdAt: '2025-02-04T16:00:00Z',
    updatedAt: '2025-02-04T16:00:00Z'
  },

  {
    id: 'op-003',
    operationType: 'receipt',
    documentNumber: 'REC-001',
    operationDate: '2025-02-03T10:00:00Z',
    department: 'kitchen',
    responsiblePerson: 'Warehouse Manager',
    items: [
      {
        id: 'item-005',
        itemId: 'prod-beef-steak',
        itemType: 'product',
        itemName: 'Beef Steak',
        quantity: 3,
        unit: 'kg',
        totalCost: 555000,
        averageCostPerUnit: 185000
      }
    ],
    totalValue: 555000,
    status: 'confirmed',
    notes: 'Delivery from meat supplier, price increased by 5000',
    createdAt: '2025-02-03T10:00:00Z',
    updatedAt: '2025-02-03T10:00:00Z'
  },

  {
    id: 'op-004',
    operationType: 'receipt',
    documentNumber: 'REC-002',
    operationDate: '2025-02-02T10:00:00Z',
    department: 'bar',
    responsiblePerson: 'Bartender John',
    items: [
      {
        id: 'item-006',
        itemId: 'prod-beer-bintang-330',
        itemType: 'product',
        itemName: 'Bintang Beer 330ml',
        quantity: 48,
        unit: 'piece',
        totalCost: 576000,
        averageCostPerUnit: 12000
      },
      {
        id: 'item-007',
        itemId: 'prod-cola-330',
        itemType: 'product',
        itemName: 'Coca-Cola 330ml',
        quantity: 48,
        unit: 'piece',
        totalCost: 384000,
        averageCostPerUnit: 8000
      }
    ],
    totalValue: 960000,
    status: 'confirmed',
    notes: 'Weekly beverage delivery',
    createdAt: '2025-02-02T10:00:00Z',
    updatedAt: '2025-02-02T10:00:00Z'
  },

  {
    id: 'op-005',
    operationType: 'correction',
    documentNumber: 'COR-003',
    operationDate: '2025-02-04T20:15:00Z',
    department: 'bar',
    responsiblePerson: 'Bartender John',
    items: [
      {
        id: 'item-008',
        itemId: 'prod-beer-bintang-330',
        itemType: 'product',
        itemName: 'Bintang Beer 330ml',
        quantity: 12,
        unit: 'piece',
        totalCost: 144000,
        batchAllocations: [
          {
            batchId: 'batch-009',
            batchNumber: 'B-BEER330-001-20250201',
            quantity: 12,
            costPerUnit: 12000,
            batchDate: '2025-02-01T08:00:00Z'
          }
        ]
      }
    ],
    totalValue: 144000,
    correctionDetails: {
      reason: 'other',
      relatedName: 'Sold to customers',
      portionCount: 12
    },
    status: 'confirmed',
    notes: 'Evening sales',
    createdAt: '2025-02-04T20:15:00Z',
    updatedAt: '2025-02-04T20:15:00Z'
  }
]

// ✅ Создание балансов только для продуктов
export function createInitialBalances(): StorageBalance[] {
  const balances: StorageBalance[] = []

  // Группируем батчи по товарам
  const batchGroups = new Map<string, StorageBatch[]>()

  mockStorageBatches.forEach(batch => {
    if (batch.status === 'active' && batch.currentQuantity > 0) {
      const key = `${batch.itemId}-${batch.itemType}-${batch.department}`
      if (!batchGroups.has(key)) {
        batchGroups.set(key, [])
      }
      batchGroups.get(key)!.push(batch)
    }
  })

  // Создаем балансы для каждой группы продуктов
  batchGroups.forEach((batches, key) => {
    const [itemId, itemType, department] = key.split('-')
    const firstBatch = batches[0]

    // Расчеты
    const totalQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0)
    const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0)
    const averageCost = totalValue / totalQuantity

    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
    )

    const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit

    // Определение тренда цен
    let costTrend: 'up' | 'down' | 'stable' = 'stable'
    if (sortedBatches.length > 1) {
      const oldestCost = sortedBatches[0].costPerUnit
      if (latestCost > oldestCost * 1.05) costTrend = 'up'
      else if (latestCost < oldestCost * 0.95) costTrend = 'down'
    }

    // Определение алертов (упрощенная логика)
    const hasNearExpiry = batches.some(b => {
      if (!b.expiryDate) return false
      const expiry = new Date(b.expiryDate)
      const now = new Date()
      const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays <= 3 && diffDays > 0
    })

    const hasExpired = batches.some(b => {
      if (!b.expiryDate) return false
      return new Date(b.expiryDate) < new Date()
    })

    // Определение низкого остатка для продуктов
    const belowMinStock = (() => {
      if (itemId.includes('garlic')) return totalQuantity < 0.5
      if (itemId.includes('beef')) return totalQuantity < 2
      if (itemId.includes('beer')) return totalQuantity < 12
      return totalQuantity < 1
    })()

    const balance: StorageBalance = {
      itemId,
      itemType: 'product', // всегда product
      itemName: getProductName(itemId), // helper function
      department: department as any,
      totalQuantity,
      unit: firstBatch.unit,
      totalValue,
      averageCost,
      latestCost,
      costTrend,
      batches: sortedBatches,
      oldestBatchDate: sortedBatches[0].receiptDate,
      newestBatchDate: sortedBatches[sortedBatches.length - 1].receiptDate,
      hasExpired,
      hasNearExpiry,
      belowMinStock,
      lastCalculated: TimeUtils.getCurrentLocalISO()
    }

    balances.push(balance)
  })

  return balances
}

// ✅ Helper для получения названий продуктов
function getProductName(itemId: string): string {
  const productNames: Record<string, string> = {
    'prod-beef-steak': 'Beef Steak',
    'prod-potato': 'Potato',
    'prod-tomato': 'Fresh Tomato',
    'prod-onion': 'Onion',
    'prod-garlic': 'Garlic',
    'prod-olive-oil': 'Olive Oil',
    'prod-butter': 'Butter',
    'prod-beer-bintang-330': 'Bintang Beer 330ml',
    'prod-beer-bintang-500': 'Bintang Beer 500ml',
    'prod-cola-330': 'Coca-Cola 330ml',
    'prod-water-500': 'Water 500ml'
  }
  return productNames[itemId] || itemId
}

// ✅ Экспортируем начальные балансы
export const mockStorageBalances: StorageBalance[] = createInitialBalances()

// Helper functions
export function generateBatchNumber(itemName: string, date: string): string {
  const shortName =
    itemName
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 4) || 'ITEM'
  const counter = String(Date.now()).slice(-3)
  const dateStr = date.substring(0, 10).replace(/-/g, '')
  return `B-${shortName}-${counter}-${dateStr}`
}

export function calculateFifoAllocation(batches: StorageBatch[], quantity: number) {
  const allocations = []
  let remainingQuantity = quantity

  // Sort batches by receipt date (FIFO - oldest first)
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
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
        batchDate: batch.receiptDate
      })

      remainingQuantity -= allocatedQuantity
    }
  }

  return { allocations, remainingQuantity }
}

// ✅ Статистика только для продуктов
export function getStorageStatistics() {
  const balances = mockStorageBalances

  return {
    totalProducts: balances.length,
    totalValue: balances.reduce((sum, b) => sum + b.totalValue, 0),
    kitchenProducts: balances.filter(b => b.department === 'kitchen').length,
    barProducts: balances.filter(b => b.department === 'bar').length,
    lowStockProducts: balances.filter(b => b.belowMinStock).length,
    expiringProducts: balances.filter(b => b.hasNearExpiry).length,
    expiredProducts: balances.filter(b => b.hasExpired).length,
    departmentValues: {
      kitchen: balances
        .filter(b => b.department === 'kitchen')
        .reduce((sum, b) => sum + b.totalValue, 0),
      bar: balances.filter(b => b.department === 'bar').reduce((sum, b) => sum + b.totalValue, 0)
    }
  }
}
