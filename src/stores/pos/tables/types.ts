// src/stores/pos/tables/types.ts

import { BaseEntity } from '../types'

export interface Table extends BaseEntity {
  id: string
  number: string
  status: TableStatus
  capacity: number
  floor: number
  section: string
  currentOrderId?: string
  reservedUntil?: string
  notes?: string
}

export type TableStatus = 'free' | 'occupied' | 'reserved'

// Данные стола для заказа
export interface TableOrderData {
  tableId: string
  startTime: string
  endTime?: string
}

// Секции столов
export interface TableSection {
  id: string
  name: string
  tables: Table[]
}

// Конфигурация таблиц
export interface TableConfig {
  capacity: number[]
  sections: string[]
  floors: number[]
}

// Утилиты для работы с статусами столов
export const TABLE_STATUS_COLORS = {
  free: 'success',
  occupied: 'warning',
  reserved: 'info'
} as const

export const TABLE_STATUS_ICONS = {
  free: 'mdi-table',
  occupied: 'mdi-table-chair',
  reserved: 'mdi-table-clock'
} as const

export function isTableOccupied(status: TableStatus): boolean {
  return status === 'occupied'
}

export function canCreateOrder(status: TableStatus): boolean {
  return status === 'free'
}

export function canSelectOrder(status: TableStatus): boolean {
  return status === 'occupied'
}
