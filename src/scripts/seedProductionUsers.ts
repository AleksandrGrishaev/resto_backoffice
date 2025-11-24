// Seed users to PRODUCTION database using raw SQL
// This bypasses PostgREST schema cache issues
// Run: npx tsx --env-file=.env.seed.production src/scripts/seedProductionUsers.ts

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_NAME = 'ProductionUsersSeed'

// Get production config from env
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_KEY')
  console.error('   Make sure you are using: npx tsx --env-file=.env.seed.production')
  process.exit(1)
}

console.log('\n' + '='.repeat(60))
console.log('🚀 PRODUCTION Users Seed')
console.log('='.repeat(60))
console.log(`Database: ${supabaseUrl}`)
console.log(`Using: SERVICE KEY (bypasses RLS)`)
console.log('='.repeat(60) + '\n')

// Create Supabase client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seedUsers() {
  console.log(`${MODULE_NAME}: 📦 Seeding users via SQL...\n`)

  // SQL from seedUsersProduction.sql (embedded to avoid file reading issues)
  const seedSQL = `
INSERT INTO public.users (id, name, email, phone, pin_hash, roles, is_active, avatar_url, preferences)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Admin User',
    'admin@kitchen-app.com',
    '+62812345678',
    crypt('1111', gen_salt('bf')),
    ARRAY['admin']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'Manager User',
    'manager@kitchen-app.com',
    '+62812345679',
    crypt('2222', gen_salt('bf')),
    ARRAY['manager']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'Cashier User',
    'cashier@kitchen-app.com',
    '+62812345680',
    crypt('3333', gen_salt('bf')),
    ARRAY['cashier']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Cashier',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000004'::uuid,
    'Kitchen User',
    'kitchen@kitchen-app.com',
    '+62812345681',
    crypt('4444', gen_salt('bf')),
    ARRAY['kitchen']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Kitchen',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000005'::uuid,
    'Bar User',
    'bar@kitchen-app.com',
    '+62812345682',
    crypt('5555', gen_salt('bf')),
    ARRAY['bar']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bar',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000006'::uuid,
    'Multi-Role User',
    'multi@kitchen-app.com',
    '+62812345683',
    crypt('9999', gen_salt('bf')),
    ARRAY['manager', 'cashier']::text[],
    true,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Multi',
    '{"language": "en", "theme": "light", "notifications": true}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  roles = EXCLUDED.roles,
  avatar_url = EXCLUDED.avatar_url,
  preferences = EXCLUDED.preferences,
  updated_at = NOW();
  `

  // Execute raw SQL using Supabase SQL function
  const { data, error } = await supabase.rpc('exec', { sql: seedSQL })

  if (error) {
    console.error('❌ Failed to seed users:', error)
    console.log('\n💡 Fallback: Copy SQL from src/scripts/seed/seedUsersProduction.sql')
    console.log('   and paste into Supabase SQL Editor manually.')
    throw error
  }

  console.log('✅ Users seeded successfully!\n')
}

async function verifyUsers() {
  console.log(`${MODULE_NAME}: 🔍 Verifying users...\n`)

  // Verify using raw SQL
  const { data, error } = await supabase.rpc('exec', {
    sql: `
      SELECT id, name, email, roles, is_active
      FROM public.users
      WHERE email LIKE '%kitchen-app.com%'
      ORDER BY name;
    `
  })

  if (error) {
    console.log('⚠️  Verification skipped (use Supabase Dashboard SQL Editor)')
    return
  }

  console.log('📊 Seeded Users:')
  console.log(JSON.stringify(data, null, 2))
  console.log('')
}

async function main() {
  try {
    await seedUsers()
    await verifyUsers()

    console.log('\n🎉 Production users seed completed!')
    console.log('\n📋 Credentials:')
    console.log('   Admin:   1111')
    console.log('   Manager: 2222')
    console.log('   Cashier: 3333')
    console.log('   Kitchen: 4444')
    console.log('   Bar:     5555')
    console.log('   Multi:   9999')
    console.log('')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
