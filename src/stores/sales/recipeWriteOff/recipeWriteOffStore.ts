import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RecipeWriteOff, RecipeWriteOffItem } from './types'
import { RecipeWriteOffService } from './services'
// ✅ PHASE 3: Use unified DecompositionEngine + WriteOffAdapter
import {
  createDecompositionEngine,
  createWriteOffAdapter,
  type WriteOffResult
} from '@/core/decomposition'
import { useStorageStore } from '@/stores/storage/storageStore'
import { useMenuStore } from '@/stores/menu/menuStore'
import type { PosBillItem } from '@/stores/pos/types'
import type { CreateWriteOffData } from '@/stores/storage/types'

const MODULE_NAME = 'RecipeWriteOffStore'

export const useRecipeWriteOffStore = defineStore('recipeWriteOff', () => {
  // Dependencies
  const storageStore = useStorageStore()
  const menuStore = useMenuStore()

  // State
  const state = ref({
    writeOffs: [] as RecipeWriteOff[],
    loading: false,
    error: null as string | null,
    initialized: false
  })

  // Computed
  const writeOffs = computed(() => state.value.writeOffs)
  const loading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)
  const initialized = computed(() => state.value.initialized)

  /**
   * Initialize store
   */
  async function initialize() {
    if (state.value.initialized) {
      console.log(`✅ [${MODULE_NAME}] Already initialized`)
      return
    }

    console.log(`🔄 [${MODULE_NAME}] Initializing...`)
    state.value.loading = true

    try {
      const result = await RecipeWriteOffService.getAllWriteOffs()
      if (result.success && result.data) {
        state.value.writeOffs = result.data
        state.value.initialized = true
        console.log(`✅ [${MODULE_NAME}] Initialized with ${result.data.length} write-offs`)
      } else {
        throw new Error(result.error || 'Failed to load write-offs')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      state.value.error = message
      console.error(`❌ [${MODULE_NAME}] Initialization failed:`, message)
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Process item write-off
   * Главная функция для списания ингредиентов при продаже
   */
  async function processItemWriteOff(billItem: PosBillItem, salesTransactionId: string) {
    console.log(`🔄 [${MODULE_NAME}] Processing write-off for item:`, {
      menuItemName: billItem.menuItemName,
      quantity: billItem.quantity,
      salesTransactionId
    })

    try {
      // 1. Get menu item details
      const menuItem = menuStore.menuItems.find(item => item.id === billItem.menuItemId)
      if (!menuItem) {
        console.error(`❌ [${MODULE_NAME}] Menu item not found:`, billItem.menuItemId)
        return null
      }

      const variant = menuItem.variants.find(v => v.id === billItem.variantId)
      if (!variant) {
        console.error(`❌ [${MODULE_NAME}] Variant not found:`, billItem.variantId)
        return null
      }

      // 2. ✅ PHASE 3: Use unified DecompositionEngine + WriteOffAdapter
      const engine = await createDecompositionEngine()
      const adapter = createWriteOffAdapter()

      const traversalResult = await engine.traverse(
        {
          menuItemId: billItem.menuItemId,
          variantId: billItem.variantId || variant.id,
          quantity: billItem.quantity,
          selectedModifiers: billItem.selectedModifiers
        },
        adapter.getTraversalOptions()
      )

      const writeOffResult: WriteOffResult = await adapter.transform(traversalResult, {
        menuItemId: billItem.menuItemId,
        variantId: billItem.variantId || variant.id,
        quantity: billItem.quantity,
        selectedModifiers: billItem.selectedModifiers
      })

      if (writeOffResult.items.length === 0) {
        console.warn(`⚠️ [${MODULE_NAME}] No ingredients to write off`)
        return null
      }

      console.log(`📋 [${MODULE_NAME}] Decomposed to ${writeOffResult.items.length} items`)

      // 3. ✅ PHASE 3: Prepare write-off items from WriteOffResult
      const writeOffItems: RecipeWriteOffItem[] = writeOffResult.items.map(item => ({
        type: item.type,
        itemId: item.type === 'product' ? item.productId! : item.preparationId!,
        itemName: item.type === 'product' ? item.productName! : item.preparationName!,
        quantityPerPortion: item.quantity / billItem.quantity,
        totalQuantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit || 0,
        totalCost: item.totalCost,
        batchIds: [] // Will be filled by storage operation
      }))

      // 4. Create storage write-off operation (✅ FIXED: Support both types)
      const writeOffData: CreateWriteOffData = {
        department: menuItem.department,
        responsiblePerson: 'system',
        reason: 'other', // Используем 'other' для автоматических списаний
        items: writeOffItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName, // ✅ Added
          itemType: item.type, // ✅ Use actual type (product or preparation)
          quantity: item.totalQuantity,
          unit: item.unit, // ✅ Added
          notes: undefined
        })),
        notes: `Auto sales write-off: ${menuItem.name} - ${variant.name} (${billItem.quantity} portion${billItem.quantity > 1 ? 's' : ''})`
      }

      const storageOperation = await storageStore.createWriteOff(writeOffData)

      console.log(`✅ [${MODULE_NAME}] Storage operation created:`, storageOperation.id)

      // 5. Extract batch IDs and actual costs from storage operation
      const batchMap = new Map<string, string[]>()
      const costMap = new Map<string, { costPerUnit: number; totalCost: number }>()

      storageOperation.items.forEach(opItem => {
        if (opItem.batchAllocations) {
          batchMap.set(
            opItem.itemId,
            opItem.batchAllocations.map(b => b.batchId)
          )

          // ✅ FIXED: Calculate actual average cost from batch allocations
          const totalCost = opItem.batchAllocations.reduce(
            (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
            0
          )
          const totalQty = opItem.batchAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0)
          const avgCost = totalQty > 0 ? totalCost / totalQty : 0

          costMap.set(opItem.itemId, {
            costPerUnit: avgCost,
            totalCost: totalCost
          })
        }
      })

      // Update write-off items with actual batch IDs and costs
      writeOffItems.forEach(item => {
        item.batchIds = batchMap.get(item.itemId) || []

        // ✅ FIXED: Update with actual costs from FIFO allocation
        const actualCost = costMap.get(item.itemId)
        if (actualCost) {
          item.costPerUnit = actualCost.costPerUnit
          item.totalCost = actualCost.totalCost
        }
      })

      // 6. Create recipe write-off record
      // ✅ PHASE 3: Convert WriteOffItems to DecomposedItem format for backward compatibility
      const decomposedItemsForRecord = writeOffResult.items.map(item => ({
        type: item.type,
        productId: item.productId,
        productName: item.productName,
        preparationId: item.preparationId,
        preparationName: item.preparationName,
        quantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        totalCost: item.totalCost,
        path: item.path
      }))

      const recipeWriteOff: RecipeWriteOff = {
        id: `rwo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        salesTransactionId,
        menuItemId: billItem.menuItemId,
        variantId: billItem.variantId || variant.id,
        recipeId: undefined, // Can be set if composition has single recipe
        portionSize: 1, // Default portion size
        soldQuantity: billItem.quantity,
        writeOffItems,
        decomposedItems: decomposedItemsForRecord,
        originalComposition: variant.composition,
        department: menuItem.department,
        operationType: 'auto_sales_writeoff',
        performedAt: new Date().toISOString(),
        performedBy: 'system',
        storageOperationId: storageOperation.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // 7. Save recipe write-off
      const saveResult = await RecipeWriteOffService.saveWriteOff(recipeWriteOff)
      if (saveResult.success && saveResult.data) {
        state.value.writeOffs.push(saveResult.data)
        console.log(`✅ [${MODULE_NAME}] Write-off record saved:`, saveResult.data.id)
        return saveResult.data
      } else {
        throw new Error(saveResult.error || 'Failed to save write-off')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`❌ [${MODULE_NAME}] Write-off failed:`, message)
      state.value.error = message
      return null
    }
  }

  /**
   * Get write-offs by sales transaction
   */
  async function getWriteOffsBySalesTransaction(salesTransactionId: string) {
    const result = await RecipeWriteOffService.getWriteOffsBySalesTransaction(salesTransactionId)
    return result.success ? result.data : []
  }

  /**
   * Get write-offs by menu item
   */
  async function getWriteOffsByMenuItem(menuItemId: string) {
    const result = await RecipeWriteOffService.getWriteOffsByMenuItem(menuItemId)
    return result.success ? result.data : []
  }

  /**
   * Get write-off by ID
   */
  async function getWriteOffById(id: string) {
    const result = await RecipeWriteOffService.getWriteOffById(id)
    return result.success ? result.data : null
  }

  /**
   * Calculate total cost from write-off
   */
  function getTotalCost(writeOff: RecipeWriteOff): number {
    return writeOff.writeOffItems.reduce((sum, item) => sum + item.totalCost, 0)
  }

  /**
   * Get summary statistics
   */
  async function getSummary(filters?: any) {
    const result = await RecipeWriteOffService.getSummary(filters)
    return result.success ? result.data : null
  }

  return {
    // State
    state,
    writeOffs,
    loading,
    error,
    initialized,

    // Actions
    initialize,
    processItemWriteOff,
    getWriteOffsBySalesTransaction,
    getWriteOffsByMenuItem,
    getWriteOffById,
    getTotalCost,
    getSummary
  }
})
