// Check both dev and production databases
import { createClient } from '@supabase/supabase-js'

console.log('🔍 Checking BOTH Databases...\n')

// DEV Database
const devUrl = 'https://fjkfckjpnbcyuknsnchy.supabase.co'
const devKey =
  process.env.VITE_SUPABASE_ANON_KEY_DEV ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqa2Zja2pwbmJjeXVrbnNuY2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzYyMzYsImV4cCI6MjA3ODYxMjIzNn0.j3nOWhthpdNhuXLCcO7iMGrucUvKiypOSF7SvawzGoQ'
const devClient = createClient(devUrl, devKey)

// PROD Database
const prodUrl = 'https://bkntdcvzatawencxghob.supabase.co'
const prodKey = 'sb_publishable_LRVBIw0EIit0VBgtMBvO9A_q0PkAPFK'
const prodClient = createClient(prodUrl, prodKey)

async function checkDatabase(name: string, client: any, url: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`${name} DATABASE`)
  console.log(`URL: ${url}`)
  console.log('='.repeat(60))

  // Try to count users via SQL (will work even if PostgREST cache issue)
  const { data, error } = await client.rpc('exec_sql', {
    query: 'SELECT COUNT(*) as count FROM public.users;'
  })

  if (error) {
    console.log(`❌ Cannot query via RPC: ${error.message}`)
    console.log(`Trying direct table access...`)

    const { count, error: countError } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.log(`❌ Cannot access users table: ${countError.message}`)
    } else {
      console.log(`✅ Users table accessible via PostgREST`)
      console.log(`   Total users: ${count || 0}`)
    }
  } else {
    console.log(`✅ Users count: ${data}`)
  }

  // List some users if possible
  const { data: users, error: usersError } = await client
    .from('users')
    .select('id, name, email, roles')
    .limit(5)

  if (!usersError && users) {
    console.log(`\n📋 Sample users:`)
    users.forEach((u: any) => {
      console.log(`   • ${u.name} (${u.email}) - ${u.roles.join(', ')}`)
    })
  }
}

async function main() {
  await checkDatabase('DEVELOPMENT', devClient, devUrl)
  await checkDatabase('PRODUCTION', prodClient, prodUrl)

  console.log(`\n${'='.repeat(60)}\n`)
  console.log('✅ Check complete!')
}

main()
