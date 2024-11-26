// src/types/common.ts
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  shiftId?: string
  createdBy?: string
  updatedBy?: string
}
