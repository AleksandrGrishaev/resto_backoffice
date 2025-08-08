// src/stores/preparation/types.ts - Адаптация Storage types для полуфабрикатов
import { BaseEntity } from '@/types/common'

export type PreparationDepartment = 'kitchen' | 'bar'
export type PreparationOperationType = 'receipt' | 'consumption' | 'correction' | 'inventory'
export type BatchSourceType =
  | 'production'
  | 'correction'
  | 'opening_balance'
  | 'inventory_adjustment'
export type BatchStatus = 'active' | 'expired' | 'consumed'
export type InventoryStatus = 'draft' | 'confirmed' | 'cancelled'

// Core preparation batch entity (адаптация StorageBatch)
export interface PreparationBatch extends BaseEntity {
  // Identification
  batchNumber: string // "B-PREP-TOMATO-001-20250204"
  preparationId: string // Preparation ID
  department: PreparationDepartment

  // Quantity tracking
  initialQuantity: number // Original produced quantity
  currentQuantity: number // Remaining quantity
  unit: string // gram, ml, piece, etc.

  // Cost tracking (FIFO)
  costPerUnit: number // Cost per unit for THIS batch
  totalValue: number // currentQuantity × costPerUnit

  // Dates and expiry
  productionDate: string // When batch was produced (вместо receiptDate)
  expiryDate?: string // When batch expires

  // Source tracking
  sourceType: BatchSourceType
  notes?: string

  // Status
  status: BatchStatus
  isActive: boolean
}

// Batch allocation for FIFO operations (идентично StorageBalance)
export interface BatchAllocation {
  batchId: string
  batchNumber: string
  quantity: number
  costPerUnit: number
  batchDate: string
}

// Preparation operation item (адаптация StorageOperationItem)
export interface PreparationOperationItem {
  id: string
  preparationId: string // вместо itemId
  preparationName: string // Cached name for display

  // Quantity
  quantity: number
  unit: string

  // FIFO allocation (for consumption/corrections)
  batchAllocations?: BatchAllocation[]

  // Cost tracking
  totalCost?: number
  averageCostPerUnit?: number

  // Additional details
  notes?: string
  expiryDate?: string // For production
}

// Main preparation operation document (адаптация StorageOperation)
export interface PreparationOperation extends BaseEntity {
  // Operation details
  operationType: PreparationOperationType
  documentNumber: string // "PREP-REC-001", "PREP-CON-001", etc.
  operationDate: string
  department: PreparationDepartment

  // Responsible person
  responsiblePerson: string

  // Items involved
  items: PreparationOperationItem[]

  // Financial impact
  totalValue?: number

  // Consumption details (адаптация consumptionDetails из Storage)
  consumptionDetails?: {
    reason: 'menu_item' | 'catering' | 'waste' | 'expired' | 'damage' | 'other'
    relatedId?: string // Menu Item ID, Order ID, etc.
    relatedName?: string
    portionCount?: number
  }

  // Correction details (адаптация correctionDetails из Storage)
  correctionDetails?: {
    reason: 'waste' | 'expired' | 'damage' | 'theft' | 'other'
    relatedId?: string
    relatedName?: string
  }

  relatedInventoryId?: string

  // Status and workflow
  status: 'draft' | 'confirmed'
  notes?: string
}

// Current preparation stock summary (адаптация StorageBalance)
export interface PreparationBalance {
  // Preparation identification
  preparationId: string // вместо itemId
  preparationName: string // Cached name
  department: PreparationDepartment

  // Current stock
  totalQuantity: number // Sum of all active batches
  unit: string

  // Financial summary with cost analytics
  totalValue: number // Total value of all batches
  averageCost: number // Weighted average cost per unit
  latestCost: number // Cost of most recent batch
  costTrend: 'up' | 'down' | 'stable'

  // FIFO batch details
  batches: PreparationBatch[] // All active batches (sorted FIFO)
  oldestBatchDate: string
  newestBatchDate: string

  // Alerts and warnings
  hasExpired: boolean
  hasNearExpiry: boolean // обычно 1-2 дня для полуфабрикатов
  belowMinStock: boolean

  // Usage analytics
  lastConsumptionDate?: string
  averageDailyUsage?: number
  daysOfStockRemaining?: number

  // Cache timestamps
  lastCalculated: string
}

// Inventory document for preparation stock takes (адаптация InventoryDocument)
export interface PreparationInventoryDocument extends BaseEntity {
  // Document details
  documentNumber: string // "INV-PREP-KITCHEN-001"
  inventoryDate: string
  department: PreparationDepartment

  // Responsible person
  responsiblePerson: string

  // Inventory results
  items: PreparationInventoryItem[]

  // Summary
  totalItems: number
  totalDiscrepancies: number
  totalValueDifference: number

  // Status
  status: InventoryStatus
  notes?: string
}

// Individual preparation inventory item (адаптация InventoryItem)
export interface PreparationInventoryItem {
  id: string
  preparationId: string // вместо itemId
  preparationName: string

  // Quantities
  systemQuantity: number
  actualQuantity: number
  difference: number

  // Financial impact
  unit: string
  averageCost: number
  valueDifference: number

  // Details
  notes?: string
  countedBy?: string
  confirmed?: boolean
}

// DTOs for operations (адаптация Storage DTOs)

export interface CreatePreparationReceiptData {
  department: PreparationDepartment
  responsiblePerson: string
  items: PreparationReceiptItem[]
  sourceType: BatchSourceType
  notes?: string
}

export interface PreparationReceiptItem {
  preparationId: string // вместо itemId
  quantity: number
  costPerUnit: number
  expiryDate?: string
  notes?: string
}

export interface CreatePreparationConsumptionData {
  department: PreparationDepartment
  responsiblePerson: string
  items: PreparationConsumptionItem[]
  consumptionDetails: {
    reason: 'menu_item' | 'catering' | 'waste' | 'expired' | 'damage' | 'other'
    relatedId?: string
    relatedName?: string
    portionCount?: number
  }
  notes?: string
}

export interface PreparationConsumptionItem {
  preparationId: string // вместо itemId
  quantity: number
  notes?: string
}

export interface CreatePreparationCorrectionData {
  department: PreparationDepartment
  responsiblePerson: string
  items: PreparationCorrectionItem[]
  correctionDetails: {
    reason: 'waste' | 'expired' | 'damage' | 'theft' | 'other'
    relatedId?: string
    relatedName?: string
  }
  notes?: string
}

export interface PreparationCorrectionItem {
  preparationId: string // вместо itemId
  quantity: number
  notes?: string
}

export interface CreatePreparationInventoryData {
  department: PreparationDepartment
  responsiblePerson: string
}

// Store state interface (адаптация StorageState)
export interface PreparationState {
  // Core data
  batches: PreparationBatch[]
  operations: PreparationOperation[]
  balances: PreparationBalance[]
  inventories: PreparationInventoryDocument[]

  // UI state
  loading: {
    balances: boolean
    operations: boolean
    inventory: boolean
    consumption: boolean
    production: boolean
  }
  error: string | null

  // Filters and search
  filters: {
    department: PreparationDepartment | 'all'
    showExpired: boolean
    showBelowMinStock: boolean
    showNearExpiry: boolean
    search: string
    dateFrom?: string
    dateTo?: string
  }

  // Settings
  settings: {
    expiryWarningDays: number // Default: 1 (полуфабрикаты портятся быстрее)
    lowStockMultiplier: number
    autoCalculateBalance: boolean
  }
}
