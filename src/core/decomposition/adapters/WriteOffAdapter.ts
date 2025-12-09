// src/core/decomposition/adapters/WriteOffAdapter.ts
// Adapter for inventory write-off

import type { IDecompositionAdapter, WriteOffAdapterConfig } from './IDecompositionAdapter'
import type {
  TraversalOptions,
  TraversalResult,
  MenuItemInput,
  DecomposedNode,
  DecomposedProductNode,
  DecomposedPreparationNode
} from '../types'
import { DEFAULT_WRITEOFF_OPTIONS } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'WriteOffAdapter'

/**
 * Decomposed Item for write-off operations
 * Compatible with existing DecomposedItem type in sales/types.ts
 */
export interface WriteOffItem {
  type: 'product' | 'preparation'

  // Product fields (if type === 'product')
  productId?: string
  productName?: string

  // Preparation fields (if type === 'preparation')
  preparationId?: string
  preparationName?: string

  quantity: number
  unit: string
  costPerUnit: number | null
  totalCost: number

  // Trace path for debugging
  path: string[]
}

/**
 * Result of write-off decomposition
 */
export interface WriteOffResult {
  items: WriteOffItem[]
  totalProducts: number
  totalPreparations: number
  totalBaseCost: number
  metadata: {
    menuItemName: string
    variantName: string
    quantity: number
    processedAt: string
  }
}

/**
 * WriteOffAdapter
 *
 * Transforms DecompositionEngine output into WriteOffItem[] format
 * for inventory write-off operations.
 *
 * Features:
 * - Keeps preparations as final elements (not decomposed further)
 * - Applies yield adjustment for products
 * - Converts portions to grams
 * - Merges duplicate items
 * - Calculates base cost from product catalog
 */
export class WriteOffAdapter implements IDecompositionAdapter<WriteOffResult> {
  private config: WriteOffAdapterConfig

  constructor(config: WriteOffAdapterConfig = {}) {
    this.config = {
      includePath: true,
      mergeDuplicates: true,
      ...config
    }
  }

  /**
   * Get traversal options for write-off
   */
  getTraversalOptions(): TraversalOptions {
    return {
      ...DEFAULT_WRITEOFF_OPTIONS,
      includePath: this.config.includePath ?? true
    }
  }

  /**
   * Transform traversal result to WriteOffResult
   */
  async transform(result: TraversalResult, input: MenuItemInput): Promise<WriteOffResult> {
    DebugUtils.info(MODULE_NAME, 'Transforming traversal result for write-off', {
      nodesCount: result.nodes.length,
      menuItem: result.metadata.menuItemName
    })

    // Convert DecomposedNodes to WriteOffItems
    let items = result.nodes.map(node => this.nodeToWriteOffItem(node))

    // Optionally merge duplicates
    if (this.config.mergeDuplicates) {
      items = this.mergeDuplicates(items)
    }

    // Calculate totals
    const totalProducts = items.filter(i => i.type === 'product').length
    const totalPreparations = items.filter(i => i.type === 'preparation').length
    const totalBaseCost = items.reduce((sum, item) => sum + item.totalCost, 0)

    DebugUtils.info(MODULE_NAME, 'Write-off transformation complete', {
      totalItems: items.length,
      products: totalProducts,
      preparations: totalPreparations,
      totalBaseCost
    })

    return {
      items,
      totalProducts,
      totalPreparations,
      totalBaseCost,
      metadata: {
        menuItemName: result.metadata.menuItemName,
        variantName: result.metadata.variantName,
        quantity: result.metadata.quantity,
        processedAt: result.metadata.traversedAt
      }
    }
  }

  /**
   * Convert DecomposedNode to WriteOffItem
   */
  private nodeToWriteOffItem(node: DecomposedNode): WriteOffItem {
    if (node.type === 'product') {
      return this.productNodeToItem(node)
    }
    return this.preparationNodeToItem(node)
  }

  /**
   * Convert product node to WriteOffItem
   */
  private productNodeToItem(node: DecomposedProductNode): WriteOffItem {
    // Validate baseCostPerUnit to prevent NaN
    const costPerUnit = node.baseCostPerUnit ?? 0
    const totalCost = node.quantity * costPerUnit

    if (!node.baseCostPerUnit || node.baseCostPerUnit <= 0) {
      DebugUtils.warn(MODULE_NAME, 'Product has no baseCostPerUnit, using 0', {
        productId: node.productId,
        productName: node.productName
      })
    }

    return {
      type: 'product',
      productId: node.productId,
      productName: node.productName,
      quantity: node.quantity,
      unit: node.unit,
      costPerUnit,
      totalCost,
      path: node.path || []
    }
  }

  /**
   * Convert preparation node to WriteOffItem
   * Note: costPerUnit is null - will be calculated via FIFO in CostAdapter
   */
  private preparationNodeToItem(node: DecomposedPreparationNode): WriteOffItem {
    return {
      type: 'preparation',
      preparationId: node.preparationId,
      preparationName: node.preparationName,
      quantity: node.quantity,
      unit: node.unit,
      costPerUnit: null, // FIFO cost calculated separately
      totalCost: 0, // Will be updated after FIFO allocation
      path: node.path || []
    }
  }

  /**
   * Merge duplicate items (same type + id + unit)
   */
  private mergeDuplicates(items: WriteOffItem[]): WriteOffItem[] {
    const grouped = new Map<string, WriteOffItem>()

    for (const item of items) {
      const id = item.type === 'product' ? item.productId : item.preparationId

      // Skip items without id (shouldn't happen, but safety check)
      if (!id) {
        DebugUtils.warn(MODULE_NAME, 'Item has no ID, skipping merge', { item })
        continue
      }

      const key = `${item.type}_${id}_${item.unit}`

      if (grouped.has(key)) {
        const existing = grouped.get(key)!
        existing.quantity += item.quantity
        existing.totalCost += item.totalCost

        // Merge paths
        if (existing.path && item.path) {
          existing.path = [...new Set([...existing.path, ...item.path])]
        }
      } else {
        grouped.set(key, { ...item })
      }
    }

    const merged = Array.from(grouped.values())

    DebugUtils.debug(MODULE_NAME, 'Merged duplicate items', {
      original: items.length,
      merged: merged.length
    })

    return merged
  }
}

/**
 * Factory function for creating WriteOffAdapter
 */
export function createWriteOffAdapter(config?: WriteOffAdapterConfig): WriteOffAdapter {
  return new WriteOffAdapter(config)
}
