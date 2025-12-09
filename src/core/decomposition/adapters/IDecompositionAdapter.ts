// src/core/decomposition/adapters/IDecompositionAdapter.ts
// Interface for decomposition adapters

import type { TraversalOptions, TraversalResult, MenuItemInput } from '../types'

/**
 * Base interface for decomposition adapters
 *
 * Adapters transform the raw DecompositionEngine output
 * into domain-specific formats for different use cases:
 * - WriteOffAdapter: For inventory write-off (DecomposedItem[])
 * - CostAdapter: For FIFO cost calculation (ActualCostBreakdown)
 */
export interface IDecompositionAdapter<TOutput> {
  /**
   * Get traversal options for this adapter
   * Each adapter may need different traversal strategies
   */
  getTraversalOptions(): TraversalOptions

  /**
   * Transform traversal result into adapter-specific output
   *
   * @param result - Raw traversal result from DecompositionEngine
   * @param input - Original input for context (quantity, modifiers, etc.)
   * @returns Transformed output specific to this adapter
   */
  transform(result: TraversalResult, input: MenuItemInput): Promise<TOutput>
}

/**
 * Configuration for WriteOff adapter
 */
export interface WriteOffAdapterConfig {
  /** Include decomposition path in results for debugging */
  includePath?: boolean
  /** Merge duplicate items by type+id+unit */
  mergeDuplicates?: boolean
}

/**
 * Configuration for Cost adapter
 */
export interface CostAdapterConfig {
  /** Department for batch allocation */
  department?: 'kitchen' | 'bar'
  /** Warehouse ID for product batches */
  warehouseId?: string
  /** Use fallback to baseCostPerUnit if no batches */
  useFallbackCost?: boolean
}
