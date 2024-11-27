// src/types/settings.ts
import { BaseEntity } from './common'

export interface SystemSettings extends BaseEntity {
  restaurant: RestaurantSettings
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
