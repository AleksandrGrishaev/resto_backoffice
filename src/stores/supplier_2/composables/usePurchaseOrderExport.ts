/**
 * Purchase Order Export Composable
 * Builds export data from PurchaseOrder and handles PDF generation
 */

import { ref } from 'vue'
import { useExport } from '@/core/export'
import type { PurchaseOrderExportData, PurchaseOrderItemExport } from '@/core/export'
import type { PurchaseOrder } from '../types'
import { useProductsStore } from '@/stores/productsStore'
import { useCounteragentsStore } from '@/stores/counteragents'

export interface PrintOrderOptions {
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  includePrices?: boolean // true = show prices, false = show only quantities
}

export function usePurchaseOrderExport() {
  const { exportPurchaseOrder, isExporting, exportError } = useExport()
  const productsStore = useProductsStore()
  const counteragentsStore = useCounteragentsStore()

  const isPrinting = ref(false)
  const showOptionsDialog = ref(false)
  const pendingOrder = ref<PurchaseOrder | null>(null)

  /**
   * Build export data from PurchaseOrder
   */
  function buildExportData(
    order: PurchaseOrder,
    options?: PrintOrderOptions
  ): PurchaseOrderExportData {
    // Get supplier details from counteragents store (direct access, not .state)
    const supplier = counteragentsStore.counteragents?.find(c => c.id === order.supplierId)

    const includePrices = options?.includePrices !== false // default to true

    // Build items - use data directly from order, don't recalculate
    const items: PurchaseOrderItemExport[] = order.items.map((item, index) => {
      // Get product for code
      const product = productsStore.products.find(p => p.id === item.itemId)

      return {
        index: index + 1,
        itemName: item.itemName,
        itemCode: product?.code || undefined,
        packageName: item.packageName || 'Unit',
        packageQuantity: item.packageQuantity || 1,
        packageUnit: item.packageUnit || item.unit,
        baseQuantity: item.orderedQuantity,
        baseUnit: item.unit,
        // Use prices directly from order data
        pricePerPackage: includePrices ? item.packagePrice : 0,
        totalPrice: includePrices ? item.totalPrice : 0
      }
    })

    // Calculate totals
    const totals = {
      subtotal: includePrices ? order.totalAmount : 0,
      itemCount: order.items.length,
      packageCount: items.reduce((sum, item) => sum + item.packageQuantity, 0)
    }

    return {
      title: includePrices ? 'Purchase Order' : 'Purchase Order (Quantities Only)',
      orderNumber: order.orderNumber,
      date: order.orderDate,
      generatedAt: new Date().toISOString(),
      supplier: {
        id: order.supplierId,
        name: order.supplierName,
        address: supplier?.address,
        phone: supplier?.phone,
        email: supplier?.email
      },
      company: options?.companyName
        ? {
            name: options.companyName,
            address: options.companyAddress,
            phone: options.companyPhone
          }
        : undefined,
      expectedDeliveryDate: order.expectedDeliveryDate,
      items,
      totals,
      notes: order.notes,
      status: order.status,
      includePrices // Pass this to template for conditional rendering
    } as PurchaseOrderExportData
  }

  /**
   * Open print options dialog
   */
  function openPrintDialog(order: PurchaseOrder): void {
    pendingOrder.value = order
    showOptionsDialog.value = true
  }

  /**
   * Close print options dialog
   */
  function closePrintDialog(): void {
    showOptionsDialog.value = false
    pendingOrder.value = null
  }

  /**
   * Export single purchase order to PDF
   */
  async function printOrder(order: PurchaseOrder, options?: PrintOrderOptions): Promise<void> {
    isPrinting.value = true

    try {
      const exportData = buildExportData(order, options)
      await exportPurchaseOrder(exportData)
    } finally {
      isPrinting.value = false
    }
  }

  /**
   * Print from dialog with selected options
   */
  async function printFromDialog(options: PrintOrderOptions): Promise<void> {
    if (!pendingOrder.value) return

    await printOrder(pendingOrder.value, options)
    closePrintDialog()
  }

  /**
   * Export multiple purchase orders to PDF (one file each)
   */
  async function printOrders(orders: PurchaseOrder[], options?: PrintOrderOptions): Promise<void> {
    isPrinting.value = true

    try {
      for (const order of orders) {
        const exportData = buildExportData(order, options)
        await exportPurchaseOrder(exportData)
        // Small delay between exports
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } finally {
      isPrinting.value = false
    }
  }

  return {
    // State
    isPrinting,
    isExporting,
    exportError,
    showOptionsDialog,
    pendingOrder,
    // Methods
    buildExportData,
    openPrintDialog,
    closePrintDialog,
    printOrder,
    printFromDialog,
    printOrders
  }
}
