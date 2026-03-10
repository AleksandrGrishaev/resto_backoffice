// src/core/initialization/dependencies.ts - Граф зависимостей и критические stores

import type { StoreName, UserRole, StoreCategory, AppContext } from './types'

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

  // Payment settings (needed for POS checkout dialog)
  paymentSettings: [],

  // Kitchen system (reads orders from Supabase, only needs menu for item details)
  kitchen: ['menu'],

  // Kitchen KPI system
  kitchenKpi: ['kitchen'],

  // Discounts analytics
  discounts: [],

  // Sales channels (depends on menu for pricing views)
  channels: ['menu'],

  // GoBiz integration (depends on channels for channel context)
  gobiz: ['channels'],

  // Menu collections (depends on menu for item references)
  menuCollections: ['menu'],

  // Loyalty program
  customers: [],
  loyalty: ['customers'],

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
  backoffice: ['counteragents', 'suppliers', 'storage', 'preparations', 'accounts'] as StoreName[],

  /**
   * 🆕 Kitchen Preparation: Stores needed for kitchen/bar roles
   * Kitchen Preparation feature requires preparations store for:
   * - Viewing stock balances
   * - Creating production batches
   * - Write-off operations
   *
   * NOTE: kitchen/bar roles now load ALL critical stores (products, recipes, menu, storage)
   * plus preparations via role-based loading
   */
  kitchenPreparation: ['preparations'] as StoreName[]
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
  paymentSettings: 'pos',
  sales: 'pos',
  writeOff: 'pos',
  kitchen: 'pos',
  kitchenKpi: 'pos',

  // Backoffice специфичные
  counteragents: 'backoffice',
  suppliers: 'backoffice',
  storage: 'backoffice',
  preparations: 'backoffice',
  accounts: 'backoffice',
  discounts: 'backoffice',

  // Channels — needed by both POS (order creation) and backoffice
  channels: 'pos',

  // GoBiz integration
  gobiz: 'backoffice',

  // Menu collections (backoffice / admin)
  menuCollections: 'backoffice',

  // Loyalty program (needed by both backoffice and POS)
  customers: 'backoffice',
  loyalty: 'backoffice',

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
 * Kitchen monitor используется для ролей: kitchen, bar, admin
 */
export function shouldLoadKitchenStores(userRoles: UserRole[]): boolean {
  return userRoles.some(role => ['admin', 'kitchen', 'bar'].includes(role))
}

// ===== ROUTE-BASED INITIALIZATION =====

/**
 * Определить контекст приложения по начальному URL
 * Это позволяет грузить только необходимые stores
 */
export function getContextFromPath(path: string): AppContext {
  if (path.startsWith('/pos')) return 'pos'
  if (path.startsWith('/kitchen')) return 'kitchen'
  return 'backoffice'
}

/**
 * Получить список stores для конкретного контекста
 * Это основная функция оптимизации - грузим только нужные stores
 */
export function getStoresForContext(context: AppContext, userRoles: UserRole[]): StoreName[] {
  const stores = new Set<StoreName>()

  // Базовые каталоги нужны всегда (products, recipes, menu)
  stores.add('products')
  stores.add('recipes')
  stores.add('menu')

  switch (context) {
    case 'pos':
      // POS: products, recipes, menu + pos-специфичные
      stores.add('counteragents') // нужен для некоторых операций
      stores.add('storage') // для write-off при продажах
      stores.add('paymentSettings') // методы оплаты для PaymentDialog
      stores.add('channels') // для order type/channel assignment
      stores.add('pos')
      stores.add('sales')
      stores.add('writeOff')
      stores.add('customers') // loyalty program
      stores.add('loyalty') // loyalty program
      break

    case 'kitchen':
      // Kitchen: products, recipes, menu + kitchen-специфичные
      stores.add('kitchen')
      stores.add('kitchenKpi')
      stores.add('preparations') // для Kitchen Preparation feature
      stores.add('storage') // для Kitchen Inventory feature
      break

    case 'backoffice':
      // Backoffice: products, recipes, menu + backoffice-специфичные
      stores.add('counteragents')
      stores.add('suppliers')
      stores.add('storage')
      stores.add('preparations')
      stores.add('accounts')
      // discounts грузится как часть backoffice для аналитики
      stores.add('discounts')
      // Sales channels
      stores.add('channels')
      // Loyalty program
      stores.add('customers')
      stores.add('loyalty')
      break
  }

  return Array.from(stores)
}

/**
 * Получить stores, которые нужно догрузить при переходе на новый контекст
 * Возвращает только те stores, которые ещё не загружены
 */
export function getAdditionalStoresForContext(
  newContext: AppContext,
  loadedStores: Set<StoreName>,
  userRoles: UserRole[]
): StoreName[] {
  const requiredStores = getStoresForContext(newContext, userRoles)
  return requiredStores.filter(store => !loadedStores.has(store))
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
