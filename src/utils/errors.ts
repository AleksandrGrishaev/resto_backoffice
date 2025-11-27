// src/utils/errors.ts - Error handling utilities

/**
 * Error details extracted from various error types
 */
export interface ErrorDetails {
  message: string
  code?: string
  details?: any
  hint?: string
  stack?: string
}

/**
 * Extract structured error details from unknown error types
 * Handles Error objects, Supabase errors, and plain strings
 *
 * @param error - Unknown error type
 * @returns Structured error details
 */
export function extractErrorDetails(error: unknown): ErrorDetails {
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

  if (error && typeof error === 'object') {
    const errorObj = error as any
    return {
      message: errorObj.message || errorObj.error || 'Unknown error',
      code: errorObj.code,
      details: errorObj.details,
      hint: errorObj.hint,
      stack: errorObj.stack
    }
  }

  return { message: 'Unknown error', details: error }
}

/**
 * Convert technical error messages to user-friendly messages
 * Provides clear guidance for common error scenarios
 *
 * @param error - Unknown error type
 * @returns User-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const details = extractErrorDetails(error)
  const message = details.message.toLowerCase()

  // Timeout errors
  if (message.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.'
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  ) {
    return 'Network error. Please check your internet connection.'
  }

  // Authentication errors
  if (details.code === 'PGRST301' || message.includes('jwt') || message.includes('unauthorized')) {
    return 'Session expired. Please refresh the page.'
  }

  // Permission errors
  if (details.code === 'PGRST301' || message.includes('permission') || message.includes('rls')) {
    return 'You do not have permission to perform this action.'
  }

  // Database errors
  if (details.code?.startsWith('23')) {
    // PostgreSQL integrity constraint violations (23xxx)
    if (details.code === '23505') {
      return 'This record already exists.'
    }
    if (details.code === '23503') {
      return 'Cannot delete: this record is referenced by other data.'
    }
    return 'Database constraint violation. Please check your data.'
  }

  // Not found errors
  if (details.code === 'PGRST116' || message.includes('not found')) {
    return 'The requested resource was not found.'
  }

  // Validation errors
  if (message.includes('invalid') || message.includes('validation')) {
    return details.message // Return original message for validation errors
  }

  // Default: Return original message if no pattern matched
  return details.message || 'An error occurred. Please try again.'
}

/**
 * Check if an error is retryable
 * Used to determine if an operation should be retried
 *
 * @param error - Unknown error type
 * @returns True if the error is likely temporary and retryable
 */
export function isRetryableError(error: unknown): boolean {
  const details = extractErrorDetails(error)
  const message = details.message.toLowerCase()

  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('failed to fetch') ||
    message.includes('503') || // Service unavailable
    message.includes('502') || // Bad gateway
    message.includes('504') // Gateway timeout
  )
}
