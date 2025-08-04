// src/stores/storage/index.ts

// Export all types
export type {
  StorageDepartment,
  StorageItemType,
  OperationType,
  BatchSourceType,
  BatchStatus,
  StorageBatch,
  BatchAllocation,
  StorageOperationItem,
  ConsumptionDetails,
  StorageOperation,
  StorageBalance,
  InventoryDocument,
  InventoryItem,
  CreateConsumptionData,
  ConsumptionItem,
  CreateReceiptData,
  ReceiptItem,
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
