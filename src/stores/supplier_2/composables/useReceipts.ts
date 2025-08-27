// src/stores/supplier_2/composables/useReceipts.ts - ENHANCED VERSION

import { ref, computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import type {
  Receipt,
  PurchaseOrder,
  CreateReceiptData,
  UpdateReceiptData,
  ReceiptFilters,
  DiscrepancySummary,
  ReceiptItem
} from '../types'

const MODULE_NAME = 'Receipts'

export function useReceipts() {
  const supplierStore = useSupplierStore()
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

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
        ['sent', 'confirmed'].includes(order.status) &&
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
      await supplierStore.fetchReceipts()
      DebugUtils.info(MODULE_NAME, `Fetched ${receipts.value.length} receipts`)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching receipts', { error })
      throw error
    }
  }

  /**
   * Start receipt process for an order with validation
   */
  async function startReceipt(purchaseOrderId: string, receivedBy: string): Promise<Receipt> {
    try {
      const order = supplierStore.state.orders.find(o => o.id === purchaseOrderId)
      if (!order) {
        throw new Error(`Order with id ${purchaseOrderId} not found`)
      }

      if (!canStartReceipt(order)) {
        throw new Error('Order is not ready for receipt')
      }

      DebugUtils.info(MODULE_NAME, 'Starting receipt for order', {
        orderId: purchaseOrderId,
        orderNumber: order.orderNumber
      })

      const createData: CreateReceiptData = {
        purchaseOrderId,
        receivedBy,
        items: order.items.map(orderItem => ({
          orderItemId: orderItem.id,
          receivedQuantity: orderItem.orderedQuantity, // Default to ordered quantity
          actualPrice: orderItem.pricePerUnit, // Default to ordered price
          notes: ''
        })),
        notes: `Receipt started for order ${order.orderNumber}`
      }

      const newReceipt = await supplierStore.createReceipt(createData)

      DebugUtils.info(MODULE_NAME, 'Receipt started successfully', {
        receiptId: newReceipt.id,
        receiptNumber: newReceipt.receiptNumber,
        orderId: purchaseOrderId
      })

      return newReceipt
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start receipt', { purchaseOrderId, error })
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
   */
  async function completeReceipt(receiptId: string, notes?: string): Promise<Receipt> {
    try {
      DebugUtils.info(MODULE_NAME, 'Completing receipt with storage integration', { receiptId })

      const receipt = receipts.value.find(r => r.id === receiptId)
      if (!receipt) {
        throw new Error(`Receipt with id ${receiptId} not found`)
      }

      if (!canCompleteReceipt(receipt)) {
        throw new Error('Receipt cannot be completed')
      }

      const order = supplierStore.state.orders.find(o => o.id === receipt.purchaseOrderId)
      if (!order) {
        throw new Error(`Order not found for receipt ${receiptId}`)
      }

      // 1. Update receipt status
      const updateData: UpdateReceiptData = {
        status: 'completed',
        notes: notes || receipt.notes
      }

      const updatedReceipt = await supplierStore.updateReceipt(receiptId, updateData)

      // 2. Create storage operation (non-blocking)
      try {
        await createStorageOperation(updatedReceipt, order)
      } catch (storageError) {
        DebugUtils.error(MODULE_NAME, 'Storage operation failed, but receipt completed', {
          receiptId,
          error: storageError
        })
        // Don't throw - receipt is still valid
      }

      // 3. Update product prices if needed (non-blocking)
      try {
        await updateProductPrices(updatedReceipt)
      } catch (priceError) {
        DebugUtils.error(MODULE_NAME, 'Price update failed, but receipt completed', {
          receiptId,
          error: priceError
        })
        // Don't throw - receipt is still valid
      }

      DebugUtils.info(MODULE_NAME, 'Receipt completed with full integration', {
        receiptId: updatedReceipt.id,
        receiptNumber: updatedReceipt.receiptNumber,
        storageOperationId: updatedReceipt.storageOperationId
      })

      return updatedReceipt
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to complete receipt', { receiptId, error })
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

      const item = receipt.items.find(i => i.orderItemId === itemId)
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

      const department = getDepartmentFromOrder(order)

      const createData = {
        department,
        responsiblePerson: receipt.receivedBy,
        items: receipt.items.map(item => ({
          itemId: item.itemId,
          quantity: item.receivedQuantity,
          costPerUnit: item.actualPrice || item.orderedPrice,
          notes: `Receipt: ${receipt.receiptNumber}${item.notes ? ` - ${item.notes}` : ''}`,
          expiryDate: calculateExpiryDate(item.itemId)
        })),
        sourceType: 'purchase' as const,
        notes: `Receipt ${receipt.receiptNumber} - Order ${order.orderNumber}${receipt.notes ? ` - ${receipt.notes}` : ''}`
      }

      const operation = await storageStore.createReceipt(createData)

      // Update receipt with operation ID
      receipt.storageOperationId = operation.id

      DebugUtils.info(MODULE_NAME, 'Storage operation created successfully', {
        receiptId: receipt.id,
        operationId: operation.id,
        department,
        itemsCount: createData.items.length
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

      const priceUpdates: Array<{ itemId: string; oldPrice: number; newPrice: number }> = []

      for (const item of receipt.items) {
        // Check if price changed
        if (item.actualPrice && item.actualPrice !== item.orderedPrice) {
          priceUpdates.push({
            itemId: item.itemId,
            oldPrice: item.orderedPrice,
            newPrice: item.actualPrice
          })

          // TODO: Implement when ProductsStore has updateProductCost method
          // await productsStore.updateProductCost(item.itemId, item.actualPrice)

          DebugUtils.info(MODULE_NAME, 'Product price should be updated', {
            itemId: item.itemId,
            itemName: item.itemName,
            oldPrice: item.orderedPrice,
            newPrice: item.actualPrice,
            priceChange: item.actualPrice - item.orderedPrice
          })
        }
      }

      if (priceUpdates.length > 0) {
        DebugUtils.info(MODULE_NAME, 'Price updates processed', {
          receiptId: receipt.id,
          updatesCount: priceUpdates.length,
          updates: priceUpdates
        })
      }
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
      const actualPrice = item.actualPrice || item.orderedPrice
      const priceDiff = actualPrice - item.orderedPrice
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
      if (item.actualPrice && Math.abs(item.actualPrice - item.orderedPrice) > 0.01) {
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
      plannedTotal += item.orderedQuantity * item.orderedPrice
      actualTotal += item.receivedQuantity * (item.actualPrice || item.orderedPrice)
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
    // Order must be sent or confirmed
    if (!['sent', 'confirmed'].includes(order.status)) {
      return false
    }

    // Order must be paid (if paymentStatus exists)
    if (order.paymentStatus && order.paymentStatus !== 'paid') {
      return false
    }

    // No existing active receipt
    const existingReceipt = getReceiptByOrderId(order.id)
    if (existingReceipt && existingReceipt.status !== 'completed') {
      return false
    }

    return true
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
    if (Math.abs(diff) <= 0.001) return 'Exact'
    return diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`
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
    getPriceDiscrepancyText
  }
}
