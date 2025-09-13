// src/stores/pos/core/posSystem.ts
//
// POS System Status Management
// - Defines status types and calculations for POS system
// - Provides utilities for status determination and formatting
// - Contains constants for UI display (colors, labels, actions)
//

// =============================================
// POS STATUS TYPES
// =============================================

export type PosSystemStatus =
  | 'online' // System working normally
  | 'offline' // No server connection
  | 'syncing' // Data synchronization in progress
  | 'warning' // Has warnings (no shift started, etc.)
  | 'error' // Has critical errors

export type PosShiftStatus =
  | 'no_shift' // No active shift
  | 'active' // Shift is active
  | 'ending' // Shift is being closed

// =============================================
// INTERFACES
// =============================================

export interface PosStatusInfo {
  system: PosSystemStatus
  shift: PosShiftStatus
  isOnline: boolean
  lastSync?: string
}

// =============================================
// CONSTANTS
// =============================================

export const POS_STATUS_COLORS = {
  online: 'success',
  offline: 'error',
  syncing: 'warning',
  warning: 'warning',
  error: 'error'
} as const

export const POS_STATUS_LABELS = {
  online: 'Online',
  offline: 'Offline',
  syncing: 'Syncing',
  warning: 'Warning',
  error: 'Error'
} as const

export const POS_ACTIONS = {
  START_SHIFT: 'start_shift',
  END_SHIFT: 'end_shift',
  NEW_ORDER: 'new_order',
  SYNC_DATA: 'sync_data',
  LOGOUT: 'logout'
} as const

// =============================================
// UTILS
// =============================================

/**
 * Определяет общий статус POS системы
 */
export function calculatePosSystemStatus(params: {
  isOnline: boolean
  hasShift: boolean
  hasErrors: boolean
  isSyncing: boolean
}): PosSystemStatus {
  const { isOnline, hasShift, hasErrors, isSyncing } = params

  if (!isOnline) return 'offline'
  if (hasErrors) return 'error'
  if (isSyncing) return 'syncing'
  if (!hasShift) return 'warning'

  return 'online'
}

/**
 * Определяет статус смены
 */
export function calculateShiftStatus(params: {
  currentShift: any | null
  isEnding?: boolean
}): PosShiftStatus {
  const { currentShift, isEnding } = params

  if (!currentShift) return 'no_shift'
  if (isEnding) return 'ending'

  return 'active'
}

/**
 * Получает цвет для статуса
 */
export function getPosStatusColor(status: PosSystemStatus): string {
  return POS_STATUS_COLORS[status]
}

/**
 * Получает лейбл для статуса
 */
export function getPosStatusLabel(status: PosSystemStatus): string {
  return POS_STATUS_LABELS[status]
}

/**
 * Форматирует время смены
 */
export function formatShiftTime(startTime: string): string {
  return new Date(startTime).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Форматирует короткое имя кассира
 */
export function formatCashierName(fullName: string): string {
  const parts = fullName.split(' ')
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`
  }
  return fullName
}
