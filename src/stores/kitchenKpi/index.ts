// src/stores/kitchenKpi/index.ts
// Kitchen/Bar KPI Management Store

/**
 * Kitchen KPI Store
 *
 * Manages staff performance tracking, production schedules, and KPI metrics
 * for Kitchen and Bar departments with offline-first support.
 */

// Export types
export type {
  // Core types (from preparation)
  KitchenKpiEntry,
  ProductionKpiDetail,
  WriteoffKpiDetail,
  ProductionScheduleItem,
  ProductionRecommendation,
  ProductionScheduleSlot,
  ProductionScheduleStatus,
  SyncStatus,
  StorageLocation,
  ProductionSlot,
  // Store-specific types
  KpiFilters,
  ScheduleFilters,
  KpiSummary,
  ScheduleSummary,
  KitchenKpiState,
  CreateScheduleItemData,
  CompleteScheduleTaskData,
  RecordKpiEntryData,
  ScheduleCompletionKpiDetail,
  KitchenKpiRow,
  ProductionScheduleRow,
  // Unified History types
  UnifiedHistoryItem,
  HistorySummary,
  HistoryOperationType,
  HistoryFilterType
} from './types'

// Export helper functions
export {
  getProductionSlotInfo,
  getStorageLocationInfo,
  STORAGE_LOCATION_OPTIONS,
  PRODUCTION_SLOT_OPTIONS
} from './types'

// Export service
export { kitchenKpiService } from './kitchenKpiService'

// Export store
export { useKitchenKpiStore } from './kitchenKpiStore'

// Export composables
export { useKitchenKpi } from './composables/useKitchenKpi'
export { useProductionSchedule } from './composables/useProductionSchedule'
export { useHistoryTab } from './composables/useHistoryTab'
