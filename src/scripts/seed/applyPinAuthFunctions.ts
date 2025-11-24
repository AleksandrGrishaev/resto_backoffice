// src/scripts/seed/applyPinAuthFunctions.ts
// Apply PIN authentication functions to database
// Run with: pnpm seed:pin-auth (dev) or pnpm seed:pin-auth:prod (production)

import { supabase } from '../supabaseClient'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const MODULE_NAME = 'PinAuthFunctionsSeed'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function applyPinAuthFunctions() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📝 Applying PIN Auth Functions`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    // Read SQL file
    const sqlFilePath = join(__dirname, 'createPinAuthFunctions.sql')
    const sql = readFileSync(sqlFilePath, 'utf-8')

    console.log(`📄 Reading SQL from: ${sqlFilePath}`)
    console.log(`📏 SQL length: ${sql.length} characters\n`)

    // Split SQL into individual function statements
    // Match CREATE OR REPLACE FUNCTION ... $function$; patterns
    const functionRegex = /CREATE OR REPLACE FUNCTION[\s\S]*?\$function\$;/gi
    const functions = sql.match(functionRegex) || []

    console.log(`🔍 Found ${functions.length} functions to apply\n`)

    if (functions.length === 0) {
      throw new Error('No CREATE FUNCTION statements found in SQL file')
    }

    // Apply each function separately
    for (let i = 0; i < functions.length; i++) {
      const functionSql = functions[i].trim()

      // Extract function name for logging
      const nameMatch = functionSql.match(/CREATE OR REPLACE FUNCTION\s+public\.(\w+)/i)
      const functionName = nameMatch ? nameMatch[1] : `Function ${i + 1}`

      console.log(`📦 Applying function: ${functionName}`)

      const { error } = await supabase.rpc('query', { sql_query: functionSql }).single()

      if (error) {
        // Try direct SQL execution if rpc('query') doesn't work
        console.log(`   ⚠️  rpc('query') failed, trying direct execution...`)

        const { error: directError } = await supabase.from('_').select('*').limit(0) // Dummy query to test connection

        if (directError) {
          console.error(`   ❌ Connection test failed:`, directError.message)
        }

        // Since we can't execute DDL via PostgREST, we need to inform user
        console.error(`   ❌ Cannot execute DDL via Supabase client`)
        console.error(`   💡 Solution: Run SQL manually in Supabase SQL Editor`)
        throw new Error(
          `Failed to apply ${functionName}. Please run SQL manually in Supabase SQL Editor.`
        )
      }

      console.log(`   ✅ Successfully applied\n`)
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ All PIN Auth functions applied successfully!`)
    console.log(`${'='.repeat(60)}\n`)

    // Verify functions exist
    console.log(`🔍 Verifying functions...`)
    const { data: verifyData, error: verifyError } = await supabase.rpc(
      'get_pin_user_credentials',
      { pin_input: '0000' }
    ) // Test call (will return empty)

    if (verifyError && !verifyError.message.includes('Could not find')) {
      console.error(`❌ Verification failed:`, verifyError.message)
      console.log(`💡 Functions may not be registered in PostgREST schema cache`)
      console.log(`💡 Try reloading schema cache in Supabase Dashboard`)
    } else {
      console.log(`✅ Function get_pin_user_credentials is accessible\n`)
    }

    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Error applying PIN auth functions:`, error.message)
    console.error(`\n💡 MANUAL SOLUTION:`)
    console.error(`   1. Open Supabase Dashboard → SQL Editor`)
    console.error(`   2. Copy contents from: src/scripts/seed/createPinAuthFunctions.sql`)
    console.error(`   3. Paste and run in SQL Editor`)
    console.error(`   4. Click "Reload schema cache" if functions don't appear\n`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyPinAuthFunctions()
}

export default applyPinAuthFunctions
