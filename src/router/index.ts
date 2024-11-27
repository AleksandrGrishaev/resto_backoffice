import { createRouter, createWebHistory } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import MenuView from '@/views/MenuView.vue'
import PaymentSettingsView from '@/views/PaymentSettingsView.vue'
import { useAuthStore } from '@/stores/auth.store'

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
          component: MenuView
        },
        {
          path: 'payment-settings',
          name: 'payment-settings',
          component: PaymentSettingsView,
          meta: {
            title: 'Методы оплаты и налоги'
          }
        },
        {
          path: 'accounts',
          children: [
            {
              path: 'dashboard',
              name: 'accounts-dashboard',
              component: () => import('@/views/accounts/DashboardView.vue'),
              meta: {
                title: 'Дашборд счетов'
              }
            },
            {
              path: '',
              name: 'accounts-list',
              component: () => import('@/views/accounts/AccountListView.vue'),
              meta: {
                title: 'Список счетов'
              }
            },
            {
              path: ':id',
              name: 'account-detail',
              component: () => import('@/views/accounts/AccountDetailView.vue'),
              meta: {
                title: 'Детали счета'
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
    next({ name: 'menu' }) // Меняем редирект на menu
  } else {
    next()
  }
})

export default router
