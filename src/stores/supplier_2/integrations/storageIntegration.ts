// src/stores/supplier_2/integrations/storageIntegration.ts
// ✅ FINAL VERSION: All TypeScript errors fixed

import { DebugUtils } from '@/utils'
import type { Receipt, PurchaseOrder, ReceiptItem, OrderSuggestion } from '../types'
import type { CreateReceiptData, StorageDepartment } from '@/stores/storage/types'

const MODULE_NAME = 'SupplierStorageIntegration'

export class SupplierStorageIntegration {
  private _storageStore: ReturnType<typeof import('@/stores/storage').useStorageStore> | null = null
  private _productsStore: ReturnType<
    typeof import('@/stores/productsStore').useProductsStore
  > | null = null
  private _supplierStore: ReturnType<typeof import('../supplierStore').useSupplierStore> | null =
    null

  private async getStorageStore() {
    if (!this._storageStore) {
      const { useStorageStore } = await import('@/stores/storage')
      this._storageStore = useStorageStore()
    }
    return this._storageStore
  }

  private async getProductsStore() {
    if (!this._productsStore) {
      const { useProductsStore } = await import('@/stores/productsStore')
      this._productsStore = useProductsStore()
    }
    return this._productsStore
  }

  private async getSupplierStore() {
    if (!this._supplierStore) {
      const { useSupplierStore } = await import('../supplierStore')
      this._supplierStore = useSupplierStore()
    }
    return this._supplierStore
  }

  async getSuggestionsFromStock(department?: StorageDepartment): Promise<OrderSuggestion[]> {
    try {
      DebugUtils.info(MODULE_NAME, '🆕 Generating smart suggestions with consumption tracking', {
        department
      })

      const storageStore = await this.getStorageStore()
      const productsStore = await this.getProductsStore()
      const supplierStore = await this.getSupplierStore()

      const balancesWithTransit = storageStore.balancesWithTransit

      if (!balancesWithTransit || balancesWithTransit.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No storage balances available for suggestions')
        return []
      }

      // Get consumption data from database
      const consumptionData = await this.getConsumptionData()

      DebugUtils.debug(MODULE_NAME, 'Consumption data retrieved', {
        productsWithConsumption: consumptionData.size,
        sampleData: Array.from(consumptionData.entries())
          .slice(0, 3)
          .map(([id, consumption]) => ({ id, consumption }))
      })

      const pendingOrderQuantities = await this.calculatePendingOrderQuantities(department)

      DebugUtils.debug(MODULE_NAME, 'Pending order quantities calculated', {
        totalItems: Object.keys(pendingOrderQuantities).length,
        sampleData: Object.fromEntries(Object.entries(pendingOrderQuantities).slice(0, 3))
      })

      const suggestions: OrderSuggestion[] = []

      // Configuration constants
      const SAFETY_STOCK_MULTIPLIER = 1.5 // 150% of min stock
      const REVIEW_PERIOD_DAYS = 7 // Weekly review cycle

      for (const balance of balancesWithTransit) {
        // ✅ Фильтруем через Product.usedInDepartments
        if (department) {
          const product = productsStore.products.find(p => p.id === balance.itemId)
          if (!product || !product.usedInDepartments.includes(department)) {
            continue
          }
        }

        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product || !product.isActive) {
          continue
        }

        const minStock = product.minStock || 0
        const leadTimeDays = product.leadTimeDays || 3 // Default 3 days if not set
        const shelfLife = product.shelfLife
        const pendingQuantity = pendingOrderQuantities[balance.itemId] || 0
        const effectiveStock = balance.totalWithTransit + pendingQuantity

        // Get 7-day average consumption
        const avgDailyConsumption = consumptionData.get(balance.itemId) || 0

        // Calculate reorder point: (avg daily consumption × lead time) + safety stock
        const safetyStock = minStock * SAFETY_STOCK_MULTIPLIER
        const reorderPoint = avgDailyConsumption * leadTimeDays + safetyStock

        // Calculate days until stockout (if consumption > 0)
        const daysUntilStockout =
          avgDailyConsumption > 0 ? effectiveStock / avgDailyConsumption : 999

        // Determine if we need to reorder
        const needsReorder = effectiveStock <= reorderPoint || effectiveStock <= minStock

        if (!needsReorder) {
          continue
        }

        // Calculate suggested quantity: (avg daily × review period) + safety stock - effective stock
        let suggestedQuantity = Math.max(
          avgDailyConsumption * REVIEW_PERIOD_DAYS + safetyStock - effectiveStock,
          minStock
        )

        // Apply shelf life limit for perishable items
        if (shelfLife && shelfLife > 0) {
          const maxQuantityByShelfLife = avgDailyConsumption * shelfLife * 0.7 // 70% of shelf life
          if (maxQuantityByShelfLife > 0 && suggestedQuantity > maxQuantityByShelfLife) {
            suggestedQuantity = maxQuantityByShelfLife
            DebugUtils.debug(MODULE_NAME, 'Applied shelf life limit', {
              itemName: balance.itemName,
              originalSuggestion: suggestedQuantity,
              limitedTo: maxQuantityByShelfLife,
              shelfLife
            })
          }
        }

        // Determine urgency based on days until stockout vs lead time
        let urgency: 'high' | 'medium' | 'low' = 'low'
        let reason = 'below_minimum'

        if (effectiveStock <= 0) {
          urgency = 'high'
          reason = 'out_of_stock'
        } else if (avgDailyConsumption > 0 && daysUntilStockout < leadTimeDays) {
          urgency = 'high'
          reason = 'will_stockout_before_delivery'
        } else if (avgDailyConsumption > 0 && daysUntilStockout < leadTimeDays + 3) {
          urgency = 'medium'
          reason = 'approaching_stockout'
        } else if (effectiveStock <= minStock * 0.5) {
          urgency = 'medium'
          reason = 'critically_low'
        }

        DebugUtils.debug(MODULE_NAME, '📊 Smart recommendation calculated', {
          itemName: balance.itemName,
          currentStock: balance.totalQuantity,
          effectiveStock,
          avgDailyConsumption,
          leadTimeDays,
          daysUntilStockout: daysUntilStockout.toFixed(1),
          reorderPoint: reorderPoint.toFixed(2),
          suggestedQuantity: suggestedQuantity.toFixed(2),
          urgency,
          reason
        })

        // Get pricing information from product
        const estimatedBaseCost = product.baseCostPerUnit || product.lastKnownCost || 0
        const recommendedPackage = product.packageOptions?.find(
          pkg => pkg.id === product.recommendedPackageId
        )

        suggestions.push({
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentStock: balance.totalQuantity,
          transitStock: balance.transitQuantity,
          pendingOrderStock: pendingQuantity,
          effectiveStock: effectiveStock,
          nearestDelivery: balance.nearestDelivery,
          minStock,
          suggestedQuantity: Math.round(suggestedQuantity * 100) / 100, // Round to 2 decimals
          urgency,
          reason,
          // ✅ Pricing and package information
          estimatedBaseCost,
          recommendedPackageId: recommendedPackage?.id,
          recommendedPackageName: recommendedPackage?.packageName,
          recommendedPackageQuantity: recommendedPackage
            ? Math.ceil(suggestedQuantity / recommendedPackage.packageSize)
            : undefined,
          estimatedPackagePrice: recommendedPackage?.packagePrice
        })
      }

      // Sort by urgency and then by days until stockout
      suggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 }
        const aUrgency = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 0
        const bUrgency = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 0

        if (aUrgency !== bUrgency) {
          return bUrgency - aUrgency
        }

        return (a.effectiveStock || 0) - (b.effectiveStock || 0)
      })

      DebugUtils.info(MODULE_NAME, '✅ Smart suggestions generated successfully', {
        department,
        totalSuggestions: suggestions.length,
        highUrgency: suggestions.filter(s => s.urgency === 'high').length,
        mediumUrgency: suggestions.filter(s => s.urgency === 'medium').length,
        lowUrgency: suggestions.filter(s => s.urgency === 'low').length,
        withConsumptionData: suggestions.filter(s => consumptionData.has(s.itemId)).length,
        totalPendingItems: Object.keys(pendingOrderQuantities).length
      })

      return suggestions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate suggestions from storage', {
        error,
        department
      })
      return []
    }
  }

  /**
   * Get 7-day average consumption data for all products from database
   */
  private async getConsumptionData(): Promise<Map<string, number>> {
    try {
      const consumptionMap = new Map<string, number>()

      // Call Supabase RPC function to get consumption stats
      const { supabase } = await import('@/supabase')
      const { data, error } = await supabase.rpc('get_products_consumption_stats', {
        days_back: 7
      })

      if (error) {
        DebugUtils.warn(MODULE_NAME, 'Failed to fetch consumption data from database', { error })
        return consumptionMap
      }

      if (data && Array.isArray(data)) {
        for (const row of data) {
          consumptionMap.set(row.product_id, row.avg_daily_consumption || 0)
        }

        DebugUtils.debug(MODULE_NAME, 'Consumption data loaded from database', {
          productsCount: consumptionMap.size
        })
      }

      return consumptionMap
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading consumption data', { error })
      return new Map()
    }
  }

  private async calculatePendingOrderQuantities(
    department?: StorageDepartment
  ): Promise<Record<string, number>> {
    try {
      const supplierStore = await this.getSupplierStore()
      const pendingQuantities: Record<string, number> = {}

      const submittedRequests = supplierStore.state.requests.filter(
        req => req.status === 'submitted'
      )

      const pendingOrders = supplierStore.state.orders.filter(order =>
        ['draft', 'sent'].includes(order.status)
      )

      DebugUtils.debug(MODULE_NAME, 'Found pending items in requests and orders', {
        submittedRequests: submittedRequests.length,
        draftOrders: pendingOrders.filter(o => o.status === 'draft').length,
        sentOrders: pendingOrders.filter(o => o.status === 'sent').length
      })

      for (const request of submittedRequests) {
        if (department && request.department !== department) {
          continue
        }

        for (const item of request.items) {
          if (!pendingQuantities[item.itemId]) {
            pendingQuantities[item.itemId] = 0
          }
          pendingQuantities[item.itemId] += item.requestedQuantity
        }
      }

      for (const order of pendingOrders) {
        if (department && !this.isOrderForDepartment(order, department)) {
          continue
        }

        if (order.status === 'sent') {
          const hasTransitBatches = await this.orderHasTransitBatches(order.id)
          if (hasTransitBatches) {
            DebugUtils.debug(MODULE_NAME, 'Order has transit batches, skipping', {
              orderId: order.id
            })
            continue
          }
        }

        for (const item of order.items) {
          if (!pendingQuantities[item.itemId]) {
            pendingQuantities[item.itemId] = 0
          }
          // ✅ FIX 2: Use only orderedQuantity (quantity doesn't exist on OrderItem)
          const quantity = item.orderedQuantity || 0
          pendingQuantities[item.itemId] += quantity
        }
      }

      return pendingQuantities
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate pending order quantities', {
        error,
        department
      })
      return {}
    }
  }

  private isOrderForDepartment(
    order: PurchaseOrder,
    department: StorageDepartment | 'all'
  ): boolean {
    const hasBeverages = order.items.some(item => this.isBeverageProduct(item.itemId, ''))
    const orderDepartment = hasBeverages ? 'bar' : 'kitchen'
    return department === 'all' || orderDepartment === department
  }

  private async orderHasTransitBatches(orderId: string): Promise<boolean> {
    try {
      const storageStore = await this.getStorageStore()
      // ✅ FIX 3: Removed .value (transitBatches is already computed)
      const transitBatches = storageStore.transitBatches
      return transitBatches.some(batch => batch.purchaseOrderId === orderId)
    } catch (error) {
      DebugUtils.debug(MODULE_NAME, 'Could not check transit batches for order', { orderId, error })
      return false
    }
  }

  async createReceiptOperation(receipt: Receipt, order: PurchaseOrder): Promise<string> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating storage operation from receipt', {
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        orderId: order.id,
        orderNumber: order.orderNumber
      })

      const department = this.getDepartmentFromOrder(order)
      const storageStore = await this.getStorageStore()

      // ✅ FIX: Check if active batches already exist for this order (from transit conversion)
      // If they do, skip creating new batches to avoid duplicates
      const existingBatches = storageStore.state.activeBatches.filter(
        b => b.purchaseOrderId === order.id
      )

      if (existingBatches.length > 0) {
        DebugUtils.info(MODULE_NAME, '✅ Active batches already exist (from transit conversion)', {
          orderId: order.id,
          batchCount: existingBatches.length
        })

        // ✅ FIX: Trigger auto-reconciliation for negative batches
        // Even though batches were created via transit conversion,
        // we still need to reconcile any negative batches for these products
        const { reconciliationService } = await import('@/stores/storage/reconciliationService')

        for (const batch of existingBatches) {
          if (batch.itemType === 'product') {
            DebugUtils.info(MODULE_NAME, 'Triggering reconciliation for product', {
              productId: batch.itemId,
              batchNumber: batch.batchNumber
            })
            await reconciliationService.autoReconcileOnNewBatch(batch.itemId)
          }
        }

        // Return first batch ID as operation reference (for compatibility)
        const operationId = existingBatches[0].id

        DebugUtils.info(MODULE_NAME, 'Storage operation skipped (batches from transit)', {
          operationId,
          receiptId: receipt.id,
          itemsCount: receipt.items.length
        })

        return operationId
      }

      // ✅ No transit batches found - create new batches via receipt
      DebugUtils.info(MODULE_NAME, 'No transit batches found - creating new active batches', {
        orderId: order.id
      })

      const storageData: CreateReceiptData = {
        warehouseId: 'warehouse-winter', // Default warehouse (TODO: make configurable)
        department,
        responsiblePerson: receipt.receivedBy,
        sourceType: 'purchase',
        supplierId: order.supplierId,
        purchaseOrderId: order.id,
        items: await this.prepareStorageItems(receipt.items, order),
        notes: this.buildStorageNotes(receipt, order)
      }

      const operation = await storageStore.createReceipt(storageData)
      const operationId = operation.id

      this.invalidateCache()

      DebugUtils.info(MODULE_NAME, 'Storage operation created successfully', {
        operationId,
        receiptId: receipt.id,
        itemsCount: storageData.items.length
      })

      return operationId
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create storage operation', {
        receiptId: receipt.id,
        error
      })
      throw new Error(`Failed to create storage operation: ${error}`)
    }
  }

  /**
   * @deprecated This method is no longer needed for Quick Receipt workflow as price updates
   * are now handled by the create_quick_receipt_complete RPC function for better performance.
   * Kept for backward compatibility with manual receipt workflows and other receipt types.
   *
   * Performance comparison:
   * - Old approach (this method): Sequential updates (N+1 pattern)
   *   - 10 items = 20 DB calls = 7-10 seconds
   * - New approach (RPC): Batch updates in single transaction
   *   - All items = 2 batch UPDATEs = ~200-500ms (35-50x faster)
   *
   * Migration: 086_extend_quick_receipt_with_prices.sql
   * Reference: create_quick_receipt_complete RPC function
   */
  async updateProductPrices(receipt: Receipt): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating product prices from receipt', {
        receiptId: receipt.id,
        itemsCount: receipt.items.length
      })

      const productsStore = await this.getProductsStore()

      for (const item of receipt.items) {
        // ✅ ALWAYS update prices on receipt completion (not just when different)
        // This ensures lastKnownCost and package prices stay in sync with actual receipts
        if (item.actualPrice && item.actualPrice > 0) {
          try {
            await this.updateSingleProductPrice(item, productsStore)
          } catch (error) {
            DebugUtils.warn(MODULE_NAME, 'Failed to update single product price', {
              itemId: item.itemId,
              error
            })
          }
        }
      }

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Product prices updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product prices', { error })
      throw error
    }
  }

  async getLatestPrices(itemIds: string[]): Promise<Record<string, number>> {
    try {
      const storageStore = await this.getStorageStore()
      const prices: Record<string, number> = {}

      for (const itemId of itemIds) {
        try {
          // ✅ Теперь один баланс на продукт
          const balance = storageStore.state.balances.find(b => b.itemId === itemId)

          if (balance && balance.latestCost) {
            prices[itemId] = balance.latestCost
          }
        } catch (error) {
          DebugUtils.debug(MODULE_NAME, 'Could not get price for item', { itemId, error })
        }
      }

      return prices
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get latest prices', { error })
      return {}
    }
  }

  invalidateCache(): void {
    DebugUtils.debug(MODULE_NAME, 'Suggestions cache invalidated')
  }

  private getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    const hasBeverages = order.items.some(item => this.isBeverageProduct(item.itemId, ''))
    return hasBeverages ? 'bar' : 'kitchen'
  }

  private isBeverageProduct(itemId: string, category?: string): boolean {
    if (category === 'beverages' || category === 'drinks') {
      return true
    }

    return (
      itemId.includes('beer') ||
      itemId.includes('cola') ||
      itemId.includes('water') ||
      itemId.includes('wine') ||
      itemId.includes('spirit') ||
      itemId.includes('juice')
    )
  }

  private async prepareStorageItems(receiptItems: ReceiptItem[], order: PurchaseOrder) {
    const storageItems = []

    for (const receiptItem of receiptItems) {
      const orderItem = order.items.find(oi => oi.id === receiptItem.orderItemId)
      if (!orderItem) continue

      // ✅ КРИТИЧНО: Используем BaseCost (цена за единицу), не Price (цена за упаковку)
      // receivedQuantity в базовых единицах, costPerUnit должен быть за единицу
      const actualBaseCost = receiptItem.actualBaseCost || receiptItem.orderedBaseCost
      const expiryDate = await this.calculateExpiryDate(receiptItem.itemId)

      storageItems.push({
        itemId: receiptItem.itemId,
        itemName: receiptItem.itemName,
        itemType: 'product' as const,
        quantity: receiptItem.receivedQuantity,
        unit: receiptItem.unit,
        costPerUnit: actualBaseCost,
        totalCost: receiptItem.receivedQuantity * actualBaseCost,
        notes: this.buildItemNotes(receiptItem, orderItem),
        expiryDate
      })
    }

    return storageItems
  }

  private async updateSingleProductPrice(item: ReceiptItem, productsStore: any): Promise<void> {
    // ✅ КРИТИЧНО: Используем actualBaseCost (цена за единицу)
    // actualPrice = цена за упаковку, actualBaseCost = цена за базовую единицу
    if (!item.actualBaseCost) return

    try {
      const { supabase } = await import('@/supabase')

      const pricePerUnit = item.actualBaseCost

      // Get current product to check if baseCostPerUnit needs updating
      const product = productsStore.getProductById(item.itemId)
      const shouldUpdateBaseCost = product && product.baseCostPerUnit !== pricePerUnit

      // ✅ Update product.lastKnownCost (and baseCostPerUnit if different) in database
      const productUpdateData: { last_known_cost: number; base_cost_per_unit?: number } = {
        last_known_cost: pricePerUnit
      }
      if (shouldUpdateBaseCost) {
        productUpdateData.base_cost_per_unit = pricePerUnit
      }

      const { error: productError } = await supabase
        .from('products')
        .update(productUpdateData)
        .eq('id', item.itemId)

      if (productError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update product prices', {
          itemId: item.itemId,
          error: productError
        })
      }

      // Get package to calculate package_price
      const pkg = productsStore.getPackageById(item.packageId)
      const packagePrice = pkg ? pricePerUnit * pkg.packageSize : null

      // ✅ Update package_options (base_cost_per_unit AND package_price) in database
      const updateData: { base_cost_per_unit: number; package_price?: number } = {
        base_cost_per_unit: pricePerUnit
      }
      if (packagePrice !== null) {
        updateData.package_price = packagePrice
      }

      const { error: packageError } = await supabase
        .from('package_options')
        .update(updateData)
        .eq('id', item.packageId)

      if (packageError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update package prices', {
          packageId: item.packageId,
          error: packageError
        })
      }

      // ✅ Update in-memory state
      const productIndex = productsStore.products.findIndex(
        (p: { id: string }) => p.id === item.itemId
      )
      if (productIndex !== -1) {
        productsStore.products[productIndex].lastKnownCost = pricePerUnit
        // Also update baseCostPerUnit if it was updated in DB
        if (shouldUpdateBaseCost) {
          productsStore.products[productIndex].baseCostPerUnit = pricePerUnit
        }

        // Update package in memory
        const pkgIndex = productsStore.products[productIndex].packageOptions.findIndex(
          (p: { id: string }) => p.id === item.packageId
        )
        if (pkgIndex !== -1) {
          productsStore.products[productIndex].packageOptions[pkgIndex].baseCostPerUnit =
            pricePerUnit
          if (packagePrice !== null) {
            productsStore.products[productIndex].packageOptions[pkgIndex].packagePrice =
              packagePrice
          }
        }
      }

      DebugUtils.debug(MODULE_NAME, 'Product price updated from receipt', {
        itemId: item.itemId,
        itemName: item.itemName,
        packageId: item.packageId,
        pricePerUnit,
        packagePrice,
        baseCostUpdated: shouldUpdateBaseCost,
        orderedPrice: item.orderedPrice
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product cost', {
        itemId: item.itemId,
        error
      })
    }
  }

  private async calculateExpiryDate(itemId: string): Promise<string | undefined> {
    try {
      const productsStore = await this.getProductsStore()
      if (!productsStore?.products) return undefined

      const product = productsStore.products.find((p: { id: string }) => p.id === itemId)
      const shelfLife = (product as { shelfLife?: number })?.shelfLife

      if (!shelfLife) return undefined

      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + shelfLife)
      return expiryDate.toISOString()
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Could not calculate expiry date', { itemId, error })
      return undefined
    }
  }

  private buildStorageNotes(receipt: Receipt, order: PurchaseOrder): string {
    const parts = [
      `Receipt: ${receipt.receiptNumber}`,
      `From PO: ${order.orderNumber}`,
      `Supplier: ${order.supplierName}`,
      `Received by: ${receipt.receivedBy}`
    ]

    if (receipt.notes) {
      parts.push(`Notes: ${receipt.notes}`)
    }

    return parts.join(' | ')
  }

  private buildItemNotes(
    receiptItem: ReceiptItem,
    orderItem: { unit: string }
  ): string | undefined {
    const notes = []

    if (receiptItem.notes) {
      notes.push(receiptItem.notes)
    }

    const qtyDiff = receiptItem.receivedQuantity - receiptItem.orderedQuantity
    if (Math.abs(qtyDiff) > 0.001) {
      const sign = qtyDiff > 0 ? '+' : ''
      notes.push(`Qty diff: ${sign}${qtyDiff.toFixed(3)}`)
    }

    // ✅ FIXED: Use BaseCost (per unit), not Price (per package)
    const actualBaseCost = receiptItem.actualBaseCost || receiptItem.orderedBaseCost
    const priceDiff = actualBaseCost - receiptItem.orderedBaseCost
    if (Math.abs(priceDiff) > 0.01) {
      const sign = priceDiff > 0 ? '+' : ''
      notes.push(`Price diff: ${sign}${priceDiff.toFixed(2)}/unit`)
    }

    return notes.length > 0 ? notes.join(' | ') : undefined
  }
}

let integrationInstance: SupplierStorageIntegration | null = null

export function useSupplierStorageIntegration() {
  if (!integrationInstance) {
    integrationInstance = new SupplierStorageIntegration()
  }

  return {
    createReceiptOperation: (receipt: Receipt, order: PurchaseOrder) =>
      integrationInstance!.createReceiptOperation(receipt, order),

    updateProductPrices: (receipt: Receipt) => integrationInstance!.updateProductPrices(receipt),

    getSuggestionsFromStock: (department?: StorageDepartment) =>
      integrationInstance!.getSuggestionsFromStock(department),

    getLatestPrices: (itemIds: string[]) => integrationInstance!.getLatestPrices(itemIds),

    invalidateCache: () => integrationInstance!.invalidateCache()
  }
}
