// src/stores/auth/authStore.ts - Updated for Phase 4: Triple Authentication
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from './auth'
import { CoreUserService } from '@/core/users'
import { DebugUtils, extractErrorDetails } from '@/utils'
import { supabase } from '@/supabase'
import { ENV } from '@/config/environment'
import { useRouter } from 'vue-router'
import { resetAllStores } from '@/core/storeResetService'
import { clearHMRState } from '@/core/hmrState'
import { executeSupabaseSingle } from '@/utils/supabase'

const MODULE_NAME = 'AuthStore'

// Cross-tab synchronization constants
const LOGOUT_BROADCAST_KEY = 'kitchen_app_logout_broadcast'
const SESSION_CHECK_INTERVAL = 5000 // 5 seconds

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

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
    }
    // Note: No longer trying to restore PIN sessions - using only Supabase sessions

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

    // ✅ NEW: Setup cross-tab synchronization
    setupCrossTabSync()

    DebugUtils.info(MODULE_NAME, 'AuthStore initialized')
  }

  /**
   * Setup cross-tab synchronization for logout events
   * Listens for storage changes in other tabs and reacts to logout
   */
  function setupCrossTabSync() {
    // Listen for storage events (fired only in OTHER tabs, not the one that made the change)
    window.addEventListener('storage', (event: StorageEvent) => {
      // Case 1: Supabase token removed (direct logout)
      if (event.key?.startsWith('sb-') && event.key.includes('auth-token') && !event.newValue) {
        DebugUtils.info(MODULE_NAME, '🔄 Logout detected in another tab (Supabase token removed)')
        handleCrossTabLogout()
      }

      // Case 2: Explicit logout broadcast
      if (event.key === LOGOUT_BROADCAST_KEY && event.newValue) {
        DebugUtils.info(MODULE_NAME, '🔄 Logout broadcast received from another tab')
        handleCrossTabLogout()
      }
    })

    DebugUtils.info(MODULE_NAME, '✅ Cross-tab synchronization enabled')
  }

  /**
   * Handle logout detected in another tab
   */
  async function handleCrossTabLogout() {
    if (!state.value.isAuthenticated) {
      // Already logged out, ignore
      return
    }

    DebugUtils.info(MODULE_NAME, '⚠️ Session ended in another tab, logging out...')

    // Reset local state immediately (no API calls needed)
    await resetAllStores()
    clearHMRState()
    resetState()

    // Redirect to login
    router.push('/auth/login')

    // Show notification (optional)
    // toast.info('Session ended in another tab')
  }

  // Load user profile from Supabase users table
  async function loadUserProfile(userId: string) {
    try {
      const data = await executeSupabaseSingle(
        supabase.from('users').select('*').eq('id', userId),
        `${MODULE_NAME}.loadUserProfile`
      )

      if (!data) {
        throw new Error('User profile not found')
      }

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
      DebugUtils.error(MODULE_NAME, 'Failed to load profile', extractErrorDetails(error))
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

      // Security: Simple rate limiting (5 attempts per minute)
      const attemptKey = 'pin_login_attempts'
      const attempts = JSON.parse(localStorage.getItem(attemptKey) || '[]')
      const recentAttempts = attempts.filter(
        (timestamp: number) => Date.now() - timestamp < 60000 // Last minute
      )

      if (recentAttempts.length >= 5) {
        throw new Error('Too many failed attempts. Please try later.')
      }

      // Step 1: Validate PIN and get credentials for Supabase Auth
      DebugUtils.info(MODULE_NAME, 'Calling get_pin_user_credentials RPC')

      // Add timeout wrapper to catch hanging RPC calls
      const rpcPromise = supabase.rpc('get_pin_user_credentials', {
        pin_input: pin
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('RPC call timed out after 15 seconds')), 15000)
      })

      const { data, error } = (await Promise.race([rpcPromise, timeoutPromise])) as any

      DebugUtils.info(MODULE_NAME, 'RPC response received', {
        hasData: !!data,
        dataLength: data?.length,
        hasError: !!error,
        errorMessage: error?.message
      })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'RPC error', { error: error.message })
        throw error
      }
      if (!data || data.length === 0) {
        // Track failed attempt
        attempts.push(Date.now())
        localStorage.setItem(attemptKey, JSON.stringify(attempts))

        DebugUtils.info(MODULE_NAME, 'PIN validation failed', { pinLength: pin.length })
        throw new Error('Invalid PIN')
      }

      const credentials = data[0]

      // Step 2: Use credentials to sign in via Supabase Auth
      // This creates a real Supabase session with auth.uid() set
      DebugUtils.info(MODULE_NAME, 'Calling signInWithPassword', { email: credentials.user_email })
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.user_email,
        password: credentials.user_password
      })

      DebugUtils.info(MODULE_NAME, 'signInWithPassword response', {
        hasAuthData: !!authData,
        hasUser: !!authData?.user,
        hasError: !!authError,
        errorMessage: authError?.message
      })

      if (authError) {
        DebugUtils.error(MODULE_NAME, 'signInWithPassword error', { error: authError.message })
        throw authError
      }
      if (!authData.user) throw new Error('Failed to create session')

      DebugUtils.info(MODULE_NAME, 'PIN login successful - Supabase session created', {
        userId: authData.user.id,
        email: credentials.user_email,
        roles: credentials.user_roles,
        hasAuthSession: !!authData.session
      })

      // Clear failed attempts on successful login
      localStorage.removeItem(attemptKey)

      // Note: User data will be loaded via onAuthStateChange listener
      // No need to manually set state here
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

      const userData = CoreUserService.findByPin(pin)
      if (!userData) {
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
  /**
   * Logout user and broadcast to all tabs
   *
   * Steps:
   * 1. Broadcast logout to other tabs
   * 2. Sign out from Supabase
   * 3. Reset all application stores
   * 4. Reset auth state
   * 5. Redirect to login
   */
  async function logout() {
    try {
      DebugUtils.info(MODULE_NAME, 'Logging out', { userId: userId.value })

      // Step 1: Broadcast logout to other tabs FIRST
      // This ensures other tabs know about logout before Supabase token is cleared
      localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString())

      // Step 2: Sign out from Supabase (clears token from localStorage)
      if (state.value.session) {
        await supabase.auth.signOut()
      }

      // Step 3: Reset all application stores
      await resetAllStores()

      // Step 4: Clear HMR state (prevent stale store data on next login)
      clearHMRState()

      // Step 5: Clear legacy session storage
      localStorage.removeItem('pin_session')

      // Step 6: Reset auth state
      resetState()

      // Step 7: Clean up broadcast key
      localStorage.removeItem(LOGOUT_BROADCAST_KEY)

      // Step 7: Redirect to login
      await router.push('/auth/login')

      DebugUtils.info(MODULE_NAME, '✅ Logout complete')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout failed', { error })

      // Even if logout fails, try to clean up local state
      try {
        await resetAllStores()
        clearHMRState()
        resetState()
        await router.push('/auth/login')
      } catch (cleanupError) {
        DebugUtils.error(MODULE_NAME, 'Cleanup after failed logout also failed', { cleanupError })
      }

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
  async function checkSession(): Promise<boolean> {
    try {
      // First check if already authenticated
      if (state.value.isAuthenticated && state.value.currentUser !== null) {
        DebugUtils.info(MODULE_NAME, 'Session check', { hasSession: true, source: 'state' })
        return true
      }

      // If not authenticated in state, check Supabase directly
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (session) {
        DebugUtils.info(MODULE_NAME, 'Session check', { hasSession: true, source: 'supabase' })
        return true
      }

      DebugUtils.info(MODULE_NAME, 'Session check', { hasSession: false, source: 'none' })
      return false
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Session check failed', { error })
      return false
    }
  }

  // ===== OTHER METHODS =====

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
    initializeDefaultUsers,
    initialize
  }
})
