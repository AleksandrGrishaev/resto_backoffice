// src/core/decomposition/index.ts
// Public API for DecompositionEngine

// Main engine
export {
  DecompositionEngine,
  createDecompositionEngine,
  ensureStoresInitialized
} from './DecompositionEngine'

// Utility functions for working with decomposed nodes
export {
  calculateTotalBaseCost,
  getNodeNames,
  filterProductNodes,
  filterPreparationNodes
} from './DecompositionEngine'

// Types
export type {
  // Input/Output types
  MenuItemInput,
  TraversalOptions,
  TraversalResult,
  DecomposedNode,
  DecomposedProductNode,
  DecomposedPreparationNode,

  // Store provider
  StoreProvider,

  // Data types for lookups
  ProductForDecomposition,
  PreparationForDecomposition,
  RecipeForDecomposition,
  MenuItemForDecomposition,
  MenuVariantForDecomposition,
  RecipeComponent,
  PreparationIngredient,

  // Re-exported from menu types
  MenuComposition,
  SelectedModifier,
  TargetComponent,

  // Strategy types
  PreparationStrategy
} from './types'

// Default options
export { DEFAULT_WRITEOFF_OPTIONS, DEFAULT_COST_OPTIONS, DecompositionError } from './types'

// Utilities - replacement
export {
  getReplacementKey,
  buildReplacementMap,
  getReplacementForComponent,
  getReplacementForVariantComponent,
  getAddonModifiers
} from './utils/replacementUtils'

// Utilities - portions
export {
  convertPortionToGrams,
  getPortionMultiplier,
  calculateEffectiveQuantity,
  isPortionUnit,
  normalizeUnit
} from './utils/portionUtils'
export type { PortionConversionResult } from './utils/portionUtils'

// Utilities - yield
export {
  applyYieldAdjustment,
  calculateGrossQuantity,
  calculateNetQuantity,
  getEffectiveYieldPercentage,
  hasSignificantYield
} from './utils/yieldUtils'
export type { YieldAdjustmentResult } from './utils/yieldUtils'

// Utilities - batch allocation (FIFO)
export {
  allocateFromPreparationBatches,
  allocateFromStorageBatches,
  resetBatchAllocationCache
} from './utils/batchAllocationUtils'

// =============================================
// Adapters (Phase 2)
// =============================================

// Adapter interface
export type { IDecompositionAdapter, WriteOffAdapterConfig, CostAdapterConfig } from './adapters'

// WriteOffAdapter - for inventory write-off
export { WriteOffAdapter, createWriteOffAdapter } from './adapters'
export type { WriteOffItem, WriteOffResult } from './adapters'

// CostAdapter - for FIFO cost calculation
export { CostAdapter, createCostAdapter, calculateActualCostFromNodes } from './adapters'
export type {
  BatchAllocation,
  ProductCostItem,
  PreparationCostItem,
  ActualCostBreakdown
} from './adapters'

// =============================================
// FIFO Allocation Service (Supabase RPC)
// =============================================

export {
  allocatePreparationFifo,
  allocateProductFifo,
  allocateBatchFifo,
  writeOffItemsToAllocationRequests,
  applyFifoResultsToWriteOffItems
} from './services/FifoAllocationService'

export type {
  FifoAllocationRequest,
  FifoAllocationResult,
  BatchFifoResult,
  BatchFifoSummary
} from './services/FifoAllocationService'
