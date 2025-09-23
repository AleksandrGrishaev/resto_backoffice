// src/core/appInitializer.ts - ОБНОВЛЕННЫЙ с поддержкой POS и ролевой инициализации

import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useAccountStore } from '@/stores/account'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSupplierStore } from '@/stores/supplier_2'
import { useDebugStore } from '@/stores/debug'

// 🆕 POS STORES
import { usePosStore } from '@/stores/pos'
import { useAuthStore } from '@/stores/auth'

import { AppInitializerTests } from './appInitializerTests'
import { DebugUtils } from '@/utils'
import { usePlatform } from '@/composables/usePlatform'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'AppInitializer'

export interface InitializationConfig {
  useMockData: boolean
  enableDebug: boolean
  runIntegrationTests: boolean
  userRoles?: string[] // 🆕 НОВОЕ ПОЛЕ
}

export class AppInitializer {
  private config: InitializationConfig
  private tests: AppInitializerTests
  private platform = usePlatform()

  constructor(config: InitializationConfig) {
    this.config = config
    this.tests = new AppInitializerTests(config)
  }

  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🚀 Starting app initialization', {
        useMockData: this.config.useMockData,
        enableDebug: this.config.enableDebug,
        runIntegrationTests: this.config.runIntegrationTests,
        userRoles: this.config.userRoles,
        platform: this.platform.platform.value
      })

      // 🆕 НОВАЯ ЛОГИКА: Определяем что инициализировать на основе ролей
      const authStore = useAuthStore()
      const userRoles = this.config.userRoles || authStore.userRoles

      if (this.shouldInitializeBackoffice(userRoles)) {
        await this.initializeBackofficeStores()
      }

      if (this.shouldInitializePOS(userRoles)) {
        await this.initializePOSStores()
      }

      // Debug system (если включен)
      if (this.config.enableDebug) {
        await this.initializeDebugSystem()
      }

      // Integration tests (если включены)
      if (this.config.runIntegrationTests && import.meta.env.DEV) {
        await this.runIntegrationTests()
      }

      DebugUtils.info(MODULE_NAME, '✅ App initialization completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ App initialization failed', { error })
      throw error
    }

    this.showInitializationSummary()
  }

  // ===== 🆕 НОВЫЕ МЕТОДЫ: ОПРЕДЕЛЕНИЕ ТИПА ИНИЦИАЛИЗАЦИИ =====

  private shouldInitializeBackoffice(userRoles: string[]): boolean {
    return userRoles.some(role => ['admin', 'manager'].includes(role))
  }

  private shouldInitializePOS(userRoles: string[]): boolean {
    return userRoles.some(role => ['admin', 'cashier'].includes(role))
  }

  // ===== BACKOFFICE INITIALIZATION =====

  private async initializeBackofficeStores(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '🏢 Initializing Backoffice stores...')

    // Phase 1: Core catalogs (sequential - recipes depend on products)
    await this.loadCoreCatalogs()

    // Phase 2: Integrated stores (storage, menu, accounts, suppliers)
    await this.loadIntegratedStores()

    DebugUtils.info(MODULE_NAME, '✅ Backoffice stores initialized')
  }

  private async loadCoreCatalogs(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '📋 Loading core catalogs...')

    // ВАЖНО: Последовательная загрузка - рецепты зависят от продуктов
    await this.loadProducts()
    await this.loadCounterAgents()
    await this.loadRecipes()

    DebugUtils.info(MODULE_NAME, '✅ Core catalogs loaded successfully')
  }

  private async loadProducts(): Promise<void> {
    const productStore = useProductsStore()

    DebugUtils.store(MODULE_NAME, 'Loading products...', {
      useMock: this.config.useMockData
    })

    try {
      await productStore.loadProducts(this.config.useMockData)

      DebugUtils.info(MODULE_NAME, 'Products loaded successfully', {
        count: productStore.products.length,
        sellable: productStore.sellableProducts.length,
        rawMaterials: productStore.rawMaterials.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load products', { error })
      throw new Error(`Products loading failed: ${error}`)
    }
  }

  // 2. В методе loadCounterAgents() заменить DebugUtils.debug на DebugUtils.store:
  private async loadCounterAgents(): Promise<void> {
    const counteragentsStore = useCounteragentsStore()

    DebugUtils.store(MODULE_NAME, 'Loading counteragents...', {
      useMock: this.config.useMockData
    })

    try {
      if (counteragentsStore.initialize) {
        await counteragentsStore.initialize()
      }

      DebugUtils.info(MODULE_NAME, 'Counteragents loaded successfully', {
        total: counteragentsStore.counteragents.length,
        suppliers: counteragentsStore.supplierCounterAgents.length,
        active: counteragentsStore.activeCounterAgents.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load counteragents', { error })
      throw new Error(`Counteragents loading failed: ${error}`)
    }
  }

  // 3. В методе loadRecipes() заменить DebugUtils.debug на DebugUtils.store:
  private async loadRecipes(): Promise<void> {
    const recipesStore = useRecipesStore()

    DebugUtils.store(MODULE_NAME, 'Loading recipes and preparations...', {
      useMock: this.config.useMockData
    })

    try {
      if (recipesStore.initialize) {
        await recipesStore.initialize()
      }

      DebugUtils.store(MODULE_NAME, 'Recipes loaded successfully', {
        recipes: recipesStore.recipes.length,
        preparations: recipesStore.preparations.length,
        categories: recipesStore.categories.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load recipes', { error })
      throw new Error(`Recipes loading failed: ${error}`)
    }
  }

  private async loadIntegratedStores(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '🔗 Loading integrated stores...')

    // Параллельная загрузка независимых stores
    await Promise.all([
      this.loadMenu(),
      this.loadAccounts(),
      this.loadStorage(),
      this.loadPreparations(),
      this.loadSuppliers()
    ])

    DebugUtils.info(MODULE_NAME, '✅ Integrated stores loaded successfully')
  }

  private async loadMenu(): Promise<void> {
    try {
      const menuStore = useMenuStore()

      if (menuStore.initialize) {
        await menuStore.initialize()
      }

      DebugUtils.store(MODULE_NAME, '📄 Menu loaded', {
        items: menuStore.state?.value?.menuItems?.length || 0,
        categories: menuStore.state?.value?.categories?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load menu (non-critical)', { error })
    }
  }

  private async loadAccounts(): Promise<void> {
    try {
      const accountStore = useAccountStore()

      if (accountStore.initialize) {
        await accountStore.initialize()
      }

      DebugUtils.debug(MODULE_NAME, '💰 Accounts loaded', {
        accounts: accountStore.state?.value?.accounts?.length || 0,
        transactions: accountStore.state?.value?.transactions?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load accounts (non-critical)', { error })
    }
  }

  private async loadStorage(): Promise<void> {
    try {
      const storageStore = useStorageStore()

      if (storageStore.fetchBalances) {
        await storageStore.fetchBalances()
      }

      DebugUtils.store(MODULE_NAME, '📦 Storage loaded', {
        balances: storageStore.state?.value?.balances?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load storage (non-critical)', { error })
    }
  }

  private async loadPreparations(): Promise<void> {
    try {
      const preparationStore = usePreparationStore()

      if (preparationStore.initialize) {
        await preparationStore.initialize()
      }

      DebugUtils.store(MODULE_NAME, '🧑‍🍳 Preparations loaded', {
        preparations: preparationStore.state?.value?.preparations?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load preparations (non-critical)', { error })
    }
  }

  private async loadSuppliers(): Promise<void> {
    try {
      const supplierStore = useSupplierStore()

      if (supplierStore.initialize) {
        await supplierStore.initialize()
      }

      DebugUtils.store(MODULE_NAME, '🚚 Suppliers loaded', {
        requests: supplierStore.state?.value?.requests?.length || 0,
        orders: supplierStore.state?.value?.orders?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load suppliers (non-critical)', { error })
    }
  }

  // ===== 🆕 POS INITIALIZATION =====

  private async initializePOSStores(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '🏪 Initializing POS stores...')

    try {
      const posStore = usePosStore()

      // Вызываем упрощенную инициализацию POS
      const result = await posStore.initializePOS()

      if (!result.success) {
        throw new Error(result.error || 'POS initialization failed')
      }

      DebugUtils.info(MODULE_NAME, '✅ POS stores initialized successfully', {
        isReady: posStore.isReady,
        isOnline: posStore.isOnline
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to initialize POS stores', { error })
      // POS инициализация критична для кассиров
      throw error
    }
  }

  // ===== DEBUG SYSTEM =====

  private async initializeDebugSystem(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🐛 Initializing debug system...')

      const debugStore = useDebugStore()
      await debugStore.initialize()

      DebugUtils.info(MODULE_NAME, '✅ Debug system initialized successfully', {
        availableStores: debugStore.storesSortedByPriority.length,
        loadedStores: debugStore.totalStoresLoaded
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to initialize debug system', { error })
      // Debug система не критична, не прерываем инициализацию
    }
  }

  // ===== INTEGRATION TESTS =====

  private async runIntegrationTests(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🧪 Running integration tests...')

      const testResults = await this.tests.runAllTests()

      DebugUtils.info(MODULE_NAME, '✅ Integration tests completed', {
        totalTests: testResults.totalTests,
        passed: testResults.passed,
        failed: testResults.failed,
        duration: testResults.duration
      })

      if (testResults.failed > 0) {
        DebugUtils.warn(MODULE_NAME, '⚠️ Some integration tests failed', {
          failedTests: testResults.results.filter(r => !r.success)
        })
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Integration tests failed', { error })
      // Тесты не критичны в development
    }
  }

  /**
   * Показать сводку инициализации
   */
  private showInitializationSummary(): void {
    const authStore = useAuthStore()
    const userRoles = authStore.userRoles

    // Информация об устройстве и среде
    const deviceInfo = {
      platform: this.platform.platform.value,
      online: this.platform.isOnline.value,
      userRole: userRoles.join(', '),
      debugMode: ENV.debugEnabled,
      mockData: ENV.useMockData,
      offlineEnabled: ENV.enableOffline
    }

    // Статус stores
    const storesStatus: any = {}

    if (this.shouldInitializeBackoffice(userRoles)) {
      storesStatus.products = this.getStoreStatus(
        () => useProductsStore().products?.length,
        'items'
      )
      storesStatus.counteragents = this.getStoreStatus(
        () => useCounteragentsStore().counteragents?.length,
        'items'
      )
      storesStatus.recipes = this.getStoreStatus(() => useRecipesStore().recipes?.length, 'items')
    }

    if (this.shouldInitializePOS(userRoles)) {
      storesStatus.pos = usePosStore().isInitialized ? 'Ready' : 'Failed'
    }

    // Выводим сводки
    DebugUtils.deviceInfo(deviceInfo)
    DebugUtils.summary('Initialization Summary', storesStatus)
  }

  /**
   * Получить статус store
   */
  private getStoreStatus(getter: () => number | undefined, unit: string): string {
    try {
      const count = getter()
      return count !== undefined && count > 0 ? `${count} ${unit}` : 'Empty'
    } catch {
      return 'Failed'
    }
  }

  // ===== PUBLIC UTILITIES =====

  async reinitialize(newConfig?: Partial<InitializationConfig>): Promise<void> {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig }
    }
    await this.initialize()
  }

  getInitializationStatus() {
    // Возвращаем статус инициализированных stores
    const backofficeStores = {
      products: !!useProductsStore().products?.length,
      recipes: !!useRecipesStore().recipes?.length,
      counteragents: !!useCounteragentsStore().counteragents?.length,
      menu: !!useMenuStore().state?.value?.menuItems?.length,
      accounts: !!useAccountStore().state?.value?.accounts?.length,
      storage: !!useStorageStore().state?.value?.balances?.length,
      preparations: !!usePreparationStore().state?.value?.preparations?.length,
      suppliers: !!useSupplierStore().state?.value?.requests?.length
    }

    const posStores = {
      pos: !!usePosStore().isInitialized
    }

    const debugStores = {
      debug: !!useDebugStore().storesSortedByPriority?.length
    }

    return {
      config: this.config,
      platform: this.platform.platform.value,
      stores: {
        backoffice: backofficeStores,
        pos: posStores,
        debug: debugStores
      },
      summary: {
        backofficeLoaded: Object.values(backofficeStores).filter(Boolean).length,
        posLoaded: Object.values(posStores).filter(Boolean).length,
        debugLoaded: Object.values(debugStores).filter(Boolean).length
      }
    }
  }

  async validateIntegration(): Promise<boolean> {
    return await this.tests.validateIntegration()
  }
}

// ===== FACTORY FUNCTIONS =====

/**
 * Создать конфигурацию AppInitializer на основе environment
 */
function createAppInitializer(): AppInitializer {
  const config: InitializationConfig = {
    useMockData: ENV.useMockData,
    enableDebug: ENV.debugEnabled,
    runIntegrationTests: ENV.debugEnabled && import.meta.env.DEV
  }

  DebugUtils.debug(MODULE_NAME, 'Creating AppInitializer with config', {
    config,
    env: {
      platform: ENV.platform,
      useMockData: ENV.useMockData,
      enableOffline: ENV.enableOffline,
      debugEnabled: ENV.debugEnabled,
      useFirebase: ENV.useFirebase,
      useMockEnv: import.meta.env.VITE_USE_MOCK_DATA,
      mode: import.meta.env.MODE
    }
  })

  return new AppInitializer(config)
}

// ===== GLOBAL INSTANCE =====

let appInitializer: AppInitializer | null = null

export function useAppInitializer(): AppInitializer {
  if (!appInitializer) {
    appInitializer = createAppInitializer()
  }
  return appInitializer
}
