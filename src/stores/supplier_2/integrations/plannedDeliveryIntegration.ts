// src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts

import { DebugUtils } from '@/utils/debugger'
import type { PurchaseOrder, PurchaseOrderItem } from '@/types/supplier_2/supplier.types'
import type { PlannedDelivery, PlannedDeliveryItem } from '@/types/storage/storage.types'
import { useStorageStore } from '@/stores/storage/storageStore'

const MODULE_NAME = 'PlannedDeliveryIntegration'

/**
 * Интеграция планируемых поставок между SupplierStore и StorageStore
 *
 * Ключевые функции:
 * 1. Создание планируемых поставок при создании/подтверждении заказа
 * 2. Обновление планируемых дат поставок
 * 3. Синхронизация статусов заказов с планируемыми поставками
 * 4. Создание Batch при получении товаров
 */
export class PlannedDeliveryIntegration {
  private storageStore = useStorageStore()

  /**
   * Создает планируемую поставку на основе заказа
   */
  async createPlannedDelivery(order: PurchaseOrder): Promise<string> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating planned delivery for order', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        supplierName: order.supplierName,
        itemsCount: order.items.length
      })

      const plannedDelivery: Omit<PlannedDelivery, 'id'> = {
        orderNumber: order.orderNumber,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        purchaseOrderId: order.id,
        plannedDate: order.expectedDelivery || this.calculateDefaultDeliveryDate(order),
        status: this.mapOrderStatusToDeliveryStatus(order.status),
        items: order.items.map(item => this.mapOrderItemToDeliveryItem(item, order)),
        notes: `Planned delivery for order ${order.orderNumber}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Создаем планируемую поставку в StorageStore
      const deliveryId = await this.storageStore.createPlannedDelivery(plannedDelivery)

      DebugUtils.info(MODULE_NAME, 'Planned delivery created successfully', {
        deliveryId,
        orderId: order.id,
        plannedDate: plannedDelivery.plannedDate
      })

      return deliveryId
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create planned delivery', {
        orderId: order.id,
        error
      })
      throw new Error(`Failed to create planned delivery: ${error}`)
    }
  }

  /**
   * Обновляет планируемую поставку при изменении заказа
   */
  async updatePlannedDelivery(order: PurchaseOrder): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating planned delivery for order', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status
      })

      // Находим существующую планируемую поставку
      const existingDelivery = await this.storageStore.getPlannedDeliveryByOrderId(order.id)

      if (!existingDelivery) {
        DebugUtils.warn(MODULE_NAME, 'No planned delivery found for order - creating new', {
          orderId: order.id
        })
        await this.createPlannedDelivery(order)
        return
      }

      // Обновляем данные
      const updatedDelivery: Partial<PlannedDelivery> = {
        plannedDate: order.expectedDelivery || existingDelivery.plannedDate,
        status: this.mapOrderStatusToDeliveryStatus(order.status),
        items: order.items.map(item => this.mapOrderItemToDeliveryItem(item, order)),
        notes: existingDelivery.notes,
        updatedAt: new Date().toISOString()
      }

      await this.storageStore.updatePlannedDelivery(existingDelivery.id, updatedDelivery)

      DebugUtils.info(MODULE_NAME, 'Planned delivery updated successfully', {
        deliveryId: existingDelivery.id,
        orderId: order.id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update planned delivery', {
        orderId: order.id,
        error
      })
      throw new Error(`Failed to update planned delivery: ${error}`)
    }
  }

  /**
   * Удаляет планируемую поставку при отмене заказа
   */
  async cancelPlannedDelivery(orderId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Cancelling planned delivery for order', { orderId })

      const existingDelivery = await this.storageStore.getPlannedDeliveryByOrderId(orderId)

      if (!existingDelivery) {
        DebugUtils.warn(MODULE_NAME, 'No planned delivery found to cancel', { orderId })
        return
      }

      // Отмечаем как отмененную
      await this.storageStore.updatePlannedDelivery(existingDelivery.id, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'Planned delivery cancelled successfully', {
        deliveryId: existingDelivery.id,
        orderId
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cancel planned delivery', {
        orderId,
        error
      })
      throw new Error(`Failed to cancel planned delivery: ${error}`)
    }
  }

  /**
   * Создает Batch при получении товаров (receipt completed)
   */
  async createBatchFromReceipt(
    receiptId: string,
    orderId: string,
    receivedItems: any[]
  ): Promise<string[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating batches from receipt', {
        receiptId,
        orderId,
        itemsCount: receivedItems.length
      })

      const batchIds: string[] = []

      // Группируем товары по продуктам для создания батчей
      const itemsByProduct = this.groupReceiptItemsByProduct(receivedItems)

      for (const [productId, items] of itemsByProduct.entries()) {
        const batch = await this.createBatchForProduct(productId, items, receiptId, orderId)
        batchIds.push(batch.id)
      }

      // Обновляем статус планируемой поставки
      await this.markDeliveryAsReceived(orderId, batchIds)

      DebugUtils.info(MODULE_NAME, 'Batches created successfully', {
        receiptId,
        orderId,
        batchIds
      })

      return batchIds
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create batches from receipt', {
        receiptId,
        orderId,
        error
      })
      throw new Error(`Failed to create batches: ${error}`)
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  /**
   * Маппит статус заказа в статус планируемой поставки
   */
  private mapOrderStatusToDeliveryStatus(orderStatus: string): string {
    const statusMap: Record<string, string> = {
      draft: 'pending',
      sent: 'confirmed',
      confirmed: 'confirmed',
      delivered: 'received',
      cancelled: 'cancelled'
    }

    return statusMap[orderStatus] || 'pending'
  }

  /**
   * Маппит item заказа в item планируемой поставки
   */
  private mapOrderItemToDeliveryItem(
    orderItem: PurchaseOrderItem,
    order: PurchaseOrder
  ): PlannedDeliveryItem {
    return {
      id: `delivery-item-${orderItem.id}`,
      itemId: orderItem.itemId,
      itemName: orderItem.itemName,
      plannedQuantity: orderItem.orderedQuantity,
      unit: orderItem.unit,
      estimatedPrice: orderItem.pricePerUnit,
      department: this.getDepartmentFromOrder(order),
      notes: `From order ${order.orderNumber}`
    }
  }

  /**
   * Вычисляет дату поставки по умолчанию (через 3-7 дней)
   */
  private calculateDefaultDeliveryDate(order: PurchaseOrder): string {
    const orderDate = new Date(order.orderDate)
    const deliveryDate = new Date(orderDate)

    // Добавляем 5 дней по умолчанию
    deliveryDate.setDate(deliveryDate.getDate() + 5)

    return deliveryDate.toISOString()
  }

  /**
   * Определяет департамент из заказа
   */
  private getDepartmentFromOrder(order: PurchaseOrder): string {
    // Можно использовать requestIds для определения департамента
    // или использовать первый item для определения
    return 'kitchen' // TODO: Implement proper department detection
  }

  /**
   * Группирует полученные товары по продуктам
   */
  private groupReceiptItemsByProduct(receivedItems: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()

    receivedItems.forEach(item => {
      const productId = item.itemId
      if (!groups.has(productId)) {
        groups.set(productId, [])
      }
      groups.get(productId)!.push(item)
    })

    return groups
  }

  /**
   * Создает Batch для конкретного продукта
   */
  private async createBatchForProduct(
    productId: string,
    items: any[],
    receiptId: string,
    orderId: string
  ): Promise<any> {
    const totalQuantity = items.reduce((sum, item) => sum + item.receivedQuantity, 0)
    const avgPrice =
      items.reduce((sum, item) => sum + (item.actualPrice || item.estimatedPrice), 0) / items.length

    const batch = {
      itemId: productId,
      quantity: totalQuantity,
      unit: items[0].unit,
      costPerUnit: avgPrice,
      supplierId: items[0].supplierId, // Нужно передавать из receipt
      receiptId,
      orderId,
      status: 'received',
      receivedDate: new Date().toISOString(),
      expiryDate: this.calculateExpiryDate(productId),
      notes: `Batch from order receipt ${receiptId}`
    }

    return await this.storageStore.createBatch(batch)
  }

  /**
   * Вычисляет срок годности для продукта
   */
  private calculateExpiryDate(productId: string): string {
    // TODO: Получать срок годности из ProductStore
    const defaultShelfLifeDays = 30
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + defaultShelfLifeDays)
    return expiryDate.toISOString()
  }

  /**
   * Отмечает планируемую поставку как полученную
   */
  private async markDeliveryAsReceived(orderId: string, batchIds: string[]): Promise<void> {
    const delivery = await this.storageStore.getPlannedDeliveryByOrderId(orderId)

    if (delivery) {
      await this.storageStore.updatePlannedDelivery(delivery.id, {
        status: 'received',
        actualDeliveryDate: new Date().toISOString(),
        batchIds,
        updatedAt: new Date().toISOString()
      })
    }
  }
}

// Экспорт singleton instance
export const plannedDeliveryIntegration = new PlannedDeliveryIntegration()
