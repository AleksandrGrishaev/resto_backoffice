// src/stores/storage/index.ts - UPDATED WITH WRITE-OFF COMPOSABLE

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
  doesWriteOffAffectKPI
} from './types'

// Export service
export { storageService } from './storageService'

// Export store
export { useStorageStore } from './storageStore'

// ✅ Export specialized composables
export { useWriteOff } from './composables/useWriteOff'

// Export mock data for testing
export {
  mockStorageBatches,
  mockStorageOperations,
  mockStorageBalances,
  generateBatchNumber,
  calculateFifoAllocation
} from './storageMock'
