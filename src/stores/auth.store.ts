// src/stores/auth.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/auth'
import { authService } from '@/services'
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

  // Actions
  async function initializeDefaultUsers() {
    try {
      await authService.initializeDefaultUsers()
      DebugUtils.info(MODULE_NAME, 'Default users initialized')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize default users', { error })
    }
  }

  async function login(pin: string): Promise<boolean> {
    try {
      state.value.isLoading = true
      state.value.error = null

      const user = await authService.login(pin) // appType по умолчанию 'backoffice'

      state.value.currentUser = user
      state.value.isAuthenticated = true
      state.value.lastLoginAt = user.lastLoginAt || new Date().toISOString()

      saveSession()
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      state.value.error = message
      throw error
    } finally {
      state.value.isLoading = false
    }
  }
  async function logout() {
    try {
      DebugUtils.info(MODULE_NAME, 'Logging out')
      clearSession()
      resetState()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout failed', { error })
      throw error
    }
  }

  // Helper functions
  function saveSession() {
    const session = {
      user: state.value.currentUser,
      lastLoginAt: state.value.lastLoginAt,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }
    localStorage.setItem('auth_session', JSON.stringify(session))
  }

  function checkSession(): boolean {
    try {
      const savedSession = localStorage.getItem('auth_session')
      if (!savedSession) return false

      const session = JSON.parse(savedSession)
      const sessionExpiry = new Date(session.expiresAt).getTime()

      if (Date.now() < sessionExpiry && session.user) {
        state.value.currentUser = session.user
        state.value.isAuthenticated = true
        state.value.lastLoginAt = session.lastLoginAt
        return true
      }

      clearSession()
      return false
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Session check failed', { error })
      clearSession()
      return false
    }
  }

  function clearSession() {
    localStorage.removeItem('auth_session')
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

  return {
    state,
    login,
    logout,
    checkSession,
    initializeDefaultUsers
  }
})
