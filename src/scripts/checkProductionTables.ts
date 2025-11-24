// Check what tables exist in PRODUCTION database
import { createClient } from '@supabase/supabase-js'

const prodUrl = 'https://bkntdcvzatawencxghob.supabase.co'
const prodServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

if (!prodServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_SERVICE_KEY')
  console.error(
    '   Run: npx tsx --env-file=.env.seed.production src/scripts/checkProductionTables.ts'
  )
  process.exit(1)
}

const supabase = createClient(prodUrl, prodServiceKey)

async function checkTables() {
  console.log('🔍 Checking PRODUCTION Database Tables\n')
  console.log(`Database: ${prodUrl}\n`)

  // Query pg_catalog for all tables in public schema
  const { data, error } = await supabase.rpc('exec', {
    sql: `
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `
  })

  if (error) {
    console.error('❌ RPC exec not available, trying direct SQL...')

    // Try information_schema
    const result = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    console.log('Result:', result)
    return
  }

  console.log('📊 Tables in public schema:\n')
  if (data && data.length > 0) {
    data.forEach((row: any) => {
      console.log(`   • ${row.tablename}`)
    })
    console.log(`\nTotal: ${data.length} tables`)
  } else {
    console.log('   (no tables found)')
  }

  // Check specifically for users table
  const { data: usersCheck, error: usersError } = await supabase.rpc('exec', {
    sql: `
      SELECT EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'public' AND tablename = 'users'
      ) as users_exists;
    `
  })

  if (!usersError) {
    console.log(
      `\n🔍 public.users table exists: ${usersCheck?.[0]?.users_exists ? '✅ YES' : '❌ NO'}`
    )
  }
}

checkTables()
