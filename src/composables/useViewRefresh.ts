// src/composables/useViewRefresh.ts - Route-based data refresh composable

import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { DebugUtils } from '@/utils'

// Lazy imports to avoid circular dependencies
const MODULE_NAME = 'useViewRefresh'

/**
 * Composable for refreshing data based on current route
 * Each route maps to specific store refresh methods
 */
export function useViewRefresh() {
  const route = useRoute()
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Routes that don't support refresh (have their own generate/load buttons)
   */
  const noRefreshRoutes = [
    '/analytics/pl-report',
    '/analytics/food-cost',
    '/analytics/negative-inventory',
    '/analytics/revenue-dashboard',
    '/analytics/discount-analytics',
    '/inventory/valuation',
    '/sales/analytics'
  ]

  /**
   * Check if current route supports refresh
   */
  const canRefresh = computed(() => {
    const path = route.path
    return !noRefreshRoutes.some(r => path === r || path.startsWith(r + '/'))
  })

  /**
   * Refresh data for the current view
   * @returns true if refresh was successful, false otherwise
   */
  async function refresh(): Promise<boolean> {
    if (!canRefresh.value) {
      DebugUtils.debug(MODULE_NAME, 'Refresh skipped - route not supported', { path: route.path })
      return true
    }

    loading.value = true
    error.value = null

    try {
      const path = route.path
      DebugUtils.info(MODULE_NAME, 'Refreshing view data', { path })

      await refreshByRoute(path)

      DebugUtils.info(MODULE_NAME, 'View data refreshed successfully', { path })
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Refresh failed'
      DebugUtils.error(MODULE_NAME, 'Failed to refresh view data', { error: err, path: route.path })
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Route-to-store refresh mapping
   */
  async function refreshByRoute(path: string): Promise<void> {
    // Menu
    if (path === '/menu') {
      const { useMenuStore } = await import('@/stores/menu')
      const store = useMenuStore()
      await Promise.all([store.fetchCategories(), store.fetchMenuItems()])
      return
    }

    // Preparations
    if (path === '/preparations' || path.startsWith('/preparations/')) {
      const { usePreparationStore } = await import('@/stores/preparation')
      const store = usePreparationStore()
      await Promise.all([store.fetchBalances(), store.fetchOperations(), store.fetchBatches()])
      return
    }

    // Storage
    if (path === '/storage' || path.startsWith('/storage/')) {
      const { useStorageStore } = await import('@/stores/storage')
      const store = useStorageStore()
      await Promise.all([store.fetchBalances(), store.fetchOperations(), store.fetchInventories()])
      return
    }

    // Suppliers - use get* methods which fetch fresh data from Supabase
    if (path === '/suppliers' || path.startsWith('/suppliers/')) {
      const { useSupplierStore } = await import('@/stores/supplier_2')
      const store = useSupplierStore()
      await Promise.all([
        store.getRequests(),
        store.getOrders(),
        store.getReceipts(),
        store.refreshSuggestions()
      ])
      return
    }

    // Products
    if (path === '/products' || path.startsWith('/products/')) {
      const { useProductsStore } = await import('@/stores/productsStore')
      const store = useProductsStore()
      await store.loadProducts()
      return
    }

    // Recipes - call composable init methods directly (they reload from Supabase)
    if (path === '/recipes' || path.startsWith('/recipes/')) {
      const { useRecipes } = await import('@/stores/recipes/composables/useRecipes')
      const { usePreparations } = await import('@/stores/recipes/composables/usePreparations')

      const recipesComposable = useRecipes()
      const preparationsComposable = usePreparations()

      // Force reload from Supabase
      await Promise.all([
        recipesComposable.initializeRecipes(),
        preparationsComposable.initializePreparations()
      ])

      DebugUtils.info(MODULE_NAME, 'Recipes and preparations refreshed')
      return
    }

    // Counteragents
    if (path === '/counteragents' || path.startsWith('/counteragents/')) {
      const { useCounteragentsStore } = await import('@/stores/counteragents')
      const store = useCounteragentsStore()
      await store.initialize()
      return
    }

    // Accounts
    if (path.startsWith('/accounts')) {
      const { useAccountStore } = await import('@/stores/account')
      const store = useAccountStore()
      await Promise.all([store.fetchAccounts(true), store.refreshAllTransactions()])
      return
    }

    // Sales Transactions
    if (path === '/sales/transactions') {
      const { useSalesStore } = await import('@/stores/sales')
      const store = useSalesStore()
      await store.fetchTransactions()
      return
    }

    // Sales Shifts
    if (path === '/sales/shifts') {
      const { useShiftsStore } = await import('@/stores/pos/shifts')
      const store = useShiftsStore()
      await store.loadShifts()
      return
    }

    // Write-off History (uses storage store)
    if (path === '/inventory/write-offs') {
      const { useStorageStore } = await import('@/stores/storage')
      const store = useStorageStore()
      await store.fetchOperations()
      return
    }

    // Payment Settings
    if (path === '/payment-settings') {
      // Payment settings typically loads from store on mount
      // No specific refresh needed
      return
    }

    // Debug views - refresh debug store
    if (path.startsWith('/debug')) {
      const { useDebugStore } = await import('@/stores/debug')
      const store = useDebugStore()
      await store.refreshAllStores()
      return
    }

    DebugUtils.debug(MODULE_NAME, 'No refresh handler for route', { path })
  }

  return {
    refresh,
    loading,
    error,
    canRefresh
  }
}
