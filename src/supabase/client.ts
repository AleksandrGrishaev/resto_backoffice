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
  supabaseInstance = createClient<Database>(supabaseConfig.url, apiKey, supabaseConfig.options)

  console.log('✅ Supabase client initialized:', {
    url: supabaseConfig.url,
    hasAnonKey: !!supabaseConfig.anonKey,
    usingServiceKey: apiKey === supabaseConfig.serviceKey
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
