// src/types/tax.ts
import { BaseEntity } from './common'

export interface Tax extends BaseEntity {
  name: string
  percentage: number
  isActive: boolean
}
