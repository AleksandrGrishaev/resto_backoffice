// src/stores/storage/composables/useBatches.ts
import { ref, computed, readonly, type Ref } from 'vue'
import { DebugUtils } from '@/utils/debugger'
import { generateId } from '@/utils/id'
import type {
  CreateTransitBatchData,
  StorageBatch,
  StorageDepartment,
  BatchAllocation,
  StorageState
} from '../types'

const MODULE_NAME = 'useBatches'

export function useBatches(state: Ref<StorageState>) {
  // Local state
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===========================
  // COMPUTED - Transit Batches
  // ===========================

  // ===========================
  // COMPUTED - Transit Batches
  // ===========================

  const transitBatches = computed(() => {
    return state.value.batches.filter(batch => batch.status === 'in_transit')
  })

  const transitMetrics = computed(() => {
    const batches = transitBatches.value
    const now = new Date()

    return {
      totalTransitOrders: new Set(batches.map(b => b.purchaseOrderId)).size,
      totalTransitItems: batches.length,
      totalTransitValue: batches.reduce((sum, b) => sum + b.totalValue, 0),

      overdueCount: batches.filter(
        b => b.plannedDeliveryDate && new Date(b.plannedDeliveryDate) < now
      ).length,

      dueTodayCount: batches.filter(b => {
        if (!b.plannedDeliveryDate) return false
        const deliveryDate = new Date(b.plannedDeliveryDate)
        const today = new Date()
        return deliveryDate.toDateString() === today.toDateString()
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
          itemName: batch.itemName || 'Неизвестный товар',
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
          itemName: batch.itemName || 'Неизвестный товар'
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

  async function createTransitBatches(
    orderData: CreateTransitBatchData[],
    onBalanceUpdate?: () => Promise<void>
  ): Promise<string[]> {
    try {
      loading.value = true
      error.value = null

      const batchIds: string[] = []

      // Защита от дубликатов - проверяем, не созданы ли уже batch-и для этого заказа
      const existingBatches = state.value.batches.filter(
        batch =>
          batch.purchaseOrderId === orderData[0]?.purchaseOrderId && batch.status === 'in_transit'
      )

      if (existingBatches.length > 0) {
        DebugUtils.warn(MODULE_NAME, 'Transit batches already exist for order', {
          purchaseOrderId: orderData[0]?.purchaseOrderId,
          existingCount: existingBatches.length
        })
        return existingBatches.map(b => b.id)
      }

      for (const item of orderData) {
        // Генерация уникального ID и номера
        const batchId = generateId()
        const batchNumber = generateTransitBatchNumber()

        const batch: StorageBatch = {
          id: batchId,
          batchNumber,
          itemId: item.itemId,
          itemName: item.itemName, // Кешируем для удобства отображения
          itemType: 'product',
          department: item.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: item.unit,
          costPerUnit: item.estimatedCostPerUnit,
          totalValue: item.quantity * item.estimatedCostPerUnit,
          receiptDate: item.plannedDeliveryDate, // Planned receipt date
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
        state.value.batches.unshift(batch)
        batchIds.push(batchId)

        DebugUtils.info(MODULE_NAME, 'Transit batch created', {
          batchId,
          itemId: item.itemId,
          quantity: item.quantity,
          supplier: item.supplierName
        })
      }

      // Пересчитываем балансы с учетом транзитных товаров если предоставлен callback
      if (onBalanceUpdate) {
        await onBalanceUpdate()
      }

      DebugUtils.info(MODULE_NAME, 'Transit batches created successfully', {
        totalBatches: batchIds.length,
        orderId: orderData[0]?.purchaseOrderId
      })

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
    receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>,
    onBalanceUpdate?: () => Promise<void>
  ): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Находим все транзитные batch-и для данного заказа
      const orderTransitBatches = state.value.batches.filter(
        batch => batch.purchaseOrderId === purchaseOrderId && batch.status === 'in_transit'
      )

      if (orderTransitBatches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No transit batches found for order', { purchaseOrderId })
        return
      }

      for (const receiptItem of receiptItems) {
        // Находим соответствующий транзитный batch
        const transitBatch = orderTransitBatches.find(batch => batch.itemId === receiptItem.itemId)

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

      // Пересчитываем балансы если предоставлен callback
      if (onBalanceUpdate) {
        await onBalanceUpdate()
      }

      DebugUtils.info(MODULE_NAME, 'Transit batches converted successfully', {
        orderId: purchaseOrderId,
        convertedItems: receiptItems.length
      })
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

  async function removeTransitBatchesOnOrderCancel(
    orderId: string,
    onBalanceUpdate?: () => Promise<void>
  ): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Находим и удаляем транзитные batch-и
      const transitBatchesToRemove = getTransitBatchesByOrder(orderId)

      if (transitBatchesToRemove.length > 0) {
        state.value.batches = state.value.batches.filter(
          batch => !(batch.purchaseOrderId === orderId && batch.status === 'in_transit')
        )

        if (onBalanceUpdate) {
          await onBalanceUpdate()
        }

        DebugUtils.info(MODULE_NAME, 'Transit batches removed on order cancel', {
          orderId,
          removedBatches: transitBatchesToRemove.length
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove transit batches'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, orderId })
      throw err
    } finally {
      loading.value = false
    }
  }

  function generateTransitBatchNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
    const timeStr =
      date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0')
    const sequence = state.value.batches.filter(b => b.status === 'in_transit').length + 1

    return `TRN-${dateStr}-${timeStr}-${sequence.toString().padStart(3, '0')}`
  }

  // Helper method to calculate FIFO allocation for future use
  function calculateFifoAllocation(
    availableBatches: StorageBatch[],
    requiredQuantity: number
  ): BatchAllocation[] {
    const allocations: BatchAllocation[] = []
    let remainingQuantity = requiredQuantity

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break

      const allocationQuantity = Math.min(batch.currentQuantity, remainingQuantity)

      if (allocationQuantity > 0) {
        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: allocationQuantity,
          costPerUnit: batch.costPerUnit,
          batchDate: batch.receiptDate
        })

        remainingQuantity -= allocationQuantity
      }
    }

    if (remainingQuantity > 0) {
      DebugUtils.warn(MODULE_NAME, 'Insufficient stock for operation', {
        requiredQuantity,
        allocatedQuantity: requiredQuantity - remainingQuantity,
        remainingQuantity
      })
    }

    return allocations
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
    removeTransitBatchesOnOrderCancel,
    generateTransitBatchNumber,
    calculateFifoAllocation
  }
}
