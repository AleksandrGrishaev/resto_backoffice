// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards/auth.guard'
import { DebugUtils } from '@/utils'
import AuthLayout from '../layouts/AuthLayout.vue'
import MainLayout from '../layouts/MainLayout.vue'
import EmptyLayout from '../layouts/EmptyLayout.vue'

const MODULE_NAME = 'Router'

const routes = [
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
        component: () => import('../views/LoginView.vue'),
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
        component: () => import('../views/TestConnectionView.vue'),
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
        component: () => import('../views/NotFoundView.vue'),
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

// Apply debug logging in development
if (import.meta.env.DEV) {
  router.beforeEach((to, from, next) => {
    DebugUtils.debug(MODULE_NAME, 'Route Change:', {
      to: to.fullPath,
      component: to.matched[0]?.components?.default?.name
    })
    next()
  })
}

// Apply authentication guard
router.beforeEach(authGuard)

// Handle titles
router.afterEach(to => {
  document.title = `${to.meta.title} - BackOffice`
})

export default router
