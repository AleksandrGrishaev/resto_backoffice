// src/core/appInitializer.ts - Updated with Counteragents Store Integration

import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useCounteragentsStore } from '@/stores/counteragents'
import { mockDataCoordinator } from '@/stores/shared'
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

      // Phase 1: Core catalogs (sequential - dependencies matter)
      await this.loadCoreCatalogs()

      // Phase 2: Calculated data (пока заглушка)
      await this.loadCalculatedData()

      // ✅ НОВАЯ: Валидация полной интеграции
      await this.validateFullIntegration()

      DebugUtils.info(MODULE_NAME, '✅ App initialization completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ App initialization failed', { error })
      throw error
    }
  }

  private async loadCoreCatalogs(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '📋 Loading core catalogs...')

    // ✅ ВАЖНО: Правильная последовательность загрузки
    // 1. Products (база для всех остальных)
    await this.loadProducts()

    // 2. Counteragents (зависят от Products через primarySupplierId)
    await this.loadCounterAgents()

    // 3. Recipes (зависят от Products + могут использовать данные Counteragents)
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

  // =============================================
  // ✅ НОВЫЙ: Загрузка Counteragents Store
  // =============================================

  private async loadCounterAgents(): Promise<void> {
    const counteragentsStore = useCounteragentsStore()

    DebugUtils.debug(MODULE_NAME, '🏪 Loading counteragents...', {
      useMock: this.config.useMockData
    })

    try {
      // Инициализируем Counteragents Store
      await counteragentsStore.initialize(this.config.useMockData)

      DebugUtils.info(MODULE_NAME, '✅ Counteragents loaded successfully', {
        total: counteragentsStore.counteragents.length,
        active: counteragentsStore.activeCounterAgents.length,
        suppliers: counteragentsStore.supplierCounterAgents.length,
        services: counteragentsStore.serviceCounterAgents.length,
        preferred: counteragentsStore.preferredCounterAgents.length,
        statistics: counteragentsStore.statistics
      })

      // Проверяем интеграцию с Product Store
      await this.validateCounterAgentsIntegration(counteragentsStore)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to load counteragents', { error })
      throw new Error(`Counteragents loading failed: ${error}`)
    }
  }

  /**
   * ✅ НОВЫЙ: Проверяет интеграцию Counteragents ↔ Products
   */
  private async validateCounterAgentsIntegration(counteragentsStore: any): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, '🔍 Validating Counteragents ↔ Products integration...')

      const productsStore = useProductsStore()

      // Проверяем несколько случайных продуктов на наличие поставщиков
      const testProducts = productsStore.products.slice(0, 3)
      let successfulLinks = 0
      let failedLinks = 0

      for (const product of testProducts) {
        try {
          // Пытаемся получить информацию о поставщике через интеграцию
          const supplier = await counteragentsStore.getSupplierInfo(
            (product as any).primarySupplierId
          )

          if (supplier) {
            successfulLinks++
            DebugUtils.debug(MODULE_NAME, 'Product-supplier link verified', {
              productId: product.id,
              productName: product.name,
              supplierId: supplier.id,
              supplierName: supplier.name,
              categories: supplier.productCategories
            })
          } else {
            failedLinks++
            DebugUtils.warn(MODULE_NAME, 'Product has no supplier link', {
              productId: product.id,
              productName: product.name,
              primarySupplierId: (product as any).primarySupplierId
            })
          }
        } catch (error) {
          failedLinks++
          DebugUtils.warn(MODULE_NAME, 'Failed to verify product-supplier link', {
            productId: product.id,
            error
          })
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Counteragents integration validation completed', {
        testedProducts: testProducts.length,
        successfulLinks,
        failedLinks,
        integrationStatus: failedLinks === 0 ? 'HEALTHY' : 'PARTIAL'
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Counteragents integration validation failed', { error })
      // Не прерываем инициализацию
    }
  }

  // =============================================
  // СУЩЕСТВУЮЩИЕ МЕТОДЫ (Products & Recipes)
  // =============================================

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
      await this.validateRecipesIntegration(recipesStore)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to load recipes', { error })
      throw new Error(`Recipes loading failed: ${error}`)
    }
  }

  /**
   * Проверяет что интеграция Product ↔ Recipe работает
   */
  private async validateRecipesIntegration(recipesStore: any): Promise<void> {
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

        DebugUtils.info(MODULE_NAME, '✅ Recipes integration validation successful', {
          testPreparation: testPreparation.name,
          calculatedCost: cost.totalCost.toFixed(2),
          costPerUnit: cost.costPerOutputUnit.toFixed(2),
          components: cost.componentCosts.length
        })
      } catch (costError) {
        DebugUtils.warn(MODULE_NAME, 'Recipes integration test failed - cost calculation error', {
          preparation: testPreparation.name,
          error: costError
        })
        // Не прерываем инициализацию, просто предупреждаем
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Recipes integration validation failed', { error })
      // Не прерываем инициализацию
    }
  }

  // =============================================
  // ✅ НОВЫЙ: Полная валидация интеграции всех stores
  // =============================================

  private async validateFullIntegration(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '🔍 Validating full store integration...')

      // Используем MockDataCoordinator для полной валидации
      const validation = mockDataCoordinator.validateStoreIntegration()

      if (validation.isValid) {
        DebugUtils.info(MODULE_NAME, '✅ Full store integration validation successful', {
          summary: validation.summary,
          warningsCount: validation.warnings.length
        })

        if (validation.warnings.length > 0) {
          DebugUtils.warn(MODULE_NAME, 'Integration warnings found:', {
            warnings: validation.warnings
          })
        }
      } else {
        DebugUtils.error(MODULE_NAME, '❌ Store integration validation failed', {
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.summary
        })

        // В dev режиме показываем подробную информацию
        if (import.meta.env.DEV) {
          console.error('=== STORE INTEGRATION ERRORS ===')
          validation.errors.forEach(error => console.error('❌', error))

          if (validation.warnings.length > 0) {
            console.warn('=== INTEGRATION WARNINGS ===')
            validation.warnings.forEach(warning => console.warn('⚠️', warning))
          }
        }

        // Не прерываем инициализацию, но предупреждаем
        DebugUtils.warn(
          MODULE_NAME,
          'Continuing with integration issues - some features may not work correctly'
        )
      }

      // Дополнительная статистика
      this.logIntegrationStatistics()
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Full integration validation failed', { error })
      // Не прерываем инициализацию
    }
  }

  /**
   * ✅ НОВЫЙ: Логирует статистику интеграции
   */
  private logIntegrationStatistics(): void {
    try {
      const productsStore = useProductsStore()
      const counteragentsStore = useCounteragentsStore()
      const recipesStore = useRecipesStore()

      const integrationStats = {
        products: {
          total: productsStore.products.length,
          sellable: productsStore.sellableProducts.length,
          rawMaterials: productsStore.rawMaterials.length
        },
        counteragents: {
          total: counteragentsStore.counteragents.length,
          suppliers: counteragentsStore.supplierCounterAgents.length,
          services: counteragentsStore.serviceCounterAgents.length,
          preferred: counteragentsStore.preferredCounterAgents.length
        },
        recipes: {
          preparations: recipesStore.activePreparations.length,
          recipes: recipesStore.activeRecipes.length
        }
      }

      DebugUtils.info(MODULE_NAME, '📊 Integration statistics', integrationStats)

      // Проверяем соотношения
      const suppliersPerCategory = counteragentsStore.statistics.productCategoryBreakdown
      const productsWithSuppliers = productsStore.products.filter(
        p => (p as any).primarySupplierId
      ).length

      DebugUtils.info(MODULE_NAME, '🔗 Integration ratios', {
        productsWithSuppliers,
        productsWithoutSuppliers: productsStore.products.length - productsWithSuppliers,
        supplierCoverage:
          ((productsWithSuppliers / productsStore.products.length) * 100).toFixed(1) + '%',
        suppliersPerCategory
      })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to log integration statistics', { error })
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
    const counteragentsStore = useCounteragentsStore()
    const recipesStore = useRecipesStore()

    console.log('Products Store:', {
      loaded: productStore.products.length > 0,
      count: productStore.products.length,
      stats: productStore.statistics
    })

    console.log('Counteragents Store:', {
      loaded: counteragentsStore.counteragents.length > 0,
      count: counteragentsStore.counteragents.length,
      suppliers: counteragentsStore.supplierCounterAgents.length,
      stats: counteragentsStore.statistics
    })

    console.log('Recipes Store:', {
      loaded: recipesStore.activePreparations.length > 0 || recipesStore.activeRecipes.length > 0,
      preparations: recipesStore.activePreparations.length,
      recipes: recipesStore.activeRecipes.length,
      stats: recipesStore.statistics
    })

    return { productStore, counteragentsStore, recipesStore }
  }

  window.__TEST_FULL_INTEGRATION__ = () => {
    const validation = mockDataCoordinator.validateStoreIntegration()
    console.log('=== FULL INTEGRATION TEST ===')
    console.log('Valid:', validation.isValid)
    console.log('Errors:', validation.errors)
    console.log('Warnings:', validation.warnings)
    console.log('Summary:', validation.summary)
    return validation
  }

  // Инструкции через несколько секунд
  setTimeout(() => {
    console.log('\n💡 App Initializer with Counteragents integration loaded! Try:')
    console.log('  • window.__APP_INITIALIZER_DEBUG__()')
    console.log('  • window.__TEST_FULL_INTEGRATION__()')
    console.log('  • Check integration with console logs')
  }, 2000)
}
