/**
 * Apply users table migration to Supabase
 * Run: npx tsx scripts/apply-users-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Read migration file
const migrationPath = path.join(__dirname, '../src/supabase/migrations/007_create_users_table.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!')
  console.error('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY in your environment')
  process.exit(1)
}

// Create Supabase client with service key for migration
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Applying users table migration...\n')
  console.log(`Migration file: ${migrationPath}`)
  console.log(`Migration size: ${migrationSQL.length} characters\n`)

  try {
    // Execute migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error.message)
      console.error(error)
      process.exit(1)
    }

    console.log('✅ Migration applied successfully!\n')

    // Verify table creation
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users')

    if (tablesError) {
      console.warn('⚠️  Could not verify table creation:', tablesError.message)
    } else if (tables && tables.length > 0) {
      console.log('✅ Users table verified in database')
    }

    // Verify functions creation
    console.log('\n📋 Verifying functions...')
    const functions = ['authenticate_with_pin', 'create_user_with_pin', 'update_user_pin']

    for (const funcName of functions) {
      const { data, error } = await supabase.rpc(funcName as any, {})
      if (!error || error.message.includes('missing')) {
        console.log(`  ✅ ${funcName}`)
      } else {
        console.log(`  ❌ ${funcName}: ${error.message}`)
      }
    }

    console.log('\n🎉 Migration complete! You can now:')
    console.log('   1. Create test users with: pnpm seed:users')
    console.log('   2. Update authStore to use new authentication methods')
    console.log('   3. Update LoginView UI with three tabs')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run migration
applyMigration()
