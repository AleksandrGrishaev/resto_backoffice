// src/scripts/checkProductionDb.ts
// Quick check of production database structure

import { createClient } from '@supabase/supabase-js'

// Production credentials (from .env.production)
const supabaseUrl = 'https://bkntdcvzatawencxghob.supabase.co'
const supabaseAnonKey = 'sb_publishable_LRVBIw0EIit0VBgtMBvO9A_q0PkAPFK'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTables() {
  console.log('🔍 Checking Production Database Structure...\n')
  console.log(`Database: ${supabaseUrl}\n`)

  // Try to query some expected tables
  const tablesToCheck = [
    'users',
    'products',
    'menu_items',
    'menu_categories',
    'orders',
    'pos_tables'
  ]

  console.log('Checking for expected tables:\n')
  for (const tableName of tablesToCheck) {
    const { error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`   ❌ ${tableName} - Error: [${error.code}] ${error.message}`)
      if (error.hint) {
        console.log(`      Hint: ${error.hint}`)
      }
    } else {
      console.log(`   ✅ ${tableName} - EXISTS (${count || 0} rows)`)
    }
  }

  console.log('\n💡 Note: If tables are missing from schema cache:')
  console.log('   1. Check if tables are exposed in Supabase API settings')
  console.log('   2. Reload schema cache in Supabase dashboard')
  console.log('   3. Check RLS policies')
}

checkTables()
