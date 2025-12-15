// src/router/index.ts - ОБНОВЛЕННЫЙ с POS и правильной авторизацией
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// ===== LAYOUTS =====
import AuthLayout from '@/layouts/AuthLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'

// ===== AUTH VIEWS =====
import LoginView from '@/views/auth/LoginView.vue'
import UnauthorizedView from '@/views/auth/UnauthorizedView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

// ===== BACKOFFICE VIEWS =====
import MenuView from '@/views/menu/MenuView.vue'
import ProductsView from '@/views/products/ProductsView.vue'
import RecipesView from '@/views/recipes/RecipesView.vue'
import StorageView from '@/views/storage/StorageView.vue'
import PreparationView from '@/views/Preparation/PreparationView.vue'
import SupplierView from '@/views/supplier_2/SupplierView.vue'
import CounteragentsView from '@/views/counteragents/CounteragentsView.vue'
import AccountListView from '@/views/accounts/AccountListView.vue'
import AccountDetailView from '@/views/accounts/AccountDetailView.vue'
import PaymentSettingsView from '@/views/catalog/PaymentSettingsView.vue'

// ===== POS VIEWS =====
import PosMainView from '@/views/pos/PosMainView.vue'

// ===== DEBUG VIEWS (DEV ONLY) =====
import DebugView from '@/views/debug/DebugView.vue'
import HMRTestView from '@/views/debug/HMRTestView.vue'

// ===== AUTH SYSTEM =====
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/stores/auth/composables'
import type { UserRole } from '@/stores/auth/types'

// ===== HELP ROUTES =====
import { helpRoutes } from '@/help/router'

// ===== ROUTES CONFIGURATION =====

const routes: RouteRecordRaw[] = [
  // ===== HELP ROUTES (PUBLIC) =====
  ...helpRoutes,

  // ===== AUTHENTICATION ROUTES =====
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: LoginView,
        meta: {
          requiresAuth: false,
          title: 'Login'
        }
      }
    ]
  },

  // ===== POS ROUTES =====
  {
    path: '/pos',
    name: 'pos',
    component: PosMainView,
    meta: {
      requiresAuth: true,
      allowedRoles: ['admin', 'cashier'],
      title: 'POS System'
    }
  },
  {
    path: '/pos/shift-management',
    name: 'pos-shift-management',
    component: () => import('@/views/pos/shifts/ShiftManagementView.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['admin', 'cashier'],
      title: 'Shift Management'
    }
  },
  {
    path: '/pos/receipts',
    name: 'pos-receipts',
    component: () => import('@/views/pos/receipts/PosReceiptsView.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['admin', 'cashier'],
      title: 'Goods Receipt'
    }
  },

  // ===== KITCHEN ROUTES =====
  {
    path: '/kitchen',
    name: 'kitchen',
    component: () => import('@/views/kitchen/KitchenMainView.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['admin', 'kitchen', 'bar'],
      title: 'Kitchen Display'
    }
  },

  // ===== BACKOFFICE ROUTES =====
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/menu'
      },
      // === Основное меню ===
      {
        path: 'menu',
        name: 'menu',
        component: MenuView,
        meta: {
          title: 'Menu Management',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Продукты ===
      {
        path: 'products',
        name: 'products',
        component: ProductsView,
        meta: {
          title: 'Products',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Рецепты ===
      {
        path: 'recipes',
        name: 'recipes',
        component: RecipesView,
        meta: {
          title: 'Recipes',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Полуфабрикаты ===
      {
        path: 'preparations',
        name: 'preparations',
        component: PreparationView,
        meta: {
          title: 'Preparations',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Склад ===
      {
        path: 'storage',
        name: 'storage',
        component: StorageView,
        meta: {
          title: 'Storage',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Поставщики ===
      {
        path: 'suppliers',
        name: 'suppliers',
        component: SupplierView,
        meta: {
          title: 'Suppliers',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Контрагенты ===
      {
        path: 'counteragents',
        name: 'counteragents',
        component: CounteragentsView,
        meta: {
          title: 'Counteragents',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Счета (только для админа) ===
      {
        path: 'accounts',
        meta: {
          allowedRoles: ['admin']
        },
        children: [
          {
            path: '',
            name: 'accounts-list',
            component: AccountListView,
            meta: {
              title: 'Accounts'
            }
          },
          {
            path: ':id',
            name: 'account-detail',
            component: AccountDetailView,
            meta: {
              title: 'Account Details'
            }
          },
          // === Sprint 4: Payments Management ===
          {
            path: 'payments',
            name: 'accounts-payments',
            component: () => import('@/views/backoffice/accounts/payments/PaymentsView.vue'),
            meta: {
              title: 'Payments Management',
              allowedRoles: ['admin', 'manager']
            }
          }
        ]
      },
      // === Настройки платежей (только для админа) ===
      {
        path: 'payment-settings',
        name: 'payment-settings',
        component: PaymentSettingsView,
        meta: {
          title: 'Payment Settings',
          allowedRoles: ['admin']
        }
      },
      // === KPI Settings ===
      {
        path: 'kpi-settings',
        name: 'kpi-settings',
        component: () => import('@/views/backoffice/settings/KpiSettingsView.vue'),
        meta: {
          title: 'KPI Settings',
          allowedRoles: ['admin']
        }
      },
      // === Sales Analytics (Sprint 2) ===
      {
        path: 'sales',
        meta: {
          allowedRoles: ['admin', 'manager']
        },
        children: [
          {
            path: 'analytics',
            name: 'sales-analytics',
            component: () => import('@/views/backoffice/sales/SalesAnalyticsView.vue'),
            meta: {
              title: 'Sales Analytics'
            }
          },
          {
            path: 'transactions',
            name: 'sales-transactions',
            component: () => import('@/views/backoffice/sales/SalesTransactionsView.vue'),
            meta: {
              title: 'Sales Transactions'
            }
          },
          // ✅ Sprint 5: Shift History
          {
            path: 'shifts',
            name: 'sales-shifts',
            component: () => import('@/views/backoffice/sales/ShiftHistoryView.vue'),
            meta: {
              title: 'Shift History'
            }
          }
        ]
      },
      // === Analytics (Sprint 5) ===
      {
        path: 'analytics',
        meta: {
          allowedRoles: ['admin', 'manager']
        },
        children: [
          {
            path: 'pl-report',
            name: 'pl-report',
            component: () => import('@/views/backoffice/analytics/PLReportView.vue'),
            meta: {
              title: 'P&L Report'
            }
          },
          {
            path: 'food-cost',
            name: 'food-cost-dashboard',
            component: () => import('@/views/backoffice/analytics/FoodCostDashboardView.vue'),
            meta: {
              title: 'Food Cost Dashboard'
            }
          },
          {
            path: 'negative-inventory',
            name: 'negative-inventory-report',
            component: () => import('@/views/backoffice/analytics/NegativeInventoryReport.vue'),
            meta: {
              title: 'Negative Inventory Report'
            }
          },
          {
            path: 'revenue-dashboard',
            name: 'revenue-dashboard',
            component: () => import('@/views/backoffice/analytics/RevenueDashboardView.vue'),
            meta: {
              title: 'Revenue Dashboard'
            }
          },
          {
            path: 'discount-analytics',
            name: 'discount-analytics',
            component: () => import('@/views/backoffice/analytics/DiscountAnalyticsView.vue'),
            meta: {
              title: 'Discount Analytics'
            }
          },
          {
            path: 'cancelled-items',
            name: 'cancelled-items-report',
            component: () => import('@/views/backoffice/analytics/CancelledItemsReport.vue'),
            meta: {
              title: 'Cancelled Items Report'
            }
          }
        ]
      },
      // === Inventory Write-offs (Sprint 2) ===
      {
        path: 'inventory',
        meta: {
          allowedRoles: ['admin', 'manager']
        },
        children: [
          {
            path: 'write-offs',
            name: 'write-off-history',
            component: () => import('@/views/backoffice/inventory/WriteOffHistoryView.vue'),
            meta: {
              title: 'Write-off History'
            }
          },
          {
            path: 'valuation',
            name: 'inventory-valuation',
            component: () => import('@/views/backoffice/inventory/InventoryValuationView.vue'),
            meta: {
              title: 'Inventory Valuation'
            }
          }
        ]
      },
      // === Reports - Print Documents ===
      {
        path: 'reports',
        meta: {
          allowedRoles: ['admin', 'manager']
        },
        children: [
          {
            path: 'print-docs',
            name: 'print-docs',
            component: () => import('@/views/backoffice/reports/PrintDocsView.vue'),
            meta: {
              title: 'Print Documents'
            }
          }
        ]
      },
      // === Salary Section (Kitchen Time KPI) ===
      {
        path: 'salary',
        meta: {
          allowedRoles: ['admin', 'manager']
        },
        children: [
          {
            path: '',
            name: 'salary-index',
            component: () => import('@/views/backoffice/salary/SalaryIndexView.vue'),
            meta: {
              title: 'Salary & KPI'
            }
          },
          {
            path: 'time-kpi',
            name: 'salary-time-kpi',
            component: () => import('@/views/backoffice/salary/kpi/KitchenTimeKpiView.vue'),
            meta: {
              title: 'Time KPI'
            }
          },
          {
            path: 'food-cost-kpi',
            name: 'salary-food-cost-kpi',
            component: () => import('@/views/backoffice/salary/kpi/FoodCostKpiView.vue'),
            meta: {
              title: 'Food Cost KPI'
            }
          }
        ]
      },
      // === Debug маршруты (только для разработки) ===
      ...(import.meta.env.DEV
        ? [
            {
              path: 'debug',
              children: [
                {
                  path: 'stores',
                  name: 'debug-stores',
                  component: DebugView,
                  meta: {
                    title: 'Debug Stores',
                    requiresDev: true,
                    allowedRoles: ['admin'] as UserRole[]
                  }
                },
                {
                  path: 'sync',
                  name: 'debug-sync',
                  component: () => import('@/views/debug/SyncMonitorView.vue'),
                  meta: {
                    title: 'Sync Monitor',
                    requiresDev: true,
                    allowedRoles: ['admin'] as UserRole[]
                  }
                },
                {
                  path: 'supabase',
                  name: 'debug-supabase',
                  component: () => import('@/views/debug/SupabaseTestView.vue'),
                  meta: {
                    title: 'Supabase Test',
                    requiresDev: true,
                    allowedRoles: ['admin'] as UserRole[]
                  }
                },
                {
                  path: 'hmr',
                  name: 'debug-hmr',
                  component: HMRTestView,
                  meta: {
                    title: 'HMR Test',
                    requiresDev: true,
                    allowedRoles: ['admin'] as UserRole[]
                  }
                }
              ]
            }
          ]
        : [])
    ]
  },

  // ===== ERROR ROUTES =====
  {
    path: '/unauthorized',
    name: 'unauthorized',
    component: UnauthorizedView,
    meta: {
      requiresAuth: true,
      title: 'Access Denied'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: 'Page Not Found'
    }
  }
]

// ===== ROUTER CREATION =====

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// ===== NAVIGATION GUARDS =====

/**
 * ✅ FIX: Cleanup Realtime subscriptions when leaving POS or Kitchen views
 * This prevents subscription leaks during navigation
 */
router.beforeEach(async (to, from, next) => {
  try {
    const authStore = useAuthStore()

    // ✅ FIX: Cleanup stores when navigating away from POS or Kitchen
    if (from.path.startsWith('/pos') && !to.path.startsWith('/pos')) {
      // Leaving POS view, cleanup POS store
      const { usePosStore } = await import('@/stores/pos')
      const posStore = usePosStore()
      if (posStore.isInitialized) {
        console.log('🧹 [Router] Cleaning up POS store on navigation away from POS')
        posStore.cleanup()
      }
    }

    if (from.path.startsWith('/kitchen') && !to.path.startsWith('/kitchen')) {
      // Leaving Kitchen view, cleanup Kitchen store
      const { useKitchenStore } = await import('@/stores/kitchen')
      const kitchenStore = useKitchenStore()
      if (kitchenStore.initialized) {
        console.log('🧹 [Router] Cleaning up Kitchen store on navigation away from Kitchen')
        kitchenStore.cleanup()
      }
    }

    // Проверка dev режима для debug роутов
    if (to.meta.requiresDev && !import.meta.env.DEV) {
      next({ name: 'menu' })
      return
    }

    // Если маршрут публичный (help pages)
    if (to.meta.public) {
      next()
      return
    }

    // Если маршрут не требует авторизации
    if (!to.meta.requiresAuth) {
      // Если пользователь авторизован и идет на login - переадресуем на главную
      if (to.name === 'login' && authStore.isAuthenticated) {
        const defaultRoute = authStore.getDefaultRoute()
        next(defaultRoute)
        return
      }
      next()
      return
    }

    // Проверка авторизации
    if (!authStore.isAuthenticated) {
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // Проверка ролевых ограничений
    if (to.meta.allowedRoles) {
      const { hasAnyRole } = usePermissions()
      if (!hasAnyRole(to.meta.allowedRoles)) {
        next('/unauthorized')
        return
      }
    }

    next()
  } catch (error) {
    console.error('[Router Guard] Navigation guard error:', error)
    next('/auth/login')
  }
})

// ===== MODULE AUGMENTATION =====

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    allowedRoles?: UserRole[]
    title?: string
    requiresDev?: boolean
    public?: boolean
    section?: string
  }
}

export default router
