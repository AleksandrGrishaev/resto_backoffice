// src/types/common.ts
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  createdBy?: string
  updatedBy?: string
}
