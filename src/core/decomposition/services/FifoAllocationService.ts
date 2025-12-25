/**
 * FIFO Allocation Service
 * Uses Supabase RPC functions for efficient batch cost allocation
 *
 * Benefits over client-side allocation:
 * - Single round-trip per batch of items (vs 6+ per item)
 * - Atomic operations (no race conditions)
 * - Consistent FIFO logic on server side
 */

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'FifoAllocationService'

// ============================================================================
// Types
// ============================================================================

export interface FifoAllocationRequest {
  type: 'product' | 'preparation'
  id: string
  quantity: number
  fallbackCost?: number
}

export interface BatchAllocation {
  batchId: string
  batchNumber: string
  allocatedQuantity: number
  costPerUnit: number
  totalCost: number
  batchCreatedAt: string
  isDeficit?: boolean
}

export interface FifoAllocationResult {
  success: boolean
  error?: string
  preparationId?: string
  preparationName?: string
  productId?: string
  productName?: string
  requestedQuantity: number
  allocatedQuantity: number
  deficit: number
  allocations: BatchAllocation[]
  totalCost: number
  averageCostPerUnit: number
  usedFallback: boolean
}

export interface BatchFifoSummary {
  totalCost: number
  productItems: number
  preparationItems: number
  totalItems: number
}

export interface BatchFifoResult {
  success: boolean
  error?: string
  results: FifoAllocationResult[]
  summary: BatchFifoSummary
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Allocate cost for a single preparation using FIFO
 */
export async function allocatePreparationFifo(
  preparationId: string,
  quantity: number,
  fallbackCost: number = 0
): Promise<FifoAllocationResult> {
  DebugUtils.debug(MODULE_NAME, 'Allocating preparation FIFO', {
    preparationId,
    quantity,
    fallbackCost
  })

  const { data, error } = await supabase.rpc('allocate_preparation_fifo', {
    p_preparation_id: preparationId,
    p_quantity: quantity,
    p_fallback_cost: fallbackCost
  })

  if (error) {
    DebugUtils.error(MODULE_NAME, 'RPC error', { error })
    return {
      success: false,
      error: error.message,
      requestedQuantity: quantity,
      allocatedQuantity: 0,
      deficit: quantity,
      allocations: [],
      totalCost: 0,
      averageCostPerUnit: 0,
      usedFallback: false
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Preparation FIFO result', {
    preparationId,
    totalCost: data.totalCost,
    allocationsCount: data.allocations?.length || 0
  })

  return data as FifoAllocationResult
}

/**
 * Allocate cost for a single product using FIFO
 */
export async function allocateProductFifo(
  productId: string,
  quantity: number,
  fallbackCost: number = 0
): Promise<FifoAllocationResult> {
  DebugUtils.debug(MODULE_NAME, 'Allocating product FIFO', {
    productId,
    quantity,
    fallbackCost
  })

  const { data, error } = await supabase.rpc('allocate_product_fifo', {
    p_product_id: productId,
    p_quantity: quantity,
    p_fallback_cost: fallbackCost
  })

  if (error) {
    DebugUtils.error(MODULE_NAME, 'RPC error', { error })
    return {
      success: false,
      error: error.message,
      requestedQuantity: quantity,
      allocatedQuantity: 0,
      deficit: quantity,
      allocations: [],
      totalCost: 0,
      averageCostPerUnit: 0,
      usedFallback: false
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Product FIFO result', {
    productId,
    totalCost: data.totalCost,
    allocationsCount: data.allocations?.length || 0
  })

  return data as FifoAllocationResult
}

/**
 * Allocate costs for multiple items in a single RPC call
 * This is the most efficient method for processing sales with multiple items
 */
export async function allocateBatchFifo(items: FifoAllocationRequest[]): Promise<BatchFifoResult> {
  if (items.length === 0) {
    return {
      success: true,
      results: [],
      summary: {
        totalCost: 0,
        productItems: 0,
        preparationItems: 0,
        totalItems: 0
      }
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Batch FIFO allocation', {
    itemCount: items.length,
    items: items.map(i => ({ type: i.type, id: i.id, qty: i.quantity }))
  })

  const startTime = performance.now()

  const { data, error } = await supabase.rpc('allocate_batch_fifo', {
    p_items: items.map(item => ({
      type: item.type,
      id: item.id,
      quantity: item.quantity,
      fallbackCost: item.fallbackCost || 0
    }))
  })

  const duration = performance.now() - startTime

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Batch RPC error', { error, duration })
    return {
      success: false,
      error: error.message,
      results: [],
      summary: {
        totalCost: 0,
        productItems: 0,
        preparationItems: 0,
        totalItems: items.length
      }
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Batch FIFO completed', {
    totalItems: data.summary?.totalItems ?? 0,
    totalCost: data.summary?.totalCost ?? 0,
    durationMs: Math.round(duration)
  })

  return data as BatchFifoResult
}

// ============================================================================
// Helper: Convert WriteOffResult items to FifoAllocationRequest
// ============================================================================

import type { WriteOffItem } from '../types'

/**
 * Convert WriteOffResult items to allocation requests
 * Use this to get FIFO costs for items after decomposition
 */
export function writeOffItemsToAllocationRequests(items: WriteOffItem[]): FifoAllocationRequest[] {
  return items.map(item => ({
    type: item.type,
    id: item.type === 'product' ? item.productId! : item.preparationId!,
    quantity: item.quantity,
    fallbackCost: item.costPerUnit || 0
  }))
}

/**
 * Apply FIFO allocation results back to WriteOffItems
 * Updates costPerUnit and totalCost with actual FIFO values
 */
export function applyFifoResultsToWriteOffItems(
  items: WriteOffItem[],
  fifoResults: FifoAllocationResult[]
): WriteOffItem[] {
  const resultMap = new Map<string, FifoAllocationResult>()

  fifoResults.forEach(result => {
    const id = result.preparationId || result.productId
    if (id) resultMap.set(id, result)
  })

  return items.map(item => {
    const id = item.type === 'product' ? item.productId : item.preparationId
    const fifoResult = id ? resultMap.get(id) : undefined

    if (fifoResult && fifoResult.success) {
      return {
        ...item,
        costPerUnit: fifoResult.averageCostPerUnit,
        totalCost: fifoResult.totalCost
      }
    }

    return item
  })
}
