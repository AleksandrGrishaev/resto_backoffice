/**
 * Background Task Processing Types
 *
 * Types for non-blocking background processing of production and write-off operations.
 * Allows dialogs to close immediately while operations continue in background.
 */

import type { CreatePreparationReceiptData } from '@/stores/preparation/preparationService'

// ============================================================
// Task Types
// ============================================================

export type BackgroundTaskType =
  | 'production'
  | 'product_writeoff'
  | 'preparation_writeoff'
  | 'schedule_complete'

export type BackgroundTaskStatus = 'queued' | 'processing' | 'completed' | 'failed'

// ============================================================
// Task Interfaces
// ============================================================

export interface BackgroundTask<T = unknown> {
  id: string
  type: BackgroundTaskType
  status: BackgroundTaskStatus

  // Display info
  description: string // e.g., "Producing Humus 200g"
  department: 'kitchen' | 'bar'
  createdBy: string

  // Payload
  payload: T

  // Tracking
  createdAt: string
  startedAt?: string
  completedAt?: string

  // Error handling
  attempts: number
  maxAttempts: number
  lastError?: string
}

// ============================================================
// Production Task
// ============================================================

export interface ProductionTaskPayload {
  receiptData: CreatePreparationReceiptData
  preparationName: string
  preparationId: string
  quantity: number
  unit: string
  estimatedCost: number

  // KPI data (optional, non-critical)
  kpiData?: {
    userId: string
    userName: string
    department: 'kitchen' | 'bar'
    value: number
    timestamp: string
  }
}

export type ProductionTask = BackgroundTask<ProductionTaskPayload>

// ============================================================
// Product Write-Off Task
// ============================================================

export interface ProductWriteOffItem {
  itemId: string
  itemName: string
  quantity: number
  unit: string
  batchId?: string
}

export interface ProductWriteOffTaskPayload {
  items: ProductWriteOffItem[]
  department: 'kitchen' | 'bar'
  responsiblePerson: string
  reason: string
  notes?: string

  // KPI data
  kpiData?: {
    userId: string
    userName: string
    affectsKpi: boolean
  }
}

export type ProductWriteOffTask = BackgroundTask<ProductWriteOffTaskPayload>

// ============================================================
// Preparation Write-Off Task
// ============================================================

export interface PrepWriteOffItem {
  preparationId: string
  preparationName: string
  quantity: number
  unit: string
  batchId?: string
}

export interface PrepWriteOffTaskPayload {
  items: PrepWriteOffItem[]
  department: 'kitchen' | 'bar'
  responsiblePerson: string
  reason: string
  notes?: string

  // KPI data
  kpiData?: {
    userId: string
    userName: string
    affectsKpi: boolean
  }
}

export type PrepWriteOffTask = BackgroundTask<PrepWriteOffTaskPayload>

// ============================================================
// Schedule Complete Task
// ============================================================

export interface ScheduleCompleteTaskPayload {
  taskId: string
  preparationId: string
  preparationName: string
  targetQuantity: number
  completedQuantity: number
  unit: string
  productionSlot: string
  department: 'kitchen' | 'bar'
  responsiblePerson: string
  responsiblePersonId: string // User UUID for database
  notes?: string

  // Receipt data for production
  receiptData: {
    department: 'kitchen' | 'bar'
    responsiblePerson: string
    sourceType: 'production'
    items: Array<{
      preparationId: string
      quantity: number
      costPerUnit: number
      expiryDate: string
      notes?: string
    }>
    notes?: string
  }

  // KPI data
  kpiData?: {
    userId: string
    userName: string
    isOnTime: boolean
  }
}

export type ScheduleCompleteTask = BackgroundTask<ScheduleCompleteTaskPayload>

// ============================================================
// Task Result
// ============================================================

export interface TaskResult {
  success: boolean
  operationId?: string
  error?: string
}
