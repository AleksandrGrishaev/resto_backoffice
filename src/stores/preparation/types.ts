// src/stores/preparation/types.ts - UPDATED: Added Write-off Support
import { BaseEntity } from '@/types/common'

export type PreparationDepartment = 'kitchen' | 'bar' | 'all'
// ✅ UPDATED: Added write_off operation type
export type PreparationOperationType = 'receipt' | 'correction' | 'inventory' | 'write_off'
export type BatchSourceType =
  | 'production'
  | 'correction'
  | 'opening_balance'
  | 'inventory_adjustment'
export type BatchStatus = 'active' | 'expired' | 'consumed'
export type InventoryStatus = 'draft' | 'confirmed' | 'cancelled'

// ✅ NEW: Write-off Reason Types for Preparations
export type PreparationWriteOffReason =
  | 'expired'
  | 'spoiled'
  | 'contaminated'
  | 'overproduced'
  | 'quality_control'
  | 'education'
  | 'test'
  | 'other'

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

  correctionDetails?: {
    reason: 'waste' | 'expired' | 'damage' | 'theft' | 'other'
    relatedId?: string
    relatedName?: string
  }

  // ✅ NEW: Write-off Details
  writeOffDetails?: {
    reason: PreparationWriteOffReason
    affectsKPI: boolean
    notes?: string
  }

  relatedInventoryId?: string
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
  hasExpired: boolean
  hasNearExpiry: boolean
  belowMinStock: boolean
  lastConsumptionDate?: string
  averageDailyUsage?: number
  daysOfStockRemaining?: number
  lastCalculated: string
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
}

// DTOs
export interface CreatePreparationReceiptData {
  department: PreparationDepartment
  responsiblePerson: string
  items: PreparationReceiptItem[]
  sourceType: BatchSourceType
  notes?: string
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
  preparationId: string
  quantity: number
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
      contaminated: { count: number; value: number }
      overproduced: { count: number; value: number }
      quality_control: { count: number; value: number }
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
  KPI_AFFECTING: [
    'expired',
    'spoiled',
    'contaminated',
    'overproduced',
    'quality_control',
    'other'
  ] as PreparationWriteOffReason[],
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
    value: 'contaminated' as PreparationWriteOffReason,
    title: 'Contaminated',
    description: 'Preparation is contaminated or unsafe',
    affectsKPI: true,
    color: 'error'
  },
  {
    value: 'overproduced' as PreparationWriteOffReason,
    title: 'Overproduced',
    description: 'Excess production beyond demand',
    affectsKPI: true,
    color: 'warning'
  },
  {
    value: 'quality_control' as PreparationWriteOffReason,
    title: 'Quality Control',
    description: 'Failed quality control standards',
    affectsKPI: true,
    color: 'warning'
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
