// src/types/customer.ts
export interface CustomerInfo {
  name?: string
  phone?: string
  address?: string
  notes?: string
  type?: 'new' | 'regular' | 'loyalty'
}
