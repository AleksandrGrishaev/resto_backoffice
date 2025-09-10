// src/stores/auth/composables/useAuth.ts - ИСПРАВЛЕНО
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
  const canEdit = computed(() => authStore.canEdit)
  const canViewFinances = computed(() => authStore.canViewFinances)

  // ===== МЕТОДЫ =====

  /**
   * 🔧 ИСПРАВЛЕНО: Авторизация с правильным форматом ответа
   */
  async function login(pin: string) {
    try {
      // Вызываем authStore.login() и конвертируем ответ
      const success = await authStore.login(pin)

      if (success) {
        // Получаем данные после успешного логина
        const user = authStore.currentUser
        const redirectTo = authStore.getDefaultRoute()

        // Выполняем переадресацию
        await router.push(redirectTo)

        return {
          success: true,
          user,
          redirectTo
        }
      } else {
        // Возвращаем ошибку
        return {
          success: false,
          error: authStore.state.error || 'Ошибка авторизации'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }
    }
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
