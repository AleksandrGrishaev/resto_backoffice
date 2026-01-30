/**
 * Background Task Processing Composable
 *
 * Provides non-blocking task execution for production and write-off operations.
 * Dialogs close immediately, operations continue in background with snackbar feedback.
 *
 * @example
 * ```typescript
 * const { addProductionTask, addProductWriteOffTask, addPrepWriteOffTask } = useBackgroundTasks()
 *
 * // In dialog submit handler:
 * await addProductionTask({
 *   receiptData,
 *   preparationName: 'Humus',
 *   onSuccess: (msg) => emit('success', msg),
 *   onError: (msg) => emit('error', msg)
 * })
 * handleClose() // Dialog closes immediately
 * ```
 */

import { ref, type Ref } from 'vue'
import { generateId } from '@/utils'
import { DebugUtils } from '@/utils/debugger'
import { usePreparationStore } from '@/stores/preparation/preparationStore'
import { usePreparationWriteOff } from '@/stores/preparation/composables/usePreparationWriteOff'
import { useWriteOff } from '@/stores/storage/composables/useWriteOff'
import { useKitchenKpiStore } from '@/stores/kitchenKpi/kitchenKpiStore'
import type {
  BackgroundTask,
  BackgroundTaskStatus,
  ProductionTaskPayload,
  ProductWriteOffTaskPayload,
  PrepWriteOffTaskPayload,
  ScheduleCompleteTaskPayload,
  ReceiptPriceUpdateTaskPayload,
  QuickReceiptStorageTaskPayload,
  ReadyWriteOffTaskPayload
} from './types'

const MODULE_NAME = 'BackgroundTasks'

// Maximum delay for exponential backoff (60 seconds)
const MAX_BACKOFF_DELAY_MS = 60 * 1000

/**
 * Calculate exponential backoff delay with max cap
 * @param attempt - Current attempt number (1-based)
 * @returns Delay in milliseconds, capped at MAX_BACKOFF_DELAY_MS
 */
function calculateBackoffDelay(attempt: number): number {
  const baseDelay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s, 16s, 32s...
  return Math.min(baseDelay, MAX_BACKOFF_DELAY_MS)
}

// ============================================================
// Global State (singleton across all components)
// ============================================================

const tasks: Ref<BackgroundTask[]> = ref([])
const isProcessing = ref(false)

// ============================================================
// Composable
// ============================================================

export interface TaskCallbacks {
  onQueued?: (message: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function useBackgroundTasks() {
  // ============================================================
  // Production Task
  // ============================================================

  async function addProductionTask(
    payload: ProductionTaskPayload,
    callbacks?: TaskCallbacks
  ): Promise<string> {
    const taskId = generateId()

    const task: BackgroundTask<ProductionTaskPayload> = {
      id: taskId,
      type: 'production',
      status: 'queued',
      description: `Producing ${payload.quantity}${payload.unit} of ${payload.preparationName}`,
      department: payload.receiptData.department as 'kitchen' | 'bar',
      createdBy: payload.receiptData.responsiblePerson,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    }

    tasks.value.push(task)
    DebugUtils.info(MODULE_NAME, 'Production task queued', {
      taskId,
      preparation: payload.preparationName
    })

    // Show queued notification
    callbacks?.onQueued?.(`Processing: ${payload.preparationName}...`)

    // Process immediately in background (no await!)
    processProductionTask(task, callbacks)

    return taskId
  }

  async function processProductionTask(
    task: BackgroundTask<ProductionTaskPayload>,
    callbacks?: TaskCallbacks
  ): Promise<void> {
    const preparationStore = usePreparationStore()
    const kpiStore = useKitchenKpiStore()
    const { payload } = task

    updateTaskStatus(task.id, 'processing')
    task.startedAt = new Date().toISOString()

    try {
      // Main operation: Create receipt (handles FIFO, batches, Supabase)
      DebugUtils.info(MODULE_NAME, 'Processing production task', { taskId: task.id })

      await preparationStore.createReceipt(payload.receiptData)

      // KPI recording (non-critical, don't fail if this errors)
      if (payload.kpiData) {
        try {
          await kpiStore.recordProduction(
            payload.kpiData.userId,
            payload.kpiData.userName,
            payload.kpiData.department,
            {
              preparationId: payload.preparationId,
              preparationName: payload.preparationName,
              quantity: payload.quantity,
              unit: payload.unit,
              value: payload.estimatedCost,
              timestamp: payload.kpiData.timestamp
            }
          )
        } catch (kpiError) {
          DebugUtils.warn(MODULE_NAME, 'KPI recording failed (non-critical)', { kpiError })
        }
      }

      // Success
      updateTaskStatus(task.id, 'completed')
      task.completedAt = new Date().toISOString()

      const successMessage = `Produced ${payload.quantity}${payload.unit} of ${payload.preparationName}`
      DebugUtils.info(MODULE_NAME, 'Production task completed', { taskId: task.id })
      callbacks?.onSuccess?.(successMessage)

      // Remove task after delay
      setTimeout(() => removeTask(task.id), 5000)
    } catch (error) {
      task.attempts++
      task.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (task.attempts < task.maxAttempts) {
        // Retry with exponential backoff
        const delay = calculateBackoffDelay(task.attempts)
        DebugUtils.warn(MODULE_NAME, 'Production task failed, retrying', {
          taskId: task.id,
          attempt: task.attempts,
          delay
        })
        setTimeout(() => processProductionTask(task, callbacks), delay)
      } else {
        // Final failure
        updateTaskStatus(task.id, 'failed')
        const errorMessage = `Production failed: ${task.lastError}`
        DebugUtils.error(MODULE_NAME, 'Production task failed permanently', {
          taskId: task.id,
          error: task.lastError
        })
        callbacks?.onError?.(errorMessage)
      }
    }
  }

  // ============================================================
  // Product Write-Off Task
  // ============================================================

  async function addProductWriteOffTask(
    payload: ProductWriteOffTaskPayload,
    callbacks?: TaskCallbacks
  ): Promise<string> {
    const taskId = generateId()
    const itemCount = payload.items.length
    const description =
      itemCount === 1
        ? `Writing off ${payload.items[0].itemName}`
        : `Writing off ${itemCount} products`

    const task: BackgroundTask<ProductWriteOffTaskPayload> = {
      id: taskId,
      type: 'product_writeoff',
      status: 'queued',
      description,
      department: payload.department,
      createdBy: payload.responsiblePerson,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    }

    tasks.value.push(task)
    DebugUtils.info(MODULE_NAME, 'Product write-off task queued', { taskId, itemCount })

    callbacks?.onQueued?.(`Processing write-off...`)

    // Process immediately in background
    processProductWriteOffTask(task, callbacks)

    return taskId
  }

  async function processProductWriteOffTask(
    task: BackgroundTask<ProductWriteOffTaskPayload>,
    callbacks?: TaskCallbacks
  ): Promise<void> {
    const writeOff = useWriteOff()
    const kpiStore = useKitchenKpiStore()
    const { payload } = task

    updateTaskStatus(task.id, 'processing')
    task.startedAt = new Date().toISOString()

    try {
      // Main operation: Write off products via useWriteOff composable
      DebugUtils.info(MODULE_NAME, 'Processing product write-off task', { taskId: task.id })

      await writeOff.writeOffMultipleProducts(
        payload.items.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          currentQuantity: 0, // Not used, will be fetched
          unit: item.unit,
          writeOffQuantity: item.quantity,
          reason: payload.reason as any,
          notes: payload.notes
        })),
        payload.department,
        payload.responsiblePerson,
        payload.reason as any,
        payload.notes
      )

      // KPI recording for each item (non-critical)
      if (payload.kpiData) {
        for (const item of payload.items) {
          try {
            await kpiStore.recordWriteoff(
              payload.kpiData.userId,
              payload.kpiData.userName,
              payload.department,
              {
                itemId: item.itemId,
                itemName: item.itemName,
                itemType: 'product',
                quantity: item.quantity,
                unit: item.unit,
                reason: payload.reason,
                affectsKpi: payload.kpiData.affectsKpi
              }
            )
          } catch (kpiError) {
            DebugUtils.warn(MODULE_NAME, 'KPI recording failed for item (non-critical)', {
              item: item.itemName,
              kpiError
            })
          }
        }
      }

      // Success
      updateTaskStatus(task.id, 'completed')
      task.completedAt = new Date().toISOString()

      const itemCount = payload.items.length
      const successMessage =
        itemCount === 1
          ? `${payload.items[0].itemName} written off`
          : `${itemCount} products written off`

      DebugUtils.info(MODULE_NAME, 'Product write-off task completed', { taskId: task.id })
      callbacks?.onSuccess?.(successMessage)

      setTimeout(() => removeTask(task.id), 5000)
    } catch (error) {
      task.attempts++
      task.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (task.attempts < task.maxAttempts) {
        const delay = calculateBackoffDelay(task.attempts)
        DebugUtils.warn(MODULE_NAME, 'Product write-off task failed, retrying', {
          taskId: task.id,
          attempt: task.attempts
        })
        setTimeout(() => processProductWriteOffTask(task, callbacks), delay)
      } else {
        updateTaskStatus(task.id, 'failed')
        const errorMessage = `Write-off failed: ${task.lastError}`
        DebugUtils.error(MODULE_NAME, 'Product write-off task failed permanently', {
          taskId: task.id
        })
        callbacks?.onError?.(errorMessage)
      }
    }
  }

  // ============================================================
  // Preparation Write-Off Task
  // ============================================================

  async function addPrepWriteOffTask(
    payload: PrepWriteOffTaskPayload,
    callbacks?: TaskCallbacks
  ): Promise<string> {
    const taskId = generateId()
    const itemCount = payload.items.length
    const description =
      itemCount === 1
        ? `Writing off ${payload.items[0].preparationName}`
        : `Writing off ${itemCount} preparations`

    const task: BackgroundTask<PrepWriteOffTaskPayload> = {
      id: taskId,
      type: 'preparation_writeoff',
      status: 'queued',
      description,
      department: payload.department,
      createdBy: payload.responsiblePerson,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    }

    tasks.value.push(task)
    DebugUtils.info(MODULE_NAME, 'Preparation write-off task queued', { taskId, itemCount })

    callbacks?.onQueued?.(`Processing write-off...`)

    // Process immediately in background
    processPrepWriteOffTask(task, callbacks)

    return taskId
  }

  async function processPrepWriteOffTask(
    task: BackgroundTask<PrepWriteOffTaskPayload>,
    callbacks?: TaskCallbacks
  ): Promise<void> {
    const prepWriteOff = usePreparationWriteOff()
    const kpiStore = useKitchenKpiStore()
    const { payload } = task

    updateTaskStatus(task.id, 'processing')
    task.startedAt = new Date().toISOString()

    try {
      // Main operation: Write off preparations via usePreparationWriteOff composable
      DebugUtils.info(MODULE_NAME, 'Processing preparation write-off task', { taskId: task.id })

      await prepWriteOff.writeOffMultiplePreparations(
        payload.items.map(item => ({
          preparationId: item.preparationId,
          preparationName: item.preparationName,
          currentQuantity: 0, // Not used, will be fetched
          unit: item.unit,
          writeOffQuantity: item.quantity,
          reason: payload.reason as any,
          notes: payload.notes
        })),
        payload.department,
        payload.responsiblePerson,
        payload.reason as any,
        payload.notes
      )

      // KPI recording for each item (non-critical)
      if (payload.kpiData) {
        for (const item of payload.items) {
          try {
            await kpiStore.recordWriteoff(
              payload.kpiData.userId,
              payload.kpiData.userName,
              payload.department,
              {
                itemId: item.preparationId,
                itemName: item.preparationName,
                itemType: 'preparation',
                quantity: item.quantity,
                unit: item.unit,
                reason: payload.reason,
                affectsKpi: payload.kpiData.affectsKpi
              }
            )
          } catch (kpiError) {
            DebugUtils.warn(MODULE_NAME, 'KPI recording failed for item (non-critical)', {
              item: item.preparationName,
              kpiError
            })
          }
        }
      }

      // Success
      updateTaskStatus(task.id, 'completed')
      task.completedAt = new Date().toISOString()

      const itemCount = payload.items.length
      const successMessage =
        itemCount === 1
          ? `${payload.items[0].preparationName} written off`
          : `${itemCount} preparations written off`

      DebugUtils.info(MODULE_NAME, 'Preparation write-off task completed', { taskId: task.id })
      callbacks?.onSuccess?.(successMessage)

      setTimeout(() => removeTask(task.id), 5000)
    } catch (error) {
      task.attempts++
      task.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (task.attempts < task.maxAttempts) {
        const delay = calculateBackoffDelay(task.attempts)
        DebugUtils.warn(MODULE_NAME, 'Preparation write-off task failed, retrying', {
          taskId: task.id,
          attempt: task.attempts
        })
        setTimeout(() => processPrepWriteOffTask(task, callbacks), delay)
      } else {
        updateTaskStatus(task.id, 'failed')
        const errorMessage = `Write-off failed: ${task.lastError}`
        DebugUtils.error(MODULE_NAME, 'Preparation write-off task failed permanently', {
          taskId: task.id
        })
        callbacks?.onError?.(errorMessage)
      }
    }
  }

  // ============================================================
  // Schedule Complete Task
  // ============================================================

  async function addScheduleCompleteTask(
    payload: ScheduleCompleteTaskPayload,
    callbacks?: TaskCallbacks
  ): Promise<string> {
    const taskId = generateId()
    const description = `Completing ${payload.preparationName} (${payload.completedQuantity}${payload.unit})`

    const task: BackgroundTask<ScheduleCompleteTaskPayload> = {
      id: taskId,
      type: 'schedule_complete',
      status: 'queued',
      description,
      department: payload.department,
      createdBy: payload.responsiblePerson,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    }

    tasks.value.push(task)
    DebugUtils.info(MODULE_NAME, 'Schedule complete task queued', {
      taskId,
      scheduleTaskId: payload.taskId,
      preparation: payload.preparationName
    })

    callbacks?.onQueued?.(`Completing: ${payload.preparationName}...`)

    // Process immediately in background
    processScheduleCompleteTask(task, callbacks)

    return taskId
  }

  async function processScheduleCompleteTask(
    task: BackgroundTask<ScheduleCompleteTaskPayload>,
    callbacks?: TaskCallbacks
  ): Promise<void> {
    const preparationStore = usePreparationStore()
    const kpiStore = useKitchenKpiStore()
    const { payload } = task

    updateTaskStatus(task.id, 'processing')
    task.startedAt = new Date().toISOString()

    try {
      DebugUtils.info(MODULE_NAME, 'Processing schedule complete task', { taskId: task.id })

      // Step 1: Create production receipt
      const receipt = await preparationStore.createReceipt(payload.receiptData)

      // Step 2: Mark schedule task as completed
      await kpiStore.completeTask({
        taskId: payload.taskId,
        completedBy: payload.responsiblePersonId || undefined, // UUID for database, undefined if empty
        completedByName: payload.responsiblePerson, // Display name
        completedQuantity: payload.completedQuantity,
        notes: payload.notes,
        preparationBatchId: receipt?.id
      })

      // Step 3: Record KPI (non-critical)
      if (payload.kpiData) {
        try {
          await kpiStore.recordScheduleCompletion(
            payload.kpiData.userId,
            payload.kpiData.userName,
            payload.department,
            {
              scheduleItemId: payload.taskId,
              preparationId: payload.preparationId,
              preparationName: payload.preparationName,
              targetQuantity: payload.targetQuantity,
              actualQuantity: payload.completedQuantity,
              productionSlot: payload.productionSlot,
              isOnTime: payload.kpiData.isOnTime,
              timestamp: new Date().toISOString()
            }
          )
        } catch (kpiError) {
          DebugUtils.warn(MODULE_NAME, 'Schedule KPI recording failed (non-critical)', { kpiError })
        }
      }

      // Success
      updateTaskStatus(task.id, 'completed')
      task.completedAt = new Date().toISOString()

      const successMessage = `${payload.preparationName} completed (${payload.completedQuantity}${payload.unit})`
      DebugUtils.info(MODULE_NAME, 'Schedule complete task finished', { taskId: task.id })
      callbacks?.onSuccess?.(successMessage)

      setTimeout(() => removeTask(task.id), 5000)
    } catch (error) {
      task.attempts++
      task.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (task.attempts < task.maxAttempts) {
        const delay = calculateBackoffDelay(task.attempts)
        DebugUtils.warn(MODULE_NAME, 'Schedule complete task failed, retrying', {
          taskId: task.id,
          attempt: task.attempts
        })
        setTimeout(() => processScheduleCompleteTask(task, callbacks), delay)
      } else {
        updateTaskStatus(task.id, 'failed')
        const errorMessage = `Schedule completion failed: ${task.lastError}`
        DebugUtils.error(MODULE_NAME, 'Schedule complete task failed permanently', {
          taskId: task.id
        })
        callbacks?.onError?.(errorMessage)
      }
    }
  }

  // ============================================================
  // Receipt Price Update Task
  // ============================================================

  async function addReceiptPriceUpdateTask(
    payload: ReceiptPriceUpdateTaskPayload,
    callbacks?: TaskCallbacks
  ): Promise<string> {
    const taskId = generateId()

    const task: BackgroundTask<ReceiptPriceUpdateTaskPayload> = {
      id: taskId,
      type: 'receipt_price_update',
      status: 'queued',
      description: `Updating prices from ${payload.receiptNumber}`,
      department: 'kitchen', // Receipt price updates are cross-department
      createdBy: 'System',
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    }

    tasks.value.push(task)
    DebugUtils.info(MODULE_NAME, 'Receipt price update task queued', {
      taskId,
      receiptNumber: payload.receiptNumber
    })

    // Show queued notification (optional)
    callbacks?.onQueued?.(`Updating product prices from ${payload.receiptNumber}...`)

    // Process immediately in background (no await!)
    processReceiptPriceUpdateTask(task, callbacks)

    return taskId
  }

  async function processReceiptPriceUpdateTask(
    task: BackgroundTask<ReceiptPriceUpdateTaskPayload>,
    callbacks?: TaskCallbacks
  ): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { useSupplierStorageIntegration } = await import(
      '@/stores/supplier_2/integrations/storageIntegration'
    )
    const { useReceipts } = await import('@/stores/supplier_2/composables/useReceipts')

    const storageIntegration = useSupplierStorageIntegration()
    const { getReceiptById } = useReceipts()
    const { payload } = task

    updateTaskStatus(task.id, 'processing')
    task.startedAt = new Date().toISOString()

    try {
      // Get receipt data
      const receipt = getReceiptById(payload.receiptId)
      if (!receipt) {
        throw new Error(`Receipt ${payload.receiptId} not found`)
      }

      DebugUtils.info(MODULE_NAME, 'Processing receipt price update task', {
        taskId: task.id,
        receiptNumber: payload.receiptNumber,
        itemsCount: receipt.items.length
      })

      // Main operation: Update product prices
      await storageIntegration.updateProductPrices(receipt)

      // Success
      updateTaskStatus(task.id, 'completed')
      task.completedAt = new Date().toISOString()

      const successMessage = `Product prices updated from ${payload.receiptNumber}`

      DebugUtils.info(MODULE_NAME, 'Receipt price update task completed', {
        taskId: task.id,
        itemsCount: receipt.items.length
      })
      callbacks?.onSuccess?.(successMessage)

      // Remove task after 5 seconds
      setTimeout(() => removeTask(task.id), 5000)
    } catch (error) {
      task.attempts++
      task.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (task.attempts < task.maxAttempts) {
        const delay = calculateBackoffDelay(task.attempts)
        DebugUtils.warn(MODULE_NAME, 'Receipt price update task failed, retrying', {
          taskId: task.id,
          attempt: task.attempts,
          delay
        })
        setTimeout(() => processReceiptPriceUpdateTask(task, callbacks), delay)
      } else {
        updateTaskStatus(task.id, 'failed')
        const errorMessage = `Price update failed: ${task.lastError}`
        DebugUtils.error(MODULE_NAME, 'Receipt price update task failed permanently', {
          taskId: task.id,
          error: task.lastError
        })
        callbacks?.onError?.(errorMessage)
      }
    }
  }

  // ============================================================
  // Quick Receipt Storage Task
  // ============================================================

  async function addQuickReceiptStorageTask(
    payload: QuickReceiptStorageTaskPayload,
    callbacks?: TaskCallbacks
  ): Promise<string> {
    const taskId = generateId()
    const description = `Processing storage for ${payload.receiptNumber}`

    const task: BackgroundTask<QuickReceiptStorageTaskPayload> = {
      id: taskId,
      type: 'quick_receipt_storage',
      status: 'queued',
      description,
      department: 'kitchen',
      createdBy: 'Quick Entry',
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    }

    tasks.value.push(task)
    DebugUtils.info(MODULE_NAME, 'Quick receipt storage task queued', {
      taskId,
      receiptNumber: payload.receiptNumber,
      orderNumber: payload.orderNumber
    })

    callbacks?.onQueued?.(`Processing storage for ${payload.receiptNumber}...`)

    // Process immediately in background
    processQuickReceiptStorageTask(task, callbacks)

    return taskId
  }

  async function processQuickReceiptStorageTask(
    task: BackgroundTask<QuickReceiptStorageTaskPayload>,
    callbacks?: TaskCallbacks
  ): Promise<void> {
    const { payload } = task

    updateTaskStatus(task.id, 'processing')
    task.startedAt = new Date().toISOString()

    try {
      DebugUtils.info(MODULE_NAME, 'Processing quick receipt storage task', { taskId: task.id })

      // Dynamically import to avoid circular dependencies
      const { useSupplierStorageIntegration } = await import(
        '@/stores/supplier_2/integrations/storageIntegration'
      )

      const storageIntegration = useSupplierStorageIntegration()

      // Map payload to Receipt and Order types
      const receipt = {
        id: payload.receiptId,
        receiptNumber: payload.receiptNumber,
        purchaseOrderId: payload.orderId,
        deliveryDate: payload.deliveryDate,
        receivedBy: 'Quick Entry',
        items: payload.items.map(item => ({
          ...item,
          notes: ''
        })),
        hasDiscrepancies: false,
        status: 'completed' as const,
        notes: '',
        closedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const order = {
        id: payload.orderId,
        orderNumber: payload.orderNumber,
        supplierId: '',
        supplierName: payload.supplierName,
        orderDate: new Date().toISOString(),
        expectedDeliveryDate: payload.deliveryDate,
        totalAmount: payload.items.reduce(
          (sum, item) => sum + item.receivedQuantity * item.actualBaseCost,
          0
        ),
        isEstimatedTotal: false,
        status: 'delivered' as const,
        billStatus: 'not_billed' as const,
        receiptId: payload.receiptId,
        requestIds: [],
        items: payload.items.map(item => ({
          id: item.orderItemId,
          orderId: payload.orderId,
          itemId: item.itemId,
          itemName: item.itemName,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          unit: item.unit,
          packageId: item.packageId,
          packageName: item.packageName,
          packageQuantity: item.orderedPackageQuantity,
          packageUnit: item.packageUnit,
          pricePerUnit: item.orderedBaseCost,
          packagePrice: item.orderedPrice,
          totalPrice: item.orderedQuantity * item.orderedBaseCost,
          isEstimatedPrice: false,
          status: 'received' as const
        })),
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Create storage operation (batches + reconciliation)
      // Note: Price update already done by RPC, but storageService may do it again
      // which is non-critical and ensures compatibility with other flows
      await storageIntegration.createReceiptOperation(receipt, order)

      // Success
      updateTaskStatus(task.id, 'completed')
      task.completedAt = new Date().toISOString()

      const successMessage = `Storage processed for ${payload.receiptNumber}`
      DebugUtils.info(MODULE_NAME, 'Quick receipt storage task completed', { taskId: task.id })
      callbacks?.onSuccess?.(successMessage)

      setTimeout(() => removeTask(task.id), 5000)
    } catch (error) {
      task.attempts++
      task.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (task.attempts < task.maxAttempts) {
        const delay = calculateBackoffDelay(task.attempts)
        DebugUtils.warn(MODULE_NAME, 'Quick receipt storage task failed, retrying', {
          taskId: task.id,
          attempt: task.attempts,
          delay
        })
        setTimeout(() => processQuickReceiptStorageTask(task, callbacks), delay)
      } else {
        updateTaskStatus(task.id, 'failed')
        const errorMessage = `Storage processing failed: ${task.lastError}`
        DebugUtils.error(MODULE_NAME, 'Quick receipt storage task failed permanently', {
          taskId: task.id,
          error: task.lastError
        })
        callbacks?.onError?.(errorMessage)
      }
    }
  }

  // ============================================================
  // Ready Write-Off Task (Kitchen Ready-Triggered)
  // ============================================================

  async function addReadyWriteOffTask(
    payload: ReadyWriteOffTaskPayload,
    callbacks?: TaskCallbacks
  ): Promise<string> {
    const taskId = generateId()
    const description = `Write-off: ${payload.menuItemName} (${payload.quantity}x)`

    const task: BackgroundTask<ReadyWriteOffTaskPayload> = {
      id: taskId,
      type: 'ready_writeoff',
      status: 'queued',
      description,
      department: payload.department,
      createdBy: 'Kitchen',
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 5 // More retries for critical operations
    }

    tasks.value.push(task)
    DebugUtils.info(MODULE_NAME, 'Ready write-off task queued', {
      taskId,
      orderId: payload.orderId,
      itemId: payload.itemId,
      menuItem: payload.menuItemName
    })

    callbacks?.onQueued?.(`Processing write-off: ${payload.menuItemName}...`)

    // Process immediately in background
    processReadyWriteOffTask(task, callbacks)

    return taskId
  }

  async function processReadyWriteOffTask(
    task: BackgroundTask<ReadyWriteOffTaskPayload>,
    callbacks?: TaskCallbacks
  ): Promise<void> {
    const { payload } = task

    updateTaskStatus(task.id, 'processing')
    task.startedAt = new Date().toISOString()

    try {
      DebugUtils.info(MODULE_NAME, 'Processing ready write-off task', {
        taskId: task.id,
        itemId: payload.itemId
      })

      // Dynamic imports to avoid circular dependencies
      const { useRecipeWriteOffStore } = await import('@/stores/sales/recipeWriteOff')
      const recipeWriteOffStore = useRecipeWriteOffStore()

      // Execute the ready-triggered write-off
      const result = await recipeWriteOffStore.executeReadyTriggeredWriteOff({
        orderId: payload.orderId,
        itemId: payload.itemId,
        menuItemId: payload.menuItemId,
        variantId: payload.variantId,
        quantity: payload.quantity,
        selectedModifiers: payload.selectedModifiers
      })

      // ✅ FIX: Validate write-off result structure thoroughly
      if (!result) {
        throw new Error('Write-off returned no result')
      }

      if (!result.storageOperationId || typeof result.storageOperationId !== 'string') {
        throw new Error('Write-off result missing storageOperationId')
      }

      if (!result.recipeWriteOffId || typeof result.recipeWriteOffId !== 'string') {
        throw new Error('Write-off result missing recipeWriteOffId')
      }

      if (!result.actualCost || typeof result.actualCost.totalCost !== 'number') {
        throw new Error('Write-off result missing or invalid actualCost')
      }

      // Update the order item with write-off data
      const { supabase } = await import('@/supabase/client')
      const { error: updateError } = await supabase
        .from('order_items')
        .update({
          write_off_status: 'completed',
          write_off_at: new Date().toISOString(),
          write_off_triggered_by: 'kitchen_ready',
          cached_actual_cost: result.actualCost,
          recipe_writeoff_id: result.recipeWriteOffId,
          write_off_operation_id: result.storageOperationId
        })
        .eq('id', payload.itemId)

      if (updateError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update order_items', { error: updateError })
        // Continue - the write-off itself succeeded
      }

      // Success
      updateTaskStatus(task.id, 'completed')
      task.completedAt = new Date().toISOString()

      const successMessage = `Write-off completed: ${payload.menuItemName}`
      DebugUtils.info(MODULE_NAME, 'Ready write-off task completed', {
        taskId: task.id,
        storageOperationId: result.storageOperationId,
        recipeWriteOffId: result.recipeWriteOffId
      })
      callbacks?.onSuccess?.(successMessage)

      setTimeout(() => removeTask(task.id), 5000)
    } catch (error) {
      task.attempts++
      task.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (task.attempts < task.maxAttempts) {
        const delay = calculateBackoffDelay(task.attempts)
        DebugUtils.warn(MODULE_NAME, 'Ready write-off task failed, retrying', {
          taskId: task.id,
          attempt: task.attempts,
          delay
        })
        setTimeout(() => processReadyWriteOffTask(task, callbacks), delay)
      } else {
        updateTaskStatus(task.id, 'failed')
        const errorMessage = `Write-off failed: ${task.lastError}`
        DebugUtils.error(MODULE_NAME, 'Ready write-off task failed permanently', {
          taskId: task.id,
          error: task.lastError
        })
        callbacks?.onError?.(errorMessage)
      }
    }
  }

  // ============================================================
  // Helper Functions
  // ============================================================

  function updateTaskStatus(taskId: string, status: BackgroundTaskStatus): void {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = status
    }
  }

  function removeTask(taskId: string): void {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
    }
  }

  function getTaskById(taskId: string): BackgroundTask | undefined {
    return tasks.value.find(t => t.id === taskId)
  }

  // ============================================================
  // Computed Getters
  // ============================================================

  const pendingTasks = () => tasks.value.filter(t => t.status === 'queued')
  const processingTasks = () => tasks.value.filter(t => t.status === 'processing')
  const failedTasks = () => tasks.value.filter(t => t.status === 'failed')
  const hasPendingTasks = () =>
    tasks.value.some(t => t.status === 'queued' || t.status === 'processing')

  // ============================================================
  // Return
  // ============================================================

  return {
    // State
    tasks,
    isProcessing,

    // Task creators
    addProductionTask,
    addProductWriteOffTask,
    addPrepWriteOffTask,
    addScheduleCompleteTask,
    addReceiptPriceUpdateTask,
    addQuickReceiptStorageTask,
    addReadyWriteOffTask,

    // Getters
    getTaskById,
    pendingTasks,
    processingTasks,
    failedTasks,
    hasPendingTasks,

    // Actions
    removeTask
  }
}
