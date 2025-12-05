import type {
  ActualCostBreakdown,
  PreparationCostItem,
  ProductCostItem,
  BatchAllocation
} from '../types'
import type { MenuComposition } from '@/stores/menu/types'
import { useMenuStore } from '@/stores/menu/menuStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { useProductsStore } from '@/stores/productsStore'
import { usePreparationStore } from '@/stores/preparation/preparationStore'
import { useStorageStore } from '@/stores/storage/storageStore'
import { TimeUtils, DebugUtils } from '@/utils'

const MODULE_NAME = 'ActualCostCalculation'

/**
 * useActualCostCalculation
 * ✅ SPRINT 2: FIFO-based actual cost calculation
 * Calculates actual cost from batches instead of recipe decomposition
 */
export function useActualCostCalculation() {
  const menuStore = useMenuStore()
  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()
  const preparationStore = usePreparationStore()
  const storageStore = useStorageStore()

  /**
   * Calculate actual cost from FIFO batches
   * Main entry point for cost calculation
   */
  async function calculateActualCost(
    menuItemId: string,
    variantId: string,
    quantity: number
  ): Promise<ActualCostBreakdown> {
    DebugUtils.info(MODULE_NAME, 'Calculating actual cost', {
      menuItemId,
      variantId,
      quantity
    })

    try {
      // ✅ Ensure stores are initialized
      if (!preparationStore.state.batches || preparationStore.state.batches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'PreparationStore not initialized, fetching batches...', {})
        await preparationStore.fetchBatches()
      }

      if (!storageStore.initialized) {
        DebugUtils.warn(MODULE_NAME, 'StorageStore not initialized, initializing...', {})
        await storageStore.initialize()
      }

      // 1. Get menu composition
      const composition = getMenuComposition(menuItemId, variantId)
      if (!composition || composition.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'Empty composition, returning zero cost', {
          menuItemId,
          variantId
        })
        return {
          totalCost: 0,
          preparationCosts: [],
          productCosts: [],
          method: 'FIFO',
          calculatedAt: TimeUtils.getCurrentLocalISO()
        }
      }

      const preparationCosts: PreparationCostItem[] = []
      const productCosts: ProductCostItem[] = []

      // 2. For each component in composition
      for (const comp of composition) {
        if (comp.type === 'preparation') {
          // FIFO allocation from PreparationBatch
          const prepCost = await allocateFromPreparationBatches(
            comp.id,
            comp.quantity * quantity,
            'kitchen' // TODO: Get from menuItem.department or recipe
          )
          preparationCosts.push(prepCost)
        } else if (comp.type === 'product') {
          // FIFO allocation from StorageBatch
          const defaultWarehouse = storageStore.getDefaultWarehouse()
          const prodCost = await allocateFromStorageBatches(
            comp.id,
            comp.quantity * quantity,
            defaultWarehouse.id
          )
          productCosts.push(prodCost)
        } else if (comp.type === 'recipe') {
          // Recursively process recipe components
          const recipeCosts = await processRecipeComponents(comp, quantity)
          preparationCosts.push(...recipeCosts.preparationCosts)
          productCosts.push(...recipeCosts.productCosts)
        }
      }

      // 3. Calculate total cost
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
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate actual cost', { error })
      throw error
    }
  }

  /**
   * Get menu composition (variant components)
   */
  function getMenuComposition(menuItemId: string, variantId: string): MenuComposition[] {
    const menuItem = menuStore.menuItems.find(item => item.id === menuItemId)
    if (!menuItem) {
      DebugUtils.error(MODULE_NAME, 'Menu item not found', { menuItemId })
      return []
    }

    const variant = menuItem.variants.find((v: any) => v.id === variantId)
    if (!variant) {
      DebugUtils.error(MODULE_NAME, 'Variant not found', { variantId })
      return []
    }

    return variant.composition || []
  }

  /**
   * Process recipe components recursively
   */
  async function processRecipeComponents(
    comp: MenuComposition,
    quantity: number
  ): Promise<{ preparationCosts: PreparationCostItem[]; productCosts: ProductCostItem[] }> {
    const recipe = recipesStore.recipes.find(r => r.id === comp.id)
    if (!recipe) {
      DebugUtils.error(MODULE_NAME, 'Recipe not found', { recipeId: comp.id })
      return { preparationCosts: [], productCosts: [] }
    }

    const preparationCosts: PreparationCostItem[] = []
    const productCosts: ProductCostItem[] = []

    for (const recipeComp of recipe.components) {
      const menuComp: MenuComposition = {
        type: recipeComp.componentType,
        id: recipeComp.componentId,
        quantity: recipeComp.quantity,
        unit: recipeComp.unit,
        useYieldPercentage: recipeComp.useYieldPercentage // ✅ FIX: Pass yield flag
      }

      if (menuComp.type === 'preparation') {
        const prepCost = await allocateFromPreparationBatches(
          menuComp.id,
          menuComp.quantity * quantity,
          'kitchen'
        )
        preparationCosts.push(prepCost)
      } else if (menuComp.type === 'product') {
        // ✅ FIX: Apply yield adjustment BEFORE FIFO allocation
        let allocateQuantity = menuComp.quantity * quantity

        if (menuComp.useYieldPercentage) {
          const product = productsStore.getProductForRecipe(menuComp.id)
          if (product && product.yieldPercentage && product.yieldPercentage < 100) {
            const originalQuantity = allocateQuantity
            allocateQuantity = allocateQuantity / (product.yieldPercentage / 100)

            DebugUtils.info(MODULE_NAME, 'Applied yield adjustment before FIFO allocation', {
              productName: product.name,
              baseQuantity: originalQuantity,
              yieldPercentage: product.yieldPercentage,
              adjustedQuantity: allocateQuantity
            })
          }
        }

        const defaultWarehouse = storageStore.getDefaultWarehouse()
        const prodCost = await allocateFromStorageBatches(
          menuComp.id,
          allocateQuantity, // ✅ FIX: Use yield-adjusted quantity
          defaultWarehouse.id
        )
        productCosts.push(prodCost)
      }
    }

    return { preparationCosts, productCosts }
  }

  /**
   * FIFO allocation from preparation batches
   * Allocates from oldest batches first
   */
  async function allocateFromPreparationBatches(
    preparationId: string,
    requiredQuantity: number,
    department: 'kitchen' | 'bar'
  ): Promise<PreparationCostItem> {
    DebugUtils.info(MODULE_NAME, 'Allocating from preparation batches', {
      preparationId,
      requiredQuantity,
      department
    })

    // Get batches sorted by FIFO (oldest first) - using preparationStore method
    const batches = preparationStore.getPreparationBatches(preparationId, department)

    // ✅ DEBUG: Log batch allocation details
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

    // ✅ DEBUG: Warning if using negative batches when positive batches exist
    if (negativeBatches.length > 0 && positiveBatches.length > 0) {
      console.warn(
        `⚠️ [ActualCostCalculation] Both positive and negative batches exist for ${preparationId}. Positive batches will be prioritized.`
      )
    }

    let remainingQuantity = requiredQuantity
    const allocations: BatchAllocation[] = []

    for (const batch of batches) {
      if (remainingQuantity <= 0) break

      // Skip only zero batches, not negative ones
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
          batchCreatedAt: batch.productionDate
        })

        remainingQuantity -= allocatedQty

        DebugUtils.warn(MODULE_NAME, 'Using negative batch for cost calculation', {
          batchNumber: batch.batchNumber,
          quantity: allocatedQty,
          costPerUnit: batch.costPerUnit,
          preparationId
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
        batchCreatedAt: batch.productionDate
      })

      remainingQuantity -= allocatedQty
    }

    // Check if we have enough stock
    const allocatedQuantity = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
    if (remainingQuantity > 0) {
      DebugUtils.warn(MODULE_NAME, 'Insufficient preparation stock', {
        preparationId,
        required: requiredQuantity,
        allocated: allocatedQuantity,
        deficit: remainingQuantity,
        availableBatches: batches.length,
        totalAvailableStock: batches.reduce((sum, b) => sum + b.currentQuantity, 0)
      })
    } else {
      DebugUtils.info(MODULE_NAME, 'Preparation stock allocated successfully', {
        preparationId,
        required: requiredQuantity,
        allocated: allocatedQuantity,
        batchesUsed: allocations.length
      })
    }

    // Calculate weighted average cost
    const totalCost = allocations.reduce((sum, a) => sum + a.totalCost, 0)
    const totalQty = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
    const avgCost = totalQty > 0 ? totalCost / totalQty : 0

    const preparation = recipesStore.preparations.find(p => p.id === preparationId)

    DebugUtils.info(MODULE_NAME, 'Preparation cost breakdown', {
      preparationId,
      preparationName: preparation?.name,
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
      preparationId,
      preparationName: preparation?.name || 'Unknown Preparation',
      quantity: requiredQuantity,
      unit: preparation?.outputUnit || 'gram',
      batchAllocations: allocations,
      averageCostPerUnit: avgCost,
      totalCost
    }
  }

  /**
   * FIFO allocation from storage batches
   * Allocates from oldest batches first
   */
  async function allocateFromStorageBatches(
    productId: string,
    requiredQuantity: number,
    warehouseId: string
  ): Promise<ProductCostItem> {
    DebugUtils.info(MODULE_NAME, 'Allocating from storage batches', {
      productId,
      requiredQuantity,
      warehouseId
    })

    // Get active batches for this product, sorted by FIFO (oldest first)
    // NOTE: Don't filter out negative batches - they're handled in the loop below (lines 361-383)
    const batches = (storageStore.activeBatches.value || storageStore.activeBatches)
      .filter(b => b.itemId === productId && b.warehouseId === warehouseId)
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

    let remainingQuantity = requiredQuantity
    const allocations: BatchAllocation[] = []

    for (const batch of batches) {
      if (remainingQuantity <= 0) break

      // Skip only zero batches, not negative ones
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
          batchCreatedAt: batch.receiptDate
        })

        remainingQuantity -= allocatedQty

        DebugUtils.warn(MODULE_NAME, 'Using negative batch for cost calculation', {
          batchNumber: batch.batchNumber,
          quantity: allocatedQty,
          costPerUnit: batch.costPerUnit,
          productId
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
        batchCreatedAt: batch.receiptDate
      })

      remainingQuantity -= allocatedQty
    }

    // Check if we have enough stock
    const allocatedQuantity = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
    if (remainingQuantity > 0) {
      DebugUtils.warn(MODULE_NAME, 'Insufficient product stock', {
        productId,
        required: requiredQuantity,
        allocated: allocatedQuantity,
        deficit: remainingQuantity,
        availableBatches: batches.length,
        totalAvailableStock: batches.reduce((sum, b) => sum + b.currentQuantity, 0)
      })
    } else {
      DebugUtils.info(MODULE_NAME, 'Product stock allocated successfully', {
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

    const product = productsStore.products.find(p => p.id === productId)

    DebugUtils.info(MODULE_NAME, 'Product cost breakdown', {
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
      unit: product?.unit || 'gram',
      batchAllocations: allocations,
      averageCostPerUnit: avgCost,
      totalCost
    }
  }

  return {
    calculateActualCost,
    allocateFromPreparationBatches,
    allocateFromStorageBatches
  }
}
