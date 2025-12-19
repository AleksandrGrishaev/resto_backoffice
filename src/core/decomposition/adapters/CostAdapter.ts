// src/core/decomposition/adapters/CostAdapter.ts
// Adapter for FIFO cost calculation
// Uses batchAllocationUtils for core FIFO logic

import type { IDecompositionAdapter, CostAdapterConfig } from './IDecompositionAdapter'
import type {
  TraversalOptions,
  TraversalResult,
  MenuItemInput,
  DecomposedNode,
  DecomposedProductNode,
  DecomposedPreparationNode
} from '../types'
import { DEFAULT_COST_OPTIONS } from '../types'
import { DebugUtils, TimeUtils } from '@/utils'

// Import shared batch allocation utilities
import {
  allocateFromPreparationBatches as allocatePreparation,
  allocateFromStorageBatches as allocateStorage
} from '../utils/batchAllocationUtils'

// Import types from existing modules (avoid duplication)
import type {
  BatchAllocation,
  ProductCostItem,
  PreparationCostItem,
  ActualCostBreakdown
} from '@/stores/sales/types'

// Re-export types for convenience
export type { BatchAllocation, ProductCostItem, PreparationCostItem, ActualCostBreakdown }

const MODULE_NAME = 'CostAdapter'

// =============================================
// CostAdapter
// =============================================

/**
 * CostAdapter
 *
 * Transforms DecompositionEngine output into ActualCostBreakdown
 * using FIFO batch allocation.
 *
 * Uses shared batchAllocationUtils for core FIFO logic.
 *
 * Features:
 * - FIFO allocation from storage batches (products)
 * - FIFO allocation from preparation batches
 * - Handles negative batches (uses their cost)
 * - Falls back to baseCostPerUnit if no batches
 * - Calculates weighted average cost per item
 */
export class CostAdapter implements IDecompositionAdapter<ActualCostBreakdown> {
  private config: CostAdapterConfig

  constructor(config: CostAdapterConfig = {}) {
    this.config = {
      department: 'kitchen',
      useFallbackCost: true,
      ...config
    }
  }

  /**
   * Initialize adapter (no-op - stores are lazily loaded by utils)
   */
  async initialize(): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'CostAdapter initialized', {
      department: this.config.department,
      warehouseId: this.config.warehouseId
    })
  }

  /**
   * Get traversal options for cost calculation
   */
  getTraversalOptions(): TraversalOptions {
    return DEFAULT_COST_OPTIONS
  }

  /**
   * Transform traversal result to ActualCostBreakdown
   */
  async transform(result: TraversalResult, _input: MenuItemInput): Promise<ActualCostBreakdown> {
    DebugUtils.info(MODULE_NAME, 'Calculating actual cost from FIFO batches', {
      nodesCount: result.nodes.length,
      menuItem: result.metadata.menuItemName
    })

    const preparationCosts: PreparationCostItem[] = []
    const productCosts: ProductCostItem[] = []

    // Process each node using shared utilities
    for (const node of result.nodes) {
      try {
        if (node.type === 'preparation') {
          const prepNode = node as DecomposedPreparationNode

          // 🐛 DEBUG: Log before allocation
          DebugUtils.debug(MODULE_NAME, '🔵 Allocating preparation from batches', {
            preparationId: prepNode.preparationId,
            preparationName: prepNode.preparationName,
            quantity: prepNode.quantity,
            unit: prepNode.unit,
            portionSize: prepNode.portionSize,
            department: this.config.department || 'kitchen'
          })

          // 🔧 FIX: Pass portionSize for cost conversion when quantity was converted to grams
          const prepCost = await allocatePreparation(
            prepNode.preparationId,
            prepNode.quantity,
            this.config.department || 'kitchen',
            prepNode.portionSize // If provided, will convert cost from per-portion to per-gram
          )

          // 🐛 DEBUG: Log after allocation
          DebugUtils.debug(MODULE_NAME, '✅ Preparation cost allocated', {
            preparationId: prepCost.preparationId,
            preparationName: prepCost.preparationName,
            requestedQuantity: prepNode.quantity,
            allocatedQuantity: prepCost.quantity,
            unit: prepCost.unit,
            totalCost: prepCost.totalCost
          })

          preparationCosts.push(prepCost)
        } else if (node.type === 'product') {
          const prodNode = node as DecomposedProductNode
          const prodCost = await allocateStorage(
            prodNode.productId,
            prodNode.quantity,
            this.config.warehouseId
          )
          productCosts.push(prodCost)
        }
      } catch (error) {
        const nodeName =
          node.type === 'preparation'
            ? (node as DecomposedPreparationNode).preparationName
            : (node as DecomposedProductNode).productName
        DebugUtils.error(MODULE_NAME, `Failed to allocate ${node.type}: ${nodeName}`, {
          error: error instanceof Error ? error.message : String(error),
          node
        })
        // Continue with other nodes - don't fail entire calculation
      }
    }

    // Calculate total cost
    const totalCost =
      preparationCosts.reduce((sum, c) => sum + c.totalCost, 0) +
      productCosts.reduce((sum, c) => sum + c.totalCost, 0)

    DebugUtils.info(MODULE_NAME, 'Actual cost calculated', {
      totalCost,
      preparationItems: preparationCosts.length,
      productItems: productCosts.length
    })

    return {
      totalCost,
      preparationCosts,
      productCosts,
      method: 'FIFO',
      calculatedAt: TimeUtils.getCurrentLocalISO()
    }
  }
}

/**
 * Factory function for creating CostAdapter
 */
export function createCostAdapter(config?: CostAdapterConfig): CostAdapter {
  return new CostAdapter(config)
}

/**
 * Convenience function for quick cost calculation
 * Creates adapter, initializes it, and calculates cost
 */
export async function calculateActualCostFromNodes(
  nodes: DecomposedNode[],
  config?: CostAdapterConfig
): Promise<ActualCostBreakdown> {
  const adapter = new CostAdapter(config)
  await adapter.initialize()

  // Create a minimal TraversalResult
  const result: TraversalResult = {
    nodes,
    metadata: {
      menuItemName: 'Direct calculation',
      variantName: '',
      quantity: 1,
      modifiersApplied: 0,
      replacementsApplied: 0,
      traversedAt: TimeUtils.getCurrentLocalISO()
    }
  }

  const input: MenuItemInput = {
    menuItemId: '',
    variantId: '',
    quantity: 1
  }

  return adapter.transform(result, input)
}
