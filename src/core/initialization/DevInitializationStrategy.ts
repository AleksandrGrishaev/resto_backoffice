// src/core/initialization/DevInitializationStrategy.ts - Dev режим инициализации

import type {
  InitializationStrategy,
  InitializationConfig,
  StoreInitResult,
  UserRole,
  AppContext,
  StoreName
} from './types'
import {
  getRequiredStoresForRoles,
  shouldLoadBackofficeStores,
  shouldLoadPOSStores,
  shouldLoadKitchenStores,
  getStoresForContext,
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
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import { useChannelsStore } from '@/stores/channels'
import { useGobizStore } from '@/stores/gobiz'

const MODULE_NAME = 'DevInitStrategy'

/**
 * Стратегия инициализации для Development режима
 *
 * Характеристики:
 * - Использует Supabase + localStorage для оффлайн кеширования
 * - Context-based loading: грузит только stores для текущего контекста (backoffice/pos/kitchen)
 * - Parallel loading: независимые stores грузятся параллельно
 * - Подробное логирование
 */
export class DevInitializationStrategy implements InitializationStrategy {
  private config: InitializationConfig
  private currentContext: AppContext = 'backoffice'
  private loadedStores = new Set<StoreName>()

  constructor(config: InitializationConfig) {
    this.config = config
  }

  getName(): string {
    return 'Development (Supabase + localStorage)'
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
   * ОПТИМИЗАЦИЯ: Параллельная загрузка независимых stores
   * - products и counteragents грузятся параллельно (нет зависимостей)
   * - recipes и storage грузятся параллельно (оба зависят только от products)
   * - menu грузится последней (зависит от recipes)
   */
  async initializeCriticalStores(userRoles?: UserRole[]): Promise<StoreInitResult[]> {
    const results: StoreInitResult[] = []
    const requiredStores = getStoresForContext(this.currentContext, userRoles || [])

    // ✅ Sprint 9: Если critical stores уже загружены - пропускаем
    if (
      this.loadedStores.has('products') &&
      this.loadedStores.has('recipes') &&
      this.loadedStores.has('menu')
    ) {
      DebugUtils.info(MODULE_NAME, '⏭️ [DEV] Critical stores already loaded, skipping', {
        context: this.currentContext,
        loadedStores: Array.from(this.loadedStores)
      })
      return results
    }

    try {
      DebugUtils.info(MODULE_NAME, '📦 [DEV] Initializing critical stores...', {
        context: this.currentContext,
        requiredStores
      })

      // === ГРУППА 1: Независимые stores (параллельно) ===
      const group1Promises: Promise<StoreInitResult>[] = [this.loadProducts()]

      // counteragents нужен только для backoffice и pos контекстов
      if (requiredStores.includes('counteragents')) {
        group1Promises.push(this.loadCounterAgents())
      }

      const group1Results = await Promise.all(group1Promises)
      results.push(...group1Results)
      group1Results.forEach(r => {
        if (r.success) this.loadedStores.add(r.name)
      })

      // === ГРУППА 2: Зависят от products (параллельно) ===
      const group2Promises: Promise<StoreInitResult>[] = [this.loadRecipes()]

      // storage нужен для backoffice и pos контекстов
      if (requiredStores.includes('storage')) {
        group2Promises.push(this.loadStorage())
      }

      const group2Results = await Promise.all(group2Promises)
      results.push(...group2Results)
      group2Results.forEach(r => {
        if (r.success) this.loadedStores.add(r.name)
      })

      // === ГРУППА 3: Зависит от recipes ===
      const menuResult = await this.loadMenu()
      results.push(menuResult)
      if (menuResult.success) this.loadedStores.add(menuResult.name)

      DebugUtils.info(MODULE_NAME, '✅ [DEV] Critical stores initialized', {
        count: results.length,
        success: results.filter(r => r.success).length,
        context: this.currentContext
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ [DEV] Critical stores initialization failed', { error })
      throw error
    }

    return results
  }

  /**
   * Инициализировать stores на основе контекста и ролей
   *
   * ОПТИМИЗАЦИЯ: Грузим только stores для текущего контекста
   * - backoffice: counteragents, suppliers, storage, preparations, accounts, discounts
   * - pos: pos, sales, writeOff, paymentSettings
   * - kitchen: kitchen, kitchenKpi, preparations
   */
  async initializeRoleBasedStores(userRoles: UserRole[]): Promise<StoreInitResult[]> {
    const requiredStores = getStoresForContext(this.currentContext, userRoles)

    DebugUtils.info(MODULE_NAME, '🏢 [DEV] Initializing context-based stores...', {
      context: this.currentContext,
      userRoles,
      requiredStores: requiredStores.filter(s => !this.loadedStores.has(s))
    })

    const results: StoreInitResult[] = []

    try {
      switch (this.currentContext) {
        case 'pos':
          // POS контекст: грузим только POS stores
          if (requiredStores.includes('pos')) {
            results.push(...(await this.initializePOSStores()))
          }
          break

        case 'kitchen':
          // Kitchen контекст: грузим только Kitchen stores
          if (requiredStores.includes('kitchen')) {
            results.push(await this.loadKitchen())
            this.loadedStores.add('kitchen')
          }
          if (requiredStores.includes('preparations') && !this.loadedStores.has('preparations')) {
            results.push(await this.loadPreparations())
            this.loadedStores.add('preparations')
          }
          if (requiredStores.includes('kitchenKpi')) {
            results.push(await this.loadKitchenKpi())
            this.loadedStores.add('kitchenKpi')
          }
          // Storage для Kitchen Inventory feature
          if (requiredStores.includes('storage') && !this.loadedStores.has('storage')) {
            results.push(await this.loadStorage())
            this.loadedStores.add('storage')
          }
          break

        case 'backoffice':
          // Backoffice контекст: грузим только Backoffice stores
          results.push(...(await this.initializeBackofficeStores()))
          break
      }

      DebugUtils.info(MODULE_NAME, '✅ [DEV] Context-based stores initialized', {
        context: this.currentContext,
        count: results.length,
        success: results.filter(r => r.success).length,
        totalLoaded: this.loadedStores.size
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ [DEV] Context-based stores initialization failed', {
        error
      })
      // Не прерываем - некритичные stores
    }

    return results
  }

  /**
   * Инициализировать stores для нового контекста (при навигации)
   * Грузит только те stores, которые ещё не загружены
   */
  async initializeForContext(
    newContext: AppContext,
    userRoles: UserRole[]
  ): Promise<StoreInitResult[]> {
    const previousContext = this.currentContext
    this.setContext(newContext)

    DebugUtils.info(MODULE_NAME, '🔄 [DEV] Initializing for new context...', {
      previousContext,
      newContext,
      alreadyLoaded: Array.from(this.loadedStores)
    })

    const results: StoreInitResult[] = []
    const requiredStores = getStoresForContext(newContext, userRoles)
    const missingStores = requiredStores.filter(s => !this.loadedStores.has(s))

    if (missingStores.length === 0) {
      DebugUtils.info(MODULE_NAME, '✅ [DEV] All stores already loaded for context', { newContext })
      return results
    }

    DebugUtils.info(MODULE_NAME, '📦 [DEV] Loading missing stores...', { missingStores })

    // Грузим недостающие stores
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
        return this.loadProducts()
      case 'counteragents':
        return this.loadCounterAgents()
      case 'recipes':
        return this.loadRecipes()
      case 'menu':
        return this.loadMenu()
      case 'storage':
        return this.loadStorage()
      case 'preparations':
        return this.loadPreparations()
      case 'suppliers':
        return this.loadSuppliers()
      case 'accounts':
        return this.loadAccounts()
      case 'discounts':
        return this.loadDiscounts()
      case 'pos':
        return this.loadPOS()
      case 'paymentSettings':
        return this.loadPaymentSettings()
      case 'sales':
        return this.loadSales()
      case 'writeOff':
        return this.loadWriteOff()
      case 'kitchen':
        return this.loadKitchen()
      case 'kitchenKpi':
        return this.loadKitchenKpi()
      case 'channels':
        return this.loadChannels()
      case 'gobiz':
        return this.loadGobiz()
      default:
        DebugUtils.warn(MODULE_NAME, `Unknown store: ${storeName}`)
        return null
    }
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

      // ✅ Sprint 9: Для POS/Kitchen пропускаем cost recalculation (экономия 38 сек!)
      const skipCostRecalculation =
        this.currentContext === 'pos' || this.currentContext === 'kitchen'

      DebugUtils.store(MODULE_NAME, '[DEV] Loading recipes and preparations...', {
        context: this.currentContext,
        skipCostRecalculation
      })

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

    // ✅ Load payment settings + channels FIRST (before POS, so dialogs have data available)
    const [paymentResult, channelsResult] = await Promise.all([
      this.loadPaymentSettings(),
      this.loadChannels()
    ])
    results.push(paymentResult, channelsResult)
    if (paymentResult.success) this.loadedStores.add('paymentSettings')
    if (channelsResult.success) this.loadedStores.add('channels')

    // POS system
    const posResult = await this.loadPOS()
    results.push(posResult)
    if (posResult.success) this.loadedStores.add('pos')

    // Sales & Write-off (параллельно)
    // ✅ OPTIMIZATION: Use lightweight mode for POS - no history needed, only write capability
    const [salesResult, writeOffResult] = await Promise.all([
      this.loadSales(true), // lightweight=true for POS
      this.loadWriteOff(true) // lightweight=true for POS
    ])
    results.push(salesResult, writeOffResult)
    if (salesResult.success) this.loadedStores.add('sales')
    if (writeOffResult.success) this.loadedStores.add('writeOff')

    return results
  }

  private async loadPaymentSettings(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = usePaymentSettingsStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading payment settings...')

      await store.fetchPaymentMethods()

      return {
        name: 'paymentSettings',
        success: true,
        count: store.paymentMethods.length,
        duration: Date.now() - start
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payment settings'
      DebugUtils.error(MODULE_NAME, `❌ [DEV] ${message}`, { error })

      return {
        name: 'paymentSettings',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
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

  /**
   * Load Sales store
   * @param lightweight - If true, skip loading history (for POS mode)
   */
  private async loadSales(lightweight = false): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useSalesStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading sales transactions...', { lightweight })

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
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

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
   * @param lightweight - If true, skip loading history (for POS mode)
   */
  private async loadWriteOff(lightweight = false): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useRecipeWriteOffStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading recipe write-offs...', { lightweight })

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

    const results: StoreInitResult[] = []

    // Preparations: зависит от recipes (уже загружены в critical)
    if (!this.loadedStores.has('preparations')) {
      const preparationsResult = await this.loadPreparations()
      results.push(preparationsResult)
      if (preparationsResult.success) this.loadedStores.add('preparations')
    }

    // Параллельная загрузка независимых stores
    const parallelPromises: Promise<StoreInitResult>[] = []

    if (!this.loadedStores.has('accounts')) {
      parallelPromises.push(this.loadAccounts())
    }
    if (!this.loadedStores.has('suppliers')) {
      parallelPromises.push(this.loadSuppliers())
    }
    if (!this.loadedStores.has('discounts')) {
      parallelPromises.push(this.loadDiscounts())
    }
    if (!this.loadedStores.has('channels')) {
      parallelPromises.push(this.loadChannels())
    }
    if (!this.loadedStores.has('gobiz')) {
      parallelPromises.push(this.loadGobiz())
    }

    if (parallelPromises.length > 0) {
      const parallelResults = await Promise.all(parallelPromises)
      parallelResults.forEach(r => {
        results.push(r)
        if (r.success) this.loadedStores.add(r.name)
      })
    }

    return results
  }

  private async loadChannels(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useChannelsStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading channels...')

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
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'channels',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
  }

  private async loadGobiz(): Promise<StoreInitResult> {
    const start = Date.now()

    try {
      const store = useGobizStore()

      DebugUtils.store(MODULE_NAME, '[DEV] Loading GoBiz integration...')

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
      DebugUtils.warn(MODULE_NAME, `⚠️ [DEV] ${message} (non-critical)`, { error })

      return {
        name: 'gobiz',
        success: false,
        error: message,
        duration: Date.now() - start
      }
    }
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
        count: store.state?.accounts?.length || 0,
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
        count: store.state?.batches?.length || 0,
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
        count: store.state?.requests?.length || 0,
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
