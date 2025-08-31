// src/stores/supplier_2/integrations/storageIntegration.ts
// ✅ ПОЛНАЯ ВЕРСИЯ с динамическими suggestions из Storage данных

import { DebugUtils } from '@/utils'
import type { Receipt, PurchaseOrder, ReceiptItem, OrderSuggestion } from '../types'
import type { CreateReceiptData, StorageDepartment } from '@/stores/storage/types'

const MODULE_NAME = 'SupplierStorageIntegration'

// =============================================
// КЭШИРОВАНИЕ SUGGESTIONS
// =============================================

interface CachedSuggestions {
  data: OrderSuggestion[]
  timestamp: number
  department: string
}

const CACHE_DURATION = 30000 // 30 секунд
let suggestionsCache: CachedSuggestions | null = null

// =============================================
// STORAGE INTEGRATION SERVICE
// =============================================

export class SupplierStorageIntegration {
  private _storageStore: ReturnType<typeof import('@/stores/storage').useStorageStore> | null = null
  private _productsStore: ReturnType<
    typeof import('@/stores/productsStore').useProductsStore
  > | null = null

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

  // =============================================
  // ✅ ОСНОВНАЯ ФУНКЦИЯ: Динамические suggestions из Storage
  // =============================================

  async getSuggestionsFromStock(department?: StorageDepartment): Promise<OrderSuggestion[]> {
    try {
      const cacheKey = department || 'all'

      // Проверяем кэш
      if (
        suggestionsCache &&
        suggestionsCache.department === cacheKey &&
        Date.now() - suggestionsCache.timestamp < CACHE_DURATION
      ) {
        DebugUtils.debug(MODULE_NAME, 'Returning cached suggestions', {
          department: cacheKey,
          count: suggestionsCache.data.length,
          cacheAge: Date.now() - suggestionsCache.timestamp
        })
        return suggestionsCache.data
      }

      DebugUtils.info(MODULE_NAME, 'Generating fresh suggestions with transit support', {
        department: cacheKey
      })

      const [storageStore, productsStore] = await Promise.all([
        this.getStorageStore(),
        this.getProductsStore()
      ])

      if (!storageStore || !productsStore) {
        throw new Error('Required stores not available')
      }

      // ✅ ИСПРАВЛЕНИЕ: Используем balancesWithTransit вместо обычных балансов
      const balancesWithTransit = storageStore.balancesWithTransit
      const filteredBalances =
        department && department !== 'all'
          ? balancesWithTransit.filter(b => b.department === department && b.itemType === 'product')
          : balancesWithTransit.filter(b => b.itemType === 'product')

      if (!filteredBalances || filteredBalances.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No storage balances available', { department })
        return []
      }

      // Получаем продукты
      const products = productsStore.products
      if (!products || products.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No products available')
        return []
      }

      const suggestions: OrderSuggestion[] = []

      // Фильтрация продуктов по департаменту
      const relevantProducts = this.filterProductsByDepartment(products, department)

      DebugUtils.debug(MODULE_NAME, 'Processing suggestions with transit data', {
        totalBalances: filteredBalances.length,
        relevantProducts: relevantProducts.length,
        department: cacheKey
      })

      for (const product of relevantProducts) {
        // Найти баланс с транзитной информацией
        const balanceWithTransit = filteredBalances.find(
          b => b.itemId === product.id && b.itemType === 'product'
        )

        if (!balanceWithTransit) continue

        const currentStock = balanceWithTransit.totalQuantity
        const transitStock = balanceWithTransit.transitQuantity || 0
        const effectiveStock = balanceWithTransit.totalWithTransit || currentStock
        const minStock = product.minStock || 0
        const latestCost =
          balanceWithTransit.latestCost || product.baseCostPerUnit || product.costPerUnit || 0

        // ✅ ИСПРАВЛЕНИЕ: Учитываем эффективный запас (склад + транзит)
        const needsOrder = this.shouldCreateSuggestionWithTransit(
          currentStock,
          effectiveStock,
          transitStock,
          minStock,
          balanceWithTransit
        )

        if (needsOrder) {
          const suggestion = this.createSuggestionWithTransit(
            product,
            currentStock,
            transitStock,
            effectiveStock,
            minStock,
            latestCost,
            balanceWithTransit
          )
          suggestions.push(suggestion)

          DebugUtils.debug(MODULE_NAME, 'Created suggestion with transit data', {
            itemId: product.id,
            itemName: product.name,
            currentStock,
            transitStock,
            effectiveStock,
            urgency: suggestion.urgency,
            reason: suggestion.reason
          })
        }
      }

      // Сортировка по срочности
      suggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 }
        if (a.urgency !== b.urgency) {
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
        }

        // При одинаковой срочности - сортируем по проценту дефицита эффективного запаса
        const aDeficit =
          a.minStock > 0 ? (a.minStock - (a.effectiveStock || a.currentStock)) / a.minStock : 0
        const bDeficit =
          b.minStock > 0 ? (b.minStock - (b.effectiveStock || b.currentStock)) / b.minStock : 0
        return bDeficit - aDeficit
      })

      // Кэшируем результат
      suggestionsCache = {
        data: suggestions,
        timestamp: Date.now(),
        department: cacheKey
      }

      DebugUtils.info(MODULE_NAME, 'Dynamic suggestions with transit generated', {
        department: cacheKey,
        total: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length,
        withTransit: suggestions.filter(s => (s.transitStock || 0) > 0).length,
        cached: true
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

  // ✅ НОВЫЕ helper методы с поддержкой транзита:

  private shouldCreateSuggestionWithTransit(
    currentStock: number,
    effectiveStock: number,
    transitStock: number,
    minStock: number,
    balance: any
  ): boolean {
    // Случай 1: Совсем нет товара (ни на складе, ни в пути)
    if (effectiveStock === 0) {
      return true
    }

    // Случай 2: Эффективный запас (склад + транзит) ниже минимума
    if (minStock > 0 && effectiveStock < minStock) {
      return true
    }

    // Случай 3: Помечен как "below min stock" но учитываем транзит
    if (balance?.belowMinStock && transitStock === 0) {
      return true
    }

    // Случай 4: Есть только транзит, но нет товара на складе (нужен срочный заказ)
    if (currentStock === 0 && transitStock > 0 && transitStock < minStock * 0.5) {
      return true
    }

    return false
  }

  private createSuggestionWithTransit(
    product: any,
    currentStock: number,
    transitStock: number,
    effectiveStock: number,
    minStock: number,
    latestCost: number,
    balance: any
  ): OrderSuggestion {
    // Расчет срочности с учетом транзита
    const urgency = this.calculateUrgencyWithTransit(
      currentStock,
      effectiveStock,
      transitStock,
      minStock,
      balance
    )

    // Расчет причины
    const reason = effectiveStock === 0 ? 'out_of_stock' : 'below_minimum'

    // Расчет предлагаемого количества с учетом транзита
    const suggestedQuantity = this.calculateSuggestedQuantityWithTransit(
      currentStock,
      effectiveStock,
      transitStock,
      minStock,
      product,
      balance
    )

    return {
      itemId: product.id,
      itemName: product.name,
      currentStock,
      transitStock, // ✅ НОВОЕ поле
      effectiveStock, // ✅ НОВОЕ поле
      minStock,
      suggestedQuantity,
      urgency,
      reason,
      estimatedPrice: latestCost,
      nearestDelivery: balance?.nearestDelivery, // ✅ НОВОЕ поле
      lastPriceDate: balance?.newestBatchDate || undefined
    }
  }

  private calculateUrgencyWithTransit(
    currentStock: number,
    effectiveStock: number,
    transitStock: number,
    minStock: number,
    balance?: any
  ): 'low' | 'medium' | 'high' {
    // Критично: совсем нет товара
    if (effectiveStock === 0) {
      return 'high'
    }

    // Критично: только транзит есть, но на складе пусто
    if (currentStock === 0 && transitStock > 0) {
      return 'high'
    }

    // Критично: эффективный запас очень мал (меньше 20% от минимума)
    if (minStock > 0 && effectiveStock < minStock * 0.2) {
      return 'high'
    }

    // Срочно: эффективный запас ниже минимума
    if (minStock > 0 && effectiveStock < minStock) {
      return 'high'
    }

    // Внимание: есть транзит но он может быть просрочен
    if (transitStock > 0 && currentStock < minStock * 0.3) {
      return 'medium'
    }

    // Низкий приоритет
    return 'low'
  }

  private calculateSuggestedQuantityWithTransit(
    currentStock: number,
    effectiveStock: number,
    transitStock: number,
    minStock: number,
    product: any,
    balance?: any
  ): number {
    // Если совсем нет товара - заказываем достаточно
    if (effectiveStock === 0) {
      return Math.max(minStock * 1.5, 1000)
    }

    // Если есть только транзит - заказываем для пополнения склада
    if (currentStock === 0 && transitStock > 0) {
      const additionalNeed = Math.max(minStock - transitStock, minStock * 0.5)
      return Math.ceil(additionalNeed)
    }

    // Если эффективный запас ниже минимума - доводим до безопасного уровня
    if (effectiveStock < minStock) {
      const deficit = minStock - effectiveStock
      const safetyBuffer = minStock * 0.3
      return Math.ceil(deficit + safetyBuffer)
    }

    // Стандартный профилактический заказ
    return Math.max(minStock * 0.5, 500)
  }

  // =============================================
  // HELPER ФУНКЦИИ ДЛЯ SUGGESTIONS
  // =============================================

  private filterProductsByDepartment(products: any[], department?: StorageDepartment) {
    if (!department || department === 'all') {
      return products.filter(p => p.isActive)
    }

    return products.filter(product => {
      if (!product.isActive) return false

      if (department === 'kitchen') {
        // Кухня: все кроме напитков
        return !this.isBeverageProduct(product.id, product.category)
      } else if (department === 'bar') {
        // Бар: только напитки
        return this.isBeverageProduct(product.id, product.category)
      }

      return true
    })
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

  private shouldCreateSuggestion(currentStock: number, minStock: number, balance?: any): boolean {
    // Случай 1: Совсем нет на складе
    if (currentStock === 0) {
      return true
    }

    // Случай 2: Ниже минимума (с небольшим буфером)
    if (minStock > 0 && currentStock < minStock) {
      return true
    }

    // Случай 3: Помечен как "below min stock" в Storage Store
    if (balance?.belowMinStock) {
      return true
    }

    // Случай 4: Скоро истекает срок годности и нужно использовать/заменить
    if (balance?.hasNearExpiry && currentStock > 0) {
      // Только если это скоропортящийся продукт с большим остатком
      const hasSignificantStock = minStock > 0 && currentStock > minStock * 0.3
      return hasSignificantStock
    }

    return false
  }

  private createSuggestion(
    product: any,
    currentStock: number,
    minStock: number,
    latestCost: number,
    balance?: any
  ): OrderSuggestion {
    // Расчет срочности
    const urgency = this.calculateUrgency(currentStock, minStock, balance)

    // Расчет причины
    const reason = this.calculateReason(currentStock, minStock, balance)

    // Расчет предлагаемого количества
    const suggestedQuantity = this.calculateSuggestedQuantity(
      currentStock,
      minStock,
      product,
      balance
    )

    return {
      itemId: product.id,
      itemName: product.name,
      currentStock,
      minStock,
      suggestedQuantity,
      urgency,
      reason,
      estimatedPrice: latestCost,
      lastPriceDate: balance?.newestBatchDate || undefined
    }
  }

  private calculateUrgency(
    currentStock: number,
    minStock: number,
    balance?: any
  ): 'low' | 'medium' | 'high' {
    // Критично: нет на складе
    if (currentStock === 0) {
      return 'high'
    }

    // Критично: очень мало (меньше 20% от минимума)
    if (minStock > 0 && currentStock < minStock * 0.2) {
      return 'high'
    }

    // Срочно: ниже минимума
    if (minStock > 0 && currentStock < minStock) {
      return 'high'
    }

    // Срочно: помечен системой как низкий запас
    if (balance?.belowMinStock) {
      return 'high'
    }

    // Внимание: скоро истекает + есть запас
    if (balance?.hasNearExpiry && currentStock > 0) {
      return 'medium'
    }

    // Низкий приоритет: профилактический заказ
    return 'low'
  }

  private calculateReason(
    currentStock: number,
    minStock: number,
    balance?: any
  ): 'out_of_stock' | 'below_minimum' {
    if (currentStock === 0) {
      return 'out_of_stock'
    }
    return 'below_minimum'
  }

  private calculateSuggestedQuantity(
    currentStock: number,
    minStock: number,
    product: any,
    balance?: any
  ): number {
    // Если нет на складе - предлагаем достаточное количество
    if (currentStock === 0) {
      const baseOrder = Math.max(minStock * 1.5, 1000) // минимум 1000 базовых единиц
      return Math.ceil(baseOrder)
    }

    // Если ниже минимума - доводим до безопасного уровня
    if (currentStock < minStock) {
      const deficit = minStock - currentStock
      const safetyBuffer = minStock * 0.3 // 30% запас
      return Math.ceil(deficit + safetyBuffer)
    }

    // Если истекает срок - заказываем замену
    if (balance?.hasNearExpiry) {
      return Math.max(currentStock * 0.5, minStock)
    }

    // Стандартный профилактический заказ
    return Math.max(minStock * 0.5, 500)
  }

  // =============================================
  // ИНВАЛИДАЦИЯ КЭША
  // =============================================

  invalidateCache(): void {
    suggestionsCache = null
    DebugUtils.debug(MODULE_NAME, 'Suggestions cache invalidated')
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

      const operationId = await storageStore.createReceiptOperation(storageData)

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
  // ПРИВАТНЫЕ HELPER ФУНКЦИИ
  // =============================================

  private getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    const hasBeverages = order.items.some(item => this.isBeverageProduct(item.itemId, ''))
    return hasBeverages ? 'bar' : 'kitchen'
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

    // ✅ НОВАЯ ФУНКЦИЯ: Получение динамических suggestions
    getSuggestionsFromStock: (department?: StorageDepartment) =>
      integrationInstance!.getSuggestionsFromStock(department),

    // ✅ НОВАЯ ФУНКЦИЯ: Получение цен из Storage
    getLatestPrices: (itemIds: string[]) => integrationInstance!.getLatestPrices(itemIds),

    // ✅ УТИЛИТА: Инвалидация кэша
    invalidateCache: () => integrationInstance!.invalidateCache()
  }
}
