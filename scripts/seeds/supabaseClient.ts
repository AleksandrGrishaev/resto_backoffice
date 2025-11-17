// scripts/seeds/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load .env.development
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '../..')

dotenv.config({ path: resolve(rootDir, '.env.development') })

// Mock import.meta.env for Node.js environment (needed by environment.ts)
// @ts-expect-error - Polyfill for Node.js environment
globalThis.import = globalThis.import || {}
// @ts-expect-error - Polyfill for Node.js environment
globalThis.import.meta = globalThis.import.meta || {}
// @ts-expect-error - Polyfill for Node.js environment
globalThis.import.meta.env = process.env

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.development'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
