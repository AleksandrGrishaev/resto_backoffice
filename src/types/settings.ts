// src/types/settings.ts
import { BaseEntity } from './common'

export interface SystemSettings extends BaseEntity {
  restaurant: RestaurantSettings
  printing: PrintingSettings
  notifications: NotificationSettings
  backup: BackupSettings
}

export interface RestaurantSettings {
  taxes: {
    serviceTax: number
    governmentTax: number
    enableRounding: boolean
  }
  orderNumberPrefix: string
  billNumberPrefix: string
  currency: {
    code: string
    symbol: string
    position: 'before' | 'after'
  }
  timeZone: string
  operatingHours: {
    start: string
    end: string
  }
}

export interface PrintingSettings {
  billPrinter: {
    name: string
    type: 'thermal' | 'dot-matrix'
    width: number
    copies: number
  }
  kitchenPrinter: {
    name: string
    type: 'thermal' | 'dot-matrix'
    categories?: string[]
  }[]
  header?: string[]
  footer?: string[]
}

export interface NotificationSettings {
  sound: {
    enabled: boolean
    newOrder: boolean
    orderComplete: boolean
    volume: number
  }
  display: {
    orderTimeout: number
    refreshInterval: number
  }
}

export interface BackupSettings {
  autoBackup: boolean
  frequency: 'daily' | 'weekly'
  time: string
  keepCount: number
}
