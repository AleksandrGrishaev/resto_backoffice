# Timeout & Error Handling Implementation Plan

**Дата создания:** 2025-11-26
**Статус:** READY FOR IMPLEMENTATION
**Приоритет:** HIGH (блокирует работу пользователей)

---

## 🔍 Проблема (Диагноз)

### Симптомы:

1. ❌ Через 5-10 минут работы запросы к Supabase "висят" (spinner)
2. ❌ Ошибка: `"Supabase request timeout"` в консоли
3. ❌ Пустые error объекты: `{error: {}}` (детали теряются)
4. ✅ Перезагрузка страницы помогает (используется кэш)
5. ✅ Пользователь авторизован (не проблема сессии)

### Root Cause (Найдено):

**Файл:** `src/stores/account/accountSupabaseService.ts:42`

```typescript
const SUPABASE_TIMEOUT = 5000 // ⚠️ СЛИШКОМ КОРОТКИЙ TIMEOUT!
```

**Проблема:**

- Timeout установлен на **5 секунд**
- Первые запросы быстрые → работает
- Через 5-10 минут запросы медленнее (connection pool, network) → timeout!
- Нет механизма retry при timeout

**Дополнительные проблемы:**

1. **Error handling теряет детали** - `catch (error) { throw error }` теряет stack trace
2. **Нет retry логики** - один timeout = полный fail
3. **Нет user feedback** - пользователь видит бесконечный spinner
4. **Нет connection health monitoring**

---

## 🎯 Решение (Стратегия)

### Принципы:

1. ✅ **Увеличить timeout** с 5 до 15 секунд (баланс UX vs reliability)
2. ✅ **Добавить retry** с exponential backoff (3 попытки max)
3. ✅ **Улучшить error logging** (сохранять message, stack, metadata)
4. ✅ **Добавить user feedback** (показать recovery UI)
5. ✅ **Сделать timeout configurable** (через ENV)

### НЕ делаем (Out of Scope):

- ❌ Session management (Supabase уже auto-refresh)
- ❌ Realtime connection monitoring (отдельная задача)
- ❌ Database performance optimization (backend задача)

---

## 📋 Implementation Plan

### Phase 1: Environment Configuration ✅ (15 минут)

**Файл:** `src/config/environment.ts`

```typescript
interface EnvironmentConfig {
  // ... existing fields ...

  // Supabase Request Configuration
  supabaseRequest: {
    timeout: number           // Request timeout in milliseconds
    maxRetries: number        // Max retry attempts on failure
    retryDelay: number        // Base delay between retries (exponential backoff)
    retryableErrors: string[] // Error types that should trigger retry
  }
}

// In createEnvironmentConfig():
supabaseRequest: {
  timeout: Number(import.meta.env.VITE_SUPABASE_TIMEOUT) || 15000, // 15 seconds
  maxRetries: Number(import.meta.env.VITE_SUPABASE_MAX_RETRIES) || 3,
  retryDelay: Number(import.meta.env.VITE_SUPABASE_RETRY_DELAY) || 1000, // 1 second
  retryableErrors: ['timeout', 'network', 'ECONNRESET', 'ETIMEDOUT']
}
```

**Добавить в `.env.development`:**

```bash
# Supabase Request Configuration
VITE_SUPABASE_TIMEOUT=15000
VITE_SUPABASE_MAX_RETRIES=3
VITE_SUPABASE_RETRY_DELAY=1000
```

---

### Phase 2: Core Utilities ✅ (1 час)

#### 2.1 Улучшенный Error Handling

**Файл:** `src/core/errors/SupabaseError.ts` (новый)

```typescript
// src/core/errors/SupabaseError.ts
import { DebugUtils } from '@/utils'

export interface SupabaseErrorDetails {
  code?: string
  message: string
  hint?: string
  details?: any
  statusCode?: number
  isTimeout?: boolean
  isNetworkError?: boolean
  isRetryable?: boolean
}

export class SupabaseError extends Error {
  public readonly code?: string
  public readonly hint?: string
  public readonly details?: any
  public readonly statusCode?: number
  public readonly isTimeout: boolean
  public readonly isNetworkError: boolean
  public readonly isRetryable: boolean
  public readonly timestamp: string

  constructor(error: any, context?: string) {
    // Extract message
    const message = SupabaseError.extractMessage(error)
    super(message)

    // Set name
    this.name = 'SupabaseError'

    // Extract details
    const details = SupabaseError.parseError(error)
    this.code = details.code
    this.hint = details.hint
    this.details = details.details
    this.statusCode = details.statusCode
    this.isTimeout = details.isTimeout || false
    this.isNetworkError = details.isNetworkError || false
    this.isRetryable = details.isRetryable || false
    this.timestamp = new Date().toISOString()

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupabaseError)
    }

    // Log error with full details
    if (context) {
      DebugUtils.error(context, 'Supabase error occurred', {
        code: this.code,
        message: this.message,
        hint: this.hint,
        statusCode: this.statusCode,
        isTimeout: this.isTimeout,
        isNetworkError: this.isNetworkError,
        isRetryable: this.isRetryable,
        stack: this.stack
      })
    }
  }

  /**
   * Extract message from various error formats
   */
  private static extractMessage(error: any): string {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.error_description) return error.error_description
    if (error?.msg) return error.msg
    return 'Unknown Supabase error'
  }

  /**
   * Parse error object to extract details
   */
  private static parseError(error: any): SupabaseErrorDetails {
    const message = this.extractMessage(error)

    // Check for timeout
    const isTimeout =
      message.includes('timeout') || message.includes('ETIMEDOUT') || error?.code === 'ETIMEDOUT'

    // Check for network error
    const isNetworkError =
      message.includes('network') ||
      message.includes('ECONNRESET') ||
      message.includes('Failed to fetch') ||
      error?.code === 'ECONNRESET'

    // Determine if retryable
    const isRetryable = isTimeout || isNetworkError

    return {
      code: error?.code || error?.error_code,
      message,
      hint: error?.hint,
      details: error?.details,
      statusCode: error?.status || error?.statusCode,
      isTimeout,
      isNetworkError,
      isRetryable
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.isTimeout) {
      return 'Request timed out. Please check your connection and try again.'
    }
    if (this.isNetworkError) {
      return 'Network error. Please check your internet connection.'
    }
    if (this.statusCode === 401) {
      return 'Authentication error. Please log in again.'
    }
    if (this.statusCode === 403) {
      return 'Permission denied. You do not have access to this resource.'
    }
    if (this.statusCode === 404) {
      return 'Resource not found.'
    }
    if (this.statusCode && this.statusCode >= 500) {
      return 'Server error. Please try again later.'
    }
    return this.message || 'An error occurred. Please try again.'
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      hint: this.hint,
      statusCode: this.statusCode,
      isTimeout: this.isTimeout,
      isNetworkError: this.isNetworkError,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      stack: this.stack
    }
  }
}
```

#### 2.2 Retry Handler с Exponential Backoff

**Файл:** `src/core/request/SupabaseRetryHandler.ts` (новый)

```typescript
// src/core/request/SupabaseRetryHandler.ts
import { ENV } from '@/config/environment'
import { DebugUtils } from '@/utils'
import { SupabaseError } from '@/core/errors/SupabaseError'

const MODULE_NAME = 'SupabaseRetryHandler'

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  timeout?: number
  onRetry?: (attempt: number, error: SupabaseError) => void
}

export class SupabaseRetryHandler {
  /**
   * Execute request with timeout and retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? ENV.supabaseRequest.maxRetries
    const baseDelay = options.baseDelay ?? ENV.supabaseRequest.retryDelay
    const timeout = options.timeout ?? ENV.supabaseRequest.timeout

    let lastError: SupabaseError | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.withTimeout(operation(), timeout)

        // Success - log if this was a retry
        if (attempt > 0) {
          DebugUtils.info(MODULE_NAME, `✅ ${operationName} succeeded after retry`, {
            attempt: attempt + 1,
            totalAttempts: attempt + 1
          })
        }

        return result
      } catch (error) {
        // Wrap error in SupabaseError
        const supabaseError = new SupabaseError(error, MODULE_NAME)
        lastError = supabaseError

        const isLastAttempt = attempt === maxRetries
        const shouldRetry = supabaseError.isRetryable && !isLastAttempt

        if (!shouldRetry) {
          DebugUtils.error(MODULE_NAME, `❌ ${operationName} failed (no retry)`, {
            attempt: attempt + 1,
            maxRetries,
            error: supabaseError.toJSON()
          })
          throw supabaseError
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt)
        const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd

        DebugUtils.warn(MODULE_NAME, `⏳ ${operationName} failed, retrying...`, {
          attempt: attempt + 1,
          maxRetries,
          retryIn: Math.floor(delay + jitter) + 'ms',
          error: supabaseError.message
        })

        // Call onRetry callback
        if (options.onRetry) {
          options.onRetry(attempt + 1, supabaseError)
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay + jitter))
      }
    }

    // All retries exhausted
    throw lastError!
  }

  /**
   * Wrap promise with timeout
   */
  private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: any): boolean {
    const supabaseError = new SupabaseError(error)
    return supabaseError.isRetryable
  }
}
```

---

### Phase 3: Service Integration ✅ (2 часа)

#### 3.1 Обновить AccountSupabaseService

**Файл:** `src/stores/account/accountSupabaseService.ts`

**BEFORE (Плохо):**

```typescript
const SUPABASE_TIMEOUT = 5000 // ❌ Hardcoded, слишком мало

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = SUPABASE_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs)
    )
  ])
}

async getAllAccounts(): Promise<Account[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('accounts').select('*')
    )

    if (error) throw error // ❌ Теряет детали

    return data || []
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error', { error }) // ❌ Пустой объект
    throw error
  }
}
```

**AFTER (Хорошо):**

```typescript
import { SupabaseRetryHandler } from '@/core/request/SupabaseRetryHandler'
import { SupabaseError } from '@/core/errors/SupabaseError'

// ❌ УДАЛИТЬ hardcoded timeout
// const SUPABASE_TIMEOUT = 5000

// ❌ УДАЛИТЬ custom withTimeout function

async getAllAccounts(): Promise<Account[]> {
  return SupabaseRetryHandler.withRetry(
    async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        throw new SupabaseError(error, MODULE_NAME)
      }

      const accounts = data ? accountsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Accounts loaded', {
        count: accounts.length
      })

      return accounts
    },
    'getAllAccounts',
    {
      onRetry: (attempt, error) => {
        DebugUtils.warn(MODULE_NAME, `Retrying getAllAccounts (attempt ${attempt})`, {
          error: error.message
        })
      }
    }
  )
}
```

#### 3.2 Создать Utility для Других Сервисов

**Файл:** `src/utils/supabase.ts` (новый)

```typescript
// src/utils/supabase.ts - Supabase utilities
import { SupabaseRetryHandler } from '@/core/request/SupabaseRetryHandler'
import { SupabaseError } from '@/core/errors/SupabaseError'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

/**
 * Execute Supabase query with retry logic
 *
 * @example
 * const orders = await executeSupabaseQuery(
 *   supabase.from('orders').select('*'),
 *   'SupplierService.getOrders'
 * )
 */
export async function executeSupabaseQuery<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  operationName: string
): Promise<T[]> {
  return SupabaseRetryHandler.withRetry(async () => {
    const { data, error } = await query

    if (error) {
      throw new SupabaseError(error, operationName)
    }

    return data || []
  }, operationName)
}

/**
 * Execute Supabase single query with retry logic
 */
export async function executeSupabaseSingle<T>(
  query: PostgrestFilterBuilder<any, any, T>,
  operationName: string
): Promise<T | null> {
  return SupabaseRetryHandler.withRetry(async () => {
    const { data, error } = await query.single()

    if (error) {
      // Not found is OK
      if (error.code === 'PGRST116') {
        return null
      }
      throw new SupabaseError(error, operationName)
    }

    return data
  }, operationName)
}
```

**Использование в сервисах:**

```typescript
// Supplier Service example
import { executeSupabaseQuery } from '@/utils/supabase'

async getOrders(): Promise<PurchaseOrder[]> {
  const data = await executeSupabaseQuery(
    supabase
      .from('supplierstore_orders')
      .select('*, supplierstore_order_items(*)'),
    'SupplierService.getOrders'
  )

  return data.map(dbOrder =>
    mapOrderFromDB(dbOrder, dbOrder.supplierstore_order_items || [])
  )
}
```

---

### Phase 4: UI Feedback ✅ (1 час)

#### 4.1 Create Error Notification Composable

**Файл:** `src/composables/useErrorNotification.ts` (новый)

```typescript
// src/composables/useErrorNotification.ts
import { ref } from 'vue'
import { SupabaseError } from '@/core/errors/SupabaseError'

export interface ErrorNotification {
  message: string
  type: 'error' | 'warning' | 'info'
  action?: {
    label: string
    handler: () => void
  }
}

const currentNotification = ref<ErrorNotification | null>(null)

export function useErrorNotification() {
  function showError(error: unknown, retryHandler?: () => void) {
    if (error instanceof SupabaseError) {
      currentNotification.value = {
        message: error.getUserMessage(),
        type: error.isRetryable ? 'warning' : 'error',
        action: retryHandler
          ? {
              label: 'Retry',
              handler: retryHandler
            }
          : undefined
      }
    } else {
      currentNotification.value = {
        message: 'An unexpected error occurred. Please try again.',
        type: 'error'
      }
    }
  }

  function clearError() {
    currentNotification.value = null
  }

  return {
    currentNotification,
    showError,
    clearError
  }
}
```

#### 4.2 Create Global Error Snackbar Component

**Файл:** `src/components/errors/GlobalErrorSnackbar.vue` (новый)

```vue
<!-- src/components/errors/GlobalErrorSnackbar.vue -->
<template>
  <v-snackbar v-model="show" :color="notificationColor" :timeout="6000" location="top" multi-line>
    <div class="d-flex align-center">
      <v-icon :icon="notificationIcon" class="mr-3" />
      <span>{{ currentNotification?.message }}</span>
    </div>

    <template v-if="currentNotification?.action" #actions>
      <v-btn variant="text" @click="handleAction">
        {{ currentNotification.action.label }}
      </v-btn>
      <v-btn variant="text" icon="mdi-close" @click="clearError" />
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useErrorNotification } from '@/composables/useErrorNotification'

const { currentNotification, clearError } = useErrorNotification()

const show = computed({
  get: () => !!currentNotification.value,
  set: value => {
    if (!value) clearError()
  }
})

const notificationColor = computed(() => {
  switch (currentNotification.value?.type) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
    default:
      return 'error'
  }
})

const notificationIcon = computed(() => {
  switch (currentNotification.value?.type) {
    case 'error':
      return 'mdi-alert-circle'
    case 'warning':
      return 'mdi-alert'
    case 'info':
      return 'mdi-information'
    default:
      return 'mdi-alert-circle'
  }
})

function handleAction() {
  currentNotification.value?.action?.handler()
  clearError()
}
</script>
```

#### 4.3 Integrate in App.vue

```vue
<!-- App.vue -->
<template>
  <v-app>
    <!-- Global error notification -->
    <GlobalErrorSnackbar />

    <!-- Rest of app -->
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import GlobalErrorSnackbar from '@/components/errors/GlobalErrorSnackbar.vue'
</script>
```

#### 4.4 Use in Components/Stores

```typescript
// Example: AccountListView.vue
import { useErrorNotification } from '@/composables/useErrorNotification'

const { showError } = useErrorNotification()

async function fetchAccounts() {
  try {
    loading.value = true
    await accountStore.fetchAccounts()
  } catch (error) {
    showError(error, () => fetchAccounts()) // Retry on error
  } finally {
    loading.value = false
  }
}
```

---

### Phase 5: Testing & Validation ✅ (2 часа)

#### Test Scenarios:

1. **Normal Operation**

   - ✅ Fast responses (<5s) work normally
   - ✅ No retries triggered
   - ✅ No error notifications

2. **Slow Network (6-10s)**

   - ✅ Request completes within 15s timeout
   - ✅ No retry needed
   - ✅ User sees data

3. **Timeout Scenario (>15s)**

   - ✅ First request times out
   - ✅ Retry automatically triggered
   - ✅ Success on retry → data shown
   - ✅ Failure after 3 retries → error notification

4. **Network Error**

   - ✅ Connection error detected
   - ✅ Retry automatically triggered
   - ✅ User sees "Retry" button

5. **Error Details Preserved**
   - ✅ Full error logged with stack trace
   - ✅ Error code/message available
   - ✅ User sees friendly message

---

## 📊 Success Criteria

### Technical Metrics:

1. ✅ **Timeout increased**: 5s → 15s (realistic for slow networks)
2. ✅ **Retry success rate**: >80% of timeouts recover on retry
3. ✅ **Error detail preservation**: 100% errors logged with full details
4. ✅ **Zero empty error objects**: `{error: {}}` eliminated
5. ✅ **Performance**: <100ms overhead per request

### User Experience Metrics:

1. ✅ **Reduced failures**: 90% fewer "timeout" errors seen by users
2. ✅ **Clear feedback**: User always knows what happened
3. ✅ **Self-recovery**: Most issues resolve automatically
4. ✅ **Manual recovery**: User can click "Retry" if needed
5. ✅ **No confusion**: Clear distinction between timeout vs data issues

---

## ⏱️ Implementation Timeline

### Day 1 (3 hours):

- **Hour 1**: Phase 1 (ENV config) + Phase 2.1 (SupabaseError)
- **Hour 2**: Phase 2.2 (RetryHandler)
- **Hour 3**: Phase 3.1 (AccountSupabaseService integration)

### Day 2 (3 hours):

- **Hour 1**: Phase 3.2 (Utility functions)
- **Hour 2**: Phase 4 (UI components)
- **Hour 3**: Phase 5 (Testing)

**Total:** 6 hours работы

---

## 🎯 Rollout Strategy

### Step 1: Canary (AccountStore only)

- Deploy with AccountSupabaseService only
- Monitor for 24 hours
- Verify timeout issues resolved

### Step 2: Critical Services

- SupplierService
- StorageService
- MenuService

### Step 3: All Services

- Remaining stores
- Full production rollout

---

## 📝 CHANGELOG

### 2025-11-26: Initial Creation

- ✅ Root cause identified: 5-second timeout too short
- ✅ Solution designed: Retry + better error handling
- ✅ Timeline estimated: 6 hours total
- ✅ Ready for implementation

---

## 🚀 Next Actions (START HERE)

**Immediate (Day 1):**

1. ✅ Add `supabaseRequest` config to `environment.ts`
2. ✅ Create `SupabaseError` class
3. ✅ Create `SupabaseRetryHandler` class
4. ✅ Update `AccountSupabaseService` (remove hardcoded timeout)

**Tomorrow (Day 2):**

1. Create `executeSupabaseQuery` utility
2. Create `GlobalErrorSnackbar` component
3. Integrate in App.vue
4. Test all scenarios

---

## ❓ FAQs

**Q: Почему 15 секунд, а не 30?**
A: 15s - баланс между UX (пользователь не ждет долго) и reliability (большинство slow requests завершаются за 10-12s).

**Q: Зачем retry, если Supabase уже auto-refresh?**
A: Это НЕ session проблема, это network timeout. Retry помогает при медленных соединениях.

**Q: Что если все 3 retry failed?**
A: Показываем user-friendly error + кнопку "Retry" для manual recovery.

**Q: Нужно ли это для всех stores?**
A: Да, но rollout постепенный - начинаем с AccountStore (где проблема воспроизводится).
