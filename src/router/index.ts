// src/router/index.ts
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type NavigationGuardNext as RouterNavigationGuard,
  type RouteLocationNormalized
} from 'vue-router'
import { authGuard } from './guards/auth.guard'
import { DebugUtils } from '@/utils'

// Layouts
import AuthLayout from '@/layouts/AuthLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyLayout from '@/layouts/EmptyLayout.vue'

const MODULE_NAME = 'Router'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: '',
        redirect: { name: 'login' }
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: {
          requiresAuth: false,
          title: 'Login'
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
        path: 'test-connection',
        name: 'test-connection',
        component: () => import('@/views/TestConnectionView.vue'),
        meta: {
          title: 'Test Firebase Connection'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    component: EmptyLayout,
    children: [
      {
        path: '',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
        meta: {
          title: 'Page Not Found'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Debug logging middleware (development only)
if (import.meta.env.DEV) {
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: RouterNavigationGuard
    ) => {
      DebugUtils.debug(MODULE_NAME, 'Route Change:', {
        to: to.fullPath,
        from: from.fullPath,
        component: to.matched[0]?.components?.default?.name
      })
      next()
    }
  )
}

// Authentication guard
router.beforeEach(authGuard)

// Title handling
router.afterEach((to: RouteLocationNormalized) => {
  const title = to.meta.title ? `${to.meta.title} - BackOffice` : 'BackOffice'
  document.title = title
})

export default router
