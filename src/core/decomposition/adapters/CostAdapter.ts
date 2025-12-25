// src/core/decomposition/adapters/CostAdapter.ts
// Adapter for FIFO cost calculation
// Supports both client-side and Supabase RPC allocation

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

// Import shared batch allocation utilities (client-side fallback)
import {
  allocateFromPreparationBatches as allocatePreparation,
  allocateFromStorageBatches as allocateStorage
} from '../utils/batchAllocationUtils'

// Import RPC allocation service
import {
  allocateBatchFifo,
  type FifoAllocationRequest,
  type FifoAllocationResult
} from '../services/FifoAllocationService'

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

// Feature flag for RPC allocation (can be toggled for testing/rollback)
const USE_RPC_ALLOCATION = true

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
    DebugUtils.debug(MODULE_NAME, 'CostAdapter initialized', {
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
    DebugUtils.debug(MODULE_NAME, 'Calculating actual cost from FIFO batches', {
      nodesCount: result.nodes.length,
      menuItem: result.metadata.menuItemName,
      useRpc: USE_RPC_ALLOCATION
    })

    // Use RPC allocation if enabled (single round-trip)
    if (USE_RPC_ALLOCATION) {
      return this.transformWithRpc(result)
    }

    // Fallback to client-side allocation
    return this.transformClientSide(result)
  }

  /**
   * RPC-based FIFO allocation (single round-trip to Supabase)
   */
  private async transformWithRpc(result: TraversalResult): Promise<ActualCostBreakdown> {
    const startTime = performance.now()

    // Collect all items for batch allocation
    const requests: FifoAllocationRequest[] = []
    const nodeMap = new Map<string, DecomposedNode>()

    for (const node of result.nodes) {
      if (node.type === 'preparation') {
        const prepNode = node as DecomposedPreparationNode
        requests.push({
          type: 'preparation',
          id: prepNode.preparationId,
          quantity: prepNode.quantity,
          fallbackCost: prepNode.baseCostPerUnit || 0
        })
        nodeMap.set(prepNode.preparationId, node)
      } else if (node.type === 'product') {
        const prodNode = node as DecomposedProductNode
        requests.push({
          type: 'product',
          id: prodNode.productId,
          quantity: prodNode.quantity,
          fallbackCost: prodNode.baseCostPerUnit || 0
        })
        nodeMap.set(prodNode.productId, node)
      }
    }

    if (requests.length === 0) {
      return {
        totalCost: 0,
        preparationCosts: [],
        productCosts: [],
        method: 'FIFO_RPC',
        calculatedAt: TimeUtils.getCurrentLocalISO()
      }
    }

    // Single RPC call for all items
    const rpcResult = await allocateBatchFifo(requests)
    const duration = performance.now() - startTime

    if (!rpcResult.success) {
      DebugUtils.error(MODULE_NAME, 'RPC allocation failed, falling back to client-side', {
        error: rpcResult.error
      })
      return this.transformClientSide(result)
    }

    // Convert RPC results to CostAdapter format
    const preparationCosts: PreparationCostItem[] = []
    const productCosts: ProductCostItem[] = []

    for (const fifoResult of rpcResult.results) {
      if (!fifoResult.success) continue

      const allocations: BatchAllocation[] = fifoResult.allocations.map(alloc => ({
        batchId: alloc.batchId,
        batchNumber: alloc.batchNumber,
        quantity: alloc.allocatedQuantity,
        costPerUnit: alloc.costPerUnit,
        totalCost: alloc.totalCost
      }))

      if (fifoResult.preparationId) {
        const node = nodeMap.get(fifoResult.preparationId) as DecomposedPreparationNode | undefined
        preparationCosts.push({
          preparationId: fifoResult.preparationId,
          preparationName: fifoResult.preparationName || node?.preparationName || 'Unknown',
          quantity: fifoResult.allocatedQuantity,
          unit: node?.unit || 'gram',
          avgCostPerUnit: fifoResult.averageCostPerUnit,
          totalCost: fifoResult.totalCost,
          allocations,
          usedNegativeBatch: fifoResult.deficit > 0,
          source: fifoResult.usedFallback ? 'fallback' : 'fifo'
        })
      } else if (fifoResult.productId) {
        const node = nodeMap.get(fifoResult.productId) as DecomposedProductNode | undefined
        productCosts.push({
          productId: fifoResult.productId,
          productName: fifoResult.productName || node?.productName || 'Unknown',
          quantity: fifoResult.allocatedQuantity,
          unit: node?.unit || 'gram',
          avgCostPerUnit: fifoResult.averageCostPerUnit,
          totalCost: fifoResult.totalCost,
          allocations,
          source: fifoResult.usedFallback ? 'fallback' : 'fifo'
        })
      }
    }

    const totalCost = rpcResult.summary?.totalCost ?? 0

    DebugUtils.info(MODULE_NAME, '⚡ RPC FIFO allocation completed', {
      totalCost,
      preparationItems: preparationCosts.length,
      productItems: productCosts.length,
      durationMs: Math.round(duration)
    })

    return {
      totalCost,
      preparationCosts,
      productCosts,
      method: 'FIFO_RPC',
      calculatedAt: TimeUtils.getCurrentLocalISO()
    }
  }

  /**
   * Client-side FIFO allocation (fallback, multiple round-trips)
   */
  private async transformClientSide(result: TraversalResult): Promise<ActualCostBreakdown> {
    const preparationCosts: PreparationCostItem[] = []
    const productCosts: ProductCostItem[] = []

    // Process each node using shared utilities
    for (const node of result.nodes) {
      try {
        if (node.type === 'preparation') {
          const prepNode = node as DecomposedPreparationNode

          DebugUtils.debug(MODULE_NAME, '🔵 Allocating preparation from batches (client)', {
            preparationId: prepNode.preparationId,
            preparationName: prepNode.preparationName,
            quantity: prepNode.quantity,
            unit: prepNode.unit,
            department: this.config.department || 'kitchen'
          })

          const prepCost = await allocatePreparation(
            prepNode.preparationId,
            prepNode.quantity,
            this.config.department || 'kitchen'
          )

          DebugUtils.debug(MODULE_NAME, '✅ Preparation cost allocated (client)', {
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

    DebugUtils.info(MODULE_NAME, 'Actual cost calculated (client-side)', {
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
