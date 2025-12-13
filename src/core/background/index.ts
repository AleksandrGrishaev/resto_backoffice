/**
 * Background Task Processing Module
 *
 * Provides non-blocking background processing for production and write-off operations.
 * Dialogs close immediately while operations continue in background with snackbar feedback.
 *
 * @module core/background
 */

export { useBackgroundTasks } from './useBackgroundTasks'
export type { TaskCallbacks } from './useBackgroundTasks'

export type {
  BackgroundTask,
  BackgroundTaskType,
  BackgroundTaskStatus,
  ProductionTaskPayload,
  ProductWriteOffTaskPayload,
  PrepWriteOffTaskPayload,
  ProductWriteOffItem,
  PrepWriteOffItem,
  TaskResult
} from './types'
