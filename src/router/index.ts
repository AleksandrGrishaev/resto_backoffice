// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import MenuView from '@/views/menu/MenuView.vue'
import PaymentSettingsView from '@/views/PaymentSettingsView.vue'
import { useAuthStore } from '@/stores/auth.store'
// Явный импорт компонентов счетов
import AccountListView from '@/views/accounts/AccountListView.vue'
import AccountDetailView from '@/views/accounts/AccountDetailView.vue'
// Импорт компонентов продуктов
import ProductsView from '@/views/products/ProductsView.vue'
// Импорт компонентов склада
import StorageView from '@/views/storage/StorageView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      component: AuthLayout,
      children: [
        {
          path: 'login',
          name: 'login',
          component: LoginView,
          meta: {
            requiresAuth: false
          }
        }
      ]
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/menu'
        },
        {
          path: 'menu',
          name: 'menu',
          component: MenuView,
          meta: {
            title: 'Menu Management'
          }
        },
        {
          path: 'products',
          name: 'products',
          component: ProductsView,
          meta: {
            title: 'Products'
          }
        },
        {
          path: 'recipes',
          name: 'recipes',
          component: () => import('@/views/recipes/RecipesView.vue'),
          meta: {
            title: 'Recipes'
          }
        },
        {
          path: 'storage',
          name: 'storage',
          component: StorageView,
          meta: {
            title: 'Storage Management'
          }
        },
        {
          path: 'payment-settings',
          name: 'payment-settings',
          component: PaymentSettingsView,
          meta: {
            title: 'Payment Methods & Taxes'
          }
        },
        {
          path: 'accounts',
          children: [
            {
              path: '',
              name: 'accounts-list',
              component: AccountListView,
              meta: {
                title: 'Accounts List'
              }
            },
            {
              path: ':id',
              name: 'account-detail',
              component: AccountDetailView,
              meta: {
                title: 'Account Details'
              }
            }
          ]
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.state.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && authStore.state.isAuthenticated) {
    next({ name: 'menu' })
  } else {
    next()
  }
})

export default router
