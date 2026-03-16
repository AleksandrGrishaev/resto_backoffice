// src/core/initialization/ProductionInitializationStrategy.ts - Production режим инициализации

import type {
  InitializationStrategy,
  InitializationConfig,
  StoreInitResult,
  UserRole,
  StoreName,
  AppContext
} from './types'
import {
  getRequiredStoresForRoles,
  shouldLoadBackofficeStores,
  shouldLoadPOSStores,
  shouldLoadKitchenStores,
  getLoadOrderForStores,
  getStoresForContext,
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
import { useDiscountsStore } from '@/stores/discounts'
import { useSupplierStore } from '@/stores/supplier_2'
import { useChannelsStore } from '@/stores/channels'
import { useGobizStore } from '@/stores/gobiz'
import { useCustomersStore } from '@/stores/customers'
import { useLoyaltyStore } from '@/stores/loyalty'

const MODULE_NAME = 'ProductionInitStrategy'

/**
 * Стратегия инициализации для Production режима
 *
 * Характеристики:
 * - Использует API для загрузки данных
 * - Context-based loading: грузит только stores для текущего контекста (backoffice/pos/kitchen)
 * - Parallel loading: независимые stores грузятся параллельно
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
  private currentContext: AppContext = 'backoffice'
  private loadedStores = new Set<StoreName>()

  constructor(config: InitializationConfig) {
    this.config = config
  }

  getName(): string {
    return 'Production (API + caching)'
  }

  /**
   * Установить контекст приложения (backoffice/pos/kitchen)
   */
  setContext(context: AppContext): void {
    this.currentContext = context
    DebugUtils.info(MODULE_NAME, `📍 Context set to: ${context}`)
  }

  /**
   * Получить текущий контекст
   */
  getContext(): AppContext {
    return this.currentContext
  }

  /**
   * Получить список загруженных stores
   */
  getLoadedStores(): Set<StoreName> {
    return new Set(this.loadedStores)
  }

  /**
   * Инициализировать критические stores
   *
   * ✅ Sprint 10: LAZY LOADING для Backoffice
   * - Backoffice: ТОЛЬКО products + recipes + menu (базовые для навигации)
   * - POS/Kitchen: Полная загрузка (без изменений)
   *
   * LAZY LOAD при переходе на страницу (via router guards):
   * - /storage → storageStore
   * - /accounts → accountStore
   * - /suppliers → supplierStore
   * - /preparations → preparationStore
   * - /counteragents → counteragentsStore
   */
  async initializeCriticalStores(userRoles?: UserRole[]): Promise<StoreInitResult[]> {
    const results: StoreInitResult[] = []
    const requiredStores = getStoresForContext(this.currentContext, userRoles || [])

    // ✅ Sprint 9 + FIX: Проверяем РЕАЛЬНУЮ инициализацию stores, не только флаг loadedStores
    // BUG FIX: После browser refresh, loadedStores может содержать записи,
    // но фактические stores могут быть не инициализированы (state lost)
    const productsStore = useProductsStore()
    const recipesStore = useRecipesStore()
    const menuStore = useMenuStore()

    // Проверяем реальное наличие данных в stores
    // productsStore: проверяем products.length > 0
    // recipesStore: проверяем initialized флаг
    // menuStore: проверяем state.menuItems.length > 0
    const storesActuallyInitialized =
      productsStore.products.length > 0 &&
      recipesStore.initialized &&
      (menuStore.state?.menuItems?.length ?? 0) > 0

    // Если loadedStores говорит что загружено, но stores не инициализированы - очищаем флаги
    if (
      this.loadedStores.has('products') &&
      this.loadedStores.has('recipes') &&
      this.loadedStores.has('menu') &&
      !storesActuallyInitialized
    ) {
      DebugUtils.warn(
        MODULE_NAME,
        '⚠️ [PROD] Stores marked as loaded but NOT initialized! Clearing flags and reloading...',
        {
          loadedStores: Array.from(this.loadedStores),
          productsCount: productsStore.products.length,
          recipesInitialized: recipesStore.initialized,
          menuItemsCount: menuStore.state?.menuItems?.length ?? 0
        }
      )
      this.loadedStores.clear()
    }

    // Если все stores реально инициализированы - пропускаем
    if (storesActuallyInitialized && this.loadedStores.has('products')) {
      DebugUtils.info(MODULE_NAME, '⏭️ [PROD] Critical stores verified and ready, skipping', {
        context: this.currentContext,
        loadedStores: Array.from(this.loadedStores)
      })
      return results
    }

    try {
      // ✅ Sprint 10: Для Backoffice - минимальная загрузка (lazy loading остальных)
      if (this.currentContext === 'backoffice') {
        DebugUtils.info(
          MODULE_NAME,
          '📦 [PROD] Backoffice LAZY MODE: Loading only base stores...',
          {
            context: this.currentContext,
            baseStores: ['products', 'recipes', 'menu'],
            lazyStores: ['storage', 'accounts', 'suppliers', 'preparations', 'counteragents']
          }
        )

        // === ГРУППА 1: Products (базовый, нет зависимостей) ===
        const productsResult = await this.loadProductsFromAPI()
        results.push(productsResult)
        if (productsResult.success) this.loadedStores.add(productsResult.name)

        // === ГРУППА 2: Recipes (зависит от products) ===
        const recipesResult = await this.loadRecipesFromAPI()
        results.push(recipesResult)
        if (recipesResult.success) this.loadedStores.add(recipesResult.name)

        // === ГРУППА 3: Menu (зависит от recipes) ===
        const menuResult = await this.loadMenuFromAPI()
        results.push(menuResult)
        if (menuResult.success) this.loadedStores.add(menuResult.name)

        DebugUtils.info(MODULE_NAME, '✅ [PROD] Backoffice base stores initialized (lazy mode)', {
          count: results.length,
          success: results.filter(r => r.success).length,
          loaded: Array.from(this.loadedStores),
          lazyPending: ['storage', 'accounts', 'suppliers', 'preparations', 'counteragents']
        })

        return results
      }

      // === POS/Kitchen: Полная загрузка (без изменений) ===
      DebugUtils.info(MODULE_NAME, '📦 [PROD] Initializing critical stores...', {
        context: this.currentContext,
        requiredStores
      })

      // === ГРУППА 1: Независимые stores (параллельно) ===
      const group1Promises: Promise<StoreInitResult>[] = [this.loadProductsFromAPI()]

      if (requiredStores.includes('counteragents')) {
        group1Promises.push(this.loadCounteragentsFromAPI())
      }

      const group1Results = await Promise.all(group1Promises)
      results.push(...group1Results)
      group1Results.forEach(r => {
        if (r.success) this.loadedStores.add(r.name)
      })

      // === ГРУППА 2: Зависят от products (параллельно) ===
      const group2Promises: Promise<StoreInitResult>[] = [this.loadRecipesFromAPI()]

      if (requiredStores.includes('storage')) {
        group2Promises.push(this.loadStorageFromAPI())
      }

      const group2Results = await Promise.all(group2Promises)
      results.push(...group2Results)
      group2Results.forEach(r => {
        if (r.success) this.loadedStores.add(r.name)
      })

      // === ГРУППА 3: Зависит от recipes ===
      const menuResult = await this.loadMenuFromAPI()
      results.push(menuResult)
      if (menuResult.success) this.loadedStores.add(menuResult.name)

      DebugUtils.info(MODULE_NAME, '✅ [PROD] Critical stores initialized', {
        count: results.length,
        success: results.filter(r => r.success).length,
        context: this.currentContext
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ [PROD] Critical stores initialization failed', { error })
      throw error
    }

    return results
  }

  /**
   * Инициализировать stores на основе контекста и ролей
   *
   * ОПТИМИЗАЦИЯ: Грузим только stores для текущего контекста
   */
  async initializeRoleBasedStores(userRoles: UserRole[]): Promise<StoreInitResult[]> {
    const requiredStores = getStoresForContext(this.currentContext, userRoles)

    DebugUtils.info(MODULE_NAME, '🏢 [PROD] Initializing context-based stores...', {
      context: this.currentContext,
      userRoles,
      requiredStores: requiredStores.filter(s => !this.loadedStores.has(s))
    })

    const results: StoreInitResult[] = []

    try {
      switch (this.currentContext) {
        case 'pos':
          if (requiredStores.includes('pos')) {
            results.push(...(await this.initializePOSStores()))
          }
          break

        case 'kitchen':
          if (requiredStores.includes('kitchen')) {
            const kitchenResult = await this.loadKitchenFromAPI()
            results.push(kitchenResult)
            if (kitchenResult.success) this.loadedStores.add('kitchen')
          }
          if (requiredStores.includes('preparations') && !this.loadedStores.has('preparations')) {
            const prepResult = await this.loadPreparationsFromAPI()
            results.push(prepResult)
            if (prepResult.success) this.loadedStores.add('preparations')
          }
          if (requiredStores.includes('kitchenKpi')) {
            const kpiResult = await this.loadKitchenKpiFromAPI()
            results.push(kpiResult)
            if (kpiResult.success) this.loadedStores.add('kitchenKpi')
          }
          break

        case 'backoffice':
          results.push(...(await this.initializeBackofficeStores()))
          break
      }

      DebugUtils.info(MODULE_NAME, '✅ [PROD] Context-based stores initialized', {
        context: this.currentContext,
        count: results.length,
        success: results.filter(r => r.success).length,
        totalLoaded: this.loadedStores.size
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '⚠️ [PROD] Context-based stores initialization failed', {
        error
      })
      // Не прерываем - некритичные stores
    }

    return results
  }

  /**
   * Инициализировать stores для нового контекста (при навигации)
   */
  async initializeForContext(
    newContext: AppContext,
    userRoles: UserRole[]
  ): Promise<StoreInitResult[]> {
    const previousContext = this.currentContext
    this.setContext(newContext)

    DebugUtils.info(MODULE_NAME, '🔄 [PROD] Initializing for new context...', {
      previousContext,
      newContext,
      alreadyLoaded: Array.from(this.loadedStores)
    })

    const results: StoreInitResult[] = []
    const requiredStores = getStoresForContext(newContext, userRoles)
    const missingStores = requiredStores.filter(s => !this.loadedStores.has(s))

    if (missingStores.length === 0) {
      DebugUtils.info(MODULE_NAME, '✅ [PROD] All stores already loaded for context', {
        newContext
      })
      return results
    }

    DebugUtils.info(MODULE_NAME, '📦 [PROD] Loading missing stores...', { missingStores })

    for (const storeName of missingStores) {
      const result = await this.loadStoreByName(storeName)
      if (result) {
        results.push(result)
        if (result.success) {
          this.loadedStores.add(storeName)
        }
      }
    }

    return results
  }

  /**
   * Загрузить store по имени
   */
  private async loadStoreByName(storeName: StoreName): Promise<StoreInitResult | null> {
    switch (storeName) {
      case 'products':
        return this.loadProductsFromAPI()
      case 'counteragents':
        return this.loadCounteragentsFromAPI()
      case 'recipes':
        return this.loadRecipesFromAPI()
      case 'menu':
        return this.loadMenuFromAPI()
      case 'storage':
        return this.loadStorageFromAPI()
      case 'preparations':
        return this.loadPreparationsFromAPI()
      case 'suppliers':
        return this.loadSuppliersFromAPI()
      case 'accounts':
        return this.loadAccountsFromAPI()
      case 'pos':
        return this.loadPOSFromAPI()
      case 'paymentSettings':
        return this.loadPaymentSettingsFromAPI()
      case 'sales':
        return this.loadSalesFromAPI()
      case 'writeOff':
        return this.loadWriteOffFromAPI()
      case 'kitchen':
        return this.loadKitchenFromAPI()
      case 'kitchenKpi':
        return this.loadKitchenKpiFromAPI()
      case 'discounts':
        return this.loadDiscountsFromAPI()
      case 'channels':
        return this.loadChannelsFromAPI()
      case 'gobiz':
        return this.loadGobizFromAPI()
      case 'menuCollections':
        return this.loadMenuCollectionsFromAPI()
      case 'customers':
        return this.loadCustomersFromAPI()
      case 'loyalty':
        return this.loadLoyaltyFromAPI()
      case 'website':
        return this.loadWebsiteFromAPI()
      case 'websiteSettings':
        return this.loadWebsiteSettingsFromAPI()
      default:
        DebugUtils.warn(MODULE_NAME, `Unknown store: ${storeName}`)
        return null
    }
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
   * ✅ Sprint 9: Skip cost recalculation for POS/Kitchen (38 sec → 0 sec)
   */
  private async loadRecipesFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useRecipesStore()

      // ✅ Sprint 9: Для POS/Kitchen пропускаем cost recalculation (экономия 38 сек!)
      const skipCostRecalculation =
        this.currentContext === 'pos' || this.currentContext === 'kitchen'

      DebugUtils.store(MODULE_NAME, '[PROD] Loading recipes from API...', {
        context: this.currentContext,
        skipCostRecalculation
      })

      // Сейчас используем существующий метод
      if (store.initialize) {
        await store.initialize({ skipCostRecalculation })
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

    // ✅ Load payment settings + channels FIRST (before POS, so dialogs have data available)
    const [paymentResult, channelsResult] = await Promise.all([
      this.loadPaymentSettingsFromAPI(),
      this.loadChannelsFromAPI()
    ])
    results.push(paymentResult, channelsResult)

    // POS system
    results.push(await this.loadPOSFromAPI())

    // Sales & Write-off
    // ✅ OPTIMIZATION: Use lightweight mode for POS - no history needed, only write capability
    const [salesResult, writeOffResult] = await Promise.all([
      this.loadSalesFromAPI(true), // lightweight=true for POS
      this.loadWriteOffFromAPI(true) // lightweight=true for POS
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

  /**
   * Load Sales store
   * @param lightweight - If true, skip loading history (for POS mode).
   *                      POS only needs recordSalesTransaction, not history.
   */
  private async loadSalesFromAPI(lightweight = false): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useSalesStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading sales from API...', { lightweight })

      if (!store.initialized) {
        await store.initialize({ lightweight })
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

  /**
   * Load WriteOff store
   * @param lightweight - If true, skip loading history (for POS mode).
   *                      POS only needs to create write-offs, not view history.
   */
  private async loadWriteOffFromAPI(lightweight = false): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useRecipeWriteOffStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading write-offs from API...', { lightweight })

      if (!store.initialized) {
        await store.initialize({ lightweight })
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
    // ✅ Sprint 10: Backoffice stores загружаются lazy (через router guards)
    // Accounts, Storage, Suppliers, Preparations, Counteragents - только при переходе на страницу
    DebugUtils.info(MODULE_NAME, '🏢 [PROD] Backoffice stores: LAZY LOADING mode', {
      lazyStores: ['accounts', 'storage', 'suppliers', 'preparations', 'counteragents'],
      note: 'Stores will load on navigation via router guards'
    })

    // НЕ загружаем accounts при старте - lazy load при переходе на /accounts
    return []
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

  private async loadDiscountsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useDiscountsStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading discounts from API...')

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
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'discounts',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadSuppliersFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useSupplierStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading suppliers from API...')

      if (store.initialize) {
        await store.initialize()
      }

      return {
        name: 'suppliers',
        success: true,
        count: store.state?.requests?.length || 0,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load suppliers'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'suppliers',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadChannelsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useChannelsStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading channels from API...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'channels',
        success: true,
        count: store.channels.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load channels'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'channels',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadGobizFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useGobizStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading GoBiz integration from API...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'gobiz',
        success: true,
        count: store.configs.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load GoBiz'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'gobiz',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadCustomersFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useCustomersStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading customers from API...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'customers',
        success: true,
        count: store.customers.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load customers'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'customers',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadLoyaltyFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useLoyaltyStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading loyalty from API...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'loyalty',
        success: true,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load loyalty'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'loyalty',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadWebsiteFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const { useWebsiteStore } = await import('@/stores/website/websiteStore')
      const store = useWebsiteStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading website from API...')

      await store.loadAll()

      return {
        name: 'website',
        success: true,
        count: store.sections.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load website'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'website',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadWebsiteSettingsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const { useWebsiteSettingsStore } = await import('@/stores/website/settingsStore')
      const store = useWebsiteSettingsStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading website settings from API...')

      await store.loadAll()

      return {
        name: 'websiteSettings',
        success: true,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load website settings'
      DebugUtils.warn(MODULE_NAME, `⚠️ [PROD] ${message} (non-critical)`, { error })

      return {
        name: 'websiteSettings',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadMenuCollectionsFromAPI(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const { useMenuCollectionsStore } = await import('@/stores/menuCollections')
      const store = useMenuCollectionsStore()

      DebugUtils.store(MODULE_NAME, '[PROD] Loading menu collections from API...')

      if (!store.initialized) {
        await store.initialize()
      }

      return {
        name: 'menuCollections',
        success: true,
        count: store.collections.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load menu collections'
      DebugUtils.warn(MODULE_NAME, `[PROD] ${message} (non-critical)`, { error })

      return {
        name: 'menuCollections',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }
}
