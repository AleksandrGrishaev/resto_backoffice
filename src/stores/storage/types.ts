// src/stores/storage/types.ts - FIXED: Added Write-off Types and Functions + Transit Support
import { BaseEntity } from '@/types/common'

export type StorageDepartment = 'kitchen' | 'bar'
export type StorageItemType = 'product'
// ✅ FIXED: Added write_off operation type
export type OperationType = 'receipt' | 'correction' | 'inventory' | 'write_off'
export type BatchSourceType = 'purchase' | 'correction' | 'opening_balance' | 'inventory_adjustment'

// ✅ UPDATED: Added 'in_transit' status for transit batches
export type BatchStatus = 'active' | 'expired' | 'consumed' | 'in_transit'

export type InventoryStatus = 'draft' | 'confirmed' | 'cancelled'

// ✅ FIXED: Added Write-off Reason Types
export type WriteOffReason = 'expired' | 'spoiled' | 'other' | 'education' | 'test'

// ✅ UPDATED: Core storage batch entity with transit support
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

  // ✅ NEW: Transit-related fields for integration with purchase orders
  purchaseOrderId?: string // Link to PurchaseOrder
  supplierId?: string // Supplier ID
  supplierName?: string // Supplier name (cached)
  plannedDeliveryDate?: string // Expected delivery date
  actualDeliveryDate?: string // Actual delivery date (when converted to active)
  itemName?: string // Item name (cached for transit batches)
}

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

// ✅ FIXED: Updated StorageOperation with Write-off Details
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

  // ✅ FIXED: Added Write-off Details
  writeOffDetails?: {
    reason: WriteOffReason
    affectsKPI: boolean
    notes?: string
  }

  relatedInventoryId?: string
  status: 'draft' | 'confirmed'
  notes?: string
}

// ✅ UPDATED: StorageBalance extended with transit information
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

  // ✅ NEW: Transit-related fields for balance calculations
  transitQuantity: number // Quantity in transit
  transitValue: number // Value of goods in transit
  totalWithTransit: number // Total quantity (stock + transit)
  nearestDelivery?: string // Nearest expected delivery date
}

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

// ✅ FIXED: Added Write-off DTOs
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

// ✅ NEW: DTO for creating transit batches from purchase orders
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

export interface CreateInventoryData {
  department: StorageDepartment
  responsiblePerson: string
  notes?: string
}

// Storage State
export interface StorageState {
  // Data
  balances: StorageBalance[]
  operations: StorageOperation[]
  batches: StorageBatch[]
  inventories: InventoryDocument[]

  // Loading states
  loading: {
    balances: boolean
    operations: boolean
    inventory: boolean
    correction: boolean
    writeOff: boolean
    plannedDeliveries: boolean // ✅ NEW: Loading state for transit operations
  }

  // UI State
  filters: {
    department: StorageDepartment | 'all'
    operationType?: OperationType
    search?: string
    showExpired: boolean
    showLowStock: boolean
    showNearExpiry: boolean
  }

  // Error state
  error: string | null

  // Last update timestamp
  lastUpdated: string | null
}

// Write-off related types
export interface QuickWriteOffItem {
  itemId: string
  itemName: string
  availableQuantity: number
  selectedQuantity: number
  unit: string
  reason: WriteOffReason
  notes?: string
}

export interface WriteOffStatistics {
  totalWriteOffs: number
  totalValue: number
  byReason: Record<WriteOffReason, { count: number; value: number }>
  affectingKPI: { count: number; value: number }
  notAffectingKPI: { count: number; value: number }
  recentWriteOffs: StorageOperation[]
}

// Write-off classification helpers
export const WRITE_OFF_CLASSIFICATION = {
  AFFECTS_KPI: ['spoiled', 'expired'] as WriteOffReason[],
  DOES_NOT_AFFECT_KPI: ['education', 'test', 'other'] as WriteOffReason[]
} as const

// ✅ NEW: Write-off reason options for UI components
export const WRITE_OFF_REASON_OPTIONS = [
  { value: 'expired', label: 'Expired', affectsKPI: true },
  { value: 'spoiled', label: 'Spoiled', affectsKPI: true },
  { value: 'education', label: 'Education/Training', affectsKPI: false },
  { value: 'test', label: 'Testing', affectsKPI: false },
  { value: 'other', label: 'Other', affectsKPI: false }
] as const

export function doesWriteOffAffectKPI(reason: WriteOffReason): boolean {
  return WRITE_OFF_CLASSIFICATION.AFFECTS_KPI.includes(reason)
}

// ✅ NEW: Helper function for getting write-off reason information
export function getWriteOffReasonInfo(reason: WriteOffReason) {
  const option = WRITE_OFF_REASON_OPTIONS.find(opt => opt.value === reason)
  return option || { value: reason, label: reason, affectsKPI: false }
}
