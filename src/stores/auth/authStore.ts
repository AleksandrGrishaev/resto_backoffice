// src/stores/auth/authStore.ts - Updated for Phase 4: Triple Authentication
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from './auth'
import { CoreUserService } from '@/core/users'
import { DebugUtils } from '@/utils'
import { AuthSessionService } from './services'
import { supabase } from '@/supabase'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'AuthStore'

export const useAuthStore = defineStore('auth', () => {
  const state = ref({
    currentUser: null as User | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
    lastLoginAt: null as string | null,
    session: null as any // Supabase session for email auth
  })

  // ===== GETTERS =====
  const currentUser = computed(() => state.value.currentUser)
  const isAuthenticated = computed(() => state.value.isAuthenticated)
  const isLoading = computed(() => state.value.isLoading)
  const userName = computed(() => state.value.currentUser?.name || '')
  const userId = computed(() => state.value.currentUser?.id || '')
  const userRoles = computed<UserRole[]>(() => state.value.currentUser?.roles || [])

  // Role checks
  const isAdmin = computed(() => userRoles.value.includes('admin'))
  const isManager = computed(() => userRoles.value.includes('manager'))
  const isCashier = computed(() => userRoles.value.includes('cashier'))
  const isKitchen = computed(() => userRoles.value.includes('kitchen'))
  const isBar = computed(() => userRoles.value.includes('bar'))

  const canEdit = computed(() => CoreUserService.canEdit(userRoles.value))
  const canViewFinances = computed(() => CoreUserService.canViewFinances(userRoles.value))

  // ===== INITIALIZATION =====
  async function initialize() {
    DebugUtils.info(MODULE_NAME, 'Initializing auth...')

    // Check for existing Supabase session
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session) {
      state.value.session = session
      await loadUserProfile(session.user.id)
    } else {
      // Try to restore PIN session from localStorage
      restorePinSession()
    }

    // Listen to auth state changes
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      DebugUtils.info(MODULE_NAME, 'Auth state changed', { event })
      state.value.session = newSession

      if (newSession?.user) {
        await loadUserProfile(newSession.user.id)
      } else {
        resetState()
      }
    })

    DebugUtils.info(MODULE_NAME, 'AuthStore initialized')
  }

  // Load user profile from Supabase users table
  async function loadUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      state.value.currentUser = {
        id: data.id,
        name: data.name,
        email: data.email || undefined,
        roles: data.roles || [],
        lastLoginAt: data.last_login_at || new Date().toISOString(),
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
        avatarUrl: data.avatar_url || undefined
      }
      state.value.isAuthenticated = true
      state.value.lastLoginAt = data.last_login_at

      DebugUtils.info(MODULE_NAME, 'Profile loaded', {
        name: data.name,
        roles: data.roles
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load profile', { error })
      throw error
    }
  }

  // ===== AUTHENTICATION METHOD 1: Email + Password (Admin/Manager) =====
  async function loginWithEmail(email: string, password: string): Promise<boolean> {
    state.value.isLoading = true
    state.value.error = null

    try {
      DebugUtils.info(MODULE_NAME, 'Email login attempt', { email })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      DebugUtils.info(MODULE_NAME, 'Email login successful', {
        userId: data.user.id
      })

      // Profile will be loaded by onAuthStateChange callback
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      state.value.error = errorMessage
      DebugUtils.error(MODULE_NAME, 'Email login failed', { error: errorMessage })
      return false
    } finally {
      state.value.isLoading = false
    }
  }

  // ===== AUTHENTICATION METHOD 2 & 3: PIN (Cashier/Kitchen/Bar) =====
  async function loginWithPin(pin: string): Promise<boolean> {
    state.value.isLoading = true
    state.value.error = null

    try {
      DebugUtils.info(MODULE_NAME, 'PIN login attempt')

      // Security: Check if locked
      if (AuthSessionService.isSecurityLocked()) {
        throw new Error('Too many failed attempts. Please try later.')
      }

      // Call Supabase function to authenticate with PIN
      const { data, error } = await supabase.rpc('authenticate_with_pin', {
        pin_input: pin
      })

      if (error) throw error
      if (!data || data.length === 0) {
        // Log failed attempt
        AuthSessionService.logLoginAttempt({
          timestamp: new Date().toISOString(),
          userId: 'unknown',
          pin: '***',
          success: false,
          appType: 'backoffice',
          ip: window.location.hostname
        })

        throw new Error('Invalid PIN')
      }

      const userData = data[0]

      // Create user object
      const user: User = {
        id: userData.user_id,
        name: userData.user_name,
        email: userData.user_email || undefined,
        roles: userData.user_roles || [],
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        avatarUrl: userData.user_avatar || undefined
      }

      // Save to state
      state.value.currentUser = user
      state.value.isAuthenticated = true
      state.value.lastLoginAt = user.lastLoginAt

      // Save PIN session to localStorage (for persistence)
      localStorage.setItem('pin_session', JSON.stringify(user))
      AuthSessionService.saveSession(user, 'backoffice')

      // Log successful attempt
      AuthSessionService.logLoginAttempt({
        timestamp: new Date().toISOString(),
        userId: user.id,
        pin: '***',
        success: true,
        appType: 'backoffice',
        ip: window.location.hostname
      })

      DebugUtils.info(MODULE_NAME, 'PIN login successful', {
        userId: user.id,
        roles: user.roles
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      state.value.error = errorMessage
      DebugUtils.error(MODULE_NAME, 'PIN login failed', { error: errorMessage })
      return false
    } finally {
      state.value.isLoading = false
    }
  }

  // ===== LEGACY: PIN login (fallback to CoreUserService) =====
  async function login(pin: string): Promise<boolean> {
    // Use Supabase PIN login if enabled
    if (ENV.useSupabase) {
      return loginWithPin(pin)
    }

    // Fallback to CoreUserService (legacy)
    try {
      state.value.isLoading = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Login attempt (legacy)', { pin: '***' })

      if (AuthSessionService.isSecurityLocked()) {
        throw new Error('Too many failed attempts. Try again later.')
      }

      const userData = CoreUserService.findByPin(pin)
      if (!userData) {
        AuthSessionService.logLoginAttempt({
          timestamp: new Date().toISOString(),
          userId: 'unknown',
          pin: '***',
          success: false,
          appType: 'backoffice',
          ip: window.location.hostname
        })

        throw new Error('Invalid PIN')
      }

      const user: User = {
        id: `user_${Date.now()}`,
        ...userData,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      state.value.currentUser = user
      state.value.isAuthenticated = true
      state.value.lastLoginAt = user.lastLoginAt

      AuthSessionService.saveSession(user, 'backoffice')
      AuthSessionService.logLoginAttempt({
        timestamp: new Date().toISOString(),
        userId: user.id,
        pin: '***',
        success: true,
        appType: 'backoffice',
        ip: window.location.hostname
      })

      DebugUtils.info(MODULE_NAME, 'Login successful (legacy)', {
        userId: user.id,
        roles: user.roles
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      state.value.error = errorMessage
      DebugUtils.error(MODULE_NAME, 'Login failed (legacy)', { error: errorMessage })
      return false
    } finally {
      state.value.isLoading = false
    }
  }

  // ===== LOGOUT =====
  async function logout() {
    try {
      DebugUtils.info(MODULE_NAME, 'Logging out', { userId: userId.value })

      // Clear Supabase session (if exists)
      if (state.value.session) {
        await supabase.auth.signOut()
      }

      // Clear PIN session
      localStorage.removeItem('pin_session')
      AuthSessionService.clearSession()

      resetState()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout failed', { error })
      throw error
    }
  }

  // ===== RESTORE PIN SESSION =====
  function restorePinSession(): boolean {
    const pinSession = localStorage.getItem('pin_session')
    if (pinSession) {
      try {
        const user = JSON.parse(pinSession)
        state.value.currentUser = user
        state.value.isAuthenticated = true
        state.value.lastLoginAt = user.lastLoginAt

        DebugUtils.info(MODULE_NAME, 'PIN session restored', { userId: user.id })
        return true
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to restore PIN session', { error })
        localStorage.removeItem('pin_session')
      }
    }
    return false
  }

  // ===== SESSION CHECK =====
  function checkSession(): boolean {
    try {
      // Check Supabase session
      if (state.value.session) {
        return true
      }

      // Check PIN session
      const session = AuthSessionService.getSession()
      if (session && session.user) {
        state.value.currentUser = session.user
        state.value.isAuthenticated = true
        state.value.lastLoginAt = session.user.lastLoginAt

        DebugUtils.info(MODULE_NAME, 'Session restored', {
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

  // ===== OTHER METHODS =====
  function getSessionInfo() {
    return AuthSessionService.getSessionInfo()
  }

  async function initializeDefaultUsers(): Promise<void> {
    try {
      const availableUsers = CoreUserService.getActiveUsers()
      DebugUtils.info(MODULE_NAME, 'Default users initialized', {
        count: availableUsers.length,
        users: availableUsers.map((u) => ({
          name: u.name,
          roles: u.roles
        }))
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize default users', { error })
      throw error
    }
  }

  function getDefaultRoute(): string {
    return CoreUserService.getDefaultRoute(userRoles.value)
  }

  function resetState() {
    state.value = {
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastLoginAt: null,
      session: null
    }
  }

  function clearError() {
    state.value.error = null
  }

  // Initialize on store creation
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
    isKitchen,
    isBar,
    canEdit,
    canViewFinances,

    // Actions
    login, // Legacy PIN login
    loginWithEmail, // Email + Password (admin/manager)
    loginWithPin, // PIN login (cashier/kitchen/bar)
    logout,
    getDefaultRoute,
    clearError,
    resetState,
    checkSession,
    restorePinSession,
    initializeDefaultUsers,
    getSessionInfo,
    initialize
  }
})
