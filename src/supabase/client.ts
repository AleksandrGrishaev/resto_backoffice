// src/supabase/client.ts - Supabase client singleton

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig, isSupabaseConfigured } from './config'
import type { Database } from './types'

/**
 * Supabase client singleton instance
 * This client is shared across the entire application
 */
let supabaseInstance: SupabaseClient<Database> | null = null

/**
 * Initialize and get Supabase client
 * @returns Supabase client instance
 * @throws Error if Supabase is not configured
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  // Return existing instance if available
  if (supabaseInstance) {
    console.log('♻️ [SupabaseClient] Returning existing instance')
    return supabaseInstance
  }

  // Validate configuration
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    )
  }

  // Create new instance
  const apiKey = supabaseConfig.getApiKey()

  console.log('🔧 [SupabaseClient] Creating new Supabase client...', {
    url: supabaseConfig.url,
    timestamp: new Date().toISOString()
  })

  supabaseInstance = createClient<Database>(supabaseConfig.url, apiKey, supabaseConfig.options)

  console.log('✅ [SupabaseClient] Supabase client initialized:', {
    url: supabaseConfig.url,
    hasAnonKey: !!supabaseConfig.anonKey,
    usingServiceKey: apiKey === supabaseConfig.serviceKey,
    timestamp: new Date().toISOString()
  })

  return supabaseInstance
}

/**
 * Export singleton instance for convenience
 * Initialize lazily - only when first accessed
 */
let _supabase: SupabaseClient<Database> | null = null

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = getSupabaseClient()
    }
    return (_supabase as any)[prop]
  }
})

/**
 * Reset Supabase client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null
}

/**
 * Check if Supabase client is initialized
 */
export function isSupabaseClientInitialized(): boolean {
  return supabaseInstance !== null
}

/**
 * Ensure auth session is valid for the current operation
 *
 * This function verifies that the Supabase client has a valid JWT token
 * for authenticated operations. Critical for background operations that
 * may lose authentication context.
 *
 * @returns Promise<boolean> - true if session is valid, false otherwise
 *
 * @example
 * ```typescript
 * if (!(await ensureAuthSession())) {
 *   console.error('No auth session - operation may fail')
 *   // Handle missing auth (e.g., skip, retry, or throw)
 * }
 * ```
 */
export async function ensureAuthSession(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const {
      data: { session },
      error
    } = await client.auth.getSession()

    if (error) {
      console.error('❌ [ensureAuthSession] Failed to get session:', error.message)
      return false
    }

    if (!session || !session.access_token) {
      console.warn('⚠️ [ensureAuthSession] No active session or access token')
      return false
    }

    // Session exists and has token
    console.log('✅ [ensureAuthSession] Valid session found:', {
      userId: session.user?.id,
      expiresAt: session.expires_at,
      hasToken: !!session.access_token
    })

    return true
  } catch (error) {
    console.error('❌ [ensureAuthSession] Exception checking session:', error)
    return false
  }
}

/**
 * Get current user ID from session
 *
 * Helper function to retrieve the authenticated user's ID.
 * Returns null if no session or user.
 *
 * @returns Promise<string | null> - User ID or null
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const client = getSupabaseClient()
    const {
      data: { session }
    } = await client.auth.getSession()
    return session?.user?.id || null
  } catch (error) {
    console.error('❌ [getCurrentUserId] Failed to get user ID:', error)
    return null
  }
}
