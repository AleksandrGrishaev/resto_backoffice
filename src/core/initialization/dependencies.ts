// src/core/initialization/dependencies.ts - Граф зависимостей и критические stores

import type { StoreName, UserRole, StoreCategory } from './types'

/**
 * Граф зависимостей между stores
 * Ключ: store name
 * Значение: массив stores, от которых зависит данный store
 */
export const STORE_DEPENDENCIES: Record<StoreName, StoreName[]> = {
  // Core catalogs
  products: [],
  counteragents: [],

  // Recipes зависят от products (для расчета стоимости)
  recipes: ['products'],

  // Menu зависит от recipes и products
  menu: ['recipes', 'products'],

  // Storage operations
  storage: ['products'],
  preparations: ['products'],

  // Suppliers
  suppliers: ['counteragents'],

  // Accounts
  accounts: [],

  // Sales зависят от menu и recipes (для decomposition)
  sales: ['menu', 'recipes'],

  // Write-off зависит от recipes и storage
  writeOff: ['recipes', 'storage'],

  // POS system
  pos: ['menu'],

  // Kitchen system (depends on POS orders)
  kitchen: ['pos'],

  // Debug system
  debug: []
}

/**
 * Критические stores для разных контекстов
 *
 * ВАЖНО:
 * - В DEV mode: грузим все критические stores для всех ролей (для тестирования)
 * - В PRODUCTION mode: можем оптимизировать загрузку по ролям
 */
export const CRITICAL_STORES = {
  /**
   * Базовые stores, нужные всем для работы системы
   *
   * Почему критичны:
   * - products: базовый справочник для всех операций
   * - recipes: нужны для decomposition при продажах (даже для кассиров)
   * - menu: основа для POS операций
   * - storage: нужен для write-off операций при продажах
   */
  all: ['products', 'recipes', 'menu', 'storage'] as StoreName[],

  /**
   * Дополнительные stores для POS пользователей (cashier, waiter)
   *
   * Почему критичны:
   * - pos: система столов и заказов
   * - sales: запись транзакций продаж
   * - writeOff: автоматическое списание ингредиентов
   */
  pos: ['pos', 'sales', 'writeOff'] as StoreName[],

  /**
   * Дополнительные stores для backoffice пользователей (admin, manager)
   *
   * Почему критичны:
   * - counteragents: управление контрагентами
   * - suppliers: закупки и поставки
   * - storage: управление складом
   * - preparations: управление полуфабрикатами
   * - accounts: финансовый учет
   */
  backoffice: ['counteragents', 'suppliers', 'storage', 'preparations', 'accounts'] as StoreName[]
}

/**
 * Категоризация stores по назначению
 */
export const STORE_CATEGORIES: Record<StoreName, StoreCategory> = {
  // Критические для всех
  products: 'critical',
  recipes: 'critical',
  menu: 'critical',

  // POS специфичные
  pos: 'pos',
  sales: 'pos',
  writeOff: 'pos',
  kitchen: 'pos',

  // Backoffice специфичные
  counteragents: 'backoffice',
  suppliers: 'backoffice',
  storage: 'backoffice',
  preparations: 'backoffice',
  accounts: 'backoffice',

  // Опциональные
  debug: 'optional'
}

/**
 * Определить какие stores нужно загружать для данных ролей
 */
export function getRequiredStoresForRoles(userRoles: UserRole[]): StoreName[] {
  const stores = new Set<StoreName>()

  // Базовые критические stores для всех
  CRITICAL_STORES.all.forEach(store => stores.add(store))

  // Добавляем POS stores если есть POS роли
  if (shouldLoadPOSStores(userRoles)) {
    CRITICAL_STORES.pos.forEach(store => stores.add(store))
  }

  // Добавляем Backoffice stores если есть backoffice роли
  if (shouldLoadBackofficeStores(userRoles)) {
    CRITICAL_STORES.backoffice.forEach(store => stores.add(store))
  }

  return Array.from(stores)
}

/**
 * Проверить нужно ли загружать POS stores
 */
export function shouldLoadPOSStores(userRoles: UserRole[]): boolean {
  return userRoles.some(role => ['admin', 'cashier', 'waiter'].includes(role))
}

/**
 * Проверить нужно ли загружать Backoffice stores
 */
export function shouldLoadBackofficeStores(userRoles: UserRole[]): boolean {
  return userRoles.some(role => ['admin', 'manager'].includes(role))
}

/**
 * Проверить нужно ли загружать Kitchen stores
 */
export function shouldLoadKitchenStores(userRoles: UserRole[]): boolean {
  return userRoles.some(role => ['admin', 'kitchen', 'bar'].includes(role))
}

/**
 * Получить зависимости для store в правильном порядке загрузки
 * Возвращает массив stores в порядке: сначала зависимости, потом сам store
 */
export function getStoreLoadOrder(storeName: StoreName): StoreName[] {
  const visited = new Set<StoreName>()
  const order: StoreName[] = []

  function visit(name: StoreName) {
    if (visited.has(name)) return

    visited.add(name)

    // Сначала загружаем зависимости
    const deps = STORE_DEPENDENCIES[name] || []
    deps.forEach(dep => visit(dep))

    // Потом сам store
    order.push(name)
  }

  visit(storeName)
  return order
}

/**
 * Получить полный порядок загрузки для списка stores
 */
export function getLoadOrderForStores(stores: StoreName[]): StoreName[] {
  const allStores = new Set<StoreName>()

  // Собираем все stores с их зависимостями
  stores.forEach(store => {
    const order = getStoreLoadOrder(store)
    order.forEach(s => allStores.add(s))
  })

  // Сортируем по зависимостям
  return sortByDependencies(Array.from(allStores))
}

/**
 * Отсортировать stores по зависимостям (топологическая сортировка)
 */
function sortByDependencies(stores: StoreName[]): StoreName[] {
  const sorted: StoreName[] = []
  const visited = new Set<StoreName>()
  const visiting = new Set<StoreName>()

  function visit(name: StoreName) {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected for store: ${name}`)
    }

    visiting.add(name)

    const deps = STORE_DEPENDENCIES[name] || []
    deps.forEach(dep => {
      if (stores.includes(dep)) {
        visit(dep)
      }
    })

    visiting.delete(name)
    visited.add(name)
    sorted.push(name)
  }

  stores.forEach(store => visit(store))
  return sorted
}
