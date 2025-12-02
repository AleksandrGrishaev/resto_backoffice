// src/stores/debug/debugService.ts - SIMPLIFIED: Убрана вся логика истории
import { DebugUtils } from '@/utils'
import { formatIDR, formatIDRShort } from '@/utils/currency'
import { TimeUtils } from '@/utils/time'
import type {
  DebugStoreInfo,
  DebugStoreData,
  DebugStoreAnalysis,
  StoreSpecificMetrics,
  ProductsStoreMetrics,
  CounteragentsStoreMetrics,
  RecipesStoreMetrics,
  AccountStoreMetrics,
  MenuStoreMetrics,
  StorageStoreMetrics,
  SupplierStoreMetrics
} from './types'
import { STORE_CONFIGURATIONS } from './types'

// Import all available stores
import { useProductsStore } from '@/stores/productsStore'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useRecipesStore } from '@/stores/recipes'
import { useAccountStore } from '@/stores/account'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSupplierStore } from '@/stores/supplier_2'
import { useAuthStore } from '@/stores/auth'
import { useSalesStore, useRecipeWriteOffStore } from '@/stores/sales'

const MODULE_NAME = 'DebugService'

/**
 * Упрощенный сервис для работы с debug информацией stores (без истории)
 */
class DebugService {
  // =============================================
  // STORE DISCOVERY
  // =============================================

  /**
   * Обнаружить все доступные Pinia stores
   */
  async discoverAvailableStores(): Promise<DebugStoreInfo[]> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Discovering available stores')

      const stores: DebugStoreInfo[] = []

      // Определения stores с безопасным получением экземпляров
      const storeDefinitions = [
        { id: 'products', getInstance: () => this.safeGetStore(() => useProductsStore()) },
        {
          id: 'counteragents',
          getInstance: () => this.safeGetStore(() => useCounteragentsStore())
        },
        { id: 'recipes', getInstance: () => this.safeGetStore(() => useRecipesStore()) },
        { id: 'account', getInstance: () => this.safeGetStore(() => useAccountStore()) },
        { id: 'menu', getInstance: () => this.safeGetStore(() => useMenuStore()) },
        { id: 'storage', getInstance: () => this.safeGetStore(() => useStorageStore()) },
        { id: 'preparation', getInstance: () => this.safeGetStore(() => usePreparationStore()) },
        { id: 'supplier', getInstance: () => this.safeGetStore(() => useSupplierStore()) },
        { id: 'auth', getInstance: () => this.safeGetStore(() => useAuthStore()) },
        { id: 'sales', getInstance: () => this.safeGetStore(() => useSalesStore()) },
        {
          id: 'recipeWriteOff',
          getInstance: () => this.safeGetStore(() => useRecipeWriteOffStore())
        }
      ]

      for (const storeDef of storeDefinitions) {
        try {
          const storeInstance = storeDef.getInstance()
          const config = STORE_CONFIGURATIONS[storeDef.id as keyof typeof STORE_CONFIGURATIONS]

          if (config) {
            const recordCount = this.getStoreRecordCount(storeInstance, storeDef.id)
            const dataSize = this.estimateStoreDataSize(storeInstance, storeDef.id)

            const storeInfo: DebugStoreInfo = {
              id: storeDef.id,
              name: storeDef.id,
              displayName: this.formatStoreName(storeDef.id),
              description: config.description,
              icon: config.icon,
              isLoaded: storeInstance !== null && recordCount > 0,
              lastUpdated: this.getLastUpdated(storeInstance, storeDef.id),
              recordCount,
              size: this.formatDataSize(dataSize)
            }

            stores.push(storeInfo)
            DebugUtils.debug(MODULE_NAME, `Store discovered: ${storeDef.id}`, {
              recordCount,
              dataSize,
              isLoaded: storeInfo.isLoaded
            })
          }
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, `Failed to initialize store: ${storeDef.id}`, { error })

          // Создаем запись для недоступного store
          const config = STORE_CONFIGURATIONS[storeDef.id as keyof typeof STORE_CONFIGURATIONS]
          if (config) {
            stores.push({
              id: storeDef.id,
              name: storeDef.id,
              displayName: this.formatStoreName(storeDef.id),
              description: config.description,
              icon: config.icon,
              isLoaded: false,
              lastUpdated: '',
              recordCount: 0,
              size: '0 B'
            })
          }
        }
      }

      DebugUtils.info(MODULE_NAME, `Discovered ${stores.length} stores`, {
        loaded: stores.filter(s => s.isLoaded).length,
        total: stores.length
      })

      return stores
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to discover stores', { error })
      throw error
    }
  }

  // =============================================
  // STORE DATA EXTRACTION
  // =============================================

  /**
   * Получить полные данные store с анализом
   */
  async getStoreData(storeId: string): Promise<DebugStoreData> {
    try {
      DebugUtils.debug(MODULE_NAME, `Getting store data: ${storeId}`)

      const storeInstance = this.getStoreInstance(storeId)
      if (!storeInstance) {
        throw new Error(`Store not found: ${storeId}`)
      }

      // Извлекаем данные специфично для каждого store
      const state = this.extractStoreState(storeInstance, storeId)
      const getters = this.extractStoreGetters(storeInstance, storeId)
      const actions = this.extractStoreActions(storeInstance)

      // Выполняем анализ
      const analysis = this.analyzeStoreData(storeId, state, getters)

      const storeData: DebugStoreData = {
        id: storeId,
        name: this.formatStoreName(storeId),
        timestamp: TimeUtils.getCurrentLocalISO(),
        state,
        getters,
        actions,
        analysis
      }

      DebugUtils.debug(MODULE_NAME, `Store data extracted: ${storeId}`, {
        stateKeys: Object.keys(state).length,
        gettersKeys: Object.keys(getters).length,
        actionsCount: actions.length,
        totalItems: analysis.totalItems,
        healthStatus: analysis.health.status
      })

      return storeData
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to get store data: ${storeId}`, { error })
      throw error
    }
  }

  // =============================================
  // STORE INSTANCE MANAGEMENT
  // =============================================

  private safeGetStore(getStoreFunc: () => any): any {
    try {
      return getStoreFunc()
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get store instance safely', { error })
      return null
    }
  }

  private getStoreInstance(storeId: string): any {
    try {
      switch (storeId) {
        case 'products':
          return useProductsStore()
        case 'counteragents':
          return useCounteragentsStore()
        case 'recipes':
          return useRecipesStore()
        case 'account':
          return useAccountStore()
        case 'menu':
          return useMenuStore()
        case 'storage':
          return useStorageStore()
        case 'preparation':
          return usePreparationStore()
        case 'supplier':
          return useSupplierStore()
        case 'auth':
          return useAuthStore()
        case 'sales':
          return useSalesStore()
        case 'recipeWriteOff':
          return useRecipeWriteOffStore()
        default:
          throw new Error(`Unknown store: ${storeId}`)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to get store instance: ${storeId}`, { error })
      return null
    }
  }

  // =============================================
  // STORE-SPECIFIC DATA EXTRACTION
  // =============================================

  private extractStoreState(storeInstance: any, storeId: string): Record<string, any> {
    try {
      switch (storeId) {
        case 'products':
          return this.extractProductsState(storeInstance)
        case 'counteragents':
          return this.extractCounteragentsState(storeInstance)
        case 'recipes':
          return this.extractRecipesState(storeInstance)
        case 'account':
          return this.extractAccountState(storeInstance)
        case 'menu':
          return this.extractMenuState(storeInstance)
        case 'storage':
          return this.extractStorageState(storeInstance)
        case 'preparation':
          return this.extractPreparationState(storeInstance)
        case 'supplier':
          return this.extractSupplierState(storeInstance)
        case 'auth':
          return this.extractAuthState(storeInstance)
        case 'sales':
          return this.extractSalesState(storeInstance)
        case 'recipeWriteOff':
          return this.extractRecipeWriteOffState(storeInstance)
        default:
          return this.extractGenericState(storeInstance)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to extract store state: ${storeId}`, { error })
      return {
        error: 'Failed to extract state',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private extractProductsState(storeInstance: any): Record<string, any> {
    return {
      products: this.serializeArray(storeInstance.products || []),
      loading: storeInstance.loading || false,
      error: storeInstance.error,
      selectedProduct: storeInstance.selectedProduct,
      useMockMode: storeInstance.useMockMode || false,
      filters: storeInstance.filters || {},
      statistics: storeInstance.statistics || {}
    }
  }

  private extractCounteragentsState(storeInstance: any): Record<string, any> {
    return {
      counteragents: this.serializeArray(storeInstance.counteragents || []),
      loading: storeInstance.loading || {},
      error: storeInstance.error,
      currentCounteragent: storeInstance.currentCounteragent,
      selectedIds: storeInstance.selectedIds || [],
      filters: storeInstance.filters || {},
      viewSettings: storeInstance.viewSettings || {}
    }
  }

  private extractRecipesState(storeInstance: any): Record<string, any> {
    // Recipes store использует composables структуру
    const preparations = storeInstance.preparations?.value || storeInstance.activePreparations || []
    const recipes = storeInstance.recipes?.value || storeInstance.activeRecipes || []
    const units = storeInstance.units?.value || []

    return {
      preparations: this.serializeArray(preparations),
      recipes: this.serializeArray(recipes),
      units: this.serializeArray(units),
      loading: storeInstance.loading?.value || false,
      error: storeInstance.error?.value,
      selectedRecipe: storeInstance.state?.value?.selectedRecipe,
      selectedPreparation: storeInstance.state?.value?.selectedPreparation,
      statistics: storeInstance.statistics || {}
    }
  }

  private extractAccountState(storeInstance: any): Record<string, any> {
    try {
      const storeState = storeInstance.state?.value || storeInstance.state || {}

      // ✅ НОВАЯ АРХИТЕКТУРА: accountTransactions вместо transactions
      const accountTransactions = storeState.accountTransactions || {}
      const allTransactionsCache = storeState.allTransactionsCache

      // Подсчитаем общее количество транзакций
      const totalTransactions = Object.values(accountTransactions).reduce(
        (sum: number, txns: any[]) => sum + (txns?.length || 0),
        0
      )

      // Информация о распределении по аккаунтам
      const transactionDistribution: Record<string, number> = {}
      Object.entries(accountTransactions).forEach(([accountId, txns]: [string, any[]]) => {
        transactionDistribution[accountId] = txns?.length || 0
      })

      return {
        // ✅ ОБНОВЛЕННАЯ СТРУКТУРА
        accounts: this.serializeArray(storeState.accounts || []),

        // ✅ НОВОЕ: Раздельные транзакции по аккаунтам
        accountTransactions: this.serializeAccountTransactions(accountTransactions),
        transactionDistribution,
        totalTransactions,

        // ✅ НОВОЕ: Кеш всех транзакций
        allTransactionsCache: allTransactionsCache
          ? {
              cached: true,
              count: allTransactionsCache.length,
              timestamp: storeState.cacheTimestamp,
              sample: this.serializeArray(allTransactionsCache.slice(0, 3)) // Показываем первые 3
            }
          : null,

        // Остальные поля без изменений
        pendingPayments: this.serializeArray(storeState.pendingPayments || []),
        loading: storeState.loading || {},
        error: storeState.error,
        selectedAccountId: storeState.selectedAccountId,
        filters: storeState.filters || {},
        paymentFilters: storeState.paymentFilters || {},

        // ✅ НОВОЕ: Метаданные для анализа
        lastFetch: storeState.lastFetch || {},

        // ✅ НОВОЕ: Статистика по balanceAfter
        balanceAfterStats: this.analyzeBalanceAfterData(accountTransactions, storeState.accounts)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to extract account state', { error })
      return {
        error: 'Failed to extract account state',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallbackStructure: {
          accounts: [],
          accountTransactions: {},
          totalTransactions: 0,
          pendingPayments: [],
          loading: {},
          selectedAccountId: null
        }
      }
    }
  }

  // ✅ ДОБАВИТЬ новые helper методы
  private serializeAccountTransactions(
    accountTransactions: Record<string, any[]>
  ): Record<string, any> {
    const serialized: Record<string, any> = {}

    Object.entries(accountTransactions).forEach(([accountId, transactions]) => {
      if (!Array.isArray(transactions)) {
        serialized[accountId] = { error: 'Invalid transaction array' }
        return
      }

      // Показываем только первые 5 транзакций + метаданные
      serialized[accountId] = {
        count: transactions.length,
        transactions: this.serializeArray(transactions.slice(0, 5)),
        hasMore: transactions.length > 5,
        latestTransaction: transactions[0]
          ? {
              id: transactions[0].id,
              type: transactions[0].type,
              amount: transactions[0].amount,
              balanceAfter: transactions[0].balanceAfter,
              createdAt: transactions[0].createdAt
            }
          : null
      }
    })

    return serialized
  }

  private analyzeBalanceAfterData(
    accountTransactions: Record<string, any[]>,
    accounts: any[]
  ): Record<string, any> {
    const analysis: Record<string, any> = {
      totalAccounts: Object.keys(accountTransactions).length,
      accountsWithTransactions: 0,
      balanceConsistency: {},
      issues: []
    }

    try {
      Object.entries(accountTransactions).forEach(([accountId, transactions]) => {
        if (!Array.isArray(transactions) || transactions.length === 0) return

        analysis.accountsWithTransactions++

        const account = accounts?.find((a: any) => a.id === accountId)
        if (!account) {
          analysis.issues.push(`Account ${accountId} has transactions but no account record`)
          return
        }

        const latestTransaction = transactions[0] // Первая = самая новая
        const balanceMatches = account.balance === latestTransaction?.balanceAfter

        analysis.balanceConsistency[accountId] = {
          accountBalance: account.balance,
          latestTransactionBalance: latestTransaction?.balanceAfter,
          matches: balanceMatches,
          transactionCount: transactions.length
        }

        if (!balanceMatches) {
          analysis.issues.push(
            `Balance mismatch for ${account.name}: ` +
              `account=${account.balance}, latest_tx=${latestTransaction?.balanceAfter}`
          )
        }
      })

      // Подсчитываем consistency rate
      const consistentAccounts = Object.values(analysis.balanceConsistency).filter(
        (item: any) => item.matches
      ).length
      analysis.consistencyRate =
        analysis.accountsWithTransactions > 0
          ? Math.round((consistentAccounts / analysis.accountsWithTransactions) * 100)
          : 100
    } catch (error) {
      analysis.issues.push('Failed to analyze balance consistency')
    }

    return analysis
  }

  private extractMenuState(storeInstance: any): Record<string, any> {
    const storeState = storeInstance.state?.value || storeInstance.state || {}
    return {
      categories: this.serializeArray(
        storeInstance.categories?.value || storeState.categories || []
      ),
      menuItems: this.serializeArray(storeInstance.menuItems?.value || storeState.menuItems || []),
      loading: storeState.loading || false,
      error: storeState.error,
      selectedCategoryId: storeState.selectedCategoryId
    }
  }

  private extractStorageState(storeInstance: any): Record<string, any> {
    const storeState = storeInstance.state?.value || storeInstance.state || {}

    return {
      // ✅ НОВОЕ: Раздельные массивы batches
      activeBatches: this.serializeArray(storeState.activeBatches || []),
      transitBatches: this.serializeArray(storeState.transitBatches || []),

      // Остальное без изменений
      operations: this.serializeArray(storeState.operations || []),
      balances: this.serializeArray(storeState.balances || []),
      inventories: this.serializeArray(storeState.inventories || []),
      loading: storeState.loading || {},
      error: storeState.error,
      filters: storeState.filters || {},
      settings: storeState.settings || {},
      alertCounts: storeState.alertCounts || {}
    }
  }

  private extractPreparationState(storeInstance: any): Record<string, any> {
    try {
      // The Preparation store uses a different structure - it returns an object with methods and computed values
      // We need to access the actual state via storeInstance.state.value
      const storeState = storeInstance.state?.value || storeInstance.state || {}

      return {
        // Core data arrays
        batches: this.serializeArray(storeState.batches || []),
        operations: this.serializeArray(storeState.operations || []),
        balances: this.serializeArray(storeState.balances || []),
        inventories: this.serializeArray(storeState.inventories || []),

        // Loading states
        loading: storeState.loading || {
          balances: false,
          operations: false,
          inventory: false,
          consumption: false,
          production: false,
          writeOff: false
        },

        // Error state
        error: storeState.error,

        // Filters
        filters: storeState.filters || {
          department: 'all',
          operationType: undefined,
          showExpired: false,
          showBelowMinStock: false,
          showNearExpiry: false,
          search: '',
          dateFrom: undefined,
          dateTo: undefined
        },

        // Settings
        settings: storeState.settings || {
          expiryWarningDays: 1,
          lowStockMultiplier: 1.2,
          autoCalculateBalance: true,
          enableQuickWriteOff: true
        },

        // Additional computed data that might be available directly on the store instance
        filteredBalances: this.serializeArray(storeInstance.filteredBalances?.value || []),
        filteredOperations: this.serializeArray(storeInstance.filteredOperations?.value || []),
        alertCounts: storeInstance.alertCounts?.value || storeState.alertCounts || {},
        statistics: storeInstance.statistics?.value || {}
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to extract preparation state', { error })
      return {
        error: 'Failed to extract preparation state',
        details: error instanceof Error ? error.message : 'Unknown error',
        // Fallback structure to show what should be there
        expectedStructure: {
          batches: [],
          operations: [],
          balances: [],
          inventories: [],
          loading: {},
          error: null,
          filters: {},
          settings: {},
          alertCounts: {}
        }
      }
    }
  }

  private extractSupplierState(storeInstance: any): Record<string, any> {
    const storeState = storeInstance.state?.value || storeInstance.state || {}
    return {
      requests: this.serializeArray(storeState.requests || storeState.procurementRequests || []),
      orders: this.serializeArray(storeState.orders || storeState.purchaseOrders || []),
      receipts: this.serializeArray(storeState.receipts || storeState.receiptAcceptances || []),
      orderSuggestions: this.serializeArray(storeState.orderSuggestions || []),
      selectedRequestIds: storeState.selectedRequestIds || [],
      supplierBaskets: this.serializeArray(storeState.supplierBaskets || []),
      loading: storeState.loading || {},
      statistics: storeState.statistics || {}
    }
  }

  private extractAuthState(storeInstance: any): Record<string, any> {
    const storeState = storeInstance.state?.value || storeInstance.state || {}
    return {
      isAuthenticated: storeState.isAuthenticated || false,
      isLoading: storeState.isLoading || false,
      currentUser: storeState.currentUser
        ? {
            id: storeState.currentUser.id,
            name: storeState.currentUser.name,
            roles: storeState.currentUser.roles
          }
        : null,
      error: storeState.error,
      lastLoginAt: storeState.lastLoginAt
    }
  }

  private extractSalesState(storeInstance: any): Record<string, any> {
    return {
      transactions: this.serializeArray(storeInstance.transactions || []),
      initialized: storeInstance.initialized || false,
      loading: storeInstance.loading || false,
      error: storeInstance.error,
      todayTransactions: this.serializeArray(storeInstance.todayTransactions || []),
      todayRevenue: storeInstance.todayRevenue || 0,
      todayProfit: storeInstance.todayProfit || 0,
      todayItemsSold: storeInstance.todayItemsSold || 0
    }
  }

  private extractRecipeWriteOffState(storeInstance: any): Record<string, any> {
    return {
      writeOffs: this.serializeArray(storeInstance.writeOffs || []),
      initialized: storeInstance.initialized || false,
      loading: storeInstance.loading || false,
      error: storeInstance.error,
      todayWriteOffs: this.serializeArray(storeInstance.todayWriteOffs || []),
      totalCostToday: storeInstance.totalCostToday || 0
    }
  }

  private extractGenericState(storeInstance: any): Record<string, any> {
    // Базовое извлечение для неизвестных stores
    return {
      loading: storeInstance.loading || false,
      error: storeInstance.error,
      data: 'Generic store - specific extraction not implemented'
    }
  }

  private extractStoreGetters(storeInstance: any, storeId: string): Record<string, any> {
    try {
      const getters: Record<string, any> = {}

      switch (storeId) {
        case 'products':
          getters.filteredProducts = this.serializeArray(storeInstance.filteredProducts || [])
          getters.sellableProducts = this.serializeArray(storeInstance.sellableProducts || [])
          getters.rawMaterials = this.serializeArray(storeInstance.rawMaterials || [])
          getters.statistics = storeInstance.statistics || {}
          break

        case 'counteragents':
          getters.filteredCounterAgents = this.serializeArray(
            storeInstance.filteredCounterAgents || []
          )
          getters.activeCounterAgents = this.serializeArray(storeInstance.activeCounterAgents || [])
          getters.supplierCounterAgents = this.serializeArray(
            storeInstance.supplierCounterAgents || []
          )
          getters.preferredCounterAgents = this.serializeArray(
            storeInstance.preferredCounterAgents || []
          )
          break

        case 'recipes':
          getters.activeRecipes = this.serializeArray(storeInstance.activeRecipes || [])
          getters.activePreparations = this.serializeArray(storeInstance.activePreparations || [])
          getters.statistics = storeInstance.statistics || {}
          break

        case 'account':
          // ✅ НОВЫЕ GETTERS для новой архитектуры
          getters.totalBalance = storeInstance.totalBalance?.value || 0
          getters.activeAccounts = this.serializeArray(storeInstance.activeAccounts || [])
          getters.pendingPayments = this.serializeArray(storeInstance.pendingPayments?.value || [])
          getters.urgentPayments = this.serializeArray(storeInstance.urgentPayments?.value || [])

          // ✅ НОВОЕ: getAllTransactions из новой архитектуры
          getters.getAllTransactions = this.serializeArray(storeInstance.getAllTransactions || [])
          getters.allTransactionsCount = storeInstance.getAllTransactions?.length || 0

          // ✅ НОВОЕ: getAccountTransactions примеры
          // Use actual account IDs from the store instead of hardcoded values
          const sampleAccountIds = (storeInstance.accounts || [])
            .slice(0, 3)
            .map((acc: any) => acc.id)
          getters.accountTransactionsSample = {}
          sampleAccountIds.forEach(accId => {
            try {
              const txns = storeInstance.getAccountTransactions?.(accId) || []
              getters.accountTransactionsSample[accId] = {
                count: txns.length,
                sample: this.serializeArray(txns.slice(0, 2))
              }
            } catch (error) {
              getters.accountTransactionsSample[accId] = { error: 'Failed to get transactions' }
            }
          })

          // Statistics
          getters.paymentStatistics = storeInstance.paymentStatistics?.value || {}
          break

        case 'menu':
          getters.activeCategories = this.serializeArray(
            storeInstance.activeCategories?.value || []
          )
          getters.activeMenuItems = this.serializeArray(storeInstance.activeMenuItems?.value || [])
          break

        case 'storage':
          getters.filteredBalances = this.serializeArray(
            storeInstance.filteredBalances?.value || []
          )
          getters.alertCounts = storeInstance.alertCounts?.value || {}
          break

        case 'supplier':
          getters.urgentSuggestions = this.serializeArray(
            storeInstance.urgentSuggestions?.value || []
          )
          getters.pendingOrders = this.serializeArray(storeInstance.pendingOrders?.value || [])
          getters.statistics = storeInstance.statistics?.value || {}
          break

        case 'auth':
          getters.isAdmin = storeInstance.isAdmin?.value || false
          getters.userName = storeInstance.userName?.value || ''
          getters.userRoles = storeInstance.userRoles?.value || []
          break
      }

      return getters
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to extract getters for ${storeId}`, { error })
      return { error: 'Failed to extract getters' }
    }
  }

  private extractStoreActions(storeInstance: any): string[] {
    try {
      const actions: string[] = []

      // Получаем все методы store (actions)
      for (const key in storeInstance) {
        if (
          typeof storeInstance[key] === 'function' &&
          !key.startsWith('$') &&
          !key.startsWith('_') &&
          !key.startsWith('use')
        ) {
          // Исключаем composables
          actions.push(key)
        }
      }

      return actions.sort()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to extract store actions', { error })
      return ['Actions extraction failed']
    }
  }

  // =============================================
  // DATA ANALYSIS
  // =============================================

  private analyzeStoreData(
    storeId: string,
    state: Record<string, any>,
    getters: Record<string, any>
  ): DebugStoreAnalysis {
    try {
      // Базовый анализ
      const breakdown = this.analyzeDataStructure(state)
      const totalItems = this.countTotalItems(state, storeId)
      const activeItems = this.countActiveItems(state, getters, storeId)
      const inactiveItems = Math.max(0, totalItems - activeItems)

      // Специфичные метрики store
      const specificMetrics = this.calculateStoreSpecificMetrics(storeId, state, getters)

      // Анализ здоровья
      const health = this.analyzeStoreHealth(storeId, state, getters)

      const analysis: DebugStoreAnalysis = {
        totalItems,
        activeItems,
        inactiveItems,
        breakdown,
        specificMetrics,
        health
      }

      return analysis
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to analyze store data: ${storeId}`, { error })
      return {
        totalItems: 0,
        activeItems: 0,
        inactiveItems: 0,
        breakdown: { arrays: 0, objects: 0, primitives: 0, functions: 0 },
        specificMetrics: {},
        health: {
          status: 'error',
          issues: ['Analysis failed'],
          warnings: []
        }
      }
    }
  }

  private analyzeDataStructure(data: any): {
    arrays: number
    objects: number
    primitives: number
    functions: number
  } {
    const breakdown = { arrays: 0, objects: 0, primitives: 0, functions: 0 }

    const analyze = (obj: any, depth: number = 0): void => {
      // Ограничиваем глубину для производительности
      if (depth > 3) return

      if (Array.isArray(obj)) {
        breakdown.arrays++
        // Анализируем только первые несколько элементов массива
        obj.slice(0, 3).forEach(item => analyze(item, depth + 1))
      } else if (typeof obj === 'object' && obj !== null) {
        breakdown.objects++
        // Анализируем только важные поля
        const importantKeys = Object.keys(obj).slice(0, 10)
        importantKeys.forEach(key => analyze(obj[key], depth + 1))
      } else if (typeof obj === 'function') {
        breakdown.functions++
      } else {
        breakdown.primitives++
      }
    }

    analyze(data)
    return breakdown
  }

  private countTotalItems(state: Record<string, any>, storeId: string): number {
    try {
      switch (storeId) {
        case 'products':
          return state.products?.length || 0
        case 'counteragents':
          return state.counteragents?.length || 0
        case 'recipes':
          return (state.preparations?.length || 0) + (state.recipes?.length || 0)
        case 'account':
          return (
            (state.accounts?.length || 0) +
            (state.transactions?.length || 0) +
            (state.pendingPayments?.length || 0)
          )
        case 'menu':
          return (state.categories?.length || 0) + (state.menuItems?.length || 0)
        case 'storage':
          return (state.balances?.length || 0) + (state.operations?.length || 0)
        case 'preparation':
          return state.preparations?.length || 0
        case 'supplier':
          return (
            (state.requests?.length || 0) +
            (state.orders?.length || 0) +
            (state.receipts?.length || 0)
          )
        case 'auth':
          return state.currentUser ? 1 : 0
        default:
          return 0
      }
    } catch (error) {
      return 0
    }
  }

  private countActiveItems(
    state: Record<string, any>,
    getters: Record<string, any>,
    storeId: string
  ): number {
    try {
      switch (storeId) {
        case 'products':
          return (
            getters.filteredProducts?.length ||
            state.products?.filter((p: any) => p.isActive).length ||
            0
          )
        case 'counteragents':
          return (
            getters.activeCounterAgents?.length ||
            state.counteragents?.filter((c: any) => c.isActive).length ||
            0
          )
        case 'recipes':
          return (getters.activeRecipes?.length || 0) + (getters.activePreparations?.length || 0)
        case 'account':
          return (
            getters.activeAccounts?.length ||
            state.accounts?.filter((a: any) => a.isActive).length ||
            0
          )
        case 'menu':
          return (getters.activeCategories?.length || 0) + (getters.activeMenuItems?.length || 0)
        case 'storage':
          return state.balances?.length || 0
        case 'preparation':
          return (
            state.activePreparations?.length ||
            state.preparations?.filter((p: any) => p.isActive).length ||
            0
          )
        case 'supplier':
          return state.requests?.filter((r: any) => r.status !== 'cancelled').length || 0
        case 'auth':
          return state.isAuthenticated ? 1 : 0
        default:
          return 0
      }
    } catch (error) {
      return 0
    }
  }

  // =============================================
  // STORE-SPECIFIC METRICS
  // =============================================

  private calculateStoreSpecificMetrics(
    storeId: string,
    state: Record<string, any>,
    getters: Record<string, any>
  ): StoreSpecificMetrics {
    try {
      switch (storeId) {
        case 'products':
          return this.calculateProductsMetrics(state, getters)
        case 'counteragents':
          return this.calculateCounteragentsMetrics(state, getters)
        case 'recipes':
          return this.calculateRecipesMetrics(state, getters)
        case 'account':
          return this.calculateAccountMetrics(state, getters)
        case 'menu':
          return this.calculateMenuMetrics(state, getters)
        case 'storage':
          return this.calculateStorageMetrics(state, getters)
        case 'supplier':
          return this.calculateSupplierMetrics(state, getters)
        default:
          return {}
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to calculate metrics for ${storeId}`, { error })
      return { error: 'Metrics calculation failed' }
    }
  }

  private calculateProductsMetrics(
    state: Record<string, any>,
    getters: Record<string, any>
  ): ProductsStoreMetrics {
    const products = state.products || []

    return {
      totalProducts: products.length,
      sellableProducts:
        getters.sellableProducts?.length || products.filter((p: any) => p.canBeSold).length,
      rawMaterials:
        getters.rawMaterials?.length || products.filter((p: any) => !p.canBeSold).length,
      categoriesBreakdown: this.groupBy(products, 'category'),
      baseUnitsBreakdown: this.groupBy(products, 'baseUnit'),
      avgCostPerUnit: this.calculateAverage(products, 'baseCostPerUnit'),
      productsWithSuppliers: products.filter((p: any) => p.primarySupplierId).length
    }
  }

  private calculateCounteragentsMetrics(
    state: Record<string, any>,
    getters: Record<string, any>
  ): CounteragentsStoreMetrics {
    const counteragents = state.counteragents || []

    return {
      totalCounterAgents: counteragents.length,
      suppliers: counteragents.filter((c: any) => c.type === 'supplier').length,
      services: counteragents.filter((c: any) => c.type === 'service').length,
      activeCounterAgents:
        getters.activeCounterAgents?.length || counteragents.filter((c: any) => c.isActive).length,
      preferredCounterAgents:
        getters.preferredCounterAgents?.length ||
        counteragents.filter((c: any) => c.isPreferred).length,
      categoryCoverage: this.groupBy(counteragents, 'productCategories'),
      paymentTermsBreakdown: this.groupBy(counteragents, 'paymentTerms')
    }
  }

  private calculateRecipesMetrics(
    state: Record<string, any>,
    getters: Record<string, any>
  ): RecipesStoreMetrics {
    const preparations = state.preparations || []
    const recipes = state.recipes || []

    return {
      totalPreparations: preparations.length,
      totalRecipes: recipes.length,
      activePreparations:
        getters.activePreparations?.length || preparations.filter((p: any) => p.isActive).length,
      activeRecipes: getters.activeRecipes?.length || recipes.filter((r: any) => r.isActive).length,
      avgPreparationCost: this.calculateAverage(preparations, 'costPerPortion'),
      avgRecipeCost: this.calculateAverage(recipes, 'cost'),
      typeBreakdown: this.groupBy(preparations, 'type'),
      complexityBreakdown: this.groupBy(recipes, 'difficulty')
    }
  }

  private calculateAccountMetrics(
    state: Record<string, any>,
    getters: Record<string, any>
  ): AccountStoreMetrics {
    const accounts = state.accounts || []
    const accountTransactions = state.accountTransactions || {}
    const pendingPayments = state.pendingPayments || []

    // ✅ НОВОЕ: Подсчет транзакций из новой структуры
    const totalTransactions = Object.values(accountTransactions).reduce(
      (sum: number, txns: any[]) => sum + (txns?.length || 0),
      0
    )

    // ✅ НОВОЕ: Анализ последних транзакций с balanceAfter
    let totalAmountFromTransactions = 0
    const transactionTypeBreakdown = { income: 0, expense: 0, transfer: 0, correction: 0 }

    Object.values(accountTransactions).forEach((txns: any[]) => {
      txns?.forEach((tx: any) => {
        totalAmountFromTransactions += Math.abs(tx.amount || 0)
        if (tx.type && transactionTypeBreakdown.hasOwnProperty(tx.type)) {
          transactionTypeBreakdown[tx.type as keyof typeof transactionTypeBreakdown]++
        }
      })
    })

    const balanceAfterStats = state.balanceAfterStats || {}

    return {
      // Базовые метрики
      totalAccounts: accounts.length,
      activeAccounts:
        getters.activeAccounts?.length || accounts.filter((a: any) => a.isActive).length,
      totalBalance:
        getters.totalBalance || accounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0),

      // ✅ ОБНОВЛЕННЫЕ метрики транзакций
      totalTransactions,
      averageTransactionAmount:
        totalTransactions > 0 ? totalAmountFromTransactions / totalTransactions : 0,
      transactionTypeBreakdown,

      // Метрики платежей
      pendingPayments: pendingPayments.filter((p: any) => p.status === 'pending').length,
      urgentPayments:
        getters.urgentPayments?.length ||
        pendingPayments.filter((p: any) => p.priority === 'urgent').length,

      // ✅ НОВЫЕ метрики для новой архитектуры
      accountsWithTransactions: Object.keys(accountTransactions).length,
      averageTransactionsPerAccount:
        Object.keys(accountTransactions).length > 0
          ? totalTransactions / Object.keys(accountTransactions).length
          : 0,

      // Кеширование
      hasCachedTransactions: Boolean(state.allTransactionsCache),
      cacheTimestamp: state.cacheTimestamp,

      // Распределение транзакций по аккаунтам
      transactionDistribution: state.transactionDistribution || {},

      // ✅ НОВОЕ: Согласованность balanceAfter
      balanceConsistencyRate: balanceAfterStats.consistencyRate,
      balanceIssuesCount: balanceAfterStats.issues?.length || 0
    }
  }

  private calculateMenuMetrics(
    state: Record<string, any>,
    getters: Record<string, any>
  ): MenuStoreMetrics {
    const categories = state.categories || []
    const menuItems = state.menuItems || []

    const totalVariants = menuItems.reduce(
      (sum: number, item: any) => sum + (item.variants?.length || 0),
      0
    )

    return {
      totalCategories: categories.length,
      totalMenuItems: menuItems.length,
      activeCategories:
        getters.activeCategories?.length || categories.filter((c: any) => c.isActive).length,
      activeMenuItems:
        getters.activeMenuItems?.length || menuItems.filter((m: any) => m.isActive).length,
      totalVariants,
      avgPricePerItem: this.calculateAveragePrice(menuItems),
      itemsPerCategory: this.groupBy(menuItems, 'categoryId')
    }
  }

  private calculateStorageMetrics(
    state: Record<string, any>,
    getters: Record<string, any>
  ): StorageStoreMetrics {
    const balances = state.balances || []
    const operations = state.operations || []

    return {
      totalProducts: balances.length,
      totalValue: balances.reduce((sum: number, b: any) => sum + (b.totalValue || 0), 0),
      expiredItems: balances.filter((b: any) => b.hasExpired).length,
      nearExpiryItems: balances.filter((b: any) => b.hasNearExpiry).length,
      lowStockItems: balances.filter((b: any) => b.belowMinStock).length,
      departmentBreakdown: this.calculateDepartmentBreakdown(balances),
      recentOperations: operations.filter((op: any) => this.isRecentOperation(op.createdAt)).length
    }
  }

  private calculateSupplierMetrics(
    state: Record<string, any>,
    getters: Record<string, any>
  ): SupplierStoreMetrics {
    const requests = state.requests || []
    const orders = state.orders || []
    const receipts = state.receipts || []

    return {
      totalRequests: requests.length,
      totalOrders: orders.length,
      totalReceipts: receipts.length,
      pendingRequests: requests.filter((r: any) => r.status === 'submitted').length,
      unpaidOrders: orders.filter((o: any) => o.paymentStatus === 'pending').length,
      urgentSuggestions: getters.urgentSuggestions?.length || 0,
      workflowEfficiency: this.calculateWorkflowEfficiency(requests, orders, receipts)
    }
  }

  // =============================================
  // HEALTH ANALYSIS
  // =============================================

  private analyzeStoreHealth(
    storeId: string,
    state: Record<string, any>,
    getters: Record<string, any>
  ): DebugStoreAnalysis['health'] {
    const issues: string[] = []
    const warnings: string[] = []

    try {
      // Общие проверки здоровья
      if (Object.keys(state).length === 0) {
        issues.push('Store state is empty')
      }

      if (state.error) {
        issues.push(`Store has error: ${state.error}`)
      }

      if (state.loading && typeof state.loading === 'object') {
        const loadingStates = Object.values(state.loading).filter(Boolean)
        if (loadingStates.length > 3) {
          warnings.push('Multiple loading states active')
        }
      }

      // Специфичные проверки для stores
      switch (storeId) {
        case 'products':
          this.checkProductsHealth(state, issues, warnings)
          break
        case 'counteragents':
          this.checkCounteragentsHealth(state, issues, warnings)
          break
        case 'recipes':
          this.checkRecipesHealth(state, issues, warnings)
          break
        case 'account':
          this.checkAccountHealth(state, issues, warnings)
          break
        case 'storage':
          this.checkStorageHealth(state, issues, warnings)
          break
        case 'preparation':
          this.checkPreparationHealth(state, issues, warnings)
          break
        case 'supplier':
          this.checkSupplierHealth(state, issues, warnings)
          break
        case 'auth':
          this.checkAuthHealth(state, issues, warnings)
          break
      }

      const status = issues.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'healthy'

      return { status, issues, warnings }
    } catch (error) {
      return {
        status: 'error',
        issues: ['Health check failed'],
        warnings: []
      }
    }
  }

  private checkProductsHealth(
    state: Record<string, any>,
    issues: string[],
    warnings: string[]
  ): void {
    const products = state.products || []

    if (products.length === 0) {
      issues.push('No products found')
      return
    }

    const productsWithoutSuppliers = products.filter((p: any) => !p.primarySupplierId).length
    if (productsWithoutSuppliers > 0) {
      warnings.push(`${productsWithoutSuppliers} products without suppliers`)
    }

    const inactiveProducts = products.filter((p: any) => !p.isActive).length
    if (inactiveProducts > products.length * 0.5) {
      warnings.push('More than 50% products are inactive')
    }

    const productsWithoutCost = products.filter(
      (p: any) => !p.baseCostPerUnit || p.baseCostPerUnit <= 0
    ).length
    if (productsWithoutCost > 0) {
      warnings.push(`${productsWithoutCost} products without cost information`)
    }
  }

  private checkCounteragentsHealth(
    state: Record<string, any>,
    issues: string[],
    warnings: string[]
  ): void {
    const counteragents = state.counteragents || []

    if (counteragents.length === 0) {
      issues.push('No counteragents found')
      return
    }

    const suppliers = counteragents.filter((c: any) => c.type === 'supplier')
    if (suppliers.length === 0) {
      issues.push('No suppliers found')
    }

    const inactiveCounterAgents = counteragents.filter((c: any) => !c.isActive).length
    if (inactiveCounterAgents > counteragents.length * 0.3) {
      warnings.push('More than 30% counteragents are inactive')
    }
  }

  private checkRecipesHealth(
    state: Record<string, any>,
    issues: string[],
    warnings: string[]
  ): void {
    const preparations = state.preparations || []
    const recipes = state.recipes || []

    if (preparations.length === 0 && recipes.length === 0) {
      issues.push('No recipes or preparations found')
      return
    }

    const preparationsWithoutCost = preparations.filter(
      (p: any) => !p.costPerPortion || p.costPerPortion <= 0
    ).length
    if (preparationsWithoutCost > 0) {
      warnings.push(`${preparationsWithoutCost} preparations without cost calculation`)
    }

    const inactivePreparations = preparations.filter((p: any) => !p.isActive).length
    if (inactivePreparations > preparations.length * 0.5) {
      warnings.push('More than 50% preparations are inactive')
    }
  }

  private checkAccountHealth(
    state: Record<string, any>,
    issues: string[],
    warnings: string[]
  ): void {
    const accounts = state.accounts || []
    const accountTransactions = state.accountTransactions || {}
    const pendingPayments = state.pendingPayments || []

    if (accounts.length === 0) {
      issues.push('No accounts found')
      return
    }

    // ✅ НОВОЕ: Проверка согласованности balanceAfter
    const balanceAfterStats = state.balanceAfterStats
    if (balanceAfterStats) {
      if (balanceAfterStats.consistencyRate < 100) {
        issues.push(
          `Balance inconsistency detected: ${balanceAfterStats.consistencyRate}% accounts consistent`
        )
      }

      if (balanceAfterStats.issues?.length > 0) {
        balanceAfterStats.issues.forEach((issue: string) => {
          warnings.push(`Balance issue: ${issue}`)
        })
      }
    }

    // ✅ НОВОЕ: Проверка структуры accountTransactions
    const transactionDistribution = state.transactionDistribution || {}
    const accountsWithTransactions = Object.keys(transactionDistribution).length
    const activeAccountsCount = accounts.filter((a: any) => a.isActive).length

    if (accountsWithTransactions < activeAccountsCount) {
      warnings.push(
        `${activeAccountsCount - accountsWithTransactions} active accounts without transactions`
      )
    }

    // Проверка критических платежей
    const urgentPayments = pendingPayments.filter((p: any) => p.priority === 'urgent').length
    if (urgentPayments > 0) {
      warnings.push(`${urgentPayments} urgent payments pending`)
    }

    const overduePayments = pendingPayments.filter((p: any) => {
      if (!p.dueDate) return false
      return new Date(p.dueDate) < new Date() && p.status === 'pending'
    }).length
    if (overduePayments > 0) {
      issues.push(`${overduePayments} overdue payments`)
    }

    // Проверка отрицательных балансов
    const negativeBalanceAccounts = accounts.filter((a: any) => a.balance < 0).length
    if (negativeBalanceAccounts > 0) {
      warnings.push(`${negativeBalanceAccounts} accounts with negative balance`)
    }

    // ✅ НОВОЕ: Проверка кеширования
    const hasCachedData = Boolean(state.allTransactionsCache)
    const totalTransactions = state.totalTransactions || 0

    if (!hasCachedData && totalTransactions > 50) {
      warnings.push('Large transaction set without caching - performance may suffer')
    }

    // Проверка загрузочных состояний
    const loading = state.loading || {}
    const activeLoadingStates = Object.values(loading).filter(Boolean).length
    if (activeLoadingStates > 2) {
      warnings.push(`Multiple loading states active (${activeLoadingStates})`)
    }
  }

  private checkStorageHealth(
    state: Record<string, any>,
    issues: string[],
    warnings: string[]
  ): void {
    const balances = state.balances || []
    const alertCounts = state.alertCounts || {}

    if (balances.length === 0) {
      warnings.push('No storage balances found')
      return
    }

    if (alertCounts.expired > 0) {
      issues.push(`${alertCounts.expired} expired items in storage`)
    }

    if (alertCounts.lowStock > 0) {
      warnings.push(`${alertCounts.lowStock} items with low stock`)
    }

    if (alertCounts.expiring > 0) {
      warnings.push(`${alertCounts.expiring} items expiring soon`)
    }
  }

  private checkPreparationHealth(
    state: Record<string, any>,
    issues: string[],
    warnings: string[]
  ): void {
    const batches = state.batches || []
    const operations = state.operations || []
    const balances = state.balances || []
    const alertCounts = state.alertCounts || {}

    if (batches.length === 0 && balances.length === 0) {
      issues.push('No preparation data found')
      return
    }

    // Check for expired items
    if (alertCounts.expired > 0) {
      issues.push(`${alertCounts.expired} expired preparation items`)
    }

    // Check for low stock
    if (alertCounts.lowStock > 0) {
      warnings.push(`${alertCounts.lowStock} preparation items with low stock`)
    }

    // Check for items expiring soon
    if (alertCounts.expiring > 0) {
      warnings.push(`${alertCounts.expiring} preparation items expiring soon`)
    }

    // Check for inactive batches
    const inactiveBatches = batches.filter((b: any) => !b.isActive || b.status !== 'active').length
    if (inactiveBatches > batches.length * 0.5) {
      warnings.push('More than 50% of preparation batches are inactive')
    }

    // Check for operations without proper costs
    const operationsWithoutValue = operations.filter(
      (op: any) => !op.totalValue || op.totalValue <= 0
    ).length
    if (operationsWithoutValue > 0) {
      warnings.push(`${operationsWithoutValue} operations without proper value calculation`)
    }
  }

  private checkSupplierHealth(
    state: Record<string, any>,
    issues: string[],
    warnings: string[]
  ): void {
    const requests = state.requests || []
    const orders = state.orders || []

    const overdueOrders = orders.filter((o: any) => {
      if (!o.expectedDeliveryDate) return false
      return new Date(o.expectedDeliveryDate) < new Date() && o.status !== 'delivered'
    }).length

    if (overdueOrders > 0) {
      warnings.push(`${overdueOrders} overdue orders`)
    }

    const pendingRequests = requests.filter((r: any) => r.status === 'submitted').length
    if (pendingRequests > 10) {
      warnings.push(`${pendingRequests} pending procurement requests`)
    }
  }

  private checkAuthHealth(state: Record<string, any>, issues: string[], warnings: string[]): void {
    if (!state.isAuthenticated) {
      issues.push('User not authenticated')
    }

    if (!state.currentUser) {
      issues.push('No current user information')
    }

    if (state.currentUser && (!state.currentUser.roles || state.currentUser.roles.length === 0)) {
      warnings.push('User has no assigned roles')
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown'
      groups[value] = (groups[value] || 0) + 1
      return groups
    }, {})
  }

  private calculateAverage(array: any[], key: string): number {
    const values = array.map(item => item[key]).filter(val => typeof val === 'number' && val > 0)
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  private calculateAveragePrice(menuItems: any[]): number {
    let totalPrice = 0
    let count = 0

    menuItems.forEach(item => {
      if (item.variants && Array.isArray(item.variants)) {
        item.variants.forEach((variant: any) => {
          if (variant.price && typeof variant.price === 'number') {
            totalPrice += variant.price
            count++
          }
        })
      }
    })

    return count > 0 ? totalPrice / count : 0
  }

  private calculateDepartmentBreakdown(
    balances: any[]
  ): Record<string, { items: number; value: number }> {
    return balances.reduce((breakdown, balance) => {
      const dept = balance.department || 'unknown'
      if (!breakdown[dept]) {
        breakdown[dept] = { items: 0, value: 0 }
      }
      breakdown[dept].items++
      breakdown[dept].value += balance.totalValue || 0
      return breakdown
    }, {})
  }

  private calculateWorkflowEfficiency(requests: any[], orders: any[], receipts: any[]): number {
    // Простой расчет эффективности workflow
    if (requests.length === 0) return 0

    const completedRequests = requests.filter(r => r.status === 'completed').length
    return Math.round((completedRequests / requests.length) * 100)
  }

  private isRecentOperation(timestamp: string): boolean {
    if (!timestamp) return false
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return new Date(timestamp).getTime() > oneWeekAgo
  }

  private formatStoreName(storeId: string): string {
    return storeId
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private serializeArray(array: any[]): any[] {
    try {
      // Ограничиваем размер массива для производительности
      if (array.length > 100) {
        return [
          ...array.slice(0, 50),
          { __truncated: `... and ${array.length - 50} more items` },
          ...array.slice(-10)
        ]
      }
      return JSON.parse(JSON.stringify(array))
    } catch (error) {
      return [{ __error: 'Failed to serialize array', length: array.length }]
    }
  }

  // =============================================
  // STORE METADATA EXTRACTION
  // =============================================

  private getStoreRecordCount(storeInstance: any, storeId: string): number {
    try {
      switch (storeId) {
        case 'products':
          return storeInstance?.products?.length || 0
        case 'counteragents':
          return storeInstance?.counteragents?.length || 0
        case 'recipes':
          const preparations =
            storeInstance?.preparations?.value || storeInstance?.activePreparations || []
          const recipes = storeInstance?.recipes?.value || storeInstance?.activeRecipes || []
          return preparations.length + recipes.length
        case 'account':
          const accountState = storeInstance?.state?.value || storeInstance?.state || {}
          return (accountState.accounts?.length || 0) + (accountState.transactions?.length || 0)
        case 'menu':
          const menuState = storeInstance?.state?.value || storeInstance?.state || {}
          return (menuState.categories?.length || 0) + (menuState.menuItems?.length || 0)
        case 'storage':
          const storageState = storeInstance?.state?.value || storeInstance?.state || {}
          return storageState.balances?.length || 0
        case 'preparation':
          const prepState = storeInstance?.state?.value || storeInstance?.state || {}
          return prepState.preparations?.length || 0
        case 'supplier':
          const supplierState = storeInstance?.state?.value || storeInstance?.state || {}
          return (supplierState.requests?.length || 0) + (supplierState.orders?.length || 0)
        case 'auth':
          return storeInstance?.state?.value?.currentUser ? 1 : 0
        case 'sales':
          return storeInstance?.transactions?.length || 0
        case 'recipeWriteOff':
          return storeInstance?.writeOffs?.length || 0
        default:
          return 0
      }
    } catch (error) {
      return 0
    }
  }

  private estimateStoreDataSize(storeInstance: any, storeId: string): number {
    try {
      const state = this.extractStoreState(storeInstance, storeId)
      return JSON.stringify(state).length
    } catch (error) {
      return 0
    }
  }

  private getLastUpdated(storeInstance: any, storeId: string): string {
    try {
      // Для сейчас возвращаем текущее время если store загружен
      const recordCount = this.getStoreRecordCount(storeInstance, storeId)
      if (recordCount > 0) {
        return TimeUtils.getCurrentLocalISO()
      }
      return ''
    } catch (error) {
      return ''
    }
  }

  // =============================================
  // PUBLIC UTILITY METHODS
  // =============================================

  /**
   * Форматирует размер данных в читаемый вид
   */
  formatDataSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  /**
   * Генерирует краткое описание store
   */
  generateStoreSummary(storeData: DebugStoreData): Record<string, any> {
    return {
      id: storeData.id,
      name: storeData.name,
      timestamp: storeData.timestamp,
      totalItems: storeData.analysis.totalItems,
      activeItems: storeData.analysis.activeItems,
      healthStatus: storeData.analysis.health.status,
      issuesCount: storeData.analysis.health.issues.length,
      warningsCount: storeData.analysis.health.warnings.length,
      specificMetrics: storeData.analysis.specificMetrics,
      dataBreakdown: storeData.analysis.breakdown
    }
  }

  /**
   * Проверяет доступность store
   */
  async checkStoreAvailability(storeId: string): Promise<boolean> {
    try {
      const storeInstance = this.getStoreInstance(storeId)
      return storeInstance !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Получает статистику по всем stores
   */
  async getGlobalStatistics(): Promise<Record<string, any>> {
    try {
      const stores = await this.discoverAvailableStores()

      return {
        totalStores: stores.length,
        loadedStores: stores.filter(s => s.isLoaded).length,
        totalRecords: stores.reduce((sum, s) => sum + s.recordCount, 0),
        storesByStatus: {
          loaded: stores.filter(s => s.isLoaded).length,
          notLoaded: stores.filter(s => !s.isLoaded).length
        },
        averageRecordsPerStore:
          stores.length > 0
            ? Math.round(stores.reduce((sum, s) => sum + s.recordCount, 0) / stores.length)
            : 0,
        lastUpdate: TimeUtils.getCurrentLocalISO()
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get global statistics', { error })
      return {
        error: 'Failed to calculate statistics',
        lastUpdate: TimeUtils.getCurrentLocalISO()
      }
    }
  }
}

// =============================================
// SINGLETON EXPORT
// =============================================

export const debugService = new DebugService()
