/**
 * Seed users to Supabase database
 * Creates test users for all three authentication methods:
 *   1. Email + Password (admin/manager) - Supabase Auth
 *   2. PIN (cashier) - Quick POS login
 *   3. KITCHEN PIN (bar/kitchen) - Quick kitchen/bar login
 *
 * Run: npx tsx scripts/seed-users.ts
 */

import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!')
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   VITE_SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test users configuration
const TEST_USERS = {
  // Admin with email authentication
  admin: {
    email: 'admin@resto.local',
    password: 'Admin123!',
    name: 'Admin User',
    roles: ['admin', 'manager'] as string[]
  },

  // Manager with email authentication
  manager: {
    email: 'manager@resto.local',
    password: 'Manager123!',
    name: 'Manager User',
    roles: ['manager'] as string[]
  },

  // Cashier with PIN authentication
  cashier1: {
    name: 'Cashier 1',
    pin: '1234',
    roles: ['cashier'] as string[]
  },

  cashier2: {
    name: 'Cashier 2',
    pin: '5678',
    roles: ['cashier'] as string[]
  },

  // Kitchen staff with PIN authentication
  kitchen1: {
    name: 'Kitchen Staff',
    pin: '1111',
    roles: ['kitchen'] as string[]
  },

  // Bar staff with PIN authentication
  bar1: {
    name: 'Bartender',
    pin: '2222',
    roles: ['bar'] as string[]
  }
}

async function createEmailUser(email: string, password: string, name: string, roles: string[]) {
  console.log(`📧 Creating email user: ${email}...`)

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name
      }
    })

    if (authError) {
      if (authError.message.includes('already')) {
        console.log(`   ⚠️  User already exists: ${email}`)
        return
      }
      throw authError
    }

    // 2. Create profile in users table
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      name,
      email,
      roles,
      is_active: true
    })

    if (profileError) {
      throw profileError
    }

    console.log(`   ✅ Created: ${email} (password: ${password})`)
  } catch (error) {
    console.error(`   ❌ Failed to create ${email}:`, error)
  }
}

async function createPinUser(name: string, pin: string, roles: string[]) {
  console.log(`📌 Creating PIN user: ${name}...`)

  try {
    // Use create_user_with_pin function
    const { data, error } = await supabase.rpc('create_user_with_pin', {
      p_name: name,
      p_pin: pin,
      p_roles: roles,
      p_email: null
    })

    if (error) {
      if (error.message.includes('duplicate')) {
        console.log(`   ⚠️  User already exists: ${name}`)
        return
      }
      throw error
    }

    console.log(`   ✅ Created: ${name} (PIN: ${pin})`)
  } catch (error) {
    console.error(`   ❌ Failed to create ${name}:`, error)
  }
}

async function seedUsers() {
  console.log('🌱 Seeding users to Supabase...\n')
  console.log(`URL: ${supabaseUrl}`)
  console.log('')

  // Create email users (admin/manager)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Email Authentication Users')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await createEmailUser(
    TEST_USERS.admin.email,
    TEST_USERS.admin.password,
    TEST_USERS.admin.name,
    TEST_USERS.admin.roles
  )

  await createEmailUser(
    TEST_USERS.manager.email,
    TEST_USERS.manager.password,
    TEST_USERS.manager.name,
    TEST_USERS.manager.roles
  )

  // Create PIN users (cashier)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('POS (Cashier) PIN Users')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await createPinUser(TEST_USERS.cashier1.name, TEST_USERS.cashier1.pin, TEST_USERS.cashier1.roles)
  await createPinUser(TEST_USERS.cashier2.name, TEST_USERS.cashier2.pin, TEST_USERS.cashier2.roles)

  // Create KITCHEN PIN users (kitchen/bar)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('KITCHEN (Bar/Kitchen) PIN Users')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await createPinUser(TEST_USERS.kitchen1.name, TEST_USERS.kitchen1.pin, TEST_USERS.kitchen1.roles)
  await createPinUser(TEST_USERS.bar1.name, TEST_USERS.bar1.pin, TEST_USERS.bar1.roles)

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ User seeding complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📋 Test Credentials:\n')
  console.log('Email Authentication (Backoffice):')
  console.log(`  Admin:   ${TEST_USERS.admin.email} / ${TEST_USERS.admin.password}`)
  console.log(`  Manager: ${TEST_USERS.manager.email} / ${TEST_USERS.manager.password}\n`)

  console.log('PIN Authentication (POS):')
  console.log(`  Cashier 1: PIN ${TEST_USERS.cashier1.pin}`)
  console.log(`  Cashier 2: PIN ${TEST_USERS.cashier2.pin}\n`)

  console.log('PIN Authentication (KITCHEN):')
  console.log(`  Kitchen:   PIN ${TEST_USERS.kitchen1.pin}`)
  console.log(`  Bar:       PIN ${TEST_USERS.bar1.pin}\n`)

  // Verify users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, roles')
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('⚠️  Could not verify users:', error.message)
  } else {
    console.log(`✅ Total users in database: ${users?.length || 0}`)
  }
}

// Run seeding
seedUsers().catch(error => {
  console.error('❌ Seeding failed:', error)
  process.exit(1)
})
