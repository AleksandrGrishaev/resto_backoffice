// src/core/sync/adapters/index.ts
// Sync Adapters Index - Export all sync adapters

// Shift management
export { ShiftSyncAdapter } from './ShiftSyncAdapter'

// Kitchen Preparation (Sprint 3)
export { PreparationBatchSyncAdapter } from './PreparationBatchSyncAdapter'
export type { PreparationBatchSyncData } from './PreparationBatchSyncAdapter'

export { PreparationWriteOffSyncAdapter } from './PreparationWriteOffSyncAdapter'
export type { PreparationWriteOffSyncData } from './PreparationWriteOffSyncAdapter'

export { ProductWriteOffSyncAdapter } from './ProductWriteOffSyncAdapter'
export type { ProductWriteOffSyncData } from './ProductWriteOffSyncAdapter'

export { ScheduleCompletionSyncAdapter } from './ScheduleCompletionSyncAdapter'
export type { ScheduleCompletionSyncData } from './ScheduleCompletionSyncAdapter'
