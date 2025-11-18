// src/stores/preparation/index.ts - UPDATED: Added Write-off Support

/**
 * Preparation Management Store
 *
 * Управление полуфабрикатами с FIFO учетом, отслеживанием коротких сроков годности,
 * поддержкой write-off операций и интеграцией с системой рецептов для Kitchen и Bar департаментов.
 */

// ✅ UPDATED: Export all types including write-off types
export type {
  PreparationDepartment,
  PreparationOperationType,
  BatchSourceType,
  BatchStatus,
  PreparationBatch,
  BatchAllocation,
  PreparationOperationItem,
  PreparationOperation,
  PreparationBalance,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  CreatePreparationReceiptData,
  PreparationReceiptItem,
  CreatePreparationCorrectionData,
  PreparationCorrectionItem,
  CreatePreparationInventoryData,
  PreparationState,
  // ✅ NEW: Write-off types
  PreparationWriteOffReason,
  CreatePreparationWriteOffData,
  PreparationWriteOffItem,
  PreparationWriteOffStatistics,
  QuickPreparationWriteOffItem,
  PREPARATION_WRITE_OFF_CLASSIFICATION,
  doesPreparationWriteOffAffectKPI,
  getPreparationWriteOffReasonInfo,
  PREPARATION_WRITE_OFF_REASON_OPTIONS
} from './types'

// Export service
export { preparationService } from './preparationService'

// Export store
export { usePreparationStore } from './preparationStore'

// ✅ NEW: Export write-off composable
export { usePreparationWriteOff } from './composables/usePreparationWriteOff'

// Note: Preparation mock data removed - batch tracking will be migrated to Supabase in future sprint
