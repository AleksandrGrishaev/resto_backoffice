// src/core/decomposition/adapters/index.ts
// Public exports for decomposition adapters

// Interface
export type {
  IDecompositionAdapter,
  WriteOffAdapterConfig,
  CostAdapterConfig
} from './IDecompositionAdapter'

// WriteOffAdapter
export { WriteOffAdapter, createWriteOffAdapter } from './WriteOffAdapter'
export type { WriteOffItem, WriteOffResult } from './WriteOffAdapter'

// CostAdapter
export { CostAdapter, createCostAdapter, calculateActualCostFromNodes } from './CostAdapter'
export type {
  BatchAllocation,
  ProductCostItem,
  PreparationCostItem,
  ActualCostBreakdown
} from './CostAdapter'
