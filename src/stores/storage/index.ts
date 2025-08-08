// src/stores/storage/index.ts - ФИНАЛЬНАЯ ВЕРСИЯ БЕЗ CONSUMPTION

// Export all types (только receipt, correction, inventory)
export type {
  StorageDepartment,
  StorageItemType,
  OperationType, // только 'receipt' | 'correction' | 'inventory'
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
  CreateCorrectionData, // ✅ НОВОЕ
  CorrectionItem, // ✅ НОВОЕ
  CreateInventoryData,
  StorageState
} from './types'

// Export service
export { storageService } from './storageService'

// Export store
export { useStorageStore } from './storageStore'

// Export mock data for testing
export {
  mockStorageBatches,
  mockStorageOperations,
  mockStorageBalances,
  generateBatchNumber,
  calculateFifoAllocation
} from './storageMock'
