// src/router/guards/auth.guard.ts - ОБНОВЛЕННЫЙ
import {
  type RouteLocationNormalized,
  type NavigationGuardNext as RouterNavigationGuard
} from 'vue-router'
import { useAuthStore } from '@/stores/auth' // ОБНОВЛЕННЫЙ ИМПОРТ
import { usePermissions } from '@/stores/auth/composables'
import { CoreUserService } from '@/core/users'
import { DebugUtils } from '@/utils'
import type { UserRole } from '@/stores/auth/types'

const MODULE_NAME = 'AuthGuard'

type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: RouterNavigationGuard
) => Promise<void> | void

/**
 * Основной guard для проверки авторизации
 */
export const createComposedGuard = (...guards: NavigationGuard[]) => {
  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: RouterNavigationGuard
  ) => {
    try {
      for (const guard of guards) {
        await new Promise<void>((resolve, reject) => {
          const result = guard(to, from, (result: any) => {
            if (result === true || result === undefined) {
              resolve()
            } else {
              reject(result)
            }
          })

          // Если guard возвращает Promise, ждем его выполнения
          if (result instanceof Promise) {
            result.then(() => resolve()).catch(reject)
          }
        })
      }
      next()
    } catch (result) {
      if (typeof result === 'string') {
        next(result)
      } else {
        next(result)
      }
    }
  }
}

/**
 * Guard для проверки ролевых ограничений
 */
export const roleGuard = (allowedRoles: UserRole[]) => {
  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: RouterNavigationGuard
  ) => {
    try {
      const { hasAnyRole } = usePermissions()
      const authStore = useAuthStore()

      DebugUtils.debug(MODULE_NAME, 'Role check', {
        userRoles: authStore.userRoles,
        allowedRoles,
        hasAccess: hasAnyRole(allowedRoles)
      })

      if (hasAnyRole(allowedRoles)) {
        next()
      } else {
        DebugUtils.warn(MODULE_NAME, 'Access denied - insufficient role', {
          userRoles: authStore.userRoles,
          requiredRoles: allowedRoles,
          path: to.path
        })
        next('/unauthorized')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Role guard error', { error })
      next('/unauthorized')
    }
  }
}

/**
 * Guard для проверки прав на редактирование
 */
export const editGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: RouterNavigationGuard
) => {
  try {
    const { canEdit } = usePermissions()

    if (canEdit.value) {
      next()
    } else {
      DebugUtils.warn(MODULE_NAME, 'Edit access denied', {
        path: to.path,
        userRoles: useAuthStore().userRoles
      })
      next('/unauthorized')
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Edit guard error', { error })
    next('/unauthorized')
  }
}

/**
 * Guard для финансовых разделов (только админ)
 */
export const financeGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: RouterNavigationGuard
) => {
  try {
    const { canViewFinances } = usePermissions()

    if (canViewFinances.value) {
      next()
    } else {
      DebugUtils.warn(MODULE_NAME, 'Finance access denied', {
        path: to.path,
        userRoles: useAuthStore().userRoles
      })
      next('/unauthorized')
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Finance guard error', { error })
    next('/unauthorized')
  }
}
