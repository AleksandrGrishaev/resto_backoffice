// src/stores/auth/authStore.ts - Refactored: single redirect, awaitable init, proper reset
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from './types'
import { CoreUserService } from '@/core/users'
import { DebugUtils, extractErrorDetails } from '@/utils'
import { supabase } from '@/supabase'
import { resetAllStores, clearAppLocalStorage } from '@/core/storeResetService'
import { clearHMRState } from '@/core/hmrState'
import { executeSupabaseSingle } from '@/utils/supabase'

const MODULE_NAME = 'AuthStore'

// Cross-tab synchronization constants
const LOGOUT_BROADCAST_KEY = 'kitchen_app_logout_broadcast'

export const useAuthStore = defineStore('auth', () => {
  const state = ref({
    currentUser: null as User | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
    lastLoginAt: null as string | null,
    session: null as any, // Supabase session for email auth
    // Target route set by LoginView — consumed by App.vue after store loading
    targetRoute: null as string | null
  })

  // Track last userId to detect real login vs token refresh
  let lastUserId: string | null = null

  // Deduplicate loadUserProfile — prevent multiple concurrent calls
  let loadProfilePromise: Promise<void> | null = null

  // Store the initialization promise so checkSession() can await it
  let initPromise: Promise<void> | null = null

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

  // ===== TARGET ROUTE (set by LoginView, consumed by App.vue) =====

  /**
   * Set the intended route after login.
   * Called by LoginView to indicate which context the user wants (pos, kitchen, admin, etc.)
   */
  function setTargetRoute(route: string) {
    state.value.targetRoute = route
    DebugUtils.info(MODULE_NAME, 'Target route set', { route })
  }

  /**
   * Consume and clear the target route. Returns the target route or null.
   * Called by App.vue after stores are loaded to determine redirect destination.
   */
  function consumeTargetRoute(): string | null {
    const route = state.value.targetRoute
    state.value.targetRoute = null
    return route
  }

  // ===== INITIALIZATION =====

  /**
   * Initialize auth store — awaitable, idempotent.
   * Returns existing promise if already in progress.
   */
  function initialize(): Promise<void> {
    if (!initPromise) {
      initPromise = doInitialize()
    }
    return initPromise
  }

  async function doInitialize() {
    DebugUtils.info(MODULE_NAME, 'Initializing auth...')

    // Check for existing Supabase session
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session) {
      state.value.session = session
      await loadUserProfile(session.user.id)
      lastUserId = session.user.id
    }

    // Listen to auth state changes
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      DebugUtils.debug(MODULE_NAME, 'Auth state changed', {
        event,
        hasSession: !!newSession,
        userId: newSession?.user?.id
      })

      state.value.session = newSession

      const currentUserId = newSession?.user?.id
      const isUserIdChanged = currentUserId && currentUserId !== lastUserId
      const isInitialSession = event === 'INITIAL_SESSION'
      const isUserUpdated = event === 'USER_UPDATED'

      const shouldReload =
        newSession?.user && !isInitialSession && (isUserIdChanged || isUserUpdated)

      if (shouldReload) {
        DebugUtils.info(MODULE_NAME, 'Reloading profile after auth event', {
          event,
          reason: isUserIdChanged ? 'userId changed' : 'USER_UPDATED event'
        })
        lastUserId = currentUserId!
        await loadUserProfile(currentUserId!)
      } else if (newSession?.user && !isUserIdChanged && event === 'SIGNED_IN') {
        // Same user, SIGNED_IN event = token refresh — skip
        DebugUtils.debug(MODULE_NAME, 'Token refresh, skipping profile reload')
        lastUserId = currentUserId!
      } else if (!newSession?.user && event === 'SIGNED_OUT') {
        lastUserId = null
        resetState()
      }
    })

    // Setup cross-tab synchronization
    setupCrossTabSync()

    DebugUtils.info(MODULE_NAME, 'AuthStore initialized')
  }

  /**
   * Setup cross-tab synchronization for logout events
   */
  function setupCrossTabSync() {
    window.addEventListener('storage', (event: StorageEvent) => {
      // Case 1: Supabase token removed (direct logout)
      if (event.key?.startsWith('sb-') && event.key.includes('auth-token') && !event.newValue) {
        DebugUtils.info(MODULE_NAME, 'Logout detected in another tab (Supabase token removed)')
        handleCrossTabLogout()
      }

      // Case 2: Explicit logout broadcast
      if (event.key === LOGOUT_BROADCAST_KEY && event.newValue) {
        DebugUtils.info(MODULE_NAME, 'Logout broadcast received from another tab')
        handleCrossTabLogout()
      }
    })

    DebugUtils.debug(MODULE_NAME, 'Cross-tab synchronization enabled')
  }

  /**
   * Handle logout detected in another tab
   */
  async function handleCrossTabLogout() {
    if (!state.value.isAuthenticated) return

    DebugUtils.info(MODULE_NAME, 'Session ended in another tab, logging out...')

    // Sign out from Supabase first to clear the local session token
    // This prevents checkSession() from finding a valid session on reload
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore errors — the other tab already signed out
    }

    await resetAllStores()
    clearHMRState()
    clearAppLocalStorage()
    resetState()

    window.location.href = '/auth/login'
  }

  // ===== LOAD USER PROFILE =====

  /**
   * Load user profile — deduplicated to prevent concurrent calls
   */
  async function loadUserProfile(userId: string) {
    if (loadProfilePromise) {
      DebugUtils.info(MODULE_NAME, 'loadUserProfile already in progress, reusing promise')
      return loadProfilePromise
    }

    loadProfilePromise = doLoadUserProfile(userId)
    try {
      await loadProfilePromise
    } finally {
      loadProfilePromise = null
    }
  }

  async function doLoadUserProfile(userId: string) {
    try {
      // Wait for auth session to be established (RLS requires auth.uid())
      let retries = 0
      const maxSessionRetries = 5
      while (retries < maxSessionRetries) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session?.user?.id === userId) break
        DebugUtils.info(
          MODULE_NAME,
          `Waiting for auth session... (${retries + 1}/${maxSessionRetries})`
        )
        await new Promise(resolve => setTimeout(resolve, 200))
        retries++
      }

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
  async function loginWithEmail(
    email: string,
    password: string,
    captchaToken?: string
  ): Promise<boolean> {
    state.value.isLoading = true
    state.value.error = null

    try {
      DebugUtils.info(MODULE_NAME, 'Email login attempt', { email })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined
      })

      if (error) throw error

      DebugUtils.info(MODULE_NAME, 'Email login successful', {
        userId: data.user.id
      })

      // Load profile immediately instead of waiting for onAuthStateChange
      await loadUserProfile(data.user.id)
      lastUserId = data.user.id

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

  // ===== AUTHENTICATION METHOD 2: PIN (Cashier/Kitchen/Bar) =====
  async function loginWithPin(
    pin: string,
    captchaToken?: string,
    allowedRoles?: UserRole[]
  ): Promise<boolean> {
    state.value.isLoading = true
    state.value.error = null

    try {
      DebugUtils.info(MODULE_NAME, 'PIN login attempt')

      // Security: Simple rate limiting (5 attempts per minute)
      const attemptKey = 'pin_login_attempts'
      const attempts = JSON.parse(localStorage.getItem(attemptKey) || '[]')
      const recentAttempts = attempts.filter((timestamp: number) => Date.now() - timestamp < 60000)

      if (recentAttempts.length >= 5) {
        throw new Error('Too many failed attempts. Please try later.')
      }

      // Step 1: Validate PIN and get credentials for Supabase Auth
      DebugUtils.info(MODULE_NAME, 'Calling get_pin_user_credentials RPC')

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
        hasError: !!error
      })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'RPC error', { error: error.message })
        throw error
      }
      if (!data || data.length === 0) {
        // Track failed attempt
        attempts.push(Date.now())
        localStorage.setItem(attemptKey, JSON.stringify(attempts))
        throw new Error('Invalid PIN')
      }

      const credentials = data[0]

      // Step 1.5: Validate roles BEFORE creating session (avoids login/logout flash)
      if (allowedRoles && allowedRoles.length > 0) {
        const userRoles: string[] = credentials.user_roles || []
        const hasPermission = userRoles.some(r => allowedRoles.includes(r as UserRole))
        if (!hasPermission) {
          throw new Error(
            'This PIN does not have access to this section. Please use the correct login tab.'
          )
        }
      }

      // Step 2: Use credentials to sign in via Supabase Auth
      DebugUtils.info(MODULE_NAME, 'Calling signInWithPassword', { email: credentials.user_email })
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.user_email,
        password: credentials.user_password,
        options: captchaToken ? { captchaToken } : undefined
      })

      if (authError) {
        DebugUtils.error(MODULE_NAME, 'signInWithPassword error', { error: authError.message })
        throw authError
      }
      if (!authData.user) throw new Error('Failed to create session')

      DebugUtils.info(MODULE_NAME, 'PIN login successful - Supabase session created', {
        userId: authData.user.id,
        roles: credentials.user_roles
      })

      // Clear failed attempts on successful login
      localStorage.removeItem(attemptKey)

      // Load profile immediately
      await loadUserProfile(authData.user.id)
      lastUserId = authData.user.id

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

  // ===== LOGOUT =====
  async function logout() {
    try {
      DebugUtils.info(MODULE_NAME, 'Logging out', { userId: userId.value })

      // Step 1: Broadcast logout to other tabs FIRST
      localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString())

      // Step 2: Sign out from Supabase (clears token from localStorage)
      if (state.value.session) {
        await supabase.auth.signOut()
      }

      // Step 3: Reset all application stores
      await resetAllStores()

      // Step 4: Clear HMR state
      clearHMRState()

      // Step 5: Clear all app-specific localStorage
      clearAppLocalStorage()

      // Step 6: Reset auth state
      resetState()

      // Step 7: Clean up broadcast key
      localStorage.removeItem(LOGOUT_BROADCAST_KEY)

      DebugUtils.info(MODULE_NAME, 'Logout complete')

      // Step 8: Full page reload to clear all in-memory state
      window.location.href = '/auth/login'
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout failed', { error })

      // Even if logout fails, try to clean up local state
      try {
        await resetAllStores()
        clearHMRState()
        clearAppLocalStorage()
        resetState()
        window.location.href = '/auth/login'
      } catch (cleanupError) {
        DebugUtils.error(MODULE_NAME, 'Cleanup after failed logout also failed', { cleanupError })
      }

      throw error
    }
  }

  // ===== SESSION CHECK =====

  /**
   * Check if a valid session exists.
   * Awaits initialization first to prevent race conditions.
   * If Supabase session exists but profile not loaded — loads it.
   */
  async function checkSession(): Promise<boolean> {
    // Ensure initialization is complete before checking
    await initialize()

    // If already authenticated with profile loaded, we're good
    if (state.value.isAuthenticated && state.value.currentUser !== null) {
      DebugUtils.info(MODULE_NAME, 'Session check', { hasSession: true, source: 'state' })
      return true
    }

    // Fallback: check Supabase directly and load profile if found
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (session) {
        DebugUtils.info(MODULE_NAME, 'Session found in Supabase, loading profile...')
        await loadUserProfile(session.user.id)
        lastUserId = session.user.id
        return state.value.isAuthenticated
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Session check failed', { error })
    }

    DebugUtils.info(MODULE_NAME, 'Session check', { hasSession: false })
    return false
  }

  // ===== OTHER METHODS =====

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
      session: null,
      targetRoute: null
    }
    // Reset init promise so next access re-initializes
    initPromise = null
    lastUserId = null
  }

  function clearError() {
    state.value.error = null
  }

  // Auto-initialize on store creation (fire-and-forget for backwards compat,
  // but checkSession() will await it before proceeding)
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
    loginWithEmail,
    loginWithPin,
    logout,
    getDefaultRoute,
    setTargetRoute,
    consumeTargetRoute,
    clearError,
    resetState,
    checkSession,
    initialize
  }
})
