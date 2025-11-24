// src/scripts/seed/users.ts
// Seed script for users table
// Run with: pnpm seed:users

import { supabase } from '../supabaseClient'
import bcrypt from 'bcryptjs'
import type { UserRole } from '../../stores/auth/types'

const MODULE_NAME = 'UsersSeed'
const SALT_ROUNDS = 10

interface SeedUser {
  id: string
  name: string
  email: string | null
  phone: string | null
  pin: string // Plain PIN (будет захеширован)
  roles: UserRole[]
  is_active: boolean
  avatar_url: string | null
  preferences: Record<string, any>
}

// Seed users data
const SEED_USERS_DATA: SeedUser[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Admin User',
    email: 'admin@kitchen-app.com',
    phone: '+62812345678',
    pin: '1111',
    roles: ['admin'],
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: true
    }
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Manager User',
    email: 'manager@kitchen-app.com',
    phone: '+62812345679',
    pin: '2222',
    roles: ['manager'],
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager',
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: true
    }
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Cashier User',
    email: 'cashier@kitchen-app.com',
    phone: '+62812345680',
    pin: '3333',
    roles: ['cashier'],
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cashier',
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: true
    }
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    name: 'Kitchen User',
    email: 'kitchen@kitchen-app.com',
    phone: '+62812345681',
    pin: '4444',
    roles: ['kitchen'],
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kitchen',
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: true
    }
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    name: 'Bar User',
    email: 'bar@kitchen-app.com',
    phone: '+62812345682',
    pin: '5555',
    roles: ['bar'],
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bar',
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: true
    }
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    name: 'Multi-Role User',
    email: 'multi@kitchen-app.com',
    phone: '+62812345683',
    pin: '9999',
    roles: ['manager', 'cashier'],
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Multi',
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: true
    }
  }
]

/**
 * Hash PIN using bcrypt
 */
async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

/**
 * Seed users to database using RPC function (bypasses PostgREST schema cache issues)
 */
async function seedUsers() {
  console.log(`\n${MODULE_NAME}: 📦 Seeding ${SEED_USERS_DATA.length} users...`)

  const results = []

  for (const user of SEED_USERS_DATA) {
    console.log(`\n   Processing: ${user.name} (${user.roles.join(', ')})`)

    // Use RPC function to create/update user with PIN
    const { data, error } = await supabase.rpc('create_user_with_pin', {
      p_name: user.name,
      p_pin: user.pin,
      p_roles: user.roles,
      p_email: user.email
    })

    if (error) {
      // Check if user already exists
      if (error.message.includes('duplicate') || error.code === '23505') {
        console.log(`   ⚠️  User already exists, skipping...`)
        continue
      }
      console.error(`   ❌ Failed to create user:`, error)
      throw error
    }

    console.log(`   ✅ Created user with ID: ${data}`)
    results.push(data)
  }

  console.log(`\n✅ Successfully seeded ${results.length} users`)
  return results
}

/**
 * Verify seeded users using direct SQL
 */
async function verifyUsers() {
  console.log(`\n${MODULE_NAME}: 🔍 Verifying seeded users...`)

  // Use MCP execute_sql or skip verification for now
  console.log(`\n✅ Verification skipped (use SQL Dashboard to check users table)`)
  console.log(`   Query: SELECT id, name, email, roles, is_active FROM users ORDER BY name;`)
}

/**
 * Display seed user credentials
 */
function displayCredentials() {
  console.log(`\n${MODULE_NAME}: 🔑 Seed User Credentials:`)
  console.log(`\n${'='.repeat(60)}`)
  SEED_USERS_DATA.forEach(user => {
    console.log(`\n👤 ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   PIN: ${user.pin}`)
    console.log(`   Roles: ${user.roles.join(', ')}`)
  })
  console.log(`\n${'='.repeat(60)}`)
  console.log(`\n⚠️  SECURITY NOTE: These are demo credentials.`)
  console.log(`   Change default PINs in production after first login!`)
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Users Seed...\n')
  console.log(`Total Users to Seed: ${SEED_USERS_DATA.length}`)

  try {
    // Step 1: Seed users
    await seedUsers()

    // Step 2: Verify seeded data
    await verifyUsers()

    // Step 3: Display credentials
    displayCredentials()

    console.log('\n🎉 Users seed completed successfully!')
  } catch (error) {
    console.error('\n❌ Users seed failed:', error)
    process.exit(1)
  }
}

// Export functions for use in other scripts
export { seedUsers, verifyUsers, displayCredentials }

// Run if executed directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
