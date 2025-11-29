// src/composables/useBackgroundTasks.ts
import { ref } from 'vue'

interface BackgroundTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
  startedAt?: number
  completedAt?: number
}

/**
 * Composable for managing background tasks
 * Used for optimistic UI updates - run heavy operations in background
 */
export function useBackgroundTasks() {
  const tasks = ref<BackgroundTask[]>([])
  const isProcessing = ref(false)

  /**
   * Queue a background task
   * Returns immediately, task runs asynchronously
   */
  async function queueTask(
    name: string,
    taskFn: () => Promise<void>,
    options?: {
      silent?: boolean // Don't show notifications
      critical?: boolean // Log errors even if silent
    }
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const task: BackgroundTask = {
      id: taskId,
      name,
      status: 'pending'
    }

    tasks.value.push(task)
    isProcessing.value = true

    // Run task asynchronously (don't await)
    runTask(task, taskFn, options).finally(() => {
      // Check if all tasks are completed
      const hasPendingTasks = tasks.value.some(
        t => t.status === 'pending' || t.status === 'running'
      )
      if (!hasPendingTasks) {
        isProcessing.value = false
      }
    })

    return taskId
  }

  /**
   * Run task in background
   */
  async function runTask(
    task: BackgroundTask,
    taskFn: () => Promise<void>,
    options?: {
      silent?: boolean
      critical?: boolean
    }
  ): Promise<void> {
    try {
      task.status = 'running'
      task.startedAt = Date.now()

      if (!options?.silent) {
        console.log(`🔄 [BackgroundTask] Starting: ${task.name}`)
      }

      await taskFn()

      task.status = 'completed'
      task.completedAt = Date.now()

      if (!options?.silent) {
        const duration = task.completedAt - (task.startedAt || 0)
        console.log(`✅ [BackgroundTask] Completed: ${task.name} (${duration}ms)`)
      }
    } catch (err) {
      task.status = 'failed'
      task.completedAt = Date.now()
      task.error = err instanceof Error ? err.message : 'Unknown error'

      if (options?.critical || !options?.silent) {
        console.error(`❌ [BackgroundTask] Failed: ${task.name}`, task.error)
      }
    }
  }

  /**
   * Wait for specific task to complete
   */
  async function waitForTask(taskId: string, timeoutMs = 30000): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const task = tasks.value.find(t => t.id === taskId)

      if (!task) return false
      if (task.status === 'completed') return true
      if (task.status === 'failed') return false

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return false // Timeout
  }

  /**
   * Wait for all tasks to complete
   */
  async function waitForAllTasks(timeoutMs = 30000): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const hasPendingTasks = tasks.value.some(
        t => t.status === 'pending' || t.status === 'running'
      )

      if (!hasPendingTasks) {
        // Check if any failed
        const hasFailedTasks = tasks.value.some(t => t.status === 'failed')
        return !hasFailedTasks
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return false // Timeout
  }

  /**
   * Get task status
   */
  function getTaskStatus(taskId: string): BackgroundTask | undefined {
    return tasks.value.find(t => t.id === taskId)
  }

  /**
   * Clear completed tasks (cleanup)
   */
  function clearCompletedTasks(): void {
    tasks.value = tasks.value.filter(t => t.status !== 'completed')
  }

  /**
   * Clear all tasks
   */
  function clearAllTasks(): void {
    tasks.value = []
    isProcessing.value = false
  }

  return {
    tasks,
    isProcessing,
    queueTask,
    waitForTask,
    waitForAllTasks,
    getTaskStatus,
    clearCompletedTasks,
    clearAllTasks
  }
}
