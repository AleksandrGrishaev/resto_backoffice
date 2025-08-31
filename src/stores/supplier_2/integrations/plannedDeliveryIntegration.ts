// src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts
// ✅ ИСПРАВЛЕНО: Использует useBatches композабл вместо несуществующих методов

import { DebugUtils } from '@/utils/debugger'
import type { PurchaseOrder, PurchaseOrderItem } from '@/types/supplier_2/supplier.types'
import type { CreateTransitBatchData, StorageDepartment } from '@/stores/storage/types'

const MODULE_NAME = 'PlannedDeliveryIntegration'

/**
 * ✅ ПЕРЕПИСАННАЯ интеграция через useBatches композабл
 * Заменяет PlannedDelivery на транзитные batch-и
 */
export class PlannedDeliveryIntegration {
  private _storageStore: ReturnType<typeof import('@/stores/storage').useStorageStore> | null = null
  private _useBatches: ReturnType<typeof import('@/stores/storage').useBatches> | null = null

  /**
   * ✅ Ленивое получение storageStore
   */
  private async getStorageStore() {
    if (!this._storageStore) {
      const { useStorageStore } = await import('@/stores/storage')
      this._storageStore = useStorageStore()
    }
    return this._storageStore
  }

  /**
   * ✅ Ленивое получение useBatches композабла
   */
  private async getBatchesComposable() {
    if (!this._useBatches) {
      const { useBatches } = await import('@/stores/storage')
      const storageStore = await this.getStorageStore()
      this._useBatches = useBatches(storageStore.state)
    }
    return this._useBatches
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Создает транзитные batch-и при отправке заказа
   */
  async createTransitBatchesFromOrder(order: PurchaseOrder): Promise<string[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transit batches from order', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemsCount: order.items.length
      })

      const batchesComposable = await this.getBatchesComposable()
      const storageStore = await this.getStorageStore()
      const department = this.getDepartmentFromOrder(order)

      const transitBatchData: CreateTransitBatchData[] = order.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.orderedQuantity,
        unit: item.unit,
        estimatedCostPerUnit: item.pricePerUnit,
        department,
        purchaseOrderId: order.id,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        plannedDeliveryDate: order.expectedDelivery || this.calculateDefaultDeliveryDate(order),
        notes: `Transit from order ${order.orderNumber}`
      }))

      // Используем callback для пересчета балансов
      const batchIds = await batchesComposable.createTransitBatches(transitBatchData, () =>
        storageStore.fetchBalances(department)
      )

      DebugUtils.info(MODULE_NAME, 'Transit batches created successfully', {
        orderId: order.id,
        batchIds: batchIds.length,
        department
      })

      return batchIds
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transit batches from order', {
        orderId: order.id,
        error
      })
      throw new Error(`Failed to create transit batches: ${error}`)
    }
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Конвертирует транзитные batch-и в активные при получении
   */
  async convertTransitBatchesOnReceipt(
    purchaseOrderId: string,
    receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
  ): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', {
        purchaseOrderId,
        itemsCount: receiptItems.length
      })

      const batchesComposable = await this.getBatchesComposable()
      const storageStore = await this.getStorageStore()

      // Используем callback для пересчета балансов
      await batchesComposable.convertTransitBatchesToActive(purchaseOrderId, receiptItems, () =>
        storageStore.fetchBalances()
      )

      DebugUtils.info(MODULE_NAME, 'Transit batches converted successfully', {
        purchaseOrderId,
        convertedItems: receiptItems.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to convert transit batches', {
        purchaseOrderId,
        error
      })
      throw new Error(`Failed to convert transit batches: ${error}`)
    }
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Получение транзитных batch-ей для заказа
   */
  async getTransitBatchesByOrder(purchaseOrderId: string) {
    try {
      const batchesComposable = await this.getBatchesComposable()
      return batchesComposable.getTransitBatchesByOrder(purchaseOrderId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get transit batches', {
        purchaseOrderId,
        error
      })
      return []
    }
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Удаление транзитных batch-ей при отмене заказа
   */
  async removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Removing transit batches for cancelled order', { orderId })

      const batchesComposable = await this.getBatchesComposable()
      const storageStore = await this.getStorageStore()

      // Используем callback для пересчета балансов
      await batchesComposable.removeTransitBatchesOnOrderCancel(orderId, () =>
        storageStore.fetchBalances()
      )

      DebugUtils.info(MODULE_NAME, 'Transit batches removed successfully', { orderId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove transit batches', {
        orderId,
        error
      })
      throw new Error(`Failed to remove transit batches: ${error}`)
    }
  }

  // =============================================
  // HELPER МЕТОДЫ
  // =============================================

  /**
   * ✅ Определяет департамент из заказа
   */
  private getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    // Проверяем есть ли напитки в заказе
    const hasBeverages = order.items.some(item =>
      this.isBeverageProduct(item.itemId, item.itemName)
    )

    // Если есть напитки - бар, иначе кухня
    return hasBeverages ? 'bar' : 'kitchen'
  }

  /**
   * ✅ Проверяет является ли продукт напитком
   */
  private isBeverageProduct(itemId: string, itemName: string): boolean {
    const beverageKeywords = [
      'beer',
      'cola',
      'water',
      'wine',
      'juice',
      'spirit',
      'vodka',
      'whiskey'
    ]
    const searchText = `${itemId} ${itemName}`.toLowerCase()

    return beverageKeywords.some(keyword => searchText.includes(keyword))
  }

  /**
   * ✅ Вычисляет дату поставки по умолчанию (через 5 дней)
   */
  private calculateDefaultDeliveryDate(order: PurchaseOrder): string {
    const orderDate = new Date(order.orderDate)
    const deliveryDate = new Date(orderDate)
    deliveryDate.setDate(deliveryDate.getDate() + 5)
    return deliveryDate.toISOString()
  }
}

// =============================================
// COMPOSABLE EXPORT
// =============================================

let integrationInstance: PlannedDeliveryIntegration | null = null

/**
 * ✅ Composable для получения instance интеграции
 */
export function usePlannedDeliveryIntegration() {
  if (!integrationInstance) {
    integrationInstance = new PlannedDeliveryIntegration()
  }
  return integrationInstance
}

// ✅ Для обратной совместимости
export const plannedDeliveryIntegration = {
  getInstance: () => usePlannedDeliveryIntegration()
}
