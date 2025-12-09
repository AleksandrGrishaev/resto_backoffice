import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SalesTransaction, SalesFilters, DecompositionSummary } from './types'
import { SalesService } from './services'
import { useRecipeWriteOffStore } from './recipeWriteOff'
import { useProfitCalculation } from './composables/useProfitCalculation'
// ✅ PHASE 3: Use unified DecompositionEngine + adapters
import {
  createDecompositionEngine,
  createWriteOffAdapter,
  createCostAdapter,
  type WriteOffResult,
  type ActualCostBreakdown
} from '@/core/decomposition'
import { useMenuStore } from '@/stores/menu/menuStore'
import { usePreparationStore, preparationService } from '@/stores/preparation' // ✅ For reloading batches after write-off
import type { PosPayment, PosBillItem } from '@/stores/pos/types'

const MODULE_NAME = 'SalesStore'

export const useSalesStore = defineStore('sales', () => {
  // Dependencies
  const recipeWriteOffStore = useRecipeWriteOffStore()
  const menuStore = useMenuStore()
  const { calculateItemProfit, allocateBillDiscount } = useProfitCalculation()
  // ✅ PHASE 3: Removed useDecomposition and useActualCostCalculation
  // Now using DecompositionEngine + WriteOffAdapter + CostAdapter

  // State
  const state = ref({
    transactions: [] as SalesTransaction[],
    loading: false,
    error: null as string | null,
    initialized: false,
    filters: {
      dateFrom: undefined,
      dateTo: undefined,
      menuItemId: undefined,
      paymentMethod: undefined,
      department: undefined
    } as SalesFilters
  })

  // Computed
  const transactions = computed(() => state.value.transactions)
  const loading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)
  const initialized = computed(() => state.value.initialized)

  /**
   * Today's revenue
   */
  const todayRevenue = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return state.value.transactions
      .filter(t => t.soldAt.startsWith(today))
      .reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0)
  })

  /**
   * Today's profit
   */
  const todayProfit = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return state.value.transactions
      .filter(t => t.soldAt.startsWith(today))
      .reduce((sum, t) => sum + t.profitCalculation.profit, 0)
  })

  /**
   * Today's items sold
   */
  const todayItemsSold = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return state.value.transactions
      .filter(t => t.soldAt.startsWith(today))
      .reduce((sum, t) => sum + t.quantity, 0)
  })

  /**
   * Popular items (top 10)
   */
  const popularItems = computed(() => {
    const itemsMap = new Map<
      string,
      {
        menuItemId: string
        menuItemName: string
        quantitySold: number
        totalRevenue: number
        totalProfit: number
      }
    >()

    state.value.transactions.forEach(t => {
      const key = t.menuItemId
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          menuItemId: t.menuItemId,
          menuItemName: t.menuItemName,
          quantitySold: 0,
          totalRevenue: 0,
          totalProfit: 0
        })
      }

      const item = itemsMap.get(key)!
      item.quantitySold += t.quantity
      item.totalRevenue += t.profitCalculation.finalRevenue
      item.totalProfit += t.profitCalculation.profit
    })

    return Array.from(itemsMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10)
  })

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
      const result = await SalesService.getAllTransactions()
      if (result.success && result.data) {
        state.value.transactions = result.data
        state.value.initialized = true
        console.log(`✅ [${MODULE_NAME}] Initialized with ${result.data.length} transactions`)
      } else {
        throw new Error(result.error || 'Failed to load transactions')
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
   * Record sales transaction
   * Главная функция для записи продаж и запуска write-off
   */
  async function recordSalesTransaction(
    payment: PosPayment,
    billItems: PosBillItem[],
    billDiscountAmount: number = 0,
    billDiscountInfo?: Array<{
      billId: string
      billNumber: string
      amount: number
      reason: string
    }>
  ) {
    console.log(`🔄 [${MODULE_NAME}] Recording sales transaction:`, {
      paymentId: payment.id,
      itemsCount: billItems.length,
      amount: payment.amount,
      billDiscountAmount,
      billDiscountInfo
    })

    try {
      // ✅ Verify auth session at entry point
      const { ensureAuthSession } = await import('@/supabase')
      const hasAuth = await ensureAuthSession()

      if (!hasAuth) {
        console.error('❌ [salesStore] No auth session - discount events may fail with RLS error')
      }
      // Create discount_events for bill discounts
      if (billDiscountInfo && billDiscountInfo.length > 0) {
        const { discountSupabaseService } = await import('@/stores/discounts/services')
        const { generateId } = await import('@/utils')
        const { TimeUtils } = await import('@/utils')

        for (const billDiscount of billDiscountInfo) {
          // Calculate allocation details for this bill's items
          const billItemsForThisBill = billItems.filter(item => item.billId === billDiscount.billId)

          const itemsWithDiscount = allocateBillDiscount(billItemsForThisBill, billDiscount.amount)

          // Calculate bill totals
          const totalBillAmount = billItemsForThisBill.reduce(
            (sum, item) => sum + item.totalPrice,
            0
          )

          // Build allocation details matching AllocationDetails interface
          const allocationDetails = {
            totalBillAmount,
            itemAllocations: itemsWithDiscount.map(itemWithDiscount => {
              // Find the original bill item to get full data
              const billItem = billItemsForThisBill.find(i => i.id === itemWithDiscount.id)!
              return {
                itemId: itemWithDiscount.id,
                itemName: billItem.menuItemName,
                itemAmount: billItem.totalPrice,
                proportion: billItem.totalPrice / totalBillAmount,
                allocatedDiscount: itemWithDiscount.allocatedBillDiscount
              }
            })
          }

          // Get current user ID from Supabase session (more reliable in background)
          const { getCurrentUserId } = await import('@/supabase')
          const currentUserId = await getCurrentUserId() // Returns null if no session

          // Create discount event matching DiscountEvent interface
          const discountEvent = {
            id: generateId(),
            type: 'bill' as const,
            discountType: 'fixed' as const, // Always fixed amount after calculation
            value: billDiscount.amount,
            reason: billDiscount.reason, // Properly typed as DiscountReason
            orderId: payment.orderId,
            billId: billDiscount.billId,
            shiftId: payment.shiftId,
            originalAmount: totalBillAmount,
            discountAmount: billDiscount.amount,
            finalAmount: totalBillAmount - billDiscount.amount,
            allocationDetails,
            appliedBy: currentUserId, // UUID or null
            appliedAt: TimeUtils.getCurrentLocalISO(),
            notes: `Bill discount (${billDiscount.billNumber}) - distributed proportionally across ${allocationDetails.itemAllocations.length} items`
          }

          console.log('💾 [salesStore] Creating discount_event for bill discount:', {
            eventId: discountEvent.id,
            billId: billDiscount.billId,
            amount: billDiscount.amount,
            itemsCount: allocationDetails.length
          })

          // Save to database
          const saveResult = await discountSupabaseService.saveDiscountEvent(discountEvent)
          if (!saveResult.success) {
            console.warn('⚠️ [salesStore] Failed to save bill discount event:', saveResult.error)
            // Continue anyway - discount is already applied
          } else {
            console.log('✅ [salesStore] Bill discount event saved:', discountEvent.id)
          }
        }
      }

      // ✅ Calculate allocated bill discount for ALL items ONCE (before loop)
      // This ensures proportional distribution across all items
      const itemsWithDiscount = allocateBillDiscount(billItems, billDiscountAmount)

      console.log('📊 [salesStore] Bill discount allocated across items:', {
        billDiscountAmount,
        itemsCount: billItems.length,
        allocations: itemsWithDiscount.map(i => ({
          name: i.menuItemName,
          allocated: i.allocatedBillDiscount
        }))
      })

      // Process each item
      for (const billItem of billItems) {
        // 1. Get menu item details
        const menuItem = menuStore.menuItems.find(item => item.id === billItem.menuItemId)
        if (!menuItem) {
          console.error(`❌ [${MODULE_NAME}] Menu item not found:`, billItem.menuItemId)
          continue
        }

        const variant = menuItem.variants.find(v => v.id === billItem.variantId)
        if (!variant) {
          console.error(`❌ [${MODULE_NAME}] Variant not found:`, billItem.variantId)
          continue
        }

        // 2. ✅ PHASE 3: Use unified DecompositionEngine + adapters
        const engine = await createDecompositionEngine()
        const writeOffAdapter = createWriteOffAdapter()
        const costAdapter = createCostAdapter()
        await costAdapter.initialize()

        const menuInput = {
          menuItemId: billItem.menuItemId,
          variantId: billItem.variantId || variant.id,
          quantity: billItem.quantity,
          selectedModifiers: billItem.selectedModifiers
        }

        // 2a. Get write-off decomposition (for backward compatibility)
        const traversalResultForWriteOff = await engine.traverse(
          menuInput,
          writeOffAdapter.getTraversalOptions()
        )
        const writeOffResult: WriteOffResult = await writeOffAdapter.transform(
          traversalResultForWriteOff,
          menuInput
        )
        const totalCost = writeOffResult.totalBaseCost

        // 2b. Calculate actual cost from FIFO batches
        const traversalResultForCost = await engine.traverse(
          menuInput,
          costAdapter.getTraversalOptions()
        )
        const actualCost: ActualCostBreakdown = await costAdapter.transform(
          traversalResultForCost,
          menuInput
        )

        // 3. Get allocated bill discount for THIS specific item
        const itemWithDiscount = itemsWithDiscount.find(i => i.id === billItem.id)
        const allocatedDiscount = itemWithDiscount?.allocatedBillDiscount || 0

        // 4. Calculate profit using ACTUAL cost (✅ SPRINT 2: Use actualCost instead of decomposition)
        const profitCalculation = calculateItemProfit(
          billItem,
          actualCost.totalCost, // ✅ Use FIFO cost instead of decomposition
          allocatedDiscount
        )

        // 5. ✅ PHASE 3: Create decomposition summary from WriteOffResult
        // Convert WriteOffItems to DecomposedItem format for backward compatibility
        const decomposedItemsForSummary = writeOffResult.items.map(item => ({
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

        const decompositionSummary: DecompositionSummary = {
          totalProducts: writeOffResult.totalProducts,
          totalPreparations: writeOffResult.totalPreparations,
          totalCost,
          decomposedItems: decomposedItemsForSummary
        }

        // 6. Calculate taxes (✅ SPRINT 8: Tax storage)
        // Taxes are calculated from finalRevenue (after all discounts)
        const serviceTaxRate = 0.05 // 5% service tax (TODO: Get from config)
        const governmentTaxRate = 0.1 // 10% government tax (TODO: Get from config)
        const serviceTaxAmount = Math.round(profitCalculation.finalRevenue * serviceTaxRate)
        const governmentTaxAmount = Math.round(profitCalculation.finalRevenue * governmentTaxRate)
        const totalTaxAmount = serviceTaxAmount + governmentTaxAmount

        // 7. Create sales transaction
        const transaction: SalesTransaction = {
          id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          paymentId: payment.id,
          orderId: payment.orderId,
          billId: payment.billIds[0] || '',
          itemId: billItem.id,
          shiftId: payment.shiftId,
          menuItemId: billItem.menuItemId,
          menuItemName: billItem.menuItemName,
          variantId: billItem.variantId || variant.id,
          variantName: billItem.variantName || variant.name,
          quantity: billItem.quantity,
          unitPrice: billItem.unitPrice,
          totalPrice: billItem.totalPrice,
          paymentMethod: payment.method,
          soldAt: payment.processedAt,
          processedBy: payment.processedBy,
          recipeId: undefined, // Can be set if applicable
          recipeWriteOffId: undefined, // Will be set after write-off
          actualCost, // ✅ SPRINT 2: Actual cost from FIFO batches
          profitCalculation, // ✅ SPRINT 2: Now uses actualCost
          // ✅ SPRINT 8: Tax storage
          serviceTaxRate,
          serviceTaxAmount,
          governmentTaxRate,
          governmentTaxAmount,
          totalTaxAmount,
          decompositionSummary, // DEPRECATED: kept for backward compatibility
          syncedToBackoffice: true,
          syncedAt: new Date().toISOString(),
          department: menuItem.department,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // 7. Save transaction
        const saveResult = await SalesService.saveSalesTransaction(transaction)
        if (saveResult.success && saveResult.data) {
          state.value.transactions.push(saveResult.data)
          console.log(`✅ [${MODULE_NAME}] Transaction saved:`, saveResult.data.id)

          // 8. Trigger write-off (creates negative batches if needed)
          const writeOff = await recipeWriteOffStore.processItemWriteOff(
            billItem,
            saveResult.data.id
          )

          if (writeOff) {
            // Update transaction with write-off ID
            transaction.recipeWriteOffId = writeOff.id

            // ✅ FIX: Recalculate actual cost AFTER write-off (negative batches now exist)
            // This ensures we capture cost from negative batches created during write-off

            // ⚡ IMPORTANT: Refresh batches cache to include newly created negative batches
            // preparationService.getBatches() uses an in-memory cache that doesn't auto-update
            await preparationService.refreshBatches()

            const preparationStore = usePreparationStore()
            await preparationStore.fetchBalances('kitchen')

            // ✅ PHASE 3: Use CostAdapter for recalculation
            const costAdapterAfterWriteOff = createCostAdapter()
            await costAdapterAfterWriteOff.initialize()
            const traversalResultAfterWriteOff = await engine.traverse(
              menuInput,
              costAdapterAfterWriteOff.getTraversalOptions()
            )
            const actualCostAfterWriteOff: ActualCostBreakdown =
              await costAdapterAfterWriteOff.transform(traversalResultAfterWriteOff, menuInput)

            // Check if cost changed (negative batches were created)
            if (actualCostAfterWriteOff.totalCost !== actualCost.totalCost) {
              console.log(
                `🔄 [${MODULE_NAME}] Cost recalculated after write-off:`,
                `${actualCost.totalCost} → ${actualCostAfterWriteOff.totalCost}`
              )

              // Recalculate profit with new cost
              const itemWithDiscount = itemsWithDiscount.find(i => i.id === billItem.id)
              const allocatedDiscount = itemWithDiscount?.allocatedBillDiscount || 0
              const updatedProfitCalculation = calculateItemProfit(
                billItem,
                actualCostAfterWriteOff.totalCost,
                allocatedDiscount
              )

              // Update transaction with new cost and profit
              transaction.actualCost = actualCostAfterWriteOff
              transaction.profitCalculation = updatedProfitCalculation
            }

            await SalesService.saveSalesTransaction(transaction)
            console.log(`✅ [${MODULE_NAME}] Transaction updated with write-off ID`)
          }
        } else {
          throw new Error(saveResult.error || 'Failed to save transaction')
        }
      }

      console.log(`✅ [${MODULE_NAME}] All transactions recorded successfully`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`❌ [${MODULE_NAME}] Failed to record transaction:`, message)
      state.value.error = message
      throw err // Re-throw to let caller handle
    }
  }

  /**
   * Fetch transactions with filters
   */
  async function fetchTransactions(filters?: SalesFilters) {
    state.value.loading = true
    try {
      const result = await SalesService.getTransactions(filters)
      if (result.success && result.data) {
        state.value.transactions = result.data
        if (filters) {
          state.value.filters = { ...filters }
        }
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch transactions')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      state.value.error = message
      console.error(`❌ [${MODULE_NAME}] Failed to fetch transactions:`, message)
      return []
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Get statistics
   */
  async function getStatistics(filters?: SalesFilters) {
    const result = await SalesService.getStatistics(filters)
    return result.success ? result.data : null
  }

  /**
   * Get transaction by ID
   */
  async function getTransactionById(id: string) {
    const result = await SalesService.getTransactionById(id)
    return result.success ? result.data : null
  }

  /**
   * ✅ SPRINT 5: Get transactions by date range
   * Helper method for P&L report generation
   */
  async function getTransactionsByDateRange(dateFrom: string, dateTo: string) {
    return await fetchTransactions({
      dateFrom,
      dateTo
    })
  }

  return {
    // State
    state,
    transactions,
    loading,
    error,
    initialized,

    // Computed
    todayRevenue,
    todayProfit,
    todayItemsSold,
    popularItems,

    // Actions
    initialize,
    recordSalesTransaction,
    fetchTransactions,
    getStatistics,
    getTransactionById,
    getTransactionsByDateRange // ✅ SPRINT 5
  }
})
