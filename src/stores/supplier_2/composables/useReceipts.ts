// src/stores/supplier_2/composables/useReceipts.ts - ENHANCED VERSION

import { ref, computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import { TimeUtils } from '@/utils/time'
import { supabase } from '@/supabase/client'
import { useBackgroundTasks } from '@/core/background'
import type {
  Receipt,
  PurchaseOrder,
  CreateReceiptData,
  UpdateReceiptData,
  ReceiptFilters,
  DiscrepancySummary,
  ReceiptItem,
  ReceiptDiscrepancyInfo
} from '../types'
import type { PendingPayment } from '@/stores/account/types'

import { useSupplierStorageIntegration } from '../integrations/storageIntegration'

const MODULE_NAME = 'Receipts'

export function useReceipts() {
  const supplierStore = useSupplierStore()
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()
  const storageIntegration = useSupplierStorageIntegration() // ✅ ДОБАВИТЬ ЭТУ СТРОКУ

  // =============================================
  // STATE
  // =============================================
  const isCreatingStorageOperation = ref(false)
  const isUpdatingPrices = ref(false)

  const filters = ref<ReceiptFilters>({
    status: 'all',
    hasDiscrepancies: 'all'
  })

  // =============================================
  // COMPUTED
  // =============================================

  // Safe access to store data with fallback
  const receipts = computed(() => {
    return Array.isArray(supplierStore.state.receipts) ? supplierStore.state.receipts : []
  })

  const allReceipts = computed(() => receipts.value)
  const currentReceipt = computed(() => supplierStore.state.currentReceipt)

  const draftReceipts = computed(() => receipts.value.filter(receipt => receipt.status === 'draft'))

  const completedReceipts = computed(() =>
    receipts.value.filter(receipt => receipt.status === 'completed')
  )

  const receiptsWithDiscrepancies = computed(() =>
    receipts.value.filter(receipt => receipt.hasDiscrepancies)
  )

  const filteredReceipts = computed(() => {
    return receipts.value.filter(receipt => {
      if (
        filters.value.status &&
        filters.value.status !== 'all' &&
        receipt.status !== filters.value.status
      ) {
        return false
      }
      if (
        filters.value.hasDiscrepancies !== 'all' &&
        receipt.hasDiscrepancies !== filters.value.hasDiscrepancies
      ) {
        return false
      }
      return true
    })
  })

  const ordersForReceipt = computed(() => {
    const orders = Array.isArray(supplierStore.state.orders) ? supplierStore.state.orders : []

    return orders.filter(
      order =>
        order.status === 'sent' && // ✅ Только 'sent' статус
        !receipts.value.some(
          receipt => receipt.purchaseOrderId === order.id && receipt.status === 'completed'
        )
    )
  })

  const receiptStatistics = computed(() => ({
    total: receipts.value.length,
    draft: draftReceipts.value.length,
    completed: completedReceipts.value.length,
    withDiscrepancies: receiptsWithDiscrepancies.value.length,
    ordersAwaitingReceipt: ordersForReceipt.value.length
  }))

  const isLoading = computed(
    () =>
      supplierStore.state.loading.receipts ||
      isCreatingStorageOperation.value ||
      isUpdatingPrices.value
  )

  // =============================================
  // ACTIONS - CRUD Operations
  // =============================================

  /**
   * Fetch all receipts
   */
  async function fetchReceipts(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching receipts')
      await supplierStore.getReceipts()
      DebugUtils.info(MODULE_NAME, `Fetched ${receipts.value.length} receipts`)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching receipts', { error })
      throw error
    }
  }

  /**
   * Start receipt process for an order with validation
   * Supports both: order from local store or direct DB fetch (for POS Receipt)
   */
  async function startReceipt(
    purchaseOrderId: string,
    createData: CreateReceiptData
  ): Promise<Receipt> {
    try {
      // Try to find order in local store first
      let order = supplierStore.state.orders.find(o => o.id === purchaseOrderId)

      // If not found locally, fetch from DB (needed for POS Receipt flow)
      if (!order) {
        DebugUtils.info(MODULE_NAME, 'Order not in local store, fetching from DB', {
          purchaseOrderId
        })
        await supplierStore.getOrders({ status: 'sent' })
        order = supplierStore.state.orders.find(o => o.id === purchaseOrderId)
      }

      if (!order) {
        throw new Error(`Order with id ${purchaseOrderId} not found in database`)
      }

      if (!canStartReceipt(order)) {
        throw new Error(`Order is not ready for receipt. Current status: ${order.status}`)
      }

      DebugUtils.info(MODULE_NAME, 'Starting receipt for order', {
        orderId: purchaseOrderId,
        orderNumber: order.orderNumber,
        itemsCount: order.items.length,
        orderItemIds: order.items.map(i => i.id),
        createDataItemIds: createData.items?.map(i => i.orderItemId) || []
      })

      // ✅ ИСПРАВЛЕНО: Создаем receipt с полными данными упаковок
      // Use order items as base, matching with input data if available
      const enrichedCreateData: CreateReceiptData = {
        ...createData,
        items: order.items.map(orderItem => {
          const inputItem = createData.items?.find(i => i.orderItemId === orderItem.id)

          DebugUtils.debug(MODULE_NAME, 'Mapping order item', {
            orderItemId: orderItem.id,
            inputItemFound: !!inputItem,
            orderedQuantity: orderItem.orderedQuantity
          })

          return {
            orderItemId: orderItem.id,

            // Количества из заказа по умолчанию
            receivedQuantity: inputItem?.receivedQuantity ?? orderItem.orderedQuantity,
            receivedPackageQuantity:
              inputItem?.receivedPackageQuantity ?? orderItem.packageQuantity,

            // ✅ НОВОЕ: Данные упаковки из заказа
            packageId: inputItem?.packageId ?? orderItem.packageId,

            // Цены из заказа по умолчанию
            actualPackagePrice: inputItem?.actualPackagePrice, // undefined = использовать заказанную

            notes: inputItem?.notes || ''
          }
        })
      }

      const newReceipt = await supplierStore.createReceipt(enrichedCreateData)

      DebugUtils.info(MODULE_NAME, 'Receipt started successfully with package data', {
        receiptId: newReceipt.id,
        receiptNumber: newReceipt.receiptNumber
      })

      return newReceipt
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error starting receipt', { purchaseOrderId, error })
      throw error
    }
  }

  /**
   * Update receipt with enhanced validation
   */
  async function updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    try {
      const receipt = receipts.value.find(r => r.id === id)
      if (!receipt) {
        throw new Error(`Receipt with id ${id} not found`)
      }

      if (!canEditReceipt(receipt)) {
        throw new Error('Receipt cannot be edited in current status')
      }

      DebugUtils.info(MODULE_NAME, 'Updating receipt', { receiptId: id, updates: data })

      const updatedReceipt = await supplierStore.updateReceipt(id, data)

      DebugUtils.info(MODULE_NAME, 'Receipt updated successfully', { receiptId: id })
      return updatedReceipt
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating receipt', { receiptId: id, error })
      throw error
    }
  }

  /**
   * Complete receipt with full integration (Storage + Price Updates)
   * ✅ OPTIMIZED: Uses Supabase RPC function for atomic transaction (20s → 1-2s)
   */
  async function completeReceipt(receiptId: string): Promise<Receipt> {
    const startTime = performance.now()
    try {
      console.log(`🚀 Receipts: Starting optimized completion for ${receiptId}`)

      // Reload receipts from DB to ensure we have fresh data
      await supplierStore.getReceipts()

      const receipt = receipts.value.find(r => r.id === receiptId)
      if (!receipt) {
        throw new Error(`Receipt not found: ${receiptId}`)
      }

      if (!canEditReceipt(receipt)) {
        throw new Error(`Receipt cannot be edited in current status: ${receipt.status}`)
      }

      const order = supplierStore.state.orders.find(o => o.id === receipt.purchaseOrderId)
      if (!order) {
        throw new Error(`Order not found for receipt: ${receipt.purchaseOrderId}`)
      }

      // Calculate total amount for the receipt
      const totalAmount = receipt.items.reduce((sum, item) => {
        const actualBaseCost = item.actualBaseCost || item.orderedBaseCost
        return sum + item.receivedQuantity * actualBaseCost
      }, 0)

      // Prepare received items for RPC function
      const receivedItems = receipt.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        receivedQuantity: item.receivedQuantity,
        actualPrice: item.actualBaseCost || item.orderedBaseCost,
        packageId: item.packageId,
        packageSize: item.orderedPackageQuantity
      }))

      DebugUtils.info(MODULE_NAME, '📦 Calling RPC complete_receipt_full', {
        receiptId,
        itemsCount: receivedItems.length,
        totalAmount
      })

      // ✅ SINGLE RPC CALL - replaces 45-60+ sequential API calls
      const { data, error } = await supabase.rpc('complete_receipt_full', {
        p_receipt_id: receiptId,
        p_order_id: receipt.purchaseOrderId,
        p_delivery_date: TimeUtils.htmlInputToISO(receipt.deliveryDate),
        p_warehouse_id: 'warehouse-winter',
        p_supplier_id: order.supplierId,
        p_supplier_name: order.supplierName,
        p_total_amount: totalAmount,
        p_received_items: receivedItems
      })

      if (error || !data?.success) {
        const errorMsg = data?.error || error?.message || 'Unknown RPC error'
        DebugUtils.error(MODULE_NAME, '❌ RPC complete_receipt_full failed', {
          error: errorMsg,
          code: data?.code || error?.code
        })
        throw new Error(`Failed to complete receipt: ${errorMsg}`)
      }

      const rpcTime = performance.now() - startTime
      DebugUtils.info(MODULE_NAME, '✅ RPC complete_receipt_full succeeded', {
        timing: `${rpcTime.toFixed(0)}ms`,
        convertedBatches: data.convertedBatches,
        reconciledBatches: data.reconciledBatches,
        operationId: data.operationId,
        paymentId: data.paymentId
      })

      // Refresh local state in background (non-blocking)
      Promise.all([
        supplierStore.getReceipts(),
        supplierStore.getOrders(),
        storageStore.fetchBalances(getDepartmentFromOrder(order))
      ]).catch(err => {
        console.warn('Receipts: Background refresh failed:', err)
      })

      // ✅ Update product prices in BACKGROUND (non-blocking, dialog closes immediately)
      const { addReceiptPriceUpdateTask } = useBackgroundTasks()
      addReceiptPriceUpdateTask({
        receiptId,
        receiptNumber: receipt.receiptNumber,
        supplierName: order.supplierName
      }).catch(err => {
        console.warn('Receipts: Failed to queue price update task:', err)
      })

      const totalTime = performance.now() - startTime
      console.log(
        `🎉 Receipts: Receipt ${receipt.receiptNumber} completed in ${totalTime.toFixed(0)}ms (RPC: ${rpcTime.toFixed(0)}ms)`
      )

      // Return the completed receipt (will be refreshed from background fetch)
      return { ...receipt, status: 'completed', storageOperationId: data.operationId }
    } catch (error) {
      const totalTime = performance.now() - startTime
      console.error(`❌ Receipts: Error completing receipt (${totalTime.toFixed(0)}ms):`, error)
      throw error
    }
  }

  function calculateReceiptDiscrepancies(
    receipt: Receipt,
    order: PurchaseOrder
  ): {
    discrepancies: ReceiptDiscrepancyInfo[]
    hasDiscrepancies: boolean
    totalFinancialImpact: number
    newOrderAmount: number
  } {
    const discrepancies: ReceiptDiscrepancyInfo[] = []
    let totalFinancialImpact = 0
    let newOrderAmount = 0

    receipt.items.forEach(receiptItem => {
      const orderItem = order.items.find(oi => oi.id === receiptItem.orderItemId)
      if (!orderItem) return

      const orderedTotal = orderItem.orderedQuantity * orderItem.pricePerUnit

      // ✅ КРИТИЧНО: Используем actualBaseCost (цена за единицу), не actualPrice (цена за упаковку)
      // actualPrice = цена за упаковку (например 35000 за 1kg)
      // actualBaseCost = цена за базовую единицу (например 35 за gram)
      // receivedQuantity в базовых единицах (grams), поэтому умножаем на baseCost
      const actualBaseCost = receiptItem.actualBaseCost || orderItem.pricePerUnit
      const receivedTotal = receiptItem.receivedQuantity * actualBaseCost

      const quantityDifference = receiptItem.receivedQuantity - orderItem.orderedQuantity
      const priceDifference = actualBaseCost - orderItem.pricePerUnit
      const totalDifference = receivedTotal - orderedTotal

      newOrderAmount += receivedTotal
      totalFinancialImpact += totalDifference

      // Проверяем наличие расхождений (допуск 0.01 для избежания проблем с плавающей точкой)
      const hasQuantityDiscrepancy = Math.abs(quantityDifference) > 0.001
      const hasPriceDiscrepancy = Math.abs(priceDifference) > 0.01

      if (hasQuantityDiscrepancy || hasPriceDiscrepancy) {
        let discrepancyType: 'quantity' | 'price' | 'both'
        if (hasQuantityDiscrepancy && hasPriceDiscrepancy) {
          discrepancyType = 'both'
        } else if (hasQuantityDiscrepancy) {
          discrepancyType = 'quantity'
        } else {
          discrepancyType = 'price'
        }

        discrepancies.push({
          type: discrepancyType,
          itemId: receiptItem.itemId,
          itemName: orderItem.itemName,
          ordered: {
            quantity: orderItem.orderedQuantity,
            price: orderItem.pricePerUnit,
            total: orderedTotal
          },
          received: {
            quantity: receiptItem.receivedQuantity,
            price: actualBaseCost,
            total: receivedTotal
          },
          impact: {
            quantityDifference,
            priceDifference,
            totalDifference
          }
        })
      }
    })

    return {
      discrepancies,
      hasDiscrepancies: discrepancies.length > 0,
      totalFinancialImpact,
      newOrderAmount
    }
  }

  /**
   * Update order with receipt completion data
   */
  async function updateOrderAfterReceiptCompletion(
    receipt: Receipt,
    order: PurchaseOrder,
    receivedBy: string
  ): Promise<void> {
    try {
      const discrepancyAnalysis = calculateReceiptDiscrepancies(receipt, order)

      console.log(`Receipts: Analyzing receipt impact for order ${order.orderNumber}`, {
        originalAmount: order.totalAmount,
        newAmount: discrepancyAnalysis.newOrderAmount,
        financialImpact: discrepancyAnalysis.totalFinancialImpact,
        hasDiscrepancies: discrepancyAnalysis.hasDiscrepancies,
        discrepanciesCount: discrepancyAnalysis.discrepancies.length
      })

      // Подготавливаем данные для обновления заказа
      const updateData: any = {
        status: 'delivered',
        // Сохраняем оригинальную сумму при первом обновлении
        originalTotalAmount: order.originalTotalAmount || order.totalAmount,
        actualDeliveredAmount: discrepancyAnalysis.newOrderAmount,
        receiptDiscrepancies: discrepancyAnalysis.discrepancies,
        hasReceiptDiscrepancies: discrepancyAnalysis.hasDiscrepancies,
        receiptCompletedAt: new Date().toISOString(),
        receiptCompletedBy: receivedBy
      }

      // Обновляем сумму заказа только если есть существенные изменения
      if (Math.abs(discrepancyAnalysis.totalFinancialImpact) > 0.01) {
        updateData.totalAmount = discrepancyAnalysis.newOrderAmount

        console.log(`Receipts: Updating order amount due to receipt discrepancies`, {
          orderId: order.id,
          originalAmount: order.totalAmount,
          newAmount: discrepancyAnalysis.newOrderAmount,
          impact: discrepancyAnalysis.totalFinancialImpact
        })
      }

      // Обновляем заказ
      const { usePurchaseOrders } = await import('./usePurchaseOrders')
      const { updateOrder } = usePurchaseOrders()

      const updatedOrder = await updateOrder(order.id, updateData)

      // ✅ НОВОЕ: Синхронизируем платежи через useOrderPayments
      if (updateData.totalAmount) {
        try {
          console.log(`🔥 DEBUG: Starting payment sync for order ${order.orderNumber}`)
          const { useOrderPayments } = await import('./useOrderPayments')
          const { syncOrderPaymentsAfterReceipt } = useOrderPayments()

          await syncOrderPaymentsAfterReceipt(
            updatedOrder,
            discrepancyAnalysis.totalFinancialImpact
          )

          console.log(`Receipts: Payment auto-sync completed for order ${order.orderNumber}`)
        } catch (syncError) {
          console.warn('Receipts: Failed to sync order payments:', syncError)
          // Не блокируем процесс, только логируем ошибку
        }
      }

      // Пересчитываем статус платежей после обновления суммы
      if (updateData.totalAmount) {
        try {
          const { calculateBillStatus } = usePurchaseOrders()
          const newBillStatus = await calculateBillStatus(updatedOrder)

          if (newBillStatus !== updatedOrder.billStatus) {
            await updateOrder(updatedOrder.id, {
              billStatus: newBillStatus
            })
            console.log(
              `Receipts: Bill status updated to ${newBillStatus} for order ${updatedOrder.orderNumber}`
            )
          }
        } catch (billStatusError) {
          console.warn('Receipts: Failed to update bill status:', billStatusError)
        }
      }

      console.log(`Receipts: Order updated successfully after receipt completion`, {
        orderId: order.id,
        hasDiscrepancies: discrepancyAnalysis.hasDiscrepancies,
        financialImpact: discrepancyAnalysis.totalFinancialImpact
      })
    } catch (error) {
      console.error(`Receipts: Failed to update order after receipt completion:`, error)
      throw error
    }
  }

  /**
   * Update individual receipt item with validation
   */
  async function updateReceiptItem(
    receiptId: string,
    itemId: string,
    updates: Partial<ReceiptItem>
  ): Promise<void> {
    try {
      const receipt = receipts.value.find(r => r.id === receiptId)
      if (!receipt) {
        throw new Error(`Receipt with id ${receiptId} not found`)
      }

      if (!canEditReceipt(receipt)) {
        throw new Error('Cannot modify completed receipt')
      }

      // Find by id OR orderItemId for flexibility
      const item = receipt.items.find(i => i.id === itemId || i.orderItemId === itemId)
      if (!item) {
        throw new Error(`Item with id ${itemId} not found in receipt`)
      }

      // Validate updates
      if (updates.receivedQuantity !== undefined && updates.receivedQuantity < 0) {
        throw new Error('Received quantity cannot be negative')
      }

      if (updates.actualPrice !== undefined && updates.actualPrice < 0) {
        throw new Error('Actual price cannot be negative')
      }

      // Apply updates
      Object.assign(item, updates, {
        updatedAt: new Date().toISOString()
      })

      // Recalculate discrepancies
      receipt.hasDiscrepancies = calculateHasDiscrepancies(receipt)

      DebugUtils.debug(MODULE_NAME, 'Receipt item updated', {
        receiptId,
        itemId,
        updates
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update receipt item', { receiptId, itemId, error })
      throw error
    }
  }

  // =============================================
  // STORAGE INTEGRATION
  // =============================================

  /**
   * Create storage operation from completed receipt
   */
  async function createStorageOperation(receipt: Receipt, order: PurchaseOrder): Promise<void> {
    try {
      isCreatingStorageOperation.value = true

      // ✅ ИСПРАВЛЕНО: Используем правильный integration
      const operationId = await storageIntegration.createReceiptOperation(receipt, order)

      DebugUtils.info(MODULE_NAME, 'Storage operation created successfully', {
        receiptId: receipt.id,
        operationId
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create storage operation', {
        receiptId: receipt.id,
        error
      })
      throw error
    } finally {
      isCreatingStorageOperation.value = false
    }
  }

  /**
   * Update product prices after receipt
   */
  async function updateProductPrices(receipt: Receipt): Promise<void> {
    try {
      isUpdatingPrices.value = true

      // ✅ ИСПРАВЛЕНО: Используем правильный integration
      await storageIntegration.updateProductPrices(receipt)

      DebugUtils.info(MODULE_NAME, 'Product prices updated successfully', {
        receiptId: receipt.id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product prices', {
        receiptId: receipt.id,
        error
      })
      throw error
    } finally {
      isUpdatingPrices.value = false
    }
  }

  // =============================================
  // ANALYSIS & CALCULATIONS
  // =============================================

  /**
   * Calculate detailed discrepancies with financial analysis
   */
  function calculateDiscrepancies(receipt: Receipt): DiscrepancySummary {
    let hasQuantityDiscrepancies = false
    let hasPriceDiscrepancies = false
    let totalQuantityDifference = 0
    let totalPriceDifference = 0
    let affectedItems = 0

    for (const item of receipt.items) {
      let itemAffected = false

      // Check quantity discrepancies
      const quantityDiff = item.receivedQuantity - item.orderedQuantity
      if (Math.abs(quantityDiff) > 0.001) {
        // Precision tolerance
        hasQuantityDiscrepancies = true
        totalQuantityDifference += Math.abs(quantityDiff)
        itemAffected = true
      }

      // Check price discrepancies
      // ✅ FIXED: Use BaseCost (per unit), not Price (per package)
      const actualBaseCost = item.actualBaseCost || item.orderedBaseCost
      const priceDiff = actualBaseCost - item.orderedBaseCost
      if (Math.abs(priceDiff) > 0.01) {
        // Price precision tolerance
        hasPriceDiscrepancies = true
        totalPriceDifference += priceDiff * item.receivedQuantity
        itemAffected = true
      }

      if (itemAffected) {
        affectedItems++
      }
    }

    return {
      hasDiscrepancies: hasQuantityDiscrepancies || hasPriceDiscrepancies,
      hasQuantityDiscrepancies,
      hasPriceDiscrepancies,
      totalQuantityDifference: Math.round(totalQuantityDifference * 1000) / 1000,
      totalPriceDifference: Math.round(totalPriceDifference),
      affectedItems,
      totalItems: receipt.items.length
    }
  }

  /**
   * Simple boolean check for discrepancies
   */
  function calculateHasDiscrepancies(receipt: Receipt): boolean {
    return receipt.items.some(item => {
      // Quantity discrepancy
      if (Math.abs(item.receivedQuantity - item.orderedQuantity) > 0.001) {
        return true
      }

      // Price discrepancy
      // ✅ FIXED: Use BaseCost (per unit), not Price (per package)
      if (item.actualBaseCost && Math.abs(item.actualBaseCost - item.orderedBaseCost) > 0.01) {
        return true
      }

      return false
    })
  }

  /**
   * Calculate financial impact of receipt
   */
  function calculateFinancialImpact(receipt: Receipt): {
    plannedTotal: number
    actualTotal: number
    difference: number
    differencePercent: number
    savingsOrOvercost: 'savings' | 'overcost' | 'neutral'
  } {
    let plannedTotal = 0
    let actualTotal = 0

    for (const item of receipt.items) {
      // ✅ КРИТИЧНО: Используем BaseCost (цена за единицу), не Price (цена за упаковку)
      // receivedQuantity/orderedQuantity в базовых единицах (grams)
      plannedTotal += item.orderedQuantity * item.orderedBaseCost
      actualTotal += item.receivedQuantity * (item.actualBaseCost || item.orderedBaseCost)
    }

    const difference = actualTotal - plannedTotal
    const differencePercent = plannedTotal > 0 ? (difference / plannedTotal) * 100 : 0

    let savingsOrOvercost: 'savings' | 'overcost' | 'neutral' = 'neutral'
    if (difference < -100) {
      // Savings more than 100 IDR
      savingsOrOvercost = 'savings'
    } else if (difference > 100) {
      // Overcost more than 100 IDR
      savingsOrOvercost = 'overcost'
    }

    return {
      plannedTotal: Math.round(plannedTotal),
      actualTotal: Math.round(actualTotal),
      difference: Math.round(difference),
      differencePercent: Math.round(differencePercent * 100) / 100,
      savingsOrOvercost
    }
  }

  /**
   * Check if receipt is ready for completion
   */
  function canCompleteReceipt(receipt: Receipt): { canComplete: boolean; reasons: string[] } {
    const reasons: string[] = []

    if (receipt.status === 'completed') {
      reasons.push('Receipt is already completed')
      return { canComplete: false, reasons }
    }

    // Check all items have valid received quantities
    for (const item of receipt.items) {
      if (item.receivedQuantity === undefined || item.receivedQuantity < 0) {
        reasons.push(`Item ${item.itemName} has invalid received quantity`)
      }
    }

    // Check for critical discrepancies
    const discrepancies = calculateDiscrepancies(receipt)
    if (discrepancies.hasQuantityDiscrepancies) {
      const majorDiscrepancies = receipt.items.filter(item => {
        const diff = Math.abs(item.receivedQuantity - item.orderedQuantity)
        return diff > item.orderedQuantity * 0.1 // More than 10% deviation
      })

      if (majorDiscrepancies.length > 0) {
        reasons.push(
          `Major quantity discrepancies detected (>10%) for ${majorDiscrepancies.length} items`
        )
      }
    }

    return { canComplete: reasons.length === 0, reasons }
  }

  // =============================================
  // FILTERING & SELECTION
  // =============================================

  /**
   * Set current receipt for detailed view
   */
  function setCurrentReceipt(receipt: Receipt | undefined): void {
    supplierStore.setCurrentReceipt(receipt)
  }

  /**
   * Update filters for receipt list
   */
  function updateFilters(newFilters: Partial<ReceiptFilters>): void {
    filters.value = { ...filters.value, ...newFilters }
    DebugUtils.debug(MODULE_NAME, 'Updated filters', filters.value)
  }

  /**
   * Clear all filters
   */
  function clearFilters(): void {
    filters.value = {
      status: 'all',
      hasDiscrepancies: 'all'
    }
    DebugUtils.debug(MODULE_NAME, 'Cleared all filters')
  }

  // =============================================
  // HELPER FUNCTIONS
  // =============================================

  /**
   * Get receipt by ID
   */
  function getReceiptById(id: string): Receipt | undefined {
    return receipts.value.find(receipt => receipt.id === id)
  }

  /**
   * Get receipts by status
   */
  function getReceiptsByStatus(status: Receipt['status']): Receipt[] {
    return receipts.value.filter(receipt => receipt.status === status)
  }

  /**
   * Get receipt by order ID
   */
  function getReceiptByOrderId(orderId: string): Receipt | undefined {
    return receipts.value.find(receipt => receipt.purchaseOrderId === orderId)
  }

  /**
   * Check if order can start receipt
   */
  function canStartReceipt(order: PurchaseOrder): boolean {
    // ✅ Allow both 'sent' and 'delivered' statuses:
    // - 'sent': Normal flow (Request → Order → Receipt)
    // - 'delivered': QuickReceipt flow (Order created directly as delivered for archive data)
    const isValidStatus = order.status === 'sent' || order.status === 'delivered'

    // Проверяем наличие активных receipts
    const existingReceipts = receipts.value.filter(r => r.purchaseOrderId === order.id)
    const activeReceipts = existingReceipts.filter(r => r.status === 'draft')
    const hasActiveReceipt = activeReceipts.length > 0

    DebugUtils.debug(MODULE_NAME, 'canStartReceipt check', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      isValidStatus,
      existingReceipts: existingReceipts.length,
      activeReceipts: activeReceipts.length,
      hasActiveReceipt,
      canStart: isValidStatus && !hasActiveReceipt
    })

    return isValidStatus && !hasActiveReceipt
  }

  /**
   * Check if receipt can be edited
   */
  function canEditReceipt(receipt: Receipt): boolean {
    return receipt.status === 'draft'
  }

  /**
   * Determine department from order items
   */
  function getDepartmentFromOrder(order: PurchaseOrder): 'kitchen' | 'bar' {
    const hasBarItems = order.items.some(
      item =>
        item.itemId.includes('beer') ||
        item.itemId.includes('cola') ||
        item.itemId.includes('water') ||
        item.itemId.includes('wine') ||
        item.itemId.includes('spirit') ||
        item.itemName.toLowerCase().includes('beer') ||
        item.itemName.toLowerCase().includes('wine') ||
        item.itemName.toLowerCase().includes('alcohol')
    )
    return hasBarItems ? 'bar' : 'kitchen'
  }

  /**
   * Calculate expiry date for item
   */
  function calculateExpiryDate(itemId: string): string | undefined {
    try {
      const product = productsStore.products?.find(p => p.id === itemId)

      if (product?.shelfLife && product.shelfLife > 0) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + product.shelfLife)
        return expiryDate.toISOString()
      }

      return undefined
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to calculate expiry date', { itemId, error })
      return undefined
    }
  }

  // =============================================
  // UI HELPERS
  // =============================================

  /**
   * Get status color for UI
   */
  function getStatusColor(status: Receipt['status']): string {
    switch (status) {
      case 'draft':
        return 'orange'
      case 'completed':
        return 'green'
      default:
        return 'default'
    }
  }

  /**
   * Get discrepancy color for UI
   */
  function getDiscrepancyColor(hasDiscrepancies: boolean): string {
    return hasDiscrepancies ? 'warning' : 'success'
  }

  /**
   * Format currency for display
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date for display
   */
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get quantity discrepancy text for UI
   */
  function getQuantityDiscrepancyText(ordered: number, received: number): string {
    const diff = received - ordered
    if (Math.abs(diff) <= 0.0000001) return 'Exact'
    // Format with up to 6 decimals, remove trailing zeros
    const formatted = diff.toFixed(6).replace(/\.?0+$/, '')
    return diff > 0 ? `+${formatted}` : formatted
  }

  /**
   * Get price discrepancy text for UI
   */
  function getPriceDiscrepancyText(ordered: number, actual?: number): string {
    if (!actual) return 'Same'
    const diff = actual - ordered
    if (Math.abs(diff) <= 0.01) return 'Same'
    return diff > 0 ? `+${formatCurrency(diff)}` : `${formatCurrency(diff)}`
  }

  /**
   * Проверить интеграцию receipt со складом
   */
  function isReceiptIntegratedWithStorage(receipt: Receipt): boolean {
    return !!(receipt.storageIntegrated && receipt.batchIds?.length)
  }

  /**
   * Получить информацию о созданных батчах для receipt
   */
  async function getReceiptBatches(receipt: Receipt): Promise<any[]> {
    if (!receipt.batchIds?.length) return []

    try {
      const batches = await Promise.all(receipt.batchIds.map(id => storageStore.getBatchById(id)))

      return batches.filter(batch => batch !== null)
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get receipt batches', {
        receiptId: receipt.id,
        error
      })
      return []
    }
  }

  /**
   * Получить статистику по интеграции со складом
   */
  const storageIntegrationStats = computed(() => {
    const total = receipts.value.length
    const integrated = receipts.value.filter(r => isReceiptIntegratedWithStorage(r)).length

    return {
      total,
      integrated,
      notIntegrated: total - integrated,
      integrationRate: total > 0 ? Math.round((integrated / total) * 100) : 0
    }
  })

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // State
    filters,
    isCreatingStorageOperation,
    isUpdatingPrices,

    // Computed
    receipts,
    allReceipts,
    currentReceipt,
    filteredReceipts,
    draftReceipts,
    completedReceipts,
    receiptsWithDiscrepancies,
    ordersForReceipt,
    receiptStatistics,
    isLoading,

    // CRUD Actions
    fetchReceipts,
    startReceipt,
    updateReceipt,
    completeReceipt,
    updateReceiptItem,

    // Storage Integration
    createStorageOperation,
    updateProductPrices,

    // Analysis & Calculations
    calculateDiscrepancies,
    calculateHasDiscrepancies,
    calculateFinancialImpact,
    canCompleteReceipt,

    // Filtering & Selection
    setCurrentReceipt,
    updateFilters,
    clearFilters,

    // Helpers
    getReceiptById,
    getReceiptsByStatus,
    getReceiptByOrderId,
    canStartReceipt,
    canEditReceipt,
    getDepartmentFromOrder,
    calculateExpiryDate,

    // UI Helpers
    getStatusColor,
    getDiscrepancyColor,
    formatCurrency,
    formatDate,
    getQuantityDiscrepancyText,
    getPriceDiscrepancyText,

    // ✅ НОВЫЕ exports:
    isReceiptIntegratedWithStorage,
    getReceiptBatches,
    storageIntegrationStats
  }
}
