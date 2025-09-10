// src/types/auth.ts
export type Role = 'admin' | 'kitchen' | 'bar' | 'cashier'

export interface User {
  id: string
  roles: Role[]
  pin: string
  isActive: boolean
}

export interface LoginAttempt {
  userId: string
  success: boolean
  appType: string
  timestamp: string
  ip: string
}

export interface SessionData {
  user: User | null
  lastLoginAt: string | null
  expiresAt: string
  appType: string
}
