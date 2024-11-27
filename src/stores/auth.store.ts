import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/auth'
import { authService } from '@/services'
import { sessionService } from '@/services/session.service'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AuthStore'

export const useAuthStore = defineStore('auth', () => {
  const state = ref({
    currentUser: null as User | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
    lastLoginAt: null as string | null
  })

  // Геттеры для работы с правами и данными пользователя
  const isAdmin = computed(() => state.value.currentUser?.roles?.includes('admin') ?? false)
  const userId = computed(() => state.value.currentUser?.id ?? '')
  const userName = computed(() => state.value.currentUser?.name ?? '')
  const userRoles = computed(() => state.value.currentUser?.roles ?? [])

  // При инициализации проверяем сессию
  function initialize() {
    const session = sessionService.getSession()
    if (session) {
      state.value.currentUser = session.user
      state.value.isAuthenticated = true
      state.value.lastLoginAt = session.lastLoginAt
    }
  }

  async function initializeDefaultUsers() {
    try {
      await authService.initializeDefaultUsers()
      DebugUtils.info(MODULE_NAME, 'Default users initialized')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize default users', { error })
    }
  }

  async function login(pin: string, appType: string = 'backoffice'): Promise<boolean> {
    try {
      state.value.isLoading = true
      state.value.error = null
      const user = await authService.login(pin, appType)

      sessionService.saveSession(user, appType)

      await sessionService.logLoginAttempt({
        userId: user.id,
        success: true,
        appType,
        timestamp: new Date().toISOString(),
        ip: window.location.hostname
      })

      state.value.currentUser = user
      state.value.isAuthenticated = true
      state.value.lastLoginAt = user.lastLoginAt || new Date().toISOString()
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      state.value.error = message

      if (error instanceof Error && error.message === 'Invalid PIN') {
        await sessionService.logLoginAttempt({
          userId: 'unknown',
          success: false,
          appType,
          timestamp: new Date().toISOString(),
          ip: window.location.hostname
        })
      }
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  async function logout() {
    try {
      DebugUtils.info(MODULE_NAME, 'Logging out')
      sessionService.clearSession()
      resetState()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout failed', { error })
      throw error
    }
  }

  function checkSession(): boolean {
    return sessionService.isSessionValid()
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

  // Инициализируем store при создании
  initialize()

  return {
    state,
    login,
    logout,
    checkSession,
    initializeDefaultUsers,
    // Экспортируем геттеры
    isAdmin,
    userId,
    userName,
    userRoles
  }
})
