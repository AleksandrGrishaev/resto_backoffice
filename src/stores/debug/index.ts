// src/stores/debug/index.ts

// Main store
export { useDebugStore } from './debugStore'

// Service
export { debugService } from './debugService'

// Composables
export { useDebugStores } from './composables/useDebugStores'

// Types
export type {
  DebugStoreInfo,
  DebugStoreData,
  DebugStoreAnalysis,
  DebugHistoryEntry,
  DebugChange,
  DebugState,
  DebugTabId,
  StoreId,
  CopyOperation,
  StoreSpecificMetrics,
  ProductsStoreMetrics,
  CounteragentsStoreMetrics,
  RecipesStoreMetrics,
  AccountStoreMetrics,
  MenuStoreMetrics,
  StorageStoreMetrics,
  SupplierStoreMetrics
} from './types'

// Constants
export { DEBUG_TABS, STORE_CONFIGURATIONS } from './types'
