// src/stores/auth/composables/useAuth.ts
import { computed } from 'vue'
import { useAuthStore } from '../index'
import type { UseAuthReturn } from '../types'

/**
 * Composable for auth operations in components.
 * LoginView uses authStore directly; this is for other components.
 */
export function useAuth(): UseAuthReturn {
  const authStore = useAuthStore()

  const currentUser = computed(() => authStore.currentUser)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.isLoading)
  const userRoles = computed(() => authStore.userRoles)

  const isAdmin = computed(() => authStore.isAdmin)
  const isManager = computed(() => authStore.isManager)
  const isCashier = computed(() => authStore.isCashier)

  const canEdit = computed(() => authStore.canEdit)
  const canViewFinances = computed(() => authStore.canViewFinances)

  /**
   * Logout — delegates to authStore which does a full page reload
   */
  async function logout() {
    await authStore.logout()
  }

  return {
    currentUser,
    isAuthenticated,
    isLoading,
    userRoles,

    logout,

    canEdit,
    canViewFinances,
    isAdmin,
    isManager,
    isCashier
  }
}
