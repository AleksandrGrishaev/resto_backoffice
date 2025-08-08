// src/stores/storage/types.ts - ТОЛЬКО RECEIPT, CORRECTION И INVENTORY
import { BaseEntity } from '@/types/common'

export type StorageDepartment = 'kitchen' | 'bar'
export type StorageItemType = 'product' | 'preparation'
// ✅ УПРОЩЕНО: Убрали consumption, оставили только основные операции
export type OperationType = 'receipt' | 'correction' | 'inventory'
export type BatchSourceType =
  | 'purchase'
  | 'production'
  | 'correction'
  | 'opening_balance'
  | 'inventory_adjustment'
export type BatchStatus = 'active' | 'expired' | 'consumed'
export type InventoryStatus = 'draft' | 'confirmed' | 'cancelled'

// Core storage batch entity
export interface StorageBatch extends BaseEntity {
  // Identification
  batchNumber: string // "B-BEEF-001-20250205"
  itemId: string // Product or Preparation ID
  itemType: StorageItemType
  department: StorageDepartment

  // Quantity tracking
  initialQuantity: number // Original received quantity
  currentQuantity: number // Remaining quantity
  unit: string // kg, liter, piece, etc.

  // Cost tracking (FIFO)
  costPerUnit: number // Cost per unit for THIS batch
  totalValue: number // currentQuantity × costPerUnit

  // Dates and expiry
  receiptDate: string // When batch was received
  expiryDate?: string // When batch expires

  // Source tracking
  sourceType: BatchSourceType
  notes?: string

  // Status
  status: BatchStatus
  isActive: boolean
}

// Batch allocation for FIFO operations
export interface BatchAllocation {
  batchId: string // Which batch to use
  batchNumber: string // Human readable batch number
  quantity: number // How much from this batch
  costPerUnit: number // Cost per unit from this batch
  batchDate: string // Receipt date of batch
}

// Storage operation item
export interface StorageOperationItem {
  id: string
  itemId: string // Product or Preparation ID
  itemType: StorageItemType
  itemName: string // Cached name for display

  // Quantity
  quantity: number
  unit: string

  // FIFO allocation (for corrections)
  batchAllocations?: BatchAllocation[]

  // Cost tracking
  totalCost?: number // Calculated total cost
  averageCostPerUnit?: number // Weighted average cost

  // Additional details
  notes?: string
  expiryDate?: string // For receipts
}

// Main storage operation document
export interface StorageOperation extends BaseEntity {
  // Operation details
  operationType: OperationType
  documentNumber: string // "REC-001", "COR-001", "INV-001"
  operationDate: string
  department: StorageDepartment

  // Responsible person
  responsiblePerson: string // Who performed the operation

  // Items involved
  items: StorageOperationItem[]

  // Financial impact
  totalValue?: number // Total cost impact of operation

  // ✅ НОВОЕ: Причина коррекции (заменяет ConsumptionDetails)
  correctionDetails?: {
    reason: 'recipe_usage' | 'menu_item' | 'waste' | 'expired' | 'theft' | 'damage' | 'other'
    relatedId?: string // Recipe ID, Menu Item ID, etc.
    relatedName?: string // Human readable name
    portionCount?: number // How many portions made (for recipe usage)
  }

  relatedInventoryId?: string

  // Status and workflow
  status: 'draft' | 'confirmed'
  notes?: string
}

// Current stock summary with analytics
export interface StorageBalance {
  // Item identification
  itemId: string
  itemType: StorageItemType
  itemName: string // Cached name
  department: StorageDepartment

  // Current stock
  totalQuantity: number // Sum of all active batches
  unit: string

  // Financial summary with price analytics
  totalValue: number // Total value of all batches
  averageCost: number // Weighted average cost per unit
  latestCost: number // Cost of most recent batch
  costTrend: 'up' | 'down' | 'stable' // Price trend indicator

  // FIFO batch details
  batches: StorageBatch[] // All active batches (sorted FIFO - oldest first)
  oldestBatchDate: string // Date of oldest batch
  newestBatchDate: string // Date of newest batch

  // Alerts and warnings
  hasExpired: boolean // Has any expired batches
  hasNearExpiry: boolean // Has batches expiring within 3 days
  belowMinStock: boolean // Below minimum stock level

  // Usage analytics
  lastCorrectionDate?: string // When last corrected/used
  averageDailyUsage?: number // Moving average usage
  daysOfStockRemaining?: number // Estimated days until stockout

  // Cache timestamps
  lastCalculated: string // When this balance was calculated
}

// Inventory document for stock takes
export interface InventoryDocument extends BaseEntity {
  // Document details
  documentNumber: string // "INV-KITCHEN-PROD-001"
  inventoryDate: string
  department: StorageDepartment
  itemType: StorageItemType // Separate inventories for products/preparations

  // Responsible person
  responsiblePerson: string

  // Inventory results
  items: InventoryItem[]

  // Summary
  totalItems: number // Number of items counted
  totalDiscrepancies: number // Number of items with differences
  totalValueDifference: number // Total financial impact

  // Status
  status: 'draft' | 'confirmed'
  notes?: string
}

// Individual inventory item
export interface InventoryItem {
  id: string
  itemId: string
  itemType: StorageItemType
  itemName: string // Cached name

  // Quantities
  systemQuantity: number // Quantity per system
  actualQuantity: number // Actual counted quantity
  difference: number // actualQuantity - systemQuantity

  // Financial impact
  unit: string
  averageCost: number // Current average cost per unit
  valueDifference: number // difference × averageCost

  // Details
  notes?: string // Reasons for discrepancy
  countedBy?: string // Who counted this item
  confirmed?: boolean
}

// ✅ УПРОЩЕННЫЕ DTOs - только Receipt, Correction, Inventory

export interface CreateReceiptData {
  department: StorageDepartment
  responsiblePerson: string
  items: ReceiptItem[]
  sourceType: BatchSourceType
  notes?: string
}

export interface ReceiptItem {
  itemId: string
  itemType: StorageItemType
  quantity: number
  costPerUnit: number
  expiryDate?: string
  notes?: string
}

// ✅ НОВОЕ: Correction вместо Consumption
export interface CreateCorrectionData {
  department: StorageDepartment
  responsiblePerson: string
  items: CorrectionItem[]
  correctionDetails: {
    reason: 'recipe_usage' | 'menu_item' | 'waste' | 'expired' | 'theft' | 'damage' | 'other'
    relatedId?: string
    relatedName?: string
    portionCount?: number
  }
  notes?: string
}

export interface CorrectionItem {
  itemId: string
  itemType: StorageItemType
  quantity: number // положительное число для списания
  notes?: string
}

export interface CreateInventoryData {
  department: StorageDepartment
  itemType: StorageItemType
  responsiblePerson: string
}

// Store state interface (минимальная)
export interface StorageState {
  // Core data
  batches: StorageBatch[]
  operations: StorageOperation[]
  balances: StorageBalance[]
  inventories: InventoryDocument[]

  // UI state
  loading: {
    balances: boolean
    operations: boolean
    inventory: boolean
    correction: boolean // ✅ ИЗМЕНЕНО: correction вместо consumption
  }
  error: string | null

  // Filters and search
  filters: {
    department: StorageDepartment | 'all'
    itemType: StorageItemType | 'all'
    showExpired: boolean
    showBelowMinStock: boolean
    showNearExpiry: boolean
    search: string
    dateFrom?: string
    dateTo?: string
  }

  // Settings
  settings: {
    expiryWarningDays: number // Days before expiry to show warning (default: 3)
    lowStockMultiplier: number // Multiplier of minStock for low stock warning (default: 1.2)
    autoCalculateBalance: boolean // Auto-recalculate balances on operations (default: true)
  }
}
