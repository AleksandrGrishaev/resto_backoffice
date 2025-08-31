// ===== ПОЛНАЯ ЗАМЕНА src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts =====

import { useBatches } from '@/stores/storage/composables/useBatches'
import { DebugUtils, TimeUtils } from '@/utils'
import type { PurchaseOrder } from '../types'
import type {
  CreateTransitBatchData,
  StorageBatch,
  StorageDepartment
} from '@/stores/storage/types'

const MODULE_NAME = 'PlannedDeliveryIntegration'

/**
 * ПЕРЕПИСАНО: Упрощенная интеграция через useBatches
 * Убраны все несуществующие методы, используется композабл
 */
export class PlannedDeliveryIntegration {
  private batchesComposable = useBatches()

  /**
   * Создает транзитные batch-и при отправке заказа
   */
  async createTransitBatchesFromOrder(order: PurchaseOrder): Promise<string[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transit batches from order', {
        orderId: order.id,
        itemsCount: order.items.length
      })

      const department = this.getDepartmentFromOrder(order)

      const transitBatchData: CreateTransitBatchData[] = order.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.orderedQuantity,
        unit: item.unit || 'gram', // fallback
        estimatedCostPerUnit: item.pricePerUnit,
        department,
        purchaseOrderId: order.id,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        plannedDeliveryDate: order.expectedDeliveryDate || this.calculateDefaultDeliveryDate(order),
        notes: `Transit from order ${order.orderNumber}`
      }))

      const batchIds = await this.batchesComposable.createTransitBatches(transitBatchData)

      DebugUtils.info(MODULE_NAME, 'Transit batches created successfully', {
        orderId: order.id,
        batchIds: batchIds.length
      })

      return batchIds
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transit batches from order', {
        error,
        orderId: order.id
      })
      throw error
    }
  }

  /**
   * Конвертирует транзитные batch-и в активные при получении
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

      await this.batchesComposable.convertTransitBatchesToActive(purchaseOrderId, receiptItems)

      DebugUtils.info(MODULE_NAME, 'Transit batches converted successfully', { purchaseOrderId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to convert transit batches on receipt', {
        error,
        purchaseOrderId
      })
      throw error
    }
  }

  /**
   * Получение транзитных batch-ей для заказа
   */
  getTransitBatchesByOrder(purchaseOrderId: string): StorageBatch[] {
    return this.batchesComposable.getTransitBatchesByOrder(purchaseOrderId)
  }

  /**
   * Удаление транзитных batch-ей при отмене заказа
   */
  async removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Removing transit batches on order cancel', { orderId })

      await this.batchesComposable.removeTransitBatchesOnOrderCancel(orderId)

      DebugUtils.info(MODULE_NAME, 'Transit batches removed on order cancel', { orderId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove transit batches on order cancel', {
        error,
        orderId
      })
      throw error
    }
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Определяет департамент из заказа
   */
  private getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    // Логика определения департамента
    // Можно анализировать товары в заказе или использовать другую логику

    // Простая логика: если есть алкоголь - bar, иначе kitchen
    const hasAlcohol = order.items.some(
      item =>
        item.itemName.toLowerCase().includes('beer') ||
        item.itemName.toLowerCase().includes('wine') ||
        item.itemName.toLowerCase().includes('vodka') ||
        item.itemName.toLowerCase().includes('whiskey')
    )

    return hasAlcohol ? 'bar' : 'kitchen'
  }

  /**
   * Вычисляет дату поставки по умолчанию
   */
  private calculateDefaultDeliveryDate(order: PurchaseOrder): string {
    // Если нет ожидаемой даты, добавляем 3 дня к дате заказа
    const orderDate = new Date(order.orderDate)
    const defaultDeliveryDate = new Date(orderDate)
    defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 3)

    return defaultDeliveryDate.toISOString()
  }

  /**
   * Получить метрики по транзитным поставкам
   */
  getTransitMetrics() {
    return this.batchesComposable.transitMetrics.value
  }

  /**
   * Получить алерты по поставкам
   */
  getDeliveryAlerts() {
    return this.batchesComposable.deliveryAlerts.value
  }
}

// =============================================
// COMPOSABLE EXPORT (НЕ SINGLETON)
// =============================================

let integrationInstance: PlannedDeliveryIntegration | null = null

/**
 * ✅ ИСПРАВЛЕНО: Используем composable паттерн вместо прямого singleton экспорта
 * Это позволяет избежать ошибки getActivePinia при импорте модуля
 */
export function usePlannedDeliveryIntegration() {
  if (!integrationInstance) {
    integrationInstance = new PlannedDeliveryIntegration()
  }
  return integrationInstance
}

// ✅ Для обратной совместимости экспортируем объект с методом getInstance
export const plannedDeliveryIntegration = {
  getInstance: () => usePlannedDeliveryIntegration()
}
