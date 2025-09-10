// src/router/guards/auth.guard.ts
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AuthGuard'

export const authGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  try {
    const authStore = useAuthStore()
    const userRoles = authStore.userRoles

    if (!to.meta.requiresAuth) {
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

    if (to.meta.roles && !userRoles.some(role => to.meta.roles?.includes(role))) {
      next({ name: 'login' })
      return
    }

    next()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Navigation guard error:', error)
    next({ name: 'login' })
  }
}
