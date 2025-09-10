// src/stores/auth/authStore.ts - ОБНОВЛЕННЫЙ существующий файл
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from './auth'
import { CoreUserService } from '@/core/users' // 🆕 НОВЫЙ ИМПОРТ
import { DebugUtils } from '@/utils'
import { AuthSessionService } from './services'

const MODULE_NAME = 'AuthStore'

export const useAuthStore = defineStore('auth', () => {
  const state = ref({
    currentUser: null as User | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
    lastLoginAt: null as string | null
  })

  // ===== ГЕТТЕРЫ =====
  const currentUser = computed(() => state.value.currentUser)
  const isAuthenticated = computed(() => state.value.isAuthenticated)
  const isLoading = computed(() => state.value.isLoading)
  const userName = computed(() => state.value.currentUser?.name || '')
  const userId = computed(() => state.value.currentUser?.id || '')
  const userRoles = computed<UserRole[]>(() => state.value.currentUser?.roles || [])

  // Проверки ролей
  const isAdmin = computed(() => userRoles.value.includes('admin'))
  const isManager = computed(() => userRoles.value.includes('manager'))
  const isCashier = computed(() => userRoles.value.includes('cashier'))

  // 🆕 НОВЫЕ ГЕТТЕРЫ с использованием CoreUserService
  const canEdit = computed(() => CoreUserService.canEdit(userRoles.value))
  const canViewFinances = computed(() => CoreUserService.canViewFinances(userRoles.value))

  // ===== АВТОРИЗАЦИЯ =====
  async function login(pin: string): Promise<boolean> {
    try {
      state.value.isLoading = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Login attempt', { pin: '***' })

      // Проверяем блокировку безопасности
      if (AuthSessionService.isSecurityLocked()) {
        throw new Error('Слишком много неудачных попыток. Попробуйте позже.')
      }

      const userData = CoreUserService.findByPin(pin)
      if (!userData) {
        // 🆕 Логируем неудачную попытку
        AuthSessionService.logLoginAttempt({
          timestamp: new Date().toISOString(),
          userId: 'unknown',
          pin: '***',
          success: false,
          appType: 'backoffice',
          ip: window.location.hostname
        })

        throw new Error('Неверный PIN код')
      }

      // Создаем пользователя с ID
      const user: User = {
        id: `user_${Date.now()}`,
        ...userData,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Сохраняем в состояние
      state.value.currentUser = user
      state.value.isAuthenticated = true
      state.value.lastLoginAt = user.lastLoginAt

      // 🆕 Сохраняем сессию в localStorage
      AuthSessionService.saveSession(user, 'backoffice')

      // 🆕 Логируем успешную попытку
      AuthSessionService.logLoginAttempt({
        timestamp: new Date().toISOString(),
        userId: user.id,
        pin: '***',
        success: true,
        appType: 'backoffice',
        ip: window.location.hostname
      })

      DebugUtils.info(MODULE_NAME, 'Login successful with session saved', {
        userId: user.id,
        roles: user.roles
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка авторизации'
      state.value.error = errorMessage

      DebugUtils.error(MODULE_NAME, 'Login failed', { error: errorMessage })
      return false
    } finally {
      state.value.isLoading = false
    }
  }

  async function logout() {
    try {
      DebugUtils.info(MODULE_NAME, 'Logging out', { userId: userId.value })

      // 🆕 Очищаем сессию
      AuthSessionService.clearSession()

      resetState()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout failed', { error })
      throw error
    }
  }

  /**
   * Проверка сессии (для совместимости с App.vue)
   */
  function checkSession(): boolean {
    try {
      // 🆕 Проверяем сохраненную сессию
      const session = AuthSessionService.getSession()

      if (session && session.user) {
        // Восстанавливаем состояние из сессии
        state.value.currentUser = session.user
        state.value.isAuthenticated = true
        state.value.lastLoginAt = session.user.lastLoginAt

        DebugUtils.info(MODULE_NAME, 'Session restored from localStorage', {
          userId: session.user.id,
          roles: session.user.roles
        })

        return true
      }

      DebugUtils.debug(MODULE_NAME, 'No valid session found')
      return false
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Session check failed', { error })
      return false
    }
  }

  // 5. ДОБАВИТЬ новый метод для получения статистики:
  function getSessionInfo() {
    return AuthSessionService.getSessionInfo()
  }

  /**
   * Инициализация пользователей по умолчанию (для совместимости с appInitializer)
   */
  async function initializeDefaultUsers(): Promise<void> {
    try {
      const availableUsers = CoreUserService.getActiveUsers()
      DebugUtils.info(MODULE_NAME, 'Default users initialized', {
        count: availableUsers.length,
        users: availableUsers.map(u => ({
          name: u.name,
          roles: u.roles
        }))
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize default users', { error })
      throw error
    }
  }

  // 🆕 НОВЫЙ МЕТОД: Получить маршрут по умолчанию
  function getDefaultRoute(): string {
    return CoreUserService.getDefaultRoute(userRoles.value)
  }

  function resetState() {
    state.value = {
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastLoginAt: null
    }
  }

  function clearError() {
    state.value.error = null
  }

  // ===== ИНИЦИАЛИЗАЦИЯ (упрощенная) =====
  function initialize() {
    // TODO: Восстановить сессию из localStorage если нужно
    DebugUtils.info(MODULE_NAME, 'AuthStore initialized')
  }

  // Инициализируем при создании store
  initialize()

  return {
    // State
    state,

    // Getters
    currentUser,
    isAuthenticated,
    isLoading,
    userName,
    userId,
    userRoles,
    isAdmin,
    isManager,
    isCashier,
    canEdit,
    canViewFinances,

    // Actions
    login,
    logout,
    getDefaultRoute,
    clearError,
    resetState,
    checkSession, // ✅ ДОБАВИТЬ
    initializeDefaultUsers,
    getSessionInfo
  }
})
