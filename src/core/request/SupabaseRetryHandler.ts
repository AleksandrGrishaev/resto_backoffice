// src/core/request/SupabaseRetryHandler.ts - Centralized retry logic for Supabase requests
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'SupabaseRetryHandler'

// Default configuration (can be overridden via options)
const DEFAULT_TIMEOUT = 15000 // 15 seconds
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_BASE_DELAY = 1000 // 1 second

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay between retries in ms (default: 1000) */
  baseDelay?: number
  /** Request timeout in ms (default: 15000) */
  timeout?: number
  /** Callback called on each retry attempt */
  onRetry?: (attempt: number, error: any) => void
}

/**
 * Check if error is retryable (timeout or network error)
 */
function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || String(error)
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('Failed to fetch')
  )
}

/**
 * Wrap promise with timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

/**
 * Execute Supabase operation with retry logic and exponential backoff
 *
 * @param operation - Async function to execute
 * @param operationName - Name for logging
 * @param options - Retry configuration options
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   async () => {
 *     const { data, error } = await supabase.from('products').select('*')
 *     if (error) throw error
 *     return data
 *   },
 *   'getProducts'
 * )
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const baseDelay = options.baseDelay ?? DEFAULT_RETRY_BASE_DELAY
  const timeout = options.timeout ?? DEFAULT_TIMEOUT

  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute with timeout
      const result = await withTimeout(operation(), timeout)

      // Success - log if this was a retry
      if (attempt > 0) {
        DebugUtils.info(MODULE_NAME, `✅ ${operationName} succeeded after retry`, {
          attempt: attempt + 1,
          totalAttempts: attempt + 1
        })
      }

      return result
    } catch (error: any) {
      lastError = error
      const isLastAttempt = attempt === maxRetries
      const shouldRetry = isRetryableError(error) && !isLastAttempt

      if (!shouldRetry) {
        // Don't retry or exhausted retries
        DebugUtils.error(MODULE_NAME, `❌ ${operationName} failed (no retry)`, {
          attempt: attempt + 1,
          maxRetries,
          error: {
            message: error?.message || String(error),
            code: error?.code,
            stack: error?.stack
          }
        })
        throw error
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt)
      const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd

      DebugUtils.warn(MODULE_NAME, `⏳ ${operationName} failed, retrying...`, {
        attempt: attempt + 1,
        maxRetries,
        retryIn: Math.floor(delay + jitter) + 'ms',
        error: error?.message || String(error)
      })

      // Call onRetry callback
      if (options.onRetry) {
        options.onRetry(attempt + 1, error)
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay + jitter))
    }
  }

  // All retries exhausted
  throw lastError
}
