/**
 * Create Admin User Seed Script
 *
 * Creates initial admin user for production deployment.
 * This should be run ONCE after deploying to production.
 *
 * Usage:
 *   npx tsx scripts/seeds/create-admin-user.ts
 *
 * Environment variables required:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_SERVICE_KEY (temporarily needed for admin.createUser)
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  log(
    '❌ Error: Missing environment variables!',
    colors.red + colors.bright
  )
  log('\nRequired:', colors.yellow)
  log('  - VITE_SUPABASE_URL')
  log('  - VITE_SUPABASE_SERVICE_KEY (for admin operations only)')
  log('\nMake sure to run this with the correct .env file loaded:', colors.blue)
  log('  npx tsx --env-file=.env.production scripts/seeds/create-admin-user.ts')
  process.exit(1)
}

// Create Supabase client with service key (admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim())
    })
  })
}

async function createAdminUser() {
  log('\n===========================================', colors.blue + colors.bright)
  log('      Create Admin User for Kitchen App', colors.blue + colors.bright)
  log('===========================================\n', colors.blue + colors.bright)

  log('This script will create an admin user with full access.', colors.yellow)
  log('⚠️  Make sure you are running this on the correct database!\n', colors.red)

  // Get user input
  const name = await question('Admin name: ')
  const email = await question('Admin email: ')
  const password = await question('Admin password (min 8 chars): ')

  // Validate input
  if (!name || !email || !password) {
    log('\n❌ All fields are required!', colors.red)
    process.exit(1)
  }

  if (password.length < 8) {
    log('\n❌ Password must be at least 8 characters!', colors.red)
    process.exit(1)
  }

  if (!email.includes('@')) {
    log('\n❌ Invalid email format!', colors.red)
    process.exit(1)
  }

  // Confirm
  log('\n-------------------------------------------', colors.yellow)
  log(`Name:  ${name}`, colors.yellow)
  log(`Email: ${email}`, colors.yellow)
  log(`Roles: admin, manager`, colors.yellow)
  log('-------------------------------------------\n', colors.yellow)

  const confirm = await question('Create this admin user? (yes/no): ')

  if (confirm.toLowerCase() !== 'yes') {
    log('\n❌ Cancelled.', colors.red)
    process.exit(0)
  }

  try {
    log('\n🔄 Creating admin user...', colors.blue)

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    })

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('No user data returned from auth creation')
    }

    log(`✅ Auth user created (ID: ${authData.user.id})`, colors.green)

    // 2. Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      name,
      email,
      roles: ['admin', 'manager'],
      is_active: true,
    })

    if (profileError) {
      // If profile creation fails, try to delete the auth user
      log(
        `⚠️  Profile creation failed: ${profileError.message}`,
        colors.yellow
      )
      log('🔄 Attempting to cleanup auth user...', colors.yellow)

      await supabase.auth.admin.deleteUser(authData.user.id)

      throw new Error(
        `Failed to create user profile: ${profileError.message}`
      )
    }

    log('✅ User profile created', colors.green)

    // Success!
    log('\n===========================================', colors.green + colors.bright)
    log('✅ Admin user created successfully!', colors.green + colors.bright)
    log('===========================================\n', colors.green + colors.bright)

    log('Login credentials:', colors.blue)
    log(`  Email:    ${email}`, colors.blue)
    log(`  Password: ${password}`, colors.blue)
    log(`  Roles:    admin, manager`, colors.blue)

    log('\n⚠️  IMPORTANT SECURITY STEPS:', colors.red + colors.bright)
    log('1. Save these credentials securely (password manager)', colors.yellow)
    log('2. Login and change password immediately', colors.yellow)
    log('3. Delete this script output from your terminal history', colors.yellow)
    log('4. Never share the password', colors.yellow)

    log('\nYou can now login at:', colors.blue)
    log(`  ${supabaseUrl.replace('https://', 'https://app.')}\n`, colors.blue)
  } catch (error) {
    log(
      `\n❌ Error creating admin user: ${error instanceof Error ? error.message : String(error)}`,
      colors.red + colors.bright
    )
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Check if users table exists
async function checkUsersTable() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (error && error.message.includes('does not exist')) {
    log('\n❌ Error: "users" table does not exist!', colors.red + colors.bright)
    log('\nMake sure you have:', colors.yellow)
    log('1. Applied all migrations (especially the users table migration)', colors.yellow)
    log('2. Connected to the correct database', colors.yellow)
    log('\nRun migrations first:', colors.blue)
    log('  npx supabase migration up --db-url "your-connection-string"\n', colors.blue)
    process.exit(1)
  }

  return true
}

// Main execution
;(async () => {
  try {
    await checkUsersTable()
    await createAdminUser()
    process.exit(0)
  } catch (error) {
    log(
      `\n💥 Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      colors.red + colors.bright
    )
    process.exit(1)
  }
})()
