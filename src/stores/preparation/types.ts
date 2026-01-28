// src/stores/preparation/types.ts - UPDATED: Added Write-off Support + Portion Type + Kitchen Preparation
import { BaseEntity } from '@/types/common'
import type { PortionType } from '@/stores/recipes/types'

export type PreparationDepartment = 'kitchen' | 'bar' | 'all'

// 🆕 Kitchen Preparation: Storage and Production Types
export type StorageLocation = 'shelf' | 'fridge' | 'freezer'
export type ProductionSlot = 'morning' | 'afternoon' | 'evening' | 'any'
export type ProductionScheduleSlot = 'urgent' | 'morning' | 'afternoon' | 'evening'
export type ProductionScheduleStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type SyncStatus = 'pending' | 'synced' | 'failed'
// ✅ SIMPLIFIED: Production, inventory, write_off, and correction operations
export type PreparationOperationType = 'receipt' | 'inventory' | 'write_off' | 'correction'
// ✅ SIMPLIFIED: Only production and inventory_adjustment sources
export type BatchSourceType =
  | 'production'
  | 'correction'
  | 'opening_balance'
  | 'inventory_adjustment'
  | 'negative_correction' // ✅ NEW: Correction for negative stock balance
export type BatchStatus = 'active' | 'expired' | 'depleted' | 'written_off'
export type InventoryStatus = 'draft' | 'confirmed' | 'cancelled'

// ✅ NEW: Write-off Reason Types for Preparations
export type PreparationWriteOffReason = 'expired' | 'spoiled' | 'other' | 'education' | 'test'

// Core preparation batch entity
export interface PreparationBatch extends BaseEntity {
  batchNumber: string
  preparationId: string
  department: PreparationDepartment
  initialQuantity: number
  currentQuantity: number
  unit: string
  costPerUnit: number
  totalValue: number
  productionDate: string
  expiryDate?: string
  sourceType: BatchSourceType
  notes?: string
  status: BatchStatus
  isActive: boolean

  // ✨ NEW: Negative inventory fields (Sprint 1)
  isNegative?: boolean
  sourceBatchId?: string
  negativeCreatedAt?: string
  negativeReason?: string
  sourceOperationType?: 'pos_order' | 'preparation_production' | 'manual_writeoff'
  affectedRecipeIds?: string[]
  reconciledAt?: string

  // ⭐ PHASE 2: Portion type support
  portionType?: PortionType // 'weight' (default) or 'portion'
  portionSize?: number // Size of one portion in grams (only for portionType='portion')
  portionQuantity?: number // Number of portions (when portionType='portion')
}

export interface BatchAllocation {
  batchId: string
  batchNumber: string
  quantity: number
  costPerUnit: number
  batchDate: string
}

export interface PreparationOperationItem {
  id: string
  preparationId: string
  preparationName: string
  quantity: number
  unit: string
  batchAllocations?: BatchAllocation[]
  totalCost?: number
  averageCostPerUnit?: number
  notes?: string
  expiryDate?: string
}

// ✅ UPDATED: Added Write-off Details
export interface PreparationOperation extends BaseEntity {
  operationType: PreparationOperationType
  documentNumber: string
  operationDate: string
  department: PreparationDepartment
  responsiblePerson: string
  items: PreparationOperationItem[]
  totalValue?: number

  // ✅ Write-off Details (only for write_off operations)
  writeOffDetails?: {
    reason: PreparationWriteOffReason
    affectsKPI: boolean
    notes?: string
  }

  // ✅ Correction Details (only for correction operations)
  correctionDetails?: {
    reason: 'inventory_adjustment' | 'negative_correction' | 'theft' | 'damage' | 'other'
    relatedInventoryId?: string
    relatedDocumentNumber?: string
  }

  relatedInventoryId?: string
  relatedStorageOperationIds?: string[] // ✨ NEW: Link to storage_operations when raw products are written off for production
  status: 'draft' | 'confirmed'
  notes?: string
}

export interface PreparationBalance {
  preparationId: string
  preparationName: string
  department: PreparationDepartment
  totalQuantity: number
  unit: string
  totalValue: number
  averageCost: number
  latestCost: number
  costTrend: 'up' | 'down' | 'stable'
  batches: PreparationBatch[]
  oldestBatchDate: string
  newestBatchDate: string
  oldestExpiryDate: string // Earliest expiry date among active batches (for UI display)
  hasExpired: boolean
  hasNearExpiry: boolean
  belowMinStock: boolean
  lastConsumptionDate?: string
  averageDailyUsage?: number
  daysOfStockRemaining?: number
  lastCalculated: string

  // ⭐ PHASE 2: Portion type support for UI display
  portionType?: PortionType // 'weight' (default) or 'portion'
  portionSize?: number // Size of one portion in grams (only for portionType='portion')
  portionQuantity?: number // Calculated: totalQuantity / portionSize (for portion type)
}

export interface PreparationInventoryDocument extends BaseEntity {
  documentNumber: string
  inventoryDate: string
  department: PreparationDepartment
  responsiblePerson: string
  items: PreparationInventoryItem[]
  totalItems: number
  totalDiscrepancies: number
  totalValueDifference: number
  status: InventoryStatus
  notes?: string
}

export interface PreparationInventoryItem {
  id: string
  preparationId: string
  preparationName: string
  systemQuantity: number
  actualQuantity: number
  difference: number
  unit: string
  averageCost: number
  valueDifference: number
  notes?: string
  countedBy?: string
  confirmed?: boolean
  userInteracted?: boolean
  // ⭐ PHASE 2: Portion type support for UI display
  portionType?: PortionType // 'weight' (default) or 'portion'
  portionSize?: number // Size of one portion in grams (only for portionType='portion')
}

// DTOs
export interface CreatePreparationReceiptData {
  department: PreparationDepartment
  responsiblePerson: string
  items: PreparationReceiptItem[]
  sourceType: BatchSourceType
  notes?: string
  skipAutoWriteOff?: boolean // ✨ NEW: Skip auto write-off for inventory corrections
  relatedInventoryId?: string // ✨ NEW: Link to inventory document for deficit coverage
}

export interface PreparationReceiptItem {
  preparationId: string
  quantity: number
  costPerUnit: number
  expiryDate?: string
  notes?: string
}

// ✅ NEW: Write-off DTOs
export interface CreatePreparationWriteOffData {
  department: PreparationDepartment
  responsiblePerson: string
  reason: PreparationWriteOffReason
  items: PreparationWriteOffItem[]
  notes?: string
}

export interface PreparationWriteOffItem {
  preparationId: string
  quantity: number
  notes?: string
}

// ✅ NEW: Correction DTOs
export interface CreateCorrectionData {
  department: PreparationDepartment
  responsiblePerson: string
  items: CorrectionItem[]
  correctionDetails: {
    reason: 'inventory_adjustment' | 'negative_correction' | 'theft' | 'damage' | 'other'
    relatedInventoryId?: string
    relatedDocumentNumber?: string
  }
  affectsKPI?: boolean // Default: true
  notes?: string
}

export interface CorrectionItem {
  preparationId: string
  quantity: number // Can be positive (surplus) or negative (shortage)
  unit: string
  notes?: string
}

export interface CreatePreparationInventoryData {
  department: PreparationDepartment
  responsiblePerson: string
}

// ✅ NEW: Write-off Statistics and Helper Types
export interface PreparationWriteOffStatistics {
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

export interface QuickPreparationWriteOffItem {
  preparationId: string
  preparationName: string
  currentQuantity: number
  unit: string
  writeOffQuantity: number
  reason: PreparationWriteOffReason
  notes: string
}

// ✅ UPDATED: Added writeOff loading state
export interface PreparationState {
  batches: PreparationBatch[]
  operations: PreparationOperation[]
  balances: PreparationBalance[]
  inventories: PreparationInventoryDocument[]

  loading: {
    balances: boolean
    operations: boolean
    inventory: boolean
    consumption: boolean
    production: boolean
    writeOff: boolean // ✅ NEW
  }
  error: string | null

  filters: {
    department: PreparationDepartment | 'all'
    operationType?: PreparationOperationType // ✅ NEW: Added operation type filter
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
    enableQuickWriteOff: boolean // ✅ NEW
  }
}

// ✅ NEW: Write-off Helper Functions and Constants
export const PREPARATION_WRITE_OFF_CLASSIFICATION = {
  KPI_AFFECTING: ['expired', 'spoiled', 'other'] as PreparationWriteOffReason[],
  NON_KPI_AFFECTING: ['education', 'test'] as PreparationWriteOffReason[]
} as const

/**
 * Preparation write-off reason options for UI components
 */
export const PREPARATION_WRITE_OFF_REASON_OPTIONS = [
  {
    value: 'expired' as PreparationWriteOffReason,
    title: 'Expired',
    description: 'Preparation has passed expiry date',
    affectsKPI: true,
    color: 'error'
  },
  {
    value: 'spoiled' as PreparationWriteOffReason,
    title: 'Spoiled',
    description: 'Preparation is damaged or spoiled',
    affectsKPI: true,
    color: 'error'
  },
  {
    value: 'other' as PreparationWriteOffReason,
    title: 'Other Loss',
    description: 'Other losses (spill, mistake, etc.)',
    affectsKPI: true,
    color: 'warning'
  },
  {
    value: 'education' as PreparationWriteOffReason,
    title: 'Education',
    description: 'Staff training and education',
    affectsKPI: false,
    color: 'info'
  },
  {
    value: 'test' as PreparationWriteOffReason,
    title: 'Recipe Testing',
    description: 'Recipe development and testing',
    affectsKPI: false,
    color: 'success'
  }
] as const

/**
 * Determines if a preparation write-off reason affects KPI metrics
 */
export function doesPreparationWriteOffAffectKPI(reason: PreparationWriteOffReason): boolean {
  return PREPARATION_WRITE_OFF_CLASSIFICATION.KPI_AFFECTING.includes(reason)
}

/**
 * Get preparation write-off reason info by reason value
 */
export function getPreparationWriteOffReasonInfo(reason: PreparationWriteOffReason) {
  return (
    PREPARATION_WRITE_OFF_REASON_OPTIONS.find(option => option.value === reason) || {
      value: reason,
      title: reason,
      description: '',
      affectsKPI: doesPreparationWriteOffAffectKPI(reason),
      color: 'default'
    }
  )
}

// ===============================================
// 🆕 Kitchen Preparation Types (Sprint 1)
// ===============================================

/**
 * Extended preparation info with Kitchen Preparation fields
 */
export interface PreparationScheduleFields {
  storageLocation?: StorageLocation
  productionSlot?: ProductionSlot
  minStockThreshold?: number
  dailyTargetQuantity?: number
}

/**
 * Production Schedule Item - TODO-style task for kitchen/bar staff
 */
export interface ProductionScheduleItem {
  id: string
  preparationId: string
  preparationName: string
  department: 'kitchen' | 'bar'
  scheduleDate: string // ISO date
  productionSlot: ProductionScheduleSlot
  priority: number
  targetQuantity: number
  targetUnit: string
  currentStockAtGeneration?: number
  recommendationReason?: string
  status: ProductionScheduleStatus

  // ⭐ PHASE 2: Portion type support for UI display
  portionType?: PortionType // 'weight' (default) or 'portion'
  portionSize?: number // Size of one portion in grams (only for portionType='portion')

  // Completion details
  completedAt?: string
  completedBy?: string
  completedByName?: string
  completedQuantity?: number
  preparationBatchId?: string

  // Sync status for offline support
  syncStatus: SyncStatus
  syncedAt?: string
  syncError?: string

  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Production Recommendation - AI/Rule-based schedule suggestion
 */
export interface ProductionRecommendation {
  id: string
  preparationId: string
  preparationName: string
  currentStock: number
  avgDailyConsumption: number
  daysUntilStockout: number
  recommendedQuantity: number
  urgency: ProductionScheduleSlot
  reason: string
  storageLocation: StorageLocation
  expiryDate?: string
  portionType?: PortionType
  portionSize?: number

  // Completion tracking (when converted to schedule item)
  isCompleted: boolean
  completionDetails?: {
    completedAt: string
    completedBy: string
    completedQuantity: number
    batchId: string
  }
}

/**
 * Kitchen/Bar KPI Entry - Daily performance metrics for a staff member
 */
export interface KitchenKpiEntry {
  id: string
  staffId: string
  staffName: string
  department: 'kitchen' | 'bar'
  periodDate: string // ISO date

  // Production metrics
  productionsCompleted: number
  productionQuantityTotal: number
  productionValueTotal: number

  // Write-off metrics (KPI-affecting)
  writeoffsKpiAffecting: number
  writeoffValueKpiAffecting: number

  // Write-off metrics (non-KPI)
  writeoffsNonKpi: number
  writeoffValueNonKpi: number

  // Schedule completion metrics
  onTimeCompletions: number
  lateCompletions: number

  // Detailed breakdowns
  productionDetails: ProductionKpiDetail[]
  writeoffDetails: WriteoffKpiDetail[]

  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Production detail for KPI tracking
 */
export interface ProductionKpiDetail {
  batchId: string
  preparationName: string
  quantity: number
  value: number
  timestamp: string
  scheduleTaskId?: string
}

/**
 * Write-off detail for KPI tracking
 */
export interface WriteoffKpiDetail {
  operationId: string
  type: 'preparation' | 'product'
  reason: PreparationWriteOffReason | string
  quantity: number
  value: number
  timestamp: string
  affectsKpi: boolean
}

/**
 * Storage location options for UI
 */
export const STORAGE_LOCATION_OPTIONS = [
  { value: 'fridge' as StorageLocation, label: 'Fridge', icon: 'mdi-fridge' },
  { value: 'shelf' as StorageLocation, label: 'Shelf', icon: 'mdi-archive' },
  { value: 'freezer' as StorageLocation, label: 'Freezer', icon: 'mdi-snowflake' }
] as const

/**
 * Production slot options for UI
 */
export const PRODUCTION_SLOT_OPTIONS = [
  { value: 'any' as ProductionSlot, label: 'Any time', timeRange: null },
  { value: 'morning' as ProductionSlot, label: 'Morning', timeRange: '6:00-12:00' },
  { value: 'afternoon' as ProductionSlot, label: 'Afternoon', timeRange: '12:00-18:00' },
  { value: 'evening' as ProductionSlot, label: 'Evening', timeRange: '18:00-22:00' }
] as const

/**
 * Get production slot display info
 */
export function getProductionSlotInfo(slot: ProductionSlot | ProductionScheduleSlot) {
  if (slot === 'urgent') {
    return { label: 'Urgent', timeRange: 'ASAP', color: 'error' }
  }
  const option = PRODUCTION_SLOT_OPTIONS.find(o => o.value === slot)
  return option || { label: slot, timeRange: null, color: 'default' }
}

/**
 * Get storage location display info
 */
export function getStorageLocationInfo(location: StorageLocation) {
  const option = STORAGE_LOCATION_OPTIONS.find(o => o.value === location)
  return option || { value: location, label: location, icon: 'mdi-help' }
}
