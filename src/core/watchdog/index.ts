// src/core/watchdog/index.ts
// Watchdog System - Public API

export {
  onReceiptCreated,
  onPreparationCreated,
  createWeeklyReport,
  onItemCancelled,
  getShiftCancellationSummary
} from './WatchdogService'
export { preCheckReceiptItems, preCheckPrepQuantity } from './preCheck'
export { WATCHDOG_THRESHOLDS } from './types'
export type {
  PriceCheckResult,
  PrepCostCheckResult,
  WeeklyCostReport,
  WeeklyCostChangeItem
} from './types'
export type { PreCheckResult, QuantityWarning, PriceWarning } from './preCheck'
export type { CancellationShiftSummary, CancelledItemRecord } from './checkers/cancellationChecker'
