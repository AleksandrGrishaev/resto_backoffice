// src/core/hmrState.ts - Hot Module Replacement state management

/**
 * HMR State Manager
 * Tracks whether stores are already initialized to prevent unnecessary reloads during HMR
 */

const HMR_STATE_KEY = '__app_hmr_state__'
const HMR_TIMESTAMP_KEY = '__app_hmr_timestamp__'
const HMR_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface HMRState {
  storesInitialized: boolean
  userRoles: string[]
  timestamp: number
}

/**
 * Check if this is a hot reload (HMR) vs a fresh page load
 */
export function isHotReload(): boolean {
  // Check if Vite HMR is available (only in dev mode)
  if (!import.meta.hot) {
    return false
  }

  // Check if we have recent HMR state
  const state = getHMRState()
  if (!state) {
    return false
  }

  // Check if state is recent (within cache duration)
  const isRecent = Date.now() - state.timestamp < HMR_CACHE_DURATION
  return isRecent && state.storesInitialized
}

/**
 * Get HMR state from sessionStorage
 */
export function getHMRState(): HMRState | null {
  try {
    const stored = sessionStorage.getItem(HMR_STATE_KEY)
    if (!stored) {
      return null
    }

    const state: HMRState = JSON.parse(stored)

    // Validate state structure
    if (
      typeof state.storesInitialized !== 'boolean' ||
      !Array.isArray(state.userRoles) ||
      typeof state.timestamp !== 'number'
    ) {
      return null
    }

    return state
  } catch (error) {
    console.error('Failed to get HMR state:', error)
    return null
  }
}

/**
 * Save HMR state to sessionStorage
 */
export function saveHMRState(storesInitialized: boolean, userRoles: string[]): void {
  try {
    const state: HMRState = {
      storesInitialized,
      userRoles: userRoles || [],
      timestamp: Date.now()
    }

    sessionStorage.setItem(HMR_STATE_KEY, JSON.stringify(state))
    sessionStorage.setItem(HMR_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Failed to save HMR state:', error)
  }
}

/**
 * Clear HMR state
 */
export function clearHMRState(): void {
  try {
    sessionStorage.removeItem(HMR_STATE_KEY)
    sessionStorage.removeItem(HMR_TIMESTAMP_KEY)
  } catch (error) {
    console.error('Failed to clear HMR state:', error)
  }
}

/**
 * Check if stores should be reinitialized
 * Returns true if:
 * - Not a hot reload (fresh page load)
 * - User roles changed
 * - HMR state is stale
 */
export function shouldReinitializeStores(currentUserRoles: string[]): boolean {
  if (!isHotReload()) {
    return true // Fresh page load - always initialize
  }

  const state = getHMRState()
  if (!state) {
    return true // No state - initialize
  }

  // Check if user roles changed
  const rolesChanged =
    state.userRoles.length !== currentUserRoles.length ||
    !state.userRoles.every((role, i) => role === currentUserRoles[i])

  if (rolesChanged) {
    return true // Roles changed - reinitialize
  }

  // HMR detected and roles are same - skip initialization
  return false
}

// Setup HMR cleanup on page unload (not HMR)
if (typeof window !== 'undefined') {
  // Clear state on actual page unload (not HMR)
  window.addEventListener('beforeunload', () => {
    // Only clear if this is a real page navigation, not HMR
    if (!import.meta.hot) {
      clearHMRState()
    }
  })
}

// If HMR is available, preserve state across reloads
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // State is preserved in sessionStorage, no action needed
  })
}
