// src/types/common.ts

export type EntityStatus = 'draft' | 'active' | 'archived'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  createdBy?: string
  updatedBy?: string
}
