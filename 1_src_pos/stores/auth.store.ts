// src/stores/auth.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import { sessionService } from '@/services/session.service'
import { UserUtils } from '@/config/users'
import { DebugUtils } from '@/utils'
import type { User } from '@/types/auth'

const MODULE_NAME = 'AuthStore'

export const useAuthStore = defineStore('auth', () => {
  // Состояние
  const state = ref({
    currentUser: null as User | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
    sessionTimeLeft: 0
  })

  // Computed properties
  const userRoles = computed(() => state.value.currentUser?.roles ?? [])

  const userName = computed(() => state.value.currentUser?.name ?? '')

  const canAccessPOS = computed(() => UserUtils.hasAppAccess(userRoles.value, 'cashier'))

  const canAccessKitchen = computed(() => UserUtils.hasAppAccess(userRoles.value, 'kitchen'))

  const canAccessBar = computed(() => UserUtils.hasAppAccess(userRoles.value, 'bar'))

  /**
   * Инициализация store - восстановление сессии
   */
  function initialize() {
    try {
      const session = sessionService.getSession()

      if (session) {
        state.value.currentUser = session.user
        state.value.isAuthenticated = true
        updateSessionTimer()

        DebugUtils.info(MODULE_NAME, 'Session restored', {
          userId: session.user?.id,
          userName: session.user?.name,
          roles: session.user?.roles
        })
      } else {
        DebugUtils.info(MODULE_NAME, 'No valid session found')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Initialization failed', { error })
      logout()
    }
  }

  /**
   * Вход в систему
   */
  async function login(pin: string): Promise<boolean> {
    try {
      state.value.isLoading = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Login attempt')

      const user = await authService.login(pin)

      // Определение типа приложения на основе ролей
      let appType = 'kitchen'
      if (user.roles.includes('cashier')) {
        appType = 'cashier'
      } else if (user.roles.includes('bar')) {
        appType = 'bar'
      }

      // Сохранение сессии
      sessionService.saveSession(user, appType as any)

      // Обновление состояния
      state.value.currentUser = user
      state.value.isAuthenticated = true

      // Запуск таймера сессии
      updateSessionTimer()

      DebugUtils.info(MODULE_NAME, 'Login successful', {
        userId: user.id,
        userName: user.name,
        roles: user.roles,
        appType
      })

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка входа в систему'
      state.value.error = message

      DebugUtils.error(MODULE_NAME, 'Login failed', { error })
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * Выход из системы
   */
  function logout() {
    try {
      // Очистка сессии
      sessionService.clearSession()

      // Очистка состояния
      state.value = {
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionTimeLeft: 0
      }

      DebugUtils.info(MODULE_NAME, 'User logged out')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout error', { error })
    }
  }

  /**
   * Проверка разрешения
   */
  function hasPermission(permission: string): boolean {
    return UserUtils.hasPermission(userRoles.value, permission)
  }

  /**
   * Проверка доступа к приложению
   */
  function hasAppAccess(appType: 'kitchen' | 'bar' | 'cashier'): boolean {
    return UserUtils.hasAppAccess(userRoles.value, appType)
  }

  /**
   * Получение маршрута по умолчанию для пользователя
   */
  function getDefaultRoute(): string {
    return UserUtils.getDefaultRoute(userRoles.value)
  }

  /**
   * Обновление таймера сессии
   */
  function updateSessionTimer() {
    const timeLeft = sessionService.getTimeUntilExpiry()
    state.value.sessionTimeLeft = Math.floor(timeLeft / 1000) // в секундах

    // Автоматический выход при истечении сессии
    if (timeLeft <= 0 && state.value.isAuthenticated) {
      DebugUtils.warn(MODULE_NAME, 'Session expired, logging out')
      logout()
    }
  }

  /**
   * Обновление активности пользователя
   */
  function updateActivity() {
    if (state.value.isAuthenticated) {
      sessionService.updateLastActivity()
      updateSessionTimer()
    }
  }

  /**
   * Получение списка доступных пользователей (для отладки)
   */
  function getAvailableUsers() {
    return authService.getAvailableUsers()
  }

  // Периодическое обновление таймера сессии
  let sessionTimer: NodeJS.Timeout | null = null

  function startSessionTimer() {
    if (sessionTimer) {
      clearInterval(sessionTimer)
    }

    sessionTimer = setInterval(() => {
      updateSessionTimer()
    }, 60000) // каждую минуту
  }

  function stopSessionTimer() {
    if (sessionTimer) {
      clearInterval(sessionTimer)
      sessionTimer = null
    }
  }

  // Инициализация при создании store
  initialize()

  if (state.value.isAuthenticated) {
    startSessionTimer()
  }

  return {
    // State
    state,

    // Computed
    userRoles,
    userName,
    canAccessPOS,
    canAccessKitchen,
    canAccessBar,

    // Actions
    login,
    logout,
    hasPermission,
    hasAppAccess,
    getDefaultRoute,
    updateActivity,
    getAvailableUsers,

    // Session management
    startSessionTimer,
    stopSessionTimer
  }
})
