// src/router/guards/auth.guard.ts
import {
  type RouteLocationNormalized,
  type NavigationGuardNext as RouterNavigationGuard
} from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AuthGuard'

export const authGuard = async (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: RouterNavigationGuard
) => {
  try {
    const authStore = useAuthStore()

    if (!to.meta.requiresAuth) {
      if (to.name === 'login' && authStore.state.isAuthenticated) {
        next({ name: 'test-connection' })
        return
      }
      next()
      return
    }

    if (!authStore.state.isAuthenticated) {
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
