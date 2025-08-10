// src/core/appInitializer.ts - Updated with Recipe Store Integration

import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AppInitializer'

export interface InitializationConfig {
  useMockData: boolean
}

export class AppInitializer {
  private config: InitializationConfig

  constructor(config: InitializationConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🚀 Starting app initialization', {
        useMockData: this.config.useMockData
      })

      // Phase 1: Core catalogs (sequential - recipes depend on products)
      await this.loadCoreCatalogs()

      // Phase 2: Calculated data (пока заглушка)
      await this.loadCalculatedData()

      DebugUtils.info(MODULE_NAME, '✅ App initialization completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ App initialization failed', { error })
      throw error
    }
  }

  private async loadCoreCatalogs(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '📋 Loading core catalogs...')

    // ВАЖНО: Последовательная загрузка - рецепты зависят от продуктов
    await this.loadProducts()
    await this.loadRecipes()

    DebugUtils.info(MODULE_NAME, '✅ Core catalogs loaded successfully')
  }

  private async loadCalculatedData(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '📊 Loading calculated data...')

    // TODO Phase 2: Load calculated data sequentially
    // await this.loadStorage()
    // await this.loadSupplierData()
    // await this.loadMenuData()

    // Пока просто задержка
    await this.delay(300)

    DebugUtils.info(MODULE_NAME, '✅ Calculated data loaded successfully')
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

      // Проверяем что интеграция работает
      await this.validateIntegration(recipesStore)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to load recipes', { error })
      throw new Error(`Recipes loading failed: ${error}`)
    }
  }

  /**
   * Проверяет что интеграция Product ↔ Recipe работает
   */
  private async validateIntegration(recipesStore: any): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, '🔍 Validating Product ↔ Recipe integration...')

      // Проверяем что есть preparations для расчета
      const preparations = recipesStore.activePreparations
      if (preparations.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No active preparations found for integration test')
        return
      }

      // Пробуем рассчитать стоимость первого полуфабриката
      const testPreparation = preparations[0]
      try {
        const cost = await recipesStore.calculatePreparationCost(testPreparation.id)

        DebugUtils.info(MODULE_NAME, '✅ Integration validation successful', {
          testPreparation: testPreparation.name,
          calculatedCost: cost.totalCost.toFixed(2),
          costPerUnit: cost.costPerOutputUnit.toFixed(2),
          components: cost.componentCosts.length
        })
      } catch (costError) {
        DebugUtils.warn(MODULE_NAME, 'Integration test failed - cost calculation error', {
          preparation: testPreparation.name,
          error: costError
        })
        // Не прерываем инициализацию, просто предупреждаем
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Integration validation failed', { error })
      // Не прерываем инициализацию
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Factory function with environment detection
export function createAppInitializer(): AppInitializer {
  const config: InitializationConfig = {
    // Проверяем несколько способов определения mock режима
    useMockData:
      import.meta.env.DEV ||
      import.meta.env.VITE_USE_MOCK === 'true' ||
      !import.meta.env.VITE_FIREBASE_PROJECT_ID // Если нет Firebase config, используем mock
  }

  DebugUtils.info(MODULE_NAME, '⚙️ Creating app initializer', {
    config,
    env: {
      isDev: import.meta.env.DEV,
      hasFirebase: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
      useMockEnv: import.meta.env.VITE_USE_MOCK
    }
  })

  return new AppInitializer(config)
}

// Global instance
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
  window.__APP_INITIALIZER_DEBUG__ = () => {
    console.log('=== APP INITIALIZER DEBUG ===')
    console.log('Current config:', appInitializer?.['config'])

    // Проверяем stores
    const productStore = useProductsStore()
    const recipesStore = useRecipesStore()

    console.log('Products Store:', {
      loaded: productStore.products.length > 0,
      count: productStore.products.length,
      stats: productStore.statistics
    })

    console.log('Recipes Store:', {
      loaded: recipesStore.activePreparations.length > 0 || recipesStore.activeRecipes.length > 0,
      preparations: recipesStore.activePreparations.length,
      recipes: recipesStore.activeRecipes.length,
      stats: recipesStore.statistics
    })

    return { productStore, recipesStore }
  }

  // Инструкции через несколько секунд
  setTimeout(() => {
    console.log('\n💡 App Initializer loaded! Try:')
    console.log('  • window.__APP_INITIALIZER_DEBUG__()')
    console.log('  • Check integration with console logs')
  }, 2000)
}
