// src/stores/storage/composables/useBatches.ts
import { ref, computed, readonly } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { useStorageStore } from '../storageStore'
import type { CreateTransitBatchData, StorageBatch, StorageDepartment } from '../types'

const MODULE_NAME = 'useBatches'

export function useBatches() {
  // Ленивое получение store
  const getStorageStore = () => useStorageStore()

  // Local state
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===========================
  // COMPUTED - Transit Batches
  // ===========================

  const transitBatches = computed(() => {
    const storageStore = getStorageStore()
    return storageStore.state.value.batches.filter(batch => batch.status === 'in_transit')
  })

  const transitMetrics = computed(() => {
    const batches = transitBatches.value
    const now = new Date()

    return {
      totalTransitOrders: new Set(batches.map(b => b.purchaseOrderId).filter(Boolean)).size,
      totalTransitItems: batches.length,
      totalTransitValue: batches.reduce((sum, b) => sum + b.totalValue, 0),

      overdueCount: batches.filter(
        b => b.plannedDeliveryDate && new Date(b.plannedDeliveryDate) < now
      ).length,

      dueTodayCount: batches.filter(b => {
        if (!b.plannedDeliveryDate) return false
        return TimeUtils.isToday(b.plannedDeliveryDate)
      }).length
    }
  })

  const deliveryAlerts = computed(() => {
    const alerts = []
    const now = new Date()
    const batches = transitBatches.value

    for (const batch of batches) {
      if (!batch.plannedDeliveryDate) continue

      const deliveryDate = new Date(batch.plannedDeliveryDate)
      const diffHours = (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60)

      if (diffHours > 24) {
        // Просрочена больше суток
        alerts.push({
          type: 'overdue',
          severity: diffHours > 72 ? 'critical' : 'warning',
          message: `Поставка ${batch.supplierName} просрочена на ${Math.floor(diffHours / 24)} дней`,
          batchId: batch.id,
          orderId: batch.purchaseOrderId,
          itemName: batch.itemId, // TODO: получать имя продукта
          daysOverdue: Math.floor(diffHours / 24)
        })
      } else if (diffHours > -24 && diffHours <= 0) {
        // Доставка сегодня
        alerts.push({
          type: 'due_today',
          severity: 'info',
          message: `Ожидается поставка от ${batch.supplierName}`,
          batchId: batch.id,
          orderId: batch.purchaseOrderId,
          itemName: batch.itemId // TODO: получать имя продукта
        })
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  })

  // ===========================
  // METHODS - Transit Operations
  // ===========================

  async function createTransitBatches(orderData: CreateTransitBatchData[]): Promise<string[]> {
    try {
      loading.value = true
      error.value = null
      const storageStore = getStorageStore() // Получаем store здесь
      const batchIds: string[] = []

      DebugUtils.info(MODULE_NAME, 'Creating transit batches', { count: orderData.length })

      // Защита от дубликатов - проверяем, не созданы ли уже batch-и для этого заказа
      const purchaseOrderId = orderData[0]?.purchaseOrderId
      if (purchaseOrderId) {
        const existingBatches = storageStore.state.value.batches.filter(
          batch => batch.purchaseOrderId === purchaseOrderId && batch.status === 'in_transit'
        )

        if (existingBatches.length > 0) {
          DebugUtils.warn(MODULE_NAME, 'Transit batches already exist for order', {
            purchaseOrderId,
            existingCount: existingBatches.length
          })
          return existingBatches.map(b => b.id)
        }
      }

      for (const item of orderData) {
        // Генерация уникального ID и номера
        const batchId = `transit-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const batchNumber = generateTransitBatchNumber()

        const batch: StorageBatch = {
          id: batchId,
          batchNumber,
          itemId: item.itemId,
          itemType: 'product',
          department: item.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: item.unit,
          costPerUnit: item.estimatedCostPerUnit,
          totalValue: item.quantity * item.estimatedCostPerUnit,
          receiptDate: item.plannedDeliveryDate,
          sourceType: 'purchase',
          status: 'in_transit',
          isActive: false, // Важно: не активен до получения

          // Новые поля для связи с заказами
          purchaseOrderId: item.purchaseOrderId,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          plannedDeliveryDate: item.plannedDeliveryDate,
          notes: item.notes || `Transit batch from order`,

          // BaseEntity поля
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Добавляем в начало массива (новые batch-и сверху)
        storageStore.state.value.batches.unshift(batch)
        batchIds.push(batchId)

        DebugUtils.info(MODULE_NAME, 'Transit batch created', {
          batchId,
          itemId: item.itemId,
          quantity: item.quantity,
          supplier: item.supplierName
        })
      }

      // Пересчитываем балансы
      await storageStore.recalculateAllBalances()

      return batchIds
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create transit batches'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, orderData })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function convertTransitBatchesToActive(
    purchaseOrderId: string,
    receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
  ): Promise<void> {
    try {
      loading.value = true
      error.value = null
      const storageStore = getStorageStore() // Получаем store здесь

      DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', {
        purchaseOrderId,
        itemsCount: receiptItems.length
      })

      // Находим все транзитные batch-и для данного заказа
      const transitBatches = storageStore.state.value.batches.filter(
        batch => batch.purchaseOrderId === purchaseOrderId && batch.status === 'in_transit'
      )

      if (transitBatches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No transit batches found for order', { purchaseOrderId })
        return
      }

      for (const receiptItem of receiptItems) {
        // Находим соответствующий транзитный batch
        const transitBatch = transitBatches.find(batch => batch.itemId === receiptItem.itemId)

        if (!transitBatch) {
          DebugUtils.warn(MODULE_NAME, 'No transit batch found for received item', {
            itemId: receiptItem.itemId,
            purchaseOrderId
          })
          continue
        }

        const originalQuantity = transitBatch.initialQuantity
        const receivedQuantity = receiptItem.receivedQuantity
        const actualPrice = receiptItem.actualPrice || transitBatch.costPerUnit

        // Обновляем batch для перехода в active статус
        transitBatch.status = 'active'
        transitBatch.isActive = true
        transitBatch.currentQuantity = receivedQuantity
        transitBatch.initialQuantity = receivedQuantity
        transitBatch.actualDeliveryDate = new Date().toISOString()
        transitBatch.updatedAt = new Date().toISOString()

        // Обновляем цену и стоимость, если отличается
        if (actualPrice !== transitBatch.costPerUnit) {
          const oldPrice = transitBatch.costPerUnit
          transitBatch.costPerUnit = actualPrice
          transitBatch.totalValue = receivedQuantity * actualPrice
          transitBatch.notes += ` | Price updated: ${oldPrice} → ${actualPrice}`
        } else {
          transitBatch.totalValue = receivedQuantity * actualPrice
        }

        // Логируем расхождения
        if (receivedQuantity !== originalQuantity) {
          if (receivedQuantity < originalQuantity) {
            transitBatch.notes += ` | Partial delivery: ${receivedQuantity}/${originalQuantity}`
          } else {
            transitBatch.notes += ` | Excess delivery: ${receivedQuantity}/${originalQuantity}`
          }
        }

        DebugUtils.info(MODULE_NAME, 'Transit batch converted to active', {
          batchId: transitBatch.id,
          itemId: receiptItem.itemId,
          originalQuantity,
          receivedQuantity,
          actualPrice
        })
      }

      // Пересчитываем балансы
      await storageStore.recalculateAllBalances()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert transit batches'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, purchaseOrderId })
      throw err
    } finally {
      loading.value = false
    }
  }

  function getTransitBatchesByOrder(purchaseOrderId: string): StorageBatch[] {
    return transitBatches.value.filter(batch => batch.purchaseOrderId === purchaseOrderId)
  }

  function generateTransitBatchNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
    const timeStr =
      date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0')
    const sequence = transitBatches.value.length + 1

    return `TRN-${dateStr}-${timeStr}-${sequence.toString().padStart(3, '0')}`
  }

  async function removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
    try {
      loading.value = true
      error.value = null
      const storageStore = getStorageStore() // Получаем store здесь

      DebugUtils.info(MODULE_NAME, 'Removing transit batches on order cancel', { orderId })

      // Находим и удаляем транзитные batch-и
      const transitBatchesToRemove = getTransitBatchesByOrder(orderId)

      if (transitBatchesToRemove.length > 0) {
        storageStore.state.value.batches = storageStore.state.value.batches.filter(
          batch => !(batch.purchaseOrderId === orderId && batch.status === 'in_transit')
        )

        await storageStore.recalculateAllBalances()

        DebugUtils.info(MODULE_NAME, 'Transit batches removed on order cancel', {
          orderId,
          removedBatches: transitBatchesToRemove.length
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove transit batches'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===========================
  // EXPORTS
  // ===========================

  return {
    // State
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    transitBatches: readonly(transitBatches),
    transitMetrics: readonly(transitMetrics),
    deliveryAlerts: readonly(deliveryAlerts),

    // Methods
    createTransitBatches,
    convertTransitBatchesToActive,
    getTransitBatchesByOrder,
    generateTransitBatchNumber,
    removeTransitBatchesOnOrderCancel
  }
}
