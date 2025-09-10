// src/stores/auth/types.ts - ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ для всех auth типов
import { ComputedRef } from 'vue'

// ===== БАЗОВЫЕ ТИПЫ =====

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

// ===== КОНФИГУРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ (для совместимости с config/users.ts) =====

/**
 * Конфигурация пользователя для создания через config
 */
export interface UserConfig extends Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'> {
  description?: string
}

/**
 * Конфигурация роли (расширенная для системы ролей)
 */
export interface RoleConfig {
  name: UserRole
  description: string
  permissions: string[]
  defaultAccess: AppType[]
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

export interface RouteAuthMeta {
  requiresAuth?: boolean
  allowedRoles?: UserRole[]
  requiresEdit?: boolean
  requiresFinance?: boolean
  title?: string
  requiresDev?: boolean
}

// Расширяем vue-router
declare module 'vue-router' {
  interface RouteMeta extends RouteAuthMeta {}
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

// ===== ОШИБКИ И СОБЫТИЯ =====

export type AuthError =
  | 'INVALID_PIN'
  | 'USER_INACTIVE'
  | 'SESSION_EXPIRED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'NETWORK_ERROR'
  | 'SECURITY_LOCKED'
  | 'UNKNOWN_ERROR'

export type AuthEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'SESSION_RESTORED'

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

// ===== УТИЛИТАРНЫЕ ТИПЫ =====

/**
 * Тип для проверки прав доступа
 */
export type PermissionChecker = (roles: UserRole[]) => boolean

/**
 * Тип для функций навигации
 */
export type NavigationHandler = (to: string, from?: string) => Promise<void> | void

/**
 * Результат валидации прав
 */
export interface PermissionValidationResult {
  hasAccess: boolean
  reason?: string
  suggestedAction?: string
}

/**
 * Информация о сессии
 */
export interface SessionInfo {
  hasActiveSession: boolean
  sessionAge?: number
  lastActivity?: string
  expiresIn?: number
  userInfo?: {
    id: string
    name: string
    roles: string[]
  }
}

/**
 * Статистика попыток входа
 */
export interface LoginStats {
  totalAttempts: number
  successfulAttempts: number
  failedAttempts: number
  lastSuccessfulLogin?: string
  recentFailures: number
}

// ===== КОНСТАНТЫ ДЛЯ СЕРВИСОВ =====

export const AUTH_STORAGE_KEYS = {
  SESSION: 'kitchen_app_session',
  LOGIN_ATTEMPTS: 'kitchen_app_login_attempts'
} as const

export const SESSION_CONFIG = {
  DURATION: 24 * 60 * 60 * 1000, // 24 часа
  MAX_LOGIN_ATTEMPTS: 10,
  ATTEMPT_WINDOW: 60 * 60 * 1000 // 1 час
} as const

// ===== ТИПЫ ДЛЯ ROUTER GUARDS =====

export interface RoutePermissions {
  requiresAuth: boolean
  allowedRoles?: UserRole[]
  requiresEdit?: boolean
  requiresFinance?: boolean
}

// ===== ТИПЫ ДЛЯ ВАЛИДАЦИИ =====

export interface AuthValidationRule {
  field: keyof User
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface AuthValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  warnings?: Record<string, string[]>
}

// ===== ТИПЫ ДЛЯ API (будущее) =====

export interface AuthApiConfig {
  baseUrl: string
  endpoints: {
    login: string
    logout: string
    refresh: string
    profile: string
  }
  timeout: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresIn: number
  scope?: string
}

// ===== LEGACY SUPPORT (для миграции) =====

/**
 * @deprecated Используйте UserConfig
 */
export type LegacyUserConfig = UserConfig

/**
 * @deprecated Используйте RoleConfig
 */
export type LegacyRoleConfig = RoleConfig
