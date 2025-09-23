// src/core/appInitializerTests.ts - Integration Tests for AppInitializer

import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useAccountStore } from '@/stores/account'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSupplierStore } from '@/stores/supplier_2'
import { useDebugStore, debugService } from '@/stores/debug'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AppInitializerTests'

/**
 * Класс для тестирования интеграции stores после инициализации
 */
export class AppInitializerTests {
  private config: any

  constructor(config: any) {
    this.config = config
  }

  // =============================================
  // MAIN TEST RUNNER
  // =============================================
  async validateIntegration(): Promise<boolean> {
    return await this.runAllIntegrationTests()
  }
  /**
   * Запустить все тесты интеграции
   */
  async runAllIntegrationTests(): Promise<boolean> {
    try {
      DebugUtils.info(MODULE_NAME, '🧪 Starting integration tests')

      const testResults = await Promise.allSettled([
        this.testProductsIntegration(),
        this.testRecipesIntegration(),
        this.testCounteragentsIntegration(),
        this.testAccountsIntegration(),
        this.testMenuIntegration(),
        this.testStorageIntegration(),
        this.testSupplierIntegration(),
        this.config.enableDebug ? this.testDebugIntegration() : Promise.resolve(true)
      ])

      const failedTests = testResults.filter(result => result.status === 'rejected')

      if (failedTests.length > 0) {
        DebugUtils.warn(MODULE_NAME, `${failedTests.length} integration tests failed`, {
          failures: failedTests.map(test => test.reason?.message || 'Unknown error')
        })
        return false
      }

      DebugUtils.info(MODULE_NAME, '✅ All integration tests passed')
      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Integration tests failed', { error })
      return false
    }
  }

  // =============================================
  // INDIVIDUAL STORE TESTS
  // =============================================

  /**
   * Тест интеграции Products Store
   */
  private async testProductsIntegration(): Promise<boolean> {
    try {
      const productStore = useProductsStore()

      // Проверяем загрузку данных
      if (!productStore.products || productStore.products.length === 0) {
        throw new Error('Products store not loaded or empty')
      }

      // Проверяем базовую функциональность
      if (!productStore.sellableProducts || !productStore.rawMaterials) {
        throw new Error('Products store getters not working')
      }

      // Проверяем статистику
      if (!productStore.statistics) {
        throw new Error('Products statistics not calculated')
      }

      DebugUtils.debug(MODULE_NAME, '✅ Products integration test passed', {
        totalProducts: productStore.products.length,
        sellable: productStore.sellableProducts.length,
        rawMaterials: productStore.rawMaterials.length
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Products integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции Recipes Store
   */
  private async testRecipesIntegration(): Promise<boolean> {
    try {
      const recipesStore = useRecipesStore()

      // Проверяем загрузку preparations и recipes
      const preparations = recipesStore.activePreparations || []
      const recipes = recipesStore.activeRecipes || []

      if (preparations.length === 0 && recipes.length === 0) {
        throw new Error('Recipes store has no active preparations or recipes')
      }

      // Проверяем units
      if (!recipesStore.units || recipesStore.units.length === 0) {
        throw new Error('Recipe units not loaded')
      }

      // Тестируем интеграцию с Products Store
      if (preparations.length > 0) {
        try {
          const testPreparation = preparations[0]
          const cost = await recipesStore.calculatePreparationCost(testPreparation.id)

          if (!cost || typeof cost.totalCost !== 'number') {
            throw new Error('Preparation cost calculation failed')
          }

          DebugUtils.debug(MODULE_NAME, '✅ Product ↔ Recipe integration working', {
            testPreparation: testPreparation.name,
            calculatedCost: cost.totalCost.toFixed(2)
          })
        } catch (costError) {
          DebugUtils.warn(MODULE_NAME, 'Cost calculation test failed', { costError })
          // Не прерываем тест, просто предупреждаем
        }
      }

      DebugUtils.debug(MODULE_NAME, '✅ Recipes integration test passed', {
        preparations: preparations.length,
        recipes: recipes.length,
        units: recipesStore.units.length
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Recipes integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции Counteragents Store
   */
  private async testCounteragentsIntegration(): Promise<boolean> {
    try {
      const counteragentsStore = useCounteragentsStore()

      if (!counteragentsStore.counteragents || counteragentsStore.counteragents.length === 0) {
        throw new Error('Counteragents store not loaded or empty')
      }

      // Проверяем getters
      if (!counteragentsStore.activeCounterAgents || !counteragentsStore.supplierCounterAgents) {
        throw new Error('Counteragents getters not working')
      }

      // Проверяем наличие suppliers
      const suppliers = counteragentsStore.supplierCounterAgents
      if (suppliers.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No suppliers found in counteragents')
      }

      DebugUtils.debug(MODULE_NAME, '✅ Counteragents integration test passed', {
        total: counteragentsStore.counteragents.length,
        active: counteragentsStore.activeCounterAgents.length,
        suppliers: suppliers.length
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Counteragents integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции Account Store
   */
  private async testAccountsIntegration(): Promise<boolean> {
    try {
      const accountStore = useAccountStore()
      const state = accountStore.state?.value || accountStore.state || {}

      if (!state.accounts || state.accounts.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No accounts found - this may be expected in mock mode')
      }

      // Проверяем getters если есть счета
      if (state.accounts?.length > 0) {
        const totalBalance = accountStore.totalBalance?.value ?? 0
        if (typeof totalBalance !== 'number') {
          throw new Error('Account total balance calculation failed')
        }
      }

      DebugUtils.debug(MODULE_NAME, '✅ Accounts integration test passed', {
        accounts: state.accounts?.length || 0,
        transactions: state.transactions?.length || 0,
        pendingPayments: state.pendingPayments?.length || 0
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Accounts integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции Menu Store
   */
  private async testMenuIntegration(): Promise<boolean> {
    try {
      const menuStore = useMenuStore()
      const categories = menuStore.categories?.value || []
      const menuItems = menuStore.menuItems?.value || []

      if (categories.length === 0 && menuItems.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No menu categories or items found - this may be expected')
      }

      // Проверяем getters если есть данные
      if (categories.length > 0) {
        const activeCategories = menuStore.activeCategories?.value || []
        if (!Array.isArray(activeCategories)) {
          throw new Error('Menu active categories getter failed')
        }
      }

      DebugUtils.debug(MODULE_NAME, '✅ Menu integration test passed', {
        categories: categories.length,
        menuItems: menuItems.length
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Menu integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции Storage Store
   */
  private async testStorageIntegration(): Promise<boolean> {
    try {
      const storageStore = useStorageStore()
      const state = storageStore.state?.value || storageStore.state || {}

      // Storage может быть пустой в начале
      const balances = state.balances || []
      const operations = state.operations || []

      // Проверяем alert counts
      const alertCounts = storageStore.alertCounts?.value || {}
      if (typeof alertCounts !== 'object') {
        throw new Error('Storage alert counts not working')
      }

      DebugUtils.debug(MODULE_NAME, '✅ Storage integration test passed', {
        balances: balances.length,
        operations: operations.length,
        alerts: alertCounts
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Storage integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции Supplier Store
   */
  private async testSupplierIntegration(): Promise<boolean> {
    try {
      const supplierStore = useSupplierStore()
      const state = supplierStore.state?.value || supplierStore.state || {}

      // Supplier store может быть пустой в начале
      const requests = state.requests || state.procurementRequests || []
      const orders = state.orders || state.purchaseOrders || []
      const receipts = state.receipts || state.receiptAcceptances || []

      // Проверяем статистику если доступна
      const statistics = supplierStore.statistics?.value || {}
      if (typeof statistics !== 'object') {
        DebugUtils.warn(MODULE_NAME, 'Supplier statistics not available')
      }

      DebugUtils.debug(MODULE_NAME, '✅ Supplier integration test passed', {
        requests: requests.length,
        orders: orders.length,
        receipts: receipts.length
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Supplier integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции Debug System
   */
  private async testDebugIntegration(): Promise<boolean> {
    try {
      const debugStore = useDebugStore()

      // Проверяем что debug store инициализирован
      if (!debugStore.state?.availableStores || debugStore.state.availableStores.length === 0) {
        throw new Error('Debug store not initialized or no stores discovered')
      }

      // Проверяем что debug service работает
      const globalStats = await debugService.getGlobalStatistics()
      if (!globalStats || typeof globalStats.totalStores !== 'number') {
        throw new Error('Debug service not working properly')
      }

      // Тестируем получение данных одного store
      const availableStores = debugStore.state.availableStores
      const testStore = availableStores.find(s => s.isLoaded)

      if (testStore) {
        const storeData = await debugService.getStoreData(testStore.id)
        if (!storeData || !storeData.analysis) {
          throw new Error(`Failed to get debug data for store: ${testStore.id}`)
        }
      }

      DebugUtils.debug(MODULE_NAME, '✅ Debug integration test passed', {
        discoveredStores: availableStores.length,
        loadedStores: availableStores.filter(s => s.isLoaded).length,
        globalStats
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Debug integration test failed', { error })
      throw error
    }
  }

  // =============================================
  // CROSS-STORE INTEGRATION TESTS
  // =============================================

  /**
   * Тест интеграции между Products и Recipes
   */
  async testProductRecipeIntegration(): Promise<boolean> {
    try {
      const productStore = useProductsStore()
      const recipesStore = useRecipesStore()

      const products = productStore.products || []
      const preparations = recipesStore.activePreparations || []

      if (products.length === 0 || preparations.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'Cannot test Product-Recipe integration: missing data')
        return true
      }

      // Находим preparation который использует products
      const testPreparation = preparations.find(
        prep => prep.components && prep.components.length > 0
      )

      if (!testPreparation) {
        DebugUtils.warn(MODULE_NAME, 'No preparation with components found for integration test')
        return true
      }

      // Проверяем что все компоненты preparation существуют в products
      const missingProducts = testPreparation.components.filter(
        (comp: any) => !products.find(p => p.id === comp.productId)
      )

      if (missingProducts.length > 0) {
        throw new Error(`Preparation references non-existent products: ${missingProducts.length}`)
      }

      // Тестируем расчет стоимости
      const cost = await recipesStore.calculatePreparationCost(testPreparation.id)
      if (!cost || cost.totalCost <= 0) {
        throw new Error('Product-Recipe cost calculation integration failed')
      }

      DebugUtils.info(MODULE_NAME, '✅ Product-Recipe integration test passed', {
        testedPreparation: testPreparation.name,
        componentsCount: testPreparation.components.length,
        calculatedCost: cost.totalCost
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Product-Recipe integration test failed', { error })
      throw error
    }
  }

  /**
   * Тест интеграции между Products и Counteragents
   */
  async testProductCounteragentIntegration(): Promise<boolean> {
    try {
      const productStore = useProductsStore()
      const counteragentsStore = useCounteragentsStore()

      const products = productStore.products || []
      const suppliers = counteragentsStore.supplierCounterAgents || []

      if (products.length === 0 || suppliers.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'Cannot test Product-Counteragent integration: missing data')
        return true
      }

      // Проверяем что products с suppliers ссылаются на существующих counteragents
      const productsWithSuppliers = products.filter(p => p.primarySupplierId)
      const invalidSupplierReferences = productsWithSuppliers.filter(
        product => !suppliers.find(supplier => supplier.id === product.primarySupplierId)
      )

      if (invalidSupplierReferences.length > 0) {
        throw new Error(
          `Products reference non-existent suppliers: ${invalidSupplierReferences.length}`
        )
      }

      DebugUtils.info(MODULE_NAME, '✅ Product-Counteragent integration test passed', {
        totalProducts: products.length,
        productsWithSuppliers: productsWithSuppliers.length,
        availableSuppliers: suppliers.length
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Product-Counteragent integration test failed', { error })
      throw error
    }
  }

  // =============================================
  // PERFORMANCE TESTS
  // =============================================

  /**
   * Тест производительности загрузки
   */
  async testLoadingPerformance(): Promise<boolean> {
    try {
      const startTime = performance.now()

      // Эмулируем повторную загрузку для тестирования производительности
      const productStore = useProductsStore()
      const recipesStore = useRecipesStore()

      // Тестируем время доступа к computed значениям
      const computedStartTime = performance.now()

      const _ = [
        productStore.sellableProducts,
        productStore.rawMaterials,
        productStore.statistics,
        recipesStore.activePreparations,
        recipesStore.activeRecipes
      ]

      const computedEndTime = performance.now()
      const computedTime = computedEndTime - computedStartTime

      if (computedTime > 100) {
        // Более 100ms для computed значений - это медленно
        DebugUtils.warn(MODULE_NAME, 'Computed values calculation is slow', {
          computedTime: `${computedTime.toFixed(2)}ms`
        })
      }

      const totalTime = performance.now() - startTime

      DebugUtils.debug(MODULE_NAME, '✅ Performance test completed', {
        totalTime: `${totalTime.toFixed(2)}ms`,
        computedTime: `${computedTime.toFixed(2)}ms`
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Performance test failed', { error })
      throw error
    }
  }

  // =============================================
  // SUMMARY REPORT
  // =============================================

  /**
   * Генерирует итоговый отчет о состоянии всех stores
   */
  generateIntegrationReport(): Record<string, any> {
    try {
      const productStore = useProductsStore()
      const recipesStore = useRecipesStore()
      const counteragentsStore = useCounteragentsStore()
      const accountStore = useAccountStore()
      const menuStore = useMenuStore()
      const storageStore = useStorageStore()
      const supplierStore = useSupplierStore()

      const report = {
        timestamp: new Date().toISOString(),
        config: this.config,
        stores: {
          products: {
            loaded: (productStore.products?.length || 0) > 0,
            count: productStore.products?.length || 0,
            sellable: productStore.sellableProducts?.length || 0,
            rawMaterials: productStore.rawMaterials?.length || 0,
            statistics: productStore.statistics || {}
          },
          recipes: {
            loaded:
              (recipesStore.activePreparations?.length || 0) +
                (recipesStore.activeRecipes?.length || 0) >
              0,
            preparations: recipesStore.activePreparations?.length || 0,
            recipes: recipesStore.activeRecipes?.length || 0,
            units: recipesStore.units?.length || 0,
            statistics: recipesStore.statistics || {}
          },
          counteragents: {
            loaded: (counteragentsStore.counteragents?.length || 0) > 0,
            total: counteragentsStore.counteragents?.length || 0,
            active: counteragentsStore.activeCounterAgents?.length || 0,
            suppliers: counteragentsStore.supplierCounterAgents?.length || 0
          },
          accounts: {
            loaded: true, // Account store всегда считается загруженным
            accounts: accountStore.state?.value?.accounts?.length || 0,
            transactions: accountStore.state?.value?.transactions?.length || 0,
            balance: accountStore.totalBalance?.value || 0
          },
          menu: {
            loaded:
              (menuStore.categories?.value?.length || 0) +
                (menuStore.menuItems?.value?.length || 0) >
              0,
            categories: menuStore.categories?.value?.length || 0,
            menuItems: menuStore.menuItems?.value?.length || 0
          },
          storage: {
            loaded: true, // Storage может быть пустой но загруженной
            balances: storageStore.state?.value?.balances?.length || 0,
            operations: storageStore.state?.value?.operations?.length || 0,
            alerts: storageStore.alertCounts?.value || {}
          },
          supplier: {
            loaded: true, // Supplier может быть пустой но загруженной
            requests: supplierStore.state?.value?.requests?.length || 0,
            orders: supplierStore.state?.value?.orders?.length || 0,
            receipts: supplierStore.state?.value?.receipts?.length || 0
          }
        }
      }

      // Подсчитываем общую статистику
      const loadedStores = Object.values(report.stores).filter((store: any) => store.loaded).length
      const totalRecords = Object.values(report.stores).reduce((sum: number, store: any) => {
        return (
          sum +
          (store.count ||
            store.total ||
            store.accounts ||
            store.preparations ||
            store.balances ||
            store.requests ||
            0)
        )
      }, 0)

      report.summary = {
        loadedStores,
        totalStores: Object.keys(report.stores).length,
        totalRecords,
        integrationStatus:
          loadedStores === Object.keys(report.stores).length ? 'success' : 'partial'
      }

      return report
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate integration report', { error })
      return {
        error: 'Failed to generate report',
        timestamp: new Date().toISOString()
      }
    }
  }
}
