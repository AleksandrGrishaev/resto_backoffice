// src/stores/supplier_2/integrations/storageIntegration.ts
// ✅ ИСПРАВЛЕННАЯ ВЕРСИЯ: Учитывает draft и sent заказы в recommendations

import { DebugUtils } from '@/utils'
import type { Receipt, PurchaseOrder, ReceiptItem, OrderSuggestion } from '../types'
import type { CreateReceiptData, StorageDepartment } from '@/stores/storage/types'

const MODULE_NAME = 'SupplierStorageIntegration'

// =============================================
// STORAGE INTEGRATION SERVICE
// =============================================

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

  // =============================================
  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ: Учитывает все заказы
  // =============================================

  async getSuggestionsFromStock(department?: StorageDepartment): Promise<OrderSuggestion[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Generating suggestions from storage with all order statuses', {
        department
      })

      const storageStore = await this.getStorageStore()
      const productsStore = await this.getProductsStore()
      const supplierStore = await this.getSupplierStore()

      // Получаем базовые балансы с транзитом
      const balancesWithTransit = storageStore.balancesWithTransit

      if (!balancesWithTransit || balancesWithTransit.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No storage balances available for suggestions')
        return []
      }

      // ✅ НОВОЕ: Получаем все активные заказы (draft + sent без транзитных batch-ей)
      const pendingOrderQuantities = await this.calculatePendingOrderQuantities(department)

      DebugUtils.debug(MODULE_NAME, 'Pending order quantities calculated', {
        totalItems: Object.keys(pendingOrderQuantities).length,
        sampleData: Object.fromEntries(Object.entries(pendingOrderQuantities).slice(0, 3))
      })

      const suggestions: OrderSuggestion[] = []

      for (const balance of balancesWithTransit) {
        // Фильтр по департаменту если указан
        if (department && balance.department !== department) {
          continue
        }

        // Находим продукт
        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product || !product.isActive) {
          continue
        }

        const minStock = product.minStock || 0

        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Учитываем ВСЕ заказанные товары
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

        // Проверяем нужно ли заказывать
        if (effectiveStock <= minStock) {
          const suggestedQuantity = Math.max(minStock * 2 - effectiveStock, minStock)

          suggestions.push({
            itemId: balance.itemId,
            itemName: balance.itemName,
            currentStock: balance.totalQuantity,

            // ✅ РАСШИРЕННЫЕ ПОЛЯ:
            transitStock: balance.transitQuantity,
            pendingOrderStock: pendingQuantity, // НОВОЕ ПОЛЕ
            effectiveStock: effectiveStock,
            nearestDelivery: balance.nearestDelivery,

            minStock,
            suggestedQuantity,
            urgency:
              effectiveStock <= 0 ? 'high' : effectiveStock <= minStock * 0.5 ? 'medium' : 'low',
            reason: effectiveStock <= 0 ? 'out_of_stock' : 'below_minimum',
            estimatedPrice: balance.latestCost
          })
        }
      }

      // Сортируем по важности
      suggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 }
        const aUrgency = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 0
        const bUrgency = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 0

        if (aUrgency !== bUrgency) {
          return bUrgency - aUrgency // Высокий приоритет первым
        }

        // При одинаковом приоритете - по эффективному запасу (меньше = важнее)
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

  // =============================================
  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ: Учитывает requests + orders
  // =============================================

  private async calculatePendingOrderQuantities(
    department?: StorageDepartment
  ): Promise<Record<string, number>> {
    try {
      const supplierStore = await this.getSupplierStore()
      const pendingQuantities: Record<string, number> = {}

      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Учитываем И requests И orders

      // 1. Submitted requests (еще не конвертированы в orders)
      const submittedRequests = supplierStore.state.requests.filter(
        req => req.status === 'submitted'
      )

      // 2. Draft и sent orders
      const pendingOrders = supplierStore.state.orders.filter(order =>
        ['draft', 'sent'].includes(order.status)
      )

      DebugUtils.debug(MODULE_NAME, 'Found pending items in requests and orders', {
        submittedRequests: submittedRequests.length,
        draftOrders: pendingOrders.filter(o => o.status === 'draft').length,
        sentOrders: pendingOrders.filter(o => o.status === 'sent').length,
        requestsDetail: submittedRequests.map(r => ({
          id: r.id,
          status: r.status,
          items: r.items.map(i => ({ itemId: i.itemId, quantity: i.requestedQuantity }))
        })),
        ordersDetail: pendingOrders.map(o => ({
          id: o.id,
          status: o.status,
          items: o.items.map(i => ({ itemId: i.itemId, quantity: i.quantity }))
        }))
      })

      // Обрабатываем submitted requests
      for (const request of submittedRequests) {
        // Фильтр по департаменту
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

      // Обрабатываем pending orders
      for (const order of pendingOrders) {
        DebugUtils.debug(MODULE_NAME, 'Processing pending order', {
          orderId: order.id,
          status: order.status,
          department: department,
          items: order.items.map(i => ({
            itemId: i.itemId,
            orderedQuantity: i.orderedQuantity,
            quantity: i.quantity
          }))
        })

        // Фильтр по департаменту для заказа
        if (department && !this.isOrderForDepartment(order, department)) {
          DebugUtils.debug(MODULE_NAME, 'Order filtered out by department', {
            orderId: order.id,
            requiredDepartment: department
          })
          continue
        }

        // ✅ СПЕЦИАЛЬНАЯ ЛОГИКА: для sent заказов проверяем есть ли уже transit batch
        if (order.status === 'sent') {
          const hasTransitBatches = await this.orderHasTransitBatches(order.id)
          if (hasTransitBatches) {
            DebugUtils.debug(MODULE_NAME, 'Order has transit batches, skipping', {
              orderId: order.id
            })
            continue
          }
        }

        // Суммируем количества по товарам в orders
        for (const item of order.items) {
          if (!pendingQuantities[item.itemId]) {
            pendingQuantities[item.itemId] = 0
          }
          // ✅ ИСПРАВЛЕНИЕ: Используем правильное поле для количества
          const quantity = item.orderedQuantity || item.quantity || 0
          pendingQuantities[item.itemId] += quantity

          DebugUtils.debug(MODULE_NAME, 'Added order item to pending quantities', {
            itemId: item.itemId,
            orderedQuantity: item.orderedQuantity,
            quantity: item.quantity,
            usedQuantity: quantity,
            totalPendingForItem: pendingQuantities[item.itemId],
            orderId: order.id
          })
        }
      }

      DebugUtils.debug(MODULE_NAME, 'Final pending quantities calculated', {
        pendingQuantities,
        totalItems: Object.keys(pendingQuantities).length
      })

      return pendingQuantities
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate pending order quantities', {
        error,
        department
      })
      return {}
    }
  }

  // =============================================
  // ✅ НОВЫЕ HELPER ФУНКЦИИ
  // =============================================

  private isOrderForDepartment(order: PurchaseOrder, department: StorageDepartment): boolean {
    // Определяем департамент заказа по товарам
    const hasBeverages = order.items.some(item => this.isBeverageProduct(item.itemId, ''))
    const orderDepartment = hasBeverages ? 'bar' : 'kitchen'

    return department === 'all' || orderDepartment === department
  }

  private async orderHasTransitBatches(orderId: string): Promise<boolean> {
    try {
      const storageStore = await this.getStorageStore()
      const transitBatches = storageStore.transitBatches.value

      return transitBatches.some(batch => batch.purchaseOrderId === orderId)
    } catch (error) {
      DebugUtils.debug(MODULE_NAME, 'Could not check transit batches for order', { orderId, error })
      return false
    }
  }

  // =============================================
  // СУЩЕСТВУЮЩИЕ ФУНКЦИИ (без изменений)
  // =============================================

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

      // ✅ ИСПРАВЛЕНО: Используем правильный метод createReceipt вместо createReceiptOperation
      const operation = await storageStore.createReceipt(storageData)
      const operationId = operation.id

      // Инвалидируем кэш suggestions после создания операции
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

      // Инвалидируем кэш после обновления цен
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
          const balance = storageStore.getBalance(itemId)
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

  // =============================================
  // ИНВАЛИДАЦИЯ КЭША
  // =============================================

  invalidateCache(): void {
    // suggestionsCache = null // Раскомментировать если есть кэш
    DebugUtils.debug(MODULE_NAME, 'Suggestions cache invalidated')
  }

  // =============================================
  // ПРИВАТНЫЕ HELPER ФУНКЦИИ
  // =============================================

  private getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    const hasBeverages = order.items.some(item => this.isBeverageProduct(item.itemId, ''))
    return hasBeverages ? 'bar' : 'kitchen'
  }

  private isBeverageProduct(itemId: string, category?: string): boolean {
    // Проверка по категории (основной способ)
    if (category === 'beverages' || category === 'drinks') {
      return true
    }

    // Проверка по ID (для совместимости со старыми данными)
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

// =============================================
// COMPOSABLE EXPORT
// =============================================

let integrationInstance: SupplierStorageIntegration | null = null

export function useSupplierStorageIntegration() {
  if (!integrationInstance) {
    integrationInstance = new SupplierStorageIntegration()
  }

  return {
    createReceiptOperation: (receipt: Receipt, order: PurchaseOrder) =>
      integrationInstance!.createReceiptOperation(receipt, order),

    updateProductPrices: (receipt: Receipt) => integrationInstance!.updateProductPrices(receipt),

    // ✅ ОБНОВЛЕННАЯ ФУНКЦИЯ: Теперь учитывает все заказы
    getSuggestionsFromStock: (department?: StorageDepartment) =>
      integrationInstance!.getSuggestionsFromStock(department),

    getLatestPrices: (itemIds: string[]) => integrationInstance!.getLatestPrices(itemIds),

    invalidateCache: () => integrationInstance!.invalidateCache()
  }
}
