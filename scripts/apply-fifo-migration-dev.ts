/**
 * Apply FIFO allocation RPC migration to DEV database
 * Run: npx tsx scripts/apply-fifo-migration-dev.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load DEV environment
dotenv.config({ path: '.env.development' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_KEY in .env.development')
  process.exit(1)
}

console.log('🔗 Connecting to DEV database:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  // Read migration file
  const migrationPath = path.join(
    __dirname,
    '../src/supabase/migrations/076_fifo_allocation_rpc.sql'
  )
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Applying migration: 076_fifo_allocation_rpc.sql')
  console.log('📊 SQL length:', sql.length, 'characters')

  // Split into individual statements (simple split by semicolon followed by newline)
  // For complex migrations, this might need more sophisticated parsing
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements`)

  // Execute the entire migration as one block using rpc
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // If exec_sql doesn't exist, try direct execution
    console.log('⚠️ exec_sql not available, trying statement-by-statement...')

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt.length < 10) continue // Skip empty/short statements

      console.log(`\n[${i + 1}/${statements.length}] Executing...`)
      console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''))

      // For CREATE FUNCTION, we need to include the $$ delimiters properly
      // This simple approach won't work for functions with $$
      // Instead, let's output instructions
    }

    console.log('\n' + '='.repeat(60))
    console.log('⚠️ Cannot execute DDL via PostgREST API')
    console.log('📋 Please apply the migration manually:')
    console.log('1. Open Supabase Dashboard → SQL Editor')
    console.log('2. Select DEV project (fjkfckjpnbcyuknsnchy)')
    console.log('3. Paste the contents of:')
    console.log('   src/supabase/migrations/076_fifo_allocation_rpc.sql')
    console.log('4. Click "Run"')
    console.log('='.repeat(60))
    return
  }

  console.log('✅ Migration applied successfully!')

  // Test the function
  console.log('\n🧪 Testing allocate_batch_fifo...')
  const { data: testData, error: testError } = await supabase.rpc('allocate_batch_fifo', {
    p_items: [
      {
        type: 'preparation',
        id: '6ed21b4e-4384-4839-8cc6-3dbc119f7feb',
        quantity: 30,
        fallbackCost: 1000
      }
    ]
  })

  if (testError) {
    console.error('❌ Test failed:', testError.message)
  } else {
    console.log('✅ Test passed:', JSON.stringify(testData, null, 2))
  }
}

applyMigration().catch(console.error)
