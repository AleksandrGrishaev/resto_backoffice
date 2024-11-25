// src/router/guards/auth.guard.ts
import { useAuthStore } from '@/stores/auth.store'
import { DebugUtils } from '@/utils'
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

const MODULE_NAME = 'AuthGuard'

export const authGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  try {
    const authStore = useAuthStore()

    // Public routes (login)
    if (!to.meta.requiresAuth) {
      if (to.name === 'login' && authStore.state.isAuthenticated) {
        next({ name: 'test-connection' })
        return
      }
      next()
      return
    }

    // Check authentication for protected routes
    if (!authStore.state.isAuthenticated) {
      DebugUtils.info(MODULE_NAME, 'Auth required, redirecting to login')
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }

    next()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Navigation guard error:', error)
    next({ name: 'login' })
  }
}
