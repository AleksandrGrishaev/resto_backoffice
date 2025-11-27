// src/supabase/config.ts - Supabase configuration

import { ENV } from '@/config/environment'

/**
 * Supabase client configuration
 * Credentials are loaded from environment variables
 */
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',

  /**
   * Get the appropriate API key based on environment
   * In development with PIN auth, use service_role key to bypass RLS
   */
  getApiKey(): string {
    if (ENV.supabase.useServiceKey && this.serviceKey) {
      console.warn('🔑 Using Supabase SERVICE KEY - bypasses RLS policies (dev only)')
      return this.serviceKey
    }
    return this.anonKey
  },

  // Client options
  options: {
    auth: {
      // Persist auth session in localStorage
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage,
      storageKey: 'kitchen-app-supabase-auth'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'kitchen-app-web'
      }
      // ✅ FIX: REMOVED fetch timeout wrapper
      // Timeout is now handled ONLY by SupabaseRetryHandler (15s)
      // Having two timeouts (30s here + 15s in RetryHandler) causes conflicts
      // and prevents proper retry logic from working
    },
    // Real-time subscriptions (disabled for MVP, can enable later)
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
}

/**
 * Validate Supabase configuration
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseConfig.url && supabaseConfig.anonKey)
}

/**
 * Get Supabase error message
 */
export function getSupabaseErrorMessage(error: any): string {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.error_description) return error.error_description
  return 'Unknown Supabase error'
}
