// src/stores/storage/storageMock.ts
import { TimeUtils } from '@/utils'
import type { StorageBatch, StorageOperation, StorageBalance } from './types'

// Mock storage batches for testing FIFO
export const mockStorageBatches: StorageBatch[] = [
  // Kitchen Products
  {
    id: 'batch-001',
    batchNumber: 'B-BEEF-001-20250201',
    itemId: 'beef-steak',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 5,
    currentQuantity: 2.5,
    unit: 'kg',
    costPerUnit: 180000,
    totalValue: 450000,
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2025-02-08T23:59:59Z',
    sourceType: 'opening_balance',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },
  {
    id: 'batch-002',
    batchNumber: 'B-BEEF-002-20250203',
    itemId: 'beef-steak',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 3,
    currentQuantity: 3,
    unit: 'kg',
    costPerUnit: 185000, // Price increase
    totalValue: 555000,
    receiptDate: '2025-02-03T10:00:00Z',
    expiryDate: '2025-02-10T23:59:59Z',
    sourceType: 'opening_balance',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },
  {
    id: 'batch-003',
    batchNumber: 'B-POTATO-001-20250201',
    itemId: 'potato',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 20,
    currentQuantity: 15,
    unit: 'kg',
    costPerUnit: 8000,
    totalValue: 120000,
    receiptDate: '2025-02-01T08:00:00Z',
    expiryDate: '2025-02-15T23:59:59Z',
    sourceType: 'opening_balance',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },
  {
    id: 'batch-004',
    batchNumber: 'B-GARLIC-001-20250202',
    itemId: 'garlic',
    itemType: 'product',
    department: 'kitchen',
    initialQuantity: 2,
    currentQuantity: 1.5,
    unit: 'kg',
    costPerUnit: 25000,
    totalValue: 37500,
    receiptDate: '2025-02-02T09:00:00Z',
    expiryDate: '2025-02-20T23:59:59Z',
    sourceType: 'opening_balance',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },
  // Bar Products
  {
    id: 'batch-005',
    batchNumber: 'B-VODKA-001-20250201',
    itemId: 'vodka',
    itemType: 'product',
    department: 'bar',
    initialQuantity: 6,
    currentQuantity: 4,
    unit: 'bottle',
    costPerUnit: 150000,
    totalValue: 600000,
    receiptDate: '2025-02-01T08:00:00Z',
    sourceType: 'opening_balance',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },
  {
    id: 'batch-006',
    batchNumber: 'B-BEER-001-20250202',
    itemId: 'beer',
    itemType: 'product',
    department: 'bar',
    initialQuantity: 24,
    currentQuantity: 18,
    unit: 'bottle',
    costPerUnit: 15000,
    totalValue: 270000,
    receiptDate: '2025-02-02T10:00:00Z',
    expiryDate: '2025-03-15T23:59:59Z',
    sourceType: 'opening_balance',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },
  // Preparations
  {
    id: 'batch-007',
    batchNumber: 'B-RENDANG-001-20250204',
    itemId: 'beef-rendang-prep',
    itemType: 'preparation',
    department: 'kitchen',
    initialQuantity: 10,
    currentQuantity: 6,
    unit: 'portion',
    costPerUnit: 45000,
    totalValue: 270000,
    receiptDate: '2025-02-04T14:00:00Z',
    expiryDate: '2025-02-06T23:59:59Z',
    sourceType: 'production',
    status: 'active',
    isActive: true,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// Mock storage operations
export const mockStorageOperations: StorageOperation[] = [
  {
    id: 'op-001',
    operationType: 'consumption',
    documentNumber: 'CON-001',
    operationDate: TimeUtils.getCurrentLocalISO(),
    department: 'kitchen',
    responsiblePerson: 'Chef Maria',
    items: [
      {
        id: 'item-001',
        itemId: 'beef-steak',
        itemType: 'product',
        itemName: 'Beef Steak',
        quantity: 1.5,
        unit: 'kg',
        totalCost: 270000,
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
      relatedId: 'beef-steak-recipe',
      relatedName: 'Beef Steak',
      portionCount: 3
    },
    status: 'confirmed',
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// Mock storage balances
export const mockStorageBalances: StorageBalance[] = [
  {
    itemId: 'beef-steak',
    itemType: 'product',
    itemName: 'Beef Steak',
    department: 'kitchen',
    totalQuantity: 5.5,
    unit: 'kg',
    totalValue: 1005000,
    averageCost: 182727, // Weighted average
    latestCost: 185000,
    costTrend: 'up',
    batches: [
      mockStorageBatches[0], // Oldest first (FIFO)
      mockStorageBatches[1]
    ],
    oldestBatchDate: '2025-02-01T08:00:00Z',
    newestBatchDate: '2025-02-03T10:00:00Z',
    hasExpired: false,
    hasNearExpiry: true, // Expires in 3 days
    belowMinStock: false,
    lastConsumptionDate: TimeUtils.getCurrentLocalISO(),
    lastCalculated: TimeUtils.getCurrentLocalISO()
  },
  {
    itemId: 'potato',
    itemType: 'product',
    itemName: 'Potato',
    department: 'kitchen',
    totalQuantity: 15,
    unit: 'kg',
    totalValue: 120000,
    averageCost: 8000,
    latestCost: 8000,
    costTrend: 'stable',
    batches: [mockStorageBatches[2]],
    oldestBatchDate: '2025-02-01T08:00:00Z',
    newestBatchDate: '2025-02-01T08:00:00Z',
    hasExpired: false,
    hasNearExpiry: false,
    belowMinStock: false,
    lastCalculated: TimeUtils.getCurrentLocalISO()
  },
  {
    itemId: 'garlic',
    itemType: 'product',
    itemName: 'Garlic',
    department: 'kitchen',
    totalQuantity: 1.5,
    unit: 'kg',
    totalValue: 37500,
    averageCost: 25000,
    latestCost: 25000,
    costTrend: 'stable',
    batches: [mockStorageBatches[3]],
    oldestBatchDate: '2025-02-02T09:00:00Z',
    newestBatchDate: '2025-02-02T09:00:00Z',
    hasExpired: false,
    hasNearExpiry: false,
    belowMinStock: true, // Low stock warning
    lastCalculated: TimeUtils.getCurrentLocalISO()
  },
  {
    itemId: 'vodka',
    itemType: 'product',
    itemName: 'Vodka',
    department: 'bar',
    totalQuantity: 4,
    unit: 'bottle',
    totalValue: 600000,
    averageCost: 150000,
    latestCost: 150000,
    costTrend: 'stable',
    batches: [mockStorageBatches[4]],
    oldestBatchDate: '2025-02-01T08:00:00Z',
    newestBatchDate: '2025-02-01T08:00:00Z',
    hasExpired: false,
    hasNearExpiry: false,
    belowMinStock: false,
    lastCalculated: TimeUtils.getCurrentLocalISO()
  },
  {
    itemId: 'beer',
    itemType: 'product',
    itemName: 'Beer',
    department: 'bar',
    totalQuantity: 18,
    unit: 'bottle',
    totalValue: 270000,
    averageCost: 15000,
    latestCost: 15000,
    costTrend: 'stable',
    batches: [mockStorageBatches[5]],
    oldestBatchDate: '2025-02-02T10:00:00Z',
    newestBatchDate: '2025-02-02T10:00:00Z',
    hasExpired: false,
    hasNearExpiry: false,
    belowMinStock: false,
    lastCalculated: TimeUtils.getCurrentLocalISO()
  },
  {
    itemId: 'beef-rendang-prep',
    itemType: 'preparation',
    itemName: 'Beef Rendang (Prepared)',
    department: 'kitchen',
    totalQuantity: 6,
    unit: 'portion',
    totalValue: 270000,
    averageCost: 45000,
    latestCost: 45000,
    costTrend: 'stable',
    batches: [mockStorageBatches[6]],
    oldestBatchDate: '2025-02-04T14:00:00Z',
    newestBatchDate: '2025-02-04T14:00:00Z',
    hasExpired: false,
    hasNearExpiry: true, // Expires tomorrow
    belowMinStock: false,
    lastCalculated: TimeUtils.getCurrentLocalISO()
  }
]

// Helper functions for mock data
export function generateBatchNumber(itemName: string, date: string): string {
  const shortName = itemName.toUpperCase().substring(0, 4)
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
