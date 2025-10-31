// src/stores/storage/index.ts - ДОБАВЛЕН ЭКСПОРТ StorageBalanceWithTransit

// Export all types
export type {
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
  StorageBalanceWithTransit,
  CreateTransitBatchData, // ✅ ДОБАВИТЬ
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
  Warehouse,
  WRITE_OFF_CLASSIFICATION,
  WRITE_OFF_REASON_OPTIONS,
  doesWriteOffAffectKPI,
  getWriteOffReasonInfo
} from './types'

// ✅ Экспорт константы DEFAULT_WAREHOUSE
export { DEFAULT_WAREHOUSE } from './types'

// Export service
export { storageService } from './storageService'

// Export store
export { useStorageStore } from './storageStore'

// ✅ Export specialized composables
export { useWriteOff } from './composables/useWriteOff'
export { useInventory } from './composables/useInventory'
