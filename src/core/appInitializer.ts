// src/core/appInitializer.ts - Шаг 2: Добавляем Products Store

import { useProductsStore } from '@/stores/productsStore'
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

      // Phase 1: Core catalogs
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

    // Load catalogs in parallel - they don't depend on each other
    await Promise.all([
      this.loadProducts(),
      this.loadRecipes() // Пока заглушка
    ])

    DebugUtils.info(MODULE_NAME, '✅ Core catalogs loaded successfully')
  }

  private async loadCalculatedData(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '📊 Loading calculated data...')

    // TODO: Load calculated data sequentially
    // await this.loadStorage()
    // await this.loadSupplierData()

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
        rawMaterials: productStore.rawMaterials.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to load products', { error })
      throw new Error(`Products loading failed: ${error}`)
    }
  }

  private async loadRecipes(): Promise<void> {
    DebugUtils.debug(MODULE_NAME, '👨‍🍳 Loading recipes and preparations...')

    // TODO: Implement when recipes store is ready
    // const recipesStore = useRecipesStore()
    // await recipesStore.loadRecipes(this.config.useMockData)

    // Пока просто задержка
    await this.delay(200)

    DebugUtils.info(MODULE_NAME, '✅ Recipes and preparations loaded successfully')
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
