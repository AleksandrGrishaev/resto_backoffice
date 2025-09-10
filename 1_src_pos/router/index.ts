// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

// Layouts
import AuthLayout from '@/layouts/AuthLayout.vue'
import MonitorLayout from '@/layouts/MonitorLayout.vue'

// Views
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import PosView from '@/views/pos/PosView.vue'
import { debugRoutes } from './debug.routes'

//Guards
import { authGuard } from './guards/auth.guard'
import { posGuard } from './guards/pos.guard'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        const authStore = useAuthStore()

        // Если пользователь не авторизован, отправляем на логин
        if (!authStore.state.isAuthenticated) {
          return '/auth/login'
        }

        // Определяем маршрут на основе ролей пользователя
        return authStore.getDefaultRoute()
      }
    },
    {
      path: '/auth',
      component: AuthLayout,
      children: [
        {
          path: 'login',
          name: 'login',
          component: LoginView
        }
      ]
    },
    {
      path: '/pos',
      name: 'pos',
      component: PosView,
      meta: {
        requiresAuth: true,
        roles: ['cashier', 'admin', 'manager']
      }
    },
    {
      path: '/monitor',
      component: MonitorLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'kitchen',
          name: 'kitchen',
          component: () => import('@/views/monitor/KitchenView.vue'),
          meta: {
            roles: ['kitchen', 'bar', 'admin', 'manager']
          }
        },
        {
          path: 'bar',
          name: 'bar',
          component: () => import('@/views/monitor/BarView.vue'),
          meta: {
            roles: ['bar', 'admin', 'manager']
          }
        }
      ]
    },
    {
      path: '/customers',
      name: 'customers',
      component: () => import('@/views/customers/CustomersView.vue'),
      meta: {
        requiresAuth: true,
        roles: ['cashier', 'admin', 'manager']
      }
    },
    {
      path: '/customers/:id',
      name: 'customer-details',
      component: () => import('@/views/customers/CustomerDetailsView.vue'),
      meta: {
        requiresAuth: true,
        roles: ['cashier', 'admin', 'manager']
      }
    },
    {
      path: '/shift',
      name: 'shift',
      component: () => import('@/views/shift/ShiftView.vue'),
      meta: {
        requiresAuth: true,
        roles: ['cashier', 'admin', 'manager']
      }
    },

    ...debugRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
})

// Guards
router.beforeEach(async (to, from, next) => {
  // Сначала проверяем POS guard
  if (from.name === 'pos') {
    return posGuard(to, from, next)
  }

  // Затем проверяем авторизацию
  return authGuard(to, from, next)
})

export default router
