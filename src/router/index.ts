// src/router/index.ts - ОБНОВЛЕННЫЙ с POS и правильной авторизацией
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// ===== LAYOUTS =====
import AuthLayout from '@/layouts/AuthLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import PosLayout from '@/layouts/PosLayout.vue'

// ===== AUTH VIEWS =====
import LoginView from '@/views/auth/LoginView.vue'
import UnauthorizedView from '@/views/auth/UnauthorizedView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

// ===== BACKOFFICE VIEWS =====
import MenuView from '@/views/menu/MenuView.vue'
import ProductsView from '@/views/products/ProductsView.vue'
import StorageView from '@/views/storage/StorageView.vue'
import PreparationView from '@/views/preparation/PreparationView.vue'
import SupplierView from '@/views/supplier_2/SupplierView.vue'
import CounteragentsView from '@/views/counteragents/CounteragentsView.vue'
import AccountListView from '@/views/accounts/AccountListView.vue'
import AccountDetailView from '@/views/accounts/AccountDetailView.vue'
import PaymentSettingsView from '@/views/PaymentSettingsView.vue'

// ===== POS VIEWS =====
import PosMainView from '@/views/pos/PosMainView.vue'

// ===== DEBUG VIEWS (DEV ONLY) =====
import DebugView from '@/views/debug/DebugView.vue'

// ===== AUTH SYSTEM =====
import { useAuthStore } from '@/stores/auth'
import { useAuth, usePermissions } from '@/stores/auth/composables'
import { CoreUserService } from '@/core/users'

// ===== ROUTES CONFIGURATION =====

const routes: RouteRecordRaw[] = [
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
          title: 'Вход в систему'
        }
      }
    ]
  },

  // ===== POS ROUTES =====
  {
    path: '/pos',
    name: 'pos',
    component: () => import('@/views/pos/PosMainView.vue'), // ✅ Прямо на компонент
    meta: {
      requiresAuth: true,
      allowedRoles: ['admin', 'cashier'],
      title: 'POS система'
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
          title: 'Управление меню',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Продукты ===
      {
        path: 'products',
        name: 'products',
        component: ProductsView,
        meta: {
          title: 'Продукты',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Рецепты ===
      {
        path: 'recipes',
        name: 'recipes',
        component: () => import('@/views/recipes/RecipesView.vue'),
        meta: {
          title: 'Рецепты',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Полуфабрикаты ===
      {
        path: 'preparations',
        name: 'preparations',
        component: PreparationView,
        meta: {
          title: 'Полуфабрикаты',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Склад ===
      {
        path: 'storage',
        name: 'storage',
        component: StorageView,
        meta: {
          title: 'Склад',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Поставщики ===
      {
        path: 'suppliers',
        name: 'suppliers',
        component: SupplierView,
        meta: {
          title: 'Поставщики',
          allowedRoles: ['admin', 'manager']
        }
      },
      // === Контрагенты ===
      {
        path: 'counteragents',
        name: 'counteragents',
        component: CounteragentsView,
        meta: {
          title: 'Контрагенты',
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
              title: 'Счета'
            }
          },
          {
            path: ':id',
            name: 'account-detail',
            component: AccountDetailView,
            meta: {
              title: 'Детали счета'
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
          title: 'Настройки платежей',
          allowedRoles: ['admin']
        }
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
                    allowedRoles: ['admin']
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
      title: 'Доступ запрещен'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: 'Страница не найдена'
    }
  }
]

// ===== ROUTER CREATION =====

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// ===== NAVIGATION GUARDS =====

router.beforeEach(async (to, from, next) => {
  try {
    const authStore = useAuthStore()

    // Проверка dev режима для debug роутов
    if (to.meta.requiresDev && !import.meta.env.DEV) {
      console.warn('Debug routes are only available in development mode')
      next({ name: 'menu' })
      return
    }

    // Если маршрут не требует авторизации
    if (!to.meta.requiresAuth) {
      // Если пользователь авторизован и идет на login - переадресуем на главную
      if (to.name === 'login' && authStore.isAuthenticated) {
        const defaultRoute = authStore.getDefaultRoute() // 🔄 ИСПОЛЬЗУЕМ МЕТОД STORE
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
    console.error('Navigation guard error:', error)
    next('/auth/login')
  }
})

export default router
