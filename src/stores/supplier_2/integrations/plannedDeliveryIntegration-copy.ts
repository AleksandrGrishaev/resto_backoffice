// src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts
// ✅ ПЕРЕПИСАНО: Интеграция через транзитные batch-и вместо PlannedDelivery

import { DebugUtils } from '@/utils/debugger'
import type { PurchaseOrder, PurchaseOrderItem } from '@/stores/supplier_2/types'
import type { CreateTransitBatchData, StorageDepartment } from '@/stores/storage/types'

const MODULE_NAME = 'PlannedDeliveryIntegration'

/**
 * ✅ ПЕРЕПИСАННАЯ интеграция планируемых поставок через транзитные batch-и
 *
 * НОВЫЙ подход:
 * - Вместо создания PlannedDelivery создаем транзитные batch-и
 * - Вместо обновления PlannedDelivery обновляем транзитные batch-и
 * - При получении конвертируем транзитные batch-и в активные
 */
export class PlannedDeliveryIntegration {
  // ✅ Ленивая инициализация storageStore
  private _storageStore: ReturnType<
    typeof import('@/stores/storage/storageStore').useStorageStore
  > | null = null

  /**
   * ✅ Ленивое получение storageStore
   */
  private async getStorageStore() {
    if (!this._storageStore) {
      const { useStorageStore } = await import('@/stores/storage/storageStore')
      this._storageStore = useStorageStore()
    }
    return this._storageStore
  }

  // =============================================
  // ОСНОВНЫЕ МЕТОДЫ - НОВЫЙ ПОДХОД ЧЕРЕЗ ТРАНЗИТНЫЕ BATCH-И
  // =============================================

  /**
   * ✅ ПЕРЕПИСАНО: Создает транзитные batch-и при отправке заказа
   * ЗАМЕНЯЕТ: createPlannedDelivery()
   */
  async createTransitBatchesFromOrder(order: PurchaseOrder): Promise<string[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transit batches from order', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        supplierName: order.supplierName,
        itemsCount: order.items.length
      })

      const storageStore = await this.getStorageStore()
      const department = this.getDepartmentFromOrder(order)

      // Готовим данные для создания транзитных batch-ей
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
        plannedDeliveryDate: order.expectedDeliveryDate || this.calculateDefaultDeliveryDate(order),
        notes: `Transit batch from order ${order.orderNumber}`
      }))

      // Создаем транзитные batch-и в StorageStore
      const batchIds = await storageStore.createTransitBatches(transitBatchData)

      DebugUtils.info(MODULE_NAME, 'Transit batches created successfully', {
        orderId: order.id,
        batchesCreated: batchIds.length,
        batchIds
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
   * ✅ ПЕРЕПИСАНО: Конвертирует транзитные batch-и в активные при получении товара
   * ЗАМЕНЯЕТ: createBatchesFromReceipt()
   */
  async convertTransitBatchesOnReceipt(
    purchaseOrderId: string,
    receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
  ): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Converting transit batches on receipt', {
        purchaseOrderId,
        itemsCount: receiptItems.length
      })

      const storageStore = await this.getStorageStore()

      // Используем новый метод StorageStore для конвертации
      await storageStore.convertTransitBatchesToActive(purchaseOrderId, receiptItems)

      DebugUtils.info(MODULE_NAME, 'Transit batches converted successfully', {
        purchaseOrderId,
        itemsCount: receiptItems.length
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
   * ✅ ПЕРЕПИСАНО: Удаляет транзитные batch-и при отмене заказа
   * ЗАМЕНЯЕТ: cancelPlannedDelivery()
   */
  async removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Removing transit batches on order cancel', { orderId })

      const storageStore = await this.getStorageStore()

      // Используем новый метод StorageStore для удаления транзитных batch-ей
      await storageStore.removeTransitBatchesOnOrderCancel(orderId)

      DebugUtils.info(MODULE_NAME, 'Transit batches removed successfully', { orderId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove transit batches', {
        orderId,
        error
      })
      throw new Error(`Failed to remove transit batches: ${error}`)
    }
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Получает транзитные batch-и для заказа
   * ЗАМЕНЯЕТ: getPlannedDeliveryInfo()
   */
  getTransitBatchesForOrder(purchaseOrderId: string) {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting transit batches for order', { purchaseOrderId })

      // Используем synchronous метод - не требует await
      const storageStore = this._storageStore
      if (!storageStore) {
        DebugUtils.warn(MODULE_NAME, 'StorageStore not initialized yet')
        return []
      }

      return storageStore.getTransitBatchesByOrder(purchaseOrderId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get transit batches for order', {
        purchaseOrderId,
        error
      })
      return []
    }
  }

  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ (АДАПТИРОВАНЫ)
  // =============================================

  /**
   * Определяет департамент из заказа
   */
  private getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    // TODO: Реализовать правильное определение департамента
    // Можно использовать requestIds для определения департамента
    // или анализировать первый item в заказе

    // Пока возвращаем kitchen по умолчанию
    return 'kitchen'
  }

  /**
   * Вычисляет дату поставки по умолчанию (через 5 дней)
   */
  private calculateDefaultDeliveryDate(order: PurchaseOrder): string {
    const orderDate = new Date(order.orderDate)
    const deliveryDate = new Date(orderDate)

    // Добавляем 5 дней по умолчанию
    deliveryDate.setDate(deliveryDate.getDate() + 5)

    return deliveryDate.toISOString()
  }

  // =============================================
  // УСТАРЕВШИЕ МЕТОДЫ - ОСТАВЛЕНЫ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
  // =============================================

  /**
   * @deprecated Используйте createTransitBatchesFromOrder()
   * Оставлен для обратной совместимости
   */
  async createPlannedDelivery(order: PurchaseOrder): Promise<string> {
    DebugUtils.warn(
      MODULE_NAME,
      'createPlannedDelivery() is deprecated, use createTransitBatchesFromOrder()'
    )

    const batchIds = await this.createTransitBatchesFromOrder(order)
    return batchIds[0] || 'no-batches-created'
  }

  /**
   * @deprecated Используйте createTransitBatchesFromOrder() при изменениях
   * Оставлен для обратной совместимости
   */
  async updatePlannedDelivery(order: PurchaseOrder): Promise<void> {
    DebugUtils.warn(
      MODULE_NAME,
      'updatePlannedDelivery() is deprecated, recreate transit batches if needed'
    )

    // Для простоты игнорируем обновления
    // В будущем можно реализовать логику обновления транзитных batch-ей
    DebugUtils.info(MODULE_NAME, 'Update ignored - transit batches are immutable until receipt')
  }

  /**
   * @deprecated Используйте removeTransitBatchesOnOrderCancel()
   * Оставлен для обратной совместимости
   */
  async cancelPlannedDelivery(orderId: string): Promise<void> {
    DebugUtils.warn(
      MODULE_NAME,
      'cancelPlannedDelivery() is deprecated, use removeTransitBatchesOnOrderCancel()'
    )

    await this.removeTransitBatchesOnOrderCancel(orderId)
  }

  /**
   * @deprecated Используйте getTransitBatchesForOrder()
   * Оставлен для обратной совместимости
   */
  async getPlannedDeliveryInfo(orderId: string): Promise<any> {
    DebugUtils.warn(
      MODULE_NAME,
      'getPlannedDeliveryInfo() is deprecated, use getTransitBatchesForOrder()'
    )

    const transitBatches = this.getTransitBatchesForOrder(orderId)

    // Эмулируем старый формат ответа
    return {
      id: `planned-${orderId}`,
      purchaseOrderId: orderId,
      status: transitBatches.length > 0 ? 'confirmed' : 'cancelled',
      items: transitBatches.map(batch => ({
        itemId: batch.itemId,
        plannedQuantity: batch.currentQuantity,
        unit: batch.unit
      }))
    }
  }
}

// =============================================
// COMPOSABLE EXPORT
// =============================================

let integrationInstance: PlannedDeliveryIntegration | null = null

/**
 * ✅ Композабл для получения интеграции планируемых поставок
 */
export function usePlannedDeliveryIntegration(): PlannedDeliveryIntegration {
  if (!integrationInstance) {
    integrationInstance = new PlannedDeliveryIntegration()
  }
  return integrationInstance
}

/**
 * ✅ Для обратной совместимости
 */
export const plannedDeliveryIntegration = {
  getInstance: () => usePlannedDeliveryIntegration()
}

// Экспорт типа для использования в других файлах
export type { PlannedDeliveryIntegration }
