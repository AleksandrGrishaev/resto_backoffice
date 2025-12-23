// src/core/initialization/ProductionInitializationStrategy.ts - Production режим инициализации

import type {
  InitializationStrategy,
  InitializationConfig,
  StoreInitResult,
  UserRole,
  StoreName
} from './types'
import {
  getRequiredStoresForRoles,
  shouldLoadBackofficeStores,
  shouldLoadPOSStores,
  shouldLoadKitchenStores,
  getLoadOrderForStores,
  CRITICAL_STORES
} from './dependencies'
import { DebugUtils } from '@/utils'

// Импорт stores (те же что в Dev, но будут использовать API вместо localStorage)
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useAccountStore } from '@/stores/account'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSalesStore, useRecipeWriteOffStore } from '@/stores/sales'
import { usePosStore } from '@/stores/pos'
import { useKitchenStore } from '@/stores/kitchen'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'

const MODULE_NAME = 'ProductionInitStrategy'

/**
 * Стратегия инициализации для Production режима
 *
 * Характеристики:
 * - Использует API для загрузки данных
 * - Загружает критические stores для всех, остальные по ролям (оптимизация)
 * - Параллельная загрузка где возможно
 * - Кеширование и оптимизация
 *
 * ВАЖНО: Это placeholder для будущей реализации!
 * В текущей версии делегирует логику в Dev стратегию.
 *
 * TODO для Production:
 * 1. Заменить store.initialize() на API вызовы
 * 2. Добавить кеширование ответов
 * 3. Добавить retry логику для API
 * 4. Оптимизировать параллельную загрузку
 * 5. Добавить progressive loading (сначала критичные данные)
 * 6. Добавить Service Workers для offline режима
 */
export class ProductionInitializationStrategy implements InitializationStrategy {
  private config: InitializationConfig

  constructor(config: InitializationConfig) {
    this.config = config
  }

  getName(): string {
    return 'Production (API + caching)'
  }

  /**
   * Инициализировать критические stores
   *
   * В PRODUCTION режиме: загружаем для всех ролей, т.к. нужны для базовых операций
   * (decomposition при продажах требует recipes даже для кассиров)
   * Kitchen Preparation feature requires full critical stores for kitchen/bar roles
   */
  async initializeCriticalStores(userRoles?: UserRole[]): Promise<StoreInitResult[]> {
    const results: StoreInitResult[] = []

    try {
      // Стандартная загрузка для всех ролей (включая kitchen/bar для Kitchen Preparation)
      DebugUtils.info(MODULE_NAME, '📦 [PROD] Initializing critical stores...')

      // TODO: В production можно грузить параллельно через API
      // Сейчас используем ту же логику что в Dev

      // ВАЖНО: Критические stores нужны ВСЕМ для decomposition
      results.push(await this.loadProductsFromAPI())
      results.push(await this.loadCounteragentsFromAPI())
      results.push(await this.loadRecipesFromAPI())
      results.push(await this.loadMenuFromAPI())

      // Storage нужен для write-off операций при продажах (критичен!)
      results.push(await this.loadStorageFromAPI())

      DebugUtils.info(MODULE_NAME, '✅ [PROD] Critical stores initialized', {
        count: results.length,
        success: results.filter(r => r.success).length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ [PROD] Critical stores initialization failed', { error })
      throw error
    }

    return results
  }

  /**
   * Инициализировать stores на основе ролей
   *
   * В PRODUCTION режиме: загружаем только необходимые stores для оптимизации
   */
  async initializeRoleBasedStores(userRoles: UserRole[]): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🏢 [PROD] Initializing role-based stores...', { userRoles })

    const results: StoreInitResult[] = []

    try {
      // Определяем какие stores нужны для данных ролей
      const requiredStores = this.getAdditionalStoresForRoles(userRoles)

      // TODO: В production можно загружать все stores параллельно через API
      // Сейчас используем простую логику

      if (shouldLoadPOSStores(userRoles)) {
        results.push(...(await this.initializePOSStores()))
      }

      // Kitchen stores (depends on POS)
      if (shouldLoadKitchenStores(userRoles)) {
        results.push(await this.loadKitchenFromAPI())
        // 🆕 Kitchen Preparation: Load preparations and KPI stores for kitchen/bar roles
        if (!shouldLoadBackofficeStores(userRoles)) {
          // Only load preparations here if NOT loading backoffice stores (to avoid duplication)
          results.push(await this.loadPreparationsFromAPI())
        }
        results.push(await this.loadKitchenKpiFromAPI())
      }

      if (shouldLoadBackofficeStores(userRoles)) {
        results.push(...(await this.initializeBackofficeStores()))
      }

      DebugUtils.info(MODULE_NAME, '✅ [PROD] Role-based stores initialized', {
        count: results.length,
        success: results.filter(r => r.success).length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '⚠️ [PROD] Role-based stores initialization failed', {
        error
      })
      // Не прерываем - некритичные stores
    }

    return results
  }

  /**
   * Инициализировать опциональные stores
   */
  async initializeOptionalStores(): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🐛 [PROD] Initializing optional stores...')

    // В production debug system обычно не нужен
    return []
  }

  // ===== HELPER METHODS =====

  /**
   * Получить дополнительные stores для ролей (кроме критических)
   */
  private getAdditionalStoresForRoles(userRoles: UserRole[]): StoreName[] {
    const stores = new Set<StoreName>()

    // POS stores
    if (shouldLoadPOSStores(userRoles)) {
      CRITICAL_STORES.pos.forEach(store => stores.add(store))
    }

    // Backoffice stores
    if (shouldLoadBackofficeStores(userRoles)) {
      CRITICAL_STORES.backoffice.forEach(store => stores.add(store))
    }

    return Array.from(stores)
  }

  // ===== API LOADING METHODS (PLACEHOLDERS) =====

  /**
   * TODO: Загрузить products через API
   * Сейчас делегирует в store.initialize() который использует localStorage
   */
  private async loadProductsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useProductsStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading products from API...')

      // TODO: Заменить на API вызов
      // const response = await fetch('/api/v1/products')
      // const products = await response.json()
      // store.setProducts(products)

      // Сейчас используем существующий метод
      await store.loadProducts()

      return {
        name: 'products',
        success: true,
        count: store.products.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load products'
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'products',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  /**
   * TODO: Загрузить counteragents через API
   */
  private async loadCounteragentsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useCounteragentsStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading counteragents from API...')

      // TODO: Заменить на API вызов
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
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'counteragents',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  /**
   * TODO: Загрузить recipes через API
   */
  private async loadRecipesFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useRecipesStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading recipes from API...')

      // TODO: Заменить на API вызов
      // const response = await fetch('/api/v1/recipes')
      // const recipes = await response.json()
      // store.setRecipes(recipes)

      // Сейчас используем существующий метод
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
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'recipes',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  /**
   * TODO: Загрузить menu через API
   */
  private async loadMenuFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useMenuStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading menu from API...')

      // TODO: Заменить на API вызов
      // const response = await fetch('/api/v1/menu')
      // const menu = await response.json()
      // store.setMenu(menu)

      // Сейчас используем существующий метод
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
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'menu',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  /**
   * TODO: Загрузить storage через API
   */
  private async loadStorageFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useStorageStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading storage from API...')

      // TODO: Заменить на API вызов
      // const response = await fetch('/api/v1/storage')
      // const storage = await response.json()
      // store.setStorage(storage)

      // Сейчас используем существующий метод
      if (!store.initialized) {
        await store.initialize()
      } else {
        await store.fetchBalances()
      }

      return {
        name: 'storage',
        success: true,
        count: store.state?.balances?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load storage'
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'storage',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  // ===== ROLE-BASED LOADING (PLACEHOLDERS) =====

  private async initializePOSStores(): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🏪 [PROD] Initializing POS stores...')

    const results: StoreInitResult[] = []

    // ✅ Load payment settings FIRST (before POS, so dialogs have data available)
    results.push(await this.loadPaymentSettingsFromAPI())

    // POS system
    results.push(await this.loadPOSFromAPI())

    // Sales & Write-off
    const [salesResult, writeOffResult] = await Promise.all([
      this.loadSalesFromAPI(),
      this.loadWriteOffFromAPI()
    ])
    results.push(salesResult, writeOffResult)

    return results
  }

  private async loadPaymentSettingsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = usePaymentSettingsStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading payment settings from API...')

      await store.fetchPaymentMethods()

      return {
        name: 'paymentSettings',
        success: true,
        count: store.paymentMethods.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payment settings'
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'paymentSettings',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadPOSFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = usePosStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading POS from API...')

      // TODO: Заменить на API вызов
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
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'pos',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadSalesFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useSalesStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading sales from API...')

      // TODO: Заменить на API вызов
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
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'sales',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadWriteOffFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useRecipeWriteOffStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading write-offs from API...')

      // TODO: Заменить на API вызов
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
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'writeOff',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadKitchenFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useKitchenStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading Kitchen from API...')

      // TODO: Заменить на API вызов
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
      DebugUtils.error(MODULE_NAME, `❌ [PROD] ${message}`, { error })

      return {
        name: 'kitchen',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  /**
   * TODO: Загрузить preparations через API
   * 🆕 Kitchen Preparation: Required for kitchen/bar roles
   */
  private async loadPreparationsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = usePreparationStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading preparations from API...')

      // TODO: Заменить на API вызов
      if (store.initialize) {
        await store.initialize()
      }

      return {
        name: 'preparations',
        success: true,
        count: store.state?.balances?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preparations'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'preparations',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  /**
   * 🆕 Kitchen KPI: Load KPI store for kitchen/bar roles
   */
  private async loadKitchenKpiFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useKitchenKpiStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading Kitchen KPI from API...')

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
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'kitchenKpi',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async initializeBackofficeStores(): Promise<StoreInitResult[]> {
    DebugUtils.info(MODULE_NAME, '🏢 [PROD] Initializing backoffice stores...')

    // Параллельная загрузка независимых stores
    const results = await Promise.all([this.loadAccountsFromAPI()])

    return results
  }

  private async loadAccountsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useAccountStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading accounts from API...')

      // TODO: Заменить на API вызов, пока используем store method
      await store.initializeStore()

      return {
        name: 'accounts',
        success: true,
        count: store.state?.accounts?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load accounts'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'accounts',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }
}
