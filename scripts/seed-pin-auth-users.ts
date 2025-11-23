/**
 * Seed script: Create auth.users entries for PIN users
 *
 * This script creates Supabase Auth entries for users who login via PIN.
 * After this, PIN login will be able to use signInWithPassword() to create
 * a real Supabase session with auth.uid() set.
 *
 * Run with: npx tsx scripts/seed-pin-auth-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.development') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

// Create Supabase admin client (uses SERVICE_KEY)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface PinUser {
  id: string
  name: string
  roles: string[]
  pin_hash: string
}

async function seedPinAuthUsers() {
  console.log('🔄 Seeding auth.users for PIN users...\n')

  try {
    // 1. Get all users with PIN from public.users
    const { data: pinUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, roles, pin_hash')
      .not('pin_hash', 'is', null)

    if (fetchError) throw fetchError

    if (!pinUsers || pinUsers.length === 0) {
      console.log('ℹ️  No PIN users found in database')
      return
    }

    console.log(`Found ${pinUsers.length} PIN users:\n`)

    for (const user of pinUsers as PinUser[]) {
      console.log(`Processing: ${user.name} (${user.roles.join(', ')})`)

      // Generate email for this PIN user
      const emailLocalPart = user.name.toLowerCase().replace(/\s+/g, '-')
      const rolePrefix = user.roles[0] // Use primary role
      const email = `pin-${rolePrefix}-${emailLocalPart}@internal.local`

      // Use the first 4 characters of the name + role as a simple password
      // In production, this should be a secure random password
      const tempPassword = `${user.name.substring(0, 4).toLowerCase()}${rolePrefix}123`

      try {
        // Check if auth.users entry already exists
        const { data: existingAuth } = await supabase.auth.admin.getUserById(user.id)

        if (existingAuth.user) {
          console.log(`  ✓ Auth user already exists: ${existingAuth.user.email}`)

          // Update public.users email if needed
          if (!user.email || user.email !== email) {
            await supabase.from('users').update({ email }).eq('id', user.id)
            console.log(`  ✓ Updated public.users email to: ${email}`)
          }
          continue
        }
      } catch (error) {
        // User doesn't exist, proceed to create
      }

      // Create auth.users entry
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        id: user.id, // Use same ID as public.users
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: user.name,
          roles: user.roles,
          is_pin_user: true
        },
        app_metadata: {
          provider: 'pin',
          providers: ['pin']
        }
      })

      if (authError) {
        console.error(`  ❌ Failed to create auth user: ${authError.message}`)
        continue
      }

      // Update public.users with email
      const { error: updateError } = await supabase
        .from('users')
        .update({ email })
        .eq('id', user.id)

      if (updateError) {
        console.error(
          `  ⚠️  Created auth user but failed to update public.users: ${updateError.message}`
        )
      } else {
        console.log(`  ✅ Created auth user: ${email}`)
        console.log(`     Password: ${tempPassword}`)
        console.log(`     ID: ${user.id}\n`)
      }
    }

    console.log('\n✅ Seeding complete!')
    console.log('\nℹ️  PIN users can now login via PIN, which will:')
    console.log('   1. Validate PIN via RPC')
    console.log('   2. Use email/password to create Supabase session')
    console.log('   3. Set auth.uid() for RLS policies')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seed
seedPinAuthUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
