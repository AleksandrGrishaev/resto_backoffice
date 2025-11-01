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
      DebugUtils.info(MODULE_NAME, 'Generating suggestions from storage with all order statuses', {
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

      const pendingOrderQuantities = await this.calculatePendingOrderQuantities(department)

      DebugUtils.debug(MODULE_NAME, 'Pending order quantities calculated', {
        totalItems: Object.keys(pendingOrderQuantities).length,
        sampleData: Object.fromEntries(Object.entries(pendingOrderQuantities).slice(0, 3))
      })

      const suggestions: OrderSuggestion[] = []

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
        const pendingQuantity = pendingOrderQuantities[balance.itemId] || 0
        const effectiveStock = balance.totalWithTransit + pendingQuantity

        DebugUtils.debug(MODULE_NAME, 'Stock calculation for item', {
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentStock: balance.totalQuantity,
          transitStock: balance.transitQuantity,
          pendingOrders: pendingQuantity,
          effectiveStock: effectiveStock,
          minStock: minStock
        })

        if (effectiveStock <= minStock) {
          const suggestedQuantity = Math.max(minStock * 2 - effectiveStock, minStock)

          suggestions.push({
            itemId: balance.itemId,
            itemName: balance.itemName,
            currentStock: balance.totalQuantity,
            transitStock: balance.transitQuantity,
            pendingOrderStock: pendingQuantity,
            effectiveStock: effectiveStock,
            nearestDelivery: balance.nearestDelivery,
            minStock,
            suggestedQuantity,
            urgency:
              effectiveStock <= 0 ? 'high' : effectiveStock <= minStock * 0.5 ? 'medium' : 'low',
            reason: effectiveStock <= 0 ? 'out_of_stock' : 'below_minimum'
            // ✅ FIX 1: Removed estimatedPrice (not in OrderSuggestion type)
          })
        }
      }

      suggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 }
        const aUrgency = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 0
        const bUrgency = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 0

        if (aUrgency !== bUrgency) {
          return bUrgency - aUrgency
        }

        return (a.effectiveStock || 0) - (b.effectiveStock || 0)
      })

      DebugUtils.info(MODULE_NAME, 'Suggestions generated successfully with pending orders', {
        department,
        totalSuggestions: suggestions.length,
        highUrgency: suggestions.filter(s => s.urgency === 'high').length,
        mediumUrgency: suggestions.filter(s => s.urgency === 'medium').length,
        lowUrgency: suggestions.filter(s => s.urgency === 'low').length,
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

      const storageData: CreateReceiptData = {
        department,
        responsiblePerson: receipt.receivedBy,
        sourceType: 'purchase',
        sourceReference: {
          type: 'purchase_order',
          id: order.id,
          number: order.orderNumber
        },
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

  async updateProductPrices(receipt: Receipt): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating product prices from receipt', {
        receiptId: receipt.id,
        itemsCount: receipt.items.length
      })

      const productsStore = await this.getProductsStore()

      for (const item of receipt.items) {
        if (item.actualPrice && item.actualPrice !== item.orderedPrice) {
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

      const actualPrice = receiptItem.actualPrice || receiptItem.orderedPrice
      const expiryDate = await this.calculateExpiryDate(receiptItem.itemId)

      storageItems.push({
        itemId: receiptItem.itemId,
        itemType: 'product' as const, // ✅ FIX 5: Added required itemType field
        quantity: receiptItem.receivedQuantity,
        costPerUnit: actualPrice,
        notes: this.buildItemNotes(receiptItem, orderItem),
        expiryDate
      })
    }

    return storageItems
  }

  private async updateSingleProductPrice(item: ReceiptItem, productsStore: any): Promise<void> {
    if (!item.actualPrice) return

    try {
      await productsStore.updateProductCost(item.itemId, item.actualPrice)
      DebugUtils.debug(MODULE_NAME, 'Product price updated', {
        itemId: item.itemId,
        itemName: item.itemName,
        oldPrice: item.orderedPrice,
        newPrice: item.actualPrice
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

    const actualPrice = receiptItem.actualPrice || receiptItem.orderedPrice
    const priceDiff = actualPrice - receiptItem.orderedPrice
    if (Math.abs(priceDiff) > 0.01) {
      const sign = priceDiff > 0 ? '+' : ''
      notes.push(`Price diff: ${sign}${priceDiff.toFixed(2)}`)
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
