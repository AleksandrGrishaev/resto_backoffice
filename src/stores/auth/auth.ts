// src/types/auth.ts
export type AppType = 'backoffice' | 'cashier' | 'kitchen'

export const APP_NAMES: Record<AppType, string> = {
  backoffice: 'Back Office',
  cashier: 'Point of Sale',
  kitchen: 'Kitchen Display'
} as const

export type UserRole = 'admin' | 'manager' | 'kitchen' | 'bar' | 'cashier'

export interface User {
  id: string
  pin: string
  name: string
  roles: UserRole[]
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface LoginAttempt {
  timestamp: string
  userId: string
  success: boolean
  appType: AppType | 'bar'
  ip?: string
}

export const rolePermissions = {
  admin: ['*'],
  manager: ['backoffice.access', 'kitchen.access', 'bar.access', 'cashier.access'],
  kitchen: ['kitchen.access'],
  bar: ['kitchen.access', 'bar.access'],
  cashier: ['cashier.access']
} as const

export const appRoles = {
  backoffice: ['admin', 'manager'],
  cashier: ['admin', 'manager', 'cashier'],
  kitchen: ['admin', 'manager', 'kitchen', 'bar'],
  bar: ['admin', 'manager', 'bar']
} as const

export type AllowedRoles<T extends keyof typeof appRoles> = (typeof appRoles)[T][number]
