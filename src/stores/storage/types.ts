// src/stores/storage/types.ts - ДОБАВЛЕНЫ ТИПЫ ДЛЯ ТРАНЗИТНЫХ BATCH-ЕЙ

import { BaseEntity } from '@/types/common'

export type StorageDepartment = 'kitchen' | 'bar'
export type StorageItemType = 'product'
export type OperationType = 'receipt' | 'correction' | 'inventory' | 'write_off'
export type BatchSourceType = 'purchase' | 'correction' | 'opening_balance' | 'inventory_adjustment'

// ✅ ИЗМЕНЕНО: Добавлен статус 'in_transit'
export type BatchStatus = 'active' | 'expired' | 'consumed' | 'in_transit' | 'in_transit'

export type InventoryStatus = 'draft' | 'confirmed' | 'cancelled'
export type WriteOffReason = 'expired' | 'spoiled' | 'other' | 'education' | 'test'

// ✅ РАСШИРЕН: StorageBatch с полями для транзита
export interface StorageBatch extends BaseEntity {
  batchNumber: string
  itemId: string
  itemType: 'product'
  department: StorageDepartment
  initialQuantity: number
  currentQuantity: number
  unit: string
  costPerUnit: number
  totalValue: number
  receiptDate: string
  expiryDate?: string
  sourceType: BatchSourceType
  notes?: string
  status: BatchStatus
  isActive: boolean

  // ✅ НОВЫЕ ПОЛЯ для транзитных batch-ей
  purchaseOrderId?: string // Связь с заказом поставщику
  supplierId?: string // ID поставщика
  supplierName?: string // Название поставщика
  plannedDeliveryDate?: string // Ожидаемая дата доставки
  actualDeliveryDate?: string // Фактическая дата доставки (заполняется при конвертации)
}

// Остальные существующие интерфейсы остаются без изменений...
export interface BatchAllocation {
  batchId: string
  batchNumber: string
  quantity: number
  costPerUnit: number
  batchDate: string
}

export interface StorageOperationItem {
  id: string
  itemId: string
  itemType: 'product'
  itemName: string
  quantity: number
  unit: string
  batchAllocations?: BatchAllocation[]
  totalCost?: number
  averageCostPerUnit?: number
  notes?: string
  expiryDate?: string
}

export interface StorageOperation extends BaseEntity {
  operationType: OperationType
  documentNumber: string
  operationDate: string
  department: StorageDepartment
  responsiblePerson: string
  items: StorageOperationItem[]
  totalValue?: number

  correctionDetails?: {
    reason: 'recipe_usage' | 'waste' | 'expired' | 'theft' | 'damage' | 'other'
    relatedId?: string
    relatedName?: string
    portionCount?: number
  }

  writeOffDetails?: {
    reason: WriteOffReason
    affectsKPI: boolean
    notes?: string
  }

  relatedInventoryId?: string
  status: 'draft' | 'confirmed'
  notes?: string
}

export interface StorageBalance {
  itemId: string
  itemType: 'product'
  itemName: string
  department: StorageDepartment
  totalQuantity: number
  unit: string
  totalValue: number
  averageCost: number
  latestCost: number
  costTrend: 'up' | 'down' | 'stable'
  batches: StorageBatch[]
  oldestBatchDate: string
  newestBatchDate: string
  hasExpired: boolean
  hasNearExpiry: boolean
  belowMinStock: boolean
  lastCorrectionDate?: string
  averageDailyUsage?: number
  daysOfStockRemaining?: number
  lastCalculated: string
}

// ✅ НОВЫЙ ТИП: Баланс с транзитными данными
export interface StorageBalanceWithTransit extends StorageBalance {
  transitQuantity: number // Количество в пути
  transitValue: number // Стоимость товаров в пути
  totalWithTransit: number // Общее количество (остаток + в пути)
  nearestDelivery?: string // Ближайшая ожидаемая поставка
  transitBatches: StorageBatch[] // Транзитные batch-и для этого товара
}

// Остальные интерфейсы остаются без изменений...
export interface InventoryDocument extends BaseEntity {
  documentNumber: string
  inventoryDate: string
  department: StorageDepartment
  itemType: 'product'
  responsiblePerson: string
  items: InventoryItem[]
  totalItems: number
  totalDiscrepancies: number
  totalValueDifference: number
  status: 'draft' | 'confirmed'
  notes?: string
}

// DTO для создания транзитного batch-а из заказа

export interface CreateTransitBatchData {
  itemId: string
  itemName: string
  quantity: number
  unit: string
  estimatedCostPerUnit: number
  department: StorageDepartment
  purchaseOrderId: string
  supplierId: string
  supplierName: string
  plannedDeliveryDate: string
  notes?: string
}

export interface InventoryItem {
  id: string
  itemId: string
  itemType: 'product'
  itemName: string
  systemQuantity: number
  actualQuantity: number
  difference: number
  unit: string
  averageCost: number
  valueDifference: number
  notes?: string
  countedBy?: string
  confirmed?: boolean
}

// DTOs
export interface CreateReceiptData {
  department: StorageDepartment
  responsiblePerson: string
  items: ReceiptItem[]
  sourceType: BatchSourceType
  notes?: string
}

export interface ReceiptItem {
  itemId: string
  itemType: 'product'
  quantity: number
  costPerUnit: number
  expiryDate?: string
  notes?: string
}

export interface CreateCorrectionData {
  department: StorageDepartment
  responsiblePerson: string
  items: CorrectionItem[]
  correctionDetails: {
    reason: 'recipe_usage' | 'waste' | 'expired' | 'theft' | 'damage' | 'other'
    relatedId?: string
    relatedName?: string
    portionCount?: number
  }
  notes?: string
}

export interface CorrectionItem {
  itemId: string
  itemType: 'product'
  quantity: number
  notes?: string
}

export interface CreateWriteOffData {
  department: StorageDepartment
  responsiblePerson: string
  reason: WriteOffReason
  items: WriteOffItem[]
  notes?: string
}

export interface WriteOffItem {
  itemId: string
  itemType: 'product'
  quantity: number
  notes?: string
}

export interface CreateInventoryData {
  department: StorageDepartment
  responsiblePerson: string
}

export interface WriteOffStatistics {
  total: { count: number; value: number }
  kpiAffecting: {
    count: number
    value: number
    reasons: {
      expired: { count: number; value: number }
      spoiled: { count: number; value: number }
      other: { count: number; value: number }
    }
  }
  nonKpiAffecting: {
    count: number
    value: number
    reasons: {
      education: { count: number; value: number }
      test: { count: number; value: number }
    }
  }
  byDepartment: {
    kitchen: { total: number; kpiAffecting: number; nonKpiAffecting: number }
    bar: { total: number; kpiAffecting: number; nonKpiAffecting: number }
  }
}

export interface QuickWriteOffItem {
  itemId: string
  itemName: string
  currentQuantity: number
  unit: string
  writeOffQuantity: number
  reason: WriteOffReason
  notes: string
}

export interface StorageState {
  batches: StorageBatch[]
  operations: StorageOperation[]
  balances: StorageBalance[]
  inventories: InventoryDocument[]

  loading: {
    balances: boolean
    operations: boolean
    inventory: boolean
    correction: boolean
    writeOff: boolean
  }
  error: string | null

  filters: {
    department: StorageDepartment | 'all'
    operationType?: OperationType
    showExpired: boolean
    showBelowMinStock: boolean
    showNearExpiry: boolean
    search: string
    dateFrom?: string
    dateTo?: string
  }

  settings: {
    expiryWarningDays: number
    lowStockMultiplier: number
    autoCalculateBalance: boolean
    enableQuickWriteOff: boolean
  }
}

// ✅ ДОБАВЛЕНЫ: Write-off Helper Functions и Constants
export const WRITE_OFF_CLASSIFICATION = {
  KPI_AFFECTING: ['expired', 'spoiled', 'other'] as WriteOffReason[],
  NON_KPI_AFFECTING: ['education', 'test'] as WriteOffReason[]
} as const

/**
 * Write-off reason options for UI components
 */
export const WRITE_OFF_REASON_OPTIONS = [
  {
    value: 'expired' as WriteOffReason,
    title: 'Expired',
    description: 'Product has passed expiry date',
    affectsKPI: true,
    color: 'error'
  },
  {
    value: 'spoiled' as WriteOffReason,
    title: 'Spoiled',
    description: 'Product is damaged or spoiled',
    affectsKPI: true,
    color: 'error'
  },
  {
    value: 'other' as WriteOffReason,
    title: 'Other Loss',
    description: 'Other losses (spill, mistake, etc.)',
    affectsKPI: true,
    color: 'warning'
  },
  {
    value: 'education' as WriteOffReason,
    title: 'Education',
    description: 'Staff training and education',
    affectsKPI: false,
    color: 'info'
  },
  {
    value: 'test' as WriteOffReason,
    title: 'Recipe Testing',
    description: 'Recipe development and testing',
    affectsKPI: false,
    color: 'success'
  }
] as const

/**
 * Determines if a write-off reason affects KPI metrics
 */
export function doesWriteOffAffectKPI(reason: WriteOffReason): boolean {
  return WRITE_OFF_CLASSIFICATION.KPI_AFFECTING.includes(reason)
}

/**
 * Get write-off reason info by reason value
 */
export function getWriteOffReasonInfo(reason: WriteOffReason) {
  return (
    WRITE_OFF_REASON_OPTIONS.find(option => option.value === reason) || {
      value: reason,
      title: reason,
      description: '',
      affectsKPI: doesWriteOffAffectKPI(reason),
      color: 'default'
    }
  )
}
