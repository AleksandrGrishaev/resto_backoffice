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
  completedBy?: string // UUID, optional for system actions
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

// ===============================================
// TIME KPI Types (Order Processing Time Tracking)
// ===============================================

/**
 * Plan times for different departments (in seconds)
 */
export const TIME_KPI_PLAN = {
  kitchen: 900, // 15 minutes
  bar: 300 // 5 minutes
} as const

/**
 * Realtime time KPI metrics (calculated from in-memory dishes)
 */
export interface TimeKpiMetrics {
  avgWaitingSeconds: number
  avgCookingSeconds: number
  avgTotalSeconds: number
  itemsCompleted: number
  itemsExceededPlan: number
  exceededRate: number // percentage (0-100)
}

/**
 * Historical time KPI summary entry (from database aggregation)
 */
export interface TimeKpiSummaryEntry {
  periodDate: string
  department: string
  avgWaitingSeconds: number
  avgCookingSeconds: number
  avgTotalSeconds: number
  itemsCompleted: number
  itemsExceededPlan: number
}

/**
 * Time KPI detail entry (individual dish timing)
 */
export interface TimeKpiDetailEntry {
  itemId: string
  orderId: string
  orderNumber: string
  productName: string
  department: string
  draftSeconds: number // time from created to sent_to_kitchen
  waitingSeconds: number
  cookingSeconds: number
  totalSeconds: number
  exceededPlan: boolean
  readyAt: string
}

/**
 * Time KPI filters for queries
 */
export interface TimeKpiFilters {
  dateFrom: string // ISO date
  dateTo: string // ISO date
  department?: 'kitchen' | 'bar' | null
}

/**
 * Database row type for time KPI summary (RPC result)
 */
export interface TimeKpiSummaryRow {
  period_date: string
  department: string
  avg_waiting_seconds: number
  avg_cooking_seconds: number
  avg_total_seconds: number
  items_completed: number
  items_exceeded_plan: number
}

/**
 * Database row type for time KPI detail (RPC result)
 */
export interface TimeKpiDetailRow {
  item_id: string
  order_id: string
  order_number: string
  product_name: string
  department: string
  draft_seconds: number
  waiting_seconds: number
  cooking_seconds: number
  total_seconds: number
  exceeded_plan: boolean
  ready_at: string
}

/**
 * Database row type for today's KPI (RPC result)
 */
export interface TimeKpiTodayRow {
  department: string
  avg_waiting_seconds: number
  avg_cooking_seconds: number
  avg_total_seconds: number
  items_completed: number
  items_exceeded_plan: number
  exceeded_rate: number
}

// ===============================================
// FOOD COST KPI Types
// ===============================================

/**
 * Target COGS percentages by department
 */
export const FOOD_COST_TARGETS = {
  kitchen: 30, // 30%
  bar: 25 // 25%
} as const

/**
 * Variance threshold for color coding (legacy - variance from target)
 * - 0 to warning: OK (green)
 * - warning to error: Warning (yellow)
 * - above error: Error (red)
 */
export const VARIANCE_THRESHOLD = {
  warning: 5, // Show warning if over target by up to 5%
  error: 5 // Show error if over target by more than 5%
} as const

/**
 * Loss Impact threshold for color coding
 * Shows impact of losses (spoilage, shortage, surplus) as % of revenue
 * - 0-10%: OK (green) - normal operational losses
 * - 10-20%: Warning (yellow) - elevated losses
 * - 20-30%: High (orange) - significant losses
 * - 30%+: Critical (red) - requires immediate attention
 */
export const LOSS_VARIANCE_THRESHOLD = {
  ok: 10, // 0-10%: OK (green)
  warning: 20, // 10-20%: Warning (yellow)
  high: 30 // 20-30%: High (orange), 30%+: Critical (red)
} as const

/**
 * Food Cost KPI metrics for a month
 */
export interface FoodCostKpiMetrics {
  period: {
    startDate: string // ISO date
    endDate: string // ISO date
  }
  revenue: number
  revenueByDepartment: {
    kitchen: number
    bar: number
  }
  salesCOGS: number // Cost from sales transactions (FIFO)
  spoilage: number // Write-offs (spoiled, damaged, expired)
  shortage: number // Inventory shortage (actual < expected)
  surplus: number // Inventory surplus (actual > expected)
  totalCOGS: number // salesCOGS + spoilage + shortage - surplus
  totalCOGSPercent: number // (totalCOGS / revenue) * 100
  targetPercent: number // Target percentage for the department
  variance: number // totalCOGSPercent - targetPercent
}

/**
 * Database row type for Food Cost KPI (RPC result)
 */
export interface FoodCostKpiRow {
  period: {
    startDate: string
    endDate: string
  }
  revenue: number
  revenueByDepartment: {
    kitchen: number
    bar: number
  }
  salesCOGS: number
  spoilage: number
  shortage: number
  surplus: number
  totalCOGS: number
  totalCOGSPercent: number
}

// ===============================================
// UNIFIED HISTORY Types (History Tab Enhancement)
// ===============================================

/**
 * Type of operation in unified history view
 */
export type HistoryOperationType = 'production' | 'preparation_writeoff' | 'product_writeoff'

/**
 * Filter options for unified history
 */
export type HistoryFilterType = 'all' | 'production' | 'writeoff'

/**
 * Unified history item for displaying all operations in History tab
 */
export interface UnifiedHistoryItem {
  id: string
  type: HistoryOperationType
  timestamp: string // ISO datetime - for sorting
  displayName: string // Name of item (preparation or product)
  quantity: number
  unit: string
  totalValue?: number // Cost value (for write-offs)
  responsiblePerson?: string
  department: 'kitchen' | 'bar'
  notes?: string // Operation notes (e.g. 'auto_reconciliation' for phantom production)

  // Production-specific details
  productionDetails?: {
    productionSlot: import('@/stores/preparation/types').ProductionScheduleSlot
    portionType?: string
    portionSize?: number
  }

  // Write-off specific details
  writeOffDetails?: {
    operationId: string
    reason: string // 'expired', 'spoiled', 'other', 'education', 'test'
    affectsKPI: boolean
    notes?: string
    itemType: 'preparation' | 'product'
  }
}

/**
 * Summary statistics for history tab
 */
export interface HistorySummary {
  totalProduced: number // Total quantity produced (grams)
  totalWrittenOff: number // Total quantity written off (grams)
  productionCount: number // Number of production items
  writeOffCount: number // Number of write-off items
  totalWriteOffValue: number // Total cost of write-offs (IDR)
}
