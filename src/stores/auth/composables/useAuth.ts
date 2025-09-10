// src/stores/auth/composables/useAuth.ts
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../index'
import type { UseAuthReturn } from '../types'

/**
 * Основной composable для работы с авторизацией
 */
export function useAuth(): UseAuthReturn {
  const authStore = useAuthStore()
  const router = useRouter()

  // ===== ГЕТТЕРЫ =====

  const currentUser = computed(() => authStore.currentUser)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.isLoading)
  const userRoles = computed(() => authStore.userRoles)

  // Роли
  const isAdmin = computed(() => authStore.isAdmin)
  const isManager = computed(() => authStore.isManager)
  const isCashier = computed(() => authStore.isCashier)

  // Права
  const canEdit = computed(() => authStore.canEdit())
  const canViewFinances = computed(() => authStore.canViewFinances())

  // ===== МЕТОДЫ =====

  /**
   * Авторизация с автоматической переадресацией
   */
  async function login(pin: string) {
    const result = await authStore.login(pin)

    if (result.success && result.redirectTo) {
      await router.push(result.redirectTo)
    }

    return result
  }

  /**
   * Выход с переходом на страницу авторизации
   */
  async function logout() {
    await authStore.logout()
    await router.push('/auth/login')
  }

  return {
    // State
    currentUser,
    isAuthenticated,
    isLoading,
    userRoles,

    // Actions
    login,
    logout,

    // Permissions
    canEdit,
    canViewFinances,
    isAdmin,
    isManager,
    isCashier
  }
}
