// src/stores/storage/index.ts - UPDATED WITH useBatches COMPOSABLE

// Export all types including new transit types
export type {
  StorageDepartment,
  StorageItemType,
  OperationType,
  WriteOffReason,
  BatchSourceType,
  BatchStatus,
  StorageBatch,
  BatchAllocation,
  StorageOperationItem,
  StorageOperation,
  StorageBalance,
  InventoryDocument,
  InventoryItem,
  CreateReceiptData,
  ReceiptItem,
  CreateWriteOffData,
  WriteOffItem,
  CreateCorrectionData,
  CorrectionItem,
  CreateInventoryData,
  CreateTransitBatchData, // ✅ NEW: Export transit batch types
  StorageState,
  QuickWriteOffItem,
  WriteOffStatistics,
  WRITE_OFF_CLASSIFICATION,
  WRITE_OFF_REASON_OPTIONS, // ✅ NEW: Export write-off reason options
  doesWriteOffAffectKPI,
  getWriteOffReasonInfo // ✅ NEW: Export write-off reason info helper
} from './types'

// Export service
export { storageService } from './storageService'

// Export store
export { useStorageStore } from './storageStore'

// ✅ Export specialized composables
export { useWriteOff } from './composables/useWriteOff'
export { useBatches } from './composables/useBatches' // ✅ NEW: Export transit composable
