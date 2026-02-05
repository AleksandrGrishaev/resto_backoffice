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
import type { PosPayment, PosBillItem } from '@/stores/pos/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { useChannelsStore } from '@/stores/channels'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'

const MODULE_NAME = 'SalesStore'

/**
 * Type guard to validate cachedActualCost structure
 * Prevents runtime crashes on malformed data
 */
function isValidCachedCost(cost: unknown): cost is ActualCostBreakdown {
  if (!cost || typeof cost !== 'object') return false
  const c = cost as Record<string, unknown>
  return (
    typeof c.totalCost === 'number' &&
    Array.isArray(c.productCosts) &&
    Array.isArray(c.preparationCosts)
  )
}

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
   * @param options.lightweight - If true, skip loading history (for POS mode)
   *                              POS only needs recordSalesTransaction, not history
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
      // ✅ OPTIMIZATION: POS doesn't need sales history, only write capability
      if (lightweight) {
        state.value.transactions = []
        state.value.initialized = true
        console.log(`✅ [${MODULE_NAME}] Initialized in lightweight mode (no history loaded)`)
      } else {
        const result = await SalesService.getAllTransactions()
        if (result.success && result.data) {
          state.value.transactions = result.data
          state.value.initialized = true
          console.log(`✅ [${MODULE_NAME}] Initialized with ${result.data.length} transactions`)
        } else {
          throw new Error(result.error || 'Failed to load transactions')
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
   * Load transaction history (for backoffice reports)
   * Call this when you need to display history
   */
  async function loadHistory() {
    console.log(`🔄 [${MODULE_NAME}] Loading transaction history...`)
    state.value.loading = true

    try {
      const result = await SalesService.getAllTransactions()
      if (result.success && result.data) {
        state.value.transactions = result.data
        console.log(`✅ [${MODULE_NAME}] Loaded ${result.data.length} transactions`)
      } else {
        throw new Error(result.error || 'Failed to load transactions')
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

      // ⚡ PERFORMANCE FIX: Create engine/adapters ONCE before loop
      const engine = await createDecompositionEngine()
      const writeOffAdapter = createWriteOffAdapter()
      const costAdapter = createCostAdapter()
      await costAdapter.initialize()

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

        // ✨ FAST PATH CHECK: If item has cached cost from Ready-Triggered Write-off
        // Use type guard to validate cachedActualCost structure
        const hasCachedCost =
          billItem.writeOffStatus === 'completed' &&
          isValidCachedCost(billItem.cachedActualCost) &&
          typeof billItem.recipeWriteOffId === 'string' &&
          billItem.recipeWriteOffId.length > 0

        let actualCost: ActualCostBreakdown
        let writeOffResult: WriteOffResult | null = null
        let decompositionSummary: DecompositionSummary

        if (hasCachedCost) {
          // ⚡ FAST PATH: Use cached cost, skip decomposition entirely
          console.log(
            `⚡ [${MODULE_NAME}] FAST PATH: Using cached cost for ${billItem.menuItemName}`
          )

          // Type guard already validated, safe to use
          actualCost = billItem.cachedActualCost as ActualCostBreakdown

          // Create minimal decomposition summary from cached data
          // Note: ActualCostBreakdown uses productCosts/preparationCosts (not products/preparations)
          decompositionSummary = {
            totalProducts: actualCost.productCosts?.length || 0,
            totalPreparations: actualCost.preparationCosts?.length || 0,
            totalCost: actualCost.totalCost,
            decomposedItems: [
              ...(actualCost.productCosts || []).map(p => ({
                type: 'product' as const,
                productId: p.productId,
                productName: p.productName,
                quantity: p.quantity,
                unit: p.unit,
                costPerUnit: p.averageCostPerUnit,
                totalCost: p.totalCost,
                path: []
              })),
              ...(actualCost.preparationCosts || []).map(p => ({
                type: 'preparation' as const,
                preparationId: p.preparationId,
                preparationName: p.preparationName,
                quantity: p.quantity,
                unit: p.unit,
                costPerUnit: p.averageCostPerUnit,
                totalCost: p.totalCost,
                path: []
              }))
            ]
          }
        } else {
          // 📦 FALLBACK: Normal decomposition (e.g., takeaway paid before kitchen ready)
          console.log(`📦 [${MODULE_NAME}] FALLBACK: Decomposing ${billItem.menuItemName}`)

          const menuInput = {
            menuItemId: billItem.menuItemId,
            variantId: billItem.variantId || variant.id,
            quantity: billItem.quantity,
            selectedModifiers: billItem.selectedModifiers
          }

          // ⚡ PERFORMANCE FIX: Single traversal for both adapters (same options)
          const traversalResult = await engine.traverse(
            menuInput,
            costAdapter.getTraversalOptions()
          )

          // Both adapters use the SAME traversal result
          writeOffResult = await writeOffAdapter.transform(traversalResult, menuInput)
          const totalCost = writeOffResult.totalBaseCost

          actualCost = await costAdapter.transform(traversalResult, menuInput)

          // Create decomposition summary from WriteOffResult
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

          decompositionSummary = {
            totalProducts: writeOffResult.totalProducts,
            totalPreparations: writeOffResult.totalPreparations,
            totalCost,
            decomposedItems: decomposedItemsForSummary
          }
        }

        // 3. Get allocated bill discount for THIS specific item
        const itemWithDiscount = itemsWithDiscount.find(i => i.id === billItem.id)
        const allocatedDiscount = itemWithDiscount?.allocatedBillDiscount || 0

        // 4. Calculate profit using ACTUAL cost
        const profitCalculation = calculateItemProfit(
          billItem,
          actualCost.totalCost,
          allocatedDiscount
        )

        // 5. Calculate taxes — channel-aware
        let serviceTaxRate = 0
        let governmentTaxRate = 0
        let serviceTaxAmount = 0
        let governmentTaxAmount = 0

        try {
          const ordersStore = usePosOrdersStore()
          const order = ordersStore.orders.find(o => o.id === payment.orderId)
          const chId = order?.channelId

          if (chId) {
            const channelsStore = useChannelsStore()
            const channel = channelsStore.getChannelById(chId)
            if (channel?.taxes?.length) {
              const taxes = channel.taxes
              // Map first tax to "service", second to "government" for backward compat
              if (taxes[0]) {
                serviceTaxRate = taxes[0].taxPercentage / 100
                serviceTaxAmount =
                  channel.taxMode === 'inclusive'
                    ? Math.round(
                        (profitCalculation.finalRevenue /
                          (1 + taxes.reduce((s, t) => s + t.taxPercentage / 100, 0))) *
                          serviceTaxRate
                      )
                    : Math.round(profitCalculation.finalRevenue * serviceTaxRate)
              }
              if (taxes[1]) {
                governmentTaxRate = taxes[1].taxPercentage / 100
                governmentTaxAmount =
                  channel.taxMode === 'inclusive'
                    ? Math.round(
                        (profitCalculation.finalRevenue /
                          (1 + taxes.reduce((s, t) => s + t.taxPercentage / 100, 0))) *
                          governmentTaxRate
                      )
                    : Math.round(profitCalculation.finalRevenue * governmentTaxRate)
              }
            }
          }
        } catch {
          // Fallback: use global taxes
          const pmStore = usePaymentSettingsStore()
          const activeTaxes = pmStore.activeTaxes
          if (activeTaxes[0]) {
            serviceTaxRate = activeTaxes[0].percentage / 100
            serviceTaxAmount = Math.round(profitCalculation.finalRevenue * serviceTaxRate)
          }
          if (activeTaxes[1]) {
            governmentTaxRate = activeTaxes[1].percentage / 100
            governmentTaxAmount = Math.round(profitCalculation.finalRevenue * governmentTaxRate)
          }
        }

        const totalTaxAmount = serviceTaxAmount + governmentTaxAmount

        // 6. Create sales transaction
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
          recipeId: undefined,
          recipeWriteOffId: hasCachedCost ? billItem.recipeWriteOffId : undefined,
          actualCost,
          profitCalculation,
          serviceTaxRate,
          serviceTaxAmount,
          governmentTaxRate,
          governmentTaxAmount,
          totalTaxAmount,
          decompositionSummary,
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

          if (hasCachedCost) {
            // ⚡ FAST PATH: Link existing write-off to transaction (no new write-off)
            await recipeWriteOffStore.linkWriteOffToTransaction(
              billItem.recipeWriteOffId!,
              saveResult.data.id
            )
            console.log(`⚡ [${MODULE_NAME}] Fast path: linked existing write-off to transaction`)
          } else if (writeOffResult) {
            // 📦 FALLBACK: Create new write-off
            const writeOff = await recipeWriteOffStore.processItemWriteOffFromResult(
              billItem,
              writeOffResult,
              saveResult.data.id
            )

            if (writeOff) {
              transaction.recipeWriteOffId = writeOff.id
              await SalesService.saveSalesTransaction(transaction)
              console.log(`✅ [${MODULE_NAME}] Transaction updated with write-off ID`)
            } else {
              console.error(`❌ [${MODULE_NAME}] Write-off creation failed for transaction`, {
                transactionId: saveResult.data.id,
                menuItemId: billItem.menuItemId,
                menuItemName: billItem.menuItemName,
                quantity: billItem.quantity
              })
            }
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
    loadHistory, // ✅ For backoffice views that need transaction history
    recordSalesTransaction,
    fetchTransactions,
    getStatistics,
    getTransactionById,
    getTransactionsByDateRange // ✅ SPRINT 5
  }
})
