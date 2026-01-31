// src/core/decomposition/utils/batchAllocationUtils.ts
// Shared FIFO batch allocation utilities
// Used by: CostAdapter, useCostCalculation

import { DebugUtils } from '@/utils'
import type { BatchAllocation, ProductCostItem, PreparationCostItem } from '@/stores/sales/types'
import type { StorageBatch } from '@/stores/storage/types'
import type { PreparationBatch } from '@/stores/preparation/types'

const MODULE_NAME = 'BatchAllocationUtils'

// =============================================
// Store type definitions (for lazy loading)
// =============================================

type StorageStoreType = {
  initialized: boolean
  activeBatches: { value: StorageBatch[] } | StorageBatch[]
  getDefaultWarehouse: () => { id: string } | null
  initialize: () => Promise<void>
}

type PreparationStoreType = {
  state: { batches: PreparationBatch[] }
  fetchBatches: () => Promise<void>
  getPreparationBatches: (preparationId: string, department: string) => PreparationBatch[]
}

type ProductsStoreType = {
  products: Array<{
    id: string
    name?: string
    baseCostPerUnit?: number
    baseUnit?: string
  }>
}

type RecipesStoreType = {
  preparations: Array<{
    id: string
    name?: string
    lastKnownCost?: number
    outputUnit?: string
  }>
}

// =============================================
// Store getters (lazy loading)
// =============================================

let _storageStore: StorageStoreType | null = null
let _preparationStore: PreparationStoreType | null = null
let _productsStore: ProductsStoreType | null = null
let _recipesStore: RecipesStoreType | null = null

async function getStorageStore(): Promise<StorageStoreType> {
  if (!_storageStore) {
    const { useStorageStore } = await import('@/stores/storage/storageStore')
    _storageStore = useStorageStore() as StorageStoreType
  }
  return _storageStore
}

async function getPreparationStore(): Promise<PreparationStoreType> {
  if (!_preparationStore) {
    const { usePreparationStore } = await import('@/stores/preparation/preparationStore')
    _preparationStore = usePreparationStore() as PreparationStoreType
  }
  return _preparationStore
}

async function getProductsStore(): Promise<ProductsStoreType> {
  if (!_productsStore) {
    const { useProductsStore } = await import('@/stores/productsStore')
    _productsStore = useProductsStore() as ProductsStoreType
  }
  return _productsStore
}

async function getRecipesStore(): Promise<RecipesStoreType> {
  if (!_recipesStore) {
    const { useRecipesStore } = await import('@/stores/recipes/recipesStore')
    _recipesStore = useRecipesStore() as RecipesStoreType
  }
  return _recipesStore
}

// =============================================
// Core FIFO Allocation Logic
// =============================================

/**
 * Generic FIFO allocation from batches
 * Works with both StorageBatch and PreparationBatch
 * Priority: positive batches first (FIFO by date), then negative batches
 */
function allocateFromBatches<
  T extends {
    currentQuantity: number
    costPerUnit: number
    id: string
    batchNumber: string
    isNegative?: boolean
  }
>(batches: T[], requiredQuantity: number, getDate: (batch: T) => string): BatchAllocation[] {
  let remainingQuantity = requiredQuantity
  const allocations: BatchAllocation[] = []

  // Separate and sort: positive batches first (FIFO), then negative batches (FIFO)
  const positiveBatches = batches
    .filter(b => b.currentQuantity > 0)
    .sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime())

  const negativeBatches = batches
    .filter(b => b.currentQuantity < 0)
    .sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime())

  // Log warning if both exist
  if (negativeBatches.length > 0 && positiveBatches.length > 0) {
    DebugUtils.warn(MODULE_NAME, 'Both positive and negative batches exist', {
      positiveBatches: positiveBatches.length,
      negativeBatches: negativeBatches.length
    })
  }

  // Ordered batches: positive first, then negative
  const orderedBatches = [...positiveBatches, ...negativeBatches]

  // Process batches in order
  for (const batch of orderedBatches) {
    if (remainingQuantity <= 0) break

    // Skip zero quantity batches
    if (batch.currentQuantity === 0) continue

    // Handle negative batches - use their cost (last known cost)
    if (batch.currentQuantity < 0) {
      const allocatedQty = Math.min(remainingQuantity, Math.abs(batch.currentQuantity))

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        allocatedQuantity: allocatedQty,
        costPerUnit: batch.costPerUnit,
        totalCost: allocatedQty * batch.costPerUnit,
        batchCreatedAt: getDate(batch)
      })

      remainingQuantity -= allocatedQty

      DebugUtils.warn(MODULE_NAME, 'Using negative batch for cost calculation', {
        batchNumber: batch.batchNumber,
        quantity: allocatedQty,
        costPerUnit: batch.costPerUnit
      })
      continue
    }

    // Handle positive batches (normal FIFO)
    const allocatedQty = Math.min(batch.currentQuantity, remainingQuantity)

    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      allocatedQuantity: allocatedQty,
      costPerUnit: batch.costPerUnit,
      totalCost: allocatedQty * batch.costPerUnit,
      batchCreatedAt: getDate(batch)
    })

    remainingQuantity -= allocatedQty
  }

  return allocations
}

// =============================================
// Public API
// =============================================

/**
 * FIFO allocation from preparation batches
 * Allocates from oldest batches first
 *
 * NOTE: All batch costs are stored per-gram (base unit).
 * No conversion is needed - DecompositionEngine handles portion→gram conversion.
 *
 * @param preparationId - ID of the preparation
 * @param requiredQuantity - Quantity required in grams (base unit)
 * @param department - Department (kitchen or bar)
 * @returns PreparationCostItem with batch allocations and costs
 */
export async function allocateFromPreparationBatches(
  preparationId: string,
  requiredQuantity: number,
  department: 'kitchen' | 'bar'
): Promise<PreparationCostItem> {
  DebugUtils.debug(MODULE_NAME, 'Allocating from preparation batches', {
    preparationId,
    requiredQuantity,
    department
  })

  // Get stores
  const preparationStore = await getPreparationStore()
  const recipesStore = await getRecipesStore()

  // Ensure batches are loaded
  if (!preparationStore.state.batches || preparationStore.state.batches.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'PreparationStore not initialized, fetching batches...', {})
    await preparationStore.fetchBatches()
  }

  // Get batches sorted by FIFO (oldest first)
  const batches = preparationStore.getPreparationBatches(preparationId, department)

  // Debug log
  const positiveBatches = batches.filter(b => b.currentQuantity > 0)
  const negativeBatches = batches.filter(b => b.currentQuantity < 0)

  DebugUtils.debug(MODULE_NAME, 'Available preparation batches', {
    preparationId,
    batchCount: batches.length,
    positiveBatches: positiveBatches.length,
    negativeBatches: negativeBatches.length,
    totalAvailable: batches.reduce((sum, b) => sum + b.currentQuantity, 0),
    batches: batches.map(b => ({
      id: b.id.substring(0, 8),
      batchNumber: b.batchNumber,
      qty: b.currentQuantity,
      cost: b.costPerUnit,
      isNegative: b.isNegative,
      reconciled: b.reconciledAt ? 'yes' : 'no',
      date: b.productionDate.substring(0, 10)
    }))
  })

  // Allocate using generic function
  const allocations = allocateFromBatches(
    batches,
    requiredQuantity,
    (b: PreparationBatch) => b.productionDate
  )

  // Check allocation status
  const allocatedQuantity = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
  const deficit = requiredQuantity - allocatedQuantity

  // Get preparation info for fallback and metadata
  const preparation = recipesStore.preparations.find((p: any) => p.id === preparationId)

  // Handle deficit with fallback to lastKnownCost
  if (deficit > 0) {
    const fallbackCost = preparation?.lastKnownCost || 0

    // ✅ VERIFIED: lastKnownCost is ALREADY stored per-gram (base unit)
    // See: src/About/docs/UNIT_CONVERSION_SPEC.md
    // batch.cost_per_unit and preparation.last_known_cost are both IDR/gram
    // NO conversion needed - do NOT divide by portionSize

    if (fallbackCost > 0) {
      DebugUtils.debug(MODULE_NAME, 'Using lastKnownCost fallback (already per-gram)', {
        preparationId,
        preparationName: preparation?.name,
        costPerGram: fallbackCost
      })
      allocations.push({
        batchId: 'fallback-prep-cost',
        batchNumber: 'LAST_KNOWN',
        allocatedQuantity: deficit,
        costPerUnit: fallbackCost,
        totalCost: deficit * fallbackCost,
        batchCreatedAt: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'Using lastKnownCost fallback for preparation', {
        preparationId,
        preparationName: preparation?.name,
        deficitQuantity: deficit,
        fallbackCost
      })
    } else {
      DebugUtils.warn(MODULE_NAME, 'Insufficient preparation stock and no lastKnownCost', {
        preparationId,
        preparationName: preparation?.name,
        required: requiredQuantity,
        allocated: allocatedQuantity,
        deficit
      })
    }
  } else {
    DebugUtils.debug(MODULE_NAME, 'Preparation stock allocated successfully', {
      preparationId,
      required: requiredQuantity,
      allocated: allocatedQuantity,
      batchesUsed: allocations.length
    })
  }

  // ✅ FIXED: No conversion needed - all batch costs are stored per-gram
  // Unit conversion happens ONLY in DecompositionEngine
  let finalTotalCost = allocations.reduce((sum, a) => sum + a.totalCost, 0)
  const totalQty = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
  let avgCost = totalQty > 0 ? finalTotalCost / totalQty : 0

  // ⚡ FIX: Handle zero-cost allocation (batches exist but have costPerUnit = 0)
  // This happens when batches were created without proper cost calculation
  if (totalQty > 0 && avgCost === 0) {
    const fallbackCost = preparation?.lastKnownCost || 0

    // ✅ VERIFIED: lastKnownCost is ALREADY per-gram - NO conversion needed
    // See: src/About/docs/UNIT_CONVERSION_SPEC.md

    if (fallbackCost > 0) {
      DebugUtils.warn(MODULE_NAME, 'Zero-cost allocation detected, using lastKnownCost fallback', {
        preparationId,
        preparationName: preparation?.name,
        allocatedQuantity: totalQty,
        originalCost: 0,
        fallbackCostPerUnit: fallbackCost
      })

      // Replace zero-cost allocations with fallback
      allocations.length = 0
      allocations.push({
        batchId: 'fallback-zero-cost',
        batchNumber: 'FALLBACK',
        allocatedQuantity: totalQty,
        costPerUnit: fallbackCost,
        totalCost: totalQty * fallbackCost,
        batchCreatedAt: new Date().toISOString()
      })

      // Recalculate costs
      finalTotalCost = totalQty * fallbackCost
      avgCost = fallbackCost
    } else {
      DebugUtils.error(MODULE_NAME, 'Zero-cost allocation with no fallback available', {
        preparationId,
        preparationName: preparation?.name,
        allocatedQuantity: totalQty,
        lastKnownCost: preparation?.lastKnownCost
      })
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Preparation cost breakdown', {
    preparationId,
    preparationName: preparation?.name,
    totalCost: finalTotalCost,
    avgCostPerUnit: avgCost,
    allocations: allocations.map(a => ({
      batchId: a.batchId.substring(0, 8),
      qty: a.allocatedQuantity,
      cost: a.costPerUnit,
      total: a.totalCost
    }))
  })

  return {
    preparationId,
    preparationName: preparation?.name || 'Unknown Preparation',
    quantity: requiredQuantity,
    unit: preparation?.outputUnit || 'gram', // Always base unit (gram/ml)
    batchAllocations: allocations, // Fixed: use allocations, not adjustedAllocations
    averageCostPerUnit: avgCost,
    totalCost: finalTotalCost
  }
}

/**
 * FIFO allocation from storage batches
 * Allocates from oldest batches first
 *
 * @param productId - ID of the product
 * @param requiredQuantity - Quantity required in base units
 * @param warehouseId - ID of the warehouse (optional, uses default if not provided)
 * @returns ProductCostItem with batch allocations and costs
 */
export async function allocateFromStorageBatches(
  productId: string,
  requiredQuantity: number,
  warehouseId?: string
): Promise<ProductCostItem> {
  DebugUtils.debug(MODULE_NAME, 'Allocating from storage batches', {
    productId,
    requiredQuantity,
    warehouseId
  })

  // Get stores
  const storageStore = await getStorageStore()
  const productsStore = await getProductsStore()

  // Ensure storage is initialized
  if (!storageStore.initialized) {
    DebugUtils.warn(MODULE_NAME, 'StorageStore not initialized, initializing...', {})
    await storageStore.initialize()
  }

  // Get warehouse ID if not provided
  const effectiveWarehouseId =
    warehouseId || storageStore.getDefaultWarehouse()?.id || 'default-warehouse'

  // Get active batches for this product, sorted by FIFO
  const activeBatches = storageStore.activeBatches.value || storageStore.activeBatches
  const batches: StorageBatch[] = (activeBatches as StorageBatch[])
    .filter(b => b.itemId === productId && b.warehouseId === effectiveWarehouseId)
    .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

  DebugUtils.debug(MODULE_NAME, 'Available storage batches', {
    productId,
    batchCount: batches.length,
    totalAvailable: batches.reduce((sum, b) => sum + b.currentQuantity, 0),
    batches: batches.map(b => ({
      id: b.id.substring(0, 8),
      qty: b.currentQuantity,
      cost: b.costPerUnit,
      date: b.receiptDate.substring(0, 10)
    }))
  })

  // Allocate using generic function
  const allocations = allocateFromBatches(
    batches,
    requiredQuantity,
    (b: StorageBatch) => b.receiptDate
  )

  // Check allocation status
  const allocatedQuantity = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
  const deficit = requiredQuantity - allocatedQuantity

  // Get product info for fallback and metadata
  const product = productsStore.products.find((p: any) => p.id === productId)

  // Handle deficit with baseCostPerUnit fallback
  if (deficit > 0) {
    const fallbackCost = product?.baseCostPerUnit || 0

    if (fallbackCost > 0) {
      allocations.push({
        batchId: 'fallback-base-cost',
        batchNumber: 'BASE_COST',
        allocatedQuantity: deficit,
        costPerUnit: fallbackCost,
        totalCost: deficit * fallbackCost,
        batchCreatedAt: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'Using base_cost_per_unit fallback for cost calculation', {
        productId,
        productName: product?.name,
        deficitQuantity: deficit,
        baseCostPerUnit: fallbackCost
      })
    } else {
      DebugUtils.warn(MODULE_NAME, 'Insufficient product stock and no base_cost_per_unit', {
        productId,
        productName: product?.name,
        required: requiredQuantity,
        allocated: allocatedQuantity,
        deficit
      })
    }
  } else {
    DebugUtils.debug(MODULE_NAME, 'Product stock allocated successfully', {
      productId,
      required: requiredQuantity,
      allocated: allocatedQuantity,
      batchesUsed: allocations.length
    })
  }

  // Calculate weighted average cost
  const totalCost = allocations.reduce((sum, a) => sum + a.totalCost, 0)
  const totalQty = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
  const avgCost = totalQty > 0 ? totalCost / totalQty : 0

  DebugUtils.debug(MODULE_NAME, 'Product cost breakdown', {
    productId,
    productName: product?.name,
    totalCost,
    avgCostPerUnit: avgCost,
    allocations: allocations.map(a => ({
      batchId: a.batchId.substring(0, 8),
      qty: a.allocatedQuantity,
      cost: a.costPerUnit,
      total: a.totalCost
    }))
  })

  return {
    productId,
    productName: product?.name || 'Unknown Product',
    quantity: requiredQuantity,
    unit: product?.baseUnit || 'gram',
    batchAllocations: allocations,
    averageCostPerUnit: avgCost,
    totalCost
  }
}

/**
 * Reset cached store references
 * Useful for testing or when stores need to be reloaded
 */
export function resetBatchAllocationCache(): void {
  _storageStore = null
  _preparationStore = null
  _productsStore = null
  _recipesStore = null
  DebugUtils.debug(MODULE_NAME, 'Cache reset')
}
