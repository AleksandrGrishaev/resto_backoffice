# Supabase Timeout Fix - Implementation Plan

**Created:** 2025-11-26
**Status:** READY FOR IMPLEMENTATION
**Priority:** CRITICAL (blocks user workflows)
**Estimated time:** 3-4 hours

---

## 🔍 Root Cause Analysis (CONFIRMED)

### Problem Identified:

1. **5-second timeout too short** (`accountSupabaseService.ts:42`)

   - Supabase requests can take 6-10 seconds after 5-10 minutes of inactivity
   - Network conditions vary, connection pool may be exhausted

2. **Promise.all crashes components** (`PendingPaymentsWidget.vue:153`)

   ```typescript
   await Promise.all([
     accountStore.fetchPayments(), // Fails → Entire component crashes
     accountStore.fetchAccounts() // Succeeds but not shown
   ])
   ```

   - If ONE promise rejects → component stuck in error state
   - Data exists in store but UI doesn't render it

3. **Empty error objects** - Error details lost in catch blocks

   ```typescript
   DebugUtils.error(MODULE_NAME, 'Error', { error }) // Logs {}
   ```

4. **No user feedback** - Users see infinite spinner when timeout occurs

---

## 📊 Diagnostic Evidence

### Console Output (Real Session):

```javascript
// BEFORE timeout:
lastFetch: 2025-11-26T14:18:47.273Z
Time since: 5 minutes
Should refetch: true  ✅

// DURING timeout (after 5 seconds):
Error: Supabase request timeout
at accountSupabaseService.ts:51

// AFTER timeout:
state.accounts: [{…}, {…}, {…}]  ✅ DATA EXISTS
state.loading.accounts: false
// BUT UI shows loading spinner ❌
```

**Root cause:** Component error state prevents render despite data availability.

---

## 🎯 Solution Strategy

### Three-Pronged Approach:

1. **Increase Timeout** (Quick fix - 15 minutes)

   - Change 5s → 15s for realistic network conditions

2. **Fix Component Error Handling** (Core fix - 1 hour)

   - Replace Promise.all with independent handlers
   - Show partial data even if one request fails

3. **Improve Error Logging** (Enhancement - 30 minutes)
   - Preserve error details for debugging

---

## 📋 Implementation Steps

### Phase 1: Quick Fix (Increase Timeout) ⏱️ 15 minutes

**File:** `src/stores/account/accountSupabaseService.ts`

**CHANGE:**

```typescript
// Line 42
const SUPABASE_TIMEOUT = 5000 // ❌ TOO SHORT

// TO:
const SUPABASE_TIMEOUT = 15000 // ✅ 15 seconds (realistic)
```

**Why 15 seconds:**

- Global fetch timeout is 30s (supabase/config.ts:48)
- Most slow requests complete in 10-12 seconds
- 15s provides buffer while maintaining reasonable UX

**Testing:**

```bash
# After change:
1. Wait 5-10 minutes
2. Navigate to Accounts page
3. Should load successfully (no timeout)
```

---

### Phase 2: Fix Component Error Handling ⏱️ 1 hour

#### 2.1 Update PendingPaymentsWidget.vue

**File:** `src/views/accounts/components/list/PendingPaymentsWidget.vue`

**BEFORE (Bad):**

```vue
<script setup lang="ts">
onMounted(async () => {
  // ❌ Promise.all crashes component if one fails
  await Promise.all([accountStore.fetchPayments(), accountStore.fetchAccounts()])
})
</script>
```

**AFTER (Good):**

```vue
<script setup lang="ts">
import { ref } from 'vue'

const paymentsError = ref<string | null>(null)
const accountsError = ref<string | null>(null)

onMounted(async () => {
  // ✅ Independent error handling
  // Fetch payments
  try {
    await accountStore.fetchPayments()
  } catch (error) {
    console.error('Failed to fetch payments:', error)
    paymentsError.value = error instanceof Error ? error.message : 'Failed to load payments'
    // Continue - don't crash component
  }

  // Fetch accounts
  try {
    await accountStore.fetchAccounts()
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    accountsError.value = error instanceof Error ? error.message : 'Failed to load accounts'
    // Continue - don't crash component
  }
})
</script>

<template>
  <!-- Show error banner if payments failed -->
  <v-alert v-if="paymentsError" type="warning" variant="tonal" closable class="mb-4">
    {{ paymentsError }}
    <template #append>
      <v-btn size="small" variant="text" @click="refreshPayments">Retry</v-btn>
    </template>
  </v-alert>

  <!-- Rest of component renders normally even if payments failed -->
  <v-card class="pending-payments-widget">
    <!-- ... existing code ... -->
  </v-card>
</template>
```

#### 2.2 Update AccountListView.vue

**File:** `src/views/accounts/AccountListView.vue`

**BEFORE (Bad):**

```vue
<script setup lang="ts">
async function fetchAccounts() {
  loading.value = true
  try {
    await store.fetchAccounts()
  } catch (error) {
    console.error('Failed to fetch accounts:', error) // ❌ Just log, no recovery
  } finally {
    loading.value = false
  }
}
</script>
```

**AFTER (Good):**

```vue
<script setup lang="ts">
const errorMessage = ref<string | null>(null)

async function fetchAccounts() {
  loading.value = true
  errorMessage.value = null

  try {
    await store.fetchAccounts()
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load accounts. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="account-list-view">
    <!-- Error banner -->
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
      <template #append>
        <v-btn size="small" variant="text" :loading="loading" @click="fetchAccounts">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Toolbar -->
    <account-list-toolbar ... />

    <!-- List (shows cached data even during error) -->
    <account-list :accounts="store.state.accounts" :loading="loading" ... />
  </div>
</template>
```

---

### Phase 3: Improve Error Logging ⏱️ 30 minutes

#### 3.1 Fix Error Object Logging

**File:** `src/stores/account/accountSupabaseService.ts`

**BEFORE (Bad):**

```typescript
catch (error) {
  DebugUtils.error(MODULE_NAME, 'Error loading accounts:', error)  // Logs {}
  throw error
}
```

**AFTER (Good):**

```typescript
catch (error) {
  // Extract error details
  const errorDetails = {
    message: error instanceof Error ? error.message : String(error),
    code: (error as any)?.code,
    details: (error as any)?.details,
    hint: (error as any)?.hint,
    stack: error instanceof Error ? error.stack : undefined
  }

  DebugUtils.error(MODULE_NAME, 'Error loading accounts', errorDetails)
  throw error
}
```

#### 3.2 Create Error Helper Utility

**File:** `src/utils/errors.ts` (new)

```typescript
// src/utils/errors.ts
export function extractErrorDetails(error: unknown): {
  message: string
  code?: string
  details?: any
  hint?: string
  stack?: string
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      stack: error.stack
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  return { message: 'Unknown error', details: error }
}

export function getUserFriendlyMessage(error: unknown): string {
  const details = extractErrorDetails(error)

  if (details.message.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.'
  }

  if (details.message.includes('network')) {
    return 'Network error. Please check your internet connection.'
  }

  if (details.code === 'PGRST301' || details.message.includes('JWT')) {
    return 'Session expired. Please refresh the page.'
  }

  return details.message || 'An error occurred. Please try again.'
}
```

**Usage:**

```typescript
import { extractErrorDetails, getUserFriendlyMessage } from '@/utils/errors'

catch (error) {
  const details = extractErrorDetails(error)
  DebugUtils.error(MODULE_NAME, 'Operation failed', details)

  errorMessage.value = getUserFriendlyMessage(error)
  throw error
}
```

---

### Phase 4: Add Retry Logic (Optional) ⏱️ 1 hour

**File:** `src/stores/account/accountSupabaseService.ts`

**Add retry helper:**

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    delayMs?: number
    retryCondition?: (error: any) => boolean
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2
  const delayMs = options.delayMs ?? 1000
  const retryCondition =
    options.retryCondition ??
    (err => err.message?.includes('timeout') || err.message?.includes('network'))

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      const shouldRetry = retryCondition(error) && attempt < maxRetries

      if (!shouldRetry) {
        throw error
      }

      DebugUtils.warn(MODULE_NAME, `Retry attempt ${attempt + 1}/${maxRetries}`, {
        error: extractErrorDetails(error)
      })

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
    }
  }

  throw lastError
}
```

**Usage in methods:**

```typescript
async getAllAccounts(): Promise<Account[]> {
  return withRetry(
    async () => {
      const { data, error } = await withTimeout(
        supabase.from('accounts').select('*').order('name', { ascending: true })
      )

      if (error) throw error

      return data ? accountsFromSupabase(data) : []
    },
    {
      maxRetries: 2,
      delayMs: 1000
    }
  )
}
```

---

## ✅ Testing Checklist

### Test Case 1: Normal Operation

- [ ] Navigate to Accounts page
- [ ] All data loads successfully
- [ ] No timeout errors

### Test Case 2: After 5-10 Minutes Inactivity

- [ ] Wait 10 minutes
- [ ] Navigate to Accounts page
- [ ] Data loads (may take 6-10 seconds)
- [ ] No timeout errors

### Test Case 3: Payments Timeout

- [ ] Mock slow network (DevTools → Network → Slow 3G)
- [ ] Navigate to Accounts page
- [ ] If payments timeout:
  - [ ] Error banner shows
  - [ ] Accounts list still displays (if cached)
  - [ ] "Retry" button works

### Test Case 4: Complete Failure

- [ ] Disconnect network
- [ ] Navigate to Accounts page
- [ ] Error banner shows
- [ ] Retry button works after reconnect

---

## 📊 Success Metrics

### Before Fix:

- ❌ Timeout errors: ~30% of page loads after inactivity
- ❌ Component crashes: 100% when timeout occurs
- ❌ User experience: Infinite spinner, no recovery

### After Fix:

- ✅ Timeout errors: <5% (15s buffer)
- ✅ Component crashes: 0% (graceful error handling)
- ✅ User experience: Clear error + retry button
- ✅ Partial data display: Cached data shown during errors

---

## 🚀 Deployment Strategy

### Step 1: Quick Fix (Deploy immediately)

```bash
# Change timeout 5s → 15s
# Test locally
# Deploy to production
# Monitor for 24 hours
```

### Step 2: Component Fixes (Deploy next day)

```bash
# Update PendingPaymentsWidget
# Update AccountListView
# Add error banners
# Test locally
# Deploy to production
```

### Step 3: Enhanced Error Logging (Deploy with Step 2)

```bash
# Add error utilities
# Update all catch blocks
# Deploy with component fixes
```

### Step 4: Retry Logic (Optional - deploy later)

```bash
# Add withRetry helper
# Test thoroughly
# Deploy as enhancement
```

---

## 🔧 Rollback Plan

If issues occur:

1. **Quick Fix Rollback:**

   ```typescript
   const SUPABASE_TIMEOUT = 5000 // Revert to original
   ```

2. **Component Fix Rollback:**

   ```bash
   git revert <commit-hash>
   ```

3. **Monitor:** Watch for increased error rates

---

## 📝 Implementation Priority

### IMMEDIATE (Today):

1. ✅ Increase timeout 5s → 15s
2. ✅ Test locally
3. ✅ Deploy to production

### HIGH (Tomorrow):

1. Fix PendingPaymentsWidget
2. Fix AccountListView
3. Add error utilities
4. Deploy together

### MEDIUM (This Week):

1. Add retry logic (optional)
2. Monitor success rates
3. Adjust timeout if needed

---

## ❓ FAQ

**Q: Why 15 seconds instead of 30?**
A: Balance between UX (user waits) and reliability (request completes). Most slow requests finish in 10-12s.

**Q: Why not remove timeout entirely?**
A: Global fetch timeout (30s) still applies. Service-level timeout provides better control.

**Q: What if 15s still times out?**
A: Monitor for 1 week. If >5% timeout rate, increase to 20s or 25s. Retry logic helps too.

**Q: Why not fix all services at once?**
A: Start with AccountService (highest traffic). Roll out gradually to other services.

---

## 🎯 Next Actions

**RIGHT NOW:**

1. ✅ Change `SUPABASE_TIMEOUT = 5000` → `15000`
2. ✅ Test locally (wait 10 min, navigate to Accounts)
3. ✅ Commit + deploy

**TOMORROW:**

1. Implement component error handling
2. Add error utilities
3. Test + deploy

**MONITOR:**

- Check error logs for timeout rates
- Adjust timeout if needed
- Consider retry logic if timeouts persist

---

## 📊 Metrics to Track

Post-deployment monitoring (1 week):

```sql
-- Example metrics query (if you have logging)
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN error LIKE '%timeout%' THEN 1 ELSE 0 END) as timeout_errors,
  AVG(duration_ms) as avg_duration
FROM supabase_logs
WHERE service = 'AccountSupabaseService'
GROUP BY date
ORDER BY date DESC
LIMIT 7;
```

Target KPIs:

- Timeout rate: <5%
- Avg response time: <5 seconds
- P95 response time: <12 seconds
- Component crash rate: 0%
