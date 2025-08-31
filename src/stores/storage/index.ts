// src/stores/storage/index.ts - ДОБАВЛЕН ЭКСПОРТ StorageBalanceWithTransit

// Export all types
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
  StorageBalanceWithTransit, // ✅ ДОБАВЛЕН новый тип
  InventoryDocument,
  InventoryItem,
  CreateReceiptData,
  ReceiptItem,
  CreateWriteOffData,
  WriteOffItem,
  CreateCorrectionData,
  CorrectionItem,
  CreateInventoryData,
  StorageState,
  QuickWriteOffItem,
  WriteOffStatistics,
  WRITE_OFF_CLASSIFICATION,
  WRITE_OFF_REASON_OPTIONS, // ✅ ДОБАВЛЕН
  doesWriteOffAffectKPI,
  getWriteOffReasonInfo // ✅ ДОБАВЛЕН
} from './types'

// Export service
export { storageService } from './storageService'

// Export store
export { useStorageStore } from './storageStore'

// ✅ Export specialized composables
export { useWriteOff } from './composables/useWriteOff'
