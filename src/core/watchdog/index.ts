// src/core/watchdog/index.ts
// Watchdog System - Public API

export { onReceiptCreated, onPreparationCreated, createWeeklyReport } from './WatchdogService'
export { WATCHDOG_THRESHOLDS } from './types'
export type {
  PriceCheckResult,
  PrepCostCheckResult,
  WeeklyCostReport,
  WeeklyCostChangeItem
} from './types'
