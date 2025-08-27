// src/stores/supplier_2/integrations/storageIntegration.ts
// ✅ ИСПРАВЛЕНО: TypeScript ошибки

import { DebugUtils } from '@/utils'
import type { Receipt, PurchaseOrder, ReceiptItem } from '../types'
import type { CreateReceiptData, StorageDepartment } from '@/stores/storage/types'

const MODULE_NAME = 'SupplierStorageIntegration'

// =============================================
// STORAGE INTEGRATION SERVICE - ИСПРАВЛЕНО
// =============================================

export class SupplierStorageIntegration {
  // ✅ ИСПРАВЛЕНО: Типизация stores
  private _storageStore: ReturnType<typeof import('@/stores/storage').useStorageStore> | null = null
  private _productsStore: ReturnType<
    typeof import('@/stores/productsStore').useProductsStore
  > | null = null

  // ✅ ИСПРАВЛЕНО: Async imports вместо require
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

  /**
   * ✅ Создает операцию поступления в Storage Store из Receipt
   */
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

      const operationId = await storageStore.createReceiptOperation(storageData)

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
   * ✅ Обновляет цены продуктов на основе фактических цен в поступлении
   */
  async updateProductPrices(receipt: Receipt): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating product prices from receipt', {
        receiptId: receipt.id,
        itemsCount: receipt.items.length
      })

      const productsStore = await this.getProductsStore()

      for (const item of receipt.items) {
        if (item.actualPrice && Math.abs(item.actualPrice - item.orderedPrice) > 0.01) {
          // ✅ ИСПРАВЛЕНО: Проверяем есть ли метод
          if (
            productsStore &&
            'updateProductCost' in productsStore &&
            typeof productsStore.updateProductCost === 'function'
          ) {
            await productsStore.updateProductCost(item.itemId, item.actualPrice)
          } else {
            DebugUtils.warn(MODULE_NAME, 'updateProductCost method not available in ProductsStore')
          }

          DebugUtils.debug(MODULE_NAME, 'Product price updated', {
            itemId: item.itemId,
            itemName: item.itemName,
            oldPrice: item.orderedPrice,
            newPrice: item.actualPrice
          })
        }
      }

      DebugUtils.info(MODULE_NAME, 'Product prices updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product prices', {
        receiptId: receipt.id,
        error
      })
      throw new Error(`Failed to update product prices: ${error}`)
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    if (
      order.orderNumber.includes('BAR') ||
      order.supplierName.toLowerCase().includes('beverage')
    ) {
      return 'bar'
    }
    return 'kitchen'
  }

  private async prepareStorageItems(receiptItems: ReceiptItem[], order: PurchaseOrder) {
    const items = []

    for (const receiptItem of receiptItems) {
      const orderItem = order.items.find(oi => oi.id === receiptItem.orderItemId)
      if (!orderItem) continue

      const quantityInGrams = await this.convertToGrams(
        receiptItem.receivedQuantity,
        orderItem.unit,
        receiptItem.itemId
      )

      const actualPrice = receiptItem.actualPrice || receiptItem.orderedPrice
      const costPerGram = actualPrice / receiptItem.receivedQuantity

      items.push({
        itemId: receiptItem.itemId,
        quantity: quantityInGrams,
        baseUnit: 'g',
        costPerUnit: costPerGram,
        originalQuantity: receiptItem.receivedQuantity,
        originalUnit: orderItem.unit,
        originalCostPerUnit: actualPrice,
        expiryDate: this.calculateExpiryDate(receiptItem.itemId),
        notes: this.buildItemNotes(receiptItem, orderItem)
      })
    }

    return items
  }

  private async convertToGrams(quantity: number, unit: string, itemId: string): Promise<number> {
    const conversions: Record<string, number> = {
      g: 1,
      kg: 1000,
      l: 1000,
      ml: 1,
      piece: (await this.getWeightPerPiece(itemId)) || 100
    }

    const coefficient = conversions[unit.toLowerCase()] || 1
    return quantity * coefficient
  }

  private async getWeightPerPiece(itemId: string): Promise<number | null> {
    try {
      const productsStore = await this.getProductsStore()
      if (!productsStore || !productsStore.products) return null

      const product = productsStore.products.find((p: { id: string }) => p.id === itemId)
      return (product as { weightPerPiece?: number })?.weightPerPiece || null
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Could not get weight per piece', { itemId, error })
      return null
    }
  }

  private async calculateExpiryDate(itemId: string): Promise<string | undefined> {
    try {
      const productsStore = await this.getProductsStore()
      if (!productsStore || !productsStore.products) return undefined

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
    _orderItem: { unit: string }
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

// =============================================
// ✅ ИСПРАВЛЕННЫЙ COMPOSABLE
// =============================================

let integrationInstance: SupplierStorageIntegration | null = null

export function useSupplierStorageIntegration() {
  if (!integrationInstance) {
    integrationInstance = new SupplierStorageIntegration()
  }

  return {
    createReceiptOperation: (receipt: Receipt, order: PurchaseOrder) =>
      integrationInstance!.createReceiptOperation(receipt, order),

    updateProductPrices: (receipt: Receipt) => integrationInstance!.updateProductPrices(receipt)
  }
}
