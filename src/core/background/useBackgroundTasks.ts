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
  ScheduleCompleteTaskPayload
} from './types'

const MODULE_NAME = 'BackgroundTasks'

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
        const delay = Math.pow(2, task.attempts) * 1000
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
        const delay = Math.pow(2, task.attempts) * 1000
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
        const delay = Math.pow(2, task.attempts) * 1000
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
        const delay = Math.pow(2, task.attempts) * 1000
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
