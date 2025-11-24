// src/scripts/supabaseClient.ts
// Supabase client for Node.js scripts (uses process.env instead of import.meta.env)

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

// Validate configuration
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not set in environment')
}

// Use service key for scripts (bypass RLS) or anon key
const apiKey = supabaseServiceKey || supabaseAnonKey

if (!apiKey) {
  throw new Error('Neither VITE_SUPABASE_SERVICE_KEY nor VITE_SUPABASE_ANON_KEY is set')
}

// Detect environment based on URL
const isProduction = supabaseUrl.includes('bkntdcvzatawencxghob')
const isDevelopment = supabaseUrl.includes('fjkfckjpnbcyuknsnchy')

console.log('\n' + '='.repeat(60))
console.log('🗄️  Supabase Connection:')
console.log('='.repeat(60))
console.log(
  `Environment: ${isProduction ? '🚀 PRODUCTION' : isDevelopment ? '🔧 DEVELOPMENT' : '❓ UNKNOWN'}`
)
console.log(`Database URL: ${supabaseUrl}`)
if (supabaseServiceKey) {
  console.log('🔑 Using SERVICE KEY (bypasses RLS policies)')
} else {
  console.log('🔓 Using ANON KEY (RLS policies apply)')
}
console.log('='.repeat(60) + '\n')

// Create and export Supabase client
export const supabase = createClient<Database>(supabaseUrl, apiKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default supabase
