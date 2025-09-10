// src/stores/auth/types.ts
import { ComputedRef } from 'vue'

export type AppType = 'backoffice' | 'cashier' | 'kitchen'
export type UserRole = 'admin' | 'manager' | 'kitchen' | 'bar' | 'cashier'

// ===== ОСНОВНЫЕ ИНТЕРФЕЙСЫ =====

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

export interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  lastLoginAt: string | null
}

// ===== РЕЗУЛЬТАТЫ ОПЕРАЦИЙ =====

export interface LoginResult {
  success: boolean
  user?: User
  redirectTo?: string
  error?: string
}

export interface LogoutResult {
  success: boolean
  error?: string
}

// ===== ПРАВА И ОГРАНИЧЕНИЯ =====

export interface UserPermissions {
  canEdit: boolean
  canViewFinances: boolean
  canManageUsers: boolean
  canAccessBackoffice: boolean
  canAccessPOS: boolean
  canAccessKitchen: boolean
}

export interface RoleRestrictions {
  restrictedRoutes: string[]
  hiddenNavItems: string[]
  readOnlyFields: string[]
}

// ===== КОНФИГУРАЦИЯ РОЛЕЙ =====

export interface RoleConfig {
  name: UserRole
  displayName: string
  description: string
  defaultRoute: string
  permissions: UserPermissions
  restrictions: RoleRestrictions
}

// ===== СЕССИЯ И ЛОГИРОВАНИЕ =====

export interface UserSession {
  user: User
  appType: AppType
  loginTime: string
  lastActivity: string
  expiresAt?: string
}

export interface LoginAttempt {
  timestamp: string
  userId: string
  pin: string
  success: boolean
  appType: AppType
  ip?: string
  userAgent?: string
}

// ===== НАВИГАЦИЯ И РОУТИНГ =====

export interface RoutePermissions {
  requiresAuth: boolean
  allowedRoles?: UserRole[]
  requiresEdit?: boolean
  requiresFinance?: boolean
}

export type NavigationGuardResult =
  | true
  | false
  | { name: string; query?: Record<string, any> }
  | string

// ===== КОНСТАНТЫ И ПЕРЕЧИСЛЕНИЯ =====

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  cashier: 'Кассир',
  kitchen: 'Повар',
  bar: 'Бармен'
}

export const APP_DISPLAY_NAMES: Record<AppType, string> = {
  backoffice: 'Управление',
  cashier: 'Касса',
  kitchen: 'Кухня'
}

export const DEFAULT_ROUTES: Record<UserRole, string> = {
  admin: '/menu',
  manager: '/menu',
  cashier: '/pos',
  kitchen: '/kitchen',
  bar: '/kitchen'
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ТИПЫ =====

export type AuthError =
  | 'INVALID_PIN'
  | 'USER_INACTIVE'
  | 'SESSION_EXPIRED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export type AuthEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'PERMISSION_DENIED'

// ===== COMPOSABLE ТИПЫ =====

export interface UseAuthReturn {
  // State
  currentUser: ComputedRef<User | null>
  isAuthenticated: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  userRoles: ComputedRef<UserRole[]>

  // Actions
  login: (pin: string) => Promise<LoginResult>
  logout: () => Promise<void>

  // Permissions
  canEdit: ComputedRef<boolean>
  canViewFinances: ComputedRef<boolean>
  isAdmin: ComputedRef<boolean>
  isManager: ComputedRef<boolean>
  isCashier: ComputedRef<boolean>
}

export interface UsePermissionsReturn {
  canEdit: ComputedRef<boolean>
  canViewFinances: ComputedRef<boolean>
  canManageUsers: ComputedRef<boolean>
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  canAccessRoute: (route: string) => boolean
}
