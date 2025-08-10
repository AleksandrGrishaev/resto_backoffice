// src/stores/supplier_2/composables/useReceipts.ts

import { ref, computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import type {
  Receipt,
  PurchaseOrder,
  CreateReceiptData,
  UpdateReceiptData,
  ReceiptFilters,
  DiscrepancySummary
} from '../types'

export function useReceipts() {
  const supplierStore = useSupplierStore()

  // =============================================
  // STATE
  // =============================================

  const filters = ref<ReceiptFilters>({
    status: 'all',
    hasDiscrepancies: 'all'
  })

  // =============================================
  // COMPUTED
  // =============================================

  // ИСПРАВЛЕНИЕ: Добавляем защиту от undefined
  const receipts = computed(() => supplierStore.state.receipts || [])
  const currentReceipt = computed(() => supplierStore.state.currentReceipt)
  const isLoading = computed(() => supplierStore.state.loading.receipts)

  const filteredReceipts = computed(() => {
    // ИСПРАВЛЕНИЕ: Проверяем, что receipts.value существует
    if (!receipts.value || !Array.isArray(receipts.value)) {
      return []
    }

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

  // ИСПРАВЛЕНИЕ: Проверяем существование computed свойств store
  const draftReceipts = computed(() => supplierStore.draftReceipts || [])
  const completedReceipts = computed(() =>
    receipts.value.filter(receipt => receipt.status === 'completed')
  )
  const receiptsWithDiscrepancies = computed(() =>
    receipts.value.filter(receipt => receipt.hasDiscrepancies)
  )

  const ordersForReceipt = computed(() => supplierStore.ordersForReceipt || [])

  const receiptStatistics = computed(() => ({
    total: receipts.value.length,
    draft: draftReceipts.value.length,
    completed: completedReceipts.value.length,
    withDiscrepancies: receiptsWithDiscrepancies.value.length,
    ordersAwaitingReceipt: ordersForReceipt.value.length
  }))

  // =============================================
  // ACTIONS - CRUD Operations
  // =============================================

  /**
   * Fetch all receipts
   */
  async function fetchReceipts() {
    try {
      console.log('Receipts: Fetching receipts')

      // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
      if (typeof supplierStore.fetchReceipts === 'function') {
        await supplierStore.fetchReceipts()
        console.log(`Receipts: Fetched ${receipts.value.length} receipts`)
      } else {
        console.error('Receipts: fetchReceipts method not available in store')
      }
    } catch (error) {
      console.error('Receipts: Error fetching receipts:', error)
      throw error
    }
  }

  /**
   * Start receipt process for an order
   */
  async function startReceipt(purchaseOrderId: string, receivedBy: string): Promise<Receipt> {
    // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
    const order =
      typeof supplierStore.getOrderById === 'function'
        ? supplierStore.getOrderById(purchaseOrderId)
        : undefined

    if (!order) {
      throw new Error(`Order with id ${purchaseOrderId} not found`)
    }

    if (!canStartReceipt(order)) {
      throw new Error('Order is not ready for receipt')
    }

    try {
      console.log(`Receipts: Starting receipt for order ${order.orderNumber}`)

      // Create initial receipt data with ordered quantities
      const receiptData: CreateReceiptData = {
        purchaseOrderId,
        receivedBy,
        items: order.items.map(item => ({
          orderItemId: item.id,
          receivedQuantity: item.orderedQuantity, // Start with ordered quantity
          notes: ''
        })),
        notes: `Receipt started for order ${order.orderNumber}`
      }

      // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
      if (typeof supplierStore.createReceipt === 'function') {
        const newReceipt = await supplierStore.createReceipt(receiptData)
        console.log(`Receipts: Started receipt ${newReceipt.receiptNumber}`)
        return newReceipt
      } else {
        throw new Error('createReceipt method not available in store')
      }
    } catch (error) {
      console.error('Receipts: Error starting receipt:', error)
      throw error
    }
  }

  /**
   * Update receipt (modify quantities, prices, notes)
   */
  async function updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    try {
      console.log(`Receipts: Updating receipt ${id}`, data)

      // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
      if (typeof supplierStore.updateReceipt === 'function') {
        const updatedReceipt = await supplierStore.updateReceipt(id, data)
        console.log(`Receipts: Updated receipt ${id}`)
        return updatedReceipt
      } else {
        throw new Error('updateReceipt method not available in store')
      }
    } catch (error) {
      console.error('Receipts: Error updating receipt:', error)
      throw error
    }
  }

  /**
   * Complete receipt and create storage operation
   */
  async function completeReceipt(id: string): Promise<Receipt> {
    // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
    const receipt =
      typeof supplierStore.getReceiptById === 'function'
        ? supplierStore.getReceiptById(id)
        : undefined

    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
    }

    if (receipt.status === 'completed') {
      throw new Error('Receipt is already completed')
    }

    try {
      console.log(`Receipts: Completing receipt ${receipt.receiptNumber}`)

      // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
      if (typeof supplierStore.completeReceipt === 'function') {
        const completedReceipt = await supplierStore.completeReceipt(id)

        // Auto-create storage operation (this would integrate with StorageStore)
        await createStorageOperation(completedReceipt)

        console.log(`Receipts: Completed receipt ${receipt.receiptNumber}`)
        return completedReceipt
      } else {
        throw new Error('completeReceipt method not available in store')
      }
    } catch (error) {
      console.error('Receipts: Error completing receipt:', error)
      throw error
    }
  }

  /**
   * Update item in receipt
   */
  async function updateReceiptItem(
    receiptId: string,
    itemId: string,
    receivedQuantity: number,
    actualPrice?: number,
    notes?: string
  ) {
    // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
    const receipt =
      typeof supplierStore.getReceiptById === 'function'
        ? supplierStore.getReceiptById(receiptId)
        : undefined

    if (!receipt) {
      throw new Error(`Receipt with id ${receiptId} not found`)
    }

    if (receipt.status === 'completed') {
      throw new Error('Cannot modify completed receipt')
    }

    try {
      console.log(`Receipts: Updating item ${itemId} in receipt ${receiptId}`)

      // Update the item in receipt
      const item = receipt.items.find(item => item.id === itemId)
      if (item) {
        item.receivedQuantity = receivedQuantity
        if (actualPrice !== undefined) {
          item.actualPrice = actualPrice
        }
        if (notes !== undefined) {
          item.notes = notes
        }

        // Recalculate discrepancies
        receipt.hasDiscrepancies = calculateHasDiscrepancies(receipt)
        receipt.updatedAt = new Date().toISOString()
      }

      console.log(`Receipts: Updated item ${itemId} in receipt ${receiptId}`)
    } catch (error) {
      console.error('Receipts: Error updating receipt item:', error)
      throw error
    }
  }

  // =============================================
  // ACTIONS - StorageStore Integration
  // =============================================

  /**
   * Create storage operation from completed receipt
   */
  async function createStorageOperation(receipt: Receipt) {
    try {
      console.log(`Receipts: Creating storage operation for receipt ${receipt.receiptNumber}`)

      // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
      const order =
        typeof supplierStore.getOrderById === 'function'
          ? supplierStore.getOrderById(receipt.purchaseOrderId)
          : undefined

      if (!order) {
        throw new Error('Related order not found')
      }

      // This would be the actual integration with StorageStore
      // const createData: CreateStorageReceipt = {
      //   department: getDepartmentFromOrder(order),
      //   responsiblePerson: receipt.receivedBy,
      //   items: receipt.items.map(item => ({
      //     itemId: item.itemId,
      //     quantity: item.receivedQuantity,
      //     costPerUnit: item.actualPrice || item.orderedPrice,
      //     notes: `Receipt: ${receipt.receiptNumber}`
      //   })),
      //   sourceType: 'purchase',
      //   purchaseOrderId: order.id
      // }
      //
      // const storageOperation = await storageStore.createReceipt(createData)
      // receipt.storageOperationId = storageOperation.id

      // For now, simulate storage operation creation
      const mockStorageOperationId = `op-${Date.now()}`
      receipt.storageOperationId = mockStorageOperationId

      console.log(`Receipts: Created storage operation ${mockStorageOperationId}`)
    } catch (error) {
      console.error('Receipts: Error creating storage operation:', error)
      throw error
    }
  }

  // =============================================
  // ACTIONS - Analysis & Calculations
  // =============================================

  /**
   * Calculate discrepancies for receipt
   */
  function calculateDiscrepancies(receipt: Receipt): DiscrepancySummary {
    let hasQuantityDiscrepancies = false
    let hasPriceDiscrepancies = false
    let totalQuantityDifference = 0
    let totalPriceDifference = 0
    let affectedItems = 0

    receipt.items.forEach(item => {
      // Quantity discrepancy
      const quantityDiff = item.receivedQuantity - item.orderedQuantity
      if (Math.abs(quantityDiff) > 0.01) {
        hasQuantityDiscrepancies = true
        totalQuantityDifference += Math.abs(quantityDiff)
        affectedItems++
      }

      // Price discrepancy
      if (item.actualPrice && Math.abs(item.actualPrice - item.orderedPrice) > 0.01) {
        hasPriceDiscrepancies = true
        totalPriceDifference +=
          Math.abs(item.actualPrice - item.orderedPrice) * item.receivedQuantity
        if (Math.abs(quantityDiff) <= 0.01) {
          affectedItems++ // Only count if not already counted for quantity
        }
      }
    })

    return {
      hasQuantityDiscrepancies,
      hasPriceDiscrepancies,
      totalQuantityDifference,
      totalPriceDifference,
      affectedItems
    }
  }

  /**
   * Calculate if receipt has discrepancies (simple boolean)
   */
  function calculateHasDiscrepancies(receipt: Receipt): boolean {
    return receipt.items.some(item => {
      // Quantity discrepancy
      if (Math.abs(item.receivedQuantity - item.orderedQuantity) > 0.01) {
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
  function calculateFinancialImpact(receipt: Receipt) {
    // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
    const order =
      typeof supplierStore.getOrderById === 'function'
        ? supplierStore.getOrderById(receipt.purchaseOrderId)
        : undefined

    if (!order) return null

    const originalTotal = order.totalAmount
    const actualTotal = receipt.items.reduce(
      (sum, item) => sum + item.receivedQuantity * (item.actualPrice || item.orderedPrice),
      0
    )

    const difference = actualTotal - originalTotal
    const percentageChange = originalTotal > 0 ? (difference / originalTotal) * 100 : 0

    return {
      originalTotal,
      actualTotal,
      difference,
      percentageChange,
      isIncrease: difference > 0
    }
  }

  // =============================================
  // ACTIONS - Filtering & Selection
  // =============================================

  /**
   * Set current receipt
   */
  function setCurrentReceipt(receipt: Receipt | undefined) {
    // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
    if (typeof supplierStore.setCurrentReceipt === 'function') {
      supplierStore.setCurrentReceipt(receipt)
    }
  }

  /**
   * Update filters
   */
  function updateFilters(newFilters: Partial<ReceiptFilters>) {
    filters.value = { ...filters.value, ...newFilters }
    console.log('Receipts: Updated filters', filters.value)
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    filters.value = {
      status: 'all',
      hasDiscrepancies: 'all'
    }
    console.log('Receipts: Cleared all filters')
  }

  // =============================================
  // HELPER FUNCTIONS
  // =============================================

  /**
   * Get receipt by ID
   */
  function getReceiptById(id: string): Receipt | undefined {
    // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
    if (typeof supplierStore.getReceiptById === 'function') {
      return supplierStore.getReceiptById(id)
    }
    return receipts.value.find(receipt => receipt.id === id)
  }

  /**
   * Get receipts by status
   */
  function getReceiptsByStatus(status: Receipt['status']): Receipt[] {
    // ИСПРАВЛЕНИЕ: Проверяем, что метод существует
    if (typeof supplierStore.getReceiptsByStatus === 'function') {
      return supplierStore.getReceiptsByStatus(status)
    }
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
    // Order must be sent or confirmed, and paid
    if (!['sent', 'confirmed'].includes(order.status)) {
      return false
    }

    if (order.paymentStatus !== 'paid') {
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
   * Check if receipt can be completed
   */
  function canCompleteReceipt(receipt: Receipt): boolean {
    return receipt.status === 'draft' && receipt.items.length > 0
  }

  /**
   * Get department from order (helper for storage integration)
   */
  function getDepartmentFromOrder(order: PurchaseOrder): 'kitchen' | 'bar' {
    // In real app, this would check the related requests
    // For now, simple logic based on items
    const hasAlcohol = order.items.some(
      item =>
        item.itemName.toLowerCase().includes('beer') || item.itemName.toLowerCase().includes('wine')
    )
    return hasAlcohol ? 'bar' : 'kitchen'
  }

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
   * Format currency
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date
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
   * Get quantity discrepancy text
   */
  function getQuantityDiscrepancyText(ordered: number, received: number): string {
    const diff = received - ordered
    if (Math.abs(diff) <= 0.01) return 'Exact'
    return diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`
  }

  /**
   * Get price discrepancy text
   */
  function getPriceDiscrepancyText(ordered: number, actual?: number): string {
    if (!actual) return 'Same'
    const diff = actual - ordered
    if (Math.abs(diff) <= 0.01) return 'Same'
    return diff > 0 ? `+${formatCurrency(diff)}` : `${formatCurrency(diff)}`
  }

  // =============================================
  // INITIALIZATION
  // =============================================

  // ИСПРАВЛЕНИЕ: Безопасная проверка перед автозагрузкой
  const shouldAutoLoad = !receipts.value || receipts.value.length === 0

  if (shouldAutoLoad && typeof supplierStore.fetchReceipts === 'function') {
    // Делаем автозагрузку асинхронно, чтобы не блокировать инициализацию
    setTimeout(() => {
      fetchReceipts().catch(error => {
        console.error('Receipts: Failed to auto-fetch receipts:', error)
      })
    }, 100)
  } else if (shouldAutoLoad) {
    console.warn('Receipts: fetchReceipts method not available, skipping auto-fetch')
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // State
    filters,

    // Computed
    receipts,
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

    // StorageStore Integration
    createStorageOperation,

    // Analysis & Calculations
    calculateDiscrepancies,
    calculateHasDiscrepancies,
    calculateFinancialImpact,

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
    canCompleteReceipt,
    getDepartmentFromOrder,
    getStatusColor,
    getDiscrepancyColor,
    formatCurrency,
    formatDate,
    getQuantityDiscrepancyText,
    getPriceDiscrepancyText
  }
}
