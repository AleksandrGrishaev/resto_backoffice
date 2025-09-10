// src/types/table.ts

import { BaseEntity } from './common'

export interface Table extends BaseEntity {
  id: string
  number: string
  status: TableStatus
  capacity: number
  floor: number
  section: string
  currentOrderId?: string
}

export type TableStatus = 'free' | 'occupied_unpaid' | 'occupied_paid' | 'reserved'

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
