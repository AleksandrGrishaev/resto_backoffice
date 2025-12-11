// src/core/initialization/DevInitializationStrategy.ts - Dev режим инициализации

import type {
  InitializationStrategy,
  InitializationConfig,
  StoreInitResult,
  UserRole
} from './types'
import {
  getRequiredStoresForRoles,
  shouldLoadBackofficeStores,
  shouldLoadPOSStores,
  shouldLoadKitchenStores,
  CRITICAL_STORES
} from './dependencies'
import { DebugUtils } from '@/utils'

// Импорт stores
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useAccountStore } from '@/stores/account'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSupplierStore } from '@/stores/supplier_2'
import { useSalesStore, useRecipeWriteOffStore } from '@/stores/sales'
import { usePosStore } from '@/stores/pos'
import { useKitchenStore } from '@/stores/kitchen'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { useDebugStore } from '@/stores/debug'
import { useDiscountsStore } from '@/stores/discounts'

const MODULE_NAME = 'DevInitStrategy'

/**
 * Стратегия инициализации для Development режима
 *
 * Характеристики:
 * - Использует Supabase + localStorage для оффлайн кеширования
 * - Загружает критические stores для ВСЕХ ролей (для удобства тестирования)
 * - Последовательная загрузка с учетом зависимостей
 * - Подробное логирование
 */
export class DevInitializationStrategy implements InitializationStrategy {
  private config: InitializationConfig

  constructor(config: InitializationConfig) {
    this.config = config
  }

  getName(): string {
    return 'Development (Supabase + localStorage)'
  }

  /**
   * Инициализировать критические stores
   *
   * В DEV режиме: загружаем для всех ролей, чтобы можно было тестировать любые сценарии
   * Kitchen Preparation feature requires full critical stores for kitchen/bar roles
   */
  async initializeCriticalStores(userRoles?: UserRole[]): Promise<StoreInitResult[]> {
    const results: StoreInitResult[] = []

    try {
      // Стандартная загрузка для всех ролей (включая kitchen/bar для Kitchen Preparation)
      DebugUtils.info(MODULE_NAME, '📦 [DEV] Initializing critical stores for all roles...')

      // ВАЖНО: Последовательная загрузка - recipes зависят от products
      results.push(await this.loadProducts())
      results.push(await this.loadCounterAgents())
      results.push(await this.loadRecipes()) // Зависит от products

      // Menu зависит от recipes
      results.push(await this.loadMenu())

      // Storage нужен для write-off операций при продажах (критичен!)
      results.push(await this.loadStorage())

      DebugUtils.info(MODULE_NAME, '✅ [DEV] Critical stores initialized', {
        count: results.length,
        success: results.filter(r => r.success).length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ [DEV] Critical stores initialization failed', { error })
      throw error
    }

    return results
  }

  /**
   * Инициализировать stores на основе ролей
   *
   * В DEV режиме: загружаем дополнительные stores для тестирования
   */
  async initializeRoleBasedStores(userRoles: UserRole[]): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🏢 [DEV] Initializing role-based stores...', { userRoles })

    const results: StoreInitResult[] = []

    try {
      // POS stores
      if (shouldLoadPOSStores(userRoles)) {
        results.push(...(await this.initializePOSStores()))
      }

      // Kitchen stores (depends on POS)
      if (shouldLoadKitchenStores(userRoles)) {
        results.push(await this.loadKitchen())
        // 🆕 Kitchen Preparation: Load preparations and KPI stores for kitchen/bar roles
        // NOTE: preparations is loaded here for kitchen-only users, and also in backoffice stores for admin/manager
        // The store checks `initialized` to prevent double loading
        if (!shouldLoadBackofficeStores(userRoles)) {
          // Only load preparations here if NOT loading backoffice stores (to avoid duplication)
          results.push(await this.loadPreparations())
        }
        results.push(await this.loadKitchenKpi())
      }

      // Backoffice stores (параллельная загрузка независимых stores)
      if (shouldLoadBackofficeStores(userRoles)) {
        results.push(...(await this.initializeBackofficeStores()))
      }

      DebugUtils.info(MODULE_NAME, '✅ [DEV] Role-based stores initialized', {
        count: results.length,
        success: results.filter(r => r.success).length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ [DEV] Role-based stores initialization failed', { error })
      // Не прерываем - некритичные stores
    }

    return results
  }

  /**
   * Инициализировать опциональные stores
   */
  async initializeOptionalStores(): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🐛 [DEV] Initializing optional stores...')

    const results: StoreInitResult[] = []

    try {
      if (this.config.enableDebug) {
        results.push(await this.loadDebug())
      }

      DebugUtils.info(MODULE_NAME, '✅ [DEV] Optional stores initialized', {
        count: results.length
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, '⚠️ [DEV] Optional stores initialization failed', { error })
      // Опциональные stores - не критично
    }

    return results
  }

  // ===== КРИТИЧЕСКИЕ STORES =====

  private async loadProducts(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useProductsStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading products...')

      await store.loadProducts()

      return {
        name: 'products',
        success: true,
        count: store.products.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load products'
      DebugUtils.error(MODULE_NAME, `❌ [DEV] ${message}`, { error })

      return {
        name: 'products',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadCounterAgents(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useCounteragentsStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading counteragents...')

      if (store.initialize) {
        await store.initialize()
      }

      return {
        name: 'counteragents',
        success: true,
        count: store.counteragents.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load counteragents'
      DebugUtils.error(MODULE_NAME, `❌ [DEV] ${message}`, { error })

      return {
        name: 'counteragents',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadRecipes(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useRecipesStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading recipes and preparations...')

      if (store.initialize) {
        await store.initialize()
      }

      return {
        name: 'recipes',
        success: true,
        count: (store.recipes?.length || 0) + (store.preparations?.length || 0),
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load recipes'
      DebugUtils.error(MODULE_NAME, `❌ [DEV] ${message}`, { error })

      return {
        name: 'recipes',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadMenu(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useMenuStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading menu...')

      if (store.initialize) {
        await store.initialize()
      }

      return {
        name: 'menu',
        success: true,
        count: store.state?.value?.menuItems?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load menu'
      DebugUtils.error(MODULE_NAME, `❌ [DEV] ${message}`, { error })

      return {
        name: 'menu',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  // ===== POS STORES =====

  private async initializePOSStores(): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🏪 [DEV] Initializing POS stores...')

    const results: StoreInitResult[] = []

    // POS system
    results.push(await this.loadPOS())

    // Sales & Write-off (параллельно)
    const [salesResult, writeOffResult] = await Promise.all([this.loadSales(), this.loadWriteOff()])
    results.push(salesResult, writeOffResult)

    return results
  }

  private async loadPOS(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = usePosStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading POS system...')

      const result = await store.initializePOS()

      if (!result.success) {
        throw new Error(result.error || 'POS initialization failed')
      }

      return {
        name: 'pos',
        success: true,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load POS'
      DebugUtils.error(MODULE_NAME, `❌ [DEV] ${message}`, { error })

      return {
        name: 'pos',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadSales(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useSalesStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading sales transactions...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'sales',
        success: true,
        count: store.transactions.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sales'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'sales',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadWriteOff(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useRecipeWriteOffStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading recipe write-offs...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'writeOff',
        success: true,
        count: store.writeOffs.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load write-offs'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'writeOff',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadKitchen(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useKitchenStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading Kitchen system...')

      const result = await store.initialize()

      if (!result.success) {
        throw new Error(result.error || 'Kitchen initialization failed')
      }

      return {
        name: 'kitchen',
        success: true,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Kitchen'
      DebugUtils.error(MODULE_NAME, `❌ [DEV] ${message}`, { error })

      return {
        name: 'kitchen',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadKitchenKpi(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useKitchenKpiStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading Kitchen KPI system...')

      const result = await store.initialize()

      if (!result.success) {
        throw new Error(result.error || 'Kitchen KPI initialization failed')
      }

      return {
        name: 'kitchenKpi',
        success: true,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Kitchen KPI'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'kitchenKpi',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  // ===== BACKOFFICE STORES =====

  private async initializeBackofficeStores(): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🏢 [DEV] Initializing backoffice stores...')

    // ✅ FIX: Preparations depend on recipes, so load sequentially
    // Load preparations first (depends on recipes from critical stores)
    const preparationsResult = await this.loadPreparations()

    // Then load independent stores in parallel
    // NOTE: storage уже загружен в критических stores
    const parallelResults = await Promise.all([
      this.loadAccounts(),
      this.loadSuppliers(),
      this.loadDiscounts() // ✅ Sprint 7: Add discounts store for revenue analytics
    ])

    return [preparationsResult, ...parallelResults]
  }

  private async loadAccounts(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useAccountStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading accounts...')

      // ✅ FIXED: Use initializeStore() instead of initialize()
      await store.initializeStore()

      return {
        name: 'accounts',
        success: true,
        count: store.state?.value?.accounts?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load accounts'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'accounts',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadStorage(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useStorageStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading storage...')

      if (!store.initialized) {
        await store.initialize()
      } else {
        await store.fetchBalances()
      }

      return {
        name: 'storage',
        success: true,
        count: store.state.balances.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load storage'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'storage',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadPreparations(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = usePreparationStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading preparations...')

      if (store.initialize) {
        await store.initialize()
      }

      return {
        name: 'preparations',
        success: true,
        count: store.state?.value?.preparations?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preparations'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'preparations',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadSuppliers(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useSupplierStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading suppliers...')

      if (store.initialize) {
        await store.initialize()
      }

      return {
        name: 'suppliers',
        success: true,
        count: store.state?.value?.requests?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load suppliers'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'suppliers',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadDiscounts(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useDiscountsStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading discounts...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'discounts',
        success: true,
        count: store.discountEvents.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load discounts'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'discounts',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  // ===== OPTIONAL STORES =====

  private async loadDebug(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useDebugStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading debug system...')

      await store.initialize()

      return {
        name: 'debug',
        success: true,
        count: store.storesSortedByPriority.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load debug'
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'debug',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }
}
