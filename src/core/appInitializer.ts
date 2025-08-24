// src/core/appInitializer.ts - CLEANED: Убраны все импорты и инициализация истории

import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useAccountStore } from '@/stores/account'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSupplierStore } from '@/stores/supplier_2'
import { useDebugStore } from '@/stores/debug'
import { AppInitializerTests } from './appInitializerTests'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AppInitializer'

export interface InitializationConfig {
  useMockData: boolean
  enableDebug: boolean
  runIntegrationTests: boolean
}

export class AppInitializer {
  private config: InitializationConfig
  private tests: AppInitializerTests

  constructor(config: InitializationConfig) {
    this.config = config
    this.tests = new AppInitializerTests(config)
  }

  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🚀 Starting app initialization', {
        useMockData: this.config.useMockData,
        enableDebug: this.config.enableDebug,
        runIntegrationTests: this.config.runIntegrationTests
      })

      // Phase 1: Core catalogs (sequential - recipes depend on products)
      await this.loadCoreCatalogs()

      // Phase 2: Integrated stores (storage, menu, accounts, suppliers)
      await this.loadIntegratedStores()

      // Phase 3: Debug system (if enabled)
      if (this.config.enableDebug) {
        await this.initializeDebugSystem()
      }

      // Phase 4: Integration tests (if enabled and in dev mode)
      if (this.config.runIntegrationTests && import.meta.env.DEV) {
        await this.runIntegrationTests()
      }

      DebugUtils.info(MODULE_NAME, '✅ App initialization completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ App initialization failed', { error })
      throw error
    }
  }

  // =============================================
  // PHASE 1: CORE CATALOGS
  // =============================================

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

    DebugUtils.debug(MODULE_NAME, '🛍️ Loading products...', {
      useMock: this.config.useMockData
    })

    try {
      await productStore.loadProducts(this.config.useMockData)

      DebugUtils.info(MODULE_NAME, '✅ Products loaded successfully', {
        count: productStore.products.length,
        sellable: productStore.sellableProducts.length,
        rawMaterials: productStore.rawMaterials.length,
        stats: productStore.statistics
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to load products', { error })
      throw new Error(`Products loading failed: ${error}`)
    }
  }

  private async loadCounterAgents(): Promise<void> {
    const counteragentsStore = useCounteragentsStore()

    DebugUtils.debug(MODULE_NAME, '🏪 Loading counteragents...', {
      useMock: this.config.useMockData
    })

    try {
      // Инициализируем counteragents store
      if (counteragentsStore.initialize) {
        await counteragentsStore.initialize()
      }

      DebugUtils.info(MODULE_NAME, '✅ Counteragents loaded successfully', {
        total: counteragentsStore.counteragents.length,
        suppliers: counteragentsStore.supplierCounterAgents.length,
        active: counteragentsStore.activeCounterAgents.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to load counteragents', { error })
      throw new Error(`Counteragents loading failed: ${error}`)
    }
  }

  private async loadRecipes(): Promise<void> {
    const recipesStore = useRecipesStore()

    DebugUtils.debug(MODULE_NAME, '👨‍🍳 Loading recipes and preparations...', {
      useMock: this.config.useMockData
    })

    try {
      // Инициализируем Recipe Store с полной интеграцией
      await recipesStore.initialize()

      DebugUtils.info(MODULE_NAME, '✅ Recipes and preparations loaded successfully', {
        preparations: recipesStore.activePreparations.length,
        recipes: recipesStore.activeRecipes.length,
        units: recipesStore.units.length,
        statistics: recipesStore.statistics,
        integration: 'Product Store integration active'
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to load recipes', { error })
      throw new Error(`Recipes loading failed: ${error}`)
    }
  }

  // =============================================
  // PHASE 2: INTEGRATED STORES
  // =============================================

  private async loadIntegratedStores(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '🔗 Loading integrated stores...')

    // Загружаем stores которые не критичны для основной работы
    await Promise.allSettled([
      this.loadAccounts(),
      this.loadMenu(),
      this.loadStorage(),
      this.loadPreparations(),
      this.loadSuppliers()
    ])

    DebugUtils.info(MODULE_NAME, '✅ Integrated stores loaded')
  }

  private async loadAccounts(): Promise<void> {
    try {
      const accountStore = useAccountStore()

      if (accountStore.fetchAccounts) {
        await accountStore.fetchAccounts()
      }

      DebugUtils.debug(MODULE_NAME, '💰 Accounts loaded', {
        accounts: accountStore.state?.value?.accounts?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load accounts (non-critical)', { error })
    }
  }

  private async loadMenu(): Promise<void> {
    try {
      const menuStore = useMenuStore()

      if (menuStore.initialize) {
        await menuStore.initialize()
      }

      DebugUtils.debug(MODULE_NAME, '🍽️ Menu loaded', {
        categories: menuStore.categories?.value?.length || 0,
        menuItems: menuStore.menuItems?.value?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load menu (non-critical)', { error })
    }
  }

  private async loadStorage(): Promise<void> {
    try {
      const storageStore = useStorageStore()

      if (storageStore.fetchBalances) {
        await storageStore.fetchBalances()
      }

      DebugUtils.debug(MODULE_NAME, '📦 Storage loaded', {
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

      DebugUtils.debug(MODULE_NAME, '🧑‍🍳 Preparations loaded', {
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

      DebugUtils.debug(MODULE_NAME, '🚚 Suppliers loaded', {
        requests: supplierStore.state?.value?.requests?.length || 0,
        orders: supplierStore.state?.value?.orders?.length || 0
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load suppliers (non-critical)', { error })
    }
  }

  // =============================================
  // PHASE 3: DEBUG SYSTEM (simplified - no history)
  // =============================================

  private async initializeDebugSystem(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🐛 Initializing debug system (simplified)...')

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

  // =============================================
  // PHASE 4: INTEGRATION TESTS
  // =============================================

  private async runIntegrationTests(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🧪 Running integration tests...')

      const testResults = await this.tests.runAllIntegrationTests()

      if (testResults) {
        DebugUtils.info(MODULE_NAME, '✅ All integration tests passed')

        // Запускаем дополнительные тесты
        await this.tests.testProductRecipeIntegration()
        await this.tests.testProductCounteragentIntegration()
        await this.tests.testLoadingPerformance()
      } else {
        DebugUtils.warn(MODULE_NAME, '⚠️ Some integration tests failed')
      }

      // Генерируем итоговый отчет
      const report = this.tests.generateIntegrationReport()
      DebugUtils.info(MODULE_NAME, 'Integration report generated', {
        summary: report.summary
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Integration tests failed', { error })
      // Тесты не критичны, не прерываем инициализацию
    }
  }

  // =============================================
  // VALIDATION HELPERS
  // =============================================

  /**
   * Валидация что интеграция Product ↔ Recipe работает
   */
  private async validateProductRecipeIntegration(): Promise<void> {
    try {
      const recipesStore = useRecipesStore()
      const preparations = recipesStore.activePreparations

      if (preparations.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No active preparations found for integration validation')
        return
      }

      // Пробуем рассчитать стоимость первого полуфабриката
      const testPreparation = preparations[0]
      const cost = await recipesStore.calculatePreparationCost(testPreparation.id)

      DebugUtils.info(MODULE_NAME, '✅ Product ↔ Recipe integration validated', {
        testPreparation: testPreparation.name,
        calculatedCost: cost.totalCost.toFixed(2),
        costPerUnit: cost.costPerOutputUnit.toFixed(2),
        components: cost.componentCosts.length
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Product ↔ Recipe integration validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Не прерываем инициализацию, просто предупреждаем
    }
  }

  /**
   * Проверка доступности всех критических stores
   */
  private validateCriticalStores(): void {
    const productStore = useProductsStore()
    const recipesStore = useRecipesStore()

    const criticalStoresStatus = {
      products: (productStore.products?.length || 0) > 0,
      recipes:
        (recipesStore.activePreparations?.length || 0) > 0 ||
        (recipesStore.activeRecipes?.length || 0) > 0
    }

    const failedStores = Object.entries(criticalStoresStatus)
      .filter(([_, isLoaded]) => !isLoaded)
      .map(([storeName, _]) => storeName)

    if (failedStores.length > 0) {
      throw new Error(`Critical stores failed to load: ${failedStores.join(', ')}`)
    }

    DebugUtils.debug(MODULE_NAME, '✅ Critical stores validation passed', criticalStoresStatus)
  }

  // =============================================
  // PUBLIC METHODS
  // =============================================

  /**
   * Получить статус инициализации
   */
  getInitializationStatus(): Record<string, any> {
    try {
      return this.tests.generateIntegrationReport()
    } catch (error) {
      return {
        error: 'Failed to generate status',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Переинициализация с новой конфигурацией
   */
  async reinitialize(newConfig: Partial<InitializationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig }
    this.tests = new AppInitializerTests(this.config)

    DebugUtils.info(MODULE_NAME, 'Reinitializing with new config', this.config)
    await this.initialize()
  }

  /**
   * Валидация интеграции между stores
   */
  async validateIntegration(): Promise<boolean> {
    try {
      this.validateCriticalStores()
      await this.validateProductRecipeIntegration()
      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Integration validation failed', { error })
      return false
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =============================================
// FACTORY FUNCTION (упрощенный)
// =============================================

export function createAppInitializer(): AppInitializer {
  const config: InitializationConfig = {
    // Проверяем несколько способов определения mock режима
    useMockData:
      import.meta.env.DEV ||
      import.meta.env.VITE_USE_MOCK === 'true' ||
      !import.meta.env.VITE_FIREBASE_PROJECT_ID, // Если нет Firebase config, используем mock

    // Debug включен только в dev режиме
    enableDebug: import.meta.env.DEV,

    // Integration tests только в dev режиме
    runIntegrationTests: import.meta.env.DEV
  }

  DebugUtils.info(MODULE_NAME, '⚙️ Creating app initializer (simplified)', {
    config,
    env: {
      isDev: import.meta.env.DEV,
      hasFirebase: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
      useMockEnv: import.meta.env.VITE_USE_MOCK,
      mode: import.meta.env.MODE
    }
  })

  return new AppInitializer(config)
}

// =============================================
// GLOBAL INSTANCE
// =============================================

let appInitializer: AppInitializer | null = null

export function useAppInitializer(): AppInitializer {
  if (!appInitializer) {
    appInitializer = createAppInitializer()
  }
  return appInitializer
}

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  // Добавляем глобальные функции для отладки
  setTimeout(() => {
    window.__APP_INITIALIZER__ = {
      async reinitialize(newConfig?: Partial<InitializationConfig>) {
        const initializer = useAppInitializer()
        if (newConfig) {
          await initializer.reinitialize(newConfig)
        } else {
          await initializer.initialize()
        }
        console.log('App reinitialized (without history)')
      },

      getStatus() {
        const initializer = useAppInitializer()
        const status = initializer.getInitializationStatus()
        console.table(status.stores)
        console.log('Full status:', status)
        return status
      },

      async validateIntegration() {
        const initializer = useAppInitializer()
        const isValid = await initializer.validateIntegration()
        console.log('Integration validation:', isValid ? '✅ PASSED' : '❌ FAILED')
        return isValid
      },

      async testWithConfig(config: Partial<InitializationConfig>) {
        console.log('Testing with config:', config)
        const testInitializer = new AppInitializer({
          useMockData: true,
          enableDebug: true,
          runIntegrationTests: true,
          ...config
        })
        await testInitializer.initialize()
        return testInitializer.getInitializationStatus()
      }
    }

    console.log('\n💡 App Initializer (simplified) loaded! Try:')
    console.log('  • window.__APP_INITIALIZER__.getStatus()')
    console.log('  • window.__APP_INITIALIZER__.reinitialize()')
    console.log('  • window.__APP_INITIALIZER__.validateIntegration()')
    console.log('  • window.__APP_INITIALIZER__.testWithConfig({ useMockData: false })')
  }, 2000)
}
