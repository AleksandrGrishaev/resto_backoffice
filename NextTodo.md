# Next Sprint - Authentication & Session Management Refactoring

**Created:** 2025-11-25
**Priority:** Critical
**Status:** 📋 Planning Phase | ⚠️ Blocking Production Issues

---

## 🎯 Sprint Goal

> **Refactor authentication and session management to fix critical bugs with logout, session persistence, and cross-tab synchronization**
>
> **Key principles:**
>
> - ✅ Single source of truth for sessions (Supabase only)
> - ✅ Proper cross-tab synchronization
> - ✅ Complete state cleanup on logout
> - ✅ No race conditions in initialization
> - ✅ Support both Email and PIN authentication

---

## 🔍 Problem Statement

### Current Issues

1. **Ghost Data on Page Reload**

   - User sees previous data briefly before redirect to login
   - Race condition: stores load before session validation completes
   - File: `src/App.vue` lines 90-122

2. **Cross-Tab Logout Not Working**

   - Logout in one tab doesn't affect other tabs
   - No `StorageEvent` listener for localStorage changes
   - File: `src/stores/auth/authStore.ts` lines 310-328

3. **Incomplete Logout State Cleanup**

   - Only authStore is reset, other stores remain populated
   - Supabase query cache not cleared
   - No automatic redirect after logout

4. **Triple Session Storage Causes Conflicts**

   - Supabase session (browser localStorage)
   - PIN session (`localStorage['pin_session']`)
   - Session service (`localStorage['kitchen_app_session']`)
   - File: `src/stores/auth/services/session.service.ts`

5. **No Token Refresh Monitoring**
   - Session expires but user not notified
   - No automatic token refresh before expiry

---

## 📊 Current Architecture Analysis

### Session Storage (Before Refactoring)

```
┌─────────────────────────────────────────────────┐
│              Current Session Storage             │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Supabase Session (localStorage)             │
│     Key: sb-*-auth-token                        │
│     Managed by: @supabase/supabase-js           │
│                                                  │
│  2. PIN Session (localStorage)                  │
│     Key: pin_session                            │
│     Managed by: authStore                       │
│                                                  │
│  3. Session Service (localStorage)              │
│     Key: kitchen_app_session                    │
│     Managed by: AuthSessionService              │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Problems:**

- Multiple sources of truth
- No clear hierarchy
- Can get out of sync
- Complex restoration logic

### Target Architecture (After Refactoring)

```
┌─────────────────────────────────────────────────┐
│              New Session Storage                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✅ Supabase Session (localStorage)             │
│     Key: sb-*-auth-token                        │
│     Managed by: @supabase/supabase-js           │
│     Single source of truth                      │
│                                                  │
│  ✅ Cross-Tab Sync (localStorage event)         │
│     Key: kitchen_app_logout_broadcast           │
│     Managed by: authStore                       │
│     Coordinates logout across tabs              │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Benefits:**

- Single source of truth (Supabase)
- Simple restoration logic
- Cross-tab synchronization
- Both Email and PIN use same session mechanism

---

## 📋 PHASE 1: Critical Fixes

### Task 1.1: Implement Cross-Tab Logout Synchronization

**Priority:** Critical
**Estimated Time:** 1 hour

**File:** `src/stores/auth/authStore.ts`

**Current Problem:**

- Logout in Tab A doesn't affect Tab B
- No event listener for storage changes
- Each tab has independent session state

**Solution:**
Add `StorageEvent` listener to detect logout in other tabs.

**Implementation:**

1. **Add cross-tab constants** (after imports, line ~15):

```typescript
// Cross-tab synchronization constants
const LOGOUT_BROADCAST_KEY = 'kitchen_app_logout_broadcast'
const SESSION_CHECK_INTERVAL = 5000 // 5 seconds
```

2. **Add setupCrossTabSync() method** (after initialize(), line ~75):

```typescript
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
  resetState()

  // Redirect to login
  router.push('/auth/login')

  // Show notification (optional)
  // toast.info('Session ended in another tab')
}
```

3. **Update logout() method** (replace existing, line ~310):

```typescript
/**
 * Logout user and broadcast to all tabs
 */
async function logout() {
  try {
    DebugUtils.info(MODULE_NAME, 'Logging out...')

    // Step 1: Broadcast logout to other tabs FIRST
    // This ensures other tabs know about logout before Supabase token is cleared
    localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString())

    // Step 2: Sign out from Supabase (clears token)
    if (state.value.session) {
      await supabase.auth.signOut()
    }

    // Step 3: Clean up all local state
    await resetAllStores()

    // Step 4: Reset auth state
    resetState()

    // Step 5: Clean up broadcast key (no longer needed)
    localStorage.removeItem(LOGOUT_BROADCAST_KEY)

    // Step 6: Redirect to login
    router.push('/auth/login')

    DebugUtils.info(MODULE_NAME, '✅ Logout complete')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout failed', { error })
    throw error
  }
}
```

4. **Call setupCrossTabSync() in initialize()** (update line ~65):

```typescript
async function initialize() {
  if (state.value.initialized) {
    DebugUtils.info(MODULE_NAME, 'Already initialized')
    return
  }

  try {
    DebugUtils.info(MODULE_NAME, 'Initializing auth store...')

    // Check for existing Supabase session
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session) {
      state.value.session = session
      await loadUserProfile(session.user.id)
    }

    // Setup auth state listener
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      DebugUtils.info(MODULE_NAME, `Auth state changed: ${event}`)

      state.value.session = newSession

      if (event === 'SIGNED_OUT') {
        await resetAllStores()
        resetState()
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          await loadUserProfile(newSession.user.id)
        }
      }
    })

    // ✅ NEW: Setup cross-tab synchronization
    setupCrossTabSync()

    state.value.initialized = true
    DebugUtils.info(MODULE_NAME, '✅ Auth store initialized')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Initialization failed', { error })
    throw error
  }
}
```

---

### Task 1.2: Create Centralized Store Reset Service

**Priority:** Critical
**Estimated Time:** 45 minutes

**File:** `src/core/storeResetService.ts` (NEW FILE)

**Current Problem:**

- Logout only resets authStore
- Other stores (products, recipes, menu, etc.) remain populated
- User sees stale data if they login again with different account

**Solution:**
Create centralized service to reset all Pinia stores.

**Implementation:**

```typescript
/**
 * Centralized Store Reset Service
 *
 * Provides utility to reset all Pinia stores to initial state.
 * Used during logout to ensure complete state cleanup.
 */

import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { useSuppliersStore } from '@/stores/supplier_2'
import { useCounteragentsStore } from '@/stores/counteragents'
import { usePreparationStore } from '@/stores/preparation'
import { useAccountStore } from '@/stores/account'
import { usePosStore } from '@/stores/pos'
import { useOrdersStore } from '@/stores/pos/orders/ordersStore'
import { useTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'StoreResetService'

/**
 * Reset all Pinia stores to initial state
 *
 * IMPORTANT: This should be called during logout to ensure
 * complete cleanup of all application state.
 *
 * @returns Promise<void>
 */
export async function resetAllStores(): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, '🧹 Resetting all stores...')

    // Backoffice stores
    const backofficeStores = [
      { name: 'Products', store: useProductsStore() },
      { name: 'Recipes', store: useRecipesStore() },
      { name: 'Menu', store: useMenuStore() },
      { name: 'Storage', store: useStorageStore() },
      { name: 'Suppliers', store: useSuppliersStore() },
      { name: 'Counteragents', store: useCounteragentsStore() },
      { name: 'Preparation', store: usePreparationStore() },
      { name: 'Account', store: useAccountStore() }
    ]

    // POS stores
    const posStores = [
      { name: 'POS', store: usePosStore() },
      { name: 'Orders', store: useOrdersStore() },
      { name: 'Tables', store: useTablesStore() },
      { name: 'Payments', store: usePaymentsStore() },
      { name: 'Shifts', store: useShiftsStore() }
    ]

    // Reset all stores
    const allStores = [...backofficeStores, ...posStores]

    for (const { name, store } of allStores) {
      try {
        // Use $reset() if available (standard Pinia method)
        if ('$reset' in store && typeof store.$reset === 'function') {
          store.$reset()
          DebugUtils.info(MODULE_NAME, `✅ Reset ${name} store`)
        }
        // Fallback: manually reset common properties
        else {
          if ('initialized' in store) {
            ;(store as any).initialized = false
          }
          DebugUtils.info(MODULE_NAME, `⚠️ Manually reset ${name} store (no $reset method)`)
        }
      } catch (error) {
        DebugUtils.error(MODULE_NAME, `❌ Failed to reset ${name} store`, { error })
      }
    }

    DebugUtils.info(MODULE_NAME, '✅ All stores reset complete')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Store reset failed', { error })
    throw error
  }
}

/**
 * Check if all stores are properly reset
 * Useful for debugging and testing
 *
 * @returns Object with store names and their initialization status
 */
export function getStoreResetStatus(): Record<string, boolean> {
  return {
    products: !useProductsStore().initialized,
    recipes: !useRecipesStore().initialized,
    menu: !useMenuStore().initialized,
    storage: !useStorageStore().initialized,
    suppliers: !useSuppliersStore().initialized,
    counteragents: !useCounteragentsStore().initialized,
    preparation: !usePreparationStore().initialized,
    account: !useAccountStore().initialized,
    pos: !usePosStore().initialized,
    orders: !useOrdersStore().initialized,
    tables: !useTablesStore().initialized,
    payments: !usePaymentsStore().initialized,
    shifts: !useShiftsStore().initialized
  }
}
```

**Update authStore.ts to use resetAllStores:**

```typescript
// Add import at top
import { resetAllStores } from '@/core/storeResetService'

// Update resetState() to call resetAllStores (line ~400)
function resetState() {
  state.value = {
    currentUser: null,
    isAuthenticated: false,
    session: null,
    lastLoginAt: null,
    initialized: false
  }
}

// logout() already calls resetAllStores() (see Task 1.1)
```

---

### Task 1.3: Fix App.vue Race Condition

**Priority:** Critical
**Estimated Time:** 45 minutes

**File:** `src/App.vue`

**Current Problem:**

- Watcher runs with `immediate: true`
- Stores load before async session validation completes
- User sees stale data briefly before redirect

**Solution:**

- Remove `immediate: true` from watcher
- Add async session validation in `onMounted` BEFORE loading stores
- Show loading screen during validation

**Implementation:**

1. **Update script section** (lines 44-122):

```typescript
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { AppInitializer } from '@/core/appInitializer'
import { DebugUtils } from '@/utils'
import { useRouter } from 'vue-router'

const MODULE_NAME = 'App'
const authStore = useAuthStore()
const router = useRouter()

// Loading states
const isLoadingAuth = ref(true)
const isLoadingStores = ref(false)
const storesLoaded = ref(false)
const loadingMessage = ref('Checking session...')

/**
 * Validate session before loading any stores
 * This prevents loading stale data with an invalid session
 */
async function validateSessionAndLoadStores() {
  try {
    isLoadingAuth.value = true
    loadingMessage.value = 'Validating session...'

    // Check if session exists and is valid
    const hasValidSession = authStore.checkSession()

    if (!hasValidSession || !authStore.isAuthenticated) {
      DebugUtils.info(MODULE_NAME, 'No valid session, redirecting to login')
      isLoadingAuth.value = false

      if (!router.currentRoute.value.path.startsWith('/auth')) {
        await router.push('/auth/login')
      }
      return
    }

    // Session is valid, proceed to load stores
    DebugUtils.info(MODULE_NAME, '✅ Session valid, loading stores...')
    await loadStoresAfterAuth()

  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Session validation failed', { error })
    await router.push('/auth/login')
  } finally {
    isLoadingAuth.value = false
  }
}

/**
 * Load stores based on user roles after authentication
 */
async function loadStoresAfterAuth() {
  if (storesLoaded.value || isLoadingStores.value) {
    DebugUtils.info(MODULE_NAME, 'Stores already loaded or loading')
    return
  }

  try {
    isLoadingStores.value = true
    loadingMessage.value = 'Loading application data...'

    const user = authStore.currentUser
    if (!user) {
      throw new Error('No authenticated user')
    }

    DebugUtils.info(MODULE_NAME, 'Loading stores for user', {
      userId: user.id,
      roles: user.roles
    })

    // Initialize stores based on user roles
    await AppInitializer.initialize(user.roles || [])

    storesLoaded.value = true
    DebugUtils.info(MODULE_NAME, '✅ Stores loaded successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load stores', { error })
    throw error
  } finally {
    isLoadingStores.value = false
  }
}

/**
 * Watch for authentication changes
 * Only load stores when authenticated (no immediate execution)
 */
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated && !isLoadingStores.value && !storesLoaded.value) {
      DebugUtils.info(MODULE_NAME, 'User authenticated, loading stores...')
      await loadStoresAfterAuth()
    } else if (!isAuthenticated && storesLoaded.value) {
      // User logged out, reset loaded flag
      storesLoaded.value = false
      DebugUtils.info(MODULE_NAME, 'User logged out, reset stores loaded flag')
    }
  }
  // ✅ REMOVED: { immediate: true }
  // This prevents loading stores before session validation
)

/**
 * App initialization on mount
 */
onMounted(async () => {
  DebugUtils.info(MODULE_NAME, '🚀 App mounted, starting initialization...')

  // Validate session and load stores if authenticated
  await validateSessionAndLoadStores()
})

// Loading state computed property
const isLoading = computed(() => isLoadingAuth.value || isLoadingStores.value)
</script>
```

2. **Update template to show loading state** (lines 1-42):

```vue
<template>
  <v-app>
    <!-- Global loading overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center" persistent :scrim="true">
      <v-card class="pa-8 text-center" elevation="8" rounded="lg">
        <v-progress-circular indeterminate size="64" width="6" color="primary" class="mb-4" />
        <div class="text-h6 mb-2">{{ loadingMessage }}</div>
        <div class="text-caption text-medium-emphasis">Please wait...</div>
      </v-card>
    </v-overlay>

    <!-- Main app content -->
    <router-view v-if="!isLoading" />
  </v-app>
</template>
```

---

## 📋 PHASE 2: Session Consolidation

### Task 2.1: Remove AuthSessionService

**Priority:** High
**Estimated Time:** 30 minutes

**Files to modify:**

- `src/stores/auth/authStore.ts`
- `src/stores/auth/services/session.service.ts` (mark deprecated or delete)

**Current Problem:**

- AuthSessionService duplicates Supabase session
- Adds complexity without benefit
- Can get out of sync with Supabase

**Solution:**
Remove all references to AuthSessionService, use only Supabase.

**Implementation:**

1. **Update authStore.ts - Remove AuthSessionService imports** (line ~10):

```typescript
// ❌ DELETE THIS:
import { AuthSessionService } from './services/session.service'

// ✅ Keep only Supabase
import { supabase } from '@/supabase/client'
```

2. **Update loginWithEmail() method** (line ~104, remove AuthSessionService.saveSession):

```typescript
async function loginWithEmail(email: string, password: string): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Logging in with email...', { email })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Email login failed', { error })
      throw error
    }

    if (!data.user) {
      throw new Error('No user data returned from Supabase')
    }

    // Session is automatically stored by Supabase
    state.value.session = data.session

    // Load user profile
    await loadUserProfile(data.user.id)

    // ❌ DELETE THIS:
    // AuthSessionService.saveSession(user, 'backoffice')

    DebugUtils.info(MODULE_NAME, '✅ Email login successful')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Email login failed', { error })
    throw error
  }
}
```

3. **Update loginWithPin() method** (line ~135, remove AuthSessionService.saveSession):

```typescript
async function loginWithPin(pin: string): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Logging in with PIN...')

    // Find user by PIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('pin', pin)
      .single()

    if (userError || !userData) {
      throw new Error('Invalid PIN')
    }

    // Convert PIN to email for Supabase auth
    const email = userData.email || `${userData.id}@pin.local`

    // Sign in with Supabase (PIN is stored as password for PIN users)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pin
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'PIN login failed', { error })
      throw error
    }

    // Session is automatically stored by Supabase
    state.value.session = data.session

    // Load user profile
    await loadUserProfile(userData.id)

    // ❌ DELETE THIS:
    // AuthSessionService.saveSession(user, 'backoffice')
    // localStorage.setItem('pin_session', JSON.stringify(user))

    DebugUtils.info(MODULE_NAME, '✅ PIN login successful')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'PIN login failed', { error })
    throw error
  }
}
```

4. **Remove restorePinSession() method** (line ~330):

```typescript
// ❌ DELETE THIS ENTIRE METHOD:
function restorePinSession(): boolean {
  const pinSession = localStorage.getItem('pin_session')
  if (pinSession) {
    try {
      const user = JSON.parse(pinSession)
      state.value.currentUser = user
      state.value.isAuthenticated = true
      state.value.lastLoginAt = user.lastLoginAt
      return true
    } catch (error) {
      localStorage.removeItem('pin_session')
    }
  }
  return false
}
```

5. **Update checkSession() method** (line ~350):

```typescript
/**
 * Check if user has valid session
 * Only checks Supabase session (no legacy session support)
 */
function checkSession(): boolean {
  try {
    // Only check if we have authenticated user
    const hasSession = state.value.isAuthenticated && state.value.currentUser !== null

    DebugUtils.info(MODULE_NAME, 'Session check', { hasSession })
    return hasSession
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Session check failed', { error })
    return false
  }
}
```

6. **Mark session.service.ts as deprecated** (or delete):

Option A - Add deprecation notice:

```typescript
// src/stores/auth/services/session.service.ts (line 1)

/**
 * @deprecated This service is deprecated as of 2025-11-25
 *
 * All session management is now handled by Supabase Auth.
 * This file is kept for reference only and will be removed in a future version.
 *
 * DO NOT USE THIS SERVICE IN NEW CODE.
 */

// ... rest of file
```

Option B - Delete the file entirely (recommended):

```bash
# Delete the file
rm src/stores/auth/services/session.service.ts
```

---

### Task 2.2: Cleanup Logout Implementation

**Priority:** High
**Estimated Time:** 15 minutes

**File:** `src/stores/auth/authStore.ts`

**Current Problem:**

- Logout has redundant code
- Still references PIN session and AuthSessionService

**Solution:**
Simplify logout to only handle Supabase session.

**Implementation:**

```typescript
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
    DebugUtils.info(MODULE_NAME, 'Logging out...')

    // Step 1: Broadcast logout to other tabs FIRST
    localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString())

    // Step 2: Sign out from Supabase (clears token from localStorage)
    if (state.value.session) {
      await supabase.auth.signOut()
    }

    // Step 3: Reset all application stores
    await resetAllStores()

    // Step 4: Reset auth state
    resetState()

    // Step 5: Clean up broadcast key
    localStorage.removeItem(LOGOUT_BROADCAST_KEY)

    // Step 6: Redirect to login
    await router.push('/auth/login')

    DebugUtils.info(MODULE_NAME, '✅ Logout complete')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout failed', { error })

    // Even if logout fails, try to clean up local state
    try {
      await resetAllStores()
      resetState()
      await router.push('/auth/login')
    } catch (cleanupError) {
      DebugUtils.error(MODULE_NAME, 'Cleanup after failed logout also failed', { cleanupError })
    }

    throw error
  }
}
```

---

## 📋 PHASE 3: Router Guard Improvements (Optional)

### Task 3.1: Add Async Session Validation to Router Guard

**Priority:** Medium
**Estimated Time:** 30 minutes

**File:** `src/router/index.ts`

**Current Problem:**

- Router guard only checks `isAuthenticated` flag (synchronous)
- Doesn't validate if Supabase token is actually valid
- No loading state during validation

**Solution:**
Add async session validation in router guard.

**Implementation:**

```typescript
// src/router/index.ts (lines 331-390)

router.beforeEach(async (to, from, next) => {
  try {
    const authStore = useAuthStore()

    // Skip auth check for non-protected routes
    if (!to.meta.requiresAuth) {
      // If going to login page while authenticated, redirect to default route
      if (to.name === 'login' && authStore.isAuthenticated) {
        const defaultRoute = authStore.getDefaultRoute()
        next(defaultRoute)
        return
      }
      next()
      return
    }

    // ✅ NEW: Async session validation for protected routes
    if (authStore.isAuthenticated) {
      // Validate that Supabase session is still valid
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        if (error || !session) {
          // Session invalid, force logout
          DebugUtils.info('Router', 'Session invalid, forcing logout')
          await authStore.logout()
          next({
            name: 'login',
            query: { redirect: to.fullPath, reason: 'session_expired' }
          })
          return
        }
      } catch (error) {
        DebugUtils.error('Router', 'Session validation error', { error })
        next({
          name: 'login',
          query: { redirect: to.fullPath, reason: 'session_error' }
        })
        return
      }
    }

    // Check authentication
    if (!authStore.isAuthenticated) {
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // Check role-based access
    if (to.meta.allowedRoles) {
      const { hasAnyRole } = usePermissions()
      if (!hasAnyRole(to.meta.allowedRoles)) {
        next('/unauthorized')
        return
      }
    }

    next()
  } catch (error) {
    console.error('[Router Guard] Navigation guard error:', error)
    next('/auth/login')
  }
})
```

---

## 🧪 Testing Checklist

### Phase 1: Critical Fixes

- [ ] **Test Cross-Tab Logout**

  - [ ] Open app in Tab A and Tab B
  - [ ] Login in both tabs
  - [ ] Logout in Tab A
  - [ ] Verify Tab B immediately logs out and redirects to login
  - [ ] Verify no ghost data shown in Tab B

- [ ] **Test Store Reset on Logout**

  - [ ] Login and load data (products, recipes, etc.)
  - [ ] Logout
  - [ ] Login with different account
  - [ ] Verify no stale data from previous account

- [ ] **Test App.vue Race Condition Fix**

  - [ ] Login and use app normally
  - [ ] Close tab/browser
  - [ ] Re-open app (page reload)
  - [ ] Verify loading screen shows immediately
  - [ ] Verify no ghost data visible before redirect (if session invalid)
  - [ ] Verify smooth loading if session valid

- [ ] **Test Email Login**

  - [ ] Login with email/password
  - [ ] Verify session stored in Supabase localStorage
  - [ ] Verify no duplicate session keys
  - [ ] Reload page
  - [ ] Verify session restored correctly

- [ ] **Test PIN Login**
  - [ ] Login with PIN
  - [ ] Verify session stored in Supabase localStorage (not pin_session)
  - [ ] Verify no duplicate session keys
  - [ ] Reload page
  - [ ] Verify session restored correctly

### Phase 2: Session Consolidation

- [ ] **Test AuthSessionService Removal**

  - [ ] Verify no references to AuthSessionService in code
  - [ ] Verify no `kitchen_app_session` key in localStorage after login
  - [ ] Verify no `pin_session` key in localStorage after PIN login
  - [ ] Verify only Supabase session key exists

- [ ] **Test Logout Cleanup**
  - [ ] Login
  - [ ] Inspect localStorage (should see only Supabase key)
  - [ ] Logout
  - [ ] Inspect localStorage (should be clean, no session keys)

### Phase 3: Router Guard (Optional)

- [ ] **Test Router Guard Session Validation**
  - [ ] Login
  - [ ] Manually delete Supabase token from localStorage
  - [ ] Navigate to protected route
  - [ ] Verify immediate redirect to login
  - [ ] Verify no error shown

---

## 📝 Files to Modify

### Phase 1: Critical Fixes

1. **src/stores/auth/authStore.ts** (MODIFY)

   - Add cross-tab sync logic
   - Update logout() method
   - Add setupCrossTabSync() and handleCrossTabLogout()

2. **src/core/storeResetService.ts** (NEW FILE)

   - Create resetAllStores() function
   - Create getStoreResetStatus() helper

3. **src/App.vue** (MODIFY)
   - Remove `immediate: true` from watcher
   - Add async session validation
   - Add loading overlay

### Phase 2: Session Consolidation

4. **src/stores/auth/authStore.ts** (MODIFY)

   - Remove AuthSessionService imports
   - Remove restorePinSession() method
   - Update loginWithEmail(), loginWithPin(), checkSession()

5. **src/stores/auth/services/session.service.ts** (DELETE or DEPRECATE)
   - Mark as deprecated or delete entirely

### Phase 3: Router Guard (Optional)

6. **src/router/index.ts** (MODIFY)
   - Add async session validation in beforeEach guard

---

## 🚀 Implementation Order

**Recommended sequence:**

### Day 1 (4-5 hours)

1. **Task 1.2: Create StoreResetService** (45 min)

   - Create new file
   - Implement resetAllStores()
   - Test manually

2. **Task 1.1: Cross-Tab Logout** (1 hour)

   - Add setupCrossTabSync()
   - Add handleCrossTabLogout()
   - Update logout() to broadcast
   - Test in multiple tabs

3. **Task 1.3: Fix App.vue Race Condition** (45 min)

   - Update watcher (remove immediate)
   - Add validateSessionAndLoadStores()
   - Add loading overlay
   - Test page reload scenarios

4. **Testing Phase 1** (1.5 hours)
   - Test all scenarios from checklist
   - Fix any issues found

### Day 2 (2-3 hours)

5. **Task 2.1: Remove AuthSessionService** (30 min)

   - Update authStore methods
   - Remove imports
   - Mark service as deprecated

6. **Task 2.2: Cleanup Logout** (15 min)

   - Simplify logout() method
   - Remove redundant code

7. **Testing Phase 2** (1 hour)

   - Test login flows (email + PIN)
   - Test logout cleanup
   - Verify localStorage state

8. **(Optional) Task 3.1: Router Guard** (30 min)

   - Add async validation
   - Test protected routes

9. **Final Testing** (1 hour)
   - Full regression testing
   - Test all user flows
   - Test edge cases

**Total estimated time:** 6-8 hours

---

## 🎯 Success Criteria

### Phase 1 Complete When:

- [x] Logout in one tab immediately logs out all tabs
- [x] No ghost data visible during page reload
- [x] All stores properly reset on logout
- [x] Loading screen shows during session validation
- [x] No TypeScript errors
- [x] All tests passing

### Phase 2 Complete When:

- [x] Only Supabase session exists in localStorage
- [x] No `pin_session` or `kitchen_app_session` keys
- [x] Both Email and PIN login work correctly
- [x] Session restoration works from Supabase only
- [x] No references to AuthSessionService
- [x] All tests passing

### Phase 3 Complete When (Optional):

- [x] Router guard validates session asynchronously
- [x] Invalid tokens cause immediate redirect
- [x] No errors shown to user on invalid session

---

## ⚠️ IMPORTANT NOTES

### Breaking Changes

1. **localStorage keys changed:**

   - ❌ Removed: `pin_session`
   - ❌ Removed: `kitchen_app_session`
   - ✅ Kept: `sb-*-auth-token` (Supabase session)

2. **AuthSessionService deprecated:**

   - All methods no longer used
   - File can be deleted after migration

3. **Session restoration:**
   - No longer supports legacy PIN sessions
   - Users with old `pin_session` will need to login again

### Migration Notes

**After deployment:**

1. Users will be logged out (expected)
2. They need to login again with email or PIN
3. New session will be stored in Supabase only
4. Cross-tab sync will work immediately

**Rollback plan:**

If critical issues found:

1. Revert commits
2. Restore old session logic
3. Users keep their sessions

---

## 📚 Reference Documents

### Related Files

- **Authentication:** `src/stores/auth/authStore.ts`
- **Session Service:** `src/stores/auth/services/session.service.ts`
- **App Init:** `src/App.vue`
- **Router:** `src/router/index.ts`
- **Supabase Client:** `src/supabase/client.ts`

### Analysis Document

Full analysis with root causes and sequence diagrams available in:

- Task agent output (2025-11-25)
- See "Authentication and Session Management Analysis" section

---

## 🎉 NEXT STEPS AFTER COMPLETION

### Immediate (Sprint +1)

1. Monitor production for session issues
2. Collect user feedback on login experience
3. Check error logs for auth failures

### Future Improvements (Backlog)

1. **Token Refresh Monitoring**

   - Add UI notification when session about to expire
   - Auto-refresh tokens in background
   - Show countdown before auto-logout

2. **Multi-Device Session Management**

   - Track active sessions per user
   - Show "Active Sessions" page in settings
   - Allow "Logout All Devices" feature

3. **Session Analytics**

   - Track session duration
   - Monitor login/logout patterns
   - Detect suspicious activity

4. **Offline Session Handling (POS)**
   - Handle session expiry while offline
   - Queue auth state changes
   - Graceful degradation

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All code changes committed
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console errors in DEV
- [ ] Code reviewed

### Deployment

- [ ] Deploy to Vercel (dev branch first)
- [ ] Test on dev deployment
- [ ] Deploy to production (main branch)
- [ ] Monitor for errors

### Post-Deployment

- [ ] Verify cross-tab logout works
- [ ] Verify page reload works
- [ ] Verify both Email and PIN login work
- [ ] Check error logs
- [ ] Monitor user feedback

---

**Status:** 📋 Ready for Implementation
**Next Action:** Start with Phase 1, Task 1.2 (StoreResetService)
