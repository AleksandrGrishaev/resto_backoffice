// src/stores/kitchenKpi/types.ts
// Kitchen/Bar KPI Store Types

// Re-export core types from preparation (single source of truth)
export type {
  KitchenKpiEntry,
  ProductionKpiDetail,
  WriteoffKpiDetail,
  ProductionScheduleItem,
  ProductionRecommendation,
  ProductionScheduleSlot,
  ProductionScheduleStatus,
  SyncStatus,
  StorageLocation,
  ProductionSlot
} from '@/stores/preparation/types'

// Re-export helper functions
export {
  getProductionSlotInfo,
  getStorageLocationInfo,
  STORAGE_LOCATION_OPTIONS,
  PRODUCTION_SLOT_OPTIONS
} from '@/stores/preparation/types'

// ===============================================
// KPI Store State Types
// ===============================================

/**
 * Filter options for KPI entries
 */
export interface KpiFilters {
  department?: 'kitchen' | 'bar' | 'all'
  staffId?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Filter options for production schedule
 */
export interface ScheduleFilters {
  department?: 'kitchen' | 'bar' | 'all'
  slot?: 'urgent' | 'morning' | 'afternoon' | 'evening' | 'all'
  status?: 'pending' | 'completed' | 'all'
  date?: string // ISO date
}

/**
 * KPI summary statistics
 */
export interface KpiSummary {
  totalProductions: number
  totalProductionValue: number
  totalWriteoffs: number
  totalWriteoffValue: number
  writeoffRate: number // percentage
  onTimeRate: number // percentage
  avgProductionsPerDay: number
}

/**
 * Schedule summary statistics
 */
export interface ScheduleSummary {
  totalTasks: number
  pendingTasks: number
  completedTasks: number
  urgentTasks: number
  completionRate: number // percentage
}

/**
 * Main KPI store state
 */
export interface KitchenKpiState {
  // KPI data
  kpiEntries: import('@/stores/preparation/types').KitchenKpiEntry[]
  currentUserKpi: import('@/stores/preparation/types').KitchenKpiEntry | null

  // Schedule data
  scheduleItems: import('@/stores/preparation/types').ProductionScheduleItem[]
  recommendations: import('@/stores/preparation/types').ProductionRecommendation[]

  // Loading states
  loading: {
    kpi: boolean
    schedule: boolean
    recommendations: boolean
    submitting: boolean
  }

  // Error state
  error: string | null

  // Filters
  kpiFilters: KpiFilters
  scheduleFilters: ScheduleFilters

  // Computed summaries (cached)
  kpiSummary: KpiSummary | null
  scheduleSummary: ScheduleSummary | null

  // Store status
  initialized: boolean
  lastFetchedAt: string | null
}

/**
 * Create schedule item DTO
 */
export interface CreateScheduleItemData {
  preparationId: string
  preparationName: string
  department: 'kitchen' | 'bar'
  scheduleDate: string
  productionSlot: import('@/stores/preparation/types').ProductionScheduleSlot
  targetQuantity: number
  targetUnit: string
  priority?: number
  recommendationReason?: string
}

/**
 * Complete schedule task DTO
 */
export interface CompleteScheduleTaskData {
  taskId: string
  completedQuantity: number
  completedBy: string
  completedByName: string
  preparationBatchId?: string
  notes?: string
}

/**
 * Record KPI entry DTO
 */
export interface RecordKpiEntryData {
  staffId: string
  staffName: string
  department: 'kitchen' | 'bar'
  periodDate: string
  productionDetail?: import('@/stores/preparation/types').ProductionKpiDetail
  writeoffDetail?: import('@/stores/preparation/types').WriteoffKpiDetail
  scheduleCompletionDetail?: ScheduleCompletionKpiDetail
}

/**
 * Schedule completion KPI detail
 */
export interface ScheduleCompletionKpiDetail {
  scheduleItemId: string
  preparationName: string
  targetQuantity: number
  completedQuantity: number
  productionSlot: import('@/stores/preparation/types').ProductionScheduleSlot
  isOnTime: boolean
  timestamp: string
}

/**
 * Supabase row types (database schema)
 */
export interface KitchenKpiRow {
  id: string
  staff_id: string
  staff_name: string
  department: string
  period_date: string
  productions_completed: number
  production_quantity_total: number
  production_value_total: number
  writeoffs_kpi_affecting: number
  writeoff_value_kpi_affecting: number
  writeoffs_non_kpi: number
  writeoff_value_non_kpi: number
  on_time_completions: number
  late_completions: number
  production_details: any // JSONB
  writeoff_details: any // JSONB
  created_at: string
  updated_at: string
}

export interface ProductionScheduleRow {
  id: string
  preparation_id: string
  preparation_name: string
  department: string
  schedule_date: string
  production_slot: string
  priority: number
  target_quantity: number
  target_unit: string
  current_stock_at_generation: number | null
  recommendation_reason: string | null
  status: string
  completed_at: string | null
  completed_by: string | null
  completed_by_name: string | null
  completed_quantity: number | null
  preparation_batch_id: string | null
  sync_status: string
  synced_at: string | null
  sync_error: string | null
  created_at: string
  updated_at: string
}
