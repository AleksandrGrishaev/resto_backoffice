// src/core/appInitializer.ts - Оркестратор инициализации с поддержкой стратегий

import type {
  InitializationConfig,
  InitializationSummary,
  InitializationStrategy,
  UserRole,
  StoreInitResult,
  InitializeOptions,
  AppContext
} from './initialization/types'
import {
  DevInitializationStrategy,
  ProductionInitializationStrategy,
  getContextFromPath
} from './initialization'

import { AppInitializerTests } from './appInitializerTests'
import { DebugUtils } from '@/utils'
import { usePlatform } from '@/composables/usePlatform'
import { ENV } from '@/config/environment'
import { isHotReload, shouldReinitializeStores, saveHMRState, getHMRState } from './hmrState'
import { initializeAccountConfig } from '@/stores/account'
import { supabase } from '@/supabase/client'

// Для summary и utilities
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useMenuStore } from '@/stores/menu'
import { useAccountStore } from '@/stores/account'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSupplierStore } from '@/stores/supplier_2'
import { usePosStore } from '@/stores/pos'
import { useKitchenStore } from '@/stores/kitchen'
import { useDebugStore } from '@/stores/debug'

const MODULE_NAME = 'AppInitializer'

export class AppInitializer {
  private config: InitializationConfig
  private tests: AppInitializerTests
  private strategy: InitializationStrategy
  private platform = usePlatform()
  private startTime: number = 0

  constructor(config: InitializationConfig) {
    this.config = config
    this.tests = new AppInitializerTests(config)
    this.strategy = this.selectStrategy(config)
  }

  /**
   * Выбрать стратегию инициализации на основе конфигурации
   */
  private selectStrategy(config: InitializationConfig): InitializationStrategy {
    // В dev mode используем Dev стратегию
    if (import.meta.env.DEV) {
      DebugUtils.info(MODULE_NAME, '📋 Selected initialization strategy: Development')
      return new DevInitializationStrategy(config)
    }

    // В production используем Production стратегию
    DebugUtils.info(MODULE_NAME, '📋 Selected initialization strategy: Production')
    return new ProductionInitializationStrategy(config)
  }

  /**
   * Главный метод инициализации приложения
   * @param userRoles - роли пользователя
   * @param options - опции инициализации (initialPath для определения контекста)
   */
  async initialize(
    userRoles?: UserRole[],
    options?: InitializeOptions
  ): Promise<InitializationSummary> {
    this.startTime = Date.now()

    try {
      const finalUserRoles = (userRoles || this.config.userRoles || []) as UserRole[]

      // Определить контекст по URL или принудительно
      const context = options?.forceContext || getContextFromPath(options?.initialPath || '/')

      // Установить контекст в стратегии
      if ('setContext' in this.strategy) {
        ;(this.strategy as any).setContext(context)
      }

      // 🔥 HMR Optimization: Skip initialization if stores are already loaded
      const isHMR = isHotReload()
      const hmrState = getHMRState()
      const shouldSkipInit = !shouldReinitializeStores(finalUserRoles)

      // ✅ FIX: Always verify critical stores are actually initialized
      // Even during HMR, some stores might be in invalid state
      const criticalStoresReady = this.verifyCriticalStoresInitialized()

      if (shouldSkipInit && isHMR && hmrState && criticalStoresReady) {
        DebugUtils.info(MODULE_NAME, '🔥 Hot reload detected - skipping store initialization', {
          isHMR,
          storesInitialized: hmrState.storesInitialized,
          userRoles: finalUserRoles,
          cachedRoles: hmrState.userRoles,
          timestamp: new Date(hmrState.timestamp).toISOString(),
          criticalStoresReady,
          context
        })

        // Return cached summary
        return {
          timestamp: new Date().toISOString(),
          platform: this.platform.platform.value,
          userRoles: finalUserRoles,
          storesLoaded: 0, // Skipped
          totalTime: 0,
          results: []
        }
      }

      // If HMR detected but critical stores not ready, force full reinit
      if (isHMR && !criticalStoresReady) {
        DebugUtils.warn(
          MODULE_NAME,
          '⚠️ HMR detected but critical stores not ready - forcing full reinitialization',
          { criticalStoresReady }
        )
      }

      DebugUtils.info(MODULE_NAME, '🚀 Starting app initialization', {
        strategy: this.strategy.getName(),
        context,
        userRoles: finalUserRoles,
        platform: this.platform.platform.value,
        enableDebug: this.config.enableDebug,
        isHotReload: isHMR,
        skipInit: shouldSkipInit
      })

      // Phase 1: Критические stores (для всех ролей)
      const criticalResults = await this.strategy.initializeCriticalStores(finalUserRoles)
      DebugUtils.info(MODULE_NAME, '✅ Phase 1/3: Critical stores initialized', {
        count: criticalResults.length,
        success: criticalResults.filter(r => r.success).length
      })

      // Initialize account configuration (loads account IDs from database)
      // This must happen after stores are initialized but before POS/account operations
      await initializeAccountConfig(supabase)

      // Phase 2: Role-based stores
      const roleBasedResults = await this.strategy.initializeRoleBasedStores(finalUserRoles)
      DebugUtils.info(MODULE_NAME, '✅ Phase 2/3: Role-based stores initialized', {
        count: roleBasedResults.length,
        success: roleBasedResults.filter(r => r.success).length
      })

      // Phase 3: Optional stores (debug, analytics)
      const optionalResults = await this.strategy.initializeOptionalStores()
      DebugUtils.info(MODULE_NAME, '✅ Phase 3/3: Optional stores initialized', {
        count: optionalResults.length,
        success: optionalResults.filter(r => r.success).length
      })

      // Integration tests (если включены)
      if (this.config.runIntegrationTests && import.meta.env.DEV) {
        await this.runIntegrationTests()
      }

      const allResults = [...criticalResults, ...roleBasedResults, ...optionalResults]
      const summary = this.createInitializationSummary(finalUserRoles, allResults)

      this.showInitializationSummary(finalUserRoles)

      // 🔥 Save HMR state for next hot reload
      saveHMRState(true, finalUserRoles)

      DebugUtils.info(MODULE_NAME, '✅ App initialization completed successfully', {
        totalStores: allResults.length,
        successfulStores: allResults.filter(r => r.success).length,
        totalTime: summary.totalTime + 'ms',
        hmrStateSaved: true
      })

      return summary
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ App initialization failed', { error })
      throw error
    }
  }

  /**
   * Создать сводку инициализации
   */
  private createInitializationSummary(
    userRoles: UserRole[],
    results: StoreInitResult[]
  ): InitializationSummary {
    return {
      timestamp: new Date().toISOString(),
      platform: this.platform.platform.value,
      userRoles: userRoles,
      storesLoaded: results.filter(r => r.success).length,
      totalTime: Date.now() - this.startTime,
      results: results
    }
  }

  // ===== INTEGRATION TESTS =====

  private async runIntegrationTests(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🧪 Running integration tests...')

      const success = await this.tests.runAllIntegrationTests()

      if (success) {
        DebugUtils.info(MODULE_NAME, '✅ Integration tests passed')
      } else {
        DebugUtils.warn(MODULE_NAME, '⚠️ Some integration tests failed')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Integration tests failed', { error })
      // Тесты не критичны в development
    }
  }

  /**
   * Показать сводку инициализации
   */
  private showInitializationSummary(userRoles: UserRole[]): void {
    // Информация об устройстве и среде
    const deviceInfo = {
      platform: this.platform.platform.value,
      online: this.platform.isOnline.value,
      userRole: userRoles.join(', '),
      strategy: this.strategy.getName(),
      debugMode: ENV.debugEnabled,
      offlineEnabled: ENV.enableOffline
    }

    // Статус stores
    const storesStatus: any = {}

    // Critical stores (always loaded)
    storesStatus.products = this.getStoreStatus(() => useProductsStore().products?.length, 'items')
    storesStatus.recipes = this.getStoreStatus(() => useRecipesStore().recipes?.length, 'items')
    storesStatus.menu = this.getStoreStatus(
      () => useMenuStore().state?.value?.menuItems?.length,
      'items'
    )

    // Role-based stores
    storesStatus.pos = usePosStore().isInitialized ? 'Ready' : 'Not loaded'
    storesStatus.kitchen = useKitchenStore().initialized ? 'Ready' : 'Not loaded'

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

  /**
   * ✅ NEW: Verify critical stores are actually initialized
   * Used to prevent HMR from skipping initialization when stores are in invalid state
   */
  private verifyCriticalStoresInitialized(): boolean {
    try {
      // Check products store
      const productsStore = useProductsStore()
      if (!productsStore.products || productsStore.products.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'Products store not initialized')
        return false
      }

      // Check storage service
      const storageStore = useStorageStore()
      if (!storageStore.initialized) {
        DebugUtils.warn(MODULE_NAME, 'Storage store not initialized')
        return false
      }

      // Check recipes store
      const recipesStore = useRecipesStore()
      if (!recipesStore.recipes || recipesStore.recipes.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'Recipes store not initialized')
        return false
      }

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to verify critical stores', { error })
      return false
    }
  }

  // ===== PUBLIC UTILITIES =====

  /**
   * Инициализировать stores для нового контекста (при навигации)
   * Грузит только те stores, которые ещё не загружены
   */
  async initializeForContext(
    context: AppContext,
    userRoles: UserRole[]
  ): Promise<StoreInitResult[]> {
    if ('initializeForContext' in this.strategy) {
      return (this.strategy as any).initializeForContext(context, userRoles)
    }

    DebugUtils.warn(MODULE_NAME, 'Strategy does not support initializeForContext')
    return []
  }

  /**
   * Получить текущий контекст
   */
  getContext(): AppContext {
    if ('getContext' in this.strategy) {
      return (this.strategy as any).getContext()
    }
    return 'backoffice'
  }

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
      pos: !!usePosStore().isInitialized,
      kitchen: !!useKitchenStore().initialized
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
  console.log('🔍 DIRECT LOG: createAppInitializer called', {
    ENV_debugEnabled: ENV.debugEnabled,
    ENV_debugLevel: ENV.debugLevel,
    import_meta_DEV: import.meta.env.DEV
  })

  const config: InitializationConfig = {
    enableDebug: ENV.debugEnabled,
    runIntegrationTests: ENV.debugEnabled && import.meta.env.DEV
  }

  DebugUtils.debug(MODULE_NAME, 'Creating AppInitializer with config', {
    config,
    env: {
      platform: ENV.platform,
      enableOffline: ENV.enableOffline,
      debugEnabled: ENV.debugEnabled,
      useFirebase: ENV.useFirebase,
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
