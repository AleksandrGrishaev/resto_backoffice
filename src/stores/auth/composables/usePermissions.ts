// src/stores/auth/composables/usePermissions.ts
import { computed } from 'vue'
import { useAuthStore } from '../index'
import { CoreUserService } from '@/core/users'
import type { UserRole, UsePermissionsReturn } from '../types'

/**
 * Composable для работы с правами доступа
 */
export function usePermissions(): UsePermissionsReturn {
  const authStore = useAuthStore()

  // ===== БАЗОВЫЕ ПРАВА =====

  const canEdit = computed(() => CoreUserService.canEdit(authStore.userRoles))

  const canViewFinances = computed(() => CoreUserService.canViewFinances(authStore.userRoles))

  const canManageUsers = computed(() => authStore.userRoles.includes('admin'))

  // ===== ПРОВЕРКА РОЛЕЙ =====

  /**
   * Проверяет, есть ли у пользователя указанная роль
   */
  function hasRole(role: UserRole): boolean {
    return authStore.userRoles.includes(role)
  }

  /**
   * Проверяет, есть ли у пользователя любая из указанных ролей
   */
  function hasAnyRole(roles: UserRole[]): boolean {
    return authStore.userRoles.some(userRole => roles.includes(userRole))
  }

  /**
   * Проверяет доступ к маршруту (упрощенная версия)
   */
  function canAccessRoute(route: string): boolean {
    const userRoles = authStore.userRoles

    // Финансовые маршруты только для админа
    const financeRoutes = ['/accounts', '/finance']
    if (financeRoutes.some(fr => route.startsWith(fr))) {
      return userRoles.includes('admin')
    }

    // POS маршруты для кассиров и админа
    if (route.startsWith('/pos')) {
      return hasAnyRole(['admin', 'cashier'])
    }

    // BackOffice маршруты для админа и менеджера
    const backofficeRoutes = ['/menu', '/products', '/suppliers', '/storage', '/recipes']
    if (backofficeRoutes.some(br => route.startsWith(br))) {
      return hasAnyRole(['admin', 'manager'])
    }

    // По умолчанию разрешаем доступ
    return true
  }

  return {
    canEdit,
    canViewFinances,
    canManageUsers,
    hasRole,
    hasAnyRole,
    canAccessRoute
  }
}
