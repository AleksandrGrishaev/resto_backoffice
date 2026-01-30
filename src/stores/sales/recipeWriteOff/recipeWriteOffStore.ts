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
   * @param options.lightweight - If true, skip loading history (for POS mode)
   *                              POS only needs write operations, not history
   */
  async function initialize(options?: { lightweight?: boolean }) {
    if (state.value.initialized) {
      console.log(`✅ [${MODULE_NAME}] Already initialized`)
      return
    }

    const { lightweight = false } = options || {}

    console.log(`🔄 [${MODULE_NAME}] Initializing...`, { lightweight })
    state.value.loading = true

    try {
      // ✅ OPTIMIZATION: POS doesn't need write-off history, only write capability
      if (lightweight) {
        state.value.writeOffs = []
        state.value.initialized = true
        console.log(`✅ [${MODULE_NAME}] Initialized in lightweight mode (no history loaded)`)
      } else {
        const result = await RecipeWriteOffService.getAllWriteOffs()
        if (result.success && result.data) {
          state.value.writeOffs = result.data
          state.value.initialized = true
          console.log(`✅ [${MODULE_NAME}] Initialized with ${result.data.length} write-offs`)
        } else {
          throw new Error(result.error || 'Failed to load write-offs')
        }
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
   * Load write-off history (for backoffice views like WriteOffHistoryView)
   * Call this when you need to display history
   */
  async function loadHistory() {
    console.log(`🔄 [${MODULE_NAME}] Loading write-off history...`)
    state.value.loading = true

    try {
      const result = await RecipeWriteOffService.getAllWriteOffs()
      if (result.success && result.data) {
        state.value.writeOffs = result.data
        console.log(`✅ [${MODULE_NAME}] Loaded ${result.data.length} write-offs`)
      } else {
        throw new Error(result.error || 'Failed to load write-offs')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      state.value.error = message
      console.error(`❌ [${MODULE_NAME}] Failed to load history:`, message)
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
        reason: 'sales_consumption', // FIFO списание при продаже - исключается из Spoilage в COGS
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

      // ✅ EGRESS FIX: Skip balance reload for POS sales (saves ~300KB per payment)
      const storageOperation = await storageStore.createWriteOff(writeOffData, { skipReload: true })

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

        // 8. ✅ FIX: Update order_items with write_off_operation_id for audit trail
        try {
          const { supabase } = await import('@/supabase/client')

          const { data: updatedItems, error } = await supabase
            .from('order_items')
            .update({
              write_off_operation_id: saveResult.data.storageOperationId
            })
            .eq('menu_item_id', billItem.menuItemId)
            .is('write_off_operation_id', null)
            .order('created_at', { ascending: false })
            .limit(billItem.quantity)
            .select()

          if (error) {
            console.error(`⚠️ [${MODULE_NAME}] Failed to update order_items:`, error)
          } else {
            console.log(
              `✅ [${MODULE_NAME}] Updated ${updatedItems?.length || 0} order_items with write_off_operation_id`
            )
          }
        } catch (updateError) {
          console.error(`⚠️ [${MODULE_NAME}] Error updating order_items:`, updateError)
          // Non-critical error, write-off still succeeded
        }

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
   * ⚡ PERFORMANCE FIX: Process write-off from existing WriteOffResult
   * Avoids redundant decomposition when result is already available
   */
  async function processItemWriteOffFromResult(
    billItem: PosBillItem,
    writeOffResult: WriteOffResult,
    salesTransactionId: string
  ) {
    console.log(`🔄 [${MODULE_NAME}] Processing write-off from result for item:`, {
      menuItemName: billItem.menuItemName,
      quantity: billItem.quantity,
      itemsCount: writeOffResult.items.length,
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

      // 2. Skip decomposition - use provided writeOffResult directly
      if (writeOffResult.items.length === 0) {
        console.warn(`⚠️ [${MODULE_NAME}] No ingredients to write off`)
        return null
      }

      console.log(
        `📋 [${MODULE_NAME}] Using ${writeOffResult.items.length} items from provided result`
      )

      // 3. Prepare write-off items from WriteOffResult
      const writeOffItems: RecipeWriteOffItem[] = writeOffResult.items.map(item => ({
        type: item.type,
        itemId: item.type === 'product' ? item.productId! : item.preparationId!,
        itemName: item.type === 'product' ? item.productName! : item.preparationName!,
        quantityPerPortion: item.quantity / billItem.quantity,
        totalQuantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit || 0,
        totalCost: item.totalCost,
        batchIds: []
      }))

      // 4. Create storage write-off operation
      const writeOffData: CreateWriteOffData = {
        department: menuItem.department,
        responsiblePerson: 'system',
        reason: 'sales_consumption',
        items: writeOffItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          itemType: item.type,
          quantity: item.totalQuantity,
          unit: item.unit,
          notes: undefined
        })),
        notes: `Auto sales write-off: ${menuItem.name} - ${variant.name} (${billItem.quantity} portion${billItem.quantity > 1 ? 's' : ''})`
      }

      // ✅ EGRESS FIX: Skip balance reload for POS sales (saves ~300KB per payment)
      const storageOperation = await storageStore.createWriteOff(writeOffData, { skipReload: true })

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
        const actualCost = costMap.get(item.itemId)
        if (actualCost) {
          item.costPerUnit = actualCost.costPerUnit
          item.totalCost = actualCost.totalCost
        }
      })

      // 6. Create recipe write-off record
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
        recipeId: undefined,
        portionSize: 1,
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

        // 8. ✅ FIX: Update order_items with write_off_operation_id for audit trail
        try {
          const { supabase } = await import('@/supabase/client')

          const { data: updatedItems, error } = await supabase
            .from('order_items')
            .update({
              write_off_operation_id: saveResult.data.storageOperationId
            })
            .eq('menu_item_id', billItem.menuItemId)
            .is('write_off_operation_id', null)
            .order('created_at', { ascending: false })
            .limit(billItem.quantity)
            .select()

          if (error) {
            console.error(`⚠️ [${MODULE_NAME}] Failed to update order_items:`, error)
          } else {
            console.log(
              `✅ [${MODULE_NAME}] Updated ${updatedItems?.length || 0} order_items with write_off_operation_id`
            )
          }
        } catch (updateError) {
          console.error(`⚠️ [${MODULE_NAME}] Error updating order_items:`, updateError)
          // Non-critical error, write-off still succeeded
        }

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
   * ✨ READY-TRIGGERED WRITE-OFF
   * Execute write-off at kitchen "ready" moment (before payment)
   *
   * Key differences from processItemWriteOff:
   * - NO salesTransactionId yet (that comes at payment)
   * - Returns cached cost data for fast payment path
   * - Creates recipe_writeoff WITHOUT sales transaction link
   *
   * @returns Object with storageOperationId, recipeWriteOffId, and actualCost
   */
  async function executeReadyTriggeredWriteOff(params: {
    orderId: string
    itemId: string
    menuItemId: string
    variantId?: string
    quantity: number
    selectedModifiers?: Array<{
      groupId: string
      groupName: string
      optionId: string
      optionName: string
      priceAdjustment: number
    }>
  }): Promise<{
    storageOperationId: string
    recipeWriteOffId: string
    actualCost: import('@/core/decomposition').ActualCostBreakdown
  } | null> {
    console.log(`🔄 [${MODULE_NAME}] Executing ready-triggered write-off:`, {
      orderId: params.orderId,
      itemId: params.itemId,
      menuItemId: params.menuItemId,
      quantity: params.quantity
    })

    try {
      // 1. Get menu item details
      const menuItem = menuStore.menuItems.find(item => item.id === params.menuItemId)
      if (!menuItem) {
        console.error(`❌ [${MODULE_NAME}] Menu item not found:`, params.menuItemId)
        return null
      }

      const variant = menuItem.variants.find(v => v.id === params.variantId)
      if (!variant) {
        console.error(`❌ [${MODULE_NAME}] Variant not found:`, params.variantId)
        return null
      }

      // 2. Use DecompositionEngine with CostAdapter for FIFO cost
      const { createDecompositionEngine, createWriteOffAdapter, createCostAdapter } = await import(
        '@/core/decomposition'
      )

      const engine = await createDecompositionEngine()
      const writeOffAdapter = createWriteOffAdapter()
      const costAdapter = createCostAdapter()
      await costAdapter.initialize()

      const menuInput = {
        menuItemId: params.menuItemId,
        variantId: params.variantId || variant.id,
        quantity: params.quantity,
        selectedModifiers: params.selectedModifiers
      }

      // Single traversal for both adapters
      const traversalResult = await engine.traverse(menuInput, costAdapter.getTraversalOptions())

      // Transform to write-off items
      const writeOffResult = await writeOffAdapter.transform(traversalResult, menuInput)

      if (writeOffResult.items.length === 0) {
        console.warn(`⚠️ [${MODULE_NAME}] No ingredients to write off`)
        return null
      }

      // Get actual cost from FIFO batches
      const actualCost = await costAdapter.transform(traversalResult, menuInput)

      console.log(`📋 [${MODULE_NAME}] Ready write-off decomposed:`, {
        itemsCount: writeOffResult.items.length,
        totalCost: actualCost.totalCost
      })

      // 3. Prepare write-off items
      const writeOffItems: RecipeWriteOffItem[] = writeOffResult.items.map(item => ({
        type: item.type,
        itemId: item.type === 'product' ? item.productId! : item.preparationId!,
        itemName: item.type === 'product' ? item.productName! : item.preparationName!,
        quantityPerPortion: item.quantity / params.quantity,
        totalQuantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit || 0,
        totalCost: item.totalCost,
        batchIds: []
      }))

      // 4. Create storage write-off operation
      const writeOffData: CreateWriteOffData = {
        department: menuItem.department,
        responsiblePerson: 'kitchen',
        reason: 'sales_consumption', // Will be linked to sales at payment
        items: writeOffItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          itemType: item.type,
          quantity: item.totalQuantity,
          unit: item.unit,
          notes: undefined
        })),
        notes: `Ready write-off: ${menuItem.name} - ${variant.name} (${params.quantity} portion${params.quantity > 1 ? 's' : ''})`
      }

      // Skip balance reload for performance
      const storageOperation = await storageStore.createWriteOff(writeOffData, { skipReload: true })

      console.log(`✅ [${MODULE_NAME}] Storage operation created:`, storageOperation.id)

      // 5. Extract batch IDs and update costs from storage operation
      storageOperation.items.forEach(opItem => {
        if (opItem.batchAllocations) {
          const writeOffItem = writeOffItems.find(wi => wi.itemId === opItem.itemId)
          if (writeOffItem) {
            writeOffItem.batchIds = opItem.batchAllocations.map(b => b.batchId)

            // Update with actual FIFO costs
            const totalCost = opItem.batchAllocations.reduce(
              (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
              0
            )
            const totalQty = opItem.batchAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0)
            writeOffItem.costPerUnit = totalQty > 0 ? totalCost / totalQty : 0
            writeOffItem.totalCost = totalCost
          }
        }
      })

      // 6. Create recipe write-off record (WITHOUT salesTransactionId!)
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
        salesTransactionId: '', // ⚠️ EMPTY - will be linked at payment
        menuItemId: params.menuItemId,
        variantId: params.variantId || variant.id,
        recipeId: undefined,
        portionSize: 1,
        soldQuantity: params.quantity,
        writeOffItems,
        decomposedItems: decomposedItemsForRecord,
        originalComposition: variant.composition,
        department: menuItem.department,
        operationType: 'auto_sales_writeoff',
        performedAt: new Date().toISOString(),
        performedBy: 'kitchen', // Kitchen triggered, not system/payment
        storageOperationId: storageOperation.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // 7. Save recipe write-off
      const saveResult = await RecipeWriteOffService.saveWriteOff(recipeWriteOff)
      if (!saveResult.success || !saveResult.data) {
        throw new Error(saveResult.error || 'Failed to save write-off')
      }

      state.value.writeOffs.push(saveResult.data)
      console.log(`✅ [${MODULE_NAME}] Ready write-off saved:`, saveResult.data.id)

      return {
        storageOperationId: storageOperation.id,
        recipeWriteOffId: saveResult.data.id,
        actualCost
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`❌ [${MODULE_NAME}] Ready write-off failed:`, message)
      state.value.error = message
      return null
    }
  }

  /**
   * ✨ Link existing recipe_writeoff to sales transaction (at payment time)
   */
  async function linkWriteOffToTransaction(
    recipeWriteOffId: string,
    salesTransactionId: string
  ): Promise<boolean> {
    try {
      const { supabase } = await import('@/supabase/client')

      const { error } = await supabase
        .from('recipe_write_offs')
        .update({
          sales_transaction_id: salesTransactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeWriteOffId)

      if (error) {
        console.error(`❌ [${MODULE_NAME}] Failed to link write-off to transaction:`, error)
        return false
      }

      // Update local state
      const localWriteOff = state.value.writeOffs.find(w => w.id === recipeWriteOffId)
      if (localWriteOff) {
        localWriteOff.salesTransactionId = salesTransactionId
      }

      console.log(
        `✅ [${MODULE_NAME}] Linked write-off ${recipeWriteOffId} to transaction ${salesTransactionId}`
      )
      return true
    } catch (err) {
      console.error(`❌ [${MODULE_NAME}] Error linking write-off:`, err)
      return false
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
    loadHistory, // ✅ For backoffice views that need write-off history
    processItemWriteOff,
    processItemWriteOffFromResult,
    executeReadyTriggeredWriteOff, // ✨ NEW: Ready-triggered write-off
    linkWriteOffToTransaction, // ✨ NEW: Link write-off at payment time
    getWriteOffsBySalesTransaction,
    getWriteOffsByMenuItem,
    getWriteOffById,
    getTotalCost,
    getSummary
  }
})
