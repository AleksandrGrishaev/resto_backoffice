// src/stores/storage/index.ts - УПРОЩЕННАЯ АРХИТЕКТУРА

// ==========================================
// TYPES EXPORTS
// ==========================================
export type {
  StorageDepartment,
  StorageItemType,
  OperationType,
  BatchSourceType,
  BatchStatus,
  InventoryStatus,
  OperationStatus,
  ExpiryStatus,
  ExpiryInfo,
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
  CreateProductionData,
  ProductionIngredient,
  ProductionOperation,
  StorageFilters,
  StorageSettings,
  StorageLoadingState,
  StorageState,
  StorageStatistics,
  PriceTrend,
  UsageAnalytics,
  ValidationResult,
  MissingIngredient,
  ProductionValidation,
  FifoCalculationOptions,
  FifoAllocationResult,
  StockValidationParams,
  StockValidationResult
} from './types'

// ==========================================
// MAIN STORE EXPORT
// ==========================================
export { useStorageStore } from './storageStore'

// ==========================================
// SERVICES EXPORTS
// ==========================================
export { storageDataService } from './services/storageDataService'
export { fifoCalculationService } from './services/fifoCalculationService'
export { productionService } from './services/productionService'

// ==========================================
// COMPOSABLES EXPORTS
// ==========================================
export { useStorageData } from './composables/useStorageData'
export { useStorageCalculations } from './composables/useStorageCalculations'
export { useProductionOperations } from './composables/useProductionOperations'

// ==========================================
// MOCK DATA EXPORTS (for testing/development)
// ==========================================
export {
  mockStorageBatches,
  mockStorageOperations,
  generateBatchNumber,
  calculateFifoAllocation,
  getStorageStatistics
} from './mock/mockData'

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Convenience function to initialize storage module
 */
export async function initializeStorageModule() {
  const { useStorageStore } = await import('./storageStore')
  const storageStore = useStorageStore()

  try {
    await storageStore.initialize()
    return storageStore
  } catch (error) {
    console.error('Failed to initialize storage module:', error)
    throw error
  }
}

/**
 * Gets the current storage statistics
 */
export async function getCurrentStorageStats() {
  const { useStorageStore } = await import('./storageStore')
  const storageStore = useStorageStore()
  return storageStore.statistics
}

/**
 * Quick access to storage calculations
 */
export function getStorageCalculations() {
  const { useStorageCalculations } = useStorageCalculations
  return useStorageCalculations()
}

/**
 * Quick access to production operations
 */
export function getProductionOperations() {
  const { useProductionOperations } = useProductionOperations
  return useProductionOperations()
}

/**
 * Quick access to storage data operations
 */
export function getStorageData() {
  const { useStorageData } = useStorageData
  return useStorageData()
}

// ==========================================
// CONSTANTS
// ==========================================

/**
 * Default storage settings
 */
export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  expiryWarningDays: 2,
  lowStockMultiplier: 1.2,
  autoCalculateBalance: true
}

/**
 * Storage departments
 */
export const STORAGE_DEPARTMENTS = ['kitchen', 'bar'] as const

/**
 * Storage item types
 */
export const STORAGE_ITEM_TYPES = ['product', 'preparation'] as const

/**
 * Operation types
 */
export const OPERATION_TYPES = [
  'receipt',
  'consumption',
  'inventory',
  'correction',
  'production'
] as const

/**
 * Batch source types
 */
export const BATCH_SOURCE_TYPES = [
  'purchase',
  'production',
  'correction',
  'opening_balance',
  'inventory_adjustment'
] as const

/**
 * Expiry status types
 */
export const EXPIRY_STATUS_TYPES = ['fresh', 'expiring', 'expired'] as const
