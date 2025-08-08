// src/stores/storage/mock/mockData.ts
import { TimeUtils } from '@/utils'
import type { StorageBatch, StorageOperation, StorageBalance } from '../types'

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Генерирует номер батча
 */
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

/**
 * Рассчитывает FIFO распределение (простая версия для mock данных)
 */
export function calculateFifoAllocation(batches: StorageBatch[], quantity: number) {
  const allocations = []
  let remainingQuantity = quantity

  // Sort batches by receipt date (FIFO - oldest first)
  const sortedBatches = [...batches]
    .filter(b => b.currentQuantity > 0 && b.status === 'active')
    .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

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

// ==========================================
// MOCK STORAGE BATCHES
// ==========================================

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
    currentQuantity: 15, // часть использована на полуфабрикаты
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
    currentQuantity: 2, // часть использована на соус
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

  // Чеснок - малое количество, критично мало!
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
  // BAR PRODUCTS - BEVERAGES
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

  // Кола - популярный безалкогольный напиток
  {
    id: 'batch-010',
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

  // =============================================
  // PREPARATIONS - ПОЛУФАБРИКАТЫ
  // =============================================

  // Томатный соус - свежеприготовленный
  {
    id: 'batch-011',
    batchNumber: 'B-PREP-TOMATO-001-20250204',
    itemId: 'prep-tomato-sauce',
    itemType: 'preparation',
    department: 'kitchen',
    initialQuantity: 800,
    currentQuantity: 500, // часть использована
    unit: 'gram',
    costPerUnit: 125, // стоимость за грамм
    totalValue: 62500, // 500 * 125
    receiptDate: '2025-02-04T14:00:00Z',
    expiryDate: '2025-02-06T23:59:59Z', // 2 дня для полуфабрикатов
    sourceType: 'production',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// ==========================================
// MOCK STORAGE OPERATIONS
// ==========================================

export const mockStorageOperations: StorageOperation[] = [
  {
    id: 'op-001',
    operationType: 'consumption',
    documentNumber: 'CON-001',
    operationDate: '2025-02-04T18:30:00Z',
    department: 'kitchen',
    responsiblePerson: 'Chef Maria',
    items: [
      {
        id: 'item-001',
        itemId: 'prod-beef-steak',
        itemType: 'product',
        itemName: 'Говядина (стейк)',
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
      }
    ],
    totalValue: 270000,
    consumptionDetails: {
      reason: 'recipe',
      relatedId: 'recipe-beef-steak',
      relatedName: 'Стейк говяжий',
      portionCount: 6
    },
    status: 'confirmed',
    notes: 'Списание для вечернего меню',
    createdAt: '2025-02-04T18:30:00Z',
    updatedAt: '2025-02-04T18:30:00Z'
  },

  {
    id: 'op-002',
    operationType: 'receipt',
    documentNumber: 'REC-001',
    operationDate: '2025-02-03T10:00:00Z',
    department: 'kitchen',
    responsiblePerson: 'Warehouse Manager',
    items: [
      {
        id: 'item-002',
        itemId: 'prod-beef-steak',
        itemType: 'product',
        itemName: 'Говядина (стейк)',
        quantity: 3,
        unit: 'kg',
        totalCost: 555000,
        averageCostPerUnit: 185000
      }
    ],
    totalValue: 555000,
    status: 'confirmed',
    notes: 'Поставка от поставщика мяса',
    createdAt: '2025-02-03T10:00:00Z',
    updatedAt: '2025-02-03T10:00:00Z'
  }
]

// ==========================================
// STATISTICS HELPERS
// ==========================================

export function getStorageStatistics() {
  const batches = mockStorageBatches.filter(b => b.status === 'active' && b.currentQuantity > 0)

  return {
    totalBatches: batches.length,
    totalValue: batches.reduce((sum, b) => sum + b.totalValue, 0),
    kitchenBatches: batches.filter(b => b.department === 'kitchen').length,
    barBatches: batches.filter(b => b.department === 'bar').length,
    productBatches: batches.filter(b => b.itemType === 'product').length,
    preparationBatches: batches.filter(b => b.itemType === 'preparation').length,
    departmentValues: {
      kitchen: batches
        .filter(b => b.department === 'kitchen')
        .reduce((sum, b) => sum + b.totalValue, 0),
      bar: batches.filter(b => b.department === 'bar').reduce((sum, b) => sum + b.totalValue, 0)
    }
  }
}
