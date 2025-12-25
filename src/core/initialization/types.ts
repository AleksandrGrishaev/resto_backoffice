// src/core/initialization/types.ts - Типы для системы инициализации

/**
 * Роли пользователей в системе
 */
export type UserRole = 'admin' | 'manager' | 'kitchen' | 'bar' | 'cashier' | 'waiter'

/**
 * Категории stores для инициализации
 */
export type StoreCategory = 'critical' | 'pos' | 'backoffice' | 'optional'

/**
 * Контекст приложения - определяется по начальному URL
 * Влияет на то, какие stores загружаются при старте
 */
export type AppContext = 'backoffice' | 'pos' | 'kitchen'

/**
 * Опции инициализации
 */
export interface InitializeOptions {
  /** Начальный путь URL для определения контекста */
  initialPath?: string
  /** Принудительно указать контекст (переопределяет initialPath) */
  forceContext?: AppContext
}

/**
 * Названия stores в системе
 */
export type StoreName =
  | 'products'
  | 'recipes'
  | 'menu'
  | 'counteragents'
  | 'accounts'
  | 'storage'
  | 'preparations'
  | 'suppliers'
  | 'sales'
  | 'writeOff'
  | 'pos'
  | 'kitchen'
  | 'kitchenKpi'
  | 'discounts'
  | 'paymentSettings'
  | 'debug'

/**
 * Конфигурация инициализации
 */
export interface InitializationConfig {
  enableDebug: boolean
  runIntegrationTests: boolean
  userRoles?: UserRole[]
}

/**
 * Результат инициализации store
 */
export interface StoreInitResult {
  name: StoreName
  success: boolean
  count?: number
  error?: string
  duration?: number
}

/**
 * Сводка инициализации
 */
export interface InitializationSummary {
  timestamp: string
  platform: string
  userRoles: UserRole[]
  storesLoaded: number
  totalTime: number
  results: StoreInitResult[]
}

/**
 * Интерфейс стратегии инициализации
 */
export interface InitializationStrategy {
  /**
   * Загрузить критические stores (нужны всем для базовых операций)
   * @param userRoles - опциональные роли пользователя для оптимизации загрузки
   */
  initializeCriticalStores(userRoles?: UserRole[]): Promise<StoreInitResult[]>

  /**
   * Загрузить stores на основе ролей пользователя
   */
  initializeRoleBasedStores(userRoles: UserRole[]): Promise<StoreInitResult[]>

  /**
   * Загрузить опциональные stores (debug, analytics)
   */
  initializeOptionalStores(): Promise<StoreInitResult[]>

  /**
   * Получить название стратегии
   */
  getName(): string
}
